// UI smoke check: review moderation approve/reject/restore in DEMO mode.
//
//   npm run verify:moderation
//
// Spawns a demo-mode dev server (empty VITE_* → auth bypassed, mock data),
// drives it with headless Chromium, and exits non-zero if any check fails.
// Pass BASE=<url> to test an already-running server instead of spawning one.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || '5181';
const BASE = process.env.BASE || `http://localhost:${PORT}`;
const OUT = 'e2e/shots';
mkdirSync(OUT, { recursive: true });

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server at ${url} did not come up`);
}

let server = null;
if (!process.env.BASE) {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    env: { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
    stdio: 'ignore',
  });
  await waitForServer(BASE);
}
function stopServer() {
  if (!server) return;
  if (process.platform === 'win32') spawn('taskkill', ['/F', '/T', '/PID', String(server.pid)]);
  else { try { process.kill(-server.pid); } catch { try { server.kill('SIGKILL'); } catch { /* gone */ } } }
}

const results = [];
const record = (name, pass, detail) => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} — ${detail}`); };

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.sidebar', { timeout: 15000 });
  await page.click('#tab-btn-reviews');
  await page.waitForSelector('#btn-filter-pending', { timeout: 10000 });

  // 1) Pending card shows a count and filters to pending.
  await page.click('#btn-filter-pending');
  const pendingCards = await page.locator('.review-tag.status-pending').count();
  record('pending filter shows pending reviews', pendingCards > 0, `${pendingCards} pending cards`);

  // 2) Approve the first pending review → its Approve button disappears.
  const approveBtn = page.locator('[id^="btn-approve-review-"]').first();
  const approveId = await approveBtn.getAttribute('id');
  await approveBtn.click();
  await page.click('#btn-status-all');
  const approveGone = (await page.locator(`[id="${approveId}"]`).count()) === 0;
  record('approve flips status', approveGone, `${approveId} no longer pending`);

  // 3) Reject flow: confirm is disabled until a reason is chosen.
  const rejectBtn = page.locator('[id^="btn-reject-review-"]').first();
  const rid = (await rejectBtn.getAttribute('id')).replace('btn-reject-review-', '');
  await rejectBtn.click();
  const confirm = page.locator(`#btn-confirm-reject-${rid}`);
  const disabledFirst = await confirm.isDisabled();
  await page.click(`#reason-spam-${rid}`);
  const enabledAfter = !(await confirm.isDisabled());
  record('reject requires a reason', disabledFirst && enabledAfter, `disabled→${disabledFirst}, enabled→${enabledAfter}`);

  // 4) Confirm reject → review shows rejected badge.
  await confirm.click();
  await page.click('#btn-status-rejected');
  const rejectedCards = await page.locator('.review-tag.status-rejected').count();
  record('confirm reject shows rejected', rejectedCards > 0, `${rejectedCards} rejected cards`);

  // 5) Restore → returns to pending.
  const restoreBtn = page.locator('[id^="btn-restore-review-"]').first();
  await restoreBtn.click();
  await page.click('#btn-status-rejected');
  const stillRejected = await page.locator('.review-tag.status-rejected').count();
  record('restore clears rejection', stillRejected < rejectedCards, `rejected ${rejectedCards}→${stillRejected}`);

  await page.screenshot({ path: `${OUT}/06-moderation.png` });
} finally {
  await browser.close();
  stopServer();
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed  ·  screenshot in ${OUT}/`);
process.exitCode = failed ? 1 : 0;
