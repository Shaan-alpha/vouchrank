// Consistent "invitation to act" for empty tabs and sections. Matches the dark
// glass aesthetic; the icon picks up the tenant's --agency-primary. Callers pass
// a lucide icon, plain-spoken copy, and an optional action button. Drop it inside
// an existing card, or wrap it in a .glass-card when it stands alone.
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {Icon && (
        <div style={{ width: 48, height: 48, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--agency-primary)', marginBottom: 4 }}>
          <Icon style={{ width: 22 }} />
        </div>
      )}
      <h4 style={{ fontSize: 15, color: '#fff', margin: 0 }}>{title}</h4>
      {description && (
        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', maxWidth: 340, lineHeight: 1.6, margin: 0 }}>{description}</p>
      )}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
