import React, { useState, useRef, useEffect } from 'react';
import { 
  Cpu, 
  Terminal, 
  Plus, 
  TrendingUp, 
  Radio, 
  Play, 
  Server,
  Info
} from 'lucide-react';
import { Company, MarketEvent, AgentState, AgentLog } from '../types';
import { simulationEventPool } from '../data/mockData';

interface DashboardProps {
  companies: Company[];
  marketEvents: MarketEvent[];
  agents: AgentState[];
  ledgerCount: number;
  triggerEventProcessing: (event: MarketEvent) => void;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  companies,
  marketEvents,
  agents,
  ledgerCount,
  triggerEventProcessing,
  isSimulating,
  setIsSimulating
}) => {
  // Manual custom event inputs
  const [selectedCompanyId, setSelectedCompanyId] = useState('nvda');
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customImpact, setCustomImpact] = useState<'positive' | 'negative' | 'neutral'>('positive');
  const [customMetric, setCustomMetric] = useState<MarketEvent['metricImpacted']>('revenue');
  const [customMagnitude, setCustomMagnitude] = useState(10);

  // Active terminal logs selector
  const [selectedAgentLogsId, setSelectedAgentLogsId] = useState<string>('all');

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of terminal when logs update
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agents]);

  // Aggregate logs
  const getAggregatedLogs = (): (AgentLog & { agentName: string })[] => {
    let allLogs: (AgentLog & { agentName: string })[] = [];
    agents.forEach(agent => {
      if (selectedAgentLogsId === 'all' || selectedAgentLogsId === agent.id) {
        agent.logs.forEach(log => {
          allLogs.push({
            ...log,
            agentName: agent.name
          });
        });
      }
    });
    
    // Sort chronologically by log ID or simulated order (since date strings might be identical)
    return allLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  };

  const activeLogs = getAggregatedLogs();

  // Handle Injecting Preset Event
  const injectPreset = () => {
    if (isSimulating) return; // Prevent multiple overlapping simulation runs
    console.log('[UI] Button action: Inject Market Event (preset)');
    const randomIndex = Math.floor(Math.random() * simulationEventPool.length);
    const preset = simulationEventPool[randomIndex];
    const company = companies.find(c => c.id === preset.companyId);

    const event: MarketEvent = {
      id: `e-gen-${Date.now()}`,
      timestamp: 'Just now',
      companyId: preset.companyId,
      companyName: company?.name || preset.companyName,
      title: preset.title,
      content: preset.content,
      impactType: preset.impactType,
      metricImpacted: preset.metricImpacted,
      valueChange: preset.valueChange,
      rawSource: preset.rawSource
    };

    triggerEventProcessing(event);
  };

  // Handle Injecting Custom Event
  const injectCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSimulating || !customTitle.trim() || !customContent.trim()) return;
    console.log('[UI] Button action: Inject Custom Event', { companyId: selectedCompanyId, title: customTitle, impact: customImpact, metric: customMetric, magnitude: customMagnitude });

    const company = companies.find(c => c.id === selectedCompanyId);
    
    const event: MarketEvent = {
      id: `e-gen-${Date.now()}`,
      timestamp: 'Just now',
      companyId: selectedCompanyId,
      companyName: company?.name || 'Unknown',
      title: customTitle,
      content: customContent,
      impactType: customImpact,
      metricImpacted: customMetric,
      valueChange: customMagnitude * (customImpact === 'negative' ? -1 : 1),
      rawSource: 'News'
    };

    triggerEventProcessing(event);
    
    // Reset forms
    setCustomTitle('');
    setCustomContent('');
  };

  // Compute stats
  const avgAlignment = Math.round(
    companies.reduce((sum, c) => sum + c.alignmentScore, 0) / companies.length
  );

  return (
    <div>
      {/* Top Title and Global Simulation Bar */}
      <div className="top-nav">
        <h1 className="page-title">MarketMind AI Dashboard</h1>
        <div className="system-status">
          <button
            onClick={injectPreset}
            disabled={isSimulating}
            className="btn btn-primary"
            style={{ opacity: isSimulating ? 0.6 : 1, cursor: isSimulating ? 'not-allowed' : 'pointer' }}
          >
            <Play size={16} />
            {isSimulating ? 'Agent Reasoning Active...' : 'Inject Market Event'}
          </button>
          <div className="pulse-badge">
            <span className="pulse-dot" style={{ backgroundColor: isSimulating ? '#a855f7' : '#10b981' }}></span>
            <span>{isSimulating ? 'SIMULATING CYCLES' : 'MONITORING STANDBY'}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-metrics">
        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span>Market Coverage</span>
            <Server size={16} color="#94a3b8" />
          </div>
          <div className="metric-value">{companies.length}</div>
          <div className="metric-footer" style={{ color: '#10b981' }}>
            <span>Active instances</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span>Hindsight Lessons</span>
            <TrendingUp size={16} color="#94a3b8" />
          </div>
          <div className="metric-value">{ledgerCount}</div>
          <div className="metric-footer" style={{ color: '#6366f1' }}>
            <span>Consolidated memories</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span>Memory Health Index</span>
            <Cpu size={16} color="#94a3b8" />
          </div>
          <div className="metric-value">{avgAlignment}%</div>
          <div className="metric-footer" style={{ color: avgAlignment > 70 ? '#10b981' : '#f59e0b' }}>
            <span>Forecast alignment score</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-header">
            <span>Agent Orchestration</span>
            <Radio size={16} color="#94a3b8" />
          </div>
          <div className="metric-value">4/4</div>
          <div className="metric-footer" style={{ color: '#10b981' }}>
            <span>Cognitive nodes online</span>
          </div>
        </div>
      </div>

      {/* Agents Matrix Section */}
      <h2 style={styles.sectionHeader}>Cognitive Agent Matrix</h2>
      <div style={styles.agentsGrid}>
        {agents.map((agent) => {
          const isWorking = agent.status !== 'idle';
          
          return (
            <div 
              key={agent.id} 
              style={{
                ...styles.agentCard,
                borderColor: isWorking ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.06)',
                boxShadow: isWorking ? '0 0 25px rgba(168, 85, 247, 0.15)' : 'none'
              }}
              className="glass-panel"
            >
              <div style={styles.agentHeader}>
                <div>
                  <h3 style={styles.agentName}>{agent.name}</h3>
                  <p style={styles.agentRole}>{agent.role}</p>
                </div>
                <span 
                  style={{
                    ...styles.statusDot,
                    backgroundColor: isWorking ? '#a855f7' : '#10b981',
                    animation: isWorking ? 'pulse-glow-purple 1.5s infinite alternate' : 'none'
                  }}
                ></span>
              </div>

              <div style={styles.taskContainer}>
                <span style={styles.taskLabel}>Task:</span>
                <span style={styles.taskText}>{agent.currentTask}</span>
              </div>

              {/* Resource meters */}
              <div style={styles.resourceGroup}>
                <div style={styles.resourceRow}>
                  <span>CPU Usage</span>
                  <span>{agent.cpuUsage}%</span>
                </div>
                <div style={styles.resourceBarBG}>
                  <div style={{...styles.resourceBarFill, width: `${agent.cpuUsage}%`, backgroundColor: '#6366f1'}} />
                </div>

                <div style={styles.resourceRow}>
                  <span>Memory</span>
                  <span>{agent.memoryUsage} MB</span>
                </div>
                <div style={styles.resourceBarBG}>
                  <div style={{...styles.resourceBarFill, width: `${(agent.memoryUsage / 256) * 100}%`, backgroundColor: '#a855f7'}} />
                </div>
              </div>

              <div style={styles.agentStatusBadge}>
                <span style={{
                  color: isWorking ? '#c084fc' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {agent.status.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Console and Injection Row */}
      <div style={styles.twoColumnRow}>
        {/* Terminal logs console */}
        <div style={{ ...styles.columnCard, flexGrow: 2 }} className="glass-panel">
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} color="#6366f1" />
              <h3>Autonomous Reasoning Terminal</h3>
            </div>
            
            {/* Filter tags */}
            <div style={styles.consoleFilters}>
              {['all', 'monitor', 'analyst', 'consolidator', 'intel'].map((fId) => (
                <button
                  key={fId}
                  onClick={() => setSelectedAgentLogsId(fId)}
                  style={{
                    ...styles.filterTab,
                    ...(selectedAgentLogsId === fId ? styles.filterTabActive : {})
                  }}
                >
                  {fId === 'all' ? 'All Logs' : fId.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="console" style={{ height: '315px', maxHeight: '315px' }}>
            {activeLogs.length === 0 ? (
              <div style={styles.emptyConsole}>
                <Info size={24} color="#475569" />
                <p>System stands by. Ingest an event to trigger agent telemetry logs.</p>
              </div>
            ) : (
              activeLogs.map((log) => (
                <div key={log.id} className="console-line">
                  <span className="console-time">[{log.timestamp}]</span>
                  <span style={{ color: '#a855f7', fontWeight: 600, flexShrink: 0 }}>
                    [{log.agentName.replace(' Agent', '')}]:
                  </span>
                  <span className={`console-msg-${log.type}`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>

        {/* Custom Event Injector */}
        <div style={{ ...styles.columnCard, flexGrow: 1 }} className="glass-panel">
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="#6366f1" />
              <h3>Custom Event Injector</h3>
            </div>
          </div>

          <form onSubmit={injectCustom} style={styles.form}>
            <div style={styles.formRow}>
              <label style={styles.label}>Target Company</label>
              <select 
                value={selectedCompanyId} 
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                style={styles.select}
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.ticker})</option>
                ))}
              </select>
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>Event Title</label>
              <input 
                type="text" 
                placeholder="e.g. OpenAI releases o1 Model family" 
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>Event Contents</label>
              <textarea 
                placeholder="Describe what occurred and its potential market impact details..." 
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                style={{ ...styles.input, height: '60px', resize: 'none' }}
                required
              />
            </div>

            <div style={styles.gridTwoCol}>
              <div style={styles.formRow}>
                <label style={styles.label}>Impact</label>
                <select 
                  value={customImpact} 
                  onChange={(e) => setCustomImpact(e.target.value as any)}
                  style={styles.select}
                >
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Metric Target</label>
                <select 
                  value={customMetric} 
                  onChange={(e) => setCustomMetric(e.target.value as any)}
                  style={styles.select}
                >
                  <option value="revenue">Revenue</option>
                  <option value="margin">Margin</option>
                  <option value="growth">Growth</option>
                  <option value="marketShare">Market Share</option>
                  <option value="brand">Brand</option>
                  <option value="regulatory">Regulatory</option>
                </select>
              </div>
            </div>

            <div style={styles.formRow}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={styles.label}>Impact Scale (Magnitude)</label>
                <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600 }}>{customMagnitude}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="25" 
                value={customMagnitude} 
                onChange={(e) => setCustomMagnitude(parseInt(e.target.value))}
                style={styles.range}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSimulating}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '4px', opacity: isSimulating ? 0.6 : 1 }}
            >
              <Play size={16} />
              Inject Autonomous Cycle
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  sectionHeader: {
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#f8fafc',
    letterSpacing: '-0.01em',
  },
  agentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  },
  agentCard: {
    padding: '20px',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    borderWidth: '1px',
    borderStyle: 'solid',
  },
  agentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  agentName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  agentRole: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '2px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  taskContainer: {
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    border: '1px solid rgba(255,255,255,0.03)',
    minHeight: '52px',
  },
  taskLabel: {
    fontWeight: 600,
    color: '#6366f1',
    marginRight: '6px',
    display: 'block',
    fontSize: '0.75rem',
    marginBottom: '2px',
  },
  taskText: {
    color: '#cbd5e1',
  },
  resourceGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    marginTop: '4px',
  },
  resourceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  resourceBarBG: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  resourceBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.4s ease',
  },
  agentStatusBadge: {
    marginTop: 'auto',
    textAlign: 'right' as const,
  },
  twoColumnRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap' as const,
    alignItems: 'stretch',
  },
  columnCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    flex: '1 1 350px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  consoleFilters: {
    display: 'flex',
    gap: '6px',
  },
  filterTab: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    color: '#94a3b8',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  filterTabActive: {
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    color: '#ffffff',
  },
  emptyConsole: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '100%',
    color: '#475569',
    fontSize: '0.85rem',
    textAlign: 'center' as const,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  gridTwoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  label: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  select: {
    background: 'rgba(2, 4, 8, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#e2e8f0',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
  },
  input: {
    background: 'rgba(2, 4, 8, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#e2e8f0',
    fontSize: '0.85rem',
    outline: 'none',
    fontFamily: 'inherit',
  },
  range: {
    WebkitAppearance: 'none' as const,
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.08)',
    outline: 'none',
  }
};
