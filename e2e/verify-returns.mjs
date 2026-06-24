// One-command UI smoke check: pixel-verifies the post-redirect routing
// (Stripe ?status / Google ?google → correct tab + banner) in DEMO mode.
//
//   npm run verify:ui
//
// Spawns a demo-mode dev server (empty VITE_* → auth bypassed, mock data),
// drives it with headless Chromium, screenshots each screen to e2e/shots/,
// and exits non-zero if any check fails. Pass BASE=<url> to test an already-
// running server instead of spawning one.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || '5180';
const BASE = process.env.BASE || `http://localhost:${PORT}`;
const OUT = 'e2e/shots';
mkdirSync(OUT, { recursive: true });

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server at ${url} did not come up`);
}

// Spawn a demo-mode dev server unless the caller pointed BASE at their own.
let server = null;
if (!process.env.BASE) {
  // Launch Vite via node directly (no npm/shell) so there's no deprecation
  // warning and cleanup is a simple PID kill.
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
    stdio: 'ignore',
  });
  await waitForServer(BASE);
}

function stopServer() {
  if (!server) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/F', '/T', '/PID', String(server.pid)]);
  } else {
    try { process.kill(-server.pid); } catch { try { server.kill('SIGKILL'); } catch { /* gone */ } }
  }
}

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${detail}`);
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  const load = async (path) => {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.sidebar, .harvester-card', { timeout: 15000 });
  };

  // 1) App boots into the dashboard in demo mode (auth bypassed).
  await load('/');
  const demoOk = (await page.locator('.sidebar').count()) > 0;
  await page.screenshot({ path: `${OUT}/01-dashboard.png` });
  record('demo dashboard renders', demoOk, demoOk ? 'sidebar visible (auth bypassed)' : 'no sidebar — not demo mode?');

  // 2) Return-URL cases: [path, active-tab substring, banner kind, banner substring, screenshot]
  const cases = [
    ['/billing?status=success', 'Billing', 'success', 'Subscription updated', '02-stripe-success'],
    ['/billing?status=cancel', 'Billing', 'error', 'Checkout canceled', '03-stripe-cancel'],
    ['/locations?google=connected', 'Branding', 'success', 'Google Business Profile connected', '04-google-connected'],
    ['/locations?google=norefresh', 'Branding', 'error', 'offline access', '05-google-norefresh'],
  ];

  for (const [path, tabLabel, kind, substr, shot] of cases) {
    await load(path);
    const banner = page.locator('.return-notice');
    let bannerText = '';
    let hasKind = false;
    try {
      await banner.waitFor({ state: 'visible', timeout: 5000 });
      bannerText = (await banner.textContent())?.trim() || '';
      hasKind = (await page.locator(`.return-notice-${kind}`).count()) > 0;
    } catch { /* banner missing → fails below */ }
    const activeTab = (await page.locator('.nav-item.active span').first().textContent().catch(() => '')) || '';
    await page.screenshot({ path: `${OUT}/${shot}.png` });

    record(path, activeTab.includes(tabLabel) && bannerText.includes(substr) && hasKind,
      `tab="${activeTab}" banner ${kind}=${hasKind} text="${bannerText.slice(0, 36)}"`);
    record(`${path} — query stripped`, !page.url().includes('?'), `url=${page.url().replace(BASE, '')}`);
  }
} finally {
  await browser.close();
  stopServer();
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed  ·  screenshots in ${OUT}/`);
process.exitCode = failed ? 1 : 0;
