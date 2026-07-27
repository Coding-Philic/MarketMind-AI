import { useState, useEffect, useCallback } from 'react';
import { Menu, X, Brain } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MemoryGraphView } from './components/MemoryGraphView';
import { HindsightLedgerView } from './components/HindsightLedgerView';
import { CompanyEvolutionView } from './components/CompanyEvolutionView';
import { IntelHubView } from './components/IntelHubView';
import { CompanySearchView } from './components/CompanySearchView';
import { Auth } from './components/Auth';
import { OnboardingWizard } from './components/OnboardingWizard';
import { PersonalizationView } from './components/PersonalizationView';
import { Session } from '@supabase/supabase-js';
import { supabase } from './utils/supabase';

import { Company, HindsightRecord, MarketEvent, MemoryNode, MemoryEdge, InvestmentMemo, AgentState, AgentLog, UserProfile } from './types';
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
  seedDatabase,
  fetchUserProfile,
  saveUserProfile
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
  const [session, setSession] = useState<Session | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      const [companiesData, eventsData, hindsightData, graphData, memosData, profileData] = await Promise.all([
        fetchCompanies().catch(() => []),
        fetchEvents().catch(() => []),
        fetchHindsightRecords().catch(() => []),
        fetchMemoryGraph().catch(() => ({ nodes: [], edges: [] })),
        fetchMemos().catch(() => []),
        fetchUserProfile().catch(() => null)
      ]);
      setUserProfile(profileData);

      setCompanies(companiesData);
      setMarketEvents(eventsData);
      setHindsightLedger(hindsightData);
      setMemoryNodes(graphData.nodes);
      setMemoryEdges(graphData.edges);
      setMemos(memosData);

    } catch (error) {
      console.error('[App] Failed to load data from API, using fallback:', error);
      setCompanies([]);
      setHindsightLedger([]);
      setMarketEvents([]);
      setMemoryNodes([]);
      setMemoryEdges([]);
      setMemos([]);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);

      // Auth Session setup
      if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }: any) => {
          setSession(session);
        });

        supabase.auth.onAuthStateChange((_event: any, session: any) => {
          setSession(session);
          if (session) {
            // Re-fetch data on login
            loadAllData();
          } else {
            // Clear data on logout
            setCompanies([]);
            setMarketEvents([]);
            setHindsightLedger([]);
            setMemoryNodes([]);
            setMemoryEdges([]);
            setMemos([]);
          }
        });
      }

      // Check backend config
      const config = await checkBackendConfig();
      setIsBackendLive(config.hasApiKey);
      setHasDatabase(config.hasDatabase);

      // Load data from Supabase via backend (if logged in or using service key initially)
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

      // Save new memory nodes FIRST (await), then edges — fixes the FK constraint race condition
      // (edges reference node IDs; if both fire simultaneously, edges arrive before nodes commit)
      const newNodes = nextState.memoryNodes.filter(
        n => !memoryNodes.some(existing => existing.id === n.id)
      );
      const newEdges = nextState.memoryEdges.filter(
        e => !memoryEdges.some(existing => existing.id === e.id)
      );
      if (newNodes.length > 0) {
        await saveMemoryNodes(newNodes).catch(e => console.warn('[Persist] Nodes save failed:', e));
      }
      if (newEdges.length > 0) {
        await saveMemoryEdges(newEdges).catch(e => console.warn('[Persist] Edges save failed:', e));
      }

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
            userProfile={userProfile}
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
            hindsightLedger={hindsightLedger}
            companies={companies}
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
      case 'profile':
        return (
          <PersonalizationView
            profile={userProfile}
            onProfileUpdate={setUserProfile}
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

  if (supabase && !session && !isGuestMode) {
    return <Auth onGuestContinue={() => setIsGuestMode(true)} />;
  }

  // Show Onboarding if user has no profile
  if (session && hasDatabase && !isLoading && !userProfile) {
    return (
      <OnboardingWizard onComplete={async (profile) => {
        try {
          const saved = await saveUserProfile(profile);
          setUserProfile(saved);
        } catch (e) {
          console.error('Failed to save profile', e);
          // Optimistically set it anyway so they aren't blocked
          setUserProfile({ id: session.user.id, ...profile } as UserProfile);
        }
      }} />
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Top Bar */}
      <header className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, overflow: 'hidden' }}>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{ flexShrink: 0 }}
          >
            {isMobileMenuOpen ? <X size={24} color="#fff" /> : <Menu size={24} color="#fff" />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
            <Brain size={24} color="#6366f1" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>MarketMind AI</span>
          </div>
        </div>
        <div className="pulse-badge" style={{ padding: '4px 10px', fontSize: '0.75rem', flexShrink: 0 }}>
          <div className="pulse-dot" />
          <span>{isBackendLive ? 'Live AI' : 'Local Mode'}</span>
        </div>
      </header>

      {/* Backdrop for Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        memoCount={memos.length}
        ledgerCount={hindsightLedger.length}
        isLiveAi={isBackendLive}
        hasDatabase={hasDatabase}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main View Port */}
      <main className="main-content">
        <div style={{ flexGrow: 1, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
