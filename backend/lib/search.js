import 'dotenv/config.js';
import { log, fetchWithTimeout } from './utils.js';
import YahooFinance from 'yahoo-finance2';

export const yahooFinance = new YahooFinance();

// ---------------------------------------------------------------------------
// Tavily Web Search
// ---------------------------------------------------------------------------
export async function searchTavily(query, options = {}) {
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
// Yahoo Finance helpers (quote + historical)
// ---------------------------------------------------------------------------
export async function fetchYahooQuoteAndHistory(queryOrTicker) {
  const searchRes = await yahooFinance.search(queryOrTicker);
  const firstQuote = (searchRes.quotes || []).find(q => q.quoteType === 'EQUITY' || q.isYahooFinance) || searchRes.quotes?.[0];
  const symbolToUse = firstQuote?.symbol || queryOrTicker;

  const quote = await yahooFinance.quote(symbolToUse);

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
  const historicalData = Object.keys(yearlySnapshots).sort().map(year => {
    const data = yearlySnapshots[year];
    return `Year ${year}: Price $${data.close?.toFixed(2)}, Volume ${data.volume}`;
  });

  return { quote, symbolToUse, historicalData };
}
