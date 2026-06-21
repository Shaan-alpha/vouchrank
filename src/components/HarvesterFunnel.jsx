import { useState, useEffect, useRef } from 'react';
import { Star, Video, ExternalLink, MessageSquare, Check, RotateCcw, ShieldCheck } from 'lucide-react';
import { uploadReviewVideo } from '../lib/api';

/**
 * Compliant review funnel.
 *
 * IMPORTANT (legal): This funnel does NOT gate reviews. Every customer — regardless of
 * star rating — is offered the SAME choices: post publicly (Google / video / text) OR
 * send private feedback to the business. Low ratings are never rerouted away from the
 * public path. This keeps the business compliant with:
 *   - FTC Consumer Review Rule (16 CFR Part 465)
 *   - Google Business Profile review policy (no "review gating" / selective solicitation)
 * Sentiment is computed for internal dashboards only and never used to filter who is asked.
 */
export default function HarvesterFunnel({ company, onAddReview }) {
  // Steps: 1 rating -> 2 choose-how (public OR private, shown to everyone)
  //        3 video-record -> 4 video-meta -> 5 success
  //        6 text-public-review -> 5 success
  //        7 private-feedback -> 5 success
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const [textReview, setTextReview] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [consentRecording, setConsentRecording] = useState(false);

  // Video recording (real MediaRecorder; see step 7 of build for storage upload)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(30);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState(null);
  const videoElRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordedBlobRef = useRef(null);

  // Sync brand colors to this screen
  useEffect(() => {
    if (company.colors?.primary) {
      document.documentElement.style.setProperty('--agency-primary', company.colors.primary);
      document.documentElement.style.setProperty('--agency-secondary', company.colors.secondary || '#06b6d4');
    }
  }, [company]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
  };

  // sentiment is internal-only metadata, not a routing signal
  const sentimentFor = (stars) => (stars >= 4 ? 'positive' : stars === 3 ? 'neutral' : 'negative');

  const handleStarClick = (selectedRating) => {
    setRating(selectedRating);
    setStep(2); // EVERYONE goes to the same choose-how screen
  };

  // The public Google Business Profile review URL (real deployments inject this per-location).
  const googleReviewUrl =
    company.googlePlaceId
      ? `https://search.google.com/local/writereview?placeid=${company.googlePlaceId}`
      : 'https://www.google.com/maps';

  const submitReview = (partial) => {
    onAddReview({
      companyId: company.id,
      author: reviewerName || 'Anonymous Customer',
      avatar: (reviewerName || 'A')[0].toUpperCase(),
      rating,
      sentiment: sentimentFor(rating),
      date: 'Just now',
      ...partial,
    });
  };

  const handleGoogleRedirect = () => {
    // Record the intent for analytics; the actual review lands on Google itself.
    submitReview({
      source: 'Google',
      text: 'Customer was directed to the public Google Business Profile to leave a review.',
      keywords: ['google review'],
    });
    window.open(googleReviewUrl, '_blank', 'noreferrer');
    setStep(5);
  };

  const handleSubmitTextReview = (e) => {
    e.preventDefault();
    submitReview({
      source: 'Manual',
      text: textReview,
      keywords: [],
      isPublic: true,
    });
    setStep(5);
  };

  const handleSubmitPrivateFeedback = (e) => {
    e.preventDefault();
    submitReview({
      source: 'Private',
      text: textReview || 'Private feedback shared with management.',
      keywords: ['private feedback'],
      isPublic: false,
    });
    setStep(5);
  };

  // ---- Real video capture ----
  const handleEnterVideo = async () => {
    setStep(3);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        videoElRef.current.muted = true;
        await videoElRef.current.play().catch(() => {});
      }
    } catch {
      // Permission denied / unsupported: user can fall back to text review.
    }
  };

  const handleStartRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    // mp4 where supported (Safari), otherwise webm
    const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    const mr = new MediaRecorder(streamRef.current, { mimeType: mime });
    mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      recordedBlobRef.current = blob;
      setRecordedBlobUrl(URL.createObjectURL(blob));
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setIsRecording(true);
    setRecordingSeconds(30);
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop();
    setIsRecording(false);
    setStep(4);
  };

  // Countdown ticker while recording (declared after handlers it depends on)
  useEffect(() => {
    if (!isRecording || recordingSeconds <= 0) return;
    const t = setTimeout(() => {
      const next = recordingSeconds - 1;
      setRecordingSeconds(next);
      if (next === 0) handleStopRecording();
    }, 1000);
    return () => clearTimeout(t);
  }, [isRecording, recordingSeconds]);

  // Release camera + object URLs on unmount (mount-only cleanup is intentional).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stopStream(), []);

  const handleSubmitVideoReview = async (e) => {
    e.preventDefault();
    let videoUrl = null;
    try {
      // Uploads to Storage (or Mux in production); no-op/null in demo mode.
      videoUrl = await uploadReviewVideo(recordedBlobRef.current, company.id);
    } catch {
      // If upload fails the review still posts without the video attachment.
    }
    submitReview({
      source: 'Video',
      text: textReview,
      keywords: ['video review'],
      isPublic: true,
      videoUrl,
    });
    stopStream();
    setStep(5);
  };

  const resetForm = () => {
    stopStream();
    setStep(1);
    setRating(0);
    setTextReview('');
    setReviewerName('');
    setConsentRecording(false);
    setIsRecording(false);
    setRecordingSeconds(30);
    setRecordedBlobUrl(null);
    recordedBlobRef.current = null;
  };

  return (
    <div className="harvester-full-page">
      {/* Brand Header */}
      <div className="harvester-logo-container">
        <div
          className="logo-icon"
          style={{
            width: '40px',
            height: '40px',
            fontSize: '20px',
            background: `linear-gradient(135deg, var(--agency-primary) 0%, var(--agency-secondary) 100%)`,
          }}
        >
          {company.logoText}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', color: '#fff' }}>{company.name}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{company.category}</p>
        </div>
      </div>

      <div className="harvester-card">
        {/* STEP 1: Star Rating */}
        {step === 1 && (
          <div>
            <div className="harvester-step-header">
              <h3>Share Your Experience</h3>
              <p>How would you rate our overall services and friendly staff?</p>
            </div>

            <div className="star-rating-selector">
              {Array.from({ length: 5 }).map((_, idx) => {
                const starVal = idx + 1;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`star-interactive-btn ${starVal <= (hoverRating || rating) ? 'active' : ''}`}
                    onClick={() => handleStarClick(starVal)}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(0)}
                    id={`btn-harvester-star-${starVal}`}
                  >
                    <Star
                      style={{
                        width: '40px',
                        height: '40px',
                        fill: starVal <= (hoverRating || rating) ? '#fbbf24' : 'transparent',
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
              Your honest feedback — positive or negative — directly supports our service improvements.
            </p>
          </div>
        )}

        {/* STEP 2: Choose how to share — SAME options for ALL ratings (no gating) */}
        {step === 2 && (
          <div>
            <div className="harvester-step-header">
              <h3>Thanks for the {rating}-star rating!</h3>
              <p>How would you like to share your experience? Every option is open to you.</p>
            </div>

            <div className="harvester-options-box">
              {/* Public: Google */}
              <div className="harvester-option-card" onClick={handleGoogleRedirect} id="card-option-google">
                <div className="harvester-option-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
                  <Star fill="#fbbf24" style={{ width: '20px' }} />
                </div>
                <div className="harvester-option-meta" style={{ flexGrow: 1 }}>
                  <h4>Post a public review on Google</h4>
                  <p>Opens our Google Business Profile in a new window.</p>
                </div>
                <ExternalLink style={{ color: 'var(--text-muted)', width: '16px' }} />
              </div>

              {/* Public: Video */}
              <div className="harvester-option-card" onClick={handleEnterVideo} id="card-option-video">
                <div className="harvester-option-icon">
                  <Video style={{ width: '22px' }} />
                </div>
                <div className="harvester-option-meta" style={{ flexGrow: 1 }}>
                  <h4>Record a 30s video testimonial</h4>
                  <p>A quick selfie review, right in your browser.</p>
                </div>
                <Check style={{ color: 'var(--agency-primary)', width: '18px' }} />
              </div>

              {/* Public: Text */}
              <div className="harvester-option-card" onClick={() => setStep(6)} id="card-option-text">
                <div className="harvester-option-icon">
                  <Star style={{ width: '20px' }} />
                </div>
                <div className="harvester-option-meta" style={{ flexGrow: 1 }}>
                  <h4>Write a public review here</h4>
                  <p>Leave a written review we can showcase.</p>
                </div>
                <Check style={{ color: 'var(--agency-primary)', width: '18px' }} />
              </div>

              {/* Private channel — offered to EVERYONE, not just unhappy customers */}
              <div className="harvester-option-card" onClick={() => setStep(7)} id="card-option-private">
                <div className="harvester-option-icon" style={{ background: 'rgba(148,163,184,0.12)', color: 'var(--text-secondary)' }}>
                  <MessageSquare style={{ width: '20px' }} />
                </div>
                <div className="harvester-option-meta" style={{ flexGrow: 1 }}>
                  <h4>Send private feedback to the team</h4>
                  <p>Prefer to tell us directly? This goes only to management.</p>
                </div>
                <ExternalLink style={{ color: 'var(--text-muted)', width: '16px' }} />
              </div>
            </div>

            <button className="btn-sm-action" style={{ width: '100%', marginTop: '24px' }} onClick={() => setStep(1)} id="btn-back-to-rating">
              Go Back
            </button>
          </div>
        )}

        {/* STEP 3: Real video recorder */}
        {step === 3 && (
          <div>
            <div className="harvester-step-header">
              <h3>Record Video Testimonial</h3>
              <p>Tell us in 30 seconds what you loved!</p>
            </div>

            <div className="webcam-sim-container">
              {isRecording && <div className="webcam-active-dot" />}
              <div className="webcam-recording-timer">0:{recordingSeconds.toString().padStart(2, '0')}</div>
              <div className="webcam-sim-screen" style={{ overflow: 'hidden' }}>
                <video ref={videoElRef} playsInline autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              </div>
            </div>

            <div className="webcam-controls">
              {isRecording ? (
                <button className="btn-record recording" onClick={handleStopRecording} id="btn-stop-webcam-record" />
              ) : (
                <button className="btn-record" onClick={handleStartRecording} id="btn-start-webcam-record" />
              )}
            </div>

            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px' }}>
              {isRecording ? 'Tap the square to stop recording.' : 'Tap the red circle to record. If the camera is blocked, you can write a review instead.'}
            </p>
            <button className="btn-sm-action" style={{ width: '100%', marginTop: '12px' }} onClick={() => { stopStream(); setStep(2); }} id="btn-video-back">
              Go Back
            </button>
          </div>
        )}

        {/* STEP 4: Video metadata + recording consent */}
        {step === 4 && (
          <form onSubmit={handleSubmitVideoReview}>
            <div className="harvester-step-header">
              <h3>Finalize Video Review</h3>
              <p>Add a short caption to display with your video.</p>
            </div>

            {recordedBlobUrl && (
              <video src={recordedBlobUrl} controls playsInline style={{ width: '100%', borderRadius: '12px', marginBottom: '16px' }} />
            )}

            <div className="input-field-group">
              <label>Review Caption</label>
              <textarea value={textReview} onChange={(e) => setTextReview(e.target.value)} className="input-control" placeholder="The service was outstanding! Highly recommend..." required style={{ minHeight: '80px' }} id="textarea-video-caption" />
            </div>

            <div className="input-field-group">
              <label>Your Name</label>
              <input type="text" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} className="input-control" placeholder="John Smith" required id="input-video-reviewer-name" />
            </div>

            <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 14px' }}>
              <input type="checkbox" checked={consentRecording} onChange={(e) => setConsentRecording(e.target.checked)} required id="checkbox-video-consent" />
              <span>I consent to {company.name} storing and publicly displaying this video testimonial.</span>
            </label>

            <button type="submit" className="btn-primary-action" style={{ width: '100%', marginTop: '10px' }} disabled={!consentRecording} id="btn-submit-video-review">
              Submit Video Review
            </button>
          </form>
        )}

        {/* STEP 6: Public text review (available to everyone) */}
        {step === 6 && (
          <form onSubmit={handleSubmitTextReview}>
            <div className="harvester-step-header">
              <h3>Write Your Review</h3>
              <p>Share what stood out — your words help others choose with confidence.</p>
            </div>

            <div className="input-field-group">
              <label>Your Review</label>
              <textarea value={textReview} onChange={(e) => setTextReview(e.target.value)} className="input-control" placeholder="Tell us about your experience..." required style={{ minHeight: '110px' }} id="textarea-public-review" />
            </div>

            <div className="input-field-group">
              <label>Your Name</label>
              <input type="text" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} className="input-control" placeholder="Jane Doe" required id="input-public-name" />
            </div>

            <button type="submit" className="btn-primary-action" style={{ width: '100%', marginTop: '10px' }} id="btn-submit-public-review">
              Submit Review
            </button>
            <button type="button" className="btn-sm-action" style={{ width: '100%', marginTop: '12px' }} onClick={() => setStep(2)}>
              Go Back
            </button>
          </form>
        )}

        {/* STEP 7: Private feedback (available to everyone, never auto-routed) */}
        {step === 7 && (
          <form onSubmit={handleSubmitPrivateFeedback}>
            <div className="harvester-step-header">
              <h3>Private Feedback</h3>
              <p>This goes directly to {company.name}'s management and is not published.</p>
            </div>

            <div className="input-field-group">
              <label>Your Feedback (Private)</label>
              <textarea value={textReview} onChange={(e) => setTextReview(e.target.value)} className="input-control" placeholder="Tell us what we could do better..." required style={{ minHeight: '100px' }} id="textarea-private-feedback" />
            </div>

            <div className="input-field-group">
              <label>Your Name (Optional)</label>
              <input type="text" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} className="input-control" placeholder="Jane Doe" id="input-private-name" />
            </div>

            <button type="submit" className="btn-primary-action" style={{ width: '100%', marginTop: '10px' }} id="btn-submit-private-feedback">
              Send Private Feedback
            </button>
            <button type="button" className="btn-sm-action" style={{ width: '100%', marginTop: '12px' }} onClick={() => setStep(2)}>
              Go Back
            </button>
          </form>
        )}

        {/* STEP 5: Success */}
        {step === 5 && (
          <div className="harvester-success-block">
            <div className="success-icon-badge">
              <svg style={{ width: '32px', height: '32px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 style={{ fontSize: '24px', color: '#fff' }}>Thank You!</h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
              We appreciate you sharing your experience with {company.name}. Every piece of feedback helps us improve.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '10px', color: 'var(--text-muted)' }}>
              <ShieldCheck style={{ width: '13px' }} />
              <span>Feedback collected in line with FTC &amp; Google review policies.</span>
            </div>

            <button className="btn-sm-action" style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={resetForm} id="btn-restart-funnel">
              <RotateCcw style={{ width: '14px' }} />
              Submit Another Response
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
