/**
 * Derives every piece of brand artwork from the one logo file the shop
 * supplied: `assets/images/logo-lockup.webp`.
 *
 *   node scripts/make-icons.mjs
 *
 * Set CHROMIUM_PATH if Playwright's bundled browser is not the one available
 * — a CI image usually ships its own, and a Playwright upgrade asks for a
 * Chromium build that a pinned image will not have.
 *
 * This used to redraw the mark as SVG paths. It no longer does: the shop's
 * file is the shop's logo, and a reconstruction that is 98% right is a
 * different logo. Everything square — the launcher icon, the Android
 * foreground and monochrome layers, the splash mark, the favicon — is cut
 * from that file rather than drawn beside it, so there is exactly one
 * artwork and it is theirs.
 *
 * The output is committed, because a build must not depend on a headless
 * browser being available. Re-run it if the logo file is ever replaced.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'assets/images/logo-lockup.webp');

/** From constants/theme.ts. Literals, because this is plain node. */
const NAVY = '#0f2352';

const TARGETS = [
  // The whole lockup, trimmed to its ink.
  //
  // The supplied file carries a wide transparent margin — the artwork fills
  // barely half its height — so a component sizing it by height would render
  // the logo at half the size it asked for and nobody would know why.
  // Trimmed here once instead of with a magic number in the component.
  { file: 'assets/images/logo-lockup.png', height: 240, crop: 'ink', background: 'transparent' },
  // The hexagon on its own, for anywhere the full lockup is too wide.
  { file: 'assets/images/logo-mark.png', size: 512, scale: 0.94, background: 'transparent' },
  // The store icon. Opaque navy behind the mark: iOS does not allow
  // transparency, and the mark's own wordmark is white — on a white tile it
  // would vanish, which is the whole reason this crops to the hexagon.
  { file: 'assets/images/icon.png', size: 1024, scale: 0.68, background: NAVY },
  // Android composites this over its own background layer and crops it to
  // whatever mask the launcher uses, so it sits well inside the safe zone.
  { file: 'assets/images/android-icon-foreground.png', size: 1024, scale: 0.52, background: 'transparent' },
  { file: 'assets/images/android-icon-background.png', size: 1024, scale: 0, background: NAVY },
  // A themed icon (Android 13+) must be a single-colour silhouette. Derived
  // from the same pixels: the gold becomes white and everything else,
  // including the navy A, becomes transparent — so the letter is knocked out
  // of the hexagon exactly as it is in the real mark.
  { file: 'assets/images/android-icon-monochrome.png', size: 1024, scale: 0.52, background: 'transparent', mono: true },
  { file: 'assets/images/splash-icon.png', size: 512, scale: 0.86, background: 'transparent' },
  { file: 'assets/images/favicon.png', size: 196, scale: 0.86, background: NAVY },
];

const dataUri = `data:image/webp;base64,${(await readFile(SOURCE)).toString('base64')}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
});

const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
await page.setContent(`<body style="margin:0"><img id="src" src="${dataUri}"></body>`);
await page.waitForFunction(() => document.getElementById('src')?.complete);

/**
 * Where the hexagon is inside the lockup.
 *
 * Found rather than hard-coded, so replacing the logo file with one that has
 * different padding does not silently produce an off-centre icon. The
 * hexagon is the only large gold region in the artwork, so its bounding box
 * is the bounding box of the gold.
 */
const boxes = await page.evaluate(() => {
  const img = document.getElementById('src');
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;

  const track = () => ({ minX: c.width, maxX: 0, minY: c.height, maxY: 0, found: 0 });
  const gold = track();
  const ink = track();
  const note = (b, x, y) => {
    b.found++;
    if (x < b.minX) b.minX = x;
    if (x > b.maxX) b.maxX = x;
    if (y < b.minY) b.minY = y;
    if (y > b.maxY) b.maxY = y;
  };

  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const [r, gg, bb, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      if (a < 128) continue;
      note(ink, x, y);
      if (r > 200 && gg > 140 && bb < 120) note(gold, x, y);
    }
  }
  if (!gold.found) throw new Error('no gold region found — is this the right logo file?');

  const rect = (b) => ({ x: b.minX, y: b.minY, w: b.maxX - b.minX + 1, h: b.maxY - b.minY + 1 });
  return { gold: rect(gold), ink: rect(ink), imgW: c.width, imgH: c.height };
});

console.log(
  `hexagon ${boxes.gold.w}x${boxes.gold.h} at ${boxes.gold.x},${boxes.gold.y} · ` +
    `lockup ${boxes.ink.w}x${boxes.ink.h} at ${boxes.ink.x},${boxes.ink.y} · ` +
    `source ${boxes.imgW}x${boxes.imgH}`,
);

for (const target of TARGETS) {
  const box = target.crop === 'ink' ? boxes.ink : boxes.gold;

  const png = await page.evaluate(
    ({ box, target, navy }) => {
      const img = document.getElementById('src');
      const c = document.createElement('canvas');

      // A cropped target keeps the artwork's own aspect ratio; everything
      // else is a square tile with the mark centred in it.
      if (target.crop) {
        c.height = target.height;
        c.width = Math.round((box.w / box.h) * target.height);
      } else {
        c.width = target.size;
        c.height = target.size;
      }
      const g = c.getContext('2d');

      if (target.background !== 'transparent') {
        g.fillStyle = navy;
        g.fillRect(0, 0, c.width, c.height);
      }

      if (target.crop) {
        g.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
      } else if (target.scale > 0) {
        // Fit the hexagon's longest side into the scaled box and centre it,
        // so a non-square mark is never stretched.
        const side = target.size * target.scale;
        const ratio = Math.min(side / box.w, side / box.h);
        const w = box.w * ratio;
        const h = box.h * ratio;
        g.drawImage(img, box.x, box.y, box.w, box.h, (c.width - w) / 2, (c.height - h) / 2, w, h);
      }

      if (target.mono) {
        const frame = g.getImageData(0, 0, c.width, c.height);
        const d = frame.data;
        for (let i = 0; i < d.length; i += 4) {
          const isGold = d[i + 3] > 128 && d[i] > 200 && d[i + 1] > 140 && d[i + 2] < 120;
          if (isGold) {
            d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255;
          } else {
            d[i + 3] = 0;
          }
        }
        g.putImageData(frame, 0, 0);
      }

      return c.toDataURL('image/png');
    },
    { box, target, navy: NAVY },
  );

  const out = resolve(ROOT, target.file);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`wrote ${target.file}`);
}

await browser.close();
