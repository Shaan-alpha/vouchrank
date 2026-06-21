import { useState, useRef } from 'react';
import { Download, Image, Star } from 'lucide-react';

const GRADIENTS = [
  { id: 'indigo-glow', name: 'Indigo Glow', class: 'bg-gradient-1', colors: ['#1e1b4b', '#311042'] },
  { id: 'forest-emerald', name: 'Forest Emerald', class: 'bg-gradient-2', colors: ['#022c22', '#064e3b'] },
  { id: 'deep-space', name: 'Deep Space', class: 'bg-gradient-3', colors: ['#180029', '#001329'] },
  { id: 'sunset-crimson', name: 'Sunset Crimson', class: 'bg-gradient-4', colors: ['#450a0a', '#1c0000'] },
  { id: 'midnight-charcoal', name: 'Midnight Charcoal', class: 'bg-gradient-5', colors: ['#111827', '#1f2937'] }
];

export default function SocialGenerator({ reviews, company }) {
  // Only allow 4 and 5 star reviews
  const positiveReviews = reviews.filter(r => r.rating >= 4);

  const [selectedReview, setSelectedReview] = useState(positiveReviews[0] || null);
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [fontSize, setFontSize] = useState('medium'); // small, medium, large
  const [showWatermark, setShowWatermark] = useState(true);

  // Ref to canvas
  const canvasRef = useRef(null);

  const handleDownload = () => {
    if (!selectedReview) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = 800; // High resolution square
    canvas.width = size;
    canvas.height = size;

    // 1. Draw Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, selectedGradient.colors[0]);
    gradient.addColorStop(1, selectedGradient.colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // 2. Draw Decorative Glowing Radial Orbs
    const radGrd = ctx.createRadialGradient(size*0.8, size*0.2, 50, size*0.8, size*0.2, 400);
    radGrd.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
    radGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrd;
    ctx.fillRect(0, 0, size, size);

    // 3. Draw Watermark Quote Mark in background
    ctx.font = '800 240px Outfit, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillText('“', 50, 240);

    // 4. Draw Stars
    const starCount = selectedReview.rating;
    ctx.fillStyle = '#fbbf24'; // Gold
    const starSize = 24;
    const startX = 64;
    const startY = 120;
    
    // Draw 5 stars (gold or grey based on review rating)
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < starCount ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)';
      
      // Simple custom star path drawing
      const cx = startX + i * 36;
      const cy = startY;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        ctx.lineTo(
          cx + Math.cos(((18 + 72 * j) * Math.PI) / 180) * starSize,
          cy - Math.sin(((18 + 72 * j) * Math.PI) / 180) * starSize
        );
        ctx.lineTo(
          cx + Math.cos(((54 + 72 * j) * Math.PI) / 180) * (starSize / 2),
          cy - Math.sin(((54 + 72 * j) * Math.PI) / 180) * (starSize / 2)
        );
      }
      ctx.closePath();
      ctx.fill();
    }

    // 5. Draw Review Text (Wrapped)
    ctx.fillStyle = '#ffffff';
    let fontSetting = '300 28px Inter, Arial, sans-serif';
    let lineHeight = 44;
    if (fontSize === 'small') {
      fontSetting = '300 22px Inter, Arial, sans-serif';
      lineHeight = 36;
    } else if (fontSize === 'large') {
      fontSetting = '300 36px Inter, Arial, sans-serif';
      lineHeight = 54;
    }
    ctx.font = fontSetting;

    const maxTextWidth = size - 128;
    const textX = 64;
    const textY = 220;
    const text = `"${selectedReview.text}"`;

    // Wrapping text helper
    const words = text.split(' ');
    let line = '';
    let currentY = textY;
    const lines = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxTextWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Render lines (cap at 8 lines to prevent overflow)
    const renderLines = lines.slice(0, 8);
    renderLines.forEach((l, index) => {
      ctx.fillText(l, textX, currentY + index * lineHeight);
    });

    // 6. Draw Divider Line
    const dividerY = size - 180;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(64, dividerY);
    ctx.lineTo(size - 64, dividerY);
    ctx.stroke();

    // 7. Draw Author Meta Info
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px Outfit, Arial, sans-serif';
    ctx.fillText(selectedReview.author, 64, size - 120);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '400 16px Inter, Arial, sans-serif';
    ctx.fillText(`Verified Review • ${selectedReview.source}`, 64, size - 88);

    // 8. Draw Branding Watermark at bottom right
    if (showWatermark) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '800 18px Outfit, Arial, sans-serif';
      ctx.fillText(company.name.toUpperCase(), size - ctx.measureText(company.name.toUpperCase()).width - 64, size - 110);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '500 12px Inter, Arial, sans-serif';
      const watermarkTag = 'REVIEWS POWERED BY VOUCHRANK';
      ctx.fillText(watermarkTag, size - ctx.measureText(watermarkTag).width - 64, size - 88);
    }

    // 9. Execute Download Trigger
    const imageURI = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `vouchrank-${company.id}-social.png`;
    link.href = imageURI;
    link.click();
  };

  return (
    <div className="editor-layout">
      {/* Canvas Graphic Preview Column */}
      <div className="canvas-preview-wrapper">
        <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)', alignSelf: 'flex-start' }}>
          Live Image Preview
        </h3>
        
        {selectedReview ? (
          <div 
            className={`social-card-canvas ${selectedGradient.class}`}
            id="social-card-render-preview"
          >
            <div className="social-card-quotes">“</div>
            <div className="social-card-content" style={{ 
              fontSize: fontSize === 'small' ? '13px' : fontSize === 'large' ? '18px' : '15px',
              lineHeight: fontSize === 'small' ? '1.5' : fontSize === 'large' ? '1.9' : '1.7',
            }}>
              "{selectedReview.text}"
            </div>
            
            <div className="social-card-author">
              <div className="social-card-author-meta">
                <div className="review-stars" style={{ marginBottom: '4px' }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star 
                      key={idx} 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        fill: idx < selectedReview.rating ? '#fbbf24' : 'transparent',
                        color: idx < selectedReview.rating ? '#fbbf24' : 'transparent'
                      }} 
                    />
                  ))}
                </div>
                <h4>{selectedReview.author}</h4>
                <span>Verified Customer • {selectedReview.source}</span>
              </div>
              
              {showWatermark && (
                <div style={{ textAlign: 'right' }}>
                  <div className="social-card-logo">{company.logoText}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px', fontWeight: 'bold' }}>
                    VOUCHRANK
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="social-card-canvas bg-gradient-5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>No positive reviews collected yet.</span>
          </div>
        )}

        {/* Hidden high-res compiler canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

        <button 
          className="btn-primary-action" 
          onClick={handleDownload} 
          disabled={!selectedReview}
          style={{ width: '100%', maxWidth: '440px' }}
          id="btn-download-social-image"
        >
          <Download style={{ width: '18px' }} />
          Download High-Res PNG
        </button>
      </div>

      {/* Control Panel Settings Column */}
      <div className="editor-controls">
        <div className="glass-card">
          <h3 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image style={{ color: 'var(--agency-primary)', width: '18px' }} />
            Graphic Designer Panel
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '24px' }}>
            Select a positive review, customize the card themes and fonts, and download as an image to share instantly.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Review Selector */}
            <div className="control-group">
              <label className="control-label">Select Review to Feature</label>
              {positiveReviews.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No 4 or 5 star reviews available.</div>
              ) : (
                <select 
                  className="input-control" 
                  value={selectedReview?.id || ''} 
                  onChange={(e) => setSelectedReview(positiveReviews.find(r => r.id === e.target.value))}
                  id="select-featured-review"
                >
                  {positiveReviews.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.author} ({r.rating}★) - "{r.text.substring(0, 45)}..."
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Gradient Theme Selector */}
            <div className="control-group">
              <label className="control-label">Background Gradient</label>
              <div className="gradient-selector">
                {GRADIENTS.map((g) => (
                  <div 
                    key={g.id}
                    className={`gradient-dot ${g.class} ${selectedGradient.id === g.id ? 'active' : ''}`}
                    onClick={() => setSelectedGradient(g)}
                    title={g.name}
                    id={`dot-grad-${g.id}`}
                  />
                ))}
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="control-group">
              <label className="control-label">Text Font Size</label>
              <div className="font-size-buttons">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    className={`font-btn ${fontSize === size ? 'active' : ''}`}
                    onClick={() => setFontSize(size)}
                    id={`btn-font-${size}`}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Watermark */}
            <div className="checklist-container" style={{ gap: '10px' }}>
              <div 
                className="checklist-item" 
                style={{ background: 'transparent', padding: 0, border: 'none', cursor: 'pointer', gap: '10px', alignItems: 'center' }}
                onClick={() => setShowWatermark(!showWatermark)}
                id="toggle-watermark-checkbox"
              >
                <div className={`check-box ${showWatermark ? 'checked' : ''}`} style={{ marginTop: 0 }}>
                  {showWatermark && (
                    <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                  Show White-Label Branding / Watermark
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
