import { APP_URL, open, tap, tapLabel } from './lib/drive.mjs';

/**
 * The customer account, driven end to end: a guest order, then an account
 * created on the same phone (the order joins it, proven by its token), sign
 * out, a second phone that signs in and opens the order through the account,
 * field errors from both sides, and deletion with the password.
 *
 * Local shop only: it creates an account and places a real order.
 */
const SHOP = process.env.SHOP_URL ?? 'http://localhost:3000';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(SHOP)) {
  console.error('account.mjs creates accounts and orders; it runs against a local shop only.');
  process.exit(1);
}

let failures = 0;
const check = (cond, what, detail) => {
  if (!cond) failures++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
};
const text = (page) => page.evaluate(() => document.body.innerText);
const says = async (page, s) => (await text(page)).toLowerCase().includes(s.toLowerCase());
/** A toast lives a few seconds and the request before it takes as long as it takes: wait for it. */
const shows = (page, s, timeout = 8000) =>
  page
    .waitForFunction((needle) => document.body.innerText.toLowerCase().includes(needle), s.toLowerCase(), { timeout })
    .then(() => true)
    .catch(() => false);
const api = async (path, init = {}) => {
  const res = await fetch(`${SHOP}/api/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const email = `e2e.${Date.now()}@example.com`;
const password = 'essai-123';
const products = (await (await fetch(`${SHOP}/api/v1/catalogue/products?family=filtres`)).json()).data.products;
const part = products.find((p) => p.availability === 'IN_STOCK') ?? products[0];

/** A refused request is the point of several checks here; the browser logs each one. */
const realErrors = (errors) => errors.filter((e) => !/Failed to load resource: the server responded with a status of (401|422)/.test(e));

const go = async (page, path, wait = 2600) => {
  await page.goto(`${APP_URL}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(wait);
};

let ref = null;
const phoneA = await open({ width: 390 });
try {
  const { page } = phoneA;

  // ---- a guest order on phone A
  await go(page, `/produit/${part.slug}`);
  await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
  await page.waitForTimeout(800);
  await go(page, '/panier', 3000);
  await page.getByRole('button', { name: /Passer la commande/ }).click();
  await page.waitForTimeout(1800);
  await page.getByLabel('Nom et prénom', { exact: true }).fill('Compte Essai');
  await page.getByLabel('Téléphone', { exact: true }).fill('20 333 444');
  await tapLabel(page, 'Gouvernorat');
  await tap(page, 'Ariana');
  await page.getByLabel('Adresse', { exact: true }).fill('5 rue du Compte, Ariana');
  await tap(page, 'Continuer');
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /Confirmer la commande/ }).click();
  await page.waitForTimeout(4500);
  ref = (await text(page)).match(/CMD-\d+/)?.[0] ?? null;
  check(Boolean(ref), 'guest: the order is placed', ref);

  // ---- the account row, and the sign-up form's own checks
  await go(page, '/compte');
  check(await says(page, 'Se connecter ou créer un compte'), 'compte: a guest is offered an account, optionally');
  await tap(page, 'Se connecter ou créer un compte', { exact: false });
  await page.waitForTimeout(1200);
  check(await says(page, 'vous pouvez commander sans'), 'sign-in: says the account is optional');
  await tap(page, 'Pas encore de compte ? Créer un compte');
  await page.waitForTimeout(800);
  await page.getByLabel('Nom et prénom', { exact: true }).fill('nom@exemple.tn');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(email);
  await page.getByLabel('Téléphone', { exact: true }).fill('20 333 444');
  await page.getByLabel('Mot de passe', { exact: true }).fill('123');
  await page.getByRole('button', { name: 'Créer un compte' }).last().click();
  await page.waitForTimeout(600);
  check((await says(page, 'adresse e-mail')) && (await says(page, '6 caractères')), 'sign-up: field errors under the fields, before sending');

  await page.getByLabel('Nom et prénom', { exact: true }).fill('Compte Essai');
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Créer un compte' }).last().click();
  check(await shows(page, 'Bienvenue, Compte'), 'sign-up: welcomed by name');
  await go(page, '/compte');
  check((await says(page, 'Compte Essai')) && (await says(page, email)), 'compte: shows the account', await text(page).then((t) => t.slice(0, 120)));
  check(await says(page, 'Supprimer mon compte'), 'compte: deletion is one tap away');

  // ---- the guest order joined the account (proof: the phone's order token)
  const signIn = await api('/auth/session', { method: 'POST', body: JSON.stringify({ email, password }) });
  const token = signIn.body?.data?.token;
  const listed = await api('/account/orders', { headers: { authorization: `Bearer ${token}` } });
  check(listed.body?.data?.some((o) => o.ref === ref), 'claim: the guest order now belongs to the account', listed.body);
  await api('/auth/session', { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });

  // ---- the same address again is refused, by the shop
  const again = await api('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Autre Essai', email, phone: '20333444', password }),
  });
  check(again.status === 422 && again.body?.reason === 'taken', 'api: an address with an account is refused as taken', again.body);

  // ---- sign out: the account's rows go, this phone's own order stays
  await tap(page, 'Se déconnecter');
  await page.waitForTimeout(1500);
  check(await says(page, 'Se connecter ou créer un compte'), 'sign-out: back to guest');
  await go(page, '/compte/commandes');
  check(await says(page, ref), 'sign-out: the order placed on this phone is still listed');
} catch (e) {
  check(false, 'phone A threw', String(e).split('\n')[0]);
} finally {
  if (realErrors(phoneA.errors).length) check(false, 'phone A: page errors', realErrors(phoneA.errors).slice(0, 3));
  await phoneA.browser.close();
}

