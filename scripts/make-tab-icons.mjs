/**
 * The tab bar's icons as pictures, for the system tab bar on iOS 26.
 *
 * Apple's own bar (app/(tabs)/_layout, `NativeTabs`) takes an image per tab,
 * not a React component. Rather than switch to SF Symbols — a gold symbol on
 * the glass measures 1.8:1, and the set would no longer match the rest of
 * the app — the same drawings the app's own bar uses (illustrations/tab-icons)
 * are rendered to PNG here, outline and gold-filled, at 1x, 2x and 3x.
 *
 * They are lifted from the running web build, so the pictures are exactly
 * what the components draw. Run it after changing a glyph:
 *
 *   npx expo start --web --port 8081   (in another terminal)
 *   node scripts/make-tab-icons.mjs
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8081';
const CHROMIUM = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const OUT = new URL('../assets/images/tabs/', import.meta.url).pathname;
const NAMES = ['home', 'catalogue', 'garage', 'cart', 'account'];
const SIZE = 24;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROMIUM });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
await context.addInitScript(() => {
  try {
    localStorage.setItem('apa-onboarding', JSON.stringify({ state: { done: true }, version: 0 }));
    localStorage.setItem('apa-locale', 'fr');
  } catch {}
});
const page = await context.newPage();
await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 120_000 });
await page.waitForTimeout(3000);

const svgs = {};
const grab = () => page.$$eval('[role="tab"] svg', (els) => els.map((e) => e.outerHTML));
for (let i = 0; i < NAMES.length; i++) {
  await page.locator('[role="tab"]').nth(i).click();
  await page.waitForTimeout(1200);
  const all = await grab();
  if (all.length !== NAMES.length) throw new Error(`expected ${NAMES.length} tab icons, found ${all.length}`);
  all.forEach((svg, j) => {
    svgs[j === i ? `${NAMES[j]}-on` : NAMES[j]] = svg;
  });
}

for (const scale of [1, 2, 3]) {
  const ctx = await browser.newContext({ deviceScaleFactor: scale, viewport: { width: 100, height: 100 } });
  const p = await ctx.newPage();
  for (const [name, svg] of Object.entries(svgs)) {
    await p.setContent(`<html><body style="margin:0;background:transparent"><div id="i" style="width:${SIZE}px;height:${SIZE}px">${svg}</div></body></html>`);
    await p.$eval('#i svg', (e, s) => {
      e.setAttribute('width', s);
      e.setAttribute('height', s);
      e.style.display = 'block';
    }, SIZE);
    const file = `${OUT}${name}${scale === 1 ? '' : `@${scale}x`}.png`;
    await p.locator('#i').screenshot({ path: file, omitBackground: true });
  }
  await ctx.close();
}
await browser.close();
console.log(`${Object.keys(svgs).length} icons × 3 scales → assets/images/tabs/`);
