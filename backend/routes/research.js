import express from 'express';
import { getAuthClient, supabase } from '../lib/db.js';
import { queryGroq, generateEmbedding } from '../lib/ai.js';
import { searchTavily, yahooFinance } from '../lib/search.js';
import { log, chunkText } from '../lib/utils.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// Company Research — AI + Tavily Web Search (/api/company-research)
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { query, userProfile } = req.body;
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'query parameter is required (company name or ticker).' });
  }

  log('Company Research', { query });

  try {
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;
    const startYear = currentYear - 10;

    // Step 1: Web search for latest company data
    const searchResults = await searchTavily(
      `${query} company overview financials products revenue sector ${prevYear} ${currentYear} latest news today`,
      { maxResults: 5 }
    );

    // Step 1.5: Fetch trusted Yahoo Finance Data (10 Years Historical)
    let financeContext = '';
    let historicalData = [];
    let quoteSymbol = query;
    const activeDataSources = ['Tavily Web Search'];
    try {
      const searchRes = await yahooFinance.search(query);
      const firstQuote = (searchRes.quotes || []).find(q => q.quoteType === 'EQUITY' || q.isYahooFinance) || searchRes.quotes?.[0];
      const symbolToUse = firstQuote?.symbol || query;

      const quote = await yahooFinance.quote(symbolToUse);
      quoteSymbol = quote?.symbol || symbolToUse;

      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      const period1 = tenYearsAgo.toISOString().split('T')[0];
      const period2 = new Date().toISOString().split('T')[0];

      const history = await yahooFinance.historical(symbolToUse, { period1, period2, interval: '1mo' });

      const yearlySnapshots = {};
      for (const h of history) {
        const year = new Date(h.date).getFullYear();
        if (!yearlySnapshots[year]) yearlySnapshots[year] = h;
      }

      historicalData = Object.keys(yearlySnapshots).sort().map(year => {
        const data = yearlySnapshots[year];
        return `Year ${year}: Price $${data.close?.toFixed(2)}, Volume ${data.volume}`;
      });

      const extraSignals = [
        quote.fiftyTwoWeekHigh ? `52-Week High: $${quote.fiftyTwoWeekHigh}` : '',
        quote.fiftyTwoWeekLow  ? `52-Week Low:  $${quote.fiftyTwoWeekLow}` : '',
        quote.trailingPE       ? `Price-to-Earnings Ratio (P/E): ${quote.trailingPE?.toFixed(2)} — (This measures how much investors pay per dollar of company earnings; higher = more expensive stock)` : '',
        quote.forwardPE        ? `Forward P/E (next 12 months estimate): ${quote.forwardPE?.toFixed(2)}` : '',
        quote.dividendYield    ? `Dividend Yield: ${(quote.dividendYield * 100).toFixed(2)}% (This is the annual cash payout to shareholders as a % of stock price)` : '',
        quote.beta             ? `Beta (market sensitivity): ${quote.beta?.toFixed(2)} — (A beta > 1 means the stock moves more than the market; < 1 means it is more stable)` : '',
        quote.earningsTimestamp ? `Next Earnings Date: ${new Date(quote.earningsTimestamp * 1000).toDateString()}` : '',
        quote.averageAnalystRating ? `Analyst Consensus Rating: ${quote.averageAnalystRating}` : ''
      ].filter(Boolean).join('\n');

      financeContext = `[TRUSTED FINANCIAL DATA — Yahoo Finance (Real-Time)]
Ticker: ${quote.symbol}
Current Price: $${quote.regularMarketPrice} ${quote.currency}
Today's Change: ${quote.regularMarketChangePercent?.toFixed(2)}%
Market Cap: $${((quote.marketCap || 0) / 1e9).toFixed(2)} Billion USD
${extraSignals}

[10-YEAR HISTORICAL PRICE SNAPSHOT]
${historicalData.join('\n')}
`;
      activeDataSources.push('Yahoo Finance');
    } catch (e) {
      log('Yahoo Finance Error', e.message);
    }

    const searchContextStr = [
      financeContext,
      searchResults.answer ? `Search Summary: ${searchResults.answer}` : '',
      ...(searchResults.results || []).map((r, i) =>
        `[Source ${i + 1}] ${r.title}\n${(r.content || '').substring(0, 500)}...`
      )
    ].filter(Boolean).join('\n\n');

    // Step 1.75: RAG Pipeline - Chunk, Embed, and Retrieve
    let optimizedContext = searchContextStr;
    const db = supabase || getAuthClient(req);
    
    if (db) {
      try {
        const chunks = chunkText(searchContextStr, 800);
        const embeddingsToInsert = [];
        
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader) {
          try {
            const token = authHeader.split(' ')[1];
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            userId = payload.sub;
          } catch (e) {}
        }
        
        const dbClient = supabase || db;

        if (userId) {
          for (const chunk of chunks) {
            const vector = await generateEmbedding(chunk);
            embeddingsToInsert.push({
              user_id: userId,
              content: chunk,
              metadata: { source: 'company-research', query },
              embedding: vector
            });
          }
          if (embeddingsToInsert.length > 0) {
            await dbClient.from('document_embeddings').insert(embeddingsToInsert);
          }

          const queryEmbedding = await generateEmbedding(`${query} financial history, past incidents, dependencies, growth`);
          const { data: matches } = await dbClient.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_threshold: 0.3,
            match_count: 8,
            auth_user_id: userId
          });

          if (matches && matches.length > 0) {
            optimizedContext = matches.map(m => m.content).join('\n\n');
          }
        }
      } catch (ragErr) {
        console.error('[RAG Pipeline Error]', ragErr.message);
      }
    }

    let personalizationBlock = '';
    if (userProfile && (userProfile.investmentStyle || userProfile.preferredIndustries?.length > 0)) {
      personalizationBlock = `
USER PERSONALIZATION CONTEXT:
The user requesting this profile has the following personalized interests:
- Investment Style: ${userProfile.investmentStyle || 'Standard'}
- Risk Tolerance: ${userProfile.riskTolerance || 'Moderate'}
- Preferred Industries: ${(userProfile.preferredIndustries || []).join(', ')}

Please tailor the "keyInsights" and "riskFactors" in your JSON response to highlight how this company aligns (or misaligns) with the user's specific interests and risk profile.`;
    }

    const sampleRevenueArray = [];
    for (let y = startYear; y <= currentYear; y++) {
      sampleRevenueArray.push(`    {"period": "${y}", "revenue": 0, "netMargin": 0}`);
    }
    const sampleRevenueStr = `[\n${sampleRevenueArray.join(',\n')}\n  ]`;

    const analysisPrompt = `You are a professional stock market research analyst. Using the RAG-retrieved web search results and 10-year historical financial data below, create a detailed, reliable company profile based on trusted financial data and verified market research.

CRITICAL LANGUAGE & STYLE REQUIREMENT:
While your research MUST be institutional-grade, accurate, and drawn from reliable trusted sources, all descriptions, analyses, risk factors, geopolitical risks, competitor dynamics, and key insights MUST be written in completely professional yet clear, accessible, and easy-to-understand language. Do NOT change the schema or the facts and definitions of the company, but explain every detail so clearly that anyone—even a person who has zero background in stocks, finance, market share, or geopolitical events—can easily read and understand what the company does, what its market share and competitive standing mean, and what its risks and growth outlooks are. Translate any dense financial jargon or complex technical concepts into straightforward everyday terms without sacrificing professional insight.

RAG CONTEXT (Realtime & Historical):
${optimizedContext}

COMPANY QUERY: "${query}"

${personalizationBlock}

Create a structured JSON response with EXACTLY this format (no markdown, no code fences, just valid JSON):
{
  "id": "lowercase-ticker-or-short-id",
  "name": "Full Company Name",
  "ticker": "TICKER",
  "description": "2-3 sentence company description covering core business, market position, and strategic direction.",
  "sector": "Primary sector",
  "alignmentScore": 50,
  "revenueData": ${sampleRevenueStr},
  "products": [
    {"name": "Product Name", "status": "active", "marketAdoption": 50, "hindsightDelta": 0, "revenueShare": 30, "rating": 4.6, "reviewCount": 140, "category": "Cloud & AI"}
  ],
  "expectations": [
    {"id": "exp-1", "description": "Key strategic expectation", "targetTimeline": "Q4 ${currentYear}", "metricTarget": "Metric name"}
  ],
  "pastIncidents": [
    {"title": "Incident Name", "impact": "Description of past impact"}
  ],
  "currentIncidents": [
    {"title": "Incident Name", "impact": "Description of current impact"}
  ],
  "dependencies": "Detailed analysis of supply chain and operational dependencies.",
  "growthOutlook": "10-year forward looking growth analysis.",
  "riskFactors": "Detailed internal and market risk factors.",
  "geopoliticalRisks": "Brief analysis of geopolitical dependencies and risks.",
  "competitorDependencies": "Brief analysis of key competitors and supply chain dependencies.",
  "keyInsights": ["bullet point 1", "bullet point 2"]
}

IMPORTANT:
- Revenue should be in millions USD.
- You MUST provide EXACTLY 10 to 11 years of consecutive data in the revenueData array (e.g. ${startYear} to ${currentYear}). Do not truncate it. Ensure data goes up to the present year ${currentYear} (or current TTM ${currentYear}).
- Use the 10-year historical snapshot to inform your analysis.
- If you cannot find specific data, provide reasonable estimates based on the company's known profile.
- 'hindsightDelta' in products MUST be a non-zero integer between -20 and +20 representing market momentum relative to expectations.
- For each product in 'products', provide estimated 'revenueShare' (percentage of company revenue, summing to ~100%), 'rating' (out of 5.0), 'reviewCount' (number of market/analyst reviews), and 'category' (e.g., "Hardware", "Cloud & AI", "Services", "Software", or whatever specific dynamic category fits the company's actual real-world industry).
- SENIOR INVESTOR PERSONA: Explain all findings, strategic dependencies, growth outlooks, risks, and market mechanics in clean, simple, beginner-friendly language so that anyone—even a newcomer with zero stock market background—can easily understand how the market works and what drives corporate value.
`;

    const analysisText = await queryGroq(analysisPrompt, {
      model: 'openai/gpt-oss-120b',
      maxTokens: 2500,
      temperature: 0.2
    });

    let parsed;
    try {
      parsed = JSON.parse(analysisText);
    } catch (err) {
      const jsonMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                        analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        parsed = JSON.parse(jsonStr);
      } else {
        throw new Error('AI did not return valid JSON for company profile.');
      }
    }

    parsed.id = parsed.id || query.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    parsed.expectations = (parsed.expectations || []).map((e, i) => ({
      ...e,
      id: e.id || `${parsed.id}-exp-${i + 1}`
    }));

    const searchSources = [
      {
        title: `Yahoo Finance (${quoteSymbol})`,
        url: `https://finance.yahoo.com/quote/${quoteSymbol}`,
        snippet: "Real-time stock quotes, market data, and 10-year historical financial performance."
      },
      ...(searchResults.results || []).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 400)
      }))
    ];

    if (db) {
      try {
        const { error: companyError } = await db.from('companies').upsert({
          id: parsed.id,
          name: parsed.name,
          ticker: parsed.ticker,
          description: parsed.description,
          sector: parsed.sector,
          alignment_score: parsed.alignmentScore ?? 50,
          past_incidents: parsed.pastIncidents || [],
          current_incidents: parsed.currentIncidents || [],
          dependencies: parsed.dependencies || '',
          growth_outlook: parsed.growthOutlook || '',
          risk_factors: parsed.riskFactors || '',
          geopolitical_risks: parsed.geopoliticalRisks || '',
          competitor_dependencies: parsed.competitorDependencies || '',
          key_insights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [parsed.keyInsights].filter(Boolean),
          search_sources: searchSources
        });
        
        if (companyError) throw companyError;

        if (parsed.revenueData) {
          const yearMap = new Map(parsed.revenueData.map(r => [parseInt(r.period), r]));
          let lastValid = { revenue: 100, netMargin: 10 };
          
          const sortedYears = Array.from(yearMap.keys()).sort();
          if (sortedYears.length > 0) {
            lastValid = yearMap.get(sortedYears[0]);
          }

          const enforcedData = [];
          for (let y = startYear; y <= currentYear; y++) {
            if (yearMap.has(y)) {
              lastValid = yearMap.get(y);
              enforcedData.push(lastValid);
            } else {
              lastValid = {
                period: y.toString(),
                revenue: Math.round(lastValid.revenue * (1 + (Math.random() * 0.15 - 0.02))),
                netMargin: lastValid.netMargin || 10
              };
              enforcedData.push(lastValid);
            }
          }
          parsed.revenueData = enforcedData;

          await db.from('company_revenue_data').delete().eq('company_id', parsed.id);
          await db.from('company_revenue_data').insert(
            parsed.revenueData.map(r => ({
              company_id: parsed.id,
              period: r.period,
              revenue: r.revenue,
              net_margin: r.netMargin
            }))
          );
        }

        if (parsed.products?.length > 0) {
          await db.from('company_products').delete().eq('company_id', parsed.id);
          await db.from('company_products').insert(
            parsed.products.map(p => ({
              company_id: parsed.id,
              name: p.name,
              status: p.status || 'active',
              market_adoption: p.marketAdoption ?? 0,
              hindsight_delta: p.hindsightDelta ?? 0,
              revenue_share: p.revenueShare ?? 0,
              rating: p.rating ?? 4.0,
              review_count: p.reviewCount ?? 50,
              category: p.category || `${parsed.sector || 'Core Industry'} (${(p.status || 'active').toUpperCase()})`
            }))
          );
        }

        if (parsed.expectations?.length > 0) {
          await db.from('company_expectations').delete().eq('company_id', parsed.id);
          await db.from('company_expectations').insert(
            parsed.expectations.map(e => ({
              id: e.id,
              company_id: parsed.id,
              description: e.description,
              target_timeline: e.targetTimeline,
              metric_target: e.metricTarget
            }))
          );
        }

        const companyNodeId = `co-${parsed.id}`;
        const sectorNodeId = `sec-${parsed.sector?.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20) || 'unknown'}`;

        const baseNodeUpsert = await db.from('memory_nodes').upsert([
          {
            id: companyNodeId,
            label: parsed.name,
            node_group: 'company',
            detail: parsed.description,
            importance: 8
          },
          {
            id: sectorNodeId,
            label: `${parsed.sector} Sector`,
            node_group: 'sector',
            detail: `Sector node for the ${parsed.sector} industry, representing companies operating in this space.`,
            importance: 7
          }
        ]);
        if (baseNodeUpsert.error) {
          log('Memory Node Upsert Warning', baseNodeUpsert.error.message);
        }

        const savedProductNodeIds = new Set([companyNodeId, sectorNodeId]);
        if (parsed.products?.length > 0) {
          const productNodes = parsed.products.map((p, i) => ({
            id: `prod-${parsed.id}-${i}`,
            label: p.name,
            node_group: 'product',
            detail: `${parsed.name}'s product: ${p.name} (Status: ${p.status}). Helps the company generate revenue in the ${parsed.sector} sector.`,
            importance: 6
          }));
          const prodNodeResult = await db.from('memory_nodes').upsert(productNodes);
          if (!prodNodeResult.error) {
            productNodes.forEach(n => savedProductNodeIds.add(n.id));
          } else {
            log('Product Node Upsert Warning', prodNodeResult.error.message);
          }
        }

        const edgesToSave = [];
        if (savedProductNodeIds.has(companyNodeId) && savedProductNodeIds.has(sectorNodeId)) {
          edgesToSave.push({
            id: `e-${parsed.id}-sector`,
            source: companyNodeId,
            target: sectorNodeId,
            label: 'belongs_to',
            weight: 5,
            edge_type: 'belongs_to'
          });
        }
        if (parsed.products?.length > 0) {
          parsed.products.forEach((p, i) => {
            const prodNodeId = `prod-${parsed.id}-${i}`;
            if (savedProductNodeIds.has(companyNodeId) && savedProductNodeIds.has(prodNodeId)) {
              edgesToSave.push({
                id: `e-${parsed.id}-prod-${i}`,
                source: companyNodeId,
                target: prodNodeId,
                label: 'owns',
                weight: 4,
                edge_type: 'belongs_to'
              });
            }
          });
        }
        if (edgesToSave.length > 0) {
          const edgeResult = await db.from('memory_edges').upsert(edgesToSave);
          if (edgeResult.error) {
            log('Memory Edge Upsert Warning', edgeResult.error.message);
          }
        }

        log('Company Research Saved', { id: parsed.id, name: parsed.name });
      } catch (dbError) {
        console.error('[DB Save Error]', dbError);
      }
    }

    res.json({
      success: true,
      company: parsed,
      searchSources: searchSources,
      dataSources: activeDataSources
    });

  } catch (error) {
    console.error('[Company Research Error]', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
