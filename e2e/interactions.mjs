import { APP_URL, addBmw, open, scrollTo, tap } from './lib/drive.mjs';

/**
 * The redesign's interactions, driven as a customer drives them: the
 * product page's pinned purchase bar, an incompatible part, favourites,
 * "only what fits", compatible-first lists, quick add, the garage carousel
 * and its sheets, the VIN flow, the four ways in, the catalogue filter, the
 * guided picker, and the basket. Local shop only — it adds to baskets on
 * this phone, never places an order.
 */
const SHOP = process.env.SHOP_URL ?? 'http://localhost:3000';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(SHOP)) process.exit(1);

let failures = 0;
const check = (cond, what, detail) => {
  if (!cond) failures++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
};
const text = (page) => page.evaluate(() => document.body.innerText);
const says = async (page, s) => (await text(page)).toLowerCase().includes(s.toLowerCase());
const badge = (page) =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('[aria-label*="dans le panier"]')].map((e) => e.getAttribute('aria-label'))[0];
    return el ? Number(el.match(/(\d+) article/)[1]) : 0;
  });

const engine = (await (await fetch(`${SHOP}/api/v1/vehicles/engines?make=bmw&model=serie-1-e87`)).json()).data[0].id;
const fitting = (await (await fetch(`${SHOP}/api/v1/catalogue/products?engine=${engine}&fits=1`)).json()).data.products;
const filtres = (await (await fetch(`${SHOP}/api/v1/catalogue/products?family=filtres&engine=${engine}`)).json()).data.products;
const misfit = filtres.find((p) => p.fitment === 'DOES_NOT_FIT');

