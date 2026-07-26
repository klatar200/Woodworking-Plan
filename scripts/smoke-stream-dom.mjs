#!/usr/bin/env node
/**
 * Sprint 66 Attempt 2 — browser DOM census for Suspense stream orphans.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/smoke-stream-dom.mjs
 *   BASE_URL=https://notchplans.com node scripts/smoke-stream-dom.mjs
 *
 * Requires Google Chrome (or Chromium) on PATH / CHROME_PATH.
 * fetch() is NOT enough — postponed `$~` orphans only appear after a real load.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const CHROME =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) =>
    existsSync(p),
  ) ||
  'google-chrome';

/** Public / signed-out reachable routes (private ones redirect). */
const ROUTES = [
  '/',
  '/browse',
  '/browse?page=2',
  '/browse?difficulty=1',
  '/plans/x-leg-tv-stand',
  '/designer',
  '/designer/library',
  '/saved',
  '/shopping-list',
];

async function measure(page, path) {
  const url = `${BASE}${path}`;
  const res = await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });
  // Allow streaming completion scripts + rAF reveal a beat.
  await new Promise((r) => setTimeout(r, 1500));
  const stats = await page.evaluate(() => {
    const html = document.documentElement.outerHTML;
    const mains = document.querySelectorAll('main').length;
    const postponed = (html.match(/<!--\$~-->/g) || []).length;
    const bags = [...document.querySelectorAll('div[hidden][id^="S:"]')].map((el) => ({
      id: el.id,
      bytes: el.innerHTML.length,
      mains: el.querySelectorAll('main').length,
    }));
    bags.sort((a, b) => b.bytes - a.bytes);
    return {
      mains,
      postponed,
      largestBag: bags[0] || null,
      bagCount: bags.length,
      statusHint: document.title,
    };
  });
  return { path, status: res?.status() ?? 0, ...stats };
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  const rows = [];
  for (const path of ROUTES) {
    try {
      rows.push(await measure(page, path));
    } catch (err) {
      rows.push({
        path,
        status: 0,
        mains: -1,
        postponed: -1,
        largestBag: null,
        bagCount: -1,
        error: String(err?.message || err),
      });
    }
  }
  await browser.close();

  console.log(JSON.stringify({ base: BASE, rows }, null, 2));

  // Fail if any public catalog/home/plan route shows >1 main (signed-out designer
  // may redirect — ignore main count when status is 3xx/401/404 from auth).
  const fail = rows.filter((r) => {
    if (r.error) return true;
    if (['/designer', '/designer/library', '/saved', '/shopping-list'].includes(r.path)) {
      // Auth gate: accept redirect or a clean 1-main page.
      if (r.status >= 300 && r.status < 400) return false;
      if (r.status === 404) return false; // Clerk protect sometimes surfaces 404
    }
    return r.mains > 1 || r.postponed > 0;
  });
  if (fail.length) {
    console.error('FAIL orphan/main census:', fail.map((f) => f.path).join(', '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
