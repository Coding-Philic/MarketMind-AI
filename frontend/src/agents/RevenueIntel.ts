import { Company, HindsightRecord, InvestmentMemo, AgentLog, MarketEvent } from '../types';
import { checkBackendConfig, generateLiveMemo } from '../utils/api';

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

      const backendConfig = await checkBackendConfig();
      const hasBackendAi = apiKey || backendConfig.hasApiKey;
      if (hasBackendAi) {
        logs.push({
          message: `[Live AI Mode] Requesting Groq AI to draft strategist memo...`,
          type: 'process'
        });

        try {
          const companyInfoContext = [
            `Description: ${company.description}`,
            company.geopoliticalRisks ? `Geopolitical Risks: ${company.geopoliticalRisks}` : '',
            company.riskFactors ? `Risk Factors: ${company.riskFactors}` : '',
            company.growthOutlook ? `Growth Outlook: ${company.growthOutlook}` : '',
            company.dependencies ? `Dependencies: ${company.dependencies}` : '',
            company.competitorDependencies ? `Competitor Dynamics: ${company.competitorDependencies}` : '',
            company.pastIncidents?.length ? `Past Incidents: ${company.pastIncidents.map(i => `${i.title} (${i.impact})`).join(' | ')}` : '',
            company.currentIncidents?.length ? `Current Incidents: ${company.currentIncidents.map(i => `${i.title} (${i.impact})`).join(' | ')}` : ''
          ].filter(Boolean).join('\n');

          const geminiResult = await generateLiveMemo(
            company.name,
            company.ticker,
            event.title,
            event.content,
            companyLessons.map(l => l.hindsightLesson),
            companyInfoContext
          );

          recommendation = geminiResult.recommendation;
          convictionScore = geminiResult.convictionScore;
          fullMemo = geminiResult.fullMemo;

          logs.push({
            message: `[Live AI Mode] Memo drafted by Groq AI. Rating: ${recommendation} (Score: ${convictionScore}/10).`,
            type: 'success'
          });
        } catch (error: any) {
          logs.push({
            message: `[Fallback Mode] AI API failed: ${error.message || error}. Using local template engine.`,
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
        keyThesis: `Updated market analysis following: "${event.title}". Our confidence score in predicting this company's performance is now at ${newAlignmentScore} out of 100. Recent market lessons have been integrated into this outlook.`,
        hindsightInsights: companyLessons.map(l => l.hindsightLesson),
        riskAnalysis: `Market predictability uncertainty is evaluated at ${100 - newAlignmentScore}%. The primary risks involve meeting project timelines and keeping everyday operations running smoothly.`,
        growthOutlook: `Future yearly revenue is estimated at approximately $${updatedRevenueData[updatedRevenueData.length - 1]?.revenue ?? 0} Million USD, with an estimated profit margin (the percentage of revenue kept as profit) of ${updatedRevenueData[updatedRevenueData.length - 1]?.netMargin ?? 0}%.`,
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
This professional analysis was generated by the Revenue Intelligence Agent following the market announcement of "${event.title}". Utilizing reliable market indicators, we have evaluated ${company.name} (${company.ticker}) and set the overall recommendation to **${recommendation}** with a confidence score of **${convictionScore}/10**. Everything below is explained in clear, easy-to-understand terms so that every reader can easily understand the company's position without needing stock market experience.

### Strategic Moat Evaluation (Competitive Advantage)
The company operates primarily in the **${company.sector}** sector. The recent event directly impacts its performance in **${event.metricImpacted}**, with an estimated change of **${event.valueChange > 0 ? '+' : ''}${event.valueChange}%**. In simple terms, this shows how strongly the latest announcement is expected to influence the company's competitive standing and everyday business strength.

### Integrated Hindsight Lessons (Learning from Past Events)
By examining past performance and comparing previous targets against actual results, our research highlights key lessons to guide future expectations in a clear and practical way:
${hindsightBulletPoints.slice(0, 3).join('\n')}

### Growth Outlook (Future Performance & Profitability)
Looking ahead, we estimate the company's future yearly revenue at approximately **$${lastPoint?.revenue ?? 0} Million USD**, with an estimated profit margin (the percentage of revenue kept as profit after expenses) of **${lastPoint?.netMargin ?? 0}%**. This forecast assumes steady customer demand and normal industry growth conditions.

### Core Risk Parameters (Key Things to Watch)
1. **Market Predictability & Stability**: Our current confidence score for predicting this company's performance is **${newAlignmentScore} out of 100**. A higher score means steadier, more predictable results, while lower scores indicate greater uncertainty.
2. **Operational & Global Risks**: Key things to monitor include potential delays in product timelines, manufacturing disruptions, and worldwide geopolitical events that could impact supply chains or international sales.`;

    return { recommendation, convictionScore, fullMemo };
  }
}
