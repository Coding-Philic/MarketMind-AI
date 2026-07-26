import React, { useState } from 'react';
import { UserProfile } from '../types';
import { User, MapPin, Briefcase, TrendingUp, ShieldAlert, Phone } from 'lucide-react';

interface Props {
  onComplete: (profile: Partial<UserProfile>) => void;
}

const INDUSTRY_OPTIONS = [
  'Automotive', 'Aerospace', 'Technology', 'Healthcare',
  'Finance', 'Energy', 'Consumer Goods', 'Real Estate'
];

const MARKET_CAP_OPTIONS = ['Mega Cap', 'Large Cap', 'Mid Cap', 'Small Cap'];
const RISK_OPTIONS = ['Low', 'Moderate', 'High', 'Speculative'];
const STYLE_OPTIONS = ['Value', 'Growth', 'Dividend', 'Day Trader', 'Macro'];

export const OnboardingWizard: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    preferredIndustries: [],
    marketCapPreference: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleArray = (field: 'preferredIndustries' | 'marketCapPreference', value: string) => {
    setProfile(prev => {
      const arr = prev[field] || [];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(i => i !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onComplete(profile);
    setIsSubmitting(false);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal} className="glass-panel">
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.stepIndicator}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                ...styles.dot,
                backgroundColor: step >= i ? '#6366f1' : 'rgba(255,255,255,0.1)'
              }} />
            ))}
          </div>
          <h2 style={{ margin: '16px 0 8px 0', fontSize: '1.5rem', color: '#f1f5f9' }}>
            {step === 1 ? 'Build Your Isolated Bubble' : step === 2 ? 'Define Your Interests' : 'Investment Strategy'}
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
            {step === 1 ? 'MarketMind AI personalizes your entire experience based on your specific profile.' : 
             step === 2 ? 'We will prioritize news, events, and AI memos matching these industries.' :
             'How do you want the AI to analyze companies for you?'}
          </p>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}><Phone size={14} /> Phone Number</label>
              <input 
                type="text" 
                style={styles.input} 
                placeholder="+1 (555) 000-0000"
                value={profile.phoneNumber || ''}
                onChange={e => setProfile({...profile, phoneNumber: e.target.value})}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}><MapPin size={14} /> Location</label>
              <input 
                type="text" 
                style={styles.input} 
                placeholder="City, Country"
                value={profile.location || ''}
                onChange={e => setProfile({...profile, location: e.target.value})}
              />
            </div>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div style={styles.selectionSection}>
            <label style={styles.label}><Briefcase size={14} /> Preferred Industries</label>
            <div style={styles.chipGrid}>
              {INDUSTRY_OPTIONS.map(ind => (
                <button
                  key={ind}
                  style={{
                    ...styles.chip,
                    ...(profile.preferredIndustries?.includes(ind) ? styles.chipActive : {})
                  }}
                  onClick={() => toggleArray('preferredIndustries', ind)}
                >
                  {ind}
                </button>
              ))}
            </div>

            <label style={{...styles.label, marginTop: 24}}><TrendingUp size={14} /> Market Cap Preference</label>
            <div style={styles.chipGrid}>
              {MARKET_CAP_OPTIONS.map(cap => (
                <button
                  key={cap}
                  style={{
                    ...styles.chip,
                    ...(profile.marketCapPreference?.includes(cap) ? styles.chipActive : {})
                  }}
                  onClick={() => toggleArray('marketCapPreference', cap)}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Strategy */}
        {step === 3 && (
          <div style={styles.selectionSection}>
            <label style={styles.label}><User size={14} /> Investment Style</label>
            <div style={styles.chipGrid}>
              {STYLE_OPTIONS.map(style => (
                <button
                  key={style}
                  style={{
                    ...styles.chip,
                    ...(profile.investmentStyle === style ? styles.chipActive : {})
                  }}
                  onClick={() => setProfile({...profile, investmentStyle: style})}
                >
                  {style}
                </button>
              ))}
            </div>

            <label style={{...styles.label, marginTop: 24}}><ShieldAlert size={14} /> Risk Tolerance</label>
            <div style={styles.chipGrid}>
              {RISK_OPTIONS.map(risk => (
                <button
                  key={risk}
                  style={{
                    ...styles.chip,
                    ...(profile.riskTolerance === risk ? styles.chipActive : {})
                  }}
                  onClick={() => setProfile({...profile, riskTolerance: risk})}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={styles.footer}>
          {step > 1 ? (
            <button style={styles.btnSecondary} onClick={handleBack} disabled={isSubmitting}>Back</button>
          ) : <div />}
          
          {step < 3 ? (
            <button className="btn btn-primary" onClick={handleNext}>Next Step</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Enter My Bubble'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modal: {
    width: '100%',
    maxWidth: '550px',
    padding: '32px',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    border: '1px solid rgba(99, 102, 241, 0.2)'
  },
  header: {
    textAlign: 'center',
    marginBottom: 8
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8
  },
  dot: {
    width: 32,
    height: 4,
    borderRadius: 2,
    transition: 'background-color 0.3s'
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
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
  selectionSection: {
    display: 'flex',
    flexDirection: 'column'
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
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
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 24,
    borderTop: '1px solid rgba(255,255,255,0.05)'
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '10px 20px',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s'
  }
};
