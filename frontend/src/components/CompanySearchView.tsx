import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Globe,
  TrendingUp,
  Shield,
  Users,
  Sparkles,
  ExternalLink,
  Plus,
  CheckCircle,
  Loader,
  AlertTriangle,
  Building2,
  ChevronRight,
  TrendingDown,
  Activity,
  Link,
  Target,
  History
} from 'lucide-react';
import { Company } from '../types';
import { researchCompany, CompanyResearchResult } from '../utils/api';
import { CompanyAnalyticsCharts } from './CompanyAnalyticsCharts';

interface CompanySearchViewProps {
  companies: Company[];
  onCompanyAdded: () => void;
}

type ResearchStage = 'idle' | 'searching' | 'analyzing' | 'profiling' | 'complete' | 'error';

export const CompanySearchView: React.FC<CompanySearchViewProps> = ({
  companies,
  onCompanyAdded
}) => {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<ResearchStage>('idle');
  const [result, setResult] = useState<CompanyResearchResult | null>(null);
  const [error, setError] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter existing companies for autocomplete
  useEffect(() => {
    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      const matches = companies.filter(
        c => c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q)
      );
      setSuggestions(matches.slice(0, 5));
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, companies]);

  const handleResearch = async () => {
    if (!query.trim() || stage === 'searching' || stage === 'analyzing' || stage === 'profiling') return;

    setError('');
    setResult(null);
    setShowSuggestions(false);

    // Animate through stages
    setStage('searching');
    const stageTimer1 = setTimeout(() => setStage('analyzing'), 2500);
    const stageTimer2 = setTimeout(() => setStage('profiling'), 5500);

    try {
      const data = await researchCompany(query.trim());
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setResult(data);
      setStage('complete');
      onCompanyAdded(); // Trigger re-fetch of companies so it shows up in sidebar/dropdowns
    } catch (err: unknown) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setError(err instanceof Error ? err.message : 'Research failed. Please try again.');
      setStage('error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleResearch();
    }
  };

  const resetSearch = () => {
    setQuery('');
    setStage('idle');
    setResult(null);
    setError('');
    inputRef.current?.focus();
  };

  const stageLabels: Record<string, string> = {
    searching: 'Searching the web for latest data...',
    analyzing: 'AI is analyzing financials & strategy...',
    profiling: 'Building company profile & risk map...',
    complete: 'Research complete!',
    error: 'Research encountered an error'
  };

  const isLoading = stage === 'searching' || stage === 'analyzing' || stage === 'profiling';

  const handleLoadCompany = (c: Company) => {
    setQuery(c.name);
    setError('');
    setResult({
      success: true,
      company: {
        ...c,
        geopoliticalRisks: c.geopoliticalRisks,
        competitorDependencies: c.competitorDependencies,
        keyInsights: c.keyInsights || []
      },
      searchSources: (c.searchSources && c.searchSources.length > 0) ? c.searchSources : [
        { title: 'Saved AI Intelligence', url: '#', snippet: 'This profile was instantly loaded from your local database.' }
      ]
    });
    setStage('complete');
  };

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      
      {/* Saved Companies Sidebar */}
      <div style={styles.sidebar} className="glass-panel">
        <div style={styles.sidebarHeader}>
          <Building2 size={16} color="#6366f1" />
          <h3 style={styles.sidebarTitle}>Saved Intel</h3>
        </div>
        <div style={styles.sidebarList}>
          {companies.length === 0 ? (
            <div style={styles.sidebarEmpty}>No companies saved yet.</div>
          ) : (
            companies.map(c => (
              <button 
                key={c.id} 
                style={{
                  ...styles.sidebarItem,
                  ...(result?.company.id === c.id ? styles.sidebarItemActive : {})
                }}
                onClick={() => handleLoadCompany(c)}
              >
                <div style={styles.sidebarItemMeta}>
                  <span style={styles.sidebarItemName}>{c.name.length > 20 ? c.name.substring(0, 18) + '...' : c.name}</span>
                  <span style={styles.sidebarItemTicker}>{c.ticker}</span>
                </div>
                <ChevronRight size={14} color={result?.company.id === c.id ? '#ffffff' : '#64748b'} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
        {/* Header */}
      <div className="top-nav">
        <h1 className="page-title">Company Research</h1>
        {stage === 'complete' && (
          <button className="btn btn-primary" onClick={resetSearch}>
            <Search size={16} />
            New Search
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div style={styles.searchSection} className="glass-panel">
        <div style={styles.searchIcon}>
          <Globe size={22} color="#6366f1" />
        </div>
        <div style={styles.searchContent}>
          <h2 style={styles.searchTitle}>AI-Powered Company Intelligence</h2>
          <p style={styles.searchDesc}>
            Enter any company name or ticker. Our AI will search the web, analyze financials, map competitors, and assess geopolitical risks in real-time.
          </p>

          <div style={styles.searchRow}>
            <div style={styles.inputWrapper}>
              <Search size={18} color="#64748b" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="e.g., OpenAI, Stripe, ASML, Palantir, SpaceX..."
                style={styles.searchInput}
                disabled={isLoading}
              />

              {/* Autocomplete Suggestions */}
              {showSuggestions && (
                <div style={styles.suggestionsDropdown}>
                  <div style={styles.suggestionsLabel}>Existing Companies</div>
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      style={styles.suggestionItem}
                      onMouseDown={() => {
                        setQuery(s.name);
                        setShowSuggestions(false);
                      }}
                    >
                      <Building2 size={14} color="#6366f1" />
                      <span style={{ color: '#f1f5f9', fontWeight: 500 }}>{s.name}</span>
                      <span style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: 600 }}>{s.ticker}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleResearch}
              disabled={isLoading || !query.trim()}
              style={{ opacity: isLoading || !query.trim() ? 0.6 : 1, minWidth: '160px' }}
            >
              {isLoading ? (
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Sparkles size={16} />
              )}
              {isLoading ? 'Researching...' : 'Research Company'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Animation */}
      {isLoading && (
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: stage === 'searching' ? '33%' : stage === 'analyzing' ? '66%' : '90%'
              }}
            />
          </div>
          <div style={styles.stageIndicators}>
            {['searching', 'analyzing', 'profiling'].map((s, i) => {
              const isActive = s === stage;
              const isPast = ['searching', 'analyzing', 'profiling'].indexOf(stage) > i;
              return (
                <div key={s} style={styles.stageItem}>
                  <div style={{
                    ...styles.stageDot,
                    backgroundColor: isPast ? '#10b981' : isActive ? '#6366f1' : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? '0 0 12px rgba(99,102,241,0.5)' : 'none',
                    animation: isActive ? 'pulse-glow-purple 1.5s infinite alternate' : 'none'
                  }}>
                    {isPast ? <CheckCircle size={12} color="#fff" /> : null}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    color: isActive ? '#f1f5f9' : isPast ? '#10b981' : '#64748b',
                    fontWeight: isActive ? 600 : 400
                  }}>
                    {s === 'searching' ? 'Web Search' : s === 'analyzing' ? 'AI Analysis' : 'Profiling'}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={styles.stageLabel}>{stageLabels[stage]}</p>
        </div>
      )}

      {/* Error State */}
      {stage === 'error' && (
        <div style={styles.errorCard} className="glass-panel">
          <AlertTriangle size={20} color="#f43f5e" />
          <div>
            <p style={{ color: '#f43f5e', fontWeight: 600, marginBottom: 4 }}>Research Failed</p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{error}</p>
          </div>
          <button className="btn btn-primary" onClick={resetSearch} style={{ marginLeft: 'auto' }}>
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {stage === 'complete' && result && (
        <div style={styles.resultsGrid}>
          {/* Company Overview */}
          <div style={styles.resultCard} className="glass-panel">
            <div style={styles.resultHeader}>
              <Building2 size={18} color="#6366f1" />
              <h3>Company Profile</h3>
              <span style={styles.tickerBadge}>{result.company.ticker}</span>
            </div>
            <h2 style={styles.companyNameLg}>{result.company.name}</h2>
            <p style={styles.sectorTag}>{result.company.sector}</p>
            <p style={styles.descText}>{result.company.description}</p>

            <div style={styles.scoreRow}>
              <div style={styles.scoreItem}>
                <span style={styles.scoreValue}>{result.company.alignmentScore}%</span>
                <span style={styles.scoreLabel}>Alignment Score</span>
              </div>
              <div style={styles.scoreItem}>
                <span style={styles.scoreValue}>{result.company.products?.length || 0}</span>
                <span style={styles.scoreLabel}>Key Products</span>
              </div>
              <div style={styles.scoreItem}>
                <span style={styles.scoreValue}>{result.company.expectations?.length || 0}</span>
                <span style={styles.scoreLabel}>Expectations</span>
              </div>
            </div>

            {/* Company already added to DB by the backend */}
            <div style={styles.addedBanner}>
              <CheckCircle size={16} color="#10b981" />
              <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                Added to your watchlist
              </span>
            </div>
          </div>

          {/* Revenue Data */}
          {result.company.revenueData && result.company.revenueData.length > 0 && (
            <div style={styles.resultCard} className="glass-panel">
              <div style={styles.resultHeader}>
                <TrendingUp size={18} color="#10b981" />
                <h3>Financial Overview</h3>
              </div>
              <div style={styles.revenueGrid}>
                {result.company.revenueData.map((r, i) => (
                  <div key={i} style={styles.revenueItem}>
                    <span style={styles.revPeriod}>{r.period}</span>
                    <span style={styles.revValue}>${typeof r.revenue === 'number' ? r.revenue.toLocaleString() : r.revenue}M</span>
                    <span style={styles.revMargin}>Margin: {r.netMargin}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {result.company.products && result.company.products.length > 0 && (
            <div style={styles.resultCard} className="glass-panel">
              <div style={styles.resultHeader}>
                <Sparkles size={18} color="#a855f7" />
                <h3>Key Products</h3>
              </div>
              <div style={styles.productsList}>
                {result.company.products.map((p, i) => (
                  <div key={i} style={styles.productRow}>
                    <div style={{ flex: 1 }}>
                      <span style={styles.prodName}>{p.name}</span>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: p.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: p.status === 'active' ? '#10b981' : '#f59e0b'
                      }}>{p.status}</span>
                    </div>
                    <div style={styles.adoptionBarWrap}>
                      <div style={styles.adoptionBarBG}>
                        <div style={{ ...styles.adoptionBarFill, width: `${p.marketAdoption}%` }} />
                      </div>
                      <span style={styles.adoptionVal}>{p.marketAdoption}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Graphical Data Visualizations (Donuts, Bar Graphs, Ratings) */}
          <CompanyAnalyticsCharts company={result.company} />

          {/* New Detailed RAG Parameters */}
          <div style={styles.resultCard} className="glass-panel">
            <div style={styles.resultHeader}>
              <Target size={18} color="#10b981" />
              <h3>Detailed RAG Profile</h3>
            </div>
            
            <div style={styles.analysisBlock}>
              <h4 style={styles.analysisSubhead}>
                <History size={14} color="#f43f5e" /> Past Incidents
              </h4>
              {result.company.pastIncidents && result.company.pastIncidents.length > 0 ? (
                result.company.pastIncidents.map((inc, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <strong style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{inc.title}: </strong>
                    <span style={styles.analysisText}>{inc.impact}</span>
                  </div>
                ))
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>No major past incidents tracked.</span>
              )}
            </div>
            
            <div style={styles.analysisBlock}>
              <h4 style={styles.analysisSubhead}>
                <Activity size={14} color="#f59e0b" /> Current Incidents
              </h4>
              {result.company.currentIncidents && result.company.currentIncidents.length > 0 ? (
                result.company.currentIncidents.map((inc, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <strong style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{inc.title}: </strong>
                    <span style={styles.analysisText}>{inc.impact}</span>
                  </div>
                ))
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>No active incidents at this time.</span>
              )}
            </div>
            
            <div style={styles.analysisBlock}>
              <h4 style={styles.analysisSubhead}>
                <Link size={14} color="#6366f1" /> Operational Dependencies
              </h4>
              {result.company.dependencies ? (
                <p style={styles.analysisText}>{result.company.dependencies}</p>
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Data not available</span>
              )}
            </div>
            
            <div style={styles.analysisBlock}>
              <h4 style={styles.analysisSubhead}>
                <TrendingUp size={14} color="#10b981" /> 10-Year Growth Outlook
              </h4>
              {result.company.growthOutlook ? (
                <p style={styles.analysisText}>{result.company.growthOutlook}</p>
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Data not available</span>
              )}
            </div>
            
            <div style={styles.analysisBlock}>
              <h4 style={styles.analysisSubhead}>
                <TrendingDown size={14} color="#f43f5e" /> Risk Factors
              </h4>
              {result.company.riskFactors ? (
                <p style={styles.analysisText}>{result.company.riskFactors}</p>
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Data not available</span>
              )}
            </div>
            
            <div style={styles.analysisBlock}>
              <h4 style={styles.analysisSubhead}>
                <Globe size={14} color="#f59e0b" /> Geopolitical Risks
              </h4>
              {result.company.geopoliticalRisks ? (
                <p style={styles.analysisText}>{result.company.geopoliticalRisks}</p>
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Data not available</span>
              )}
            </div>
            
            <div style={styles.analysisBlock}>
              <h4 style={styles.analysisSubhead}>
                <Users size={14} color="#6366f1" /> Competitor Dynamics
              </h4>
              {result.company.competitorDependencies ? (
                <p style={styles.analysisText}>{result.company.competitorDependencies}</p>
              ) : (
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Data not available</span>
              )}
            </div>
            
            {result.company.keyInsights && result.company.keyInsights.length > 0 && (
              <div style={styles.analysisBlock}>
                <h4 style={styles.analysisSubhead}>
                  <Sparkles size={14} color="#10b981" /> Key Strategic Insights
                </h4>
                <ul style={{ paddingLeft: 20, margin: 0, color: '#cbd5e1', fontSize: '0.84rem' }}>
                  {result.company.keyInsights.map((insight, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sources */}
          {result.searchSources && result.searchSources.length > 0 && (
            <div style={{ ...styles.resultCard, gridColumn: '1 / -1' }} className="glass-panel">
              <div style={styles.resultHeader}>
                <ExternalLink size={18} color="#64748b" />
                <h3>Research Sources</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 'auto' }}>
                  {result.searchSources.length} sources analyzed
                </span>
              </div>
              <div style={styles.sourcesList}>
                {result.searchSources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.sourceItem}
                  >
                    <ChevronRight size={14} color="#6366f1" />
                    <div style={{ flex: 1 }}>
                      <span style={styles.sourceTitle}>{src.title}</span>
                      <span style={styles.sourceSnippet}>{src.snippet}</span>
                    </div>
                    <ExternalLink size={12} color="#64748b" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {stage === 'idle' && (
        <div style={styles.emptyState}>
          <div style={styles.emptyGrid}>
            {['OpenAI', 'SpaceX', 'Stripe', 'ASML', 'Palantir', 'Databricks'].map((name) => (
              <button
                key={name}
                style={styles.suggestBtn}
                className="glass-panel-interactive"
                onClick={() => {
                  setQuery(name);
                  inputRef.current?.focus();
                }}
              >
                <Search size={14} color="#6366f1" />
                {name}
              </button>
            ))}
          </div>
          <p style={styles.emptyHint}>
            Try searching for any public or private company. The AI will analyze web sources in real-time.
          </p>
        </div>
      )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  searchSection: {
    padding: '28px',
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  searchIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 0 20px rgba(99,102,241,0.15)'
  },
  searchContent: { flex: 1 },
  searchTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 4
  },
  searchDesc: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 1.4
  },
  searchRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'stretch'
  },
  inputWrapper: {
    flex: 1,
    position: 'relative' as const
  },
  searchInput: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    background: 'rgba(2,4,8,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const
  },
  suggestionsDropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: 'rgba(15,20,35,0.98)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 50,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
  },
  suggestionsLabel: {
    padding: '8px 12px',
    fontSize: '0.7rem',
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'background 0.15s ease'
  },
  progressSection: {
    marginBottom: 24,
    textAlign: 'center' as const
  },
  progressBar: {
    width: '100%',
    height: 4,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
    borderRadius: 2,
    transition: 'width 1s ease'
  },
  stageIndicators: {
    display: 'flex',
    justifyContent: 'center',
    gap: 48,
    marginBottom: 12
  },
  stageItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8
  },
  stageDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  stageLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginTop: 8
  },
  errorCard: {
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 20
  },
  resultCard: { padding: 24 },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: 12
  },
  tickerBadge: {
    marginLeft: 'auto',
    padding: '4px 10px',
    borderRadius: 6,
    background: 'rgba(99,102,241,0.15)',
    color: '#6366f1',
    fontWeight: 700,
    fontSize: '0.8rem'
  },
  companyNameLg: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 4
  },
  sectorTag: {
    fontSize: '0.78rem',
    color: '#a855f7',
    fontWeight: 600,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em'
  },
  descText: {
    fontSize: '0.88rem',
    color: '#cbd5e1',
    lineHeight: 1.5,
    marginBottom: 20
  },
  scoreRow: {
    display: 'flex',
    gap: 20,
    marginBottom: 16
  },
  scoreItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '12px 8px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.04)'
  },
  scoreValue: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#6366f1'
  },
  scoreLabel: {
    fontSize: '0.7rem',
    color: '#94a3b8',
    marginTop: 4
  },
  addedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: 8
  },
  revenueGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 12
  },
  revenueItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: 14,
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.04)'
  },
  revPeriod: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: 600,
    marginBottom: 4
  },
  revValue: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#10b981',
    marginBottom: 2
  },
  revMargin: {
    fontSize: '0.72rem',
    color: '#94a3b8'
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12
  },
  productRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  prodName: {
    fontSize: '0.88rem',
    fontWeight: 600,
    color: '#f1f5f9',
    marginRight: 8
  },
  statusBadge: {
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const
  },
  adoptionBarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: 120
  },
  adoptionBarBG: {
    flex: 1,
    height: 4,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  adoptionBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
    borderRadius: 2
  },
  adoptionVal: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 600,
    minWidth: 30,
    textAlign: 'right' as const
  },
  analysisBlock: {
    marginBottom: 16,
    padding: 14,
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.04)'
  },
  analysisSubhead: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#f1f5f9',
    marginBottom: 8
  },
  analysisText: {
    fontSize: '0.84rem',
    color: '#cbd5e1',
    lineHeight: 1.5,
    whiteSpace: 'pre-line' as const
  },
  sourcesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8
  },
  sourceItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 12px',
    background: 'rgba(0,0,0,0.15)',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.04)',
    textDecoration: 'none',
    transition: 'border-color 0.2s ease',
    cursor: 'pointer'
  },
  sourceTitle: {
    display: 'block',
    fontSize: '0.84rem',
    color: '#6366f1',
    fontWeight: 600,
    marginBottom: 2
  },
  sourceSnippet: {
    display: 'block',
    fontSize: '0.76rem',
    color: '#94a3b8',
    lineHeight: 1.3
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px'
  },
  emptyGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 10,
    justifyContent: 'center',
    marginBottom: 20
  },
  suggestBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)',
    color: '#cbd5e1',
    fontSize: '0.88rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  emptyHint: {
    fontSize: '0.82rem',
    color: '#64748b',
    maxWidth: 480,
    margin: '0 auto'
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    height: 'calc(100vh - 40px)',
    position: 'sticky' as const,
    top: '20px',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sidebarTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#f8fafc',
    margin: 0,
  },
  sidebarList: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '12px',
    gap: '8px',
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left' as const,
  },
  sidebarItemActive: {
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  sidebarItemMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  sidebarItemName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  sidebarItemTicker: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#6366f1',
    letterSpacing: '0.05em',
  },
  sidebarEmpty: {
    padding: '20px',
    textAlign: 'center' as const,
    color: '#64748b',
    fontSize: '0.8rem',
  }
};
