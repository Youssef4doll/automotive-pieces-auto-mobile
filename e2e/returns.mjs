import { APP_URL, open, tap } from './lib/drive.mjs';

/**
 * Returns, in the app, end to end: a delivered order shows "Retours et
 * garantie"; the request screen walks the part, the reason (with its
 * deadline and — for the shop's own errors — "à notre charge"), the details
 * the reason asks for; the app refuses to send without the "never fitted"
 * declaration; the request is sent, appears on the order, is withdrawn; a
 * second is answered by the staff screens and the customer sees the answer.
 * Then the guarantee page and its door from a product.
 *
 * Local shop only — it writes an order and moves it. Screenshots go to SHOTS.
 */
const SHOP = process.env.SHOP_URL ?? 'http://localhost:3000';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(SHOP)) {
  console.error('returns: refuses anything but a local shop');
  process.exit(1);
}
const SHOTS = process.env.SHOTS ?? '/tmp/apa-returns';
const EMAIL = process.env.STAFF_EMAIL ?? 'admin@automotive-pieces-auto.tn';
const PASSWORD = process.env.STAFF_PASSWORD ?? 'admin1234';

let failures = 0;
const check = (cond, what, detail) => {
  if (!cond) failures++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
};
const json = async (path, init = {}) => {
  const res = await fetch(`${SHOP}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const part = (await json('/api/v1/catalogue/products?inStock=1')).body.data.products[0];
const placed = await json('/api/v1/orders', {
  method: 'POST',
  body: JSON.stringify({
    customerName: 'Sami Ben Ali',
    phone: '22334455',
    governorate: 'Sfax',
    address: '12 rue de Marseille, Sfax',
    deliveryMethod: 'DELIVERY',
    paymentMethod: 'COD',
    items: [{ productId: part.id, qty: 2 }],
  }),
});
const { ref, token } = placed.body.data;
const staff = (await json('/api/v1/admin/session', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })).body.data.token;
const auth = { authorization: `Bearer ${staff}` };
const orderId = (await json(`/api/v1/admin/orders?q=${ref}`, { headers: auth })).body.data.orders[0].id;

const s = await open({ width: 390 });
const { page } = s;
if (process.env.DEBUG_NET) {
  page.on('requestfailed', (r) => console.log('  REQ FAILED', r.method(), r.url(), r.failure()?.errorText));
  page.on('response', (r) => r.url().includes('/returns') && console.log('  RESP', r.status(), r.request().method(), r.url()));
  page.on('console', (m) => m.type() === 'error' && console.log('  CONSOLE', m.text().slice(0, 300)));
}
const text = () => page.evaluate(() => document.body.innerText);
const says = async (t) => (await text()).includes(t);
const shows = (t, timeout = 8000) =>
  page
    .waitForFunction((needle) => document.body.innerText.includes(needle), t, { timeout })
    .then(() => true)
    .catch(() => false);

try {
  await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
  await page.evaluate(([r, t]) => localStorage.setItem(`apa-order.${r}`, t), [ref, token]);

  // ---- before delivery: nothing to return
  await page.goto(`${APP_URL}/suivi/${ref}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check(!(await says('Retourner une pièce')), 'app: no return offered before delivery');

  for (const status of ['CONFIRMED', 'SHIPPED', 'DELIVERED']) {
    await json(`/api/v1/admin/orders/${orderId}/status`, { method: 'POST', headers: auth, body: JSON.stringify({ status }) });
  }

  // ---- delivered: the card, and the request screen
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check(await says('Retours et garantie'), 'app: a delivered order shows « Retours et garantie »');
  await page.getByTestId('order-returns').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}-order.png` });
  await tap(page, 'Retourner une pièce');
  check(await shows('Quelle pièce ?'), 'app: the request screen opens on « Quelle pièce ? »');
  check(await says('Ce n’est pas la pièce commandée') && (await says('Jusqu’au')), 'app: each reason with its deadline');
  check(await says('L’erreur vient de nous : le retour et le remplacement sont à notre charge.'), 'app: the shop’s own errors say « à notre charge »');
  await page.screenshot({ path: `${SHOTS}-form.png` });

  await page.getByRole('radio', { name: /Je n’en ai plus besoin/ }).click();
  await page.waitForTimeout(400);
  check(await says('Retour sous 14 jours'), 'app: the 14-day conditions for that reason');
  await page.getByRole('button', { name: /Envoyer la demande/ }).click();
  await page.waitForTimeout(500);
  check(await says('Confirmez que la pièce n’a pas été montée'), 'app: will not send without « never fitted »');
  await page.getByRole('checkbox').click();
  await page.getByRole('radio', { name: 'Un remboursement' }).click();
  await page.screenshot({ path: `${SHOTS}-details.png`, fullPage: false });
  await page.getByRole('button', { name: /Envoyer la demande/ }).click();
  const sentOk = await shows('Demande envoyée');
  check(sentOk, 'app: sent', sentOk ? undefined : (await text()).slice(-400));
  const sentRef = (await text()).match(/RET-\d+/)?.[0] ?? null;
  check(Boolean(sentRef), 'app: the confirmation names the request', sentRef);
  await page.screenshot({ path: `${SHOTS}-sent.png` });

  // ---- back on the order: it is there, and can be withdrawn
  await tap(page, 'Voir ma commande');
  check(await shows(`Demande ${sentRef}`), 'app: the order shows the request');
  await tap(page, 'Annuler la demande');
  await tap(page, 'Oui, annuler la demande');
  check(await shows('Demande annulée'), 'app: withdrawn');

  // ---- a second request, answered by the shop
  const view = (await json(`/api/v1/orders/${ref}`, { headers: { authorization: `Bearer ${token}` } })).body.data;
  const form = new FormData();
  form.set('request', JSON.stringify({ reason: 'NOT_NEEDED', wish: 'EXCHANGE', unmounted: true, items: [{ orderItemId: view.items[0].id, qty: 1 }] }));
  const second = await fetch(`${SHOP}/api/v1/orders/${ref}/returns`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form }).then((r) => r.json());
  const secondRef = second.data?.returnRef;
  const row = (await json('/api/v1/admin/returns', { headers: auth })).body.data.returns.find((r) => r.ref === secondRef);

  // Staff screens: sign in on this phone and accept it from /gestion.
  await page.goto(`${APP_URL}/gestion/connexion`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByLabel('E-mail', { exact: true }).fill(EMAIL);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/ }).last().click();
  await page.waitForTimeout(2500);
  check(await says('1 à répondre') || (await says('à répondre')), 'staff: the dashboard counts requests to answer');
  await page.goto(`${APP_URL}/gestion/retours/${row.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check(/ce que dit la politique/i.test(await text()) && (await says('Retour sous 14 jours')), 'staff: the policy’s line for the case');
  await page.screenshot({ path: `${SHOTS}-staff.png` });
  await page.getByLabel('Message au client (facultatif)').first().fill('Passez au comptoir avec la pièce.');
  await tap(page, 'Accepter le retour');
  check(await shows('Demande mise à jour'), 'staff: accepted from the phone');

  await page.goto(`${APP_URL}/suivi/${ref}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check((await says('Acceptée')) && (await says('Passez au comptoir avec la pièce.')), 'customer: sees the acceptance and the shop’s words');
  await page.getByTestId('order-returns').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}-answered.png` });

  // ---- the guarantee page, from a product
  await page.goto(`${APP_URL}/produit/${part.slug}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.getByRole('link', { name: /Garantie/ }).first().click();
  check(await shows('Notre erreur, à notre charge'), 'app: the product’s guarantee tiles open « Retours et garantie »');
  check(await says('Garantie 12 mois') && (await says('Retour sous 14 jours')), 'app: the shop’s own figures');
  await page.screenshot({ path: `${SHOTS}-guarantee.png` });

  const real = s.errors.filter((e) => !/status of (401|409|422)/.test(e));
  check(real.length === 0, 'no console errors', real.slice(0, 3));
} catch (e) {
  check(false, 'returns threw', String(e).split('\n')[0]);
} finally {
  await s.browser.close();
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
