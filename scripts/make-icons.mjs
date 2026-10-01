/**
 * NOTE (October 2026): the app icon and its Android layers are now made by
 * scripts/make-plain-icon.py — the wordmark on plain navy. Running this
 * script rewrites them with the old artwork; run make-plain-icon.py after it.
 *
 * Derives every piece of brand artwork from the two files the shop supplied:
 *
 *   assets/images/app-icon-art.webp  the app icon — the glass square with the
 *                                    car and the road. The launcher icon, the
 *                                    Android layers, the favicon.
 *   assets/images/logo-lockup.webp   the logo — hexagon and wordmark. What the
 *                                    screens draw, the launch screen's
 *                                    wordmark, and the notification icon.
 *
 *   node scripts/make-icons.mjs
 *
 * Set CHROMIUM_PATH if Playwright's bundled browser is not the one available
 * — a CI image usually ships its own, and a Playwright upgrade asks for a
 * Chromium build that a pinned image will not have.
 *
 * This used to redraw the mark as SVG paths. It no longer does: the shop's
 * files are the shop's artwork, and a reconstruction that is 98% right is a
 * different logo. Everything here is cut from those files rather than drawn
 * beside them.
 *
 * The output is committed, because a build must not depend on a headless
 * browser being available. Re-run it if either file is ever replaced.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCKUP = resolve(ROOT, 'assets/images/logo-lockup.webp');
const ART = resolve(ROOT, 'assets/images/app-icon-art.webp');

/** The dark of the icon artwork, sampled from it: the Android icon's background layer. */
const NIGHT = '#051022';

const LOCKUP_TARGETS = [
  // The whole lockup, trimmed to its ink.
  //
  // The supplied file carries a wide transparent margin — the artwork fills
  // barely half its height — so a component sizing it by height would render
  // the logo at half the size it asked for and nobody would know why.
  // Trimmed here once instead of with a magic number in the component.
  { file: 'assets/images/logo-lockup.png', height: 240, crop: 'ink' },
  // The hexagon on its own, for anywhere the full lockup is too wide.
  { file: 'assets/images/logo-mark.png', size: 512, scale: 0.94 },
  // Android draws a notification's small icon as a single-colour silhouette,
  // and the app icon's glass square would be a white blob at that size. The
  // hexagon reads: the gold becomes white and everything else, the navy A
  // included, becomes transparent — so the letter is knocked out exactly as
  // it is in the real mark.
  { file: 'assets/images/notification-icon.png', size: 1024, scale: 0.52, mono: true },
];

/**
 * Where things are in app-icon-art.webp, in its own pixels.
 *
 * Measured on the supplied 1254 × 1254 file, and checked below: a
 * replacement of another size stops the script rather than producing an
 * off-centre icon. Replace the numbers when the file is replaced.
 */
const ART_SIZE = 1254;
/** The picture inside the glass rim, square — the launcher icon, full bleed (the OS rounds it). */
const INSIDE = { x: 110, y: 106, w: 1030, h: 1030 };

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
const dataUri = async (file) => `data:image/webp;base64,${(await readFile(file)).toString('base64')}`;
await page.setContent(`<body style="margin:0"><img id="lockup" src="${await dataUri(LOCKUP)}"><img id="art" src="${await dataUri(ART)}"></body>`);
await page.waitForFunction(() => ['lockup', 'art'].every((id) => document.getElementById(id)?.complete));

async function write(file, png) {
  const out = resolve(ROOT, file);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`wrote ${file}`);
}

// ---- the logo

/**
 * Where the hexagon is inside the lockup.
 *
 * Found rather than hard-coded, so replacing the logo file with one that has
 * different padding does not silently produce an off-centre icon. The
 * hexagon is the only large gold region in the artwork, so its bounding box
 * is the bounding box of the gold.
 */
const boxes = await page.evaluate(() => {
  const img = document.getElementById('lockup');
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

  // The wordmark: everything inked to the right of the hexagon.
  const words = track();
  for (let y = 0; y < c.height; y++) {
    for (let x = gold.maxX + 8; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] >= 128) note(words, x, y);
    }
  }

  const rect = (b) => ({ x: b.minX, y: b.minY, w: b.maxX - b.minX + 1, h: b.maxY - b.minY + 1 });
  return { gold: rect(gold), ink: rect(ink), words: rect(words), imgW: c.width, imgH: c.height };
});

console.log(
  `hexagon ${boxes.gold.w}x${boxes.gold.h} at ${boxes.gold.x},${boxes.gold.y} · ` +
    `lockup ${boxes.ink.w}x${boxes.ink.h} at ${boxes.ink.x},${boxes.ink.y} · ` +
    `source ${boxes.imgW}x${boxes.imgH}`,
);

