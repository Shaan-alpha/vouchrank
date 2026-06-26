// Data-access layer.
//
// Single seam between the UI and the backend. When Supabase is configured it
// talks to Postgres (RLS-scoped to the signed-in agency); otherwise it returns
// the bundled mock data so the prototype still runs with zero setup.

import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  MOCK_COMPANIES,
  MOCK_REVIEWS,
  MOCK_AIO_AUDITS,
  MOCK_COMPETITORS,
  MOCK_CAMPAIGNS,
} from '../utils/mockData';

export const demoMode = !isSupabaseConfigured;

// Seeded onto a new location (live mode) so the AIO dashboard has starter
// action items instead of an empty list. Generic, non-tenant-specific.
const DEFAULT_CHECKLIST = [
  {
    badge: 'Keyword GAP',
    title: 'Collect reviews that name your top services',
    description:
      'AI search engines recommend businesses whose reviews repeat the service keywords customers search for. Ask happy customers to mention specifics.',
  },
  {
    badge: 'Review Volume',
    title: 'Reach 25+ public reviews',
    description:
      'Higher review volume increases the confidence AI search engines place in recommending you over competitors.',
  },
  {
    badge: 'Integration',
    title: 'Embed the reviews widget on the homepage',
    description:
      'Crawlable, structured review content on the client site helps LLMs verify your reputation claims.',
  },
];

// ---- Row -> UI shape mappers (keep the UI components unchanged) ----
const toCompany = (loc) => ({
  id: loc.id,
  name: loc.name,
  category: loc.category,
  domain: loc.domain,
  logoText: loc.logo_text,
  colors: loc.colors || {},
  googlePlaceId: loc.google_place_id,
  aioVisibility: loc.aio_visibility,
  // counts are derived; filled in by getCompanies aggregate query
  googleRating: loc.google_rating ?? null,
  googleCount: loc.google_count ?? 0,
  videoCount: loc.video_count ?? 0,
});

const toReview = (r) => ({
  id: r.id,
  companyId: r.location_id,
  author: r.author,
  avatar: r.avatar,
  rating: r.rating,
  source: r.source ? r.source[0].toUpperCase() + r.source.slice(1) : 'Manual',
  text: r.text,
  keywords: r.keywords || [],
  sentiment: r.sentiment,
  status: r.status,
  rejectReason: r.reject_reason ?? null,
  rejectNote: r.reject_note ?? null,
  date: new Date(r.created_at).toLocaleDateString(),
  videoUrl: r.video_url,
  aiReply: r.ai_reply,
  isPublic: r.is_public,
});

// =====================================================================
// Reads
// =====================================================================
export async function getAgency() {
  if (demoMode) {
    return { id: 'demo-agency', name: 'Demo Agency', plan: 'trial', plan_status: 'trialing', max_locations: 15 };
  }
  const { data, error } = await supabase.from('agencies').select('*').limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCompanies() {
  if (demoMode) return MOCK_COMPANIES;
  const { data, error } = await supabase.from('locations').select('*').order('created_at');
  if (error) throw error;
  return data.map(toCompany);
}

// Creates the first (or another) location for the signed-in user's agency.
// In demo mode there is no DB, so we synthesize a company object that matches
// the toCompany() shape; App.jsx appends it to local state.
export async function createLocation({ name, category }) {
  if (demoMode) {
    return {
      id: `loc-${Date.now()}`,
      name,
      category: category || 'Local Business',
      domain: null,
      logoText: name.slice(0, 2).toUpperCase(),
      colors: { primary: '#8b5cf6', secondary: '#06b6d4' },
      googlePlaceId: null,
      aioVisibility: 0,
      googleRating: null,
      googleCount: 0,
      videoCount: 0,
    };
  }
  const agency = await getAgency();
  const { data, error } = await supabase
    .from('locations')
    .insert({
      agency_id: agency.id,
      name,
      category: category || 'Local Business',
      logo_text: name.slice(0, 2).toUpperCase(),
      colors: { primary: '#8b5cf6', secondary: '#06b6d4' },
    })
    .select('*')
    .single();
  if (error) throw error;
  // Seed starter optimization items (non-fatal if it fails).
  try {
    await supabase
      .from('aio_checklist')
      .insert(DEFAULT_CHECKLIST.map((c) => ({ ...c, location_id: data.id, agency_id: agency.id })));
  } catch { /* dashboard still works without seeded items */ }
  return toCompany(data);
}

// Updates editable identity fields on a location (name / category / domain).
// Demo mode is a no-op (App merges optimistically); live mode persists and
// returns the updated row mapped to the UI shape.
export async function updateLocation(id, fields) {
  if (demoMode) return { demo: true };
  const patch = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.category !== undefined) patch.category = fields.category;
  if (fields.domain !== undefined) patch.domain = fields.domain;
  if (fields.colors !== undefined) patch.colors = fields.colors;
  if (fields.logoText !== undefined) patch.logo_text = fields.logoText;
  const { data, error } = await supabase
    .from('locations')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toCompany(data);
}

// Permanently deletes a location. The FK `on delete cascade` chain removes its
// reviews, audits, queries, checklist, competitors, campaigns, and google
// credentials. Demo mode is a no-op (App removes it from local state).
export async function deleteLocation(id) {
  if (demoMode) return { demo: true };
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}

export async function getReviews(locationId) {
  if (demoMode) return MOCK_REVIEWS.filter((r) => r.companyId === locationId);
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toReview);
}

