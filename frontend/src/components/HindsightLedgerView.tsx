import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  SlidersHorizontal,
  Clock,
  ArrowRight,
  TrendingDown,
  XCircle
} from 'lucide-react';
import { HindsightRecord } from '../types';

interface HindsightLedgerViewProps {
  ledger: HindsightRecord[];
}

export const HindsightLedgerView: React.FC<HindsightLedgerViewProps> = ({ ledger }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Filter logic
  const filteredLedger = ledger.filter(item => {
    const matchesSearch = 
      item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.expectationDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hindsightLesson.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSeverity = severityFilter === 'all' || item.severity === severityFilter;

    return matchesSearch && matchesSeverity;
  });

  const getDeviationBadge = (value: HindsightRecord['deviationValue']) => {
    switch (value) {
      case 'exceeded_expectations':
      case 'ahead':
        return <span className="badge badge-success" style={{ textTransform: 'uppercase' }}>{value.replace('_', ' ')}</span>;
      case 'on_track':
        return <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>ON TRACK</span>;
      case 'lagging':
      case 'missed_expectations':
        return <span className="badge badge-warning" style={{ textTransform: 'uppercase' }}>{value.replace('_', ' ')}</span>;
      case 'cancelled':
        return <span className="badge badge-error" style={{ textTransform: 'uppercase' }}>CANCELLED</span>;
      default:
        return <span className="badge" style={{ textTransform: 'uppercase' }}>{value}</span>;
    }
  };

  const getSeverityColor = (severity: HindsightRecord['severity']) => {
    switch (severity) {
      case 'critical': return '#f43f5e';
      case 'moderate': return '#f59e0b';
      case 'minor': return '#10b981';
      default: return '#94a3b8';
    }
  };

  return (
    <div>
      {/* Title & Filter Bar */}
      <div className="top-nav">
        <h1 className="page-title">Hindsight Ledger</h1>
        <div style={styles.filterBar}>
          <div style={styles.searchContainer} className="glass-panel">
            <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search companies, forecasts or lessons..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <SlidersHorizontal size={14} color="#94a3b8" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="moderate">Moderate</option>
              <option value="minor">Minor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger list */}
      <div style={styles.ledgerList}>
        {filteredLedger.length === 0 ? (
          <div style={styles.emptyState} className="glass-panel">
            <Clock size={36} color="#475569" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '1rem', color: '#cbd5e1', fontWeight: 500 }}>No hindsight logs detected</p>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
              Adjust filters or inject a custom event that contradicts active goals.
            </p>
          </div>
        ) : (
          filteredLedger.map((record, index) => {
            const severityColor = getSeverityColor(record.severity);
            
            return (
              <div 
                key={record.id} 
                style={{
                  ...styles.ledgerCard,
                  borderLeft: `4px solid ${severityColor}`
                }}
                className="glass-panel"
              >
                {/* Timeline dot decoration */}
                <div style={styles.timelineDecorator}>
                  <div style={{ ...styles.timelineDot, backgroundColor: severityColor }} />
                  {index < filteredLedger.length - 1 && <div style={styles.timelineLine} />}
                </div>

                <div style={styles.cardContent}>
                  {/* Company & Meta info */}
                  <div style={styles.metaRow}>
                    <div>
                      <h3 style={styles.companyName}>{record.companyName}</h3>
                      <span style={styles.timestamp}>Audited: {new Date(record.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {getDeviationBadge(record.deviationValue)}
                      <span 
                        style={{
                          backgroundColor: `${severityColor}15`,
                          color: severityColor,
                          border: `1px solid ${severityColor}30`
                        }}
                        className="badge"
                      >
                        {record.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Comparatives block */}
                  <div style={styles.comparativeBlock}>
                    <div style={styles.comparativeItem}>
                      <span style={styles.compLabel}>REGISTERED EXPECTATION</span>
                      <p style={styles.compText}>{record.expectationDescription}</p>
                      <span style={styles.timelineBadge}>Target: {record.expectedTimeline}</span>
                    </div>
                    <div style={styles.arrowIcon}>
                      <ArrowRight size={20} color="#475569" />
                    </div>
                    <div style={styles.comparativeItem}>
                      <span style={styles.compLabel}>ACTUAL OUTCOME RECORD</span>
                      <p style={styles.compText}>{record.actualOutcomeDescription}</p>
                    </div>
                  </div>

                  {/* Hindsight Lesson block */}
                  <div style={styles.lessonBlock}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <AlertTriangle size={14} color="#f59e0b" />
                      <span style={styles.lessonLabel}>HINDSIGHT LESSON INTEGRATED</span>
                    </div>
                    <p style={styles.lessonText}>{record.hindsightLesson}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const styles = {
  filterBar: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 14px',
    width: '260px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#f1f5f9',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '2px 10px',
  },
  select: {
    background: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
    padding: '6px 0',
  },
  ledgerList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    paddingLeft: '16px',
    position: 'relative' as const,
  },
  ledgerCard: {
    display: 'flex',
    padding: '20px',
    gap: '20px',
  },
  timelineDecorator: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '12px',
    position: 'relative' as const,
  },
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    zIndex: 2,
    marginTop: '4px',
  },
  timelineLine: {
    width: '2px',
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    position: 'absolute' as const,
    top: '16px',
    bottom: '-28px',
    zIndex: 1,
  },
  cardContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyName: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  timestamp: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '2px',
    display: 'block',
  },
  comparativeBlock: {
    display: 'flex',
    gap: '16px',
    alignItems: 'stretch',
    flexWrap: 'wrap' as const,
  },
  comparativeItem: {
    flex: '1 1 250px',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.03)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
  },
  compLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#6366f1',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  compText: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
    lineHeight: '1.4',
  },
  timelineBadge: {
    fontSize: '0.72rem',
    color: '#94a3b8',
    marginTop: '8px',
    alignSelf: 'flex-start',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  arrowIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonBlock: {
    background: 'rgba(245, 158, 11, 0.04)',
    border: '1px solid rgba(245, 158, 11, 0.15)',
    padding: '14px',
    borderRadius: '8px',
  },
  lessonLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#f59e0b',
    letterSpacing: '0.05em',
  },
  lessonText: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
    lineHeight: '1.45',
  },
  emptyState: {
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    marginTop: '24px',
  }
};
