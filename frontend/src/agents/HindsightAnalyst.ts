import { MarketEvent, HindsightRecord, Company, AgentLog } from '../types';
import { checkBackendConfig, generateLiveHindsight } from '../utils/gemini';

export class HindsightAnalyst {
  public name = 'Hindsight Analyst Agent';
  public role = 'Prediction tracker & deviation auditor';

  public async analyze(
    event: MarketEvent,
    company: Company,
    apiKey: string = ''
  ): Promise<{
    logs: Omit<AgentLog, 'id' | 'timestamp'>[];
    newRecord?: HindsightRecord;
    resolvedExpectationId?: string;
  }> {
    const logs: Omit<AgentLog, 'id' | 'timestamp'>[] = [];
    
    logs.push({
      message: `[Query] Querying expectation registry for ${company.name} (${company.ticker}). Checking if event "${event.title}" resolves any active target.`,
      type: 'info'
    });

    // Check if the event matches any expectations.
    const matchedExpectation = company.expectations.find(exp => {
      const descWords = exp.description.toLowerCase().split(' ');
      const titleWords = event.title.toLowerCase().split(' ');
      const contentWords = event.content.toLowerCase().split(' ');
      
      const matches = descWords.filter(word => 
        word.length > 3 && 
        (titleWords.includes(word) || contentWords.includes(word) || event.title.toLowerCase().includes(word))
      );
      
      return matches.length >= 1;
    });

    if (matchedExpectation) {
      logs.push({
        message: `MATCH FOUND! Event correlates with expectation: "${matchedExpectation.description}" (Target: ${matchedExpectation.targetTimeline}).`,
        type: 'process'
      });

      let deviationValue: HindsightRecord['deviationValue'] = 'on_track';
      let lesson = '';
      let severity: HindsightRecord['severity'] = 'minor';

      // 1. Live AI Mode via backend (preferred)
      const hasBackendAi = apiKey || await checkBackendConfig();
      if (hasBackendAi) {
        logs.push({
          message: `[Live AI Mode] Contacting Gemini-2.5-Flash model to audit target deviation context...`,
          type: 'process'
        });

        try {
          const geminiResult = await generateLiveHindsight(
            company.name,
            matchedExpectation.description,
            event.content
          );

          deviationValue = geminiResult.deviationValue;
          lesson = geminiResult.lesson;
          severity = (deviationValue === 'cancelled' || deviationValue === 'missed_expectations') ? 'critical' : 
                     (deviationValue === 'lagging') ? 'moderate' : 'minor';

          logs.push({
            message: `[Live AI Mode] Gemini evaluation complete. Audit: [${deviationValue.toUpperCase()}].`,
            type: 'success'
          });
        } catch (error: any) {
          logs.push({
            message: `[Fallback Mode] Gemini API failed: ${error.message || error}. Reverting to local rule-based models.`,
            type: 'warn'
          });
          // Call local rule generator below
          const fallback = this.generateLocalFallback(event, matchedExpectation);
          deviationValue = fallback.deviationValue;
          lesson = fallback.lesson;
          severity = fallback.severity;
        }
      } else {
        // 2. Rule-Based Fallback Mode
        logs.push({
          message: `[Simulator Mode] No API Key set. Applying fallback heuristic rule analysis.`,
          type: 'info'
        });
        const fallback = this.generateLocalFallback(event, matchedExpectation);
        deviationValue = fallback.deviationValue;
        lesson = fallback.lesson;
        severity = fallback.severity;
      }

      logs.push({
        message: `Performing Hindsight Audit: Expectation: "${matchedExpectation.description}" | Actual: "${event.title}". Deviation calculated: [${deviationValue.toUpperCase()}].`,
        type: 'warn'
      });

      const newRecord: HindsightRecord = {
        id: `h-gen-${Date.now()}`,
        companyId: company.id,
        companyName: company.name,
        expectationDescription: matchedExpectation.description,
        expectedTimeline: matchedExpectation.targetTimeline,
        actualEventId: event.id,
        actualOutcomeDescription: event.content,
        deviationMetric: matchedExpectation.id.includes('exp-1') ? 'adoption' : matchedExpectation.id.includes('exp-2') ? 'revenue' : 'timeline',
        deviationValue,
        hindsightLesson: lesson,
        severity,
        timestamp: new Date().toISOString()
      };

      logs.push({
        message: `Hindsight lesson saved to ledger: "${lesson.substring(0, 75)}..."`,
        type: 'success'
      });

      return {
        logs,
        newRecord,
        resolvedExpectationId: matchedExpectation.id
      };
    } else {
      logs.push({
        message: `No active registered expectation directly matches event. Proceeding with procedural hindsight impact tracking on general operations.`,
        type: 'info'
      });
      return { logs };
    }
  }

  private generateLocalFallback(event: MarketEvent, matchedExpectation: any) {
    let deviationValue: HindsightRecord['deviationValue'] = 'on_track';
    let lesson = '';
    let severity: HindsightRecord['severity'] = 'minor';

    if (event.impactType === 'positive') {
      deviationValue = event.valueChange > 10 ? 'exceeded_expectations' : 'ahead';
      severity = 'minor';
      lesson = `Success outcome exceeded targets. Higher scale than modeled was unlocked due to: ${event.title.toLowerCase()}. Maintain upward adjustments on core multipliers.`;
    } else if (event.impactType === 'negative') {
      deviationValue = event.valueChange < -10 ? 'cancelled' : 'lagging';
      severity = 'critical';
      lesson = `Negative friction encountered: ${event.title.toLowerCase()}. Critical failure to secure target metrics on the original timeline suggests structural errors in initial capability assumptions.`;
    } else {
      deviationValue = 'on_track';
      severity = 'moderate';
      lesson = `System is stabilizing around the target metrics. However, minor efficiency shifts require continuous tracking of secondary parameters.`;
    }

    // Special cases based on keywords
    if (event.title.toLowerCase().includes('blackwell') && event.title.toLowerCase().includes('capacity')) {
      deviationValue = 'exceeded_expectations';
      severity = 'minor';
      lesson = `Supply chains are more modular than initial bottlenecks suggested. When advanced packaging yields mature, supply velocity catches up instantly. Adjust packaging friction limits downwards by 20%.`;
    } else if (event.title.toLowerCase().includes('recall') || event.title.toLowerCase().includes('security')) {
      deviationValue = 'lagging';
      severity = 'moderate';
      lesson = `Integration of invasive AI features (Recall) triggers instant consumer pushback and regulatory audits. Standard privacy constraints are harder constants than product speed. Always model local opt-in delays.`;
    } else if (event.title.toLowerCase().includes('probe') || event.title.toLowerCase().includes('phantom')) {
      deviationValue = 'lagging';
      severity = 'critical';
      lesson = `System verification delays scale exponentially under government probes. Autonomy software lacks deterministic boundaries, making traditional compliance models slow down safety certification.`;
    }

    return { deviationValue, lesson, severity };
  }
}
