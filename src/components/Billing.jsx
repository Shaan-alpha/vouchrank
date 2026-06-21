import { useState, useEffect } from 'react';
import { CreditCard, Check, Zap, Crown } from 'lucide-react';
import * as api from '../lib/api';

const PLANS = [
  {
    id: 'agency',
    name: 'White-Label Agency',
    price: '$299',
    icon: Zap,
    features: [
      'Custom branding & domain',
      'Up to 15 business sub-accounts',
      'Review harvester + funnel',
      'Social graphics generator',
      'Embeddable widgets',
    ],
  },
  {
    id: 'agency_pro',
    name: 'Agency Pro',
    price: '$499',
    icon: Crown,
    highlight: true,
    features: [
      'Everything in Agency',
      'Unlimited sub-accounts',
      'AI-search (AIO) auditing',
      'Video review storage',
      'Priority support',
    ],
  },
];

export default function Billing() {
  const [agency, setAgency] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.getAgency().then(setAgency).catch(() => {});
  }, []);

  const handleSelect = async (planId) => {
    setBusyPlan(planId);
    setNotice('');
    try {
      const res = await api.createCheckout(planId);
      if (res?.demo) setNotice(res.message);
    } catch (e) {
      setNotice(e.message || 'Could not start checkout.');
    } finally {
      setBusyPlan(null);
    }
  };

  const currentPlan = agency?.plan;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="glass-card">
        <h3 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard style={{ color: 'var(--agency-primary)', width: 18 }} />
          Subscription &amp; Billing
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 6 }}>
          Current plan:{' '}
          <strong style={{ color: '#fff', textTransform: 'capitalize' }}>
            {currentPlan ? currentPlan.replace('_', ' ') : '—'}
          </strong>{' '}
          {agency?.plan_status && <span>({agency.plan_status})</span>}
          {api.demoMode && <span style={{ color: 'var(--text-muted)' }}> — demo mode</span>}
        </p>
        {notice && (
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--agency-secondary)' }}>{notice}</p>
        )}
      </div>

      <div className="dashboard-grid">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className="glass-card"
              style={{ border: plan.highlight ? '1px solid var(--agency-primary)' : undefined }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div className="stat-icon" style={{ width: 36, height: 36 }}>
                  <Icon style={{ width: 18 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16 }}>{plan.name}</h3>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>
                    {plan.price}
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span>
                  </div>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <Check style={{ width: 14, color: 'var(--success)', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className="btn-primary-action"
                style={{ width: '100%', opacity: isCurrent ? 0.6 : 1 }}
                disabled={isCurrent || busyPlan === plan.id}
                onClick={() => handleSelect(plan.id)}
                id={`btn-select-plan-${plan.id}`}
              >
                {isCurrent ? 'Current Plan' : busyPlan === plan.id ? 'Starting…' : `Choose ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
