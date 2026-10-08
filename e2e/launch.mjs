import { chromium } from 'playwright';

import { APP_URL, CHROMIUM } from './lib/drive.mjs';

/**
 * The launch screen (components/preloader), as a person sees it.
 *
 * Every other suite runs with `navigator.webdriver` set, which skips the
 * launch screen so they can get on with the app. This one turns the flag off
 * before the first script runs, then checks: the launch screen is up on the
 * first frames, on the shop's navy, with the name where the native splash
 * puts it and the red swoosh drawing itself in under it; it leaves by itself
 * — never before its minimum, never after its cap — and the home is
 * underneath. And with reduced motion asked for, the swoosh is simply there
 * and the screen still comes and goes.
 */
const SHOTS = process.env.SHOTS ?? '/tmp/apa-launch';
const MIN_MS = 1000;
// The cap, plus the fade out, plus a browser's slack.
const MAX_MS = 2600 + 300 + 900;

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

    // How much of the swoosh is showing, 0 to 1: the window it is drawn through.
    const drawn = () =>
      page.evaluate(() => {
        const window = document.querySelector('[data-testid="preloader-swoosh"]');
        return window ? Math.round((window.getBoundingClientRect().width / 360) * 100) / 100 : null;
      });
    const early = await drawn();

    const look = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="preloader"]');
      const imgs = root?.querySelectorAll('img') ?? [];
      const img = imgs[imgs.length - 1];
      const r = img?.getBoundingClientRect();
      return {
        background: root ? getComputedStyle(root).backgroundColor : null,
        cover: root ? root.getBoundingClientRect().width === innerWidth && root.getBoundingClientRect().height === innerHeight : false,
        picture: r ? { w: Math.round(r.width), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) } : null,
        role: root?.getAttribute('role') ?? null,
      };
    });
    check(look.background === 'rgb(8, 22, 51)', 'on the shop’s navy, the same as the native splash', look.background);
    check(look.cover, 'it covers the whole screen');
    check(
      look.picture && Math.abs(look.picture.w - 360) <= 2 && Math.abs(look.picture.cx - 195) <= 2 && Math.abs(look.picture.cy - 422) <= 2,
      'the name is 360 wide and centred, where the native splash leaves it',
      look.picture,
    );
    check(look.role === 'progressbar', 'a screen reader hears a progress indicator', look.role);

    // Sampled until the screen goes: it only ever grows, and it completes.
    const samples = [early];
    for (let v = early; v !== null && v < 1; ) {
      await page.waitForTimeout(60);
      v = await drawn();
      if (v !== null) samples.push(v);
      if (samples.length === 4) await page.screenshot({ path: `${SHOTS}-running.png` });
    }
    const grows = samples.every((v, i) => i === 0 || v >= samples[i - 1]);
    check(early !== null && early < 0.9 && grows && samples.at(-1) === 1, 'the swoosh draws itself in under the name', samples);

    // It goes by itself: not before its minimum, not after its cap.
    await page.waitForSelector('[data-testid="preloader"]', { state: 'detached', timeout: MAX_MS + 2000 });
    const { shownAt, goneAt } = await page.evaluate(() => window.__launch);
    const stayed = Math.round(goneAt - shownAt);
    check(stayed >= MIN_MS, `up for at least its minimum (${MIN_MS} ms)`, stayed);
    check(stayed <= MAX_MS, 'gone within its cap, whatever the network', stayed);

    await page.waitForTimeout(600);
    const home = await page.evaluate(() => document.body.innerText);
    check(/Pièce, référence/.test(home), 'the home is underneath, ready', home.slice(0, 80));
    await page.screenshot({ path: `${SHOTS}-home.png` });
    check(errors.length === 0, 'no errors on the way in', errors.slice(0, 3));
  } catch (e) {
    check(false, 'launch threw', String(e).split('\n')[0]);
  } finally {
    await browser.close();
  }
}

// ---- reduced motion: the swoosh is simply there, and it still hands over
{
  const { browser, page, errors } = await launch({ reducedMotion: 'reduce' });
  try {
    await page.goto(APP_URL, { waitUntil: 'commit', timeout: 120_000 });
    await page.waitForSelector('[data-testid="preloader"]', { timeout: 60_000 });
    await page.waitForTimeout(150);
    const whole = await page.evaluate(() => {
      return Math.round(document.querySelector('[data-testid="preloader-swoosh"]').getBoundingClientRect().width);
    });
    check(whole === 360, 'reduced motion: the swoosh is there from the start, not drawn', whole);
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
