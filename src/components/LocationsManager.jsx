import { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, X, Check, AlertTriangle, ArrowLeft } from 'lucide-react';

const BLANK = { name: '', category: '', domain: '' };

// Agency-level modal to manage the set of locations (client businesses).
// Pure presentational: all persistence happens via the callbacks from App.jsx.
export default function LocationsManager({
  companies,
  selectedId,
  maxLocations,
  onAdd,
  onUpdate,
  onDelete,
  onSelect,
  onClose,
}) {
  const [mode, setMode] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const atCap = companies.length >= maxLocations;

  const startAdd = () => {
    setForm(BLANK);
    setError('');
    setMode('add');
  };

  const startEdit = (c) => {
    setForm({ name: c.name || '', category: c.category || '', domain: c.domain || '' });
    setEditingId(c.id);
    setError('');
    setMode('edit');
  };

  const backToList = () => {
    setMode('list');
    setEditingId(null);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError('Business name is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (mode === 'add') {
        await onAdd({ name, category: form.category.trim() });
        onClose();
      } else {
        await onUpdate(editingId, {
          name,
          category: form.category.trim(),
          domain: form.domain.trim() || null,
        });
        backToList();
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (id) => {
    setBusy(true);
    setError('');
    try {
      await onDelete(id);
      setConfirmingDeleteId(null);
    } catch (err) {
      setError(err.message || 'Could not delete location.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="locations-modal-overlay" onClick={onClose}>
      <div className="harvester-card locations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="locations-modal-header">
          <h3 style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
            <Building2 style={{ width: 18 }} /> Manage locations
          </h3>
          <button className="locations-icon-btn" onClick={onClose} aria-label="Close" id="btn-close-locations">
            <X style={{ width: 18 }} />
          </button>
        </div>

        {mode === 'list' && (
          <>
            <div className="locations-list">
              {companies.map((c) => (
                <div className="location-row" key={c.id}>
                  {confirmingDeleteId === c.id ? (
                    <div className="location-confirm">
                      <span style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <AlertTriangle style={{ width: 14, color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
                        <span>
                          Delete <strong>{c.name}</strong>? This permanently removes its reviews,
                          audits, competitors, and campaigns. This can&apos;t be undone.
                        </span>
                      </span>
                      <div className="location-row-actions">
                        <button className="locations-icon-btn" onClick={() => setConfirmingDeleteId(null)} disabled={busy}>
                          Cancel
                        </button>
                        <button
                          className="locations-icon-btn locations-danger"
                          onClick={() => confirmDelete(c.id)}
                          disabled={busy}
                          id={`btn-confirm-delete-${c.id}`}
                        >
                          {busy ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="location-row-main"
                        onClick={() => {
                          onSelect(c.id);
                          onClose();
                        }}
                      >
                        <span className="location-name">
                          {c.name}
                          {c.id === selectedId && <span className="location-current-badge">Current</span>}
                        </span>
                        <span className="location-meta">{c.category || 'Local Business'}</span>
                      </button>
                      <div className="location-row-actions">
                        <button
                          className="locations-icon-btn"
                          onClick={() => startEdit(c)}
                          aria-label={`Edit ${c.name}`}
                          id={`btn-edit-location-${c.id}`}
                        >
                          <Pencil style={{ width: 15 }} />
                        </button>
                        <button
                          className="locations-icon-btn locations-danger"
                          onClick={() => setConfirmingDeleteId(c.id)}
                          aria-label={`Delete ${c.name}`}
                          id={`btn-delete-location-${c.id}`}
                        >
                          <Trash2 style={{ width: 15 }} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {error && <p className="locations-error">{error}</p>}

            <button
              className="btn-primary-action"
              style={{ width: '100%', marginTop: 12 }}
              onClick={startAdd}
              disabled={atCap}
              id="btn-add-location"
            >
              <Plus style={{ width: 16 }} />
              Add location
            </button>
            {atCap && (
              <p className="locations-hint">
                Plan limit reached ({companies.length}/{maxLocations}) — upgrade to add more.
              </p>
            )}
          </>
        )}

        {(mode === 'add' || mode === 'edit') && (
          <form onSubmit={submit}>
            <div className="input-field-group">
              <label>Business Name</label>
              <input
                className="input-control"
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Austin Dental Care"
                id="input-location-name"
              />
            </div>
            <div className="input-field-group">
              <label>Category</label>
              <input
                className="input-control"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Dentist / Healthcare"
                id="input-location-category"
              />
            </div>
            {mode === 'edit' && (
              <div className="input-field-group">
                <label>Domain</label>
                <input
                  className="input-control"
                  value={form.domain}
                  onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                  placeholder="austindental.com"
                  id="input-location-domain"
                />
              </div>
            )}

            {error && <p className="locations-error">{error}</p>}

            <div className="locations-form-actions">
              <button type="button" className="locations-icon-btn" onClick={backToList} disabled={busy}>
                <ArrowLeft style={{ width: 15 }} /> Cancel
              </button>
              <button type="submit" className="btn-primary-action" disabled={busy} id="btn-save-location">
                <Check style={{ width: 16 }} />
                {busy ? 'Saving…' : mode === 'add' ? 'Create location' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
