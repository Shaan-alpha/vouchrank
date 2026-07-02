import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';

// Custom location switcher — replaces a native <select> so the open menu can be
// padded and themed (native <option> padding isn't stylable cross-browser).
// Closes on outside-click, Escape, or picking an option.
export default function TenantSelector({ companies, selectedId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = companies.find((c) => c.id === selectedId);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id) => { onChange(id); setOpen(false); };

  return (
    <div className="tenant-select" ref={ref}>
      <button
        type="button"
        className="tenant-select-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        id="select-tenant-location"
      >
        <Building2 className="tenant-select-icon" />
        <span className="tenant-select-value">{selected?.name ?? 'Select location'}</span>
        <ChevronDown className={`tenant-select-caret${open ? ' open' : ''}`} />
      </button>
      {open && (
        <ul className="tenant-select-menu" role="listbox">
          {companies.map((c) => (
            <li key={c.id} role="option" aria-selected={c.id === selectedId}>
              <button
                type="button"
                className={`tenant-select-option${c.id === selectedId ? ' active' : ''}`}
                onClick={() => pick(c.id)}
              >
                <span className="tenant-select-option-name">{c.name}</span>
                {c.id === selectedId && <Check className="tenant-select-check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