const s = await open({ width: 390 });
const { page } = s;
const go = async (path, wait = 2600) => {
  await page.goto(`${APP_URL}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(wait);
};

try {
  await addBmw(page);

  // ---- product: the pinned bar
  await go(`/produit/${fitting[0].slug}`);
  check(await says(page, 'Compatible avec votre BMW Série 1'), 'product: the verdict names the car');
  await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
  await page.waitForTimeout(500);
  check((await says(page, 'Ajouté au panier')) && (await says(page, 'Voir le panier')), 'product: the bar confirms the add itself');
  const toastOver = await page.evaluate(() => [...document.querySelectorAll('[aria-live]')].some((e) => e.textContent?.includes('Voir le panier') && e.getBoundingClientRect().top < window.innerHeight - 140));
  check(!toastOver, 'product: no toast floating over the part');
  await page.waitForTimeout(3300);
  check(await says(page, 'Ajouter au panier'), 'product: the bar returns to the button');
  await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Voir le panier' }).click();
  await page.waitForTimeout(2500);
  check(page.url().endsWith('/panier') && (await says(page, fitting[0].name)), 'product: "Voir le panier" opens the basket with the part', page.url());

  // ---- basket: quantity, total, remove
  const totalOf = async () => {
    // Prices carry direction isolates (LRI/PDI) so they stay left-to-right in Arabic.
    const t = (await text(page)).replace(/[\u2066-\u2069]/g, '');
    const m = t.match(/Total[^\n]*\n?\s*([\d\s]+,\d{2})\s*DT/);
    return m ? Number(m[1].replace(/\s/g, '').replace(',', '.')) : null;
  };
  const t1 = await totalOf();
  const plus = page.getByRole('button', { name: 'Un de plus' }).first();
  if (await plus.count()) {
    await plus.click();
    await page.waitForTimeout(1800);
    const t2 = await totalOf();
    check(t1 !== null && t2 !== null && t2 > t1, 'basket: one more raises the total (priced by the shop)', { t1, t2 });
  } else check(false, 'basket: a quantity control exists');

  // ---- incompatible part
  if (misfit) {
    await go(`/produit/${misfit.slug}`);
    check(await says(page, 'Ne correspond pas à votre BMW Série 1'), 'misfit: the verdict');
    check((await says(page, 'Listée pour')) || (await says(page, 'aucune motorisation')), 'misfit: the reason, from the shop table');
    check((await says(page, 'Voir les véhicules compatibles')) || (await says(page, 'Choisir mon véhicule')), 'misfit: a way out');
    const before = await badge(page);
    await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
    await page.waitForTimeout(700);
    check(await says(page, 'Ajouter quand même'), 'misfit: adding asks first');
    await page.getByRole('button', { name: 'Ajouter quand même' }).click();
    await page.waitForTimeout(700);
    check((await badge(page)) === before + 1 || (await says(page, 'Ajouté au panier')), 'misfit: added after the confirmation', { before, after: await badge(page) });
  } else check(false, 'misfit: an incompatible part exists in the data');

  // ---- favourites
  await go(`/produit/${fitting[0].slug}`);
  await page.getByRole('button', { name: 'Ajouter aux favoris' }).click();
  await page.waitForTimeout(400);
  check((await page.getByRole('button', { name: 'Retirer des favoris' }).count()) === 1, 'favourites: the heart holds');
  await go('/compte/favoris', 3500);
  check((await says(page, fitting[0].name)) && (await says(page, 'DT')), 'favourites: shown as a tile, price read fresh');
  await go(`/produit/${fitting[0].slug}`);
  await page.getByRole('button', { name: 'Retirer des favoris' }).click();
  await page.waitForTimeout(300);
  await go('/compte/favoris');
  check((await says(page, 'Aucun favori')) && (await says(page, 'Parcourir le catalogue')), 'favourites: empty state with a way on');

  // ---- search: what fits first, and only what fits
  await go('/recherche?q=filtre', 3500);
  const verdicts = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-label*=" DT"]')].filter((e) => !/^[\u2066\d\s,]+DT/.test(e.getAttribute('aria-label') ?? '')).map((e) => {
      const t = e.textContent ?? '';
      return t.includes('Compatible avec') ? 'F' : t.includes('Ne correspond pas') ? 'N' : 'U';
    }),
  );
  const firstNot = verdicts.indexOf('N');
  const lastFit = verdicts.lastIndexOf('F');
  check(verdicts.includes('F') && (firstNot === -1 || lastFit < firstNot), 'search: parts that fit come before parts that do not', verdicts.join(''));
  await page.getByRole('switch').first().click();
  await page.waitForTimeout(700);
  const onlyFits = await page.evaluate(() => [...document.querySelectorAll('[aria-label*=" DT"]')].filter((e) => !/^[\u2066\d\s,]+DT/.test(e.getAttribute('aria-label') ?? '')).map((e) => (e.textContent ?? '').includes('Compatible avec')));
  check(onlyFits.length > 0 && onlyFits.every(Boolean), 'search: the switch keeps only confirmed parts', onlyFits.length);

  // ---- family: compatible first, quick add
  await go('/famille/filtres', 3500);
  const tiles = await page.evaluate(() => [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((l) => /Compatible|Incompatible|À vérifier/.test(l ?? '')));
  const firstIncompat = tiles.findIndex((l) => l.includes('Incompatible'));
  const lastCompat = tiles.map((l) => l.includes(', Compatible')).lastIndexOf(true);
  check(lastCompat >= 0 && (firstIncompat === -1 || lastCompat < firstIncompat), 'family: compatible parts first', tiles.length);
  // The family page covers the tab bar, so the proof is the basket itself.
  const quick = page.locator('[aria-label^="Ajouter "][aria-label$=" au panier"]').first();
  const quickName = ((await quick.getAttribute('aria-label')) ?? '').replace(/^Ajouter /, '').replace(/ au panier$/, '');
  await quick.click();
  await page.waitForTimeout(800);
  check(await says(page, 'Ajouté au panier'), 'family: quick add confirms');
  await go('/panier', 3000);
  check(await says(page, quickName), 'family: the quick-added part is in the basket', quickName);

  // ---- catalogue filter
  await go('/catalogue');
  await page.getByLabel('Rechercher une catégorie…').fill('frein');
  await page.waitForTimeout(600);
  const listed = await page.evaluate(() => [...document.querySelectorAll('[aria-label*="pièce(s)"]')].map((e) => e.getAttribute('aria-label')));
  check(listed.length > 0 && listed.every((l) => /frein/i.test(l)), 'catalogue: the filter narrows the families', listed);

  // ---- four ways
  await go('/trouver');
  await tap(page, "J'ai la référence");
  await page.waitForTimeout(1500);
  check(page.url().includes('mode=reference'), 'find: one tap down the reference path', page.url());

  // ---- picker: progress, save confirmation, carousel
  await go('/garage/ajouter');
  check(await says(page, 'Étape 1 sur 3'), 'picker: step 1 of 3');
  await tap(page, 'Renault');
  await page.waitForTimeout(1500);
  check(await says(page, 'Étape 2 sur 3'), 'picker: step 2 of 3');
  await tap(page, 'Clio IV');
  await page.waitForTimeout(1500);
  check(await says(page, 'Étape 3 sur 3'), 'picker: step 3 of 3');
  await tap(page, '1.5 dCi');
  await page.waitForTimeout(1200);
  check(await says(page, 'Renault Clio IV enregistrée'), 'picker: the saved car is confirmed');
  await page.waitForTimeout(2000);
  check((await says(page, 'Renault Clio IV')) && (await page.locator('[style*="width: 18px"]').count()) >= 0, 'garage: shows the new principal');
  const cards = await page.evaluate(() => (document.body.innerText.match(/Voir les pièces compatibles/g) ?? []).length);
  check(cards >= 2, 'garage: a carousel of both cars', cards);
  await page.getByRole('button', { name: 'Rendre principal' }).first().click();
  await page.waitForTimeout(800);
  await go('/');
  check(await says(page, 'BMW Série 1 (E87)'), 'garage: "Rendre principal" switches the car the app answers for');

  // ---- per-car sheet: remove, with a confirmation
  await go('/garage/vehicules');
  const before = await page.evaluate(() => (document.body.innerText.match(/Série 1|Clio IV/g) ?? []).length);
  await page.locator('[aria-label^="Options du véhicule"]').nth(1).click();
  await page.waitForTimeout(700);
  await tap(page, 'Supprimer le véhicule');
  check(await says(page, 'Retirer ce véhicule ?'), 'vehicles: removing asks first');
  await page.getByRole('button', { name: 'Retirer ce véhicule' }).click();
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => (document.body.innerText.match(/Série 1|Clio IV/g) ?? []).length);
  check(after < before, 'vehicles: removed', { before, after });

  // ---- VIN
  await go('/garage/vin');
  await page.getByLabel('N° de série (VIN)').fill('WBAUF11070E1');
  check(await page.getByRole('button', { name: /Identifier mon véhicule/ }).isDisabled(), 'vin: disabled until 17 characters');
  check(await says(page, '12/17'), 'vin: live counter');
  await page.getByLabel('N° de série (VIN)').fill('WBAUF11070E123456');
  await page.getByRole('button', { name: /Identifier mon véhicule/ }).click();
  await page.waitForTimeout(2000);
  check(await says(page, 'Constructeur identifié : BMW'), 'vin: success state names the maker');
  await page.getByRole('button', { name: /Choisir le modèle/ }).click();
  await page.waitForTimeout(2000);
  check(page.url().includes('/garage/ajouter/bmw') && (await says(page, 'Étape 2 sur 3')), 'vin: continues at the model step', page.url());

  // ---- basket: remove everything → empty state
  await go('/panier');
  for (let i = 0; i < 6; i++) {
    const del = page.getByRole('button', { name: /^(Retirer|Un de moins)$/ }).first();
    if (!(await del.count())) break;
    await del.click();
    await page.waitForTimeout(700);
    const minus = page.getByRole('button', { name: /^(Retirer|Un de moins)$/ }).first();
    if (await minus.count()) await minus.click().catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(800);
  check(await says(page, 'Votre panier est vide'), 'basket: empty state after removing everything');
} catch (e) {
  check(false, 'interactions', { threw: String(e).split('\n')[0] });
} finally {
  if (s.errors.length) check(false, 'page errors', s.errors.slice(0, 3));
  await s.browser.close();
}
console.log(failures ? `\n${failures} failing check(s)` : '\nall interactions pass');
process.exit(failures ? 1 : 0);
