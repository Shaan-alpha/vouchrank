// AIO (AI-search / Generative Engine Optimization) audit.
// Asks each LLM provider local-intent questions and measures how often the
// business is recommended + its rank. Writes an aio_audits row with per-query
// detail, then a visibility score (0-100) onto the location.
//
// Model IDs are env-overridable because the provider lineups change every few
// months. Defaults target the current generation (June 2026). Verify against
// each provider's model list before production.
import { json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const GEMINI_MODEL = Deno.env.get('AIO_GEMINI_MODEL') ?? 'gemini-3.5-flash';
const OPENAI_MODEL = Deno.env.get('AIO_OPENAI_MODEL') ?? 'gpt-5.1';
const PPLX_MODEL = Deno.env.get('AIO_PPLX_MODEL') ?? 'sonar-pro';

type ProviderResult = { engine: string; text: string };

async function askGemini(prompt: string): Promise<ProviderResult | null> {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return { engine: 'gemini', text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '' };
}

async function askOpenAI(prompt: string): Promise<ProviderResult | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENAI_MODEL, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { engine: 'chatgpt', text: data.choices?.[0]?.message?.content ?? '' };
}

async function askPerplexity(prompt: string): Promise<ProviderResult | null> {
  const key = Deno.env.get('PERPLEXITY_API_KEY');
  if (!key) return null;
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: PPLX_MODEL, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { engine: 'perplexity', text: data.choices?.[0]?.message?.content ?? '' };
}

// Crude but effective: does the recommendation list name the business, and where?
function analyze(text: string, businessName: string) {
  const lower = text.toLowerCase();
  const name = businessName.toLowerCase();
  const recommended = lower.includes(name);
  let rank: number | null = null;
  if (recommended) {
    // approximate rank by line/number position
    const lines = text.split('\n').filter(Boolean);
    const idx = lines.findIndex((l) => l.toLowerCase().includes(name));
    rank = idx >= 0 ? idx + 1 : null;
  }
  return { recommended, rank };
}

Deno.serve(async (req) => {
  try {
    const { locationId, city, queries: customQueries } = await req.json();

    const { data: loc } = await supabaseAdmin
      .from('locations')
      .select('id, agency_id, name, category')
      .eq('id', locationId)
      .single();
    if (!loc) return json({ error: 'no_location' }, 404);

    const where = city ? ` in ${city}` : '';
    const queries: string[] =
      customQueries ?? [
        `Who are the best ${loc.category}${where}? List the top 5 by name.`,
        `Recommend a highly-rated ${loc.category}${where}. List names in order.`,
        `Which ${loc.category}${where} has the best reviews? Rank the top 5.`,
      ];

    const askers = [askGemini, askOpenAI, askPerplexity];

    // one audit row
    const queryRows: Array<Record<string, unknown>> = [];
    let recommendedHits = 0;
    let totalChecks = 0;

    for (const q of queries) {
      const results = (await Promise.all(askers.map((fn) => fn(q)))).filter(Boolean) as ProviderResult[];
      const engines: string[] = [];
      let anyRecommended = false;
      let bestRank: number | null = null;

      for (const r of results) {
        totalChecks += 1;
        const { recommended, rank } = analyze(r.text, loc.name);
        if (recommended) {
          recommendedHits += 1;
          anyRecommended = true;
          engines.push(r.engine);
          if (rank && (bestRank === null || rank < bestRank)) bestRank = rank;
        }
      }

      queryRows.push({
        agency_id: loc.agency_id,
        query: q,
        sources: engines,
        recommended: anyRecommended,
        rank: bestRank,
        competitors: [],
      });
    }

    const score = totalChecks ? Math.round((recommendedHits / totalChecks) * 100) : 0;

    const { data: audit } = await supabaseAdmin
      .from('aio_audits')
      .insert({ location_id: locationId, agency_id: loc.agency_id, rating: score })
      .select('id')
      .single();

    if (audit) {
      await supabaseAdmin
        .from('aio_queries')
        .insert(queryRows.map((r) => ({ ...r, audit_id: audit.id })));
    }
    await supabaseAdmin.from('locations').update({ aio_visibility: score }).eq('id', locationId);

    return json({ score, queries: queryRows.length });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
