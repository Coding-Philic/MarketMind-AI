import React, { useState } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  Edit3, 
  Save, 
  Award,
  AlertCircle
} from 'lucide-react';
import { InvestmentMemo } from '../types';
import confetti from 'canvas-confetti';

interface IntelHubViewProps {
  memos: InvestmentMemo[];
  onUpdateMemo: (memoId: string, updatedMemo: InvestmentMemo) => void;
}

export const IntelHubView: React.FC<IntelHubViewProps> = ({ memos, onUpdateMemo }) => {
  const [selectedMemoId, setSelectedMemoId] = useState<string>(memos[0]?.id || '');
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  const activeMemo = memos.find(m => m.id === selectedMemoId) || memos[0];

  // Clipboard copy helper
  const handleCopy = () => {
    if (!activeMemo) return;
    navigator.clipboard.writeText(activeMemo.fullMemo).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Toggle editor mode
  const handleStartEdit = () => {
    if (!activeMemo) return;
    setEditContent(activeMemo.fullMemo);
    setIsEditing(true);
  };

  // Save changes
  const handleSave = () => {
    if (!activeMemo) return;
    const updated: InvestmentMemo = {
      ...activeMemo,
      fullMemo: editContent,
      keyThesis: editContent.substring(0, 150) + '...'
    };
    onUpdateMemo(activeMemo.id, updated);
    setIsEditing(false);
    
    // Play celebratory sparks on save
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#a855f7', '#10b981']
    });
  };

  const getRatingBadge = (rec: InvestmentMemo['recommendation']) => {
    switch (rec) {
      case 'BUY':
        return <span className="badge badge-success" style={styles.recBadge}>BUY</span>;
      case 'SELL':
        return <span className="badge badge-error" style={styles.recBadge}>SELL</span>;
      case 'HOLD':
        return <span className="badge badge-warning" style={styles.recBadge}>HOLD</span>;
      case 'UNDER_REVIEW':
        return <span className="badge badge-info" style={styles.recBadge}>UNDER REVIEW</span>;
      default:
        return <span className="badge" style={styles.recBadge}>{rec}</span>;
    }
  };

  const getRatingGlow = (rec: InvestmentMemo['recommendation']) => {
    switch (rec) {
      case 'BUY': return '0 0 20px rgba(16, 185, 129, 0.15)';
      case 'SELL': return '0 0 20px rgba(244, 63, 94, 0.15)';
      case 'HOLD': return '0 0 20px rgba(245, 158, 11, 0.15)';
      default: return '0 0 20px rgba(99, 102, 241, 0.15)';
    }
  };

  return (
    <div>
      {/* Title */}
      <div className="top-nav">
        <h1 className="page-title">Institutional Intelligence Hub</h1>
      </div>

      <div style={styles.hubContainer}>
        {/* Memo listings list */}
        <div style={styles.memoListPane} className="glass-panel">
          <div style={styles.paneHeader}>
            <FileText size={16} color="#6366f1" />
            <h3>Generated Memos ({memos.length})</h3>
          </div>

          <div style={styles.listingsScroll}>
            {memos.length === 0 ? (
              <div style={styles.emptyList}>
                <p>No investment memos generated yet.</p>
              </div>
            ) : (
              memos.map((memo) => {
                const isActive = memo.id === activeMemo?.id;
                return (
                  <div
                    key={memo.id}
                    onClick={() => { setSelectedMemoId(memo.id); setIsEditing(false); }}
                    style={{
                      ...styles.listingItem,
                      ...(isActive ? styles.listingItemActive : {})
                    }}
                    className={isActive ? '' : 'glass-panel-interactive'}
                  >
                    <div style={styles.listingMeta}>
                      <span style={styles.listingTicker}>{memo.ticker}</span>
                      {getRatingBadge(memo.recommendation)}
                    </div>
                    <h4 style={styles.listingTitle}>{memo.title}</h4>
                    <span style={styles.listingTime}>
                      {new Date(memo.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detailed Memo Viewer */}
        {activeMemo ? (
          <div 
            style={{ 
              ...styles.viewerPane, 
              boxShadow: getRatingGlow(activeMemo.recommendation)
            }} 
            className="glass-panel"
          >
            {/* Viewer Header bar */}
            <div style={styles.viewerHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={styles.tickerBadge}>{activeMemo.ticker}</div>
                <div>
                  <h2 style={styles.viewerMemoTitle}>{activeMemo.title}</h2>
                  <p style={styles.viewerMeta}>Compiled: {new Date(activeMemo.timestamp).toLocaleString()}</p>
                </div>
              </div>

              {/* Utility actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing ? (
                  <button onClick={handleSave} className="btn btn-primary" style={{ padding: '8px 14px' }}>
                    <Save size={14} />
                    Save
                  </button>
                ) : (
                  <button onClick={handleStartEdit} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
                    <Edit3 size={14} />
                    Edit Memo
                  </button>
                )}
                <button onClick={handleCopy} className="btn btn-secondary" style={{ padding: '8px 14px' }}>
                  {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Sub-header Score summary */}
            <div style={styles.scoreSummaryBar}>
              <div style={styles.summaryMetric}>
                <span style={styles.metricLabel}>RECOMMENDATION</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  {activeMemo.recommendation}
                </span>
              </div>
              <div style={styles.summaryDivider} />
              
              <div style={styles.summaryMetric}>
                <span style={styles.metricLabel}>CONVICTION RATIO</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={16} color="#f59e0b" />
                  {activeMemo.convictionScore}/10
                </span>
              </div>
              <div style={styles.summaryDivider} />

              <div style={styles.summaryMetric}>
                <span style={styles.metricLabel}>SOURCE BASELINE</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  Hindsight Audit
                </span>
              </div>
            </div>

            {/* Document display / Editor */}
            <div style={styles.memoContentContainer}>
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  style={styles.editorTextarea}
                />
              ) : (
                <div style={styles.markdownContent}>
                  {activeMemo.fullMemo.split('\n\n').map((paragraph, index) => {
                    if (paragraph.startsWith('### ')) {
                      return <h3 key={index} style={styles.mdHeader3}>{paragraph.replace('### ', '')}</h3>;
                    }
                    if (paragraph.startsWith('1. ') || paragraph.startsWith('* ')) {
                      return (
                        <ul key={index} style={styles.mdList}>
                          {paragraph.split('\n').map((li, lIdx) => (
                            <li key={lIdx} style={styles.mdListItem}>
                              {/* Bold inline logic */}
                              {li.includes('**') ? (
                                <span>
                                  {li.replace(/^\d+\.\s+|^\*\s+/, '').split('**').map((part, pIdx) => 
                                    pIdx % 2 === 1 ? <strong key={pIdx} style={{ color: '#ffffff' }}>{part}</strong> : part
                                  )}
                                </span>
                              ) : (
                                li.replace(/^\d+\.\s+|^\*\s+/, '')
                              )}
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={index} style={styles.mdParagraph}>{paragraph}</p>;
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.emptyViewer} className="glass-panel">
            <AlertCircle size={32} color="#475569" style={{ marginBottom: '8px' }} />
            <p>Select a generated brief to view full investment intelligence documents.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  hubContainer: {
    display: 'flex',
    gap: '24px',
    alignItems: 'stretch',
    flexWrap: 'wrap' as const,
  },
  memoListPane: {
    flex: '1 1 300px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: '560px',
  },
  paneHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  listingsScroll: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    overflowY: 'auto' as const,
    flexGrow: 1,
  },
  listingItem: {
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    background: 'rgba(255, 255, 255, 0.01)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  listingItemActive: {
    background: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  listingMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  listingTicker: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#6366f1',
    letterSpacing: '0.05em',
  },
  recBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 6px',
  },
  listingTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#cbd5e1',
    lineHeight: '1.35',
  },
  listingTime: {
    fontSize: '0.72rem',
    color: '#64748b',
    marginTop: '6px',
    display: 'block',
  },
  emptyList: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#475569',
    fontSize: '0.85rem',
  },
  viewerPane: {
    flex: '2 1 450px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: '560px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  viewerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '16px',
    marginBottom: '16px',
  },
  tickerBadge: {
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '1rem',
    padding: '6px 12px',
    borderRadius: '6px',
  },
  viewerMemoTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  viewerMeta: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '2px',
  },
  scoreSummaryBar: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.25)',
    padding: '12px 18px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.02)',
  },
  summaryMetric: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
  },
  metricLabel: {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: '#64748b',
    letterSpacing: '0.05em',
  },
  summaryDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    margin: '0 20px',
  },
  memoContentContainer: {
    flexGrow: 1,
    overflowY: 'auto' as const,
    paddingRight: '6px',
  },
  editorTextarea: {
    width: '100%',
    height: '280px',
    background: 'rgba(2, 4, 8, 0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    lineHeight: '1.5',
    padding: '12px',
    outline: 'none',
    resize: 'none' as const,
  },
  markdownContent: {
    fontFamily: 'inherit',
    lineHeight: '1.55',
    color: '#cbd5e1',
  },
  mdHeader3: {
    fontSize: '1rem',
    fontWeight: 650,
    color: '#f8fafc',
    marginTop: '20px',
    marginBottom: '10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingBottom: '4px',
  },
  mdParagraph: {
    fontSize: '0.88rem',
    marginBottom: '14px',
  },
  mdList: {
    paddingLeft: '20px',
    marginBottom: '14px',
  },
  mdListItem: {
    fontSize: '0.88rem',
    marginBottom: '6px',
    listStyleType: 'square',
  },
  emptyViewer: {
    flex: '2 1 450px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    height: '400px',
    color: '#475569',
  }
};
