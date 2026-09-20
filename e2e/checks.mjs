import { addBmw, open, scrollTo, tap } from './lib/drive.mjs';

/**
 * The checks that catch what a typecheck cannot.
 *
 * Three groups, all of them things that have actually been shipped broken:
 *
 *   layout    — text clipped, a control off the edge, a touch target under
 *               the 44pt floor, the page scrolling sideways;
 *   arc       — the home screen's discovery arc actually lifting, scaling and
 *               snapping, rather than rendering as a flat row;
 *   direction — Arabic mirroring, including the parts that `row-reverse` does
 *               not mirror on its own.
 *
 * A missing precondition is a FAIL, not a skip. A check that cannot find the
 * arc must say so loudly; one that quietly passes because it measured nothing
 * is worse than no check, which is a lesson from the website's suite.
 *
 * Run: npx expo start --web, then `npm run e2e`.
 */

const VIEWPORTS = [320, 360, 375, 390, 414, 430, 768];
const TAP_FLOOR = 43.5; // 44, less a rounding point

let failures = 0;
const fail = (what, detail) => {
  failures++;
  console.log(`FAIL  ${what}${detail ? ' — ' + JSON.stringify(detail) : ''}`);
};
const pass = (what, detail) => console.log(`ok    ${what}${detail ? ' ' + JSON.stringify(detail) : ''}`);

/** Everything measurable about one rendered screen. */
async function inspect(page, width) {
  return page.evaluate((W) => {
    const out = { hScroll: document.documentElement.scrollWidth > W + 1, offscreen: [], clipped: [], small: [] };
    const seen = new Set();

    /** Is this node inside something that scrolls sideways on purpose? */
    const inHorizontalScroller = (el) => {
      let n = el.parentElement;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 4) return true;
        n = n.parentElement;
      }
      return false;
    };

    for (const el of document.querySelectorAll('div,span,button')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.top < -200 || r.top > window.innerHeight + 2000) continue;
      const cs = getComputedStyle(el);
      const text = (el.textContent || '').trim();

      if (el.children.length === 0 && text) {
        // Clipped text. An ellipsis is not clipping — `numberOfLines` is a
        // deliberate choice and renders as -webkit-line-clamp or
        // text-overflow, so both are excluded. An earlier version of this
        // check reported every truncated product name and was wrong.
        if (
          el.scrollWidth > el.clientWidth + 2 &&
          cs.overflow !== 'visible' &&
          !cs.textOverflow.includes('ellipsis') &&
          cs.webkitLineClamp === 'none'
        ) {
          const k = 'clip:' + text.slice(0, 28);
          if (!seen.has(k)) { seen.add(k); out.clipped.push({ text: text.slice(0, 28), want: el.scrollWidth, got: el.clientWidth }); }
        }
        if (r.right > W + 1 && !inHorizontalScroller(el)) {
          const k = 'off:' + text.slice(0, 24);
          if (!seen.has(k)) { seen.add(k); out.offscreen.push({ text: text.slice(0, 24), right: Math.round(r.right) }); }
        }
      }

      if (el.getAttribute('role') === 'button' || el.tagName === 'BUTTON') {
        if (r.height < 43.5 || r.width < 43.5) {
          const name = el.getAttribute('aria-label') || text.slice(0, 24);
          const k = `tap:${name}:${Math.round(r.width)}x${Math.round(r.height)}`;
          if (!seen.has(k)) { seen.add(k); out.small.push({ control: name, w: Math.round(r.width), h: Math.round(r.height) }); }
        }
      }
    }
    return out;
  }, width);
}

/** The arc's cards, as the browser has actually laid them out. */
async function readArc(page, activeTitle) {
  return page.evaluate((title) => {
    const label = [...document.querySelectorAll('div')].find(
      (d) => d.children.length === 0 && d.textContent.trim() === title,
    );
    if (!label) return null;
    let scroller = label;
    while (scroller && !(scroller.scrollWidth > scroller.clientWidth + 8)) scroller = scroller.parentElement;
    if (!scroller) return null;
    const track = scroller.firstElementChild;
    const read = (el) => {
      const m = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
      const n = m ? m[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0];
      return { scale: Number(n[0].toFixed(3)), y: Math.round(n[5]), opacity: Number(getComputedStyle(el).opacity) };
    };
    return {
      snapType: getComputedStyle(scroller).scrollSnapType,
      clientWidth: scroller.clientWidth,
      scrollLeft: Math.round(scroller.scrollLeft),
      slide: Math.round(track.children[0].getBoundingClientRect().width),
      cards: [...track.children].map(read),
    };
  }, activeTitle);
}

// ---------------------------------------------------------------- layout ---

