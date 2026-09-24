import { APP_URL, addBmw, open, tap, tapLabel } from './lib/drive.mjs';

/**
 * The eight people the redesign brief asked the app to serve, walked end to
 * end in the real app against the real shop:
 *
 *   1  "I know my car but not the part."
 *   2  "I know I need brake pads."
 *   3  "I have a part reference."
 *   4  "I don't know what the part is called."
 *   5  "I already have a saved vehicle."
 *   6  "I have more than one car."
 *   7  "I want to buy again."
 *   8  "I want to check my order."
 *
 * Plus the order API's security properties, asserted from outside the way
 * an attacker would try them.
 *
 * THIS PLACES REAL ORDERS. It refuses to run unless the shop it would order
 * from is on this machine, because a test suite that could put a cash-on-
 * delivery order into production would put a real delivery van on a real
 * road. Set E2E_ALLOW_ORDERS=1 to override for a staging shop, deliberately.
 */

const SHOP = process.env.SHOP_URL ?? 'http://localhost:3000';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(SHOP) && process.env.E2E_ALLOW_ORDERS !== '1') {
  console.log(`refusing to place orders against ${SHOP} — set E2E_ALLOW_ORDERS=1 if that is really intended`);
  process.exit(1);
}

let failures = 0;
const fail = (what, detail) => {
  failures++;
  console.log(`FAIL  ${what}${detail !== undefined ? ' — ' + JSON.stringify(detail) : ''}`);
};
const pass = (what, detail) => console.log(`ok    ${what}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
const check = (cond, what, detail) => (cond ? pass(what, detail) : fail(what, detail));

/**
 * Visible text of the whole page, for "does it say X" assertions.
 *
 * `innerText` applies CSS text-transform, so a label drawn in capitals comes
 * back as "VOS VÉHICULES" — which is why `says` compares without case.
 */
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const says = (text, phrase) => text.toLowerCase().includes(phrase.toLowerCase());

async function journey(name, fn) {
  const session = await open({ width: 390 });
  try {
    await fn(session);
  } catch (e) {
    fail(name, { threw: String(e).split('\n')[0] });
  } finally {
    if (session.errors.length) fail(`${name}: page errors`, session.errors.slice(0, 3));
    await session.browser.close();
  }
}

/** Fill the two checkout steps and place the order; returns its reference. */
async function checkout(page) {
  await page.goto(`${APP_URL}/panier`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /Passer la commande/ }).click();
  await page.waitForTimeout(1800);
  await page.getByLabel('Nom et prénom', { exact: true }).fill('Test Journées');
  await page.getByLabel('Téléphone', { exact: true }).fill('20 111 222');
  await tapLabel(page, 'Gouvernorat');
  await tap(page, 'Ariana');
  await page.getByLabel('Adresse', { exact: true }).fill('3 rue du Test, Ariana');
  await tap(page, 'Continuer');
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /Confirmer la commande/ }).click();
  await page.waitForTimeout(4500);
  const text = await bodyText(page);
  return text.match(/CMD-\d+/)?.[0] ?? null;
}

// 1 — knows the car, not the part: the garage leads to confirmed parts.
await journey('1 car, no part', async ({ page }) => {
  await addBmw(page);
  await page.goto(`${APP_URL}/pieces-compatibles`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const cards = await page.locator('[aria-label*=" DT"]').count();
  check(cards > 0, '1 car, no part: confirmed parts listed', { cards });
  await page.locator('[aria-label*=" DT"]').first().click();
  await page.waitForTimeout(2500);
  check((await bodyText(page)).includes('Compatible avec votre BMW'), '1 car, no part: the part page says it fits, naming the car');
});

// 2 — knows it is brake pads: search finds them, with the family on offer.
await journey('2 brake pads', async ({ page }) => {
  await page.goto(`${APP_URL}/recherche`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.keyboard.type('plaquettes', { delay: 30 });
  await page.waitForTimeout(2200);
  const text = await bodyText(page);
  check(/Kit de plaquettes/i.test(text), '2 brake pads: parts found as typed');
  check(text.includes('Freinage'), '2 brake pads: the family is offered too');
});

// 3 — has a reference: the exact part comes first and says so.
await journey('3 reference', async ({ page }) => {
  await page.goto(`${APP_URL}/recherche?mode=reference`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // Typed the way it is written on nothing in particular: lower case, a space
  // where the catalogue has a hyphen. The shop matches references stripped.
  await page.keyboard.type('br 4820', { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const text = await bodyText(page);
  check(text.includes('Référence exacte'), '3 reference: the exact match is labelled');
});

// 4 — doesn't know the name: the photo route exists only when the shop can answer.
await journey('4 no name', async ({ page }) => {
  const settings = await (await fetch(`${SHOP}/api/v1/settings/public`)).json();
  const c = settings.data.contact;
  const reachable = Boolean(c.whatsapp || c.phone || c.email);
  const labels = await page.evaluate(() => [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')));
  const offered = labels.includes('Photo / Expert');
  check(offered === reachable, '4 no name: offered exactly when the shop has a channel', { reachable, offered });
});

// 5 — a saved car: search results are judged against it, and say which car.
await journey('5 saved car', async ({ page }) => {
  await addBmw(page);
  await page.goto(`${APP_URL}/recherche?q=filtre`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const text = await bodyText(page);
  check(text.includes('BMW Série 1 (E87) · 116i'), '5 saved car: the vehicle bar names the car');
  check(/Compatible avec votre véhicule|Compatibilité à vérifier|Ne correspond pas/.test(text), '5 saved car: results carry a verdict');
});

// 6 — two cars: the picker offers the saved ones and switching is one tap.
await journey('6 two cars', async ({ page }) => {
  await addBmw(page);
  await tap(page, 'Accueil');
  await page.goto(`${APP_URL}/garage/ajouter`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await tap(page, 'Renault');
  await page.waitForTimeout(800);
  await tap(page, 'Clio IV');
  await page.waitForTimeout(800);
  await tap(page, '1.5 dCi');
  await page.waitForTimeout(1500);
  await page.goto(`${APP_URL}/garage/ajouter`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const text = await bodyText(page);
  check(
    says(text, 'Véhicules récents') && says(text, 'BMW Série 1') && says(text, 'Renault Clio IV'),
    '6 two cars: both are one tap away',
  );
});

// 7 + 8 — place an order, track it, buy it again.
await journey('7/8 order, track, again', async ({ page }) => {
  await addBmw(page);
  await page.goto(`${APP_URL}/pieces-compatibles`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.locator('[aria-label^="Ajouter "][aria-label$=" au panier"]').first().click();
  await page.waitForTimeout(1200);
  const ref = await checkout(page);
  check(Boolean(ref), '8 order: placed and numbered', ref);
  if (!ref) return;

  await page.getByRole('button', { name: 'Suivre ma commande' }).click();
  await page.waitForTimeout(3000);
  const text = await bodyText(page);
  check(text.includes('En attente') && text.includes('Nous confirmons votre commande'), '8 track: status and next step shown');

  await page.getByRole('button', { name: /Commander à nouveau/ }).click();
  await page.waitForTimeout(1500);
  const badge = await page.evaluate(() => [...document.querySelectorAll('[aria-label*="dans le panier"]')].map((e) => e.getAttribute('aria-label'))[0] ?? null);
  check(Boolean(badge), '7 again: the parts are back in the basket', badge);
});

// The order API, attacked from outside.
{
  const engine = (await (await fetch(`${SHOP}/api/v1/vehicles/engines?make=bmw&model=serie-1-e87`)).json()).data[0].id;
  const product = (await (await fetch(`${SHOP}/api/v1/catalogue/products?engine=${engine}&fits=1`)).json()).data.products[0];
  const place = (body) =>
    fetch(`${SHOP}/api/v1/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const base = {
    customerName: 'Sécurité Test',
    phone: '20 333 444',
    governorate: 'Tunis',
    address: '1 rue du Contrôle',
    deliveryMethod: 'DELIVERY',
    paymentMethod: 'COD',
    items: [{ productId: product.id, qty: 1, price: 0.01 }],
  };

  const bad = await place({ ...base, customerName: 'x@y.tn' });
  check(bad.status === 422 && (await bad.json()).field === 'customerName', 'api: an e-mail is not a name');

  const res = await place(base);
  const { data } = await res.json();
  check(res.ok && data.order.items[0].unitPrice === product.price, 'api: a price in the body is ignored', data?.order?.items?.[0]?.unitPrice);

  const get = (ref, token) => fetch(`${SHOP}/api/v1/orders/${ref}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  check((await get(data.ref, data.token)).status === 200, 'api: the token opens its order');
  check((await get(data.ref)).status === 401, 'api: no token is 401');
  check((await get(data.ref, 'A'.repeat(43))).status === 404, 'api: a forged token is 404');
  const other = `CMD-${Number(data.ref.split('-')[1]) - 1}`;
  check((await get(other, data.token)).status === 404, 'api: a token does not open the order next to it');

  const lookup = (ref, phone) =>
    fetch(`${SHOP}/api/v1/orders/lookup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, phone }) });
  check((await lookup(data.ref, '99 999 999')).status === 404, 'api: the wrong phone recovers nothing');
  const found = await lookup(data.ref.toLowerCase(), '+216 20333444');
  check(found.status === 200, 'api: the right phone, written differently, recovers it');
}

console.log(failures ? `\n${failures} failing check(s)` : '\nall journeys pass');
process.exit(failures ? 1 : 0);
