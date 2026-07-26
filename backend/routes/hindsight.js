import express from 'express';
import { queryGroq } from '../lib/ai.js';
import { log } from '../lib/utils.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// AI Hindsight Analysis (/api/hindsight)
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  const { companyName, expectation, outcome, userProfile } = req.body;
  log('Request /api/hindsight', { companyName, expectation, outcome });

  if (!companyName || !expectation || !outcome) {
    return res.status(400).json({ error: 'Missing parameters: companyName, expectation, and outcome are required.' });
  }

  let personalizationBlock = '';
  if (userProfile && (userProfile.investmentStyle || userProfile.preferredIndustries?.length > 0)) {
    personalizationBlock = `
USER PERSONALIZATION CONTEXT:
The user requesting this analysis has the following personalized interests:
- Investment Style: ${userProfile.investmentStyle || 'Standard'}
- Risk Tolerance: ${userProfile.riskTolerance || 'Moderate'}
- Preferred Industries: ${(userProfile.preferredIndustries || []).join(', ')}

Please tailor the "hindsight lesson" to highlight how this structural or execution factor specifically affects investments in the user's preferred industries and risk profile.`;
  }

  const prompt = `
You are the Hindsight Analyst Agent for MarketMind AI, an autonomous investment intelligence platform.
Your task is to analyze the deviation between a company's target expectation and a real-world market event.

Company: ${companyName}
Target Expectation: ${expectation}
Actual Event Outcome: ${outcome}

${personalizationBlock}

1. Evaluate how the actual outcome relates to the target expectation. Classify the deviation value strictly into one of the following lowercase tags:
   - "exceeded_expectations" (if the outcome is vastly better than planned)
   - "ahead" (if outcome is slightly ahead or faster than target)
   - "on_track" (if outcome matches targets)
   - "lagging" (if outcome is delayed, slower, or slightly missed)
   - "missed_expectations" (if outcome is noticeably below expectations)
   - "cancelled" (if target is abandoned or project stopped)

2. Formulate a 2-sentence hindsight lesson explaining what structural or execution factor caused this discrepancy and what the strategic takeaway is for an investor.

CRITICAL LANGUAGE REQUIREMENT:
Write this lesson in completely professional yet clear, accessible, and easy-to-understand language. Explain any technical or financial terms so that anyone—even a person without a stock market or financial background—can easily understand what happened, why the expectation was missed or exceeded, and what the takeaway is.

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

export default router;
