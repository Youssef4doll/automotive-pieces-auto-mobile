import { APP_URL, open, tap } from './lib/drive.mjs';

/**
 * The first launch: three steps, "Continuer sans compte" first, the car
 * last, "Passer" on every step — and once done, never again. A link opened
 * on a first launch goes where it points, not through the welcome.
 */
let failures = 0;
const check = (cond, what, detail) => {
  if (!cond) failures++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what}${detail !== undefined ? ' ' + JSON.stringify(detail) : ''}`);
};
const text = (page) => page.evaluate(() => document.body.innerText);
const says = async (page, s) => (await text(page)).toLowerCase().includes(s.toLowerCase());

// ---- a phone that has never run the app
{
  const s = await open({ width: 390, firstLaunch: true });
  const { page } = s;
  try {
    check(page.url().endsWith('/bienvenue'), 'first launch: the welcome, not the home screen', page.url());
    check(await says(page, 'pas encore vérifié'), 'step 1: says the shop may not have checked a part yet');
    check(await says(page, 'payez à la livraison'), 'step 1: cash on delivery, the one way to pay');
    await tap(page, 'Commencer');
    check(await says(page, 'Seulement si vous le voulez'), 'step 2: the account is optional');
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('[role="button"]')].map((b) => b.textContent?.trim()).filter(Boolean),
    );
    check(order.indexOf('Continuer sans compte') > -1 && order.indexOf('Continuer sans compte') < order.indexOf('Se connecter'), 'step 2: guest comes before sign-in', order);
    await tap(page, 'Continuer sans compte');
    check(await says(page, 'Choisissez-la une fois'), 'step 3: the car');
    await tap(page, 'Plus tard');
    await page.waitForTimeout(1500);
    check(new URL(page.url()).pathname === '/' && (await says(page, 'Que recherchez-vous')), 'later: lands on home', page.url());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    check(new URL(page.url()).pathname === '/', 'once done, never again', page.url());
  } catch (e) {
    check(false, 'first launch threw', String(e).split('\n')[0]);
  } finally {
    if (s.errors.length) check(false, 'first launch: page errors', s.errors.slice(0, 3));
    await s.browser.close();
  }
}

// ---- first launch, straight to choosing the car
{
  const s = await open({ width: 390, firstLaunch: true });
  const { page } = s;
  try {
    await tap(page, 'Passer');
    await page.waitForTimeout(1200);
    check(new URL(page.url()).pathname === '/', '"Passer" on step 1 goes home', page.url());
  } catch (e) {
    check(false, 'skip threw', String(e).split('\n')[0]);
  } finally {
    await s.browser.close();
  }
}
{
  const s = await open({ width: 390, firstLaunch: true });
  const { page } = s;
  try {
    await tap(page, 'Commencer');
    await tap(page, 'Continuer sans compte');
    await tap(page, 'Choisir mon véhicule');
    await page.waitForTimeout(2000);
    check(page.url().includes('/garage/ajouter'), 'car step: opens the make picker', page.url());
    // The header's back arrow, as a customer goes back.
    const back = page.locator('[aria-label*="Retour"]').last();
    check((await back.count()) > 0, 'the back arrow is labelled "Retour", not "(tabs)"');
    await back.click();
    await page.waitForTimeout(2000);
    check(new URL(page.url()).pathname === '/', 'back from the picker is home, not the welcome', page.url());
  } catch (e) {
    check(false, 'picker path threw', String(e).split('\n')[0]);
  } finally {
    await s.browser.close();
  }
}

// ---- a link on a first launch opens what it points at
{
  const s = await open({ width: 390, firstLaunch: true });
  const { page } = s;
  try {
    const shop = process.env.SHOP_URL ?? 'http://localhost:3000';
    const slug = (await (await fetch(`${shop}/api/v1/catalogue/products?family=filtres`)).json()).data.products[0].slug;
    const fresh = await s.browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
    const p2 = await fresh.newPage();
    await p2.goto(`${APP_URL}/produit/${slug}`, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(3000);
    check(p2.url().includes('/produit/') && (await says(p2, 'Ajouter au panier')), 'deep link: the product, not the welcome', p2.url());
  } catch (e) {
    check(false, 'deep link threw', String(e).split('\n')[0]);
  } finally {
    await s.browser.close();
  }
}

console.log(failures ? `\n${failures} failure(s)` : '\nthe welcome passes');
process.exit(failures ? 1 : 0);
