# Real Embeddable widget.js — Design

**Date:** 2026-06-23
**Status:** Approved (pending spec review)
**Roadmap item:** Phase 2 — "Real embeddable `widget.js` (the showcase currently previews; ship the actual script + CDN)"

---

## Goal

Ship the actual embeddable script that the Widgets tab only previews today. A
client pastes a `<script>` tag on their marketing site; it fetches that
location's reviews from a public endpoint and renders a themed carousel or grid.
This turns the showcase into a real, shippable deliverable.

## Non-goals (YAGNI)

- A minification / bundling pipeline for the script (ship readable vanilla JS).
- Embedded video playback inside the widget (show a 🎥 badge + poster/link).
- Pagination / infinite scroll / "load more".
- Per-widget custom CSS or a theme builder beyond dark/light.
- Real CDN provisioning (the snippet uses the app origin; production CDN hosting
  is a deploy-time concern noted in BACKEND.md, not built here).
- A review moderation UI (separate feature). The widget tolerates its absence by
  showing non-rejected reviews.

---

## Architecture

Four small, independently testable units. The embed script is deliberately
framework-free so it stays tiny and can't drag React onto a client's page.

```
client site
  <script src="{appOrigin}/widget.js" data-location data-api data-theme data-layout>
        │  reads its own data-* attributes
        ▼
  GET {data-api}?location={id}                      (cross-origin, no auth)
        │
        ▼
  supabase/functions/widget-reviews  (service_role, CORS *)
        │  returns { location, reviews[] }
        ▼
  widget.js renders carousel|grid into #vouchrank-widget
```

---

## Unit 1: `public/widget.js` (the embed script)

Framework-free vanilla JS, zero dependencies. Vite copies `public/` verbatim to
`dist/`, so the file is served at `/widget.js` in dev and prod with **no
separate build step**.

**Behavior**
- On load, find its own `<script>` element (`document.currentScript`, captured at
  top-level before any async work).
- Read attributes: `data-location` (required), `data-api` (required, the
  widget-reviews function URL), `data-theme` (`dark` | `light`, default `dark`),
  `data-layout` (`carousel` | `grid`, default `grid`).
- Target container: use an existing `#vouchrank-widget` element if present;
  otherwise create a `<div>` and insert it immediately after the script tag.
- Fetch `GET {data-api}?location={id}`. On success, render; on any error or
  non-OK response, render nothing and `console.warn` (never throw — must not
  break the host page).
- Render: a header (location name), then review cards — star rating (filled/empty
  SVG stars), author, avatar initials, italic text, a source badge, and a 🎥
  badge when `source === 'video'`. Carousel = horizontal scroll row; grid =
  responsive `flex-wrap`. Brand accent color from `location.colors.primary`.
- All styles are inline on elements (no global CSS injected) so the widget can't
  fight or be broken by the host page. A single scoping wrapper class
  `vr-widget` namespaces anything that must be a class.
- Empty reviews → a small muted "No reviews yet." line.

**Interface (consumed by the host page)**
```html
<script src="https://app.example.com/widget.js"
        data-location="<uuid>"
        data-api="https://<ref>.supabase.co/functions/v1/widget-reviews"
        data-theme="dark" data-layout="grid" async></script>
<div id="vouchrank-widget"></div>
```

**Idempotency:** guard with `if (window.__vouchrankWidgetLoaded) skip-dup-init`
keyed per target id, so two snippets or a double-include don't double-render the
same container.

---

## Unit 2: `supabase/functions/widget-reviews/index.ts` (public data path)

Mirrors the existing `submit-review` function: public (`verify_jwt = false`),
service-role read.

- **Method:** `GET` (plus `OPTIONS` preflight). Reads `location` from the query
  string.
- **CORS:** its **own** headers — `Access-Control-Allow-Origin: *`,
  `Access-Control-Allow-Methods: GET, OPTIONS`, standard allow-headers. It does
  **not** use `_shared/cors.ts`, because that defaults to `APP_BASE_URL` in
  production, which would block calls from arbitrary client domains.
- **Query:** look up the location (`id, name, logo_text, colors`); 404 if
  unknown. Then select reviews where `location_id = id AND is_public = true AND
  status <> 'rejected'`, `order by created_at desc`, `limit 24`.