for (const width of VIEWPORTS) {
  const { browser, page, errors } = await open({ width });
  try {
    await addBmw(page);
    await tap(page, 'Accueil');
    await page.waitForTimeout(1500);
    const r = await inspect(page, width);
    const bad = r.hScroll || r.offscreen.length || r.clipped.length || r.small.length || errors.length;
    if (bad) fail(`layout ${width}`, { ...r, errors });
    else pass(`layout ${width}`);
  } catch (e) {
    fail(`layout ${width}`, { threw: String(e).split('\n')[0] });
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------------- arc ---

{
  const { browser, page } = await open({ width: 390 });
  try {
    await addBmw(page);
    await tap(page, 'Accueil');
    await page.waitForTimeout(1600);

    const rest = await readArc(page, 'Pour mon véhicule');
    if (!rest) fail('arc: not found on the home screen');
    else {
      // The dome: the active card is upright and its neighbours fall away.
      const [a, b, c] = rest.cards;
      if (rest.cards.length < 3) fail('arc: fewer than three cards with a vehicle set', rest.cards.length);
      else if (!(a.y === 0 && a.scale === 1 && b.y > a.y && c.y > b.y && b.scale < a.scale && c.scale < b.scale))
        fail('arc: cards are not on an arc at rest', rest.cards);
      else pass('arc: dome at rest', rest.cards);

      if (!(b.opacity < a.opacity && c.opacity < b.opacity)) fail('arc: neighbours are not dimmed', rest.cards);
      else pass('arc: neighbours dimmed');

      // Snapping. `snapToInterval` is real on iOS and Android and a no-op on
      // react-native-web, so the component also sets CSS scroll-snap; this
      // asserts the web half, which is the half this check can see.
      if (!rest.snapType.startsWith('x ')) fail('arc: no horizontal snapping', rest.snapType);
      else pass('arc: snapping', rest.snapType);

      // Peeking: a slide must be narrower than the viewport or nothing shows
      // at the edge and the row looks like it ends.
      if (!(rest.slide < rest.clientWidth - 40)) fail('arc: no peek', { slide: rest.slide, width: rest.clientWidth });
      else pass('arc: peek', { slide: rest.slide, width: rest.clientWidth });

      // Drive it one page and check the dome travelled with the scroll.
      await page.evaluate((slide) => {
        const label = [...document.querySelectorAll('div')].find(
          (d) => d.children.length === 0 && d.textContent.trim() === 'Pour mon véhicule',
        );
        let n = label;
        while (n && !(n.scrollWidth > n.clientWidth + 8)) n = n.parentElement;
        n.scrollLeft = slide;
        n.dispatchEvent(new Event('scroll', { bubbles: true }));
      }, rest.slide);
      await page.waitForTimeout(700);
      const moved = await readArc(page, 'Pour mon véhicule');
      const [x, y] = moved.cards;
      if (!(y.scale > 0.99 && Math.abs(y.y) < 2 && x.y > y.y))
        fail('arc: the dome did not follow the scroll', moved.cards);
      else pass('arc: follows the scroll', moved.cards);
    }
  } catch (e) {
    fail('arc', { threw: String(e).split('\n')[0] });
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------- direction ---

{
  const { browser, page, errors } = await open({ width: 390 });
  try {
    await addBmw(page);
    await tap(page, 'Accueil');
    await page.waitForTimeout(1400);
    await scrollTo(page, 'bottom');
    await tap(page, 'العربية');
    await page.waitForTimeout(2000);
    await scrollTo(page, 0);

    // The arc runs the other way: card 01 sits at the right-hand end, which
    // is where an Arabic reader starts, and the view opens on it.
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('div')]
        .filter((d) => d.children.length === 0 && ['01', '02', '03'].includes(d.textContent.trim()))
        .map((d) => ({ n: d.textContent.trim(), x: Math.round(d.getBoundingClientRect().x) }))
        .sort((a, b) => a.x - b.x)
        .map((d) => d.n),
    );
    if (order.join('') !== '030201') fail('rtl: the arc did not reverse', order);
    else pass('rtl: arc reversed', order);

    // Anything in a COLUMN has to be aligned per-language by hand; the three
    // that were wrong are the hero logo, the garage's active-vehicle badge
    // and the quick-action tiles' icons. All three should now sit right.
    const logo = await page.evaluate(() => {
      // An `accessibilityLabel` on an expo-image lands on the web as `alt`,
      // not `aria-label` — the first version of this check looked for the
      // wrong attribute and reported the logo missing on a screen where it
      // was plainly there.
      const el = document.querySelector('img[alt="Automotive Pièces Auto"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.x), fromRight: Math.round(window.innerWidth - r.right) };
    });
    if (!logo) fail('rtl: the logo was not found');
    else if (logo.fromRight > logo.left) fail('rtl: the logo is still pinned left on an Arabic screen', logo);
    else pass('rtl: logo mirrored', logo);

    const r = await inspect(page, 390);
    if (r.hScroll || r.clipped.length || r.small.length || errors.length) fail('rtl: layout', { ...r, errors });
    else pass('rtl: layout');
  } catch (e) {
    fail('rtl', { threw: String(e).split('\n')[0] });
  } finally {
    await browser.close();
  }
}

console.log(failures ? `\n${failures} failing check(s)` : '\nall checks pass');
process.exit(failures ? 1 : 0);
