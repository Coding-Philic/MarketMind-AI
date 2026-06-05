import { Company, HindsightRecord, InvestmentMemo, AgentLog, MarketEvent } from '../types';
import { checkBackendConfig, generateLiveMemo } from '../utils/gemini';

export class RevenueIntel {
  public name = 'Revenue Intelligence Agent';
  public role = 'Investment strategist & portfolio architect';

  public async evaluate(
    company: Company,
    event: MarketEvent,
    hindsightLessons: HindsightRecord[],
    apiKey: string = ''
  ): Promise<{
    logs: Omit<AgentLog, 'id' | 'timestamp'>[];
    updatedCompany: Company;
    newMemo?: InvestmentMemo;
  }> {
    const logs: Omit<AgentLog, 'id' | 'timestamp'>[] = [];
    
    logs.push({
      message: `[Review] Initiating strategic evaluation of ${company.name}.`,
      type: 'info'
    });

    // 1. Adjust Company alignment score based on event impact
    let alignmentDelta = 0;
    if (event.impactType === 'positive') {
      alignmentDelta = 2;
    } else if (event.impactType === 'negative') {
      alignmentDelta = -4;
    }

    const newAlignmentScore = Math.max(10, Math.min(99, company.alignmentScore + alignmentDelta));
    
    // 2. Adjust revenue/margin in the last quarter to simulate direct market effect
    const updatedRevenueData = [...company.revenueData];
    if (updatedRevenueData.length > 0) {
      const lastPoint = { ...updatedRevenueData[updatedRevenueData.length - 1] };
      const revenueMultiplier = 1 + (event.valueChange / 100) * 0.1;
      lastPoint.revenue = Math.round(lastPoint.revenue * revenueMultiplier);
      
      if (event.metricImpacted === 'margin') {
        lastPoint.netMargin = parseFloat(
          Math.max(1, Math.min(80, lastPoint.netMargin + (event.valueChange > 0 ? 0.8 : -1.2))).toFixed(1)
        );
      }
      updatedRevenueData[updatedRevenueData.length - 1] = lastPoint;
      
      logs.push({
        message: `Financial projections re-calculated: Revenue Adjusted to $${lastPoint.revenue}M. Margin updated to ${lastPoint.netMargin}%.`,
        type: 'process'
      });
    }

    const updatedCompany: Company = {
      ...company,
      alignmentScore: newAlignmentScore,
      revenueData: updatedRevenueData
    };

    logs.push({
      message: `Predictability alignment score shifted from ${company.alignmentScore} to ${newAlignmentScore}.`,
      type: 'warn'
    });

    // 3. Draft new investment memo if event is significant
    let newMemo: InvestmentMemo | undefined = undefined;

    if (Math.abs(event.valueChange) >= 5) {
      logs.push({
        message: `Drafting strategic Investment Intelligence Memo...`,
        type: 'process'
      });

      const companyLessons = hindsightLessons.filter(l => l.companyId === company.id);
      
      let recommendation: InvestmentMemo['recommendation'] = 'HOLD';
      let convictionScore = 6;
      let fullMemo = '';

      const hasBackendAi = apiKey || await checkBackendConfig();
      if (hasBackendAi) {
        logs.push({
          message: `[Live AI Mode] Requesting Gemini-2.5-Flash model to draft strategist memo...`,
          type: 'process'
        });

        try {
          const geminiResult = await generateLiveMemo(
            company.name,
            company.ticker,
            event.title,
            event.content,
            companyLessons.map(l => l.hindsightLesson)
          );

          recommendation = geminiResult.recommendation;
          convictionScore = geminiResult.convictionScore;
          fullMemo = geminiResult.fullMemo;

          logs.push({
            message: `[Live AI Mode] Memo drafted by Gemini. Rating: ${recommendation} (Score: ${convictionScore}/10).`,
            type: 'success'
          });
        } catch (error: any) {
          logs.push({
            message: `[Fallback Mode] Gemini API failed: ${error.message || error}. Using local template engine.`,
            type: 'warn'
          });
          const localFallback = this.compileLocalMemo(company, event, newAlignmentScore, companyLessons, updatedCompany);
          recommendation = localFallback.recommendation;
          convictionScore = localFallback.convictionScore;
          fullMemo = localFallback.fullMemo;
        }
      } else {
        logs.push({
          message: `[Simulator Mode] No API Key set. Applying fallback static memo generation.`,
          type: 'info'
        });
        const localFallback = this.compileLocalMemo(company, event, newAlignmentScore, companyLessons, updatedCompany);
        recommendation = localFallback.recommendation;
        convictionScore = localFallback.convictionScore;
        fullMemo = localFallback.fullMemo;
      }

      const title = `${event.title.substring(0, 50)}${event.title.length > 50 ? '...' : ''} Strategic Analysis`;

      newMemo = {
        id: `memo-gen-${Date.now()}`,
        companyId: company.id,
        companyName: company.name,
        ticker: company.ticker,
        title,
        timestamp: new Date().toISOString(),
        recommendation,
        convictionScore,
        keyThesis: `Refitted valuation model following: "${event.title}". Predictability score is updated to ${newAlignmentScore}%. Hindsight audit has integrated recent lessons.`,
        hindsightInsights: companyLessons.map(l => l.hindsightLesson),
        riskAnalysis: `Predictability volatility is at ${100 - newAlignmentScore}%. Main risks lie in execution stability.`,
        growthOutlook: `Revenue is modeled at $${updatedRevenueData[updatedRevenueData.length - 1]?.revenue ?? 0}M with a net margin of ${updatedRevenueData[updatedRevenueData.length - 1]?.netMargin ?? 0}%.`,
        fullMemo
      };

      logs.push({
        message: `Memo successfully compiled! Rating set to ${recommendation} (Conviction: ${convictionScore}/10).`,
        type: 'success'
      });
    }

    return {
      logs,
      updatedCompany,
      newMemo
    };
  }

