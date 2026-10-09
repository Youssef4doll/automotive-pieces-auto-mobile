import fs from 'node:fs';
import path from 'node:path';
import { APP_URL, open, tap, tapLabel, testAccount, fillCheckout } from './lib/drive.mjs';

/**
 * Reaching the shop, and being reached — end to end:
 *
 *  - a guest order, then "Demander à la boutique" from its page: the question
 *    lands in the shop's inbox proven as that order's, the shop answers, and
 *    the answer comes back — on the order's page, in "Mes questions", and as
 *    "la boutique vous a répondu" while the app is open (order watch);
 *  - the order moving says so too, with no push needed;
 *  - Help always offers a question and a photo; WhatsApp, and collection in
 *    store at checkout, appear the moment the shop fills them in;
 *  - signing in with a code by SMS: a wrong code, a new account on a new
 *    number, signing in again, the security screen, deleting with a code;
 *  - "Espace boutique": absent for a customer, there for an admin's own
 *    sign-in with no second door, gone with the sign-out.
 *
 * Local shop only: it places an order, creates accounts, and changes (then
 * restores) the shop's contact settings. SMS codes are read from the
 * development outbox (the website's lib/sms, `.sms-outbox.jsonl`).
 */
const SHOP = process.env.SHOP_URL ?? 'http://localhost:3000';
const WEBSITE = process.env.WEBSITE_DIR ?? path.resolve(new URL('.', import.meta.url).pathname, '../../automotive-pieces-auto');
const OUTBOX = path.join(WEBSITE, '.sms-outbox.jsonl');
const STAFF_EMAIL = process.env.STAFF_EMAIL ?? 'admin@automotive-pieces-auto.tn';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'admin1234';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(SHOP)) {
  console.error('reach.mjs places orders, creates accounts and edits settings; it runs against a local shop only.');
  process.exit(1);
}

let failures = 0;
const check = (cond, what, detail) => {
  if (!cond) failures++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
};
const text = (page) => page.evaluate(() => document.body.innerText);
const says = async (page, s) => (await text(page)).toLowerCase().includes(s.toLowerCase());
const shows = (page, s, timeout = 8000) =>
  page
    .waitForFunction((needle) => document.body.innerText.toLowerCase().includes(needle), s.toLowerCase(), { timeout })
    .then(() => true)
    .catch(() => false);
