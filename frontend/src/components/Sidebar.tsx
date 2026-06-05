import React from 'react';
import { 
  Brain, 
  LayoutDashboard, 
  Network, 
  History, 
  TrendingUp, 
  FileText, 
  HelpCircle,
  Cpu
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  memoCount: number;
  ledgerCount: number;
  isLiveAi: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  memoCount, 
  ledgerCount,
  isLiveAi
}) => {
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'network', name: 'Memory Network', icon: Network },
    { id: 'ledger', name: 'Hindsight Ledger', icon: History, count: ledgerCount },
    { id: 'evolution', name: 'Company Evolution', icon: TrendingUp },
    { id: 'intel', name: 'Intel Memos', icon: FileText, count: memoCount }
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Brand logo */}
      <div style={styles.brandContainer}>
        <div style={styles.logoWrapper}>
          <Brain size={24} color="#6366f1" />
        </div>
        <span style={styles.brandName}>MarketMind AI</span>
      </div>

      {/* Navigation tabs */}
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                console.log('[UI] Button action: Open tab', { tab: item.name, id: item.id });
                setActiveTab(item.id);
              }}
              style={{
                ...styles.navBtn,
                ...(isActive ? styles.navBtnActive : {})
              }}
              className={isActive ? '' : 'glass-panel-interactive'}
            >
              <Icon 
                size={18} 
                color={isActive ? '#ffffff' : '#94a3b8'} 
                style={{ marginRight: 12 }} 
              />
              <span style={isActive ? styles.btnTextActive : styles.btnText}>{item.name}</span>
              {item.count !== undefined && item.count > 0 && (
                <span style={{
                  ...styles.badge,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.15)',
                  color: isActive ? '#ffffff' : '#6366f1'
                }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* API Key Connection Status */}
      <div style={styles.apiCard} className="glass-panel">
        <div style={styles.apiHeader}>
          <Cpu size={14} color={isLiveAi ? '#10b981' : '#f59e0b'} />
          <span style={{ 
            fontSize: '0.72rem', 
            fontWeight: 700, 
            color: isLiveAi ? '#10b981' : '#f59e0b',
            textTransform: 'uppercase',
            letterSpacing: '0.02em'
          }}>
            {isLiveAi ? 'Live Gemini Model' : 'Simulator Fallback'}
          </span>
        </div>
        <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', lineHeight: '1.3' }}>
          {isLiveAi 
            ? 'Key configured in server .env. Executing real-time AI agents.' 
            : 'No .env key found. Simulating rule-based fallback cycles.'
          }
        </p>
      </div>

      {/* Footer metadata */}
      <div style={styles.footer}>
        <div style={styles.footerCard} className="glass-panel">
          <HelpCircle size={14} color="#94a3b8" style={{ marginRight: 6 }} />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Memory-First AI</span>
        </div>
        <p style={styles.version}>v1.2.0 (Active)</p>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '260px',
    height: '100vh',
    position: 'fixed' as const,
    left: 0,
    top: 0,
    background: 'rgba(10, 13, 26, 0.95)',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '24px 16px',
    zIndex: 100,
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    paddingLeft: '8px',
  },
  logoWrapper: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'rgba(99, 102, 241, 0.12)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)',
  },
  brandName: {
    fontSize: '1.25rem',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #ffffff 50%, #94a3b8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.02em',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    flexGrow: 1,
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'all 0.25s ease',
  },
  navBtnActive: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
  },
  btnText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    fontWeight: 500,
    flexGrow: 1,
  },
  btnTextActive: {
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: 600,
    flexGrow: 1,
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.7rem',
    fontWeight: 600,
  },
  apiCard: {
    padding: '12px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.04)'
  },
  apiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  footer: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  footerCard: {
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
  },
  version: {
    fontSize: '0.7rem',
    color: '#475569',
    textAlign: 'center' as const,
    fontFamily: 'monospace',
  }
};
