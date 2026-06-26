import { useEffect, useState } from 'react';
import HarvesterFunnel from './HarvesterFunnel';
import { getPublicLocation, submitPublicReview } from '../lib/api';

/**
 * Standalone public review funnel, served at /r/:locationId (the link sent in
 * review-request SMS/email). No auth — anyone with the link can leave a review.
 * Reuses the compliant HarvesterFunnel; submissions post to the submit-review
 * Edge Function. Loads branding via the public-location endpoint (demo: mock).
 */
export default function PublicFunnel({ locationId }) {
  const [company, setCompany] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let alive = true;
    getPublicLocation(locationId)
      .then((c) => alive && setCompany(c))
      .catch(() => alive && setCompany(null));
    return () => {
      alive = false;
    };
  }, [locationId]);

  const handleAddReview = (review) => {
    // Optimistic from the customer's view; persistence is fire-and-forget.
    submitPublicReview({ ...review, locationId: company.id }).catch(() => {});
  };

  const screen = (msg) => (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#030408', color: '#94a3b8', fontSize: 14, padding: 24, textAlign: 'center' }}>
      {msg}
    </div>
  );

  if (company === undefined) return screen('Loading…');
  if (!company) return screen('This review link is no longer available.');

  return (
    <div style={{ minHeight: '100vh', background: '#030408', overflowY: 'auto' }}>
      <HarvesterFunnel company={company} onAddReview={handleAddReview} />
    </div>
  );
}
