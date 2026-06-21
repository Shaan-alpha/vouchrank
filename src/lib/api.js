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
export async function createLocation({ name, category }) {
  if (demoMode) return null;
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
  return toCompany(data);
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
  if (!audit) return { rating: 0, queries: [], checklist: [] };

  const [{ data: queries }, { data: checklist }] = await Promise.all([
    supabase.from('aio_queries').select('*').eq('audit_id', audit.id),
    supabase.from('aio_checklist').select('*').eq('location_id', locationId),
  ]);
  return { rating: audit.rating, queries: queries || [], checklist: checklist || [] };
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

export async function sendReviewRequest({ locationId, channel, recipient, firstName }) {
  if (demoMode) {
    await new Promise((r) => setTimeout(r, 1000));
    return { demo: true, ok: true };
  }
  const { data, error } = await supabase.functions.invoke('send-review-request', {
    body: { locationId, channel, recipient, firstName },
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
  const path = `${locationId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('review-videos').upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('review-videos').getPublicUrl(path).data.publicUrl;
}
