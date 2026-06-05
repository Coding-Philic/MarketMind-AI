import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MemoryGraphView } from './components/MemoryGraphView';
import { HindsightLedgerView } from './components/HindsightLedgerView';
import { CompanyEvolutionView } from './components/CompanyEvolutionView';
import { IntelHubView } from './components/IntelHubView';

import { Company, HindsightRecord, MarketEvent, MemoryNode, MemoryEdge, InvestmentMemo, AgentState, AgentLog } from './types';
import { 
  initialCompanies, 
  initialHindsightLedger, 
  initialMarketEvents, 
  initialMemoryNodes, 
  initialMemoryEdges, 
  mockMemos 
} from './data/mockData';
import { Orchestrator } from './agents/Orchestrator';
import { checkBackendConfig } from './utils/gemini';

const initialAgents: AgentState[] = [
  {
    id: 'monitor',
    name: 'Market Monitor Agent',
    role: 'Market scanner & entity extractor',
    status: 'idle',
    lastActive: 'Just now',
    currentTask: 'Awaiting event ingest',
    cpuUsage: 0,
    memoryUsage: 35,
    logs: []
  },
  {
    id: 'analyst',
    name: 'Hindsight Analyst Agent',
    role: 'Prediction tracker & deviation auditor',
    status: 'idle',
    lastActive: 'Just now',
    currentTask: 'Awaiting audit queues',
    cpuUsage: 0,
    memoryUsage: 48,
    logs: []
  },
  {
    id: 'consolidator',
    name: 'Memory Consolidator Agent',
    role: 'Knowledge graph architect & memory indexer',
    status: 'idle',
    lastActive: 'Just now',
    currentTask: 'Awaiting memory audit',
    cpuUsage: 0,
    memoryUsage: 64,
    logs: []
  },
  {
    id: 'intel',
    name: 'Revenue Intelligence Agent',
    role: 'Investment strategist & portfolio architect',
    status: 'idle',
    lastActive: 'Just now',
    currentTask: 'Re-modeling portfolio weights',
    cpuUsage: 0,
    memoryUsage: 92,
    logs: []
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSimulating, setIsSimulating] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('mm_gemini_api_key') || '');
  const [isBackendLive, setIsBackendLive] = useState(false);

  // Core Data States
  const [companies, setCompanies] = useState<Company[]>([]);
  const [hindsightLedger, setHindsightLedger] = useState<HindsightRecord[]>([]);
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
  const [memoryNodes, setMemoryNodes] = useState<MemoryNode[]>([]);
  const [memoryEdges, setMemoryEdges] = useState<MemoryEdge[]>([]);
  const [memos, setMemos] = useState<InvestmentMemo[]>([]);
  const [agents, setAgents] = useState<AgentState[]>(initialAgents);

  // Instantiating Orchestrator
  const orchestrator = new Orchestrator();

  const handleSetApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('mm_gemini_api_key', key);
  };

  // Load from localStorage on mount
  useEffect(() => {
    const detectBackend = async () => {
      const hasBackendKey = await checkBackendConfig();
      setIsBackendLive(hasBackendKey);
    };
    detectBackend();

    const cachedCompanies = localStorage.getItem('mm_companies');
    const cachedLedger = localStorage.getItem('mm_ledger');
    const cachedEvents = localStorage.getItem('mm_events');
    const cachedNodes = localStorage.getItem('mm_nodes');
    const cachedEdges = localStorage.getItem('mm_edges');
    const cachedMemos = localStorage.getItem('mm_memos');
    const cachedAgents = localStorage.getItem('mm_agents');

    setCompanies(cachedCompanies ? JSON.parse(cachedCompanies) : initialCompanies);
    setHindsightLedger(cachedLedger ? JSON.parse(cachedLedger) : initialHindsightLedger);
    setMarketEvents(cachedEvents ? JSON.parse(cachedEvents) : initialMarketEvents);
    setMemoryNodes(cachedNodes ? JSON.parse(cachedNodes) : initialMemoryNodes);
    setMemoryEdges(cachedEdges ? JSON.parse(cachedEdges) : initialMemoryEdges);
    setMemos(cachedMemos ? JSON.parse(cachedMemos) : mockMemos);
    setAgents(cachedAgents ? JSON.parse(cachedAgents) : initialAgents);
  }, []);

  // Save states to localStorage
  const saveStateToStorage = (
    c: Company[],
    l: HindsightRecord[],
    ev: MarketEvent[],
    n: MemoryNode[],
    ed: MemoryEdge[],
    m: InvestmentMemo[]
  ) => {
    localStorage.setItem('mm_companies', JSON.stringify(c));
    localStorage.setItem('mm_ledger', JSON.stringify(l));
    localStorage.setItem('mm_events', JSON.stringify(ev));
    localStorage.setItem('mm_nodes', JSON.stringify(n));
    localStorage.setItem('mm_edges', JSON.stringify(ed));
    localStorage.setItem('mm_memos', JSON.stringify(m));
  };

  // Callback to update specific agent state details
  const updateAgentState = (agentId: string, updates: Partial<AgentState>) => {
    setAgents(prev => {
      const updated = prev.map(a => {
        if (a.id === agentId) {
          return {
            ...a,
            ...updates,
            lastActive: new Date().toLocaleTimeString()
          };
        }
        return a;
      });
      localStorage.setItem('mm_agents', JSON.stringify(updated));
      return updated;
    });
  };

  // Callback to log a message for a specific agent
  const onLog = (agentId: string, logLine: Omit<AgentLog, 'id' | 'timestamp'>) => {
    setAgents(prev => {
      const updated = prev.map(a => {
        if (a.id === agentId) {
          const newLog: AgentLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            ...logLine
          };
          return {
            ...a,
            logs: [...a.logs, newLog]
          };
        }
        return a;
      });
      localStorage.setItem('mm_agents', JSON.stringify(updated));
      return updated;
    });
  };

  // Ingest and process a new market event sequentially
  const triggerEventProcessing = async (event: MarketEvent) => {
    setIsSimulating(true);

    // Clear logs from previous runs for better clarity
    setAgents(prev => prev.map(a => ({ ...a, logs: [] })));

    try {
      const nextState = await orchestrator.processEventStepByStep(
        event,
        {
          companies,
          hindsightLedger,
          marketEvents,
          memoryNodes,
          memoryEdges,
          memos
        },
        updateAgentState,
        onLog,
        apiKey
      );

      // Save output
      setCompanies(nextState.companies);
      setHindsightLedger(nextState.hindsightLedger);
      setMarketEvents(nextState.marketEvents);
      setMemoryNodes(nextState.memoryNodes);
      setMemoryEdges(nextState.memoryEdges);
      setMemos(nextState.memos);

      saveStateToStorage(
        nextState.companies,
        nextState.hindsightLedger,
        nextState.marketEvents,
        nextState.memoryNodes,
        nextState.memoryEdges,
        nextState.memos
      );
    } catch (error) {
      console.error('Simulation step error: ', error);
    } finally {
      setIsSimulating(false);
    }
  };

  // Save changes made in memo editor
  const onUpdateMemo = (memoId: string, updatedMemo: InvestmentMemo) => {
    setMemos(prev => {
      const next = prev.map(m => m.id === memoId ? updatedMemo : m);
      localStorage.setItem('mm_memos', JSON.stringify(next));
      return next;
    });
  };

  // Tab View Dispatcher
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            companies={companies}
            marketEvents={marketEvents}
            agents={agents}
            ledgerCount={hindsightLedger.length}
            triggerEventProcessing={triggerEventProcessing}
            isSimulating={isSimulating}
            setIsSimulating={setIsSimulating}
          />
        );
      case 'network':
        return (
          <MemoryGraphView
            nodes={memoryNodes}
            edges={memoryEdges}
          />
        );
      case 'ledger':
        return (
          <HindsightLedgerView
            ledger={hindsightLedger}
          />
        );
      case 'evolution':
        return (
          <CompanyEvolutionView
            companies={companies}
            hindsightLedger={hindsightLedger}
          />
        );
      case 'intel':
        return (
          <IntelHubView
            memos={memos}
            onUpdateMemo={onUpdateMemo}
          />
        );
      default:
        return (
          <div style={{ padding: '24px' }}>
            <h2>Unknown Node Context</h2>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        memoCount={memos.length}
        ledgerCount={hindsightLedger.length}
        isLiveAi={isBackendLive || Boolean(apiKey)}
      />

      {/* Main View Port */}
      <main className="main-content">
        <div style={{ flexGrow: 1 }}>
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