  private compileLocalMemo(
    company: Company,
    event: MarketEvent,
    newAlignmentScore: number,
    companyLessons: HindsightRecord[],
    updatedCompany: Company
  ) {
    let recommendation: InvestmentMemo['recommendation'] = 'HOLD';
    let convictionScore = 5;

    if (newAlignmentScore > 80) {
      recommendation = 'BUY';
      convictionScore = 8;
    } else if (newAlignmentScore > 65) {
      recommendation = 'BUY';
      convictionScore = 7;
    } else if (newAlignmentScore > 50) {
      recommendation = 'HOLD';
      convictionScore = 6;
    } else if (newAlignmentScore > 35) {
      recommendation = 'UNDER_REVIEW';
      convictionScore = 4;
    } else {
      recommendation = 'SELL';
      convictionScore = 3;
    }

    const hindsightBulletPoints = companyLessons.length > 0 
      ? companyLessons.map(l => `* **${l.expectedTimeline} Expectation Deviation**: Resolved as *${l.deviationValue.toUpperCase()}* due to ${l.actualOutcomeDescription.substring(0, 80)}... **Key Learning**: ${l.hindsightLesson}`)
      : ['* No significant expectation deviations have been recorded in the hindsight ledger yet. Defaulting to baseline models.'];

    const lastPoint = updatedCompany.revenueData[updatedCompany.revenueData.length - 1];

    const fullMemo = `### Executive Summary
Autonomous memo compiled by the Revenue Intelligence Agent following the announcement of "${event.title}".
We have set the rating for ${company.name} (${company.ticker}) to **${recommendation}** with a conviction score of **${convictionScore}/10**.

### Strategic Moat Evaluation
The company's core asset value is evaluated under the '${company.sector}' segment. The recent event affects the core KPI for **${event.metricImpacted.toUpperCase()}** by an estimated delta of **${event.valueChange > 0 ? '+' : ''}${event.valueChange}%**.

### Integrated Hindsight Ledger Lessons
Hindsight analysis has updated our investment thesis with the following structural parameters to avoid historical analytical bias:
${hindsightBulletPoints.slice(0, 3).join('\n')}

### Growth Outlook
Based on updated margin levels (${lastPoint?.netMargin ?? 0}%) and seasonal multipliers, we model revenue expansion to align with long-term sector averages, assuming supply constraints remain static.

### Core Risk Parameters
1. **Predictability Degradation**: Predictability score is currently at ${newAlignmentScore}/100.
2. **Timeline Deviations**: Previous targets show minor slippage. Geopolitical and manufacturing nodes represent key tail risks.`;

    return { recommendation, convictionScore, fullMemo };
  }
}