for (const target of LOCKUP_TARGETS) {
  const box = target.crop === 'ink' ? boxes.ink : boxes.gold;
  const png = await page.evaluate(
    ({ box, target }) => {
      const img = document.getElementById('lockup');
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

      if (target.crop) {
        g.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
      } else {
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
    { box, target },
  );
  await write(target.file, png);
}

// ---- the launch screen: the wordmark alone, in two layers

/**
 * The name and "PIÈCES AUTO" in one file, the red swoosh in another, both
 * on the same transparent square so they stack exactly. The native splash
 * shows the name; the launch screen (components/preloader) then draws the
 * swoosh in under it.
 *
 * The wordmark is 60% of the square's width: Android 12+ shows a splash
 * picture through a circle, and a wider mark would lose its ends.
 */
const layers = await page.evaluate(
  ({ box }) => {
    const img = document.getElementById('lockup');
    const size = 1024;
    const w = size * 0.6;
    const h = (box.h / box.w) * w;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    const out = {};
    for (const part of ['words', 'swoosh']) {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, box.x, box.y, box.w, box.h, x, y, w, h);
      const frame = g.getImageData(0, 0, size, size);
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        // The swoosh is the only red in the logo; the lettering is white.
        const red = d[i] > 120 && d[i] - d[i + 1] > 70 && d[i] - d[i + 2] > 60;
        if ((part === 'swoosh') !== red) d[i + 3] = 0;
      }
      g.putImageData(frame, 0, 0);
      out[part] = c.toDataURL('image/png');
    }
    return out;
  },
  { box: boxes.words },
);
await write('assets/images/splash-icon.png', layers.words);
await write('assets/images/splash-swoosh.png', layers.swoosh);

// ---- the app icon

const artSize = await page.evaluate(() => document.getElementById('art').naturalWidth);
if (artSize !== ART_SIZE) {
  throw new Error(`app-icon-art.webp is ${artSize}px wide; the crops below were measured on ${ART_SIZE}px. Re-measure them.`);
}

const art = await page.evaluate(
  ({ INSIDE, NIGHT }) => {
    const src = document.getElementById('art');
    const canvas = (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      return [c, g];
    };
    const out = {};

    // The picture inside the rim, square and full bleed. iOS and Android's
    // legacy icon round it themselves; a rim drawn in here would be rounded
    // twice.
    const [inside, gi] = canvas(1024, 1024);
    gi.drawImage(src, INSIDE.x, INSIDE.y, INSIDE.w, INSIDE.h, 0, 0, 1024, 1024);
    out['assets/images/icon.png'] = inside.toDataURL('image/png');

    // Android adaptive icon: launchers show the middle 66% of the layer (683
    // of 1024) through whatever mask they use, a circle at the strictest. The
    // picture at 700 fills that viewport and loses only its outer edge.
    const [fg, gf] = canvas(1024, 1024);
    gf.drawImage(inside, 162, 162, 700, 700);
    out['assets/images/android-icon-foreground.png'] = fg.toDataURL('image/png');
    const [bg, gb] = canvas(1024, 1024);
    gb.fillStyle = NIGHT;
    gb.fillRect(0, 0, 1024, 1024);
    out['assets/images/android-icon-background.png'] = bg.toDataURL('image/png');

    // Themed icon (Android 13+): one colour, the phone tints it. The car and
    // the road are shading, which a silhouette turns to mud; the wordmark,
    // the swoosh and "PIÈCES AUTO" are what survive — the light parts of the
    // band across the middle, white on transparent.
    const band = { y: 380, h: 320 };
    const [strip, gs] = canvas(1024, band.h);
    gs.drawImage(inside, 0, band.y, 1024, band.h, 0, 0, 1024, band.h);
    const px = gs.getImageData(0, 0, 1024, band.h);
    for (let i = 0; i < px.data.length; i += 4) {
      const v = 0.299 * px.data[i] + 0.587 * px.data[i + 1] + 0.114 * px.data[i + 2];
      px.data[i + 3] = v < 110 ? 0 : Math.min(255, Math.round((v - 110) * 2.2));
      px.data[i] = px.data[i + 1] = px.data[i + 2] = 255;
    }
    gs.putImageData(px, 0, 0);
    const [mono, gm] = canvas(1024, 1024);
    const monoW = 640;
    const monoH = Math.round((band.h * monoW) / 1024);
    gm.drawImage(strip, (1024 - monoW) / 2, Math.floor((1024 - monoH) / 2), monoW, monoH);
    out['assets/images/android-icon-monochrome.png'] = mono.toDataURL('image/png');

    const [fav, gv] = canvas(196, 196);
    gv.drawImage(inside, 0, 0, 196, 196);
    out['assets/images/favicon.png'] = fav.toDataURL('image/png');

    return out;
  },
  { INSIDE, NIGHT },
);
for (const [file, png] of Object.entries(art)) await write(file, png);

await browser.close();
