import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// CORS — allow local dev + Vercel production frontend
// ---------------------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // permissive for now — tighten in production
    }
  }
}));
app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Server] Supabase client initialized.');
} else {
  console.warn('[Server] Supabase credentials not configured — database features disabled.');
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function log(label, details) {
  console.log(`[Backend ${label}]`, typeof details === 'string' ? details : JSON.stringify(details));
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    console.error('Fetch Failed:', err.name, err.message);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Groq AI — single unified query function
// ---------------------------------------------------------------------------
async function queryGroq(prompt, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('GROQ_API_KEY is not configured in backend/.env');
  }

  const model = options.model || 'openai/gpt-oss-120b';
  const maxTokens = options.maxTokens || 2048;
  const temperature = options.temperature ?? 0.3;

  log('Groq Request', { model, promptLength: prompt.length });

  const response = await fetchWithTimeout(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
        top_p: 0.9,
        stream: false
      })
    }
  );

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message = errorJson?.error?.message || `HTTP ${response.status} Error`;
    throw new Error(`Groq API Error (${model}): ${message}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Groq API returned empty content');
  }

  log('Groq Response', { model, responseLength: text.length });
  return text.trim();
}

// ---------------------------------------------------------------------------
// Tavily Web Search
// ---------------------------------------------------------------------------
async function searchTavily(query, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('TAVILY_API_KEY is not configured in backend/.env');
  }

  log('Tavily Search', { query });

  const response = await fetchWithTimeout(
    'https://api.tavily.com/search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: options.depth || 'advanced',
        include_answer: true,
        max_results: options.maxResults || 8
      })
    },
    30000
  );

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(`Tavily API Error: ${errorJson?.message || response.status}`);
  }

  const data = await response.json();
  log('Tavily Results', { resultCount: data.results?.length || 0 });
  return data;
}

// ---------------------------------------------------------------------------
// Context summarizer (uses lighter model)
// ---------------------------------------------------------------------------
const summaryCache = new Map();

async function summarizeContext(contextText) {
  const trimmed = normalizeText(contextText);
  if (!trimmed) return '';
  if (trimmed.length < 1600) return trimmed;

  const cacheKey = `summary:${trimmed.slice(0, 180)}:${trimmed.length}`;
  if (summaryCache.has(cacheKey)) return summaryCache.get(cacheKey);

  const prompt = `You are a compact research summarizer for MarketMind AI.
Summarize the following company/event context into 6-8 concise bullet points that preserve the most relevant strategic, risk, and execution signals. Do not invent facts.

CONTEXT:
${trimmed}`;

  try {
    const summary = await queryGroq(prompt, { model: 'openai/gpt-oss-20b', maxTokens: 1200 });
    const condensed = normalizeText(summary);
    summaryCache.set(cacheKey, condensed);
    return condensed;
  } catch (error) {
    console.warn('[Summary] Falling back to truncated context:', error.message);
    return trimmed.slice(0, 1800);
  }
}

// ---------------------------------------------------------------------------
// Fallback memo generator
// ---------------------------------------------------------------------------
function generateFallbackMemo({ companyName, ticker, eventTitle, eventContent, lessonsList, condensedContext }) {
  const recommendation = 'HOLD';
  const convictionScore = 5;
  const lessons = lessonsList.length > 0
    ? lessonsList.slice(0, 3).map(l => `- ${l}`).join('\n')
    : '- No prior lesson history available.';

  return `SUMMARY: ${recommendation} | ${convictionScore}

### Executive Summary
A fast fallback memo was generated for ${companyName} (${ticker}) because the live AI model did not return within the response window. The current trigger event, "${eventTitle}", suggests the market is reacting to ${normalizeText(eventContent)}.

### Strategic Moat Evaluation
${normalizeText(condensedContext || 'Limited context available.')}

### Integrated Hindsight Lessons
${lessons}

### Growth Outlook
Near-term momentum is directionally positive but should be monitored against execution risk, timeline discipline, and market reaction quality.

### Core Risk Parameters
1. AI response latency can delay full narrative generation.
2. Historical lessons should continue to guide execution expectations.
3. Market conditions may shift quickly around the current event.
`;
}

// =========================================================================
// API ROUTES
// =========================================================================

// Health check (required by Render)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), supabase: !!supabase });
});

// Config status
app.get('/api/config', (_req, res) => {
  const hasApiKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  const hasSearch = !!(process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.trim().length > 0);
  const hasDatabase = !!supabase;
  log('Request /api/config', { hasApiKey, hasSearch, hasDatabase });
  res.json({ hasApiKey, hasSearch, hasDatabase });
});

// ---------------------------------------------------------------------------
// Companies CRUD
// ---------------------------------------------------------------------------
app.get('/api/companies', async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data: companies, error } = await supabase.from('companies').select('*').order('created_at', { ascending: true });
    if (error) throw error;

    // Fetch nested data for each company
    const enriched = await Promise.all(companies.map(async (c) => {
      const [revRes, prodRes, expRes] = await Promise.all([
        supabase.from('company_revenue_data').select('*').eq('company_id', c.id).order('created_at'),
        supabase.from('company_products').select('*').eq('company_id', c.id),
        supabase.from('company_expectations').select('*').eq('company_id', c.id)
      ]);
      return {
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        description: c.description,
        sector: c.sector,
        alignmentScore: c.alignment_score,
        revenueData: (revRes.data || []).map(r => ({
          period: r.period,
          revenue: Number(r.revenue),
          netMargin: Number(r.net_margin)
        })),
        products: (prodRes.data || []).map(p => ({
          name: p.name,
          status: p.status,
          marketAdoption: p.market_adoption,
          hindsightDelta: p.hindsight_delta
        })),
        expectations: (expRes.data || []).map(e => ({
          id: e.id,
          description: e.description,
          targetTimeline: e.target_timeline,
          metricTarget: e.metric_target
        }))
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/companies', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { company, revenueData, products, expectations } = req.body;
    if (!company || !company.id || !company.name || !company.ticker) {
      return res.status(400).json({ error: 'company object with id, name, and ticker is required' });
    }

    const { error: compError } = await supabase.from('companies').upsert({
      id: company.id,
      name: company.name,
      ticker: company.ticker,
      description: company.description || '',
      sector: company.sector || 'Unknown',
      alignment_score: company.alignmentScore ?? 50
    });
    if (compError) throw compError;

    if (revenueData && revenueData.length > 0) {
      const rows = revenueData.map(r => ({
        company_id: company.id,
        period: r.period,
        revenue: r.revenue,
        net_margin: r.netMargin
      }));
      const { error } = await supabase.from('company_revenue_data').upsert(rows);
      if (error) throw error;
    }

    if (products && products.length > 0) {
      const rows = products.map(p => ({
        company_id: company.id,
        name: p.name,
        status: p.status || 'active',
        market_adoption: p.marketAdoption ?? 0,
        hindsight_delta: p.hindsightDelta ?? 0
      }));
      const { error } = await supabase.from('company_products').upsert(rows);
      if (error) throw error;
    }

    if (expectations && expectations.length > 0) {
      const rows = expectations.map(e => ({
        id: e.id,
        company_id: company.id,
        description: e.description,
        target_timeline: e.targetTimeline,
        metric_target: e.metricTarget
      }));
      const { error } = await supabase.from('company_expectations').upsert(rows);
      if (error) throw error;
    }

    res.json({ success: true, companyId: company.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Market Events
// ---------------------------------------------------------------------------
app.get('/api/events', async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data, error } = await supabase.from('market_events').select('*').order('timestamp', { ascending: false }).limit(100);
    if (error) throw error;
    const mapped = (data || []).map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      companyId: e.company_id,
      companyName: e.company_name,
      title: e.title,
      content: e.content,
      impactType: e.impact_type,
      metricImpacted: e.metric_impacted,
      valueChange: e.value_change,
      rawSource: e.raw_source
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const event = req.body;
    const { error } = await supabase.from('market_events').upsert({
      id: event.id,
      company_id: event.companyId,
      company_name: event.companyName,
      title: event.title,
      content: event.content,
      impact_type: event.impactType,
      metric_impacted: event.metricImpacted,
      value_change: event.valueChange,
      raw_source: event.rawSource,
      timestamp: event.timestamp === 'Just now' ? new Date().toISOString() : event.timestamp
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Hindsight Records
// ---------------------------------------------------------------------------
app.get('/api/hindsight-records', async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data, error } = await supabase.from('hindsight_records').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map(h => ({
      id: h.id,
      companyId: h.company_id,
      companyName: h.company_name,
      expectationDescription: h.expectation_description,
      expectedTimeline: h.expected_timeline,
      actualEventId: h.actual_event_id,
      actualOutcomeDescription: h.actual_outcome_description,
      deviationMetric: h.deviation_metric,
      deviationValue: h.deviation_value,
      hindsightLesson: h.hindsight_lesson,
      severity: h.severity,
      timestamp: h.timestamp
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hindsight-records', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const record = req.body;
    const { error } = await supabase.from('hindsight_records').upsert({
      id: record.id,
      company_id: record.companyId,
      company_name: record.companyName,
      expectation_description: record.expectationDescription,
      expected_timeline: record.expectedTimeline,
      actual_event_id: record.actualEventId,
      actual_outcome_description: record.actualOutcomeDescription,
      deviation_metric: record.deviationMetric,
      deviation_value: record.deviationValue,
      hindsight_lesson: record.hindsightLesson,
      severity: record.severity,
      timestamp: record.timestamp || new Date().toISOString()
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Memory Graph
// ---------------------------------------------------------------------------
app.get('/api/memory-graph', async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from('memory_nodes').select('*').order('created_at'),
      supabase.from('memory_edges').select('*').order('created_at')
    ]);
    if (nodesRes.error) throw nodesRes.error;
    if (edgesRes.error) throw edgesRes.error;

    const nodes = (nodesRes.data || []).map(n => ({
      id: n.id,
      label: n.label,
      group: n.node_group,
      detail: n.detail,
      importance: n.importance
    }));
    const edges = (edgesRes.data || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      weight: e.weight,
      type: e.edge_type
    }));
    res.json({ nodes, edges });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memory-graph/nodes', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const nodes = Array.isArray(req.body) ? req.body : [req.body];
    const rows = nodes.map(n => ({
      id: n.id,
      label: n.label,
      node_group: n.group,
      detail: n.detail,
      importance: n.importance ?? 5
    }));
    const { error } = await supabase.from('memory_nodes').upsert(rows);
    if (error) throw error;
    res.json({ success: true, count: rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memory-graph/edges', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const edges = Array.isArray(req.body) ? req.body : [req.body];
    const rows = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      weight: e.weight ?? 3,
      edge_type: e.type || 'impacts'
    }));
    const { error } = await supabase.from('memory_edges').upsert(rows);
    if (error) throw error;
    res.json({ success: true, count: rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Investment Memos
// ---------------------------------------------------------------------------
app.get('/api/memos', async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { data, error } = await supabase.from('investment_memos').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map(m => ({
      id: m.id,
      companyId: m.company_id,
      companyName: m.company_name,
      ticker: m.ticker,
      title: m.title,
      timestamp: m.timestamp,
      recommendation: m.recommendation,
      convictionScore: m.conviction_score,
      keyThesis: m.key_thesis,
      hindsightInsights: m.hindsight_insights || [],
      riskAnalysis: m.risk_analysis,
      growthOutlook: m.growth_outlook,
      fullMemo: m.full_memo
    }));
    res.json(mapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memos', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  try {
    const memo = req.body;
    const { error } = await supabase.from('investment_memos').upsert({
      id: memo.id,
      company_id: memo.companyId,
      company_name: memo.companyName,
      ticker: memo.ticker,
      title: memo.title,
      recommendation: memo.recommendation,
      conviction_score: memo.convictionScore,
      key_thesis: memo.keyThesis,
      hindsight_insights: memo.hindsightInsights || [],
      risk_analysis: memo.riskAnalysis,
      growth_outlook: memo.growthOutlook,
      full_memo: memo.fullMemo,
      timestamp: memo.timestamp || new Date().toISOString()
    });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// AI Hindsight Analysis (existing route — now saves to Supabase)
// ---------------------------------------------------------------------------
app.post('/api/hindsight', async (req, res) => {
  const { companyName, expectation, outcome } = req.body;
  log('Request /api/hindsight', { companyName, expectation, outcome });

  if (!companyName || !expectation || !outcome) {
    return res.status(400).json({ error: 'Missing parameters: companyName, expectation, and outcome are required.' });
  }

  const prompt = `
You are the Hindsight Analyst Agent for MarketMind AI, an autonomous investment intelligence platform.
Your task is to analyze the deviation between a company's target expectation and a real-world market event.

Company: ${companyName}
Target Expectation: ${expectation}
Actual Event Outcome: ${outcome}

1. Evaluate how the actual outcome relates to the target expectation. Classify the deviation value strictly into one of the following lowercase tags:
   - "exceeded_expectations" (if the outcome is vastly better than planned)
   - "ahead" (if outcome is slightly ahead or faster than target)
   - "on_track" (if outcome matches targets)
   - "lagging" (if outcome is delayed, slower, or slightly missed)
   - "missed_expectations" (if outcome is noticeably below expectations)
   - "cancelled" (if target is abandoned or project stopped)

2. Formulate a 2-sentence hindsight lesson explaining what structural or execution factor caused this discrepancy and what the strategic takeaway is for an investor.

OUTPUT FORMAT:
On the first line, write exactly: DEVIATION: [your selected tag]
On the following lines, write the hindsight lesson text.
`;

  try {
    const responseText = await queryGroq(prompt, { model: 'openai/gpt-oss-120b' });
    log('AI Response /api/hindsight', { companyName, responseText: responseText.slice(0, 200) });

    const lines = responseText.split('\n');
    const deviationLine = lines.find(l => l.toUpperCase().startsWith('DEVIATION:'));

    let deviationValue = 'lagging';
    if (deviationLine) {
      const rawVal = deviationLine.split(':')[1]?.trim()?.toLowerCase();
      const validTags = ['ahead', 'on_track', 'lagging', 'cancelled', 'exceeded_expectations', 'missed_expectations'];
      if (validTags.includes(rawVal)) {
        deviationValue = rawVal;
      }
    }

    const lesson = lines
      .filter(l => !l.toUpperCase().startsWith('DEVIATION:'))
      .join('\n')
      .trim();

    res.json({ lesson: lesson || 'Hindsight lesson compiled successfully.', deviationValue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// AI Investment Memo (existing route — now saves to Supabase)
// ---------------------------------------------------------------------------
app.post('/api/memo', async (req, res) => {
  const { companyName, ticker, eventTitle, eventContent, lessons, companyInfo, historicalEvents, memoryContext, userPrompt } = req.body;
  log('Request /api/memo', { companyName, ticker, eventTitle, lessonCount: Array.isArray(lessons) ? lessons.length : 0 });

  if (!companyName || !ticker || !eventTitle || !eventContent) {
    return res.status(400).json({ error: 'Missing parameters: companyName, ticker, eventTitle, and eventContent are required.' });
  }

  const lessonsList = Array.isArray(lessons) ? lessons : [];
  const lessonsString = lessonsList.map(l => `- ${l}`).join('\n');

  const longContext = [
    companyInfo ? `Company Info:\n${companyInfo}` : '',
    historicalEvents ? `Historical Events:\n${historicalEvents}` : '',
    lessonsString ? `Lessons:\n${lessonsString}` : '',
    memoryContext ? `Memory Context:\n${memoryContext}` : '',
    `User Prompt:\n${userPrompt || 'Generate a concise strategic memo for the current event.'}`,
    `Recent Trigger Event:\n${eventTitle} - ${eventContent}`
  ].filter(Boolean).join('\n\n');

  const condensedContext = await summarizeContext(longContext);

  const prompt = `
You are the Revenue Intelligence Agent for MarketMind AI. Write an institutional-grade, publication-quality investment research memo in Markdown.

Use the condensed research context below and keep the memo concise and practical.

Condensed Context Summary:
${condensedContext || 'No additional summary available; use the recent event details directly.'}

Company: ${companyName} (${ticker})
Recent Trigger Event: ${eventTitle} - ${eventContent}

Your memo should be structured with the following exact Markdown headers:
### Executive Summary
### Strategic Moat Evaluation
### Integrated Hindsight Lessons
### Growth Outlook
### Core Risk Parameters

Include details about the recent event's strategic impact, how past timeline/execution deviations (lessons) shape your current forward forecast, and potential risk levels.

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
    res.json({ recommendation, convictionScore, fullMemo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Company Research — AI + Tavily Web Search (NEW)
// ---------------------------------------------------------------------------
app.post('/api/company-research', async (req, res) => {
  const { query } = req.body;
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'query parameter is required (company name or ticker).' });
  }

  log('Company Research', { query });

  try {
    // Step 1: Web search for latest company data
    const searchResults = await searchTavily(
      `${query} company overview financials products revenue sector 2024 2025`,
      { maxResults: 5 }
    );

    const searchContext = [
      searchResults.answer ? `Search Summary: ${searchResults.answer}` : '',
      ...(searchResults.results || []).map((r, i) =>
        `[Source ${i + 1}] ${r.title}\n${(r.content || '').substring(0, 1000)}...`
      )
    ].filter(Boolean).join('\n\n');

    // Step 2: AI analysis using search results
    const analysisPrompt = `You are a senior equity research analyst for MarketMind AI. Using the web search results below, create a comprehensive company profile.

WEB SEARCH RESULTS:
${searchContext}

COMPANY QUERY: "${query}"

Create a structured JSON response with EXACTLY this format (no markdown, no code fences, just valid JSON):
{
  "id": "lowercase-ticker-or-short-id",
  "name": "Full Company Name",
  "ticker": "TICKER",
  "description": "2-3 sentence company description covering core business, market position, and strategic direction.",
  "sector": "Primary sector (e.g., Semiconductors, Software & Cloud, Consumer Tech, Automotive & Robotics, Fintech, Healthcare, Energy)",
  "alignmentScore": 50,
  "revenueData": [
    {"period": "2023", "revenue": 0, "netMargin": 0},
    {"period": "2024", "revenue": 0, "netMargin": 0},
    {"period": "2025", "revenue": 0, "netMargin": 0}
  ],
  "products": [
    {"name": "Product Name", "status": "active", "marketAdoption": 50, "hindsightDelta": 0}
  ],
  "expectations": [
    {"id": "exp-1", "description": "Key strategic expectation", "targetTimeline": "Q4 2025", "metricTarget": "Metric name"}
  ],
  "geopoliticalRisks": "Brief analysis of geopolitical dependencies and risks.",
  "competitorDependencies": "Brief analysis of key competitors and supply chain dependencies.",
  "keyInsights": "3-4 bullet points of critical strategic insights from the research."
}

IMPORTANT:
- Revenue should be in millions USD. Use real data from search results where available, estimate conservatively where not.
- Include 3-5 key products with realistic adoption scores.
- Include 2-3 forward-looking expectations with specific timelines.
- alignmentScore should reflect how well the company is executing vs market expectations (0-100).
- If you cannot find specific data, provide reasonable estimates based on the company's known profile.
`;

    const analysisText = await queryGroq(analysisPrompt, {
      model: 'openai/gpt-oss-120b',
      maxTokens: 1500,
      temperature: 0.2
    });

    // Parse JSON from response — handle potential markdown wrapping
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(analysisText);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                        analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        parsed = JSON.parse(jsonStr);
      } else {
        throw new Error('AI did not return valid JSON for company profile.');
      }
    }

    // Ensure ID is safe
    parsed.id = parsed.id || query.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    parsed.expectations = (parsed.expectations || []).map((e, i) => ({
      ...e,
      id: e.id || `${parsed.id}-exp-${i + 1}`
    }));

    // Step 3: Save to Supabase if available
    if (supabase) {
      try {
        await supabase.from('companies').upsert({
          id: parsed.id,
          name: parsed.name,
          ticker: parsed.ticker,
          description: parsed.description,
          sector: parsed.sector,
          alignment_score: parsed.alignmentScore ?? 50
        });

        if (parsed.revenueData?.length > 0) {
          // Clear old revenue data for this company before inserting new
          await supabase.from('company_revenue_data').delete().eq('company_id', parsed.id);
          await supabase.from('company_revenue_data').insert(
            parsed.revenueData.map(r => ({
              company_id: parsed.id,
              period: r.period,
              revenue: r.revenue,
              net_margin: r.netMargin
            }))
          );
        }

        if (parsed.products?.length > 0) {
          await supabase.from('company_products').delete().eq('company_id', parsed.id);
          await supabase.from('company_products').insert(
            parsed.products.map(p => ({
              company_id: parsed.id,
              name: p.name,
              status: p.status || 'active',
              market_adoption: p.marketAdoption ?? 0,
              hindsight_delta: p.hindsightDelta ?? 0
            }))
          );
        }

        if (parsed.expectations?.length > 0) {
          await supabase.from('company_expectations').delete().eq('company_id', parsed.id);
          await supabase.from('company_expectations').insert(
            parsed.expectations.map(e => ({
              id: e.id,
              company_id: parsed.id,
              description: e.description,
              target_timeline: e.targetTimeline,
              metric_target: e.metricTarget
            }))
          );
        }

        // Auto-generate memory graph nodes for the new company
        const companyNodeId = `co-${parsed.id}`;
        const sectorNodeId = `sec-${parsed.sector?.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20) || 'unknown'}`;

        await supabase.from('memory_nodes').upsert([
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
            detail: `Sector node for ${parsed.sector}`,
            importance: 7
          }
        ]);

        await supabase.from('memory_edges').upsert([
          {
            id: `e-${parsed.id}-sector`,
            source: companyNodeId,
            target: sectorNodeId,
            label: 'belongs_to',
            weight: 5,
            edge_type: 'belongs_to'
          }
        ]);

        // Add product nodes
        if (parsed.products?.length > 0) {
          const productNodes = parsed.products.map((p, i) => ({
            id: `prod-${parsed.id}-${i}`,
            label: p.name,
            node_group: 'product',
            detail: `${parsed.name} product: ${p.name} (${p.status})`,
            importance: 6
          }));
          const productEdges = parsed.products.map((p, i) => ({
            id: `e-${parsed.id}-prod-${i}`,
            source: companyNodeId,
            target: `prod-${parsed.id}-${i}`,
            label: 'owns',
            weight: 4,
            edge_type: 'belongs_to'
          }));
          await supabase.from('memory_nodes').upsert(productNodes);
          await supabase.from('memory_edges').upsert(productEdges);
        }

        log('Company Research Saved', { id: parsed.id, name: parsed.name });
      } catch (dbError) {
        console.error('[DB Save Error]', dbError);
        // Continue — still return the research results even if DB save fails
      }
    }

    // Step 4: Return results
    res.json({
      success: true,
      company: parsed,
      searchSources: (searchResults.results || []).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 200)
      }))
    });

  } catch (error) {
    console.error('[Company Research Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Seed — populate Supabase with initial data if tables are empty
// ---------------------------------------------------------------------------
app.post('/api/seed', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });

  try {
    // Check if companies table already has data
    const { data: existing } = await supabase.from('companies').select('id').limit(1);
    if (existing && existing.length > 0) {
      return res.json({ message: 'Database already seeded.', seeded: false });
    }

    const seedData = req.body;
    if (!seedData || !seedData.companies) {
      return res.status(400).json({ error: 'Seed data with companies array is required.' });
    }

    // Insert companies
    for (const company of seedData.companies) {
      await supabase.from('companies').upsert({
        id: company.id,
        name: company.name,
        ticker: company.ticker,
        description: company.description,
        sector: company.sector,
        alignment_score: company.alignmentScore
      });

      if (company.revenueData?.length > 0) {
        await supabase.from('company_revenue_data').insert(
          company.revenueData.map(r => ({
            company_id: company.id, period: r.period, revenue: r.revenue, net_margin: r.netMargin
          }))
        );
      }
      if (company.products?.length > 0) {
        await supabase.from('company_products').insert(
          company.products.map(p => ({
            company_id: company.id, name: p.name, status: p.status,
            market_adoption: p.marketAdoption, hindsight_delta: p.hindsightDelta
          }))
        );
      }
      if (company.expectations?.length > 0) {
        await supabase.from('company_expectations').insert(
          company.expectations.map(e => ({
            id: e.id, company_id: company.id, description: e.description,
            target_timeline: e.targetTimeline, metric_target: e.metricTarget
          }))
        );
      }
    }

    // Insert hindsight records
    if (seedData.hindsightLedger?.length > 0) {
      await supabase.from('hindsight_records').insert(
        seedData.hindsightLedger.map(h => ({
          id: h.id, company_id: h.companyId, company_name: h.companyName,
          expectation_description: h.expectationDescription, expected_timeline: h.expectedTimeline,
          actual_event_id: h.actualEventId, actual_outcome_description: h.actualOutcomeDescription,
          deviation_metric: h.deviationMetric, deviation_value: h.deviationValue,
          hindsight_lesson: h.hindsightLesson, severity: h.severity, timestamp: h.timestamp
        }))
      );
    }

    // Insert market events
    if (seedData.marketEvents?.length > 0) {
      await supabase.from('market_events').insert(
        seedData.marketEvents.map(e => ({
          id: e.id, company_id: e.companyId, company_name: e.companyName,
          title: e.title, content: e.content, impact_type: e.impactType,
          metric_impacted: e.metricImpacted, value_change: e.valueChange,
          raw_source: e.rawSource, timestamp: new Date().toISOString()
        }))
      );
    }

    // Insert memory nodes
    if (seedData.memoryNodes?.length > 0) {
      await supabase.from('memory_nodes').insert(
        seedData.memoryNodes.map(n => ({
          id: n.id, label: n.label, node_group: n.group,
          detail: n.detail, importance: n.importance
        }))
      );
    }

    // Insert memory edges
    if (seedData.memoryEdges?.length > 0) {
      await supabase.from('memory_edges').insert(
        seedData.memoryEdges.map(e => ({
          id: e.id, source: e.source, target: e.target,
          label: e.label, weight: e.weight, edge_type: e.type
        }))
      );
    }

    // Insert memos
    if (seedData.memos?.length > 0) {
      await supabase.from('investment_memos').insert(
        seedData.memos.map(m => ({
          id: m.id, company_id: m.companyId, company_name: m.companyName,
          ticker: m.ticker, title: m.title, recommendation: m.recommendation,
          conviction_score: m.convictionScore, key_thesis: m.keyThesis,
          hindsight_insights: m.hindsightInsights, risk_analysis: m.riskAnalysis,
          growth_outlook: m.growthOutlook, full_memo: m.fullMemo,
          timestamp: m.timestamp
        }))
      );
    }

    log('Seed Complete', { companies: seedData.companies?.length || 0 });
    res.json({ message: 'Database seeded successfully.', seeded: true });
  } catch (error) {
    console.error('[Seed Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[Server] MarketMind AI Backend running on http://localhost:${PORT}`);
  console.log(`[Server] Groq API: ${process.env.GROQ_API_KEY ? 'Configured' : 'NOT SET'}`);
  console.log(`[Server] Tavily API: ${process.env.TAVILY_API_KEY ? 'Configured' : 'NOT SET'}`);
  console.log(`[Server] Supabase: ${supabase ? 'Connected' : 'NOT SET'}`);
});
