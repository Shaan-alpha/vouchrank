import { useState } from 'react';
import { LayoutGrid, Sliders, Code, Copy, Check, X, Star } from 'lucide-react';

export default function WidgetsDemo({ reviews, company }) {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [widgetLayout] = useState('grid'); // grid, slider
  const [widgetTheme, setWidgetTheme] = useState('dark'); // dark, light

  // Show the same set the real widget shows: public, non-rejected — any rating
  // (no score filter, per COMPLIANCE.md).
  const positiveReviews = reviews.filter((r) => r.isPublic !== false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const widgetApi = supabaseUrl
    ? `${supabaseUrl}/functions/v1/widget-reviews`
    : 'https://YOUR-PROJECT.supabase.co/functions/v1/widget-reviews';
  const scriptOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.vouchrank.com';

  const embedCodeSnippet = `<script src="${scriptOrigin}/widget.js" data-location="${company.id}" data-api="${widgetApi}" data-theme="${widgetTheme}" data-layout="${widgetLayout}" async></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="widgets-layout">
      {/* Settings Bar */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Embeddable Widgets Showcase</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            Preview how your reviews and video testimonials look embedded on {company.name}'s website.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Theme Selector */}
          <div className="filter-group">
            {['dark', 'light'].map((theme) => (
              <button
                key={theme}
                className={`filter-btn ${widgetTheme === theme ? 'active' : ''}`}
                onClick={() => setWidgetTheme(theme)}
                id={`btn-widget-theme-${theme}`}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)} Theme
              </button>
            ))}
          </div>

          <button className="widget-code-btn" onClick={() => setShowCodeModal(true)} id="btn-get-widget-code">
            <Code style={{ width: '16px' }} />
            Get Embed Code
          </button>
        </div>
      </div>

      {/* Widget Showcase Block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Layout 1: Horizontal Testimonial Slider */}
        <div className="widget-demo-box">
          <div className="widget-title-row">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders style={{ width: '18px', color: 'var(--agency-primary)' }} />
              Layout Option A: Review Carousel / Slider
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scroll horizontally</span>
          </div>

          <div 
            className="slider-widget-container"
            style={{ 
              background: widgetTheme === 'light' ? '#f9fafb' : '#0c0d12',
              borderRadius: '12px',
              padding: '24px 16px'
            }}
          >
            {positiveReviews.map((r) => (
              <div 
                key={r.id} 
                className="widget-card"
                style={{
                  background: widgetTheme === 'light' ? '#fff' : 'rgba(17, 18, 27, 0.9)',
                  borderColor: widgetTheme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.06)',
                  color: widgetTheme === 'light' ? '#374151' : 'var(--text-primary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="reviewer-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                      {r.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: widgetTheme === 'light' ? '#111827' : '#fff' }}>
                        {r.author}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Verified Customer</div>
                    </div>
                  </div>
                  <div className="review-stars">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star 
                        key={idx} 
                        style={{ 
                          width: '11px', 
                          height: '11px', 
                          fill: idx < r.rating ? '#fbbf24' : 'transparent',
                          color: idx < r.rating ? '#fbbf24' : 'var(--text-muted)'
                        }} 
                      />
                    ))}
                  </div>
                </div>
                
                <p style={{ fontSize: '12px', lineHeight: '1.5', margin: '4px 0', fontStyle: 'italic' }}>
                  "{r.text}"
                </p>

                {r.source === 'Video' && (
                  <span style={{ fontSize: '10px', color: 'var(--agency-secondary)', background: 'rgba(6, 182, 212, 0.08)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                    🎥 Video Testimonial Attached
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Layout 2: Responsive Grid */}
        <div className="widget-demo-box">
          <div className="widget-title-row">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LayoutGrid style={{ width: '18px', color: 'var(--agency-secondary)' }} />
              Layout Option B: Masonry Responsive Grid
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Best for homepages</span>
          </div>

          <div 
            className="grid-widget-container"
            style={{ 
              background: widgetTheme === 'light' ? '#f9fafb' : '#0c0d12',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            {positiveReviews.map((r) => (
              <div 
                key={r.id} 
                className="widget-card"
                style={{
                  width: '100%',
                  minWidth: 'auto',
                  background: widgetTheme === 'light' ? '#fff' : 'rgba(17, 18, 27, 0.9)',
                  borderColor: widgetTheme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.06)',
                  color: widgetTheme === 'light' ? '#374151' : 'var(--text-primary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="reviewer-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                      {r.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: widgetTheme === 'light' ? '#111827' : '#fff' }}>
                        {r.author}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{r.date}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: '600', padding: '2px 6px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    {r.source}
                  </span>
                </div>

                <div className="review-stars" style={{ marginBottom: '6px' }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star 
                      key={idx} 
                      style={{ 
                        width: '11px', 
                        height: '11px', 
                        fill: idx < r.rating ? '#fbbf24' : 'transparent',
                        color: idx < r.rating ? '#fbbf24' : 'var(--text-muted)'
                      }} 
                    />
                  ))}
                </div>

                <p style={{ fontSize: '12px', lineHeight: '1.5' }}>
                  "{r.text}"
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Code Copying Modal Overlay */}
      {showCodeModal && (
        <div className="code-panel-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="code-panel-container" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code style={{ color: 'var(--agency-primary)', width: '18px' }} />
                Get Embed Code
              </h3>
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setShowCodeModal(false)}
                id="btn-close-code-modal"
              >
                <X style={{ width: '18px' }} />
              </button>
            </div>
            
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Copy the script below and paste it before the closing <code>&lt;/body&gt;</code> tag on {company.name}'s website to render the widgets.
            </p>

            <div className="code-block-view" id="code-snippet-view">
              {embedCodeSnippet}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-sm-action" onClick={() => setShowCodeModal(false)}>Close</button>
              <button 
                className="btn-primary-action" 
                style={{ fontSize: '12px', padding: '8px 16px' }}
                onClick={handleCopyCode}
                id="btn-copy-code-to-clipboard"
              >
                {copied ? (
                  <>
                    <Check style={{ width: '14px' }} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy style={{ width: '14px' }} />
                    Copy Code
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
