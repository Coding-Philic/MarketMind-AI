// ---------------------------------------------------------------------------
// General utility helpers shared across route modules
// ---------------------------------------------------------------------------

export function log(label, details) {
  console.log(`[Backend ${label}]`, typeof details === 'string' ? details : JSON.stringify(details));
}

export function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
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

export function chunkText(text, maxChars = 500) {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let chunks = [];
  let currentChunk = '';
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

export function generateFallbackMemo({ companyName, ticker, eventTitle, eventContent, lessonsList, condensedContext }) {
  const recommendation = 'HOLD';
  const convictionScore = 5;
  const lessons = lessonsList.length > 0
    ? lessonsList.slice(0, 3).map(l => `- ${l}`).join('\n')
    : '- No prior lesson history available.';

  return `SUMMARY: ${recommendation} | ${convictionScore}

### Executive Summary
A fast fallback investment memo was generated for ${companyName} (${ticker}) because the live AI model did not respond in time. The current trigger event, "${eventTitle}", indicates the market is reacting to ${normalizeText(eventContent)}. This report is written in clear, professional, easy-to-understand language so that every reader can easily understand the company's market position without needing technical stock market knowledge.

### Strategic Moat Evaluation (Competitive Advantage)
${normalizeText(condensedContext || 'Limited context available. In simple terms, we evaluate how strongly the company protects its business from competitors.')}

### Integrated Hindsight Lessons (Learning from Past Events)
${lessons}

### Growth Outlook (Future Performance)
Near-term progress looks directionally positive, but we advise carefully watching how well the company executes its plans, meets deadlines, and handles market reactions in simple, practical terms.

### Core Risk Parameters (Key Things to Monitor)
1. **Response Timeliness**: AI processing delays can occasionally slow down full report generation.
2. **Execution Reliability**: Past lessons should continue to guide everyday expectations for company deadlines and goals.
3. **Market Volatility**: Economic and industry conditions can change quickly in response to breaking news events.
`;
}
