import 'dotenv/config.js';
import { pipeline } from '@xenova/transformers';

// ---------------------------------------------------------------------------
// Local Embeddings (Transformers.js — Xenova/all-MiniLM-L6-v2)
// ---------------------------------------------------------------------------
let embedder = null;
export async function getEmbedder() {
  if (!embedder) {
    try {
      embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      console.log('[Server] Transformers.js embedder initialized.');
    } catch (e) {
      console.error('[Server] Failed to load embedder:', e);
    }
  }
  return embedder;
}

export async function generateEmbedding(text) {
  const model = await getEmbedder();
  if (!model) return Array(384).fill(0);
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// ---------------------------------------------------------------------------
// Groq AI — single unified query function
// ---------------------------------------------------------------------------
import { fetchWithTimeout } from './utils.js';
import { log } from './utils.js';

export const defaultSystemPrompt = `You are a Senior Institutional Investment Analyst, Chief Market Strategist, and Team Lead with over 15 years of stock market, portfolio management, and corporate evolution experience. Your mission is to analyze companies, financial trajectories, risk factors, and product ecosystems with institutional precision and deep market intuition.
CRITICAL RULE: You MUST explain your findings, financial mechanics, strategic dependencies, and market insights in clean, simple, beginner-friendly language so that anyone—even a complete newcomer with zero investing or stock market background—can easily understand how the market works and what drives the company's value. Avoid unexplained financial jargon; simplify complex concepts using clear analogies and straightforward terms.
DYNAMIC ATTRIBUTION RULE: Always ensure every sector, product category, rating, and financial metric is dynamically derived from real-world data and financial reality. NEVER use generic placeholders or hardcoded assumptions.`;

export async function queryGroq(prompt, options = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('GROQ_API_KEY is not configured in backend/.env');
  }

  const model = options.model || 'openai/gpt-oss-120b';
  const maxTokens = options.maxTokens || 2048;
  const temperature = options.temperature ?? 0.3;

  const modelsToTry = [model];
  if (model === 'openai/gpt-oss-120b') {
    modelsToTry.push('llama-3.3-70b-versatile', 'llama-3.1-8b-instant');
  }

  let lastError = null;
  for (const currentModel of modelsToTry) {
    try {
      log('Groq Request', { model: currentModel, promptLength: prompt.length });
      const response = await fetchWithTimeout(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: options.system || defaultSystemPrompt },
              { role: 'user', content: prompt }
            ],
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
        throw new Error(`Groq API Error (${currentModel}): ${message}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Groq API returned empty content');

      log('Groq Response', { model: currentModel, responseLength: text.length });
      return text.trim();
    } catch (err) {
      lastError = err;
      console.warn(`[Server] Model ${currentModel} failed: ${err.message}. ${modelsToTry.indexOf(currentModel) < modelsToTry.length - 1 ? 'Trying fallback...' : ''}`);
      if (modelsToTry.indexOf(currentModel) < modelsToTry.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Context summarizer (uses lighter model, with caching)
// ---------------------------------------------------------------------------
import { normalizeText } from './utils.js';

const summaryCache = new Map();

export async function summarizeContext(contextText) {
  const trimmed = normalizeText(contextText);
  if (!trimmed) return '';
  if (trimmed.length < 1600) return trimmed;

  const cacheKey = `summary:${trimmed.slice(0, 180)}:${trimmed.length}`;
  if (summaryCache.has(cacheKey)) return summaryCache.get(cacheKey);

  const prompt = `You are a compact research summarizer for MarketMind AI.
Summarize the following company/event context into 6-8 concise bullet points that preserve the most relevant strategic, risk, and execution signals. Do not invent facts.

CRITICAL LANGUAGE REQUIREMENT:
Write this summary in completely professional yet clear, accessible, and easy-to-understand language. Every concept, market signal, or financial term must be explained or phrased so that anyone—even a person without any background in the stock market or finance—can easily understand what is happening.

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
