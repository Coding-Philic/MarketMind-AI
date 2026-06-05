/**
 * Utility client that communicates with the local Express backend server.
 * Delegates all Gemini API queries and prompting to the backend to protect credentials.
 */

interface ConfigResponse {
  hasApiKey: boolean;
}

interface HindsightResponse {
  lesson: string;
  deviationValue: 'ahead' | 'on_track' | 'lagging' | 'cancelled' | 'exceeded_expectations' | 'missed_expectations';
  error?: string;
}

interface MemoResponse {
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'UNDER_REVIEW';
  convictionScore: number;
  fullMemo: string;
  error?: string;
}

/**
 * Checks if the backend has a Gemini API key configured in its .env file.
 */
export async function checkBackendConfig(): Promise<boolean> {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) return false;
    const data: ConfigResponse = await response.json();
    return data.hasApiKey;
  } catch (error) {
    console.error('Failed to contact backend config route: ', error);
    return false;
  }
}

/**
 * Delegated call to backend for hindsight analysis.
 */
export async function generateLiveHindsight(
  companyName: string,
  expectation: string,
  outcome: string
): Promise<{ lesson: string; deviationValue: HindsightResponse['deviationValue'] }> {
  const response = await fetch('/api/hindsight', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ companyName, expectation, outcome })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server returned status ${response.status}`);
  }

  const data: HindsightResponse = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return {
    lesson: data.lesson,
    deviationValue: data.deviationValue
  };
}

/**
 * Delegated call to backend for investment memo generation.
 */
export async function generateLiveMemo(
  companyName: string,
  ticker: string,
  eventTitle: string,
  eventContent: string,
  lessons: string[]
): Promise<{ recommendation: MemoResponse['recommendation']; convictionScore: number; fullMemo: string }> {
  const response = await fetch('/api/memo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ companyName, ticker, eventTitle, eventContent, lessons })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server returned status ${response.status}`);
  }

  const data: MemoResponse = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return {
    recommendation: data.recommendation,
    convictionScore: data.convictionScore,
    fullMemo: data.fullMemo
  };
}
