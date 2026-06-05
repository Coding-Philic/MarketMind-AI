import React, { useState } from 'react';
import { 
  TrendingUp, 
  Target, 
  Briefcase, 
  HelpCircle,
  TrendingDown,
  Info
} from 'lucide-react';
import { Company, RevenueDataPoint, HindsightRecord } from '../types';

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
                  <p style={{ fontSize: '0.72rem' }}>Net Margin: <span style={{ color: '#10b981', fontWeight: 600 }}>{hoveredPoint.data.netMargin}%</span></p>
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

          {/* Product Index list */}
          <div style={styles.productsCard} className="glass-panel">
            <div style={styles.cardHeaderWithIcon}>
              <Briefcase size={16} color="#6366f1" />
              <h3>Product Performance Index</h3>
            </div>

            <div style={styles.productList}>
              {selectedCompany.products.map((p) => {
                const isPositive = p.hindsightDelta >= 0;
                
                return (
                  <div key={p.name} style={styles.productItem}>
                    <div style={styles.productMeta}>
                      <span style={styles.productName}>{p.name}</span>
                      <span style={{
                        ...styles.productStatusBadge,
                        backgroundColor: p.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: p.status === 'active' ? '#10b981' : '#f59e0b'
                      }}>
                        {p.status}
                      </span>
                    </div>

                    <div style={styles.productAdoptionRow}>
                      <span style={styles.adoptionLabel}>Market Adoption</span>
                      <span>{p.marketAdoption}%</span>
                    </div>
                    <div style={styles.adoptionBarBG}>
                      <div style={{ ...styles.adoptionBarFill, width: `${p.marketAdoption}%`, backgroundColor: '#6366f1' }} />
                    </div>

                    <div style={styles.deltaRow}>
                      <span>Hindsight Delta</span>
                      <span style={{
                        color: isPositive ? '#10b981' : '#f43f5e',
                        fontWeight: 600,
                        fontSize: '0.8rem'
                      }}>
                        {isPositive ? `+${p.hindsightDelta}% Ahead` : `${p.hindsightDelta}% Lagging`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
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
