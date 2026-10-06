import { APP_URL, open, tap, tapLabel, fillCheckout } from './lib/drive.mjs';

/**
 * The customer account, driven end to end: a guest order, then an account
 * created on the same phone (the order joins it, proven by its token), sign
 * out, a second phone that signs in and opens the order through the account,
 * field errors from both sides, and deletion with the password.
 *
 * Local shop only: it creates an account and places a real order.
 */
const SHOP = process.env.SHOP_URL ?? 'http://localhost:3000';
const SHOTS = process.env.SHOTS ?? '/tmp/apa-account';
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
let password = 'Piston-bleu-42';
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

  // ---- a guest: browsing, a cart — and no order without an account
  await go(page, '/compte');
  check(await says(page, 'Se connecter ou créer un compte'), 'compte: a guest is offered an account');
  check(!(await says(page, 'Mes commandes')) && !(await says(page, 'Adresses')), 'compte: a guest has no orders or addresses');
  await go(page, `/produit/${part.slug}`);
  await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
  await page.waitForTimeout(800);
  await go(page, '/panier', 3000);
  // Where the shop can text, a guest goes on to the delivery step and
  // confirms the number there (a code by SMS opens the account); without
  // SMS the cart sends them to sign in first.
  if (await says(page, 'un code par SMS confirme votre numéro')) {
    await page.getByRole('button', { name: /^Commander/ }).click();
    await page.waitForTimeout(1500);
    check(new URL(page.url()).pathname === '/commande/livraison', 'cart: a guest goes on to the checkout', page.url());
    await go(page, '/compte/connexion?then=checkout');
  } else {
    check(await says(page, 'Se connecter pour commander'), 'cart: a guest is asked to sign in to order');
    await page.getByRole('button', { name: /Se connecter pour commander/ }).click();
    await page.waitForTimeout(1500);
    check(new URL(page.url()).pathname === '/compte/connexion', 'cart: … which opens the sign-in', page.url());
  }
  check(await says(page, 'Il faut un compte pour commander'), 'sign-in: says ordering takes an account');
  // A code by SMS comes first when the shop can send one; this suite is about e-mail and password.
  if (await page.getByTestId('auth-method-email').count()) await page.getByTestId('auth-method-email').click();
  await tap(page, 'Pas encore de compte ? Créer un compte');
  await page.waitForTimeout(800);
  await page.getByLabel('Nom et prénom', { exact: true }).fill('nom@exemple.tn');
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(email);
  await page.getByLabel('Téléphone', { exact: true }).fill('20 333 444');
  await page.getByLabel('Mot de passe', { exact: true }).fill('123');
  await page.getByRole('button', { name: 'Créer un compte' }).last().click();
  await page.waitForTimeout(600);
  check((await says(page, 'adresse e-mail')) && (await says(page, '8 caractères')), 'sign-up: field errors under the fields, before sending');

  // A common password passes the phone's own length check and is refused by the shop, with its reason.
  await page.getByLabel('Nom et prénom', { exact: true }).fill('Compte Essai');
  await page.getByLabel('Mot de passe', { exact: true }).fill('azerty2024');
  await page.getByRole('button', { name: 'Créer un compte' }).last().click();
  check(await shows(page, 'plus utilisés'), 'sign-up: a common password is refused, and said why');

  await page.getByLabel('Nom et prénom', { exact: true }).fill('Compte Essai');
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Créer un compte' }).last().click();
  check(await shows(page, 'Bienvenue, Compte'), 'sign-up: welcomed by name');
  await page.waitForTimeout(1500);
  check(new URL(page.url()).pathname === '/commande/livraison', 'sign-up from the cart: straight on to the checkout', page.url());
  await fillCheckout(page, { name: 'Compte Essai', phone: '20 333 444', address: '5 rue du Compte, Ariana' });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /^Commander · / }).click();
  await page.waitForTimeout(4500);
  ref = (await text(page)).match(/CMD-\d+/)?.[0] ?? null;
  check(Boolean(ref), 'signed in: the order is placed', ref);
  await go(page, '/compte');
  check((await says(page, 'Compte Essai')) && (await says(page, email)), 'compte: shows the account', await text(page).then((t) => t.slice(0, 120)));
  check(await says(page, 'Supprimer mon compte'), 'compte: deletion is one tap away');

  // ---- the order is the account's
  const signIn = await api('/auth/session', { method: 'POST', body: JSON.stringify({ email, password }) });
  const token = signIn.body?.data?.token;
  const listed = await api('/account/orders', { headers: { authorization: `Bearer ${token}` } });
  check(listed.body?.data?.some((o) => o.ref === ref), 'account: the order placed signed in belongs to it', listed.body);
  await api('/auth/session', { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });

  // ---- the same address again is refused, by the shop
  const again = await api('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name: 'Autre Essai', email, phone: '20333444', password }),
  });
  check(again.status === 422 && again.body?.reason === 'taken', 'api: an address with an account is refused as taken', again.body);

  // ---- sign out: the phone is a guest's again — the claimed order and the details go with the account
  await tap(page, 'Se déconnecter');
  await page.waitForTimeout(1500);
  check(await says(page, 'Se connecter ou créer un compte'), 'sign-out: back to guest');
  await go(page, '/compte/commandes');
  check(!(await says(page, ref)), 'sign-out: the order the account now owns leaves this phone');
  await go(page, '/compte');
  check(!(await says(page, 'Compte Essai')), 'sign-out: the account’s name leaves the Compte tab');
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
  if (await page.getByTestId('auth-method-email').count()) await page.getByTestId('auth-method-email').click();
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

  // ---- Connexion et sécurité: this phone, another one, signed out; the password changed
  await go(page, '/compte');
  await tap(page, 'Connexion et sécurité', { exact: false });
  check(await shows(page, 'Appareils connectés'), 'security: opens from the account');
  check((await says(page, 'Cet appareil')) && (await says(page, 'Seul ce téléphone est connecté')), 'security: only this phone is signed in');
  const other = await api('/auth/session', { method: 'POST', body: JSON.stringify({ email, password, device: 'Galaxy A54 · Android 14' }) });
  const otherToken = other.body?.data?.token;
  await go(page, '/compte/securite', 3000);
  check(await says(page, 'Galaxy A54 · Android 14'), 'security: another phone is listed by its name');
  await page.screenshot({ path: `${SHOTS}-security.png` });
  await page.getByRole('button', { name: 'Déconnecter Galaxy A54 · Android 14' }).click();
  check(await shows(page, 'Appareil déconnecté'), 'security: that phone is signed out from here');
  const gone = await api('/account', { headers: { authorization: `Bearer ${otherToken}` } });
  check(gone.status === 401, 'security: and the shop agrees', gone.status);

  await tap(page, 'Changer le mot de passe');
  await page.getByLabel('Mot de passe actuel', { exact: true }).fill('pas-le-bon-1');
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('Soupape-verte-7');
  await page.getByLabel('Confirmer le nouveau mot de passe', { exact: true }).fill('Soupape-verte-7');
  await tap(page, 'Enregistrer');
  check(await shows(page, 'Mot de passe incorrect'), 'security: the current password is checked');
  await page.getByLabel('Mot de passe actuel', { exact: true }).fill(password);
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('motdepasse');
  await page.getByLabel('Confirmer le nouveau mot de passe', { exact: true }).fill('motdepasse');
  await tap(page, 'Enregistrer');
  check(await shows(page, 'plus utilisés'), 'security: a common new password is refused');
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('Soupape-verte-7');
  await page.getByLabel('Confirmer le nouveau mot de passe', { exact: true }).fill('Soupape-verte-7');
  await tap(page, 'Enregistrer');
  check(await shows(page, 'Mot de passe modifié'), 'security: the password is changed');
  password = 'Soupape-verte-7';
  const stillIn = await api('/auth/session', { method: 'POST', body: JSON.stringify({ email, password }) });
  check(stillIn.status === 200, 'security: the new password signs in', stillIn.status);
  if (stillIn.body?.data?.token) await api('/auth/session', { method: 'DELETE', headers: { authorization: `Bearer ${stillIn.body.data.token}` } });

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
