import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MemoryGraphView } from './components/MemoryGraphView';
import { HindsightLedgerView } from './components/HindsightLedgerView';
import { CompanyEvolutionView } from './components/CompanyEvolutionView';
import { IntelHubView } from './components/IntelHubView';
import { CompanySearchView } from './components/CompanySearchView';

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
import {
  checkBackendConfig,
  fetchCompanies,
  fetchEvents,
  fetchHindsightRecords,
  fetchMemoryGraph,
  fetchMemos,
  saveEvent,
  saveHindsightRecord,
  saveMemoryNodes,
  saveMemoryEdges,
  saveMemo,
  seedDatabase
} from './utils/api';
import { subscribeToTables } from './utils/supabase';

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
  const [apiKey] = useState('');
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [hasDatabase, setHasDatabase] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Load all data from Supabase (via backend API)
  const loadAllData = useCallback(async () => {
    try {
      const [companiesData, eventsData, hindsightData, graphData, memosData] = await Promise.all([
        fetchCompanies().catch(() => []),
        fetchEvents().catch(() => []),
        fetchHindsightRecords().catch(() => []),
        fetchMemoryGraph().catch(() => ({ nodes: [], edges: [] })),
        fetchMemos().catch(() => [])
      ]);

      // If database is empty, seed it with mock data
      if (companiesData.length === 0) {
        console.log('[App] Database empty — seeding with initial data...');
        try {
          const seedResult = await seedDatabase({
            companies: initialCompanies,
            hindsightLedger: initialHindsightLedger,
            marketEvents: initialMarketEvents,
            memoryNodes: initialMemoryNodes,
            memoryEdges: initialMemoryEdges,
            memos: mockMemos
          });

          if (seedResult.seeded) {
            // Re-fetch after seeding
            const [c, e, h, g, m] = await Promise.all([
              fetchCompanies().catch(() => initialCompanies),
              fetchEvents().catch(() => initialMarketEvents),
              fetchHindsightRecords().catch(() => initialHindsightLedger),
              fetchMemoryGraph().catch(() => ({ nodes: initialMemoryNodes, edges: initialMemoryEdges })),
              fetchMemos().catch(() => mockMemos)
            ]);
            setCompanies(c);
            setMarketEvents(e);
            setHindsightLedger(h);
            setMemoryNodes(g.nodes);
            setMemoryEdges(g.edges);
            setMemos(m);
            return;
          }
        } catch (seedErr) {
          console.warn('[App] Seed failed, using local mock data:', seedErr);
          setCompanies(initialCompanies);
          setMarketEvents(initialMarketEvents);
          setHindsightLedger(initialHindsightLedger);
          setMemoryNodes(initialMemoryNodes);
          setMemoryEdges(initialMemoryEdges);
          setMemos(mockMemos);
          return;
        }
      }

      setCompanies(companiesData.length > 0 ? companiesData : initialCompanies);
      setMarketEvents(eventsData.length > 0 ? eventsData : initialMarketEvents);
      setHindsightLedger(hindsightData.length > 0 ? hindsightData : initialHindsightLedger);
      setMemoryNodes(graphData.nodes.length > 0 ? graphData.nodes : initialMemoryNodes);
      setMemoryEdges(graphData.edges.length > 0 ? graphData.edges : initialMemoryEdges);
      setMemos(memosData.length > 0 ? memosData : mockMemos);
    } catch (error) {
      console.error('[App] Failed to load data from API, using fallback:', error);
      setCompanies(initialCompanies);
      setHindsightLedger(initialHindsightLedger);
      setMarketEvents(initialMarketEvents);
      setMemoryNodes(initialMemoryNodes);
      setMemoryEdges(initialMemoryEdges);
      setMemos(mockMemos);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      // Check backend config
      const config = await checkBackendConfig();
      setIsBackendLive(config.hasApiKey);
      setHasDatabase(config.hasDatabase);

      // Load data from Supabase via backend
      await loadAllData();
      setIsLoading(false);
    };

    init();
  }, [loadAllData]);

  // Supabase Realtime subscriptions
  useEffect(() => {
    const unsubscribe = subscribeToTables([
      {
        table: 'companies',
        callback: () => {
          // Reload companies when changes detected
          fetchCompanies().then(setCompanies).catch(console.error);
        }
      },
      {
        table: 'hindsight_records',
        callback: () => {
          fetchHindsightRecords().then(setHindsightLedger).catch(console.error);
        }
      },
      {
        table: 'market_events',
        callback: () => {
          fetchEvents().then(setMarketEvents).catch(console.error);
        }
      },
      {
        table: 'memory_nodes',
        callback: () => {
          fetchMemoryGraph().then(g => {
            setMemoryNodes(g.nodes);
            setMemoryEdges(g.edges);
          }).catch(console.error);
        }
      },
      {
        table: 'investment_memos',
        callback: () => {
          fetchMemos().then(setMemos).catch(console.error);
        }
      }
    ]);

    return () => unsubscribe();
  }, []);

  // Agent state helpers
  const updateAgentState = (agentId: string, updates: Partial<AgentState>) => {
    setAgents(prev =>
      prev.map(a => a.id === agentId
        ? { ...a, ...updates, lastActive: new Date().toLocaleTimeString() }
        : a
      )
    );
  };

  const onLog = (agentId: string, logLine: Omit<AgentLog, 'id' | 'timestamp'>) => {
    setAgents(prev =>
      prev.map(a => {
        if (a.id === agentId) {
          const newLog: AgentLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            ...logLine
          };
          return { ...a, logs: [...a.logs, newLog] };
        }
        return a;
      })
    );
  };

  // Process market event through the agent pipeline, then persist to Supabase
  const triggerEventProcessing = async (event: MarketEvent) => {
    setIsSimulating(true);
    setAgents(prev => prev.map(a => ({ ...a, logs: [] })));

    try {
      const nextState = await orchestrator.processEventStepByStep(
        event,
        { companies, hindsightLedger, marketEvents, memoryNodes, memoryEdges, memos },
        updateAgentState,
        onLog,
        apiKey
      );

      // Update local state
      setCompanies(nextState.companies);
      setHindsightLedger(nextState.hindsightLedger);
      setMarketEvents(nextState.marketEvents);
      setMemoryNodes(nextState.memoryNodes);
      setMemoryEdges(nextState.memoryEdges);
      setMemos(nextState.memos);

      // Persist to Supabase via backend API (fire-and-forget, non-blocking)
      saveEvent(event).catch(e => console.warn('[Persist] Event save failed:', e));

      // Save new hindsight records
      const newHindsightRecords = nextState.hindsightLedger.filter(
        h => !hindsightLedger.some(existing => existing.id === h.id)
      );
      for (const record of newHindsightRecords) {
        saveHindsightRecord(record).catch(e => console.warn('[Persist] Hindsight save failed:', e));
      }

      // Save new memory nodes and edges
      const newNodes = nextState.memoryNodes.filter(
        n => !memoryNodes.some(existing => existing.id === n.id)
      );
      const newEdges = nextState.memoryEdges.filter(
        e => !memoryEdges.some(existing => existing.id === e.id)
      );
      if (newNodes.length > 0) saveMemoryNodes(newNodes).catch(e => console.warn('[Persist] Nodes save failed:', e));
      if (newEdges.length > 0) saveMemoryEdges(newEdges).catch(e => console.warn('[Persist] Edges save failed:', e));

      // Save new memos
      const newMemos = nextState.memos.filter(
        m => !memos.some(existing => existing.id === m.id)
      );
      for (const memo of newMemos) {
        saveMemo(memo).catch(e => console.warn('[Persist] Memo save failed:', e));
      }

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
      return next;
    });
    saveMemo(updatedMemo).catch(e => console.warn('[Persist] Memo update failed:', e));
  };

  // Handle new company added from research
  const handleCompanyAdded = () => {
    loadAllData();
  };

  // Tab View Dispatcher
  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60vh', gap: 16
        }}>
          <div style={{
            width: 40, height: 40, border: '3px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366f1', borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading MarketMind AI...</p>
        </div>
      );
    }

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
      case 'search':
        return (
          <CompanySearchView
            companies={companies}
            onCompanyAdded={handleCompanyAdded}
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
        isLiveAi={isBackendLive}
        hasDatabase={hasDatabase}
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
