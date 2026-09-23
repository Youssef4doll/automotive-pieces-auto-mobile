import { APP_URL, open, scrollTo, tap, tapLabel } from './lib/drive.mjs';
import { inspect } from './lib/inspect.mjs';

/**
 * The shop's own screens, driven the way the owner uses them, against the
 * local shop — plus the staff API's security properties from outside.
 *
 * It signs in with the seed's admin account, moves a test order it places
 * itself, counts stock, adds and removes a photo, changes a family picture
 * and a setting — and puts every one of those back as it found them. It
 * refuses to run against anything but this machine.
 */

const SHOP = process.env.SHOP_URL ?? 'http://localhost:3000';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(SHOP)) {
  console.log(`refusing to run staff journeys against ${SHOP}`);
  process.exit(1);
}
const EMAIL = process.env.STAFF_EMAIL ?? 'admin@automotive-pieces-auto.tn';
const PASSWORD = process.env.STAFF_PASSWORD ?? 'admin1234';
const PHOTO = new URL('./fixtures/part.png', import.meta.url).pathname;

let failures = 0;
const fail = (what, detail) => {
  failures++;
  console.log(`FAIL  ${what}${detail !== undefined ? ' — ' + JSON.stringify(detail) : ''}`);
};
const pass = (what, detail) => console.log(`ok    ${what}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
const check = (cond, what, detail) => (cond ? pass(what, detail) : fail(what, detail));
const text = (page) => page.evaluate(() => document.body.innerText);
const says = async (page, phrase) => (await text(page)).toLowerCase().includes(phrase.toLowerCase());

const api = async (path, { token, method = 'GET', body } = {}) => {
  const res = await fetch(`${SHOP}/api/v1/admin${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

// ---- a test order of our own to move about
const engine = (await (await fetch(`${SHOP}/api/v1/vehicles/engines?make=bmw&model=serie-1-e87`)).json()).data[0].id;
const part = (await (await fetch(`${SHOP}/api/v1/catalogue/products?engine=${engine}&fits=1`)).json()).data.products[0];
const placed = await (
  await fetch(`${SHOP}/api/v1/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Gestion Test',
      phone: '20 555 666',
      governorate: 'Tunis',
      address: '5 rue du Comptoir',
      deliveryMethod: 'DELIVERY',
      paymentMethod: 'COD',
      items: [{ productId: part.id, qty: 1 }],
    }),
  })
).json();
const REF = placed.data.ref;

const session = await open({ width: 390 });
const { page } = session;
try {
  // ---- the door
  await page.goto(`${APP_URL}/compte`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await tapLabel(page, 'Espace boutique');
  await page.waitForTimeout(1500);
  check(page.url().endsWith('/gestion/connexion'), 'door: signed out, the staff area opens on its sign-in', page.url());

  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Mot de passe').fill('not-the-password');
  await tap(page, 'Se connecter');
  await page.waitForTimeout(1500);
  check(await says(page, 'E-mail ou mot de passe incorrect'), 'door: a wrong password is refused, without saying which half');

  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await tap(page, 'Se connecter');
  await page.waitForTimeout(3000);
  check((await says(page, 'Bonjour')) && (await says(page, "Aujourd'hui")), 'dashboard: greets and counts', page.url());
  const saved = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('apa-staff')));
  check(saved.length === 1, 'dashboard: the session is kept in the secret store (localStorage only on web)', saved);

  // ---- the order desk
  await tap(page, 'Commandes');
  await page.waitForTimeout(2000);
  await page.getByLabel('Réf., client, téléphone').fill(REF);
  await page.waitForTimeout(2500);
  check(await says(page, 'Gestion Test'), 'orders: search finds the order by reference', REF);
  await tapLabel(page, `${REF}, Gestion Test`);
  await page.waitForTimeout(2500);
  // Placed without a car, so the vehicle panel must say there is nothing to check — not invent a verdict.
  check((await says(page, '5 rue du Comptoir')) && (await says(page, 'sans véhicule sélectionné')), 'order: address shown, and no fitment invented for a carless order');
  await tap(page, 'Passer à « Confirmée »');
  await page.waitForTimeout(2500);
  check(await says(page, 'Passer à « Préparée »'), 'order: moved to Confirmée, next step offered');
  await tap(page, 'Choisir un autre statut');
  await tap(page, 'Annuler la commande');
  await page.waitForTimeout(800);
  const cancelButtons = await page.getByRole('button', { name: 'Annuler la commande' }).count();
  check(cancelButtons >= 1, 'order: cancelling asks first');
  await page.getByRole('button', { name: 'Annuler la commande' }).last().click();
  await page.waitForTimeout(2500);
  check(await says(page, 'Statut : Annulée'), 'order: cancelled on confirmation');

  // ---- the stock room
  await page.goto(`${APP_URL}/gestion/stock`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.getByLabel('Nom ou référence').fill(part.sku ?? part.name.slice(0, 12));
  await page.waitForTimeout(2500);
  await page.locator(`[aria-label^="${part.name}"]`).first().click();
  await page.waitForTimeout(2500);
  const counted = page.getByLabel('Compté en rayon');
  const before = Number(await counted.inputValue());
  await tapLabel(page, '+1');
  await tap(page, 'Enregistrer le comptage');
  await page.waitForTimeout(2000);
  check(await says(page, `${before + 1} en stock`), 'stock: a count is saved', { before });
  await counted.fill(String(before));
  await tap(page, 'Enregistrer le comptage');
  await page.waitForTimeout(2000);
  check(await says(page, `${before} en stock`), 'stock: and put back');

  const photosBefore = await page.locator('[aria-label^="Photos "]').count();
  const chooser = page.waitForEvent('filechooser');
  await tap(page, 'Choisir une photo');
  await (await chooser).setFiles(PHOTO);
  await page.waitForTimeout(5000);
  const photosAfter = await page.locator('[aria-label^="Photos "]').count();
  check(photosAfter === photosBefore + 1, 'photos: one added from the phone', { photosBefore, photosAfter });
  await page.locator('[aria-label^="Photos "]').last().click();
  await page.waitForTimeout(800);
  await tap(page, 'Supprimer la photo');
  await page.waitForTimeout(2500);
  check((await page.locator('[aria-label^="Photos "]').count()) === photosBefore, 'photos: and deleted again');

  // ---- family pictures
  await page.goto(`${APP_URL}/gestion/familles`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const withPicture = () => page.getByRole('button', { name: 'Revenir au dessin' }).count();
  const picturesBefore = await withPicture();
  const famChooser = page.waitForEvent('filechooser');
  await tap(page, 'Changer la photo', { exact: true });
  await (await famChooser).setFiles(PHOTO);
  await page.waitForTimeout(4000);
  check((await withPicture()) === picturesBefore + 1, 'families: a picture replaces the drawing');
  await tap(page, 'Revenir au dessin');
  await page.waitForTimeout(2500);
  check((await withPicture()) === picturesBefore, 'families: and the drawing comes back');

  // ---- shop details
  await page.goto(`${APP_URL}/gestion/boutique`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check(await says(page, 'À compléter : non affiché aux clients'), 'settings: placeholder contact fields are flagged, not shown as real');
  const hours = page.getByLabel('Horaires');
  const oldHours = await hours.inputValue();
  await hours.fill(`${oldHours} (test)`);
  await scrollTo(page, 'bottom');
  await tap(page, 'Enregistrer');
  await page.waitForTimeout(2000);
  const pub = (await (await fetch(`${SHOP}/api/v1/settings/public`)).json()).data;
  check(JSON.stringify(pub).includes('(test)'), 'settings: the change reaches the public settings');
  await hours.fill(oldHours);
  await scrollTo(page, 'bottom');
  await tap(page, 'Enregistrer');
  await page.waitForTimeout(2000);

  // ---- layout at three widths and in Arabic
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/gestion', '/gestion/commandes', '/gestion/stock', '/gestion/familles', '/gestion/boutique']) {
      await page.goto(`${APP_URL}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2200);
      const r = await inspect(page, width);
      const ok = !r.hScroll && r.offscreen.length === 0 && r.clipped.length === 0 && r.small.length === 0;
      check(ok, `layout ${path} @${width}`, ok ? undefined : r);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });

  // ---- signing out ends it on the shop too
  const token = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('apa-staff'));
    return k ? localStorage.getItem(k) : null;
  });
  await page.goto(`${APP_URL}/gestion`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await scrollTo(page, 'bottom');
  await tap(page, 'Se déconnecter');
  await page.waitForTimeout(2000);
  check((await api('/dashboard', { token })).status === 401, 'sign-out: the token is dead on the shop');
  await page.goto(`${APP_URL}/gestion/commandes`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check(page.url().endsWith('/gestion/connexion'), 'sign-out: the staff screens are behind the door again', page.url());
} catch (e) {
  fail('staff journey', { threw: String(e).split('\n')[0] });
} finally {
  // The one expected console error is the deliberate wrong password's 401.
  const errors = session.errors.filter((e) => !e.includes('status of 401'));
  if (errors.length) fail('staff journey: page errors', errors.slice(0, 3));
  await session.browser.close();
}

// ---- the staff API, attacked from outside
{
  check((await api('/orders')).status === 401, 'api: no token is 401');
  check((await api('/orders', { token: 'A'.repeat(43) })).status === 401, 'api: a forged token is 401');
  const cookie = await fetch(`${SHOP}/api/v1/admin/orders`, { headers: { Cookie: 'apa_session=anything' } });
  check(cookie.status === 401, 'api: the website cookie is not honoured');
  const login = await api('/session', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
  const token = login.json?.data?.token;
  check(Boolean(token), 'api: the admin signs in');
  const patch = await api(`/products/${part.id}`, { token, method: 'PATCH', body: { stockQty: 999 } });
  check(patch.status === 422, 'api: stock cannot be written through the product edit', patch.status);
  const neg = await api(`/products/${part.id}`, { token, method: 'PATCH', body: { priceSell: -1 } });
  check(neg.status === 422, 'api: a negative price is refused');
  const set = await api('/settings', { token, method: 'PATCH', body: { not_a_setting: 'x' } });
  check(set.status === 422, 'api: an unknown setting is refused');
  await api('/session', { token, method: 'DELETE' });
}

console.log(failures ? `\n${failures} failing check(s)` : '\nall staff journeys pass');
process.exit(failures ? 1 : 0);
