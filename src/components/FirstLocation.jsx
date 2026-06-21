import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';

// Shown in live mode when the signed-in agency has no locations yet.
export default function FirstLocation({ onCreate }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onCreate({ name, category });
    } catch (err) {
      setError(err.message || 'Could not create location.');
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#030408' }}>
      <div className="harvester-card" style={{ maxWidth: 420, width: '90%' }}>
        <div className="harvester-step-header">
          <h3 style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Building2 style={{ width: 18 }} /> Add your first location
          </h3>
          <p>Create the first business you'll manage. You can add more later.</p>
        </div>

        <form onSubmit={submit}>
          <div className="input-field-group">
            <label>Business Name</label>
            <input className="input-control" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Austin Dental Care" />
          </div>
          <div className="input-field-group">
            <label>Category</label>
            <input className="input-control" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Dentist / Healthcare" />
          </div>

          {error && <p style={{ color: '#f87171', fontSize: 12 }}>{error}</p>}

          <button type="submit" className="btn-primary-action" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
            <Plus style={{ width: 16 }} />
            {busy ? 'Creating…' : 'Create location'}
          </button>
        </form>
      </div>
    </div>
  );
}
