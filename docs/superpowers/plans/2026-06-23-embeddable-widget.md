# Real Embeddable widget.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real, framework-free `widget.js` that a client pastes on their site to render their location's reviews, backed by a public `widget-reviews` edge function.

**Architecture:** A standalone vanilla IIFE in `public/widget.js` (served verbatim by Vite, no build step) reads its own `<script>` `data-*` attributes, fetches reviews from a public, CORS-`*` Supabase edge function, and renders a themed carousel/grid into an auto-created container. The Widgets tab generates the real embed snippet; a static dev harness verifies the script without deploying the function.

**Tech Stack:** Vanilla JS (no deps), Deno/TypeScript edge function (Supabase), React 19 (Vite) for the dashboard tab.

## Global Constraints

- **No test runner exists** (package.json scripts: `dev`, `build`, `lint`, `preview`). Definition of done = `npm run lint` → **0 errors**, `npm run build` → **green**, plus each task's manual check. Do **not** add a test framework.
- **ESLint lints `public/widget.js`** — config `files: ['**/*.{js,jsx}']`, only `dist` ignored. So `widget.js` must be lint-clean under `js.configs.recommended` + react-hooks + react-refresh + `globals.browser`. Notably: use **bindingless `catch {}`** (ESLint 9 `no-unused-vars` flags unused catch params); no unused vars; rely only on browser/ES globals.
- **`.ts` edge functions are NOT linted** (config matches only `.js/.jsx`) and not part of the Vite build graph. Author to match the existing `submit-review` style.
- **Compliance (COMPLIANCE.md):** the widget and function return reviews of **any rating** — no score-based filtering anywhere. Only `is_public = true AND status <> 'rejected'`.
- **CORS:** the widget endpoint uses its **own** `Access-Control-Allow-Origin: *` headers, NOT `_shared/cors.ts` (which locks to `APP_BASE_URL`).
- **React 19:** no `import React`; import only hooks/icons used.
- **Commit** after each task with the message shown. Work happens on branch `feature/embeddable-widget`.

> **Note vs. spec:** the embed snippet is the `<script>` tag alone (no separate `<div id="vouchrank-widget">`). The script auto-creates its own adjacent container (with an optional `data-target="id"` override). This supports multiple widgets per page without id collisions — strictly better than a fixed shared id.

---

### Task 1: `public/widget.js` + dev verification harness

**Files:**
- Create: `public/widget.js`
- Create: `public/widget-sample.json`
- Create: `public/widget-test.html`

**Interfaces:**
- Consumes: nothing (standalone). At runtime, a JSON payload shaped `{ location: { name, logoText, colors: { primary } }, reviews: [{ id, author, avatar, rating, source, text, videoUrl, created_at }] }`.
- Produces: a deployed-at-`/widget.js` script driven by `<script data-location data-api data-theme data-layout [data-target]>`.

- [ ] **Step 1: Create `public/widget.js`**

