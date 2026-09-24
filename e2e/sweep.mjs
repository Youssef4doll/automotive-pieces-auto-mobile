import { APP_URL, addBmw, open } from './lib/drive.mjs';
import { inspect } from './lib/inspect.mjs';

/**
 * Every shopper screen, at every phone width the brief names, in French and
 * in Arabic, with a car in the garage and a part in the basket: no sideways
 * scroll, no clipped text, nothing past the edge, no control under 44pt, no
 * console error. The layout checks (checks.mjs) go deep on a few screens;
 * this goes wide on all of them.
 */
const SHOP = process.env.SHOP_URL ?? 'http://localhost:3000';
const WIDTHS = (process.env.WIDTHS ?? '320,360,375,390,393,414,430').split(',').map(Number);
const LOCALES = (process.env.LOCALES ?? 'fr,ar').split(',');

const engine = (await (await fetch(`${SHOP}/api/v1/vehicles/engines?make=bmw&model=serie-1-e87`)).json()).data[0].id;
const fits = (await (await fetch(`${SHOP}/api/v1/catalogue/products?engine=${engine}&fits=1`)).json()).data.products[0].slug;
const all = (await (await fetch(`${SHOP}/api/v1/catalogue/products?family=filtres&engine=${engine}`)).json()).data.products;
const misfit = all.find((p) => p.fitment === 'DOES_NOT_FIT')?.slug ?? fits;

const ROUTES = [
  '/', '/catalogue', '/garage', '/panier', '/compte',
  '/recherche', '/recherche?q=filtre', '/recherche?mode=reference',
  '/famille/freinage', '/famille/filtres', '/marque/bosch',
  `/produit/${fits}`, `/produit/${misfit}`, '/pieces-compatibles',
  '/garage/ajouter', '/garage/ajouter/bmw', '/garage/vin', '/garage/vehicules', '/trouver',
  '/compte/favoris', '/compte/commandes', '/compte/parametres', '/compte/adresses', '/compte/retrouver',
  '/aide', '/commande/livraison',
];

let failures = 0;
const results = [];
for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    const { browser, page, errors } = await open({ width });
    try {
      await addBmw(page);
      // A part in the basket, so the basket and checkout screens are real.
      await page.goto(`${APP_URL}/produit/${fits}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
      await page.waitForTimeout(600);
      if (locale === 'ar') {
        await page.evaluate(() => localStorage.setItem('apa-locale', 'ar'));
      }
      for (const route of ROUTES) {
        const before = errors.length;
        await page.goto(`${APP_URL}${route}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(2200);
        const r = await inspect(page, width);
        const newErrors = errors.slice(before);
        const bad = r.hScroll || r.offscreen.length || r.clipped.length || r.small.length || newErrors.length;
        if (bad) {
          failures++;
          results.push({ locale, width, route, ...r, errors: newErrors.slice(0, 2) });
          console.log(`FAIL  ${locale} ${width} ${route} ${JSON.stringify({ h: r.hScroll, off: r.offscreen.slice(0, 3), clip: r.clipped.slice(0, 3), small: r.small.slice(0, 3), err: newErrors.slice(0, 1) })}`);
        } else {
          console.log(`ok    ${locale} ${width} ${route}`);
        }
      }
    } catch (e) {
      failures++;
      console.log(`FAIL  ${locale} ${width} threw ${String(e).split('\n')[0]}`);
    } finally {
      await browser.close();
    }
  }
}
console.log(failures ? `\n${failures} failing screen(s)` : '\nevery screen passes at every width');
process.exit(failures ? 1 : 0);
