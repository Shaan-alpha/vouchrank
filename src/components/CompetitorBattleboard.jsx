import { Target, TrendingUp, Sparkles, Check } from 'lucide-react';

export default function CompetitorBattleboard({ company, competitors }) {
  if (!competitors) return null;

  // Add the current company to the head-to-head list for comparison
  const battleList = [
    {
      name: `${company.name} (You)`,
      rating: company.googleRating,
      reviewCount: company.googleCount,
      videoCount: company.videoCount,
      aioScore: company.aioVisibility,
      replyRate: 85, // Mock value
      isCurrent: true
    },
    ...competitors
  ].sort((a, b) => b.aioScore - a.aioScore); // Sort by AIO score

  // SVG Chart parameters
  const chartHeight = 150;
  const chartWidth = 500;
  const padding = 30;

  // Render SVG Line charts representing growth trends
  const renderLines = () => {
    // Collect the 4 items (company + 3 competitors)
    const items = [
      {
        name: company.name,
        history: [110, 118, 126, 134, company.googleCount],
        color: 'var(--agency-primary)'
      },
      ...competitors.map((c, idx) => ({
        name: c.name,
        history: c.history,
        color: idx === 0 ? 'var(--agency-secondary)' : idx === 1 ? '#e11d48' : '#eab308'
      }))
    ];

    // Find min and max for scaling
    const allVals = items.flatMap(i => i.history);
    const maxVal = Math.max(...allVals) + 20;
    const minVal = Math.min(...allVals) - 10;
    const range = maxVal - minVal;

    return items.map((item) => {
      // Calculate coordinates
      const points = item.history.map((val, step) => {
        const x = padding + (step * (chartWidth - padding * 2)) / 4;
        const y = chartHeight - padding - ((val - minVal) * (chartHeight - padding * 2)) / range;
        return { x, y, val };
      });

      // Construct SVG path string
      const pathD = points.reduce((acc, p, i) => {
        return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
      }, '');

      return (
        <g key={item.name}>
          {/* Neon Glow underlay line */}
          <path 
            d={pathD} 
            fill="none" 
            stroke={item.color} 
            strokeWidth="5" 
            opacity="0.15"
            style={{ filter: 'blur(3px)' }}
          />
          {/* Main line */}
          <path 
            d={pathD} 
            fill="none" 
            stroke={item.color} 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />
          {/* Data dot nodes */}
          {points.map((p, i) => (
            <g key={i}>
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="4.5" 
                fill={item.color} 
                stroke="#090a0f" 
                strokeWidth="1.5"
                style={{ cursor: 'pointer' }}
              />
              {/* Show value on final point */}
              {i === points.length - 1 && (
                <text 
                  x={p.x + 8} 
                  y={p.y + 4} 
                  fill="#fff" 
                  fontSize="10" 
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {p.val}
                </text>
              )}
            </g>
          ))}
        </g>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Head to Head Table */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target style={{ color: 'var(--agency-primary)', width: '18px' }} />
          Local SEO Battleboard
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px' }}>
          Head-to-head comparison in your local geographical sector. Keep visibility scores high to win AI recommendations.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="battleboard-table">
            <thead>
              <tr>
                <th>Business Location</th>
                <th>AIO Visibility</th>
                <th>Google Rating</th>
                <th>Review Volume</th>
                <th>Video Reviews</th>
                <th>Reply Rate</th>
              </tr>
            </thead>
            <tbody>
              {battleList.map((b) => (
                <tr key={b.name} className={b.isCurrent ? 'competitor-row-current' : ''}>
                  <td style={{ fontWeight: '600', color: b.isCurrent ? '#fff' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {b.name}
                    {b.isCurrent && (
                      <span style={{ fontSize: '9px', fontWeight: '800', background: 'var(--agency-primary)', color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="competitor-stat-bar-container">
                      <span className="competitor-stat-bar-label" style={{ color: b.isCurrent ? 'var(--agency-secondary)' : '#fff' }}>
                        {b.aioScore}%
                      </span>
                      <div className="competitor-stat-bar-bg" style={{ width: '80px' }}>
                        <div 
                          className="competitor-stat-bar-fill" 
                          style={{ 
                            width: `${b.aioScore}%`,
                            background: b.isCurrent 
                              ? 'linear-gradient(to right, var(--agency-primary), var(--agency-secondary))' 
                              : 'rgba(255,255,255,0.2)' 
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                      <span style={{ color: '#fbbf24' }}>★</span> {(b.rating ?? 0).toFixed(1)}
                    </div>
                  </td>
                  <td style={{ fontWeight: '500' }}>{b.reviewCount} reviews</td>
                  <td style={{ fontWeight: '500', color: b.videoCount > 10 ? 'var(--agency-secondary)' : 'var(--text-secondary)' }}>
                    📹 {b.videoCount} clips
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{b.replyRate}%</span>
                      {b.replyRate >= 80 ? (
                        <span style={{ color: 'var(--success)', fontSize: '10px' }}>● High</span>
                      ) : (
                        <span style={{ color: 'var(--warning)', fontSize: '10px' }}>● Slow</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SVG Growth chart & Insights */}
      <div className="dashboard-grid">
        {/* SVG Velocity Chart */}
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp style={{ color: 'var(--agency-secondary)', width: '18px' }} />
            Monthly Review Velocity
          </h3>

          <div style={{ position: 'relative', height: `${chartHeight}px`, width: '100%', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '100%' }}>
              {/* Grid guide lines */}
              <line x1={padding} y1={padding} x2={chartWidth-padding} y2={padding} stroke="rgba(255,255,255,0.02)" strokeDasharray="3" />
              <line x1={padding} y1={chartHeight/2} x2={chartWidth-padding} y2={chartHeight/2} stroke="rgba(255,255,255,0.02)" strokeDasharray="3" />
              
              {renderLines()}
            </svg>
          </div>

          {/* Chart Legend */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
              <span style={{ width: '10px', height: '10px', background: 'var(--agency-primary)', borderRadius: '50%' }}></span>
              <span>{company.name} (You)</span>
            </div>
            {competitors.map((c, i) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <span style={{ 
                  width: '10px', 
                  height: '10px', 
                  background: i === 0 ? 'var(--agency-secondary)' : i === 1 ? '#e11d48' : '#eab308', 
                  borderRadius: '50%' 
                }}></span>
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Local Rank Audits Insights */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles style={{ color: 'var(--agency-primary)', width: '18px' }} />
              Local Battleboard Insights
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.6' }}>
              Our reputation engine analyzes review counts, local citation speed, and video review ratios to benchmark client competitiveness.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <Check style={{ color: 'var(--success)', width: '16px', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                <strong>Excellent Video Ratio:</strong> You are leading the sector in video customer testimonials, which heavily boosts credibility indexing on search platforms.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <Check style={{ color: 'var(--warning)', width: '16px', flexShrink: 0 }} />
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                <strong>AIO Opportunity:</strong> If you increase reply rate from 85% to 95%, you will likely surpass the top competitor on Google Search's pediatric query rankings.
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