```js
// VouchRank embeddable reviews widget — standalone, dependency-free.
// Usage: <script src=".../widget.js" data-location="<id>" data-api="<widget-reviews-url>"
//                data-theme="dark|light" data-layout="grid|carousel" [data-target="elId"] async></script>
// Renders a location's public reviews into an auto-created container after the
// script tag (or into #data-target if provided). Never throws into the host page.
(function () {
  'use strict';

  var SELF = document.currentScript;
  if (!SELF) return;

  var locationId = SELF.getAttribute('data-location');
  var api = SELF.getAttribute('data-api');
  var theme = SELF.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  var layout = SELF.getAttribute('data-layout') === 'carousel' ? 'carousel' : 'grid';

  if (!locationId || !api) {
    console.warn('[vouchrank] widget.js: data-location and data-api are required.');
    return;
  }

  var target = null;
  var targetId = SELF.getAttribute('data-target');
  if (targetId) target = document.getElementById(targetId);
  if (!target) {
    target = document.createElement('div');
    SELF.parentNode.insertBefore(target, SELF.nextSibling);
  }
  if (target.getAttribute('data-vr-rendered') === '1') return;

  var P = theme === 'light'
    ? { bg: '#f9fafb', card: '#ffffff', border: '#e5e7eb', text: '#374151', strong: '#111827', muted: '#6b7280' }
    : { bg: '#0c0d12', card: 'rgba(17,18,27,0.9)', border: 'rgba(255,255,255,0.06)', text: '#e5e7eb', strong: '#ffffff', muted: '#9ca3af' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function stars(n) {
    var out = '';
    var v = Number(n) || 0;
    for (var i = 0; i < 5; i++) {
      var on = i < v;
      out += '<svg width="12" height="12" viewBox="0 0 24 24" style="vertical-align:middle" fill="' +
        (on ? '#fbbf24' : 'none') + '" stroke="' + (on ? '#fbbf24' : P.muted) +
        '" stroke-width="2"><polygon points="12 2 15 9 22 9 16 14 18 22 12 17 6 22 8 14 2 9 9 9"/></svg>';
    }
    return out;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(); } catch { return ''; }
  }

  function initials(r) {
    if (r.avatar) return r.avatar;
    return r.author ? r.author.slice(0, 2).toUpperCase() : '?';
  }

  function card(r, accent) {
    var badge = r.source ? '<span style="font-size:9px;font-weight:600;padding:2px 6px;border-radius:20px;border:1px solid ' +
      P.border + ';color:' + P.muted + ';text-transform:capitalize">' + esc(r.source) + '</span>' : '';
    var video = r.videoUrl ? '<div style="margin-top:6px;font-size:10px;color:' + accent + '">🎥 Video testimonial</div>' : '';
    return '<div style="flex:0 0 280px;max-width:340px;background:' + P.card + ';border:1px solid ' + P.border +
      ';border-radius:12px;padding:16px;color:' + P.text + ';box-sizing:border-box">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="width:32px;height:32px;border-radius:50%;background:' + accent +
            ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">' +
              esc(initials(r)) + '</div>' +
            '<div><div style="font-size:13px;font-weight:600;color:' + P.strong + '">' + esc(r.author || 'Customer') + '</div>' +
              '<div style="font-size:9px;color:' + P.muted + '">' + esc(fmtDate(r.created_at)) + '</div></div>' +
          '</div>' + badge +
        '</div>' +
        '<div style="margin-bottom:6px">' + stars(r.rating) + '</div>' +
        '<p style="font-size:12px;line-height:1.5;margin:0;font-style:italic">' + esc(r.text || '') + '</p>' + video +
      '</div>';
  }

  function render(data) {
    var loc = data.location || {};
    var accent = (loc.colors && loc.colors.primary) || '#8b5cf6';
    var reviews = data.reviews || [];
    var wrap = layout === 'carousel'
      ? 'display:flex;gap:16px;overflow-x:auto;padding:4px 0'
      : 'display:flex;flex-wrap:wrap;gap:16px';
    var inner = reviews.length
      ? reviews.map(function (r) { return card(r, accent); }).join('')
      : '<div style="font-size:12px;color:' + P.muted + '">No reviews yet.</div>';
    target.innerHTML = '<div class="vr-widget" style="background:' + P.bg +
      ';border-radius:12px;padding:20px;font-family:system-ui,-apple-system,sans-serif">' +
      '<div style="' + wrap + '">' + inner + '</div></div>';
    target.setAttribute('data-vr-rendered', '1');
  }

  var url = api + (api.indexOf('?') === -1 ? '?' : '&') + 'location=' + encodeURIComponent(locationId);
  fetch(url, { method: 'GET' })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(render)
    .catch(function (err) { console.warn('[vouchrank] widget.js: could not load reviews —', err && err.message); });
})();
```

- [ ] **Step 2: Create `public/widget-sample.json`** (dev harness payload; includes a 3-star review to prove no score filtering)