// ---- phone B: sign in, see the order, open it through the account
const phoneB = await open({ width: 390 });
try {
  const { page } = phoneB;
  await go(page, '/compte/connexion');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais-mot');
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  await page.waitForTimeout(2500);
  check(await says(page, 'E-mail ou mot de passe incorrect'), 'sign-in: a wrong password is one sentence, no hint which half');
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  await page.waitForTimeout(3500);
  await go(page, '/compte/commandes', 3500);
  check(Boolean(ref) && (await says(page, ref)), 'phone B: the account’s order is listed');
  if (ref) {
    await go(page, `/suivi/${ref}`, 3500);
    check(await says(page, 'Compte Essai'), 'phone B: the order opens through the account session');
  }

  // ---- forgotten password: the same answer for any address
  const reset = await api('/auth/password-reset', { method: 'POST', body: JSON.stringify({ email: 'personne@example.com' }) });
  check(reset.status === 200 && reset.body?.data?.sent === true, 'api: reset answers the same for an unknown address');

  // ---- delete: wrong password refused, then gone
  await go(page, '/compte/supprimer');
  check((await says(page, 'restent dans la comptabilité')) && (await says(page, 'définitif')), 'delete: says what goes and what stays');
  await page.getByLabel('Mot de passe', { exact: true }).fill('pas-le-bon');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await page.waitForTimeout(2500);
  check(await says(page, 'Mot de passe incorrect'), 'delete: a wrong password is refused');
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  check(await shows(page, 'Votre compte a été supprimé'), 'delete: confirmed');
  check(await says(page, 'Se connecter ou créer un compte'), 'delete: the phone is back to guest');
  const after = await api('/auth/session', { method: 'POST', body: JSON.stringify({ email, password }) });
  check(after.status === 401, 'delete: the account no longer signs in', after.status);
} catch (e) {
  check(false, 'phone B threw', String(e).split('\n')[0]);
} finally {
  if (realErrors(phoneB.errors).length) check(false, 'phone B: page errors', realErrors(phoneB.errors).slice(0, 3));
  await phoneB.browser.close();
}

// ---- the order survived the account, detached
if (ref) {
  const lookup = await api('/orders/lookup', { method: 'POST', body: JSON.stringify({ ref, phone: '20333444' }) });
  check(lookup.status === 200, 'delete: the order is still the shop’s record, recoverable by ref + phone', lookup.status);
}

// ---- a customer session is not a staff session
const staffTry = await api('/admin/dashboard', { headers: { authorization: 'Bearer ' + 'x'.repeat(43) } });
check(staffTry.status === 401, 'api: a random bearer opens nothing at the staff door');

console.log(failures ? `\n${failures} failure(s)` : '\nall account journeys pass');
process.exit(failures ? 1 : 0);
