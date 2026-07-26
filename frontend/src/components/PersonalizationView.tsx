import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, MapPin, Briefcase, TrendingUp, ShieldAlert, Phone, CheckCircle } from 'lucide-react';
import { saveUserProfile } from '../utils/api';

interface Props {
  profile: UserProfile | null;
  onProfileUpdate: (profile: UserProfile) => void;
}

const INDUSTRY_OPTIONS = [
  'Automotive', 'Aerospace', 'Technology', 'Healthcare',
  'Finance', 'Energy', 'Consumer Goods', 'Real Estate'
];
const MARKET_CAP_OPTIONS = ['Mega Cap', 'Large Cap', 'Mid Cap', 'Small Cap'];
const RISK_OPTIONS = ['Low', 'Moderate', 'High', 'Speculative'];
const STYLE_OPTIONS = ['Value', 'Growth', 'Dividend', 'Day Trader', 'Macro'];

export const PersonalizationView: React.FC<Props> = ({ profile, onProfileUpdate }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>(profile || {});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleArray = (field: 'preferredIndustries' | 'marketCapPreference', value: string) => {
    setFormData(prev => {
      const arr = prev[field] || [];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(i => i !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await saveUserProfile(formData);
      onProfileUpdate(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to update profile', e);
    }
    setIsSaving(false);
  };

  return (
    <div style={{ padding: '24px', animation: 'fade-in 0.4s ease-out', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.8rem', color: '#f8fafc', marginBottom: '8px' }}>Your Personal Bubble</h1>
      <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
        Adjust your isolated bubble settings. MarketMind AI tailors its research, memos, and dashboard exclusively to these parameters.
      </p>

      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Contact & Location */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><User size={18} color="#6366f1" /> Identity & Location</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={styles.inputGroup}>
              <label style={styles.label}><Phone size={14} /> Phone Number</label>
              <input 
                type="text" 
                style={styles.input} 
                value={formData.phoneNumber || ''}
                onChange={e => { setFormData({...formData, phoneNumber: e.target.value}); setSaveSuccess(false); }}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}><MapPin size={14} /> Location</label>
              <input 
                type="text" 
                style={styles.input} 
                value={formData.location || ''}
                onChange={e => { setFormData({...formData, location: e.target.value}); setSaveSuccess(false); }}
              />
            </div>
          </div>
        </div>

        {/* Interests */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><Briefcase size={18} color="#10b981" /> Industry & Market Focus</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>Preferred Industries</label>
            <div style={styles.chipGrid}>
              {INDUSTRY_OPTIONS.map(ind => (
                <button
                  key={ind}
                  style={{
                    ...styles.chip,
                    ...(formData.preferredIndustries?.includes(ind) ? styles.chipActive : {})
                  }}
                  onClick={() => toggleArray('preferredIndustries', ind)}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={styles.label}>Market Cap Preferences</label>
            <div style={styles.chipGrid}>
              {MARKET_CAP_OPTIONS.map(cap => (
                <button
                  key={cap}
                  style={{
                    ...styles.chip,
                    ...(formData.marketCapPreference?.includes(cap) ? styles.chipActive : {})
                  }}
                  onClick={() => toggleArray('marketCapPreference', cap)}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><ShieldAlert size={18} color="#f59e0b" /> Strategy & Risk</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>Investment Style</label>
            <div style={styles.chipGrid}>
              {STYLE_OPTIONS.map(style => (
                <button
                  key={style}
                  style={{
                    ...styles.chip,
                    ...(formData.investmentStyle === style ? styles.chipActive : {})
                  }}
                  onClick={() => { setFormData({...formData, investmentStyle: style}); setSaveSuccess(false); }}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={styles.label}>Risk Tolerance</label>
            <div style={styles.chipGrid}>
              {RISK_OPTIONS.map(risk => (
                <button
                  key={risk}
                  style={{
                    ...styles.chip,
                    ...(formData.riskTolerance === risk ? styles.chipActive : {})
                  }}
                  onClick={() => { setFormData({...formData, riskTolerance: risk}); setSaveSuccess(false); }}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
          {saveSuccess && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>
              <CheckCircle size={16} /> Bubble Updated
            </span>
          )}
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={isSaving}
            style={{ minWidth: '150px' }}
          >
            {isSaving ? 'Syncing...' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '1.2rem',
    color: '#f8fafc',
    margin: 0,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '12px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    color: '#cbd5e1',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px'
  },
  chip: {
    padding: '8px 16px',
    borderRadius: '20px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
    fontWeight: 500
  },
  chipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
    color: '#fff',
    boxShadow: '0 0 10px rgba(99, 102, 241, 0.2)'
  }
};