- **Caching:** respond with `Cache-Control: public, max-age=300` (5 min). This is
  the right load-control tool for a public read widget (cuts function
  invocations); a per-location "rate limit" like submit-review's is meaningless
  for a read with no per-IP store, so it is intentionally omitted.
- **Response shape** (`created_at` is the raw ISO string; the widget formats it
  client-side to avoid locale formatting in Deno):
  ```json
  {
    "location": { "name": "...", "logoText": "AB", "colors": { "primary": "#8b5cf6", "secondary": "#06b6d4" } },
    "reviews": [
      { "id": "...", "author": "...", "avatar": "AB", "rating": 5, "source": "google", "text": "...", "videoUrl": null, "created_at": "2026-06-01T12:00:00Z" }
    ]
  }
  ```
- Needs **no new external credentials** (only the service-role key already set as
  a Supabase secret), so it is authored now and deploys whenever Phase 1 deploys
  functions.

**Config note:** the new function must be registered in `supabase/config.toml`
with `verify_jwt = false` (like `submit-review`), so the public can call it.

---

## Unit 3: `src/components/WidgetsDemo.jsx` (real snippet + aligned preview)

- Replace the fake `https://cdn.vouchrank.com/widget.js` snippet with a working
  one:
  - `src` = `${window.location.origin}/widget.js`.
  - `data-api` = `${VITE_SUPABASE_URL}/functions/v1/widget-reviews` when
    configured; otherwise a clear `https://YOUR-PROJECT.supabase.co/functions/v1/widget-reviews`
    placeholder in demo mode.
  - carry `data-theme` and `data-layout` through from the current selectors.
- Align the in-app preview's review set with the widget's filter: replace
  `reviews.filter(r => r.rating >= 4)` with `reviews.filter(r => r.isPublic !==
  false)` so the preview reflects what the real widget shows (no score filter).
- Keep the existing copy modal and theme toggle. (Read `VITE_SUPABASE_URL` via
  `import.meta.env`, consistent with `supabaseClient.js`.)

---

## Unit 4: dev verification harness

Because the edge function isn't deployed in demo/dev, ship a tiny static harness
so the script can be visually verified with `npm run dev`:

- `public/widget-sample.json` — a small `{ location, reviews }` payload matching
  the function's response shape.
- `public/widget-test.html` — loads `/widget.js` twice (carousel + grid) with
  `data-api="/widget-sample.json"`. Vite serves the JSON and ignores the
  `?location=` query string, so the fetch resolves to sample data. Open
  `http://localhost:5173/widget-test.html`.

These are dev aids; they ship to `dist/` but are harmless static files.

---

## Data flow (end to end)

1. Agency copies the snippet from the Widgets tab.
2. Client site loads `widget.js`; it reads its `data-*` attributes.
3. Script `GET`s the widget-reviews function with the location id.
4. Function returns branding + public, non-rejected reviews (newest 24).
5. Script renders the themed carousel/grid into the target div.

## Error handling

- Script fetch failure / non-OK / malformed JSON → render nothing, `console.warn`.
- Unknown location → function returns 404; script renders nothing.
- Missing `data-location` or `data-api` → `console.warn` and abort (no throw).
- Host page has no `#vouchrank-widget` → script creates its own container.

## Compliance

The widget shows `is_public = true` and `status <> 'rejected'` reviews of **any
rating**, newest-first. No score-based filtering anywhere in the script or the
function (per COMPLIANCE.md: score-based suppression is prohibited). This is
documented in the function source and the spec.

## Testing / Definition of done

No test runner exists (per AGENTS.md). Verification:
- `npm run lint` → 0 errors.
- `npm run build` → green; confirm `dist/widget.js` and the sample/harness files
  are emitted.
- Manual: `npm run dev`, open `/widget-test.html`, confirm carousel + grid render
  in both dark and light themes against the sample data, stars/badges correct,
  and an empty payload degrades gracefully.

## Files touched

- **Create:** `public/widget.js`, `supabase/functions/widget-reviews/index.ts`,
  `public/widget-test.html`, `public/widget-sample.json`.
- **Modify:** `src/components/WidgetsDemo.jsx`, `supabase/config.toml`
  (register the function with `verify_jwt=false`), `ARCHITECTURE.md` (edge-fn
  map), `ROADMAP.md` (check the item), `BACKEND.md` (deploy + CDN note).
