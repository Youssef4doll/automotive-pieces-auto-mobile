import { chromium } from 'playwright';

import { APP_URL, CHROMIUM } from './lib/drive.mjs';

/**
 * The launch screen (components/preloader), as a person sees it.
 *
 * Every other suite runs with `navigator.webdriver` set, which skips the
 * launch screen so they can get on with the app. This one turns the flag off
 * before the first script runs, then checks: the launch screen is up on the
 * first frames, on the launch night, with the picture where the native splash
 * puts it; it leaves by itself — never before its minimum, never after its
 * cap — and the home is underneath, filled. And with reduced motion asked
 * for, it still comes and goes, without the running line.
 */
const SHOTS = process.env.SHOTS ?? '/tmp/apa-launch';
const MIN_MS = 900;
// The cap, plus the fade out, plus a browser's slack.
const MAX_MS = 2600 + 320 + 900;

let failures = 0;
const check = (cond, what, detail) => {
  if (!cond) failures++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
};

async function launch({ reducedMotion = 'no-preference' } = {}) {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
    reducedMotion,
  });
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true });
    try {
      localStorage.setItem('apa-onboarding', JSON.stringify({ state: { done: true }, version: 0 }));
    } catch {}
    // Timed in the page, from the frame it appears to the frame it goes: a
    // clock in the test would start whenever the test got round to looking.
    const seen = { shownAt: null, goneAt: null };
    window.__launch = seen;
    new MutationObserver(() => {
      const on = Boolean(document.querySelector('[data-testid="preloader"]'));
      if (on && seen.shownAt === null) seen.shownAt = performance.now();
      if (!on && seen.shownAt !== null && seen.goneAt === null) seen.goneAt = performance.now();
    }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200));
  });
  return { browser, page, errors };
}

// ---- the launch, with motion
{
  const { browser, page, errors } = await launch();
  try {
    // Warm the bundle first: the first load of a dev bundle takes as long as
    // Metro takes, which says nothing about the launch screen.
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForTimeout(4000);
    errors.length = 0;

    await page.goto(APP_URL, { waitUntil: 'commit' });
    await page.waitForSelector('[data-testid="preloader"]', { timeout: 30_000 });
    check(true, 'the launch screen is up on the first frames');

    const look = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="preloader"]');
      const img = root?.querySelector('img');
      const r = img?.getBoundingClientRect();
      return {
        background: root ? getComputedStyle(root).backgroundColor : null,
        cover: root ? root.getBoundingClientRect().width === innerWidth && root.getBoundingClientRect().height === innerHeight : false,
        picture: r ? { w: Math.round(r.width), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) } : null,
        role: root?.getAttribute('role') ?? null,
      };
    });
    check(look.background === 'rgb(5, 16, 34)', 'on the launch night, the same as the native splash', look.background);
    check(look.cover, 'it covers the whole screen');
    check(
      look.picture && Math.abs(look.picture.w - 240) <= 2 && Math.abs(look.picture.cx - 195) <= 2 && Math.abs(look.picture.cy - 422) <= 2,
      'the picture is 240 wide and centred, where the native splash leaves it',
      look.picture,
    );
    check(look.role === 'progressbar', 'a screen reader hears a progress indicator', look.role);

    await page.waitForTimeout(350);
    await page.screenshot({ path: `${SHOTS}-running.png` });

    // It goes by itself: not before its minimum, not after its cap.
    await page.waitForSelector('[data-testid="preloader"]', { state: 'detached', timeout: MAX_MS + 2000 });
    const { shownAt, goneAt } = await page.evaluate(() => window.__launch);
    const stayed = Math.round(goneAt - shownAt);
    check(stayed >= MIN_MS, `up for at least its minimum (${MIN_MS} ms)`, stayed);
    check(stayed <= MAX_MS, 'gone within its cap, whatever the network', stayed);

    await page.waitForTimeout(600);
    const home = await page.evaluate(() => document.body.innerText);
    check(/La bonne pièce/.test(home), 'the home is underneath, ready', home.slice(0, 80));
    await page.screenshot({ path: `${SHOTS}-home.png` });
    check(errors.length === 0, 'no errors on the way in', errors.slice(0, 3));
  } catch (e) {
    check(false, 'launch threw', String(e).split('\n')[0]);
  } finally {
    await browser.close();
  }
}

// ---- reduced motion: it still hands over, without the light or the running line
{
  const { browser, page, errors } = await launch({ reducedMotion: 'reduce' });
  try {
    await page.goto(APP_URL, { waitUntil: 'commit', timeout: 120_000 });
    await page.waitForSelector('[data-testid="preloader"]', { timeout: 60_000 });
    const parts = await page.evaluate(() => document.querySelector('[data-testid="preloader"]').querySelectorAll('svg').length);
    check(parts === 0, 'reduced motion: no light sweeping the glass', parts);
    await page.screenshot({ path: `${SHOTS}-reduced.png` });
    await page.waitForSelector('[data-testid="preloader"]', { state: 'detached', timeout: MAX_MS + 2000 });
    check(true, 'reduced motion: it still leaves');
    check(errors.length === 0, 'reduced motion: no errors', errors.slice(0, 3));
  } catch (e) {
    check(false, 'reduced motion threw', String(e).split('\n')[0]);
  } finally {
    await browser.close();
  }
}

console.log(failures ? `\n${failures} failure(s)` : '\nthe launch screen comes and goes as it should');
process.exit(failures ? 1 : 0);
