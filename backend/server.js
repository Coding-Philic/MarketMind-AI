import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Note: Node 24 includes native fetch globally — no node-fetch import needed.

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function logBackendEvent(label, details) {
  console.log(`[Backend ${label}]`, details);
}

// helper function to query NVIDIA API using the provided model
async function queryNvidia(prompt, customApiKey) {
  const apiKey = customApiKey || process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('NVIDIA API Key is not configured. Set NVIDIA_API_KEY in backend/.env.');
  }

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemma-4-31b-it',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 16384,
      temperature: 1.0,
      top_p: 0.95,
      stream: false,
      chat_template_kwargs: { enable_thinking: true }
    })
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message = errorJson?.error?.message || `HTTP ${response.status} Error`;
    throw new Error(`NVIDIA API Request Failed: ${message}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text || typeof text !== 'string') {
    throw new Error('NVIDIA API returned an empty or invalid response format.');
  }

  return text.trim();
}

// fallback helper for Gemini if NVIDIA key is unavailable
async function queryGemini(prompt, customApiKey) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('No AI API Key is configured. Set NVIDIA_API_KEY or GEMINI_API_KEY in backend/.env.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message = errorJson?.error?.message || `HTTP ${response.status} Error`;
    throw new Error(`Gemini API Request Failed: ${message}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('Gemini API returned an empty or invalid candidate format.');
  }

  return text.trim();
}

async function queryAI(prompt, customApiKey) {
  const nvidiaKey = customApiKey || process.env.NVIDIA_API_KEY;
  if (nvidiaKey && nvidiaKey.trim().length > 0) {
    logBackendEvent('AI Engine', { engine: 'nvidia', source: 'backend' });
    return queryNvidia(prompt, nvidiaKey);
  }

  const geminiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim().length > 0) {
    logBackendEvent('AI Engine', { engine: 'gemini', source: 'backend' });
    return queryGemini(prompt, geminiKey);
  }

  throw new Error('No AI API Key is configured. Set NVIDIA_API_KEY or GEMINI_API_KEY in backend/.env.');
}

// 1. Config status checker
app.get('/api/config', (req, res) => {
  const keyExists = !!(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.trim().length > 0)
    || !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  logBackendEvent('Request /api/config', { hasApiKey: keyExists, source: 'backend' });
  res.json({ hasApiKey: keyExists });
});

// 2. Hindsight lesson evaluator route
app.post('/api/hindsight', async (req, res) => {
  const { companyName, expectation, outcome, apiKey } = req.body;
  const clientApiKey = req.headers['x-api-key'] || apiKey;
  logBackendEvent('Request /api/hindsight', { companyName, expectation, outcome, hasClientApiKey: Boolean(clientApiKey) });

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
   - "cancelled" (if target is abandoned or EV project stopped)

2. Formulate a 2-sentence hindsight lesson explaining what structural or execution factor caused this discrepancy and what the strategic takeaway is for an investor.

OUTPUT FORMAT:
On the first line, write exactly: DEVIATION: [your selected tag]
On the following lines, write the hindsight lesson text.

Example Output:
DEVIATION: lagging
Advanced multi-die packaging transitions carry high assembly friction that standard fabrication timelines underestimate. Investors should build in a 120-day yield delay buffer for first-generation node ramps.
`;

  try {
    const responseText = await queryAI(prompt, clientApiKey);
    logBackendEvent('AI Response /api/hindsight', { companyName, responseText });

    // Parse response
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

// 3. Investment brief compiler route
app.post('/api/memo', async (req, res) => {
  const { companyName, ticker, eventTitle, eventContent, lessons, apiKey } = req.body;
  const clientApiKey = req.headers['x-api-key'] || apiKey;
  logBackendEvent('Request /api/memo', { companyName, ticker, eventTitle, lessonCount: Array.isArray(lessons) ? lessons.length : 0, hasClientApiKey: Boolean(clientApiKey) });

  if (!companyName || !ticker || !eventTitle || !eventContent) {
    return res.status(400).json({ error: 'Missing parameters: companyName, ticker, eventTitle, and eventContent are required.' });
  }

  const lessonsList = Array.isArray(lessons) ? lessons : [];
  const lessonsString = lessonsList.map(l => `- ${l}`).join('\n');

  const prompt = `
You are the Revenue Intelligence Agent for MarketMind AI. Write an institutional-grade, publication-quality investment research memo in Markdown.

Company: ${companyName} (${ticker})
Recent Trigger Event: ${eventTitle} - ${eventContent}
Historical Hindsight Lessons Learned for this Company:
${lessonsString || '- No previous expectation deviations recorded.'}

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
    const responseText = await queryAI(prompt, clientApiKey);

    const lines = responseText.split('\n');
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

    logBackendEvent('AI Response /api/memo', { companyName, recommendation, convictionScore, fullMemoPreview: fullMemo.slice(0, 220) });
    res.json({ recommendation, convictionScore, fullMemo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`[Server] MarketMind AI Backend running on http://localhost:${PORT}`);
});
