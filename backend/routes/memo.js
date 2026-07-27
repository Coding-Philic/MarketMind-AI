import express from 'express';
import { queryGroq, summarizeContext } from '../lib/ai.js';
import { searchTavily, yahooFinance } from '../lib/search.js';
import { log, normalizeText, generateFallbackMemo } from '../lib/utils.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// AI Investment Memo Generation (/api/memo)
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  let { companyName, ticker, eventTitle, eventContent, lessons, companyInfo, historicalEvents, memoryContext, userPrompt, userProfile } = req.body;
  ticker = ticker || (companyName ? companyName.slice(0, 4).toUpperCase() : 'N/A');
  log('Request /api/memo', { companyName, ticker, eventTitle, lessonCount: Array.isArray(lessons) ? lessons.length : 0 });

  if (!companyName || !eventTitle || !eventContent) {
    return res.status(400).json({ error: 'Missing parameters: companyName, eventTitle, and eventContent are required.' });
  }

  const lessonsList = Array.isArray(lessons) ? lessons : [];
  const lessonsString = lessonsList.map(l => `- ${l}`).join('\n');

  // Step 1: Web search & Yahoo Finance lookup for event / company
  let eventSearchContext = '';
  try {
    const currentYear = new Date().getFullYear();
    const searchResults = await searchTavily(
      `${companyName} ${ticker} ${eventTitle} latest news financials impact ${currentYear} today`,
      { maxResults: 3 }
    );
    let financeContext = '';
    try {
      const searchRes = await yahooFinance.search(ticker || companyName);
      const firstQuote = (searchRes.quotes || []).find(q => q.quoteType === 'EQUITY' || q.isYahooFinance) || searchRes.quotes?.[0];
      const symbolToUse = firstQuote?.symbol || ticker;
      if (symbolToUse) {
        const quote = await yahooFinance.quote(symbolToUse);
        if (quote) {
          const tenYearsAgo = new Date();
          tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
          const period1 = tenYearsAgo.toISOString().split('T')[0];
          const period2 = new Date().toISOString().split('T')[0];
          let historicalStr = '';
          try {
            const history = await yahooFinance.historical(symbolToUse, { period1, period2, interval: '1mo' });
            const yearlySnapshots = {};
            for (const h of history) {
              const year = new Date(h.date).getFullYear();
              if (!yearlySnapshots[year]) yearlySnapshots[year] = h;
            }
            const historicalData = Object.keys(yearlySnapshots).sort().map(year => {
              const data = yearlySnapshots[year];
              return `Year ${year}: Price $${data.close?.toFixed(2)}, Volume ${data.volume}`;
            });
            if (historicalData.length > 0) {
              historicalStr = `\n[10-YEAR HISTORICAL SNAPSHOT]\n${historicalData.join('\n')}`;
            }
          } catch (histErr) {
            log('Yahoo Finance Historical Error /api/memo', histErr.message);
          }
          financeContext = `[YAHOO FINANCE REALTIME QUOTE]\nTicker: ${quote.symbol}\nPrice: ${quote.regularMarketPrice} ${quote.currency}\nChange: ${quote.regularMarketChangePercent}%\nMarket Cap: ${quote.marketCap}${historicalStr}`;
        }
      }
    } catch (err) {
      log('Yahoo Finance Error /api/memo', err.message);
    }
    eventSearchContext = [
      financeContext,
      searchResults.answer ? `Search Summary: ${searchResults.answer}` : '',
      ...(searchResults.results || []).map((r, i) => `[News ${i + 1}] ${r.title}: ${(r.content || '').substring(0, 500)}`)
    ].filter(Boolean).join('\n\n');
    if (eventSearchContext) {
      log('Real-Time Search & Yahoo Data Added to Memo', { companyName, searchLength: eventSearchContext.length });
    }
  } catch (err) {
    log('Tavily Search Error /api/memo', err.message);
  }

  const longContext = [
    companyInfo ? `Company Info:\n${companyInfo}` : '',
    historicalEvents ? `Historical Events:\n${historicalEvents}` : '',
    lessonsString ? `Lessons:\n${lessonsString}` : '',
    memoryContext ? `Memory Context:\n${memoryContext}` : '',
    eventSearchContext ? `Real-Time Market Search & Yahoo Finance Data:\n${eventSearchContext}` : '',
    `User Prompt:\n${userPrompt || 'Generate a concise strategic memo for the current event.'}`,
    `Recent Trigger Event:\n${eventTitle} - ${eventContent}`
  ].filter(Boolean).join('\n\n');

  const condensedContext = await summarizeContext(longContext);

  let personalizationBlock = '';
  if (userProfile && (userProfile.investmentStyle || userProfile.preferredIndustries?.length > 0)) {
    personalizationBlock = `
USER PERSONALIZATION CONTEXT:
The user reading this memo is a highly personalized investor with the following profile:
- Investment Style: ${userProfile.investmentStyle || 'Standard'}
- Risk Tolerance: ${userProfile.riskTolerance || 'Moderate'}
- Preferred Industries: ${(userProfile.preferredIndustries || []).join(', ')}
- Preferred Market Cap: ${(userProfile.marketCapPreference || []).join(', ')}

Please explicitly tailor the tone, focus, and recommendations of this memo to align with the user's specific investment bubble. Highlight how this event impacts their preferred industries and matches their risk tolerance.`;
  }

  const prompt = `
You are the Revenue Intelligence Agent for MarketMind AI. Write an institutional-grade, publication-quality investment research memo in Markdown based on reliable, trusted market research.

CRITICAL LANGUAGE & STYLE REQUIREMENT:
Write this entire memo in completely professional yet clear, accessible, and easy-to-understand language. Every concept, market reaction, financial metric, and strategic impact MUST be explained so that anyone—even a person with zero background in stocks, finance, market share, or geopolitical events—can read this memo and easily understand what is happening in the company and the market. Frame your analysis as a professional stock market expert utilizing reliable, trusted research, while translating complex financial terminology into clear, accessible everyday language without losing professional depth. Avoid unexplained jargon or acronyms.

REAL-TIME TIME MANDATE: Today is Year ${new Date().getFullYear()}. Ensure your analysis, valuation metrics, and forward growth outlook reflect real-time developments up to today in ${new Date().getFullYear()}. NEVER treat older years like 2024 or 2025 as the current present.

Use the condensed research context below and keep the memo concise, practical, and accessible.

Condensed Context Summary:
${condensedContext || 'No additional summary available; use the recent event details directly.'}

${personalizationBlock}

Company: ${companyName} (${ticker})
Recent Trigger Event: ${eventTitle} - ${eventContent}

Your memo should be structured with the following exact Markdown headers:
### Executive Summary
### Strategic Moat Evaluation
### Integrated Hindsight Lessons
### Growth Outlook
### Core Risk Parameters

Include details about the recent event's strategic impact, how past timeline/execution deviations (lessons) shape your current forward forecast, and potential risk levels. Ensure all explanations across all headers are clear and understandable for every reader without specialized stock market knowledge.

OUTPUT FORMAT:
On the very first line, write exactly: SUMMARY: [BUY, HOLD, SELL, or UNDER_REVIEW] | [Conviction score 1-10]
Example: SUMMARY: BUY | 8
Followed by empty line, and then the Markdown memo content.
`;

  try {
    const responseText = await Promise.race([
      queryGroq(prompt, { model: 'openai/gpt-oss-120b', maxTokens: 2500 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI memo generation timed out after 60s.')), 60000))
    ]).catch(error => {
      log('AI Fallback', { companyName, reason: error.message });
      return generateFallbackMemo({ companyName, ticker, eventTitle, eventContent, lessonsList, condensedContext });
    });

    const lines = String(responseText).split('\n');
    const summaryLine = lines.find(l => l.toUpperCase().startsWith('SUMMARY:'));

    let recommendation = 'HOLD';
    let convictionScore = 6;

    if (summaryLine) {
      const rawParts = summaryLine.split(':')[1]?.trim()?.split('|');
      const rawRec = rawParts?.[0]?.trim()?.toUpperCase();
      const rawConv = parseInt(rawParts?.[1]?.trim() || '6');

      if (['BUY', 'SELL', 'HOLD', 'UNDER_REVIEW'].includes(rawRec)) {
        recommendation = rawRec;
      }
      if (!isNaN(rawConv) && rawConv >= 1 && rawConv <= 10) {
        convictionScore = rawConv;
      }
    }

    const fullMemo = lines
      .filter(l => !l.toUpperCase().startsWith('SUMMARY:'))
      .join('\n')
      .trim();

    log('AI Response /api/memo', { companyName, recommendation, convictionScore });
    res.json({
      recommendation,
      convictionScore,
      fullMemo,
      dataSources: eventSearchContext ? ['Yahoo Finance', 'Tavily Web Search'] : ['Saved Company Data']
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
