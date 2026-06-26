import { useState } from 'react';
import { Star, Play, X, Sparkles, Filter, Video, MessageSquare, Clock, CheckCircle, Ban, RotateCcw, ShieldCheck } from 'lucide-react';

// Non-sentiment reject reasons (see COMPLIANCE.md). No rating/sentiment option.
const REJECT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'fake', label: 'Fake / not a real customer' },
  { value: 'abusive', label: 'Abusive / offensive' },
  { value: 'off_topic', label: 'Off-topic' },
  { value: 'legal', label: 'Legal / privacy' },
  { value: 'other', label: 'Other' },
];
const REASON_LABEL = Object.fromEntries(REJECT_REASONS.map((r) => [r.value, r.label]));

export default function ReviewList({ reviews, onAddReviewReply, onSetReviewStatus }) {
  const [sourceFilter, setSourceFilter] = useState('All');
  const [sentimentFilter, setSentimentFilter] = useState('All');
  const [selectedKeyword, setSelectedKeyword] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Reject-reason picker state
  const [rejectingReviewId, setRejectingReviewId] = useState(null);
  const [rejectReasonDraft, setRejectReasonDraft] = useState('');
  const [rejectNoteDraft, setRejectNoteDraft] = useState('');
  
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
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchSource && matchSentiment && matchKeyword && matchStatus;
  });

  // Calculate review stats
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;
  
  const videoCount = reviews.filter(r => r.source === 'Video').length;

  const pendingCount = reviews.filter((r) => r.status === 'pending').length;

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

  // Moderation actions
  const handleApprove = (id) => onSetReviewStatus(id, 'approved');
  const handleRestore = (id) => onSetReviewStatus(id, 'pending');

  const openReject = (id) => {
    setRejectingReviewId(id);
    setRejectReasonDraft('');
    setRejectNoteDraft('');
  };
  const cancelReject = () => {
    setRejectingReviewId(null);
    setRejectReasonDraft('');
    setRejectNoteDraft('');
  };
  const confirmReject = (id) => {
    if (!rejectReasonDraft) return;
    onSetReviewStatus(id, 'rejected', {
      reason: rejectReasonDraft,
      note: rejectNoteDraft.trim() || null,
    });
    cancelReject();
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

        <div
          className="glass-card stat-card"
          onClick={() => setStatusFilter('pending')}
          id="btn-filter-pending"
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon" style={{ color: pendingCount ? 'var(--warning)' : 'var(--text-muted)' }}>
            <Clock />
          </div>
          <div className="stat-info">
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending Review</div>
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

            {/* Status (moderation) Filter */}
            <div className="filter-group">
              {['All', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                  id={`btn-status-${st === 'All' ? 'all' : st}`}
                >
                  {st === 'All' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mod-compliance-note">
          <ShieldCheck style={{ width: '13px', height: '13px' }} />
          Moderation is for authenticity (spam, fake, or abusive reviews) — it applies to every rating equally and never hides honest negative feedback.
        </p>

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
                      <span className={`review-tag status-${r.status}`}>
                        {r.status === 'pending' && 'Pending'}
                        {r.status === 'approved' && 'Approved'}
                        {r.status === 'rejected' && `Rejected · ${REASON_LABEL[r.rejectReason] || 'Removed'}`}
                      </span>
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
                        <div style={{ fontWeight: '600', fontSize: '11px', color: '#fff', marginBottom: '4px' }}>Saved AI reply:</div>
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
                              Save reply
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

                {/* Moderation actions */}
                <div className="review-mod-actions">
                  {rejectingReviewId === r.id ? (
                    <div className="reject-reason-picker">
                      <div className="reject-reason-title">Why are you rejecting this review?</div>
                      <div className="reject-reason-pills">
                        {REJECT_REASONS.map((reason) => (
                          <button
                            key={reason.value}
                            type="button"
                            className={`reason-pill ${rejectReasonDraft === reason.value ? 'active' : ''}`}
                            onClick={() => setRejectReasonDraft(reason.value)}
                            id={`reason-${reason.value}-${r.id}`}
                          >
                            {reason.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={rejectNoteDraft}
                        onChange={(e) => setRejectNoteDraft(e.target.value)}
                        placeholder="Optional internal note…"
                        className="input-control"
                        style={{ width: '100%', minHeight: '54px', margin: '8px 0', fontSize: '12px', background: '#090a0f' }}
                      />
                      <div className="ai-reply-actions">
                        <button className="btn-sm-action" onClick={cancelReject}>Cancel</button>
                        <button
                          className="btn-sm-action primary"
                          onClick={() => confirmReject(r.id)}
                          disabled={!rejectReasonDraft}
                          id={`btn-confirm-reject-${r.id}`}
                        >
                          Confirm reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="review-mod-buttons">
                      {r.status === 'pending' && (
                        <>
                          <button className="btn-sm-action primary" onClick={() => handleApprove(r.id)} id={`btn-approve-review-${r.id}`}>
                            <CheckCircle style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Approve
                          </button>
                          <button className="btn-sm-action" onClick={() => openReject(r.id)} id={`btn-reject-review-${r.id}`}>
                            <Ban style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <>
                          <span className="mod-state-label approved">
                            <CheckCircle style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Approved
                          </span>
                          <button className="btn-sm-action" onClick={() => openReject(r.id)} id={`btn-reject-review-${r.id}`}>
                            <Ban style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'rejected' && (
                        <>
                          <span className="mod-state-label rejected">
                            <Ban style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Rejected · {REASON_LABEL[r.rejectReason] || 'Removed'}
                            {r.rejectNote ? ` — ${r.rejectNote}` : ''}
                          </span>
                          <button className="btn-sm-action" onClick={() => handleRestore(r.id)} id={`btn-restore-review-${r.id}`}>
                            <RotateCcw style={{ width: '13px', height: '13px', verticalAlign: '-2px', marginRight: '4px' }} />
                            Restore
                          </button>
                        </>
                      )}
                    </div>
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

            {activeVideo.videoUrl && /^https?:\/\//.test(activeVideo.videoUrl) ? (
              <video
                src={activeVideo.videoUrl}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', borderRadius: '12px', background: '#000', maxHeight: '60vh' }}
              />
            ) : (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
