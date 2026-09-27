/**
 * Derives every piece of brand artwork from the two files the shop supplied:
 *
 *   assets/images/app-icon-art.webp  the app icon — the glass square with the
 *                                    car and the road. The launcher icon, the
 *                                    Android layers, the splash, the favicon.
 *   assets/images/logo-lockup.webp   the logo — hexagon and wordmark. What the
 *                                    screens draw, and the notification icon.
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

/** From constants/theme.ts (`LaunchBackground`). Literal, because this is plain node. */
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
/** The glass with its rim and a margin of its glow — the splash. */
const GLASS = { x: 40, y: 44, w: 1170, h: 1148 };
/** The rim itself, inside GLASS, and its corner radius. */
const RIM = { x: 92, y: 96, right: 1158, bottom: 1140, radius: 200 };

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

  const rect = (b) => ({ x: b.minX, y: b.minY, w: b.maxX - b.minX + 1, h: b.maxY - b.minY + 1 });
  return { gold: rect(gold), ink: rect(ink), imgW: c.width, imgH: c.height };
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

// ---- the app icon

const artSize = await page.evaluate(() => document.getElementById('art').naturalWidth);
if (artSize !== ART_SIZE) {
  throw new Error(`app-icon-art.webp is ${artSize}px wide; the crops below were measured on ${ART_SIZE}px. Re-measure them.`);
}

const art = await page.evaluate(
  ({ INSIDE, GLASS, RIM, NIGHT }) => {
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

    // Splash: the glass as drawn — rim, rounded corners and its glow — on
    // transparent, over the launch night (app.json). The glass is ~55% of the
    // box, so Android 12's circular splash mask never reaches it.
    const scale = 560 / (RIM.right - RIM.x);
    const w = Math.round(GLASS.w * scale);
    const h = Math.round(GLASS.h * scale);
    const [glass, gg] = canvas(w, h);
    gg.drawImage(src, GLASS.x, GLASS.y, GLASS.w, GLASS.h, 0, 0, w, h);
    // Opaque inside the rim; beyond it, the glow keeps its own light and
    // fades out, so the square does not sit in a dark box on the night.
    const [shape, gh] = canvas(w, h);
    gh.fillStyle = '#fff';
    gh.beginPath();
    gh.roundRect(
      (RIM.x - GLASS.x) * scale,
      (RIM.y - GLASS.y) * scale,
      (RIM.right - RIM.x) * scale,
      (RIM.bottom - RIM.y) * scale,
      RIM.radius * scale,
    );
    gh.fill();
    const [soft, gso] = canvas(w, h);
    gso.filter = 'blur(14px)';
    gso.drawImage(shape, 0, 0);
    const pic = gg.getImageData(0, 0, w, h);
    const hard = gh.getImageData(0, 0, w, h).data;
    const halo = gso.getImageData(0, 0, w, h).data;
    for (let i = 0; i < pic.data.length; i += 4) {
      const light = Math.min(255, 3 * (0.299 * pic.data[i] + 0.587 * pic.data[i + 1] + 0.114 * pic.data[i + 2]));
      pic.data[i + 3] = Math.max(hard[i + 3], Math.round((halo[i + 3] * light) / 255));
    }
    gg.putImageData(pic, 0, 0);
    const [splash, gp] = canvas(1024, 1024);
    gp.drawImage(glass, Math.floor((1024 - w) / 2), Math.floor((1024 - h) / 2));
    out['assets/images/splash-icon.png'] = splash.toDataURL('image/png');

    return out;
  },
  { INSIDE, GLASS, RIM, NIGHT },
);
for (const [file, png] of Object.entries(art)) await write(file, png);

await browser.close();
