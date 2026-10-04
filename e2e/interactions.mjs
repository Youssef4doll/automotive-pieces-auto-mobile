import { APP_URL, addBmw, open, scrollTo, tap } from './lib/drive.mjs';

/**
 * The redesign's interactions, driven as a customer drives them: the
 * product page's pinned purchase bar, an incompatible part,
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
// A part that cannot fit: a spark plug on the diesel BMW 320d (the fuel rule,
// lib/fitment-rules on the website). "Not listed for my car" is "to check".
const bmwModels = (await (await fetch(`${SHOP}/api/v1/vehicles/models?make=bmw`)).json()).data;
const e90 = bmwModels.find((m) => m.slug === 'serie-3-e90');
const d320 = (await (await fetch(`${SHOP}/api/v1/vehicles/engines?make=bmw&model=serie-3-e90`)).json()).data.find((e) => /diesel/i.test(e.fuel ?? ''));
const plugs = d320 ? (await (await fetch(`${SHOP}/api/v1/search?q=${encodeURIComponent("bougie d'allumage")}&engine=${d320.id}`)).json()).data.products : [];
const misfit = plugs.find((p) => p.fitment === 'DOES_NOT_FIT' && p.id !== fitting[0]?.id);
void filtres;

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
  check((await says(page, 'Dans le panier')) && (await says(page, 'Voir le panier (1)')), 'product: the bar becomes the cart counter for this part');
  const toastOver = await page.evaluate(() => [...document.querySelectorAll('[aria-live]')].some((e) => e.textContent?.includes('Voir le panier') && e.getBoundingClientRect().top < window.innerHeight - 140));
  check(!toastOver, 'product: no toast floating over the part');
  await page.waitForTimeout(3300);
  check(await says(page, 'Voir le panier (1)'), 'product: the in-cart state stays (no vanishing message)');
  await page.getByRole('button', { name: 'Un de plus' }).last().click();
  await page.waitForTimeout(400);
  check(await says(page, 'Voir le panier (2)'), 'product: + on the bar adds one to the cart');
  await page.getByRole('button', { name: 'Voir le panier (2)' }).click();
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

  // ---- basket: a promo code is the shop's to judge; one it does not know is said, and taken out
  await page.getByText('Vous avez un code promo ?').click();
  await page.getByLabel('Code promo').fill('pas un code');
  await page.getByRole('button', { name: 'Appliquer' }).click();
  await page.waitForTimeout(2500);
  check(await says(page, 'Le code PASUNCODE n’existe pas'), 'basket: an unknown promo code is refused by the shop');

  // ---- incompatible part
  if (misfit) {
    // Drive the 320d for this part, then give the garage back.
    const saved = await page.evaluate(() => localStorage.getItem('apa-vehicle'));
    const bmw = (await (await fetch(`${SHOP}/api/v1/vehicles/makes`)).json()).data.find((m) => m.slug === 'bmw');
    await page.evaluate(
      (v) => localStorage.setItem('apa-vehicle', JSON.stringify({ state: { vehicles: [v], active: v }, version: 0 })),
      { makeId: bmw.id, makeName: 'BMW', makeSlug: 'bmw', modelId: e90.id, modelName: e90.name, modelSlug: e90.slug, engineId: d320.id, engineName: d320.name },
    );
    await go(`/produit/${misfit.slug}`);
    check(await says(page, 'Ne correspond pas à votre BMW Série 3'), 'misfit: the verdict (a spark plug on a diesel)');
    check((await says(page, 'Listée pour')) || (await says(page, 'aucune motorisation')), 'misfit: the reason, from the shop table');
    const before = await badge(page);
    await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
    await page.waitForTimeout(700);
    check(await says(page, 'Ajouter quand même'), 'misfit: adding asks first');
    await page.getByRole('button', { name: 'Ajouter quand même' }).click();
    await page.waitForTimeout(700);
    check((await badge(page)) === before + 1 || (await says(page, 'Dans le panier')), 'misfit: added after the confirmation', { before, after: await badge(page) });
    check(await says(page, 'Voir les pièces qui vont sur ma BMW'), 'misfit: a way to the parts that do fit');
    await page.evaluate((v) => (v ? localStorage.setItem('apa-vehicle', v) : localStorage.removeItem('apa-vehicle')), saved);
    await go('/', 1500);
  } else check(false, 'misfit: an incompatible part exists in the data');

  // ---- photo request (the old /demande-photo, now "Demander à la boutique" photo first): a real photo into the shop's inbox
  await go('/demande-photo', 2500);
  check(page.url().includes('/demande') && page.url().includes('photo=1'), 'photo: the old door opens "Demander à la boutique", photo first', page.url());
  const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
  await page.getByRole('button', { name: 'Choisir une photo' }).click();
  await (await chooser).setFiles(new URL('./fixtures/part.png', import.meta.url).pathname);
  await page.waitForTimeout(1500);
  check((await page.getByRole('button', { name: 'Retirer cette photo' }).count()) === 1, 'photo: the picture is shown with a way to remove it');
  await page.getByLabel('Votre nom', { exact: true }).fill('Client Photo');
  await page.getByLabel('Votre téléphone', { exact: true }).fill('204455661');
  await page.getByRole('button', { name: 'Envoyer à la boutique' }).click();
  await page.waitForTimeout(600);
  check(await says(page, 'Un numéro tunisien compte 8 chiffres'), 'photo: a nine-digit number is refused');
  await page.getByLabel('Votre téléphone', { exact: true }).fill('20 445 566');
  await page.getByRole('button', { name: 'Envoyer à la boutique' }).click();
  await page.waitForTimeout(3000);
  check((await says(page, 'Question envoyée')) && (await says(page, '20 445 566')), 'photo: sent, and the call-back number is repeated');

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
  await page.getByLabel('Rechercher une catégorie…', { exact: true }).fill('frein');
  await page.waitForTimeout(600);
  const listed = await page.evaluate(() => [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((l) => /\d+ pièces?\b/.test(l ?? '')));
  check(listed.length > 0 && listed.every((l) => /frein/i.test(l)), 'catalogue: the filter narrows the families', listed);

  // ---- a maker: its mark, its families with its own counts, and a family opened on it
  const topBrand = (await (await fetch(`${SHOP}/api/v1/catalogue/brands`)).json()).data[0];
  const brandPage = (await (await fetch(`${SHOP}/api/v1/catalogue/brands/${topBrand.slug}`)).json()).data;
  check(
    brandPage.families.length > 0 && brandPage.families.reduce((n, f) => n + f.productCount, 0) === brandPage.brand.productCount,
    'brand api: its families add up to its parts',
    brandPage.families.map((f) => `${f.slug}:${f.productCount}`),
  );
  await go(`/marque/${topBrand.slug}`);
  const brandTiles = await page.locator('[data-testid="brand-families"] [role="button"]').count();
  check(brandTiles === brandPage.families.length, 'brand: one tile per family it has parts in', { brandTiles, families: brandPage.families.length });
  check(await says(page, `Toutes les pièces ${topBrand.name}`), 'brand: then all its parts');
  await page.locator('[data-testid="brand-families"] [role="button"]').first().click();
  await page.waitForTimeout(2500);
  check(
    page.url().includes(`/famille/${brandPage.families[0].slug}`) && page.url().includes(`brand=${topBrand.slug}`),
    'brand: a family opens with the maker chosen',
    page.url(),
  );

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
  await page.getByLabel('N° de série (VIN)', { exact: true }).fill('WBAUF11070E1');
  check(await page.getByRole('button', { name: /Identifier mon véhicule/ }).isDisabled(), 'vin: disabled until 17 characters');
  check(await says(page, '12/17'), 'vin: live counter');
  await page.getByLabel('N° de série (VIN)', { exact: true }).fill('WBAUF11070E123456');
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