const go = async (page, p, wait = 2600) => {
  await page.goto(`${APP_URL}${p}`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(wait);
};
const api = async (p, { token, method = 'GET', body } = {}) => {
  const res = await fetch(`${SHOP}/api/v1${p}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
/** The last code texted to this number (+216…), from the development outbox. */
const lastCode = (digits) => {
  const lines = fs.existsSync(OUTBOX) ? fs.readFileSync(OUTBOX, 'utf8').trim().split('\n') : [];
  for (const line of lines.reverse()) {
    const m = JSON.parse(line);
    if (m.to === `+216${digits}`) return m.body.match(/\d{6}/)?.[0] ?? null;
  }
  return null;
};
/** SHOTS=/some/dir keeps a picture of each screen this suite checks. */
const SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, `${name}.png`) }).catch(() => undefined) : undefined);
const realErrors = (errors) => errors.filter((e) => !/status of (401|404|422|429)/.test(e));

const staff = (await api('/admin/session', { method: 'POST', body: { email: STAFF_EMAIL, password: STAFF_PASSWORD } })).json?.data?.token;
check(Boolean(staff), 'setup: the staff API signs in');
const products = (await (await fetch(`${SHOP}/api/v1/catalogue/products?family=filtres`)).json()).data.products;
const part = products.find((p) => p.availability === 'IN_STOCK') ?? products[0];
const settingsBefore = (await api('/admin/settings', { token: staff })).json?.data ?? [];
const before = (key) => settingsBefore.find?.((r) => r.key === key)?.value ?? '';

// ---- phone A: a guest asks about their order, and is answered
// Ordering takes an account: phone A is a signed-in customer.
const phoneA = await open({ width: 390, token: (await testAccount('Question Essai')).token });
let ref = null;
try {
  const { page } = phoneA;
  await go(page, `/produit/${part.slug}`);
  await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
  await page.waitForTimeout(800);
  await go(page, '/panier', 3000);
  await page.getByRole('button', { name: /^Commander/ }).click();
  await page.waitForTimeout(1800);
  await fillCheckout(page, { name: 'Question Essai', phone: '20 444 555', address: '7 rue de la Question, Ariana' });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /^Commander · / }).click();
  await page.waitForTimeout(4500);
  ref = (await text(page)).match(/CMD-\d+/)?.[0] ?? null;
  check(Boolean(ref), 'guest: the order is placed', ref);

  await go(page, `/suivi/${ref}`, 3500);
  check((await says(page, 'Une question sur cette commande')) && (await says(page, 'Demander à la boutique')), 'order: a way to ask the shop, whatever it has published');
  check(!(await says(page, 'Écrire sur WhatsApp')), 'order: no WhatsApp button while the shop has no number');
  await page.getByRole('button', { name: 'Demander à la boutique' }).click();
  await page.waitForTimeout(2000);
  check(await says(page, `Au sujet de la commande ${ref}`), 'ask: the order is attached on its own');
  check((await page.getByLabel('Votre nom', { exact: true }).inputValue()) === 'Question Essai', 'ask: the name from the checkout is filled in');
  await page.getByTestId('ask-send').click();
  await page.waitForTimeout(500);
  check(await says(page, 'Écrivez votre question ou ajoutez une photo'), 'ask: nothing to send is said, not sent');
  await page.getByTestId('ask-body').fill('Pouvez-vous livrer plutôt samedi matin ?');
  await page.getByTestId('ask-send').click();
  check(await shows(page, 'Question envoyée'), 'ask: sent');
  check(await says(page, `page de la commande ${ref}`), 'ask: says the answer will be on the order page');

  // The shop's side: the inbox has it, proven as this order's.
  const list = (await api('/admin/messages', { token: staff })).json?.data?.messages ?? [];
  const q = list.find((m) => m.subject === `Question sur la commande ${ref}`);
  check(Boolean(q?.inApp), 'inbox: the question is there, asked from the app', q);
  const detail = q ? (await api(`/admin/messages/${q.id}`, { token: staff })).json?.data : null;
  check(detail?.order?.ref === ref, 'inbox: tied to the real order (its token went with it)', detail?.order);
  const replied = q
    ? await api(`/admin/messages/${q.id}`, { token: staff, method: 'POST', body: { reply: 'Oui, samedi matin entre 9h et 12h.' } })
    : null;
  check(replied?.status === 200 && replied.json?.data?.status === 'HANDLED', 'inbox: the shop answers in writing; handled', replied?.status);

  // Back on the phone: the watch says it, the order page shows it.
  await go(page, '/compte', 500);
  check(await shows(page, 'La boutique vous a répondu', 15000), 'watch: "la boutique vous a répondu", without push');
  await go(page, `/suivi/${ref}`, 3500);
  check(await says(page, 'samedi matin entre 9h et 12h'), 'order: the answer under the question');
  await page.getByTestId('order-questions').scrollIntoViewIfNeeded().catch(() => undefined);
  await shot(page, 'order-thread');
  await go(page, '/compte', 2500);
  check(await says(page, 'Mes questions'), 'compte: "Mes questions" once a question was asked');
  await go(page, '/compte/questions', 3500);
  check((await says(page, 'Pouvez-vous livrer plutôt samedi matin')) && (await says(page, 'Réponse de la boutique')), 'questions: the question and the answer');
  await shot(page, 'my-questions');

  // The order moving, said while the app is open.
  const found = (await api(`/admin/orders?q=${ref}`, { token: staff })).json?.data?.orders?.[0];
  await go(page, '/compte', 6000); // the watch's first look records PENDING
  const moved = found ? await api(`/admin/orders/${found.id}/status`, { token: staff, method: 'POST', body: { status: 'CONFIRMED' } }) : null;
  check(moved?.status === 200, 'staff: the order is confirmed', moved?.status);
  await go(page, '/catalogue', 500);
  check(await shows(page, `${ref} : Confirmée`, 15000), 'watch: the order moving is said, without push');
  await shot(page, 'watch-toast');

  // Help: always a question and a photo; WhatsApp once the shop has a number.
  await go(page, '/aide', 3000);
  check((await says(page, 'Poser une question')) && (await says(page, 'Envoyer une photo de la pièce')), 'help: ask and photo, always');
  check(!(await says(page, 'Écrire sur WhatsApp')), 'help: no WhatsApp before the shop has a number');
  const set = await api('/admin/settings', { token: staff, method: 'PATCH', body: { shop_whatsapp: '98 765 432', shop_address: '12 avenue de l’Essai, Ariana' } });
  check(set.status === 200, 'staff: WhatsApp and address filled in', set.status);
  await go(page, '/aide', 3000);
  check(await says(page, 'Écrire sur WhatsApp'), 'help: WhatsApp appears as soon as the shop has a number');
  await shot(page, 'help-with-whatsapp');
  await go(page, `/suivi/${ref}`, 3500);
  // The owner, October 2026: on an order, the in-app chat only.
  check((await says(page, 'Demander à la boutique')) && !(await says(page, 'Écrire sur WhatsApp')), 'order: the chat only, no WhatsApp beside it');
  await go(page, `/produit/${part.slug}`);
  await page.getByRole('button', { name: /Ajouter au panier/ }).first().click();
  await page.waitForTimeout(800);
  await go(page, '/commande/livraison', 3500);
  check(await says(page, 'Retrait en magasin'), 'checkout: collection in store offered once the shop has an address');
  await shot(page, 'checkout-pickup');
} catch (e) {
  check(false, 'phone A threw', String(e).split('\n')[0]);
} finally {
  // The shop's settings as they were.
  await api('/admin/settings', { token: staff, method: 'PATCH', body: { shop_whatsapp: before('shop_whatsapp'), shop_address: before('shop_address') } });
  if (realErrors(phoneA.errors).length) check(false, 'phone A: page errors', realErrors(phoneA.errors).slice(0, 3));
  await phoneA.browser.close();
}

// ---- phone B: signing in with a code by SMS
const phoneB = await open({ width: 390 });
const digits = `9${String(Date.now()).slice(-7)}`;
try {
  const { page } = phoneB;
  await go(page, '/compte/connexion', 3000);
  check((await page.getByTestId('auth-method-phone').getAttribute('aria-selected')) === 'true', 'sign-in: the SMS code comes first');
  await page.getByTestId('phone-number').fill('1234');
  await page.getByTestId('phone-send').click();
  await page.waitForTimeout(600);
  check(await says(page, 'Un numéro tunisien compte 8 chiffres'), 'sign-in: a short number is refused before sending');
  await page.getByTestId('phone-number').fill(`${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`);
  await page.getByTestId('phone-send').click();
  check(await shows(page, 'Code envoyé au'), 'sign-in: code sent, the number repeated');
  const code = lastCode(digits);
  check(Boolean(code), 'sms: the code went out (outbox)', code);
  const wrong = code === '000000' ? '111111' : '000000';
  await page.getByTestId('phone-code').fill(wrong);
  check(await shows(page, 'Ce n’est pas le bon code'), 'sign-in: a wrong code is said plainly');
  await page.getByTestId('phone-code').fill(code);
  check(await shows(page, 'Comment vous appelez-vous'), 'sign-in: a new number is asked for a name, nothing else');
  await page.getByLabel('Nom et prénom', { exact: true }).fill('Sami Texto');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  check(await shows(page, 'Bienvenue, Sami'), 'sign-in: account opened, welcomed by name');
  await go(page, '/compte', 3000);
  check((await says(page, 'Sami Texto')) && (await says(page, `+216 ${digits}`)), 'compte: the account, by its number');
  check(!(await says(page, 'Espace boutique')), 'compte: no "Espace boutique" for a customer');

  await go(page, '/compte/securite', 3000);
  check((await says(page, 'Connexion par SMS')) && (await says(page, 'pas de mot de passe')), 'security: signs in by code; no password section');
  check(!(await says(page, 'Changer le mot de passe')), 'security: nothing to change a password that does not exist');

  // Out, and back in with a code: the same account, no name asked.
  await go(page, '/compte', 2500);
  await tap(page, 'Se déconnecter');
  await page.waitForTimeout(2500);
  await go(page, '/compte/connexion', 3000);
  await page.getByTestId('phone-number').fill(digits);
  await page.getByTestId('phone-send').click();
  await shows(page, 'Code envoyé au');
  await page.getByTestId('phone-code').fill(lastCode(digits));
  check(await shows(page, 'Bienvenue, Sami'), 'sign-in again: the same account, straight in');

  // Deleting an account with no password: a code to its number.
  await go(page, '/compte/supprimer', 2500);
  await page.getByRole('button', { name: 'Recevoir le code' }).click();
  check(await shows(page, 'nous envoyons un code au'), 'delete: confirms with a code to the account’s number');
  await page.getByLabel('Code reçu par SMS', { exact: true }).fill(lastCode(digits));
  await page.getByRole('button', { name: /Supprimer/ }).last().click();
  await page.waitForTimeout(3500);
  await go(page, '/compte', 2500);
  check(await says(page, 'Se connecter ou créer un compte'), 'delete: the phone is a guest’s again');
} catch (e) {
  check(false, 'phone B threw', String(e).split('\n')[0]);
} finally {
  if (realErrors(phoneB.errors).length) check(false, 'phone B: page errors', realErrors(phoneB.errors).slice(0, 3));
  await phoneB.browser.close();
}

// ---- phone C: the owner signs in to their own account; the shop's space comes with it
const phoneC = await open({ width: 390 });
try {
  const { page } = phoneC;
  await go(page, '/compte/connexion', 3000);
  await page.getByTestId('auth-method-email').click();
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(STAFF_EMAIL);
  await page.getByLabel('Mot de passe', { exact: true }).fill(STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).last().click();
  await page.waitForTimeout(4000);
  await go(page, '/compte', 3000);
  check(await says(page, 'Espace boutique'), 'admin: "Espace boutique" appears on their own account');
  await shot(page, 'admin-compte');
  await tapLabel(page, 'Espace boutique');
  await page.waitForTimeout(3500);
  check(page.url().endsWith('/gestion') && (await says(page, 'Bonjour')), 'admin: straight into the shop’s space — no second sign-in', page.url());
  check(await says(page, 'À compléter pour vos clients'), 'admin: what customers cannot see yet, as a to-do');
  await shot(page, 'staff-dashboard');
  await go(page, '/gestion/messages', 3500);
  check((await page.getByTestId('staff-message').count()) > 0, 'admin: the inbox lists the questions');
  await shot(page, 'staff-inbox');
  await page.getByTestId('staff-message').first().click();
  await page.waitForTimeout(3000);
  check(((await says(page, 'Appeler')) && (await says(page, 'Marquer traité'))) || (await says(page, 'Rouvrir')), 'admin: call back, and mark handled, from the message');
  await shot(page, 'staff-message');

  await go(page, '/compte', 2500);
  await tap(page, 'Se déconnecter');
  await page.waitForTimeout(3000);
  check(!(await says(page, 'Espace boutique')), 'admin: signing out takes the shop’s space with it');
  await go(page, '/gestion', 3000);
  check(page.url().endsWith('/gestion/connexion'), 'admin: the staff session ended too', page.url());
} catch (e) {
  check(false, 'phone C threw', String(e).split('\n')[0]);
} finally {
  if (realErrors(phoneC.errors).length) check(false, 'phone C: page errors', realErrors(phoneC.errors).slice(0, 3));
  await phoneC.browser.close();
}

console.log(failures ? `\n${failures} failure(s)` : '\nreaching the shop passes');
process.exit(failures ? 1 : 0);
