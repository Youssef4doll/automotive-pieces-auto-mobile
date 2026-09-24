import { chromium } from 'playwright';

/**
 * Driving the real app in a real browser.
 *
 * Everything in `e2e/` runs against `npx expo start --web` rather than a
 * component harness, because every layout bug this repo has shipped was
 * invisible to a clean `tsc` and visible in a screenshot: a tab bar that
 * sheared the descenders off its labels, a chip row squeezed to nothing by a
 * sibling claiming flex, a carousel that drifted a gutter per page, an
 * illustration aligned to the left of a right-to-left screen.
 *
 * Web is not a shipping target — the app is iOS and Android — so these
 * checks prove layout, text fitting, touch-target size and direction, not
 * platform behaviour. Where the two genuinely differ it is written down at
 * the point it matters (see `snapType` in checks.mjs).
 */
export const APP_URL = process.env.APP_URL ?? 'http://localhost:8081';
export const CHROMIUM = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

/**
 * `firstLaunch: true` opens the app as a phone that has never run it, so the
 * welcome shows. Every other suite starts past it — it would otherwise stand
 * in front of the home screen each suite is there to test.
 */
export async function open({ width = 390, height = 844, locale = 'fr-FR', firstLaunch = false } = {}) {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: width < 700,
    hasTouch: true,
    locale,
  });
  if (!firstLaunch) {
    await context.addInitScript(() => {
      try {
        if (!localStorage.getItem('apa-onboarding')) {
          localStorage.setItem('apa-onboarding', JSON.stringify({ state: { done: true }, version: 0 }));
        }
      } catch {}
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200));
  });
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(3500);
  return { browser, page, errors };
}

/**
 * Click the copy of this text that the customer can actually reach.
 *
 * expo-router's tab navigator keeps every tab mounted, so "Voir les pièces
 * compatibles" exists on the home screen and in the garage at the same time
 * and only one of them is on top. Playwright's `:visible` passes for both —
 * they both have a box — so `getByText().first()` clicks whichever is first
 * in the DOM and times out when that one is underneath another screen. That
 * cost an afternoon once.
 *
 * So this hit-tests: for each candidate, ask the document what is at its
 * centre and accept it only when the answer is that node or something inside
 * it. Then click the point rather than the element, which is also what a
 * thumb does.
 *
 * Candidates are tried innermost first. With `exact: false` every ancestor of
 * the label also "contains" the text — the app's root <div> contains all of
 * it — and walking in document order picked the root, passed the hit test
 * (whatever is at the screen's centre is inside the root) and clicked the
 * middle of the screen. "Passer la commande" then silently did nothing, and
 * it looked like the app's bug until a role-based click proved otherwise.
 */
export async function tap(page, text, { exact = true, timeout = 15_000, settle = 1100 } = {}) {
  const deadline = Date.now() + timeout;
  let scrolled = false;
  for (;;) {
    const point = await page.evaluate(
      ({ txt, exact }) => {
        for (const el of [...document.querySelectorAll('div,span,button')].reverse()) {
          const own = (el.textContent || '').trim();
          if (exact ? own !== txt : !own.includes(txt)) continue;
          if (el.children.length > 1) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) continue;
          if (r.y < 0 || r.y > window.innerHeight) continue;
          const x = r.x + r.width / 2, y = r.y + r.height / 2;
          const top = document.elementFromPoint(x, y);
          if (top && (top === el || el.contains(top))) return { x, y };
        }
        return null;
      },
      { txt: text, exact },
    );
    if (point) {
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(settle);
      return;
    }
    // Not on screen: scroll it there, as a thumb would, and look again. The
    // home screen's choices sit below its photograph, so on a short or wide
    // phone they start under the fold.
    if (!scrolled) {
      scrolled = await reveal(page, text, exact);
      if (scrolled) continue;
    }
    if (Date.now() > deadline) throw new Error(`nothing hittable reads "${text}"`);
    await page.waitForTimeout(250);
  }
}

/**
 * Scroll the innermost visible element reading `text` to the middle of the
 * screen. True when it found one to scroll. Screens kept mounted behind the
 * current one are skipped: their elements have no rendered box.
 */
export async function reveal(page, text, exact = true) {
  const done = await page.evaluate(
    ({ txt, exact }) => {
      for (const el of [...document.querySelectorAll('div,span,button,[aria-label]')].reverse()) {
        const own = (el.getAttribute('aria-label') === txt ? txt : (el.textContent || '').trim());
        if (exact ? own !== txt : !own.includes(txt)) continue;
        if (el.children.length > 1 && el.getAttribute('aria-label') !== txt) continue;
        if (el.checkVisibility && !el.checkVisibility()) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        return true;
      }
      return false;
    },
    { txt: text, exact },
  );
  if (done) await page.waitForTimeout(700);
  return done;
}

/** The same, by accessibility label — for controls whose face is an icon. */
export async function tapLabel(page, label, { timeout = 15_000, settle = 1100 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const point = await page.evaluate((lab) => {
      for (const el of document.querySelectorAll(`[aria-label*="${lab}"]`)) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.y < 0 || r.y > window.innerHeight) continue;
        const x = r.x + r.width / 2, y = r.y + r.height / 2;
        const top = document.elementFromPoint(x, y);
        if (top && (top === el || el.contains(top))) return { x, y };
      }
      return null;
    }, label);
    if (point) {
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(settle);
      return;
    }
    if (Date.now() > deadline) throw new Error(`nothing hittable is labelled "${label}"`);
    await page.waitForTimeout(250);
  }
}

/**
 * Move the app's own scroll view.
 *
 * `window.scrollTo` does nothing here: the page does not scroll, a React
 * Native ScrollView inside it does. And there are several — the tab
 * navigator keeps every tab mounted — so "the tallest one" was the hidden
 * home screen while the customer was looking at Compte. This moves the
 * scroller that is actually on top: the one the document says is at its own
 * centre. Then it fires the scroll event the animation worklets listen to.
 */
export async function scrollTo(page, top) {
  await page.evaluate((y) => {
    const scrollers = [...document.querySelectorAll('div')].filter((d) => {
      const s = getComputedStyle(d);
      if (!((s.overflowY === 'auto' || s.overflowY === 'scroll') && d.scrollHeight > d.clientHeight + 20)) return false;
      const r = d.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, window.innerHeight / 2));
      return !!hit && d.contains(hit);
    });
    scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight);
    const el = scrollers[0];
    if (!el) return;
    el.scrollTop = y === 'bottom' ? el.scrollHeight : y;
    el.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, top);
  await page.waitForTimeout(800);
}

/** Put one car in the garage, through the picker the customer uses. */
export async function addBmw(page) {
  await tap(page, 'Je connais ma voiture');
  await tap(page, 'BMW');
  await tap(page, 'Série 1 (E87)');
  await page.waitForTimeout(500);
  await tap(page, '116i');
  await page.waitForTimeout(1600);
}
