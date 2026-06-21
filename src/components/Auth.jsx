import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Email/password auth. Signup also creates an agency + owner membership via the
// `handle_new_user` trigger (see migration 0001). Only rendered when Supabase
// is configured; demo mode bypasses auth entirely.
export default function Auth() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [agencyName, setAgencyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { agency_name: agencyName || 'My Agency' } },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#030408' }}>
      <div className="harvester-card" style={{ maxWidth: 380, width: '90%' }}>
        <div className="harvester-logo-container" style={{ marginBottom: 8 }}>
          <div className="logo-icon" style={{ width: 40, height: 40, fontSize: 20 }}>V</div>
          <h2 style={{ fontSize: 20, color: '#fff' }}>VouchRank</h2>
        </div>

        {sent ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 13 }}>
            Check your email to confirm your account, then sign in.
          </p>
        ) : (
          <form onSubmit={submit}>
            <div className="harvester-step-header">
              <h3 style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles style={{ width: 16 }} /> {mode === 'signup' ? 'Create your agency' : 'Welcome back'}
              </h3>
            </div>

            {mode === 'signup' && (
              <div className="input-field-group">
                <label>Agency Name</label>
                <input className="input-control" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Acme Marketing" />
              </div>
            )}
            <div className="input-field-group">
              <label>Email</label>
              <input type="email" required className="input-control" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@agency.com" />
            </div>
            <div className="input-field-group">
              <label>Password</label>
              <input type="password" required minLength={8} className="input-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 12, margin: '4px 0' }}>{error}</p>}

            <button type="submit" className="btn-primary-action" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>

            <button type="button" className="btn-sm-action" style={{ width: '100%', marginTop: 12 }} onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
              {mode === 'signup' ? 'Have an account? Sign in' : 'New here? Create an agency'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
