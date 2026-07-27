import React, { useState } from 'react';
import { 
  PieChart as PieIcon, 
  BarChart3, 
  Star, 
  MessageSquare, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Award,
  CheckCircle2
} from 'lucide-react';
import { Company, ProductPerformance } from '../types';

interface CompanyAnalyticsChartsProps {
  company: Company;
}

export const CompanyAnalyticsCharts: React.FC<CompanyAnalyticsChartsProps> = ({ company }) => {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'financials'>('products');

  const products = company.products || [];
  const revenueData = company.revenueData || [];

  // Calculate total adoption for smart fallback revenue share distribution
  const totalAdoption = products.reduce((acc, p) => acc + Math.max(1, p.marketAdoption || 10), 0);

  // Enrich product data with smart deterministic fallbacks if optional fields are missing
  const enrichedProducts = products.map((p, idx) => {
    const revenueShare = p.revenueShare !== undefined
      ? p.revenueShare
      : Math.round(((Math.max(1, p.marketAdoption || 10)) / totalAdoption) * 100);

    const rating = p.rating !== undefined
      ? p.rating
      : Number((3.2 + ((p.marketAdoption || 50) / 100) * 1.7).toFixed(1));

    const reviewCount = p.reviewCount !== undefined
      ? p.reviewCount
      : Math.round((p.marketAdoption || 50) * 14 + (idx * 23) + 35);

    const category = p.category || `${company.sector || 'Core Industry'} (${(p.status || 'active').toUpperCase()})`;

    return {
      ...p,
      revenueShare,
      rating,
      reviewCount,
      category
    };
  });

  // Calculate sector/category breakdown for Donut Chart
  const categoryMap: Record<string, { count: number; totalRevenueShare: number; color: string }> = {};
  const palette = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];

  enrichedProducts.forEach((p) => {
    if (!categoryMap[p.category]) {
      const colorIdx = Object.keys(categoryMap).length % palette.length;
      categoryMap[p.category] = { count: 0, totalRevenueShare: 0, color: palette[colorIdx] };
    }
    categoryMap[p.category].count += 1;
    categoryMap[p.category].totalRevenueShare += (p.revenueShare || 0);
  });

  const categories = Object.entries(categoryMap).map(([name, data]) => ({
    name,
    count: data.count,
    share: data.totalRevenueShare,
    color: data.color
  }));

  const totalShare = categories.reduce((sum, c) => sum + Math.max(1, c.share), 0);

  // Helper to generate SVG arcs for Donut Chart
  const generateDonutSlices = () => {
    let currentAngle = 0;
    return categories.map((cat, i) => {
      const slicePercentage = Math.max(1, cat.share) / totalShare;
      const sliceAngle = slicePercentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      // Convert angles to radians and calculate SVG coordinates (center 100, 100, radius 70, inner 40)
      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      const x1 = 100 + 70 * Math.cos(startRad);
      const y1 = 100 + 70 * Math.sin(startRad);
      const x2 = 100 + 70 * Math.cos(endRad);
      const y2 = 100 + 70 * Math.sin(endRad);

      const x3 = 100 + 40 * Math.cos(endRad);
      const y3 = 100 + 40 * Math.sin(endRad);
      const x4 = 100 + 40 * Math.cos(startRad);
      const y4 = 100 + 40 * Math.sin(startRad);

      const largeArc = sliceAngle > 180 ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A 70 70 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A 40 40 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');

      return {
        ...cat,
        d,
        percentage: Math.round(slicePercentage * 100),
        index: i
      };
    });
  };

  const donutSlices = generateDonutSlices();

  // Find max revenue for Vertical Bar Chart
  const maxAnnualRev = Math.max(...revenueData.map(d => d.revenue), 10);

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <div style={styles.titleSection}>
          <BarChart3 size={18} color="#6366f1" />
          <h3 style={styles.mainTitle}>Interactive Graphical Intelligence & Product Analytics</h3>
        </div>
        <div style={styles.tabButtons}>
          <button
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'products' ? styles.tabBtnActive : {})
            }}
            onClick={() => setActiveTab('products')}
          >
            <Layers size={14} /> Product & Sector Graphs
          </button>
          <button
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'financials' ? styles.tabBtnActive : {})
            }}
            onClick={() => setActiveTab('financials')}
          >
            <DollarSign size={14} /> Revenue & Profitability Bars
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <div style={styles.gridContainer}>
          {/* Chart 1: Product Sector Donut Chart */}
          <div style={styles.card} className="glass-panel">
            <div style={styles.cardHeader}>
              <PieIcon size={16} color="#06b6d4" />
              <h4 style={styles.cardTitle}>Product Sector & Revenue Breakdown</h4>
            </div>
            
            <div style={styles.donutLayout}>
              <div style={styles.svgWrapper}>
                <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', maxHeight: '180px', overflow: 'visible' }}>
                  {donutSlices.map((slice) => (
                    <g key={slice.index}>
                      <path
                        d={slice.d}
                        fill={slice.color}
                        style={{
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          opacity: hoveredSlice === null || hoveredSlice === slice.index ? 1 : 0.4,
                          transform: hoveredSlice === slice.index ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: '100px 100px'
                        }}
                        onMouseEnter={() => setHoveredSlice(slice.index)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                    </g>
                  ))}
                  <circle cx="100" cy="100" r="35" fill="rgba(15, 23, 42, 0.8)" />
                  <text x="100" y="96" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">
                    {hoveredSlice !== null ? `${donutSlices[hoveredSlice].percentage}%` : `${enrichedProducts.length}`}
                  </text>
                  <text x="100" y="112" fill="#94a3b8" fontSize="8" textAnchor="middle">
                    {hoveredSlice !== null ? 'SHARE' : 'PRODUCTS'}
                  </text>
                </svg>
              </div>

              <div style={styles.legendContainer}>
                {donutSlices.map((slice) => (
                  <div
                    key={slice.index}
                    style={{
                      ...styles.legendItem,
                      opacity: hoveredSlice === null || hoveredSlice === slice.index ? 1 : 0.5
                    }}
                    onMouseEnter={() => setHoveredSlice(slice.index)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    <div style={{ ...styles.legendColorDot, backgroundColor: slice.color }} />
                    <div style={styles.legendTextWrapper}>
                      <span style={styles.legendName}>{slice.name}</span>
                      <span style={styles.legendStats}>{slice.count} products ({slice.percentage}% rev)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2: Revenue Share vs Market Adoption Grouped Bar Graph */}
          <div style={styles.card} className="glass-panel">
            <div style={styles.cardHeader}>
              <BarChart3 size={16} color="#10b981" />
              <h4 style={styles.cardTitle}>Revenue Contribution vs. Market Adoption Bar Graph</h4>
            </div>

            <div style={styles.barGraphContainer}>
              <div style={styles.barLegend}>
                <span style={styles.barLegendBadge}><span style={{ ...styles.dot, background: '#10b981' }} /> Revenue Share (%)</span>
                <span style={styles.barLegendBadge}><span style={{ ...styles.dot, background: '#6366f1' }} /> Market Adoption (%)</span>
              </div>

              <div style={styles.barList}>
                {enrichedProducts.map((p, idx) => (
                  <div key={idx} style={styles.barGroup}>
                    <div style={styles.barLabelRow}>
                      <span style={styles.productTitle}>{p.name}</span>
                      <span style={styles.productCategoryPill}>{p.category}</span>
                    </div>

                    {/* Revenue Bar */}
                    <div style={styles.barTrack}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${Math.min(100, Math.max(4, p.revenueShare))}%`,
                          backgroundColor: '#10b981'
                        }}
                      />
                      <span style={styles.barValueText}>{p.revenueShare}% Rev</span>
                    </div>

                    {/* Adoption Bar */}
                    <div style={styles.barTrack}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${Math.min(100, Math.max(4, p.marketAdoption))}%`,
                          backgroundColor: '#6366f1'
                        }}
                      />
                      <span style={styles.barValueText}>{p.marketAdoption}% Adoption</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 3: Product Ratings & Review Density Grid */}
          <div style={{ ...styles.card, gridColumn: '1 / -1' }} className="glass-panel">
            <div style={styles.cardHeader}>
              <Award size={16} color="#f59e0b" />
              <h4 style={styles.cardTitle}>Market Review Coverage & Product Adoption Ratings</h4>
            </div>

            <div style={styles.ratingsGrid}>
              {enrichedProducts.map((p, idx) => (
                <div key={idx} style={styles.ratingCard}>
                  <div style={styles.ratingCardHeader}>
                    <div style={styles.ratingTitleBox}>
                      <strong style={styles.ratingProductName}>{p.name}</strong>
                      <span style={styles.statusBadge(p.status)}>{p.status.toUpperCase()}</span>
                    </div>
                    <div style={styles.scoreBox}>
                      <Star size={14} color="#f59e0b" fill="#f59e0b" />
                      <span style={styles.ratingNumber}>{p.rating}</span>
                      <span style={styles.ratingMax}>/5.0</span>
                    </div>
                  </div>

                  <div style={styles.reviewBarSection}>
                    <div style={styles.reviewBarHeader}>
                      <span style={styles.reviewLabel}>
                        <MessageSquare size={12} color="#94a3b8" style={{ marginRight: 4 }} /> 
                        Analyst & Market Reviews Tracked:
                      </span>
                      <span style={styles.reviewCountBadge}>{p.reviewCount?.toLocaleString()} reviews</span>
                    </div>
                    <div style={styles.reviewBarBG}>
                      <div
                        style={{
                          ...styles.reviewBarFill,
                          width: `${Math.min(100, ((p.reviewCount || 100) / 250) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Financials Tab: Yearly Revenue vs Net Margin Bar Graph */
        <div style={styles.card} className="glass-panel">
          <div style={styles.cardHeader}>
            <TrendingUp size={16} color="#10b981" />
            <h4 style={styles.cardTitle}>Annual Gross Revenue ($M) vs. Net Profit Margin (%) Bar Graph</h4>
          </div>

          {revenueData.length === 0 ? (
            <div style={styles.emptyText}>No historical annual revenue data available for bar graph rendering.</div>
          ) : (
            <div style={styles.financialBarContainer}>
              <div style={styles.annualBarsGrid}>
                {revenueData.map((d, idx) => {
                  const barHeightPct = Math.max(8, Math.min(100, (d.revenue / maxAnnualRev) * 100));
                  const isPositive = d.netMargin >= 0;
                  return (
                    <div key={idx} style={styles.annualBarCol}>
                      <div style={styles.marginBadge(isPositive)}>
                        {isPositive ? '+' : ''}{d.netMargin}% margin
                      </div>
                      <div style={styles.barColumnArea}>
                        <div
                          style={{
                            ...styles.verticalRevenueBar,
                            height: `${barHeightPct}%`,
                            backgroundColor: isPositive ? '#3b82f6' : '#ef4444'
                          }}
                        >
                          <span style={styles.verticalBarValue}>${d.revenue.toLocaleString()}M</span>
                        </div>
                      </div>
                      <span style={styles.periodLabel}>{d.period}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '12px',
    background: 'rgba(30, 41, 59, 0.7)',
    padding: '12px 18px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  mainTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.01em',
  },
  tabButtons: {
    display: 'flex',
    gap: '8px',
  },
  tabBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '6px 14px',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
    borderColor: '#6366f1',
    color: '#f8fafc',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: '16px',
  },
  card: {
    padding: '20px',
    borderRadius: '12px',
    background: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '10px',
  },
  cardTitle: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  donutLayout: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  svgWrapper: {
    width: '160px',
    height: '160px',
    flexShrink: 0,
  },
  legendContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    flex: '1 1 180px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  legendColorDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  legendTextWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  legendName: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  legendStats: {
    fontSize: '0.7rem',
    color: '#94a3b8',
  },
  barGraphContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  barLegend: {
    display: 'flex',
    gap: '16px',
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  barLegendBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  barList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  barGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  barLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productTitle: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#f8fafc',
  },
  productCategoryPill: {
    fontSize: '0.65rem',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '2px 8px',
    borderRadius: '12px',
    color: '#cbd5e1',
  },
  barTrack: {
    width: '100%',
    height: '14px',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  barValueText: {
    position: 'absolute' as const,
    right: '8px',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#ffffff',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
  },
  ratingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px',
  },
  ratingCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  ratingCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  ratingTitleBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  ratingProductName: {
    fontSize: '0.85rem',
    color: '#f8fafc',
  },
  statusBadge: (status: string) => ({
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    width: 'fit-content',
    background: status === 'active' ? 'rgba(16, 185, 129, 0.15)' : status === 'beta' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
    color: status === 'active' ? '#34d399' : status === 'beta' ? '#818cf8' : '#fbbf24',
  }),
  scoreBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(245, 158, 11, 0.1)',
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  ratingNumber: {
    fontSize: '0.9rem',
    fontWeight: 800,
    color: '#f59e0b',
  },
  ratingMax: {
    fontSize: '0.7rem',
    color: '#94a3b8',
  },
  reviewBarSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  reviewBarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.72rem',
  },
  reviewLabel: {
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
  },
  reviewCountBadge: {
    fontWeight: 600,
    color: '#e2e8f0',
  },
  reviewBarBG: {
    width: '100%',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  reviewBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
    borderRadius: '3px',
  },
  financialBarContainer: {
    padding: '10px 0',
    overflowX: 'auto' as const,
  },
  annualBarsGrid: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '16px',
    minHeight: '220px',
    paddingTop: '20px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  annualBarCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    flex: '1 1 60px',
    minWidth: '65px',
    height: '200px',
    justifyContent: 'flex-end',
  },
  marginBadge: (isPositive: boolean) => ({
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '10px',
    background: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
    color: isPositive ? '#34d399' : '#f87171',
    whiteSpace: 'nowrap' as const,
    border: `1px solid ${isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
  }),
  barColumnArea: {
    width: '100%',
    height: '150px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '6px',
    padding: '0 8px',
  },
  verticalRevenueBar: {
    width: '100%',
    maxWidth: '40px',
    borderRadius: '4px 4px 0 0',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '6px',
    transition: 'height 0.5s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  verticalBarValue: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#ffffff',
    transform: 'rotate(-90deg)',
    whiteSpace: 'nowrap' as const,
    marginTop: '16px',
  },
  periodLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#cbd5e1',
    marginTop: '4px',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: '0.85rem',
    textAlign: 'center' as const,
    padding: '20px 0',
  }
};
