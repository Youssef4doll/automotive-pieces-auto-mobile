/**
 * Bakes the launcher, splash and favicon artwork from the logo's vector.
 *
 * The app shipped for a while with Expo's own scaffold artwork as its
 * launcher icon, which meant the shop's app appeared on a customer's home
 * screen under somebody else's logo. This generates the PNGs the stores
 * need from `src/illustrations/logo-paths.ts` — the same geometry the app
 * draws inside itself, so the two cannot drift.
 *
 *   node scripts/make-icons.mjs
 *
 * Set CHROMIUM_PATH if Playwright's bundled browser is not the one available
 * — a CI image usually ships its own, and a Playwright upgrade asks for a
 * Chromium build that a pinned image will not have.
 *
 * Run it whenever the mark changes. The output is committed, because a
 * build must not depend on a headless browser being available.
 *
 * It renders through Chromium rather than an SVG rasteriser so there is one
 * fewer image dependency in the project, and because Playwright is already
 * here for driving the app.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The brand values, from constants/theme.ts. Three literals rather than an
// import, because this is a plain node script and theme.ts is TypeScript that
// pulls in react-native.
const GOLD = '#fbc000';
const NAVY = '#0f2352';

/** Pulled out of the TypeScript source so there is one copy of the geometry. */
async function readPaths() {
  const source = await readFile(resolve(ROOT, 'src/illustrations/logo-paths.ts'), 'utf8');
  const grab = (name) => {
    const match = source.match(new RegExp(`export const ${name} =([\\s\\S]*?);\\n`));
    if (!match) throw new Error(`${name} not found in logo-paths.ts`);
    // The paths are written as concatenated string literals for readability.
    return [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1]).join('');
  };
  return { hex: grab('HEX_PATH'), letter: grab('LETTER_PATH') };
}

/**
 * @param scale how much of the canvas the hexagon fills. Android's adaptive
 * icon crops to a circle and can mask anything outside the inner 66%, so its
 * foreground is drawn small inside a transparent square.
 */
function page({ hex, letter, size, scale, background, mono = false }) {
  const inset = (48 * (1 - scale)) / 2;

  // A themed (monochrome) Android icon is a silhouette: one colour, with the
  // letter cut out of the hexagon rather than drawn on top of it. Two paths
  // cannot do that — painting the A transparent just paints nothing — so the
  // hexagon and the letter are concatenated into a single path and even-odd
  // does the knockout. The letter's own counter is a third subpath, which
  // even-odd fills back in, so the A keeps its triangle.
  const art = mono
    ? `<path d="${hex} ${letter}" fill="#ffffff" fill-rule="evenodd"/>`
    : `<path d="${hex}" fill="${GOLD}"/><path d="${letter}" fill="${NAVY}" fill-rule="evenodd"/>`;

  return `<!doctype html><html><body style="margin:0;background:${background};">
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
      <g transform="translate(${inset} ${inset}) scale(${scale})">${art}</g>
    </svg>
  </body></html>`;
}

const TARGETS = [
  // The store icon. Opaque navy behind the mark: iOS does not allow
  // transparency and a white square would disappear on a light home screen.
  { file: 'assets/images/icon.png', size: 1024, scale: 0.68, background: NAVY },
  // Android draws this over its own background colour (navy, set in app.json)
  // and crops it to whatever mask the launcher uses.
  { file: 'assets/images/android-icon-foreground.png', size: 1024, scale: 0.52, background: 'transparent' },
  { file: 'assets/images/android-icon-background.png', size: 1024, scale: 0, background: NAVY },
  // Monochrome (themed icons, Android 13+) has to be a silhouette, so the
  // hexagon is drawn in white and the letter knocked out of it.
  { file: 'assets/images/android-icon-monochrome.png', size: 1024, scale: 0.52, background: 'transparent', mono: true },
  { file: 'assets/images/splash-icon.png', size: 512, scale: 0.86, background: 'transparent' },
  { file: 'assets/images/favicon.png', size: 196, scale: 0.86, background: NAVY },
];

const { hex, letter } = await readPaths();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
});

for (const target of TARGETS) {
  const html = page({
    hex,
    letter,
    size: target.size,
    scale: target.scale,
    background: target.background,
    mono: target.mono ?? false,
  });

  const p = await browser.newPage({
    viewport: { width: target.size, height: target.size },
    deviceScaleFactor: 1,
  });
  await p.setContent(html);
  const out = resolve(ROOT, target.file);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, await p.screenshot({ omitBackground: target.background === 'transparent' }));
  await p.close();
  console.log(`wrote ${target.file} (${target.size}px)`);
}

await browser.close();
