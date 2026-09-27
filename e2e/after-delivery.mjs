import { APP_URL, open } from './lib/drive.mjs';

/**
 * After the parcel: a delivered order asks for the customer's rating, and the
 * shop reads it. Places a real order on the LOCAL shop (as the app does, over
 * the API), marks it delivered with the staff API, then rates it through the
 * app and reads the rating back from the staff side.
 *
 * Local shop only — it writes an order and moves it.
 */
const SHOP = process.env.SHOP_URL ?? 'http://localhost:3000';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(SHOP)) {
  console.error('after-delivery: refuses anything but a local shop');
  process.exit(1);
}
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
    governorate: 'Tunis',
    address: '12 rue de Marseille, Tunis',
    deliveryMethod: 'DELIVERY',
    paymentMethod: 'COD',
    items: [{ productId: part.id, qty: 1 }],
  }),
});
const { ref, token } = placed.body.data;
const staff = (await json('/api/v1/admin/session', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })).body.data.token;
const auth = { authorization: `Bearer ${staff}` };
const orderId = (await json(`/api/v1/admin/orders?q=${ref}`, { headers: auth })).body.data.orders[0].id;

// Before delivery there is nothing to rate.
const early = await json(`/api/v1/orders/${ref}/review`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ stars: 5 }) });
check(early.status === 409 && early.body.reason === 'not_delivered', 'api: no rating before delivery', early);

for (const status of ['CONFIRMED', 'SHIPPED', 'DELIVERED']) {
  await json(`/api/v1/admin/orders/${orderId}/status`, { method: 'POST', headers: auth, body: JSON.stringify({ status }) });
}

const s = await open({ width: 390 });
const { page } = s;
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const says = async (text) => (await page.evaluate(() => document.body.innerText)).includes(text);

try {
  await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle' });
  await page.evaluate(([r, t]) => localStorage.setItem(`apa-order.${r}`, t), [ref, token]);
  await page.goto(`${APP_URL}/suivi/${ref}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  check(await says('Comment s’est passée cette commande ?'), 'app: a delivered order asks for a rating');
  check(!(await says('Suivre sans ouvrir')), 'app: no push switch where push cannot work (web)');
  check(await says('rien n’est publié'), 'app: the card says the rating is not published');

  await page.getByRole('radio', { name: '4 sur 5' }).click();
  await page.getByLabel('Un mot pour la boutique (facultatif)').fill('Pièce conforme, livreur ponctuel.');
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await page.waitForTimeout(2500);
  check(await says('Merci. La boutique lit chaque avis.'), 'app: thanks after sending');

  const detail = (await json(`/api/v1/admin/orders/${orderId}`, { headers: auth })).body.data;
  check(detail.review?.stars === 4 && /conforme/.test(detail.review?.comment ?? ''), 'staff: the shop reads the rating on the order', detail.review);
  check(errors.length === 0, 'no console errors', errors.slice(0, 3));
} catch (e) {
  check(false, 'after-delivery threw', String(e));
} finally {
  await s.browser.close();
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