```json
{
  "location": {
    "name": "Austin Dental Care",
    "logoText": "AD",
    "colors": { "primary": "#8b5cf6", "secondary": "#06b6d4" }
  },
  "reviews": [
    { "id": "1", "author": "Maria Gomez", "avatar": "MG", "rating": 5, "source": "google", "text": "Best dental visit I've ever had. The staff was incredibly gentle and thorough.", "videoUrl": null, "created_at": "2026-06-01T12:00:00Z" },
    { "id": "2", "author": "James Lee", "avatar": "JL", "rating": 4, "source": "video", "text": "Quick, professional, and friendly. Highly recommend for families.", "videoUrl": "https://example.com/v.webm", "created_at": "2026-05-20T09:30:00Z" },
    { "id": "3", "author": "Priya N", "avatar": "PN", "rating": 5, "source": "manual", "text": "They explained every step and made me feel at ease.", "videoUrl": null, "created_at": "2026-05-11T16:45:00Z" },
    { "id": "4", "author": "Dan W", "avatar": "DW", "rating": 3, "source": "google", "text": "Good care overall, the wait time was a bit long.", "videoUrl": null, "created_at": "2026-04-28T14:00:00Z" }
  ]
}
```

- [ ] **Step 3: Create `public/widget-test.html`** (loads `/widget.js` twice against the sample JSON; the `?location=` query is ignored by the static file)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>VouchRank widget.js — local test harness</title>
    <style>
      body { margin: 0; padding: 24px; background: #fff; font-family: system-ui, sans-serif; }
      h1 { font-size: 18px; } h2 { font: 600 14px system-ui; color: #374151; }
      section { margin-bottom: 32px; } code { background: #f3f4f6; padding: 1px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>widget.js local test harness</h1>
    <p>Loads <code>/widget.js</code> against <code>/widget-sample.json</code> (the query string is ignored by the static file). Run <code>npm run dev</code> and open this page.</p>

    <section>
      <h2>Grid · dark</h2>
      <script src="/widget.js" data-location="demo" data-api="/widget-sample.json" data-theme="dark" data-layout="grid"></script>
    </section>

    <section>
      <h2>Carousel · light</h2>
      <script src="/widget.js" data-location="demo" data-api="/widget-sample.json" data-theme="light" data-layout="carousel"></script>
    </section>
  </body>
</html>
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: 0 errors (bindingless `catch`, no unused vars, browser globals only).

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: green. Confirm the files are emitted: `dist/widget.js`, `dist/widget-sample.json`, `dist/widget-test.html` exist (Vite copies `public/` verbatim).

- [ ] **Step 6: Manual harness check**

Run: `npm run dev`, open `http://localhost:5173/widget-test.html`.
Expected: a **dark grid** of 4 review cards (5,4,5,3 stars — the 3-star one present, proving no score filter), and a **light carousel** that scrolls horizontally. Stars/avatars/source badges/🎥 video badge render. No console errors that break the page.

- [ ] **Step 7: Commit**

```bash
git add public/widget.js public/widget-sample.json public/widget-test.html
git commit -m "feat(widget): standalone embeddable widget.js + dev test harness"
```

---

### Task 2: `widget-reviews` edge function + config + docs

**Files:**
- Create: `supabase/functions/widget-reviews/index.ts`
- Modify: `supabase/config.toml` (register the function)
- Modify: `ARCHITECTURE.md` (Edge Functions table + a flow line)
- Modify: `BACKEND.md` (Edge Functions table + a widget hosting note)

**Interfaces:**
- Consumes: `supabaseAdmin` from `../_shared/supabaseAdmin.ts`.
- Produces: `GET /functions/v1/widget-reviews?location=<id>` → `{ location: { name, logoText, colors }, reviews: [{ id, author, avatar, rating, source, text, videoUrl, created_at }] }`. This is the shape `widget.js` (Task 1) consumes.

- [ ] **Step 1: Create `supabase/functions/widget-reviews/index.ts`**

```ts
// Public read endpoint for the embeddable widget (verify_jwt=false). Returns a
// location's branding + its public, non-rejected reviews so widget.js can render
// social proof on any third-party site.
//
// CORS is wide-open (Allow-Origin: *) because the widget runs on arbitrary client
// domains — it intentionally does NOT use ../_shared/cors.ts (which locks to
// APP_BASE_URL in production).
//
// Compliant: reviews of ANY rating are returned (no score-based filtering). Only
// is_public reviews that have not been explicitly rejected are included.
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const widgetCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...widgetCors, 'Content-Type': 'application/json', ...extra },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: widgetCors });
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get('location');
    if (!locationId) return json({ error: 'missing_location' }, 400);

    const { data: loc } = await supabaseAdmin
      .from('locations')
      .select('id, name, logo_text, colors')
      .eq('id', locationId)
      .single();
    if (!loc) return json({ error: 'unknown_location' }, 404);

    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select('id, author, avatar, rating, source, text, video_url, created_at')
      .eq('location_id', locationId)
      .eq('is_public', true)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(24);
    if (error) throw error;

    return json(
      {
        location: { name: loc.name, logoText: loc.logo_text, colors: loc.colors || {} },
        reviews: (reviews || []).map((r) => ({
          id: r.id,
          author: r.author,
          avatar: r.avatar,
          rating: r.rating,
          source: r.source,
          text: r.text,
          videoUrl: r.video_url,
          created_at: r.created_at,
        })),
      },
      200,
      { 'Cache-Control': 'public, max-age=300' },
    );
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
```

- [ ] **Step 2: Register the function in `supabase/config.toml`**

After the existing `[functions.submit-review]` block, add:

```toml
[functions.widget-reviews]
verify_jwt = false   # public widget endpoint; read-only, CORS *
```

- [ ] **Step 3: Add the function to the `ARCHITECTURE.md` Edge Functions table**

Insert this row right after the `| `submit-review` | public | … |` row:

```markdown
| `widget-reviews` | public | Returns a location's public, non-rejected reviews for the embeddable widget (CORS `*`, cached 5 min) |
```

Then, in the "Key request flows" section, after the "Customer leaves a review" bullet, add:

```markdown
- **Embedded widget loads:** client site `widget.js` → `widget-reviews` (service role, CORS `*`) → returns `is_public`, non-rejected reviews (any rating) → rendered on the client's page.
```

- [ ] **Step 4: Add the function to the `BACKEND.md` Edge Functions table + a hosting note**

Insert this row right after the `| `submit-review` | public | … |` row:

```markdown
| `widget-reviews` | public | Public reviews for the embeddable widget (CORS `*`) |
```

Then, after the numbered deploy list, add a note:

```markdown
> **Widget hosting:** `public/widget.js` ships in the app build (`dist/widget.js`).
> The embed snippet points at the app origin by default; for production, serve
> `widget.js` from a stable origin/CDN and set client `data-api` to the deployed
> `widget-reviews` URL.
```

- [ ] **Step 5: Lint + build (confirm nothing in the JS app graph broke)**

Run: `npm run lint`  → Expected: 0 errors (the `.ts` function isn't linted).
Run: `npm run build` → Expected: green.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/widget-reviews/index.ts supabase/config.toml ARCHITECTURE.md BACKEND.md
git commit -m "feat(widget): public widget-reviews edge function + config + docs"
```

---

### Task 3: Real embed snippet + aligned preview in `WidgetsDemo`

**Files:**
- Modify: `src/components/WidgetsDemo.jsx`
- Modify: `ROADMAP.md` (check the widget item)

**Interfaces:**
- Consumes: `import.meta.env.VITE_SUPABASE_URL`; the `widget-reviews` URL convention from Task 2; `/widget.js` from Task 1.
- Produces: a copy-pasteable embed snippet that actually works against a deployed backend.

- [ ] **Step 1: Replace the fake snippet + review filter in `src/components/WidgetsDemo.jsx`**

Replace these lines:

```jsx
  const positiveReviews = reviews.filter(r => r.rating >= 4);

  const embedCodeSnippet = `<script src="https://cdn.vouchrank.com/widget.js" data-location="${company.id}" data-theme="${widgetTheme}" data-layout="${widgetLayout}" defer></script>
<div id="vouchrank-widget" data-id="${company.id}"></div>`;
```

with:

```jsx
  // Show the same set the real widget shows: public, non-rejected — any rating
  // (no score filter, per COMPLIANCE.md).
  const positiveReviews = reviews.filter((r) => r.isPublic !== false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const widgetApi = supabaseUrl
    ? `${supabaseUrl}/functions/v1/widget-reviews`
    : 'https://YOUR-PROJECT.supabase.co/functions/v1/widget-reviews';
  const scriptOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.vouchrank.com';

  const embedCodeSnippet = `<script src="${scriptOrigin}/widget.js" data-location="${company.id}" data-api="${widgetApi}" data-theme="${widgetTheme}" data-layout="${widgetLayout}" async></script>`;
```

(The variable stays named `positiveReviews` so the two existing `.map` blocks below are untouched. `widgetLayout` remains the existing `'grid'` default.)

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors (no unused vars; `import.meta.env` is standard Vite).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: green.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, open the app (demo mode), go to **Widgets Showcase** → **Get Embed Code**.
Expected: the snippet is a single `<script src="http://localhost:5173/widget.js" data-location="…" data-api="https://YOUR-PROJECT.supabase.co/functions/v1/widget-reviews" data-theme="dark" data-layout="grid" async></script>` (placeholder API in demo). The preview grids/sliders still render review cards (now filtered by `isPublic`, not rating). Copy button works.

- [ ] **Step 5: Check the ROADMAP item**

In `ROADMAP.md`, Phase 2, change:

```markdown
- ⬜ Real embeddable `widget.js` (the showcase currently previews; ship the actual script + CDN)
```

to:

```markdown
- ✅ Real embeddable `widget.js` (`public/widget.js` + public `widget-reviews` fn; production CDN hosting still TODO)
```

- [ ] **Step 6: Commit**

```bash
git add src/components/WidgetsDemo.jsx ROADMAP.md
git commit -m "feat(widget): real embed snippet + compliant preview filter; roadmap"
```

---

## Self-Review

**1. Spec coverage:**
- `public/widget.js` vanilla, data-* attrs, auto-container, themes, layouts, graceful errors → Task 1. ✓
- `widget-reviews` public fn, own CORS `*`, is_public non-rejected, any rating, limit 24, Cache-Control, created_at raw → Task 2. ✓
- `config.toml` `verify_jwt=false` → Task 2 Step 2. ✓
- WidgetsDemo real snippet (app origin + VITE_SUPABASE_URL) + aligned preview filter → Task 3. ✓
- Dev harness (`widget-test.html` + `widget-sample.json`) → Task 1 Steps 2-3, verified Step 6. ✓
- Docs (ARCHITECTURE map + flow, BACKEND table + hosting note, ROADMAP check) → Task 2 Steps 3-4, Task 3 Step 5. ✓
- Compliance (no score filter) → enforced in Task 1 (`stars`/render show all), Task 2 (query), Task 3 (`isPublic` filter), and the sample's 3-star review. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases". `YOUR-PROJECT.supabase.co` is intentional demo-mode UI copy, not a plan gap. Every code step is complete. ✓

**3. Type consistency:** Payload shape is identical across producer (Task 2: `{ location:{name,logoText,colors}, reviews:[{id,author,avatar,rating,source,text,videoUrl,created_at}] }`), consumer (Task 1 `widget.js` reads exactly these fields), and the harness sample (Task 1 Step 2 matches). `data-api`/`data-location`/`data-theme`/`data-layout` attribute names match between `widget.js` (Task 1) and the generated snippet (Task 3). ✓
