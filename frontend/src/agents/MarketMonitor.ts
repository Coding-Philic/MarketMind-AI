import { MarketEvent, AgentLog } from '../types';

export class MarketMonitor {
  public name = 'Market Monitor Agent';
  public role = 'Market scanner & entity extractor';

  public process(event: MarketEvent): {
    success: boolean;
    logs: Omit<AgentLog, 'id' | 'timestamp'>[];
    extractedInfo: {
      companyId: string;
      companyName: string;
      metric: string;
      magnitude: number;
    };
  } {
    const logs: Omit<AgentLog, 'id' | 'timestamp'>[] = [];
    
    logs.push({
      message: `[Active] Scanning ingest channels. Ingested news item: "${event.title}" from source: [${event.rawSource}].`,
      type: 'info'
    });

    logs.push({
      message: `Analyzing semantic contents: "${event.content.substring(0, 100)}..."`,
      type: 'process'
    });

    // Simulated NLP entity extraction
    const companyId = event.companyId;
    const companyName = event.companyName;
    const metric = event.metricImpacted;
    const magnitude = event.valueChange;

    logs.push({
      message: `Entity Extracted: [Company: ${companyName} (${companyId.toUpperCase()})], [Primary Metric Impacted: ${metric.toUpperCase()}], [Delta: ${magnitude > 0 ? '+' : ''}${magnitude}%].`,
      type: 'success'
    });

    return {
      success: true,
      logs,
      extractedInfo: {
        companyId,
        companyName,
        metric,
        magnitude
      }
    };
  }
}
