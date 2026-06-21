import { useState } from 'react';
import { Sparkles, Search, CheckSquare, Info, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';

export default function AioDashboard({ company, auditData, onToggleChecklist, onRunAudit }) {
  const [auditing, setAuditing] = useState(false);

  const handleRun = async () => {
    if (!onRunAudit) return;
    setAuditing(true);
    try {
      await onRunAudit();
    } finally {
      setAuditing(false);
    }
  };

  if (!auditData) return null;

  // Calculate dynamic rating based on completed checklist items
  const totalItems = auditData.checklist.length;
  const completedItems = auditData.checklist.filter(item => item.checked).length;
  // Dynamic calculation to make it interactive: baseline score + bonus for checked items
  const baseScore = auditData.rating;
  const maxBonus = 100 - baseScore;
  const bonusPerItem = totalItems > 0 ? maxBonus / totalItems : 0;
  const displayRating = Math.round(baseScore + (completedItems * bonusPerItem));

  // Circle path mathematics
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayRating / 100) * circumference;

  return (
    <div className="dashboard-grid">
      {/* Left Column: Analytics & Queries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Gauge Box */}
        <div className="glass-card" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div className="gauge-circle" style={{ flexShrink: 0 }}>
            <svg className="gauge-svg">
              <defs>
                <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--agency-primary)" />
                  <stop offset="100%" stopColor="var(--agency-secondary)" />
                </linearGradient>
              </defs>
              <circle className="gauge-bg" cx="70" cy="70" r={radius} />
              <circle 
                className="gauge-fill" 
                cx="70" 
                cy="70" 
                r={radius} 
                style={{ 
                  strokeDasharray: circumference,
                  strokeDashoffset: offset 
                }} 
              />
            </svg>
            <div className="gauge-value">{displayRating}%</div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles style={{ color: 'var(--agency-primary)', width: '20px' }} />
                AI Search Visibility (AIO)
              </h3>
              <button
                className="btn-sm-action"
                onClick={handleRun}
                disabled={auditing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                id="btn-run-aio-audit"
              >
                <RefreshCw className={auditing ? 'spin' : ''} style={{ width: '13px' }} />
                {auditing ? 'Auditing…' : 'Run AI Audit'}
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
              This rating measures how frequently and favorably LLM search engines (Gemini, ChatGPT, Perplexity) recommend <strong>{company.name}</strong> for industry keywords.
            </p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <TrendingUp style={{ color: 'var(--success)', width: '16px' }} />
                <span style={{ color: 'var(--success)', fontWeight: '600' }}>+8% this month</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <Info style={{ width: '14px' }} />
                <span>Updated 2 hours ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Engine Queries Audit */}
        <div className="glass-card audit-section">
          <h2>
            <Search style={{ width: '20px', color: 'var(--agency-secondary)' }} />
            Simulated AI Query Audits
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            We query top conversational models weekly to track if your business is recommended and what sources are cited.
          </p>

          <div className="query-list">
            {auditData.queries.map((q) => (
              <div key={q.id} className="query-card">
                <div className="query-info">
                  <div className="query-text">"{q.query}"</div>
                  <div className="query-sources">Checked on: {q.sources}</div>
                </div>
                <div>
                  {q.recommended ? (
                    <span className="query-status status-highlighted">
                      Recommended #{q.rank}
                    </span>
                  ) : (
                    <span className="query-status status-missed" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle style={{ width: '12px' }} />
                      Not Recommended
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Optimization Checklist */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckSquare style={{ color: 'var(--agency-primary)', width: '18px' }} />
          AIO Action Items
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px' }}>
          Complete these optimization steps to boost your citations and help AI models recommend your business.
        </p>

        <div className="checklist-container">
          {auditData.checklist.map((item) => (
            <div key={item.id} className="checklist-item">
              <div 
                className={`check-box ${item.checked ? 'checked' : ''}`}
                onClick={() => onToggleChecklist(company.id, item.id)}
                id={`chk-${item.id}`}
              >
                {item.checked && (
                  <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="checklist-content">
                <span className="checklist-badge">{item.badge}</span>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
