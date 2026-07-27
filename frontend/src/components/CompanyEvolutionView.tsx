import React, { useState } from 'react';
import { 
  TrendingUp, 
  Target, 
  Briefcase, 
  HelpCircle,
  TrendingDown,
  Info,
  Shield,
  Globe,
  Users,
  Activity,
  History,
  AlertTriangle
} from 'lucide-react';
import { Company, RevenueDataPoint, HindsightRecord } from '../types';
import { CompanyAnalyticsCharts } from './CompanyAnalyticsCharts';

interface CompanyEvolutionViewProps {
  companies: Company[];
  hindsightLedger: HindsightRecord[];
}

export const CompanyEvolutionView: React.FC<CompanyEvolutionViewProps> = ({ 
  companies, 
  hindsightLedger 
}) => {
  const [selectedId, setSelectedId] = useState(companies[0]?.id || 'nvda');
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    y: number;
    data: RevenueDataPoint;
  } | null>(null);
  const [hoveredMarginPoint, setHoveredMarginPoint] = useState<{
    index: number;
    x: number;
    y: number;
    data: RevenueDataPoint;
  } | null>(null);

  const selectedCompany = companies.find(c => c.id === selectedId) || companies[0];

  if (!selectedCompany) return null;

  // Custom SVG chart config
  const chartWidth = 520;
  const chartHeight = 180;
  const paddingX = 40;
  const paddingY = 20;

  const data = selectedCompany.revenueData;
  const maxRevenue = Math.max(...data.map(d => d.revenue)) * 1.15 || 1000;
  
  // Calculate SVG points for Revenue Area
  const getRevenuePoints = () => {
    const w = chartWidth - paddingX * 2;
    const h = chartHeight - paddingY * 2;
    const points = data.map((d, index) => {
      const x = paddingX + (index / (data.length - 1)) * w;
      const y = paddingY + h - (d.revenue / maxRevenue) * h;
      return { x, y };
    });

    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    // Area close path
    const areaPath = `${path} L ${paddingX + w} ${paddingY + h} L ${paddingX} ${paddingY + h} Z`;
    
    return { path, areaPath, points };
  };

  const { path: revenueLine, areaPath: revenueArea, points: revenuePoints } = getRevenuePoints();

  const maxNetMargin = Math.max(...data.map(d => d.netMargin), 0) * 1.2 || 100;
  const minNetMargin = Math.min(Math.min(...data.map(d => d.netMargin)) * 1.2, 0);

  const getMarginPoints = () => {
    const w = chartWidth - paddingX * 2;
    const h = chartHeight - paddingY * 2;
    const range = (maxNetMargin - minNetMargin) || 100;
    
    const points = data.map((d, i) => {
      const x = paddingX + (i / (data.length - 1)) * w;
      const y = paddingY + h - ((d.netMargin - minNetMargin) / range) * h;
      return { x, y };
    });

    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${path} L ${paddingX + w} ${paddingY + h} L ${paddingX} ${paddingY + h} Z`;
    
    return { path, areaPath, points };
  };

  const { path: marginLine, areaPath: marginArea, points: marginPoints } = getMarginPoints();

  // Find recent hindsight records for this company
  const companyMemos = hindsightLedger.filter(l => l.companyId === selectedCompany.id);

  return (
    <div>
      {/* Selector and Title */}
      <div className="top-nav">
        <h1 className="page-title">Company Evolution Tracker</h1>
        <div style={styles.companySelector}>
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedId(c.id); setHoveredPoint(null); }}
              style={{
                ...styles.selectorBtn,
                ...(selectedId === c.id ? styles.selectorBtnActive : {})
              }}
              className={selectedId === c.id ? '' : 'glass-panel-interactive'}
            >
              {c.ticker}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.dashboardGrid}>
        {/* Left column - General summary & Charts */}
        <div style={styles.leftCol}>
          {/* Summary Panel */}
          <div style={styles.summaryCard} className="glass-panel">
            <div style={styles.summaryHeader}>
              <div>
                <h2 style={styles.compTitle}>{selectedCompany.name}</h2>
                <span style={styles.compSub}>Sector: {selectedCompany.sector} | Ticker: {selectedCompany.ticker}</span>
              </div>
              
              {/* Alignment score */}
              <div style={styles.scoreBox}>
                <div style={styles.scoreCircleBG}>
                  <div style={styles.scoreCircleValue}>
                    {selectedCompany.alignmentScore}%
                  </div>
                </div>
                <span style={styles.scoreLabel}>Forecast Alignment</span>
              </div>
            </div>
            <p style={styles.compDesc}>{selectedCompany.description}</p>
          </div>

          {/* SVG Financial Chart */}
          <div style={styles.chartCard} className="glass-panel">
            <h3 style={styles.cardHeader}>Financial Growth Trajectory</h3>
            <p style={styles.chartSub}>Area: Revenue (in $M) | Hover nodes to inspect</p>
            
            <div className="chart-container" style={{ height: '200px', width: '100%' }}>
              <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                <defs>
                  <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const h = chartHeight - paddingY * 2;
                  const y = paddingY + h - ratio * h;
                  const value = Math.round(ratio * maxRevenue);
                  return (
                    <g key={index}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        className="chart-grid-line"
                      />
                      <text
                        x={paddingX - 8}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="8"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        ${value >= 1000 ? (value / 1000).toFixed(1) + 'B' : value + 'M'}
                      </text>
                    </g>
                  );
                })}

                {/* Area paths */}
                <path d={revenueArea} className="chart-area" />
                <path d={revenueLine} className="chart-line" />

                {/* Points */}
                {revenuePoints.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={hoveredPoint?.index === index ? 6 : 4}
                    className="chart-point"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPoint({
                        index,
                        x: point.x,
                        y: point.y - 10,
                        data: data[index]
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* X axis labels */}
                {data.map((d, index) => {
                  const w = chartWidth - paddingX * 2;
                  const x = paddingX + (index / (data.length - 1)) * w;
                  return (
                    <text
                      key={index}
                      x={x}
                      y={chartHeight - 4}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {d.period}
                    </text>
                  );
                })}
              </svg>

                {/* Chart Tooltip */}
                {hoveredPoint && (
                  <div 
                    className="chart-tooltip"
                    style={{
                      left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                      top: `${hoveredPoint.y - 35}px`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <p style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.78rem' }}>{hoveredPoint.data.period}</p>
                    <p style={{ fontSize: '0.72rem', marginTop: '2px' }}>Revenue: <span style={{ color: '#6366f1', fontWeight: 600 }}>${hoveredPoint.data.revenue.toLocaleString()}M</span></p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Net Margin Trajectory Chart */}
            <div style={styles.chartCard} className="glass-panel">
              <h3 style={styles.cardHeader}>Net Margin Trajectory</h3>
              <p style={styles.chartSub}>Area: Profitability (%) | Hover nodes to inspect</p>
              
              <div className="chart-container" style={{ height: '200px', width: '100%' }}>
                <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  <defs>
                    <linearGradient id="margin-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                    const h = chartHeight - paddingY * 2;
                    const y = paddingY + h - ratio * h;
                    const range = maxNetMargin - minNetMargin;
                    const value = Math.round(minNetMargin + ratio * range);
                    return (
                      <g key={index}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          className="chart-grid-line"
                        />
                        <text
                          x={paddingX - 8}
                          y={y + 3}
                          fill="#64748b"
                          fontSize="8"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {value}%
                        </text>
                      </g>
                    );
                  })}

                  <path d={marginArea} fill="url(#margin-gradient)" />
                  <path d={marginLine} stroke="#10b981" strokeWidth="2" fill="none" />

                  {/* Points */}
                  {marginPoints.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={hoveredMarginPoint?.index === index ? 6 : 4}
                      fill="#1e293b"
                      stroke="#10b981"
                      strokeWidth="2"
                      style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        setHoveredMarginPoint({
                          index,
                          x: point.x,
                          y: point.y - 10,
                          data: data[index]
                        });
                      }}
                      onMouseLeave={() => setHoveredMarginPoint(null)}
                    />
                  ))}

                  {/* X axis labels */}
                  {data.map((d, index) => {
                    const w = chartWidth - paddingX * 2;
                    const x = paddingX + (index / (data.length - 1)) * w;
                    return (
                      <text
                        key={index}
                        x={x}
                        y={chartHeight - 4}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                      >
                        {d.period}
                      </text>
                    );
                  })}
                </svg>

                {/* Margin Tooltip */}
                {hoveredMarginPoint && (
                  <div 
                    className="chart-tooltip"
                    style={{
                      left: `${(hoveredMarginPoint.x / chartWidth) * 100}%`,
                      top: `${hoveredMarginPoint.y - 35}px`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <p style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.78rem' }}>{hoveredMarginPoint.data.period}</p>
                    <p style={{ fontSize: '0.72rem', marginTop: '2px' }}>Net Margin: <span style={{ color: '#10b981', fontWeight: 600 }}>{hoveredMarginPoint.data.netMargin}%</span></p>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Right column - Target expectations & Product list */}
        <div style={styles.rightCol}>
          {/* Registered Expectations */}
          <div style={styles.expectationsCard} className="glass-panel">
            <div style={styles.cardHeaderWithIcon}>
              <Target size={16} color="#6366f1" />
              <h3>Monitored Expectations</h3>
            </div>
            
            <div style={styles.expList}>
              {selectedCompany.expectations.length === 0 ? (
                <div style={styles.emptyExp}>
                  <Info size={16} color="#64748b" />
                  <span>All registered timelines have resolved.</span>
                </div>
              ) : (
                selectedCompany.expectations.map((exp) => (
                  <div key={exp.id} style={styles.expItem} className="glass-panel">
                    <p style={styles.expText}>{exp.description}</p>
                    <div style={styles.expMeta}>
                      <span style={styles.expTimeline}>Target: {exp.targetTimeline}</span>
                      <span style={styles.expMetric}>Metric: {exp.metricTarget}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Product Market Adoption Chart */}
          <div style={styles.productsCard} className="glass-panel">
            <div style={styles.cardHeaderWithIcon}>
              <Briefcase size={16} color="#6366f1" />
              <h3>Product Market Adoption</h3>
            </div>
            
            <div className="chart-container" style={{ width: '100%', padding: '10px 0' }}>
              <svg width="100%" height={Math.max(120, selectedCompany.products.length * 45)} style={{ overflow: 'visible' }}>
                {selectedCompany.products.map((p, i) => {
                  const y = i * 45;
                  return (
                    <g key={i}>
                      <text x="0" y={y + 14} fill="#cbd5e1" fontSize="0.75rem" fontWeight="600">{p.name.length > 30 ? p.name.substring(0,27)+'...' : p.name}</text>
                      <rect x="0" y={y + 22} width="100%" height="8" fill="rgba(255,255,255,0.05)" rx="4" />
                      <rect x="0" y={y + 22} width={`${Math.min(100, Math.max(0, p.marketAdoption))}%`} height="8" fill="#6366f1" rx="4" />
                      <text x="100%" y={y + 14} fill="#6366f1" fontSize="0.7rem" fontWeight="bold" textAnchor="end">{p.marketAdoption}%</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Hindsight Delta Diverging Chart */}
          <div style={styles.productsCard} className="glass-panel">
            <div style={styles.cardHeaderWithIcon}>
              <TrendingUp size={16} color="#10b981" />
              <h3>Momentum & Hindsight Delta</h3>
            </div>
            
            <div className="chart-container" style={{ width: '100%', padding: '10px 0' }}>
              <svg width="100%" height={Math.max(120, selectedCompany.products.length * 45)} style={{ overflow: 'visible' }}>
                {/* Center line (0 point) */}
                <line x1="50%" y1="0" x2="50%" y2={selectedCompany.products.length * 45} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                <text x="50%" y={-10} fill="#64748b" fontSize="0.65rem" textAnchor="middle">EXPECTATIONS (0%)</text>
                
                {selectedCompany.products.map((p, i) => {
                  const y = i * 45;
                  const maxDelta = Math.max(20, ...selectedCompany.products.map(pr => Math.abs(pr.hindsightDelta)));
                  const rawDelta = p.hindsightDelta;
                  const barWidthPct = (Math.abs(rawDelta) / maxDelta) * 45; 
                  const isPositive = rawDelta >= 0;
                  
                  return (
                    <g key={i}>
                      <text x="50%" y={y + 14} fill="#cbd5e1" fontSize="0.7rem" textAnchor="middle">{p.name.length > 30 ? p.name.substring(0,27)+'...' : p.name}</text>
                      
                      {isPositive ? (
                        <>
                          <rect x="50%" y={y + 22} width={`${barWidthPct}%`} height="10" fill="#10b981" rx="2" />
                          <text x={`${50 + barWidthPct + 2}%`} y={y + 31} fill="#10b981" fontSize="0.7rem" fontWeight="bold">+{rawDelta}%</text>
                        </>
                      ) : (
                        <>
                          <rect x={`${50 - barWidthPct}%`} y={y + 22} width={`${barWidthPct}%`} height="10" fill="#f43f5e" rx="2" />
                          <text x={`${50 - barWidthPct - 2}%`} y={y + 31} fill="#f43f5e" fontSize="0.7rem" fontWeight="bold" textAnchor="end">{rawDelta}%</text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Interactive Bar Graphs & Pie Charts */}
      <CompanyAnalyticsCharts company={selectedCompany} />

      {/* Strategic Intelligence Panel */}
      <div style={styles.dashboardGrid}>
        {/* Risks & Outlook */}
        <div style={styles.intelCard} className="glass-panel">
          <div style={styles.cardHeaderWithIcon}>
            <Shield size={16} color="#ef4444" />
            <h3>Strategic Intelligence & Risks</h3>
          </div>
          
          <div style={styles.intelSection}>
            <h4 style={styles.intelSubhead}><AlertTriangle size={14} color="#f59e0b" /> Core Risk Factors</h4>
            <p style={styles.intelText}>{selectedCompany.riskFactors || 'Data not available'}</p>
          </div>
          
          <div style={styles.intelSection}>
            <h4 style={styles.intelSubhead}><Globe size={14} color="#3b82f6" /> Geopolitical Risks</h4>
            <p style={styles.intelText}>{selectedCompany.geopoliticalRisks || 'Data not available'}</p>
          </div>
          
          <div style={styles.intelSection}>
            <h4 style={styles.intelSubhead}><Users size={14} color="#6366f1" /> Competitor & Supply Dependencies</h4>
            <p style={styles.intelText}>{selectedCompany.competitorDependencies || selectedCompany.dependencies || 'Data not available'}</p>
          </div>
          
          <div style={styles.intelSection}>
            <h4 style={styles.intelSubhead}><TrendingUp size={14} color="#10b981" /> 10-Year Growth Outlook</h4>
            <p style={styles.intelText}>{selectedCompany.growthOutlook || 'Data not available'}</p>
          </div>
        </div>

        {/* Incidents & Insights */}
        <div style={styles.intelCard} className="glass-panel">
          <div style={styles.cardHeaderWithIcon}>
            <Activity size={16} color="#8b5cf6" />
            <h3>Operational History & Insights</h3>
          </div>

          <div style={styles.intelSection}>
            <h4 style={styles.intelSubhead}><Target size={14} color="#8b5cf6" /> Key AI Insights</h4>
            <ul style={styles.insightsList}>
              {(selectedCompany.keyInsights || []).map((insight, idx) => (
                <li key={idx} style={styles.intelText}>{insight}</li>
              ))}
            </ul>
          </div>

          <div style={styles.intelSection}>
            <h4 style={styles.intelSubhead}><History size={14} color="#f43f5e" /> Past Incidents</h4>
            <div style={styles.incidentList}>
              {(selectedCompany.pastIncidents || []).length > 0 ? (
                (selectedCompany.pastIncidents || []).map((inc, i) => (
                  <div key={i} style={styles.incidentItem}>
                    <div style={styles.incidentDot} />
                    <div>
                      <strong style={{ color: '#e2e8f0', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>{inc.title}</strong>
                      <span style={styles.intelText}>{inc.impact}</span>
                    </div>
                  </div>
                ))
              ) : (
                <span style={styles.intelText}>No major past incidents tracked.</span>
              )}
            </div>
          </div>
          
          {selectedCompany.currentIncidents && selectedCompany.currentIncidents.length > 0 && (
            <div style={styles.intelSection}>
              <h4 style={styles.intelSubhead}><AlertTriangle size={14} color="#ef4444" /> Current Incidents</h4>
              <div style={styles.incidentList}>
                {selectedCompany.currentIncidents.map((inc, i) => (
                  <div key={i} style={styles.incidentItem}>
                    <div style={{ ...styles.incidentDot, backgroundColor: '#ef4444' }} />
                    <div>
                      <strong style={{ color: '#e2e8f0', fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>{inc.title}</strong>
                      <span style={styles.intelText}>{inc.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const styles = {
  companySelector: {
    display: 'flex',
    gap: '8px',
  },
  selectorBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'all 0.25s ease',
  },
  selectorBtnActive: {
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    color: '#ffffff',
    borderColor: 'transparent',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
  },
  dashboardGrid: {
    display: 'flex',
    gap: '24px',
    alignItems: 'stretch',
    flexWrap: 'wrap' as const,
  },
  leftCol: {
    flex: '3 1 480px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  rightCol: {
    flex: '2 1 340px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  summaryCard: {
    padding: '24px',
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  compTitle: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  compSub: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginTop: '4px',
    display: 'block',
  },
  compDesc: {
    fontSize: '0.88rem',
    color: '#cbd5e1',
    lineHeight: '1.5',
  },
  scoreBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '6px',
  },
  scoreCircleBG: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'rgba(99, 102, 241, 0.08)',
    border: '2px solid rgba(99, 102, 241, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px rgba(99, 102, 241, 0.15)',
  },
  scoreCircleValue: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  scoreLabel: {
    fontSize: '0.68rem',
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  chartCard: {
    padding: '20px',
  },
  cardHeader: {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  cardHeaderWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  chartSub: {
    fontSize: '0.78rem',
    color: '#64748b',
    marginTop: '2px',
    marginBottom: '16px',
  },
  expectationsCard: {
    padding: '20px',
  },
  expList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  expItem: {
    padding: '12px 14px',
    background: 'rgba(0, 0, 0, 0.15)',
  },
  expText: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
    lineHeight: '1.4',
  },
  expMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem',
    color: '#64748b',
    marginTop: '8px',
  },
  expTimeline: {
    background: 'rgba(255,255,255,0.03)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  expMetric: {
    color: '#6366f1',
    fontWeight: 500,
  },
  emptyExp: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
    color: '#64748b',
    fontSize: '0.8rem',
    border: '1px dashed rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
  },
  productsCard: {
    padding: '20px',
  },
  productList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  productItem: {
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    paddingBottom: '14px',
  },
  productMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  productName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  productStatusBadge: {
    fontSize: '0.65rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase' as const,
  },
  intelCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  intelSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  intelSubhead: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    margin: 0,
  },
  intelText: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    lineHeight: '1.5',
    margin: 0,
  },
  insightsList: {
    margin: 0,
    paddingLeft: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  incidentList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginTop: '4px',
  },
  incidentItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    background: 'rgba(255,255,255,0.02)',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  incidentDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#6366f1',
    marginTop: '4px',
    flexShrink: 0,
  },
  productAdoptionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginBottom: '4px',
  },
  adoptionLabel: {
    fontWeight: 500,
  },
  adoptionBarBG: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  adoptionBarFill: {
    height: '100%',
    borderRadius: '2px',
  },
  deltaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#94a3b8',
  }
};
