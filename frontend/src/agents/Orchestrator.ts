import { MarketEvent, Company, HindsightRecord, MemoryNode, MemoryEdge, InvestmentMemo, AgentLog, AgentState } from '../types';
import { MarketMonitor } from './MarketMonitor';
import { HindsightAnalyst } from './HindsightAnalyst';
import { MemoryConsolidator } from './MemoryConsolidator';
import { RevenueIntel } from './RevenueIntel';

export class Orchestrator {
  private monitor = new MarketMonitor();
  private analyst = new HindsightAnalyst();
  private consolidator = new MemoryConsolidator();
  private intel = new RevenueIntel();

  /**
   * Run a complete multi-agent reasoning cycle on an incoming market event.
   * Runs asynchronously step-by-step so the UI can highlight which agent is working.
   */
  public async processEventStepByStep(
    event: MarketEvent,
    state: {
      companies: Company[];
      hindsightLedger: HindsightRecord[];
      marketEvents: MarketEvent[];
      memoryNodes: MemoryNode[];
      memoryEdges: MemoryEdge[];
      memos: InvestmentMemo[];
    },
    updateAgentState: (agentId: string, updates: Partial<AgentState>) => void,
    onLog: (agentId: string, log: Omit<AgentLog, 'id' | 'timestamp'>) => void,
    apiKey: string = '',
    sleepMs: number = 800
  ): Promise<{
    companies: Company[];
    hindsightLedger: HindsightRecord[];
    marketEvents: MarketEvent[];
    memoryNodes: MemoryNode[];
    memoryEdges: MemoryEdge[];
    memos: InvestmentMemo[];
  }> {
    let currentCompanies = [...state.companies];
    let currentHindsightLedger = [...state.hindsightLedger];
    let currentMarketEvents = [event, ...state.marketEvents]; // Ingest event
    let currentNodes = [...state.memoryNodes];
    let currentEdges = [...state.memoryEdges];
    let currentMemos = [...state.memos];

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // ==========================================
    // STEP 1: Market Monitor Agent scans event
    // ==========================================
    updateAgentState('monitor', { status: 'working', currentTask: `Parsing event: ${event.title}`, cpuUsage: 42 });
    await sleep(sleepMs);
    
    const monitorResult = this.monitor.process(event);
    monitorResult.logs.forEach(log => onLog('monitor', log));
    
    updateAgentState('monitor', { status: 'idle', currentTask: 'Awaiting event ingest', cpuUsage: 0 });

    // ==========================================
    // STEP 2: Hindsight Analyst analyzes expectations
    // ==========================================
    updateAgentState('analyst', { status: 'analyzing', currentTask: `Performing hindsight audit on company: ${event.companyName}`, cpuUsage: 68 });
    await sleep(sleepMs);

    const targetCompanyIndex = currentCompanies.findIndex(c => c.id === event.companyId);
    let resolvedExpectationId: string | undefined;
    let newHindsightRecord: HindsightRecord | undefined;

    if (targetCompanyIndex !== -1) {
      const targetCompany = currentCompanies[targetCompanyIndex];
      // Async method integration support
      const analystResult = await this.analyst.analyze(event, targetCompany, apiKey);
      
      analystResult.logs.forEach(log => onLog('analyst', log));
      resolvedExpectationId = analystResult.resolvedExpectationId;
      newHindsightRecord = analystResult.newRecord;

      if (newHindsightRecord) {
        currentHindsightLedger = [newHindsightRecord, ...currentHindsightLedger];
      }

      // If expectation resolved, remove from active list in local memory
      if (resolvedExpectationId) {
        const updatedExpectations = targetCompany.expectations.filter(exp => exp.id !== resolvedExpectationId);
        currentCompanies[targetCompanyIndex] = {
          ...targetCompany,
          expectations: updatedExpectations
        };
      }
    } else {
      onLog('analyst', { message: `Company not found in direct coverage list. Skipping detailed expectation check.`, type: 'warn' });
    }

    updateAgentState('analyst', { status: 'idle', currentTask: 'Awaiting audit queues', cpuUsage: 0 });

    // ==========================================
    // STEP 3: Memory Consolidator consolidates graph
    // ==========================================
    updateAgentState('consolidator', { status: 'consolidating', currentTask: 'Updating Memory Graph links', cpuUsage: 55 });
    await sleep(sleepMs);

    const consolidatorResult = this.consolidator.consolidate(
      event,
      newHindsightRecord,
      currentNodes,
      currentEdges
    );
    consolidatorResult.logs.forEach(log => onLog('consolidator', log));
    currentNodes = consolidatorResult.updatedNodes;
    currentEdges = consolidatorResult.updatedEdges;

    updateAgentState('consolidator', { status: 'idle', currentTask: 'Awaiting memory audit', cpuUsage: 0 });

    // ==========================================
    // STEP 4: Revenue Intelligence strategizes
    // ==========================================
    updateAgentState('intel', { status: 'writing', currentTask: 'Generating strategic intelligence briefs', cpuUsage: 89 });
    await sleep(sleepMs);

    if (targetCompanyIndex !== -1) {
      const targetCompany = currentCompanies[targetCompanyIndex];
      const intelResult = await this.intel.evaluate(targetCompany, event, currentHindsightLedger, apiKey);
      
      intelResult.logs.forEach(log => onLog('intel', log));
      currentCompanies[targetCompanyIndex] = intelResult.updatedCompany;

      if (intelResult.newMemo) {
        currentMemos = [intelResult.newMemo, ...currentMemos];
      }
    }

    updateAgentState('intel', { status: 'idle', currentTask: 'Re-modeling portfolio weights', cpuUsage: 0 });

    return {
      companies: currentCompanies,
      hindsightLedger: currentHindsightLedger,
      marketEvents: currentMarketEvents,
      memoryNodes: currentNodes,
      memoryEdges: currentEdges,
      memos: currentMemos
    };
  }
}
