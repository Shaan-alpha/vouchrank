import { useState } from 'react';
import { Star, Play, X, Sparkles, Filter, Video, MessageSquare } from 'lucide-react';

export default function ReviewList({ reviews, onAddReviewReply }) {
  const [sourceFilter, setSourceFilter] = useState('All');
  const [sentimentFilter, setSentimentFilter] = useState('All');
  const [selectedKeyword, setSelectedKeyword] = useState('All');
  
  // Video player state
  const [activeVideo, setActiveVideo] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoTimer, setVideoTimer] = useState(null);

  // AI draft reply states
  const [draftingReviewId, setDraftingReviewId] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [isDraftLoading, setIsDraftLoading] = useState(false);

  // Extract unique keywords and count their frequency
  const keywordCounts = reviews.reduce((acc, r) => {
    r.keywords.forEach(k => {
      acc[k] = (acc[k] || 0) + 1;
    });
    return acc;
  }, {});

  // Filter reviews
  const filteredReviews = reviews.filter(r => {
    const matchSource = sourceFilter === 'All' || r.source === sourceFilter;
    const matchSentiment = sentimentFilter === 'All' || r.sentiment === sentimentFilter;
    const matchKeyword = selectedKeyword === 'All' || r.keywords.includes(selectedKeyword);
    return matchSource && matchSentiment && matchKeyword;
  });

  // Calculate review stats
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;
  
  const videoCount = reviews.filter(r => r.source === 'Video').length;

  // Video playback simulation
  const handlePlayVideo = (review) => {
    setActiveVideo(review);
    setIsPlaying(true);
    setVideoProgress(0);
    
    // Simulate time ticker for progress bar
    if (videoTimer) clearInterval(videoTimer);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2.5;
      if (currentProgress >= 100) {
        currentProgress = 0; // Loop or stop
      }
      setVideoProgress(currentProgress);
    }, 200);
    
    setVideoTimer(interval);
  };

  const handleCloseVideo = () => {
    if (videoTimer) clearInterval(videoTimer);
    setVideoTimer(null);
    setActiveVideo(null);
    setIsPlaying(false);
    setVideoProgress(0);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      if (videoTimer) clearInterval(videoTimer);
    } else {
      let currentProgress = videoProgress;
      const interval = setInterval(() => {
        currentProgress += 2.5;
        if (currentProgress >= 100) currentProgress = 0;
        setVideoProgress(currentProgress);
      }, 200);
      setVideoTimer(interval);
    }
  };

  // AI Reply Draft Simulation
  const handleDraftReply = (review) => {
    setDraftingReviewId(review.id);
    setIsDraftLoading(true);
    
    // Simulate AI loading latency
    setTimeout(() => {
      let response;
      if (review.rating >= 4) {
        response = `Hi ${review.author.split(' ')[0]}, thank you so much for the stellar ${review.rating}-star review! We are delighted that you appreciated the ${review.keywords[0] || 'service'} and ${review.keywords[1] || 'our friendly team'}. We appreciate your support!`;
      } else {
        response = `Hello ${review.author.split(' ')[0]}, thank you for sharing your feedback. We apologize for the issue concerning the ${review.keywords[0] || 'experience'}. We are sharing this with our management team to refine our processes.`;
      }
      setDraftText(response);
      setIsDraftLoading(false);
    }, 1000);
  };

  const handleSaveReply = (reviewId) => {
    onAddReviewReply(reviewId, draftText);
    setDraftingReviewId(null);
    setDraftText('');
  };

  return (
    <div>
      {/* Overview Stats Row */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="glass-card stat-card">
          <div className="stat-icon">
            <Star style={{ fill: 'var(--agency-primary)', color: 'var(--agency-primary)' }} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{averageRating} / 5.0</div>
            <div className="stat-label">Average Customer Rating</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ color: 'var(--agency-secondary)' }}>
            <Video />
          </div>
          <div className="stat-info">
            <div className="stat-value">{videoCount}</div>
            <div className="stat-label">Video Testimonials</div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ color: 'var(--success)' }}>
            <MessageSquare />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {reviews.filter(r => r.aiReply).length} / {reviews.length}
            </div>
            <div className="stat-label">AI Replies Posted</div>
          </div>
        </div>
      </div>

      {/* Filter and Review List Block */}
      <div className="glass-card">
        <div className="reviews-control-header">
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter style={{ width: '18px', color: 'var(--agency-primary)' }} />
            Collected Customer Reviews
          </h3>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Source Filter */}
            <div className="filter-group">
              {['All', 'Google', 'Video', 'Manual'].map((src) => (
                <button
                  key={src}
                  className={`filter-btn ${sourceFilter === src ? 'active' : ''}`}
                  onClick={() => setSourceFilter(src)}
                  id={`btn-src-${src.toLowerCase()}`}
                >
                  {src}
                </button>
              ))}
            </div>

            {/* Sentiment Filter */}
            <div className="filter-group">
              {['All', 'positive', 'neutral', 'negative'].map((sent) => (
                <button
                  key={sent}
                  className={`filter-btn ${sentimentFilter === sent ? 'active' : ''}`}
                  onClick={() => setSentimentFilter(sent)}
                  id={`btn-sent-${sent}`}
                >
                  {sent.charAt(0).toUpperCase() + sent.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Extracted Topic Keyword Cloud */}
        <div className="keyword-cloud-container">
          {Object.keys(keywordCounts).length === 0 ? (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No topics extracted yet.</span>
          ) : (
            <>
              <div 
                className={`keyword-cloud-pill ${selectedKeyword === 'All' ? 'active' : ''}`}
                onClick={() => setSelectedKeyword('All')}
                id="btn-kw-all"
              >
                All Topics
                <span className="keyword-count-badge">{reviews.length}</span>
              </div>
              {Object.entries(keywordCounts).map(([kw, count]) => (
                <div 
                  key={kw}
                  className={`keyword-cloud-pill ${selectedKeyword === kw ? 'active' : ''}`}
                  onClick={() => setSelectedKeyword(kw)}
                  id={`btn-kw-${kw.replace(/\s+/g, '-')}`}
                >
                  #{kw}
                  <span className="keyword-count-badge">{count}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Reviews List */}
        <div className="review-card-list">
          {filteredReviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              No reviews match the selected filters.
            </div>
          ) : (
            filteredReviews.map((r) => (
              <div key={r.id} className="glass-card review-card" style={{ background: 'rgba(255,255,255,0.015)' }}>
                
                {/* Header */}
                <div className="review-card-header">
                  <div className="reviewer-meta">
                    <div className="reviewer-avatar">{r.avatar}</div>
                    <div className="reviewer-name">
                      <h4>{r.author}</h4>
                      <span>Posted {r.date}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div className="review-stars">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star 
                          key={idx} 
                          style={{ 
                            width: '14px', 
                            height: '14px', 
                            fill: idx < r.rating ? '#fbbf24' : 'transparent',
                            color: idx < r.rating ? '#fbbf24' : 'var(--text-muted)'
                          }} 
                        />
                      ))}
                    </div>
                    <div className="review-badge-group">
                      <span className={`review-tag ${r.source === 'Video' ? 'tag-video' : ''}`}>
                        {r.source}
                      </span>
                      <span className="review-tag" style={{ textTransform: 'uppercase' }}>
                        {r.sentiment}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Text Body */}
                <p className="review-body">"{r.text}"</p>

                {/* Simulated Video Review Block */}
                {r.source === 'Video' && (
                  <div className="video-thumbnail-container">
                    <div 
                      className="video-thumbnail-bg" 
                      style={{ 
                        background: 'linear-gradient(45deg, #1e1e2f, #2a2a40)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'rgba(255,255,255,0.15)',
                        fontSize: '12px'
                      }}
                    >
                      🎥 Dynamic Video Testimonial Preview
                    </div>
                    <div className="video-play-overlay" onClick={() => handlePlayVideo(r)}>
                      <button className="video-play-btn" id={`play-video-${r.id}`}>
                        <Play fill="white" style={{ width: '18px', height: '18px', marginLeft: '2px' }} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Extracted Keywords */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {r.keywords.map((kw, i) => (
                    <span key={i} style={{ fontSize: '11px', color: 'var(--agency-secondary)', background: 'rgba(6, 182, 212, 0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                      #{kw}
                    </span>
                  ))}
                </div>

                {/* AI Reply Block */}
                <div className="ai-reply-block">
                  {r.aiReply ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div className="reviewer-avatar" style={{ width: '28px', height: '28px', fontSize: '11px', background: 'var(--agency-primary)' }}>AI</div>
                      <div className="ai-reply-box" style={{ flexGrow: 1, marginTop: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '11px', color: '#fff', marginBottom: '4px' }}>AI Reply Posted to Google:</div>
                        {r.aiReply}
                      </div>
                    </div>
                  ) : draftingReviewId === r.id ? (
                    <div className="ai-reply-box" style={{ border: '1px solid var(--agency-primary)' }}>
                      {isDraftLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                          <Sparkles className="spin" style={{ width: '14px', color: 'var(--agency-primary)' }} />
                          <span>Generating custom reply matching review sentiment...</span>
                        </div>
                      ) : (
                        <div>
                          <textarea 
                            value={draftText} 
                            onChange={(e) => setDraftText(e.target.value)}
                            className="input-control" 
                            style={{ width: '100%', minHeight: '80px', marginBottom: '8px', fontSize: '12px', background: '#090a0f' }}
                          />
                          <div className="ai-reply-actions">
                            <button className="btn-sm-action" onClick={() => setDraftingReviewId(null)}>Cancel</button>
                            <button className="btn-sm-action primary" onClick={() => handleSaveReply(r.id)} id={`btn-post-reply-${r.id}`}>
                              Approve & Post to Google
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button className="ai-reply-btn" onClick={() => handleDraftReply(r)} id={`btn-draft-reply-${r.id}`}>
                      <Sparkles style={{ width: '12px' }} />
                      Draft AI Response
                    </button>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* Video Popup Overlay Player */}
      {activeVideo && (
        <div className="video-popup-overlay" onClick={handleCloseVideo}>
          <div className="video-popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="video-popup-header">
              <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Video style={{ color: 'var(--agency-secondary)', width: '18px' }} />
                Video Review by {activeVideo.author}
              </h3>
              <button className="video-popup-close" onClick={handleCloseVideo} id="btn-close-video-popup">
                <X style={{ width: '20px' }} />
              </button>
            </div>

            <div className="simulated-video-player">
              <div className="simulated-video-track">
                {isPlaying ? (
                  <>
                    <div className="simulated-video-wave">
                      <span></span><span></span><span></span><span></span><span></span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      [Simulating video testimonial audio/video stream]
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Paused</span>
                )}
              </div>

              {/* Media controls bar */}
              <div className="simulated-video-controls">
                <button 
                  onClick={togglePlayPause} 
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                  id="btn-play-pause-video"
                >
                  {isPlaying ? (
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>PAUSE</span>
                  ) : (
                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>PLAY</span>
                  )}
                </button>
                <div className="video-progress-bar">
                  <div className="video-progress-fill" style={{ width: `${videoProgress}%` }}></div>
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#fff' }}>
                  0:{Math.floor((videoProgress / 100) * 30).toString().padStart(2, '0')} / 0:30
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