export async function getAudit(locationId) {
  if (demoMode) return MOCK_AIO_AUDITS[locationId];
  const { data: audit, error } = await supabase
    .from('aio_audits')
    .select('id, rating')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  // Checklist is always fetched (it's seeded on location creation and exists
  // independently of whether an audit has run yet).
  const { data: checklist } = await supabase
    .from('aio_checklist')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at');

  let queries = [];
  if (audit) {
    const { data: q } = await supabase.from('aio_queries').select('*').eq('audit_id', audit.id);
    queries = q || [];
  }
  return { rating: audit?.rating ?? 0, queries, checklist: checklist || [] };
}

// Public funnel: fetch one location's funnel-safe branding without auth. Demo
// mode reads mock data; live mode hits the public-location Edge Function (no
// anon table access — see migration 0006 / the H1 fix).
export async function getPublicLocation(locationId) {
  if (demoMode) {
    return MOCK_COMPANIES.find((c) => c.id === locationId) || null;
  }
  const { data, error } = await supabase.functions.invoke('public-location', {
    body: { location: locationId },
  });
  if (error) throw error;
  if (!data || data.error) return null;
  return data;
}

export async function getCompetitors(locationId) {
  if (demoMode) return MOCK_COMPETITORS[locationId] || [];
  const { data, error } = await supabase.from('competitors').select('*').eq('location_id', locationId);
  if (error) throw error;
  return (data || []).map((c) => ({
    name: c.name,
    rating: c.rating,
    reviewCount: c.review_count,
    videoCount: c.video_count,
    aioScore: c.aio_score,
    replyRate: c.reply_rate,
    history: c.history || [],
  }));
}

export async function getCampaigns(locationId) {
  if (demoMode) return MOCK_CAMPAIGNS[locationId];
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return { history: data || [] };
}

// =====================================================================
// Writes
// =====================================================================
export async function toggleChecklistItem(itemId, checked) {
  if (demoMode) return;
  const { error } = await supabase.from('aio_checklist').update({ checked }).eq('id', itemId);
  if (error) throw error;
}

export async function saveReviewReply(reviewId, aiReply) {
  if (demoMode) return;
  const { error } = await supabase.from('reviews').update({ ai_reply: aiReply }).eq('id', reviewId);
  if (error) throw error;
}

// Moderation: approve / reject / restore a review. Rejecting persists a
// non-sentiment reason (+ optional note); approve/pending clear any prior
// rejection. Demo mode is a no-op — App.jsx owns optimistic state.
export async function setReviewStatus(reviewId, status, { reason = null, note = null } = {}) {
  if (demoMode) return { demo: true };
  const patch =
    status === 'rejected'
      ? { status, reject_reason: reason, reject_note: note }
      : { status, reject_reason: null, reject_note: null };
  const { error } = await supabase.from('reviews').update(patch).eq('id', reviewId);
  if (error) throw error;
  return { ok: true };
}

// Public funnel submissions go through an Edge Function (service_role), never a
// direct anon insert. In demo mode this is a no-op handled by local state.
export async function submitPublicReview(payload) {
  if (demoMode) return { ok: true, demo: true };
  const { data, error } = await supabase.functions.invoke('submit-review', { body: payload });
  if (error) throw error;
  return data;
}

// =====================================================================
// Edge Function actions (billing / integrations / engine)
// In demo mode these simulate so the UI is fully clickable without a backend.
// =====================================================================
export async function createCheckout(plan) {
  if (demoMode) {
    return { demo: true, message: `Demo: would start Stripe Checkout for the "${plan}" plan.` };
  }
  const { data, error } = await supabase.functions.invoke('stripe-checkout', { body: { plan } });
  if (error) throw error;
  if (data?.url) window.location.href = data.url; // redirect to Stripe
  return data;
}

export async function startGoogleOAuth(locationId) {
  if (demoMode) {
    return { demo: true, message: 'Demo: would open Google consent to connect this location.' };
  }
  const { data, error } = await supabase.functions.invoke('google-oauth-start', { body: { locationId } });
  if (error) throw error;
  if (data?.url) window.location.href = data.url;
  return data;
}

export async function runAioAudit(locationId, city) {
  if (demoMode) {
    await new Promise((r) => setTimeout(r, 1200));
    return { demo: true, score: Math.floor(40 + Math.random() * 55) };
  }
  const { data, error } = await supabase.functions.invoke('run-aio-audit', {
    body: { locationId, city },
  });
  if (error) throw error;
  return data;
}

export async function sendReviewRequest({ locationId, channel, recipient, firstName, message }) {
  if (demoMode) {
    await new Promise((r) => setTimeout(r, 1000));
    return { demo: true, ok: true };
  }
  const { data, error } = await supabase.functions.invoke('send-review-request', {
    body: { locationId, channel, recipient, firstName, message },
  });
  if (error) throw error;
  return data;
}

// Uploads a recorded testimonial to the review-videos bucket and returns its
// public URL. Returns null in demo mode. For production scale, swap this for a
// Mux / Cloudflare Stream direct upload (see migration 0002 note).
export async function uploadReviewVideo(blob, locationId) {
  if (demoMode || !blob) return null;
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  // Ask the Edge Function for a one-object signed upload URL, then upload to it.
  // The funnel customer is anonymous, so we no longer rely on a blanket anon
  // bucket-insert policy (removed in migration 0006 / the M2 fix).
  const { data: signed, error: signErr } = await supabase.functions.invoke('create-upload-url', {
    body: { locationId, ext },
  });
  if (signErr) throw signErr;
  const { error: upErr } = await supabase.storage
    .from('review-videos')
    .uploadToSignedUrl(signed.path, signed.token, blob, { contentType: blob.type });
  if (upErr) throw upErr;
  return supabase.storage.from('review-videos').getPublicUrl(signed.path).data.publicUrl;
}
