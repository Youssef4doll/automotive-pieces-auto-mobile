import { APP_URL, addBmw, open, scrollTo, tap } from './lib/drive.mjs';
import { inspect } from './lib/inspect.mjs';

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

const VIEWPORTS = [320, 360, 375, 390, 393, 414, 430, 768, 1024];
/** The buying screens are swept at the narrowest phone, the common one and a tablet. */
const SCREEN_VIEWPORTS = [320, 390, 768];
const TAP_FLOOR = 43.5; // 44, less a rounding point

let failures = 0;
const fail = (what, detail) => {
  failures++;
  console.log(`FAIL  ${what}${detail ? ' — ' + JSON.stringify(detail) : ''}`);
};
const check = (cond, what, detail) => (cond ? pass(what, detail) : fail(what, detail));
const pass = (what, detail) => console.log(`ok    ${what}${detail ? ' ' + JSON.stringify(detail) : ''}`);

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

// --------------------------------------------------------------- screens ---
//
// The buying screens, each measured the same way as the home screen. A part
// goes in the basket first, so the basket and checkout are measured full.

for (const width of SCREEN_VIEWPORTS) {
  const { browser, page, errors } = await open({ width });
  try {
    await addBmw(page);
    const screens = [
      ['search', `${APP_URL}/recherche?q=filtre`],
      ['compatible', `${APP_URL}/pieces-compatibles`],
    ];
    for (const [name, url] of screens) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);
      const r = await inspect(page, width);
      if (r.hScroll || r.offscreen.length || r.clipped.length || r.small.length) fail(`${name} ${width}`, r);
      else pass(`${name} ${width}`);
    }

    // Open a part from the list, put it in the basket, then walk the basket
    // and the first checkout step.
    await page.locator('[aria-label*=" DT"]').first().click();
    await page.waitForTimeout(2500);
    let r = await inspect(page, width);
    if (r.hScroll || r.offscreen.length || r.clipped.length || r.small.length) fail(`product ${width}`, r);
    else pass(`product ${width}`);
    await page.getByRole('button', { name: /Ajouter au panier/ }).click();
    await page.waitForTimeout(1200);

    for (const [name, url] of [
      ['cart', `${APP_URL}/panier`],
      ['delivery', `${APP_URL}/commande/livraison`],
      ['account', `${APP_URL}/compte`],
      ['vin', `${APP_URL}/garage/vin`],
      ['makes', `${APP_URL}/garage/ajouter`],
      ['catalogue', `${APP_URL}/catalogue`],
      ['family', `${APP_URL}/famille/freinage`],
      ['brand', `${APP_URL}/marque/bosch`],
      ['garage', `${APP_URL}/garage`],
      ['vehicles', `${APP_URL}/garage/vehicules`],
      ['find', `${APP_URL}/trouver`],
      ['favourites', `${APP_URL}/compte/favoris`],
    ]) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2800);
      r = await inspect(page, width);
      if (r.hScroll || r.offscreen.length || r.clipped.length || r.small.length) fail(`${name} ${width}`, r);
      else pass(`${name} ${width}`);
    }
    if (errors.length) fail(`screens ${width}: page errors`, errors.slice(0, 3));
  } catch (e) {
    fail(`screens ${width}`, { threw: String(e).split('\n')[0] });
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------------ ways ---
//
// The home screen no longer carries the bubble arc: the vehicle line, then
// one link to every way of finding a part.

{
  const { browser, page } = await open({ width: 390 });
  try {
    await addBmw(page);
    await tap(page, 'Accueil');
    await page.waitForTimeout(1800);
    const gone = await page.evaluate(() => !document.body.innerText.includes('Que recherchez-vous'));
    check(gone, 'home: no arc title');
    await tap(page, 'Comment trouver votre pièce ?');
    await page.waitForTimeout(1200);
    check(page.url().endsWith('/trouver'), 'home: the ways link opens /trouver', page.url());
  } catch (e) {
    fail('ways', { threw: String(e).split('\n')[0] });
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------- direction ---

{
  const { browser, page, errors } = await open({ width: 390 });
  try {
    await addBmw(page);
    // The language switcher lives in Compte › Paramètres.
    await page.goto(`${APP_URL}/compte/parametres`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await tap(page, 'العربية');
    await page.waitForTimeout(1500);
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await scrollTo(page, 0);

    const link = await page.evaluate(() => document.body.innerText.includes('كيف نجد قطعتك؟'));
    check(link, 'rtl: the ways link is in Arabic');

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
