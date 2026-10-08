/**
 * Adds car makes' marks from Simple Icons to src/illustrations/marques.ts.
 *
 * Simple Icons is not a dependency of the app; install it anywhere and run
 * this from there:
 *
 *   cd "$(mktemp -d)" && npm i simple-icons@16
 *   node <repo>/tools/marks/add-make-marks.js <repo>/src/illustrations/marques.ts
 *
 * A make already in MAKE_MARKS is left as it is. The key is the make's
 * name or slug as markKey() reads it ("Škoda" → skoda); the value is the
 * Simple Icons slug. A make Simple Icons does not have (Mercedes-Benz,
 * Alfa Romeo, Land Rover, Chery, Geely…) cannot be added here: the app shows
 * the logo uploaded in /admin for it, else its initials.
 */
const fs = require('fs');

const si = require(require.resolve('simple-icons', { paths: [process.cwd()] }));

const ADD = {
  audi: 'audi', bmw: 'bmw', chevrolet: 'chevrolet', citroen: 'citroen', dacia: 'dacia',
  ds: 'dsautomobiles', dsautomobiles: 'dsautomobiles', fiat: 'fiat', ford: 'ford', honda: 'honda',
  hyundai: 'hyundai', infiniti: 'infiniti', iveco: 'iveco', jeep: 'jeep', kia: 'kia', lada: 'lada',
  mahindra: 'mahindra', mazda: 'mazda', mg: 'mg', mini: 'mini', mitsubishi: 'mitsubishi',
  nissan: 'nissan', opel: 'opel', peugeot: 'peugeot', porsche: 'porsche', renault: 'renault',
  seat: 'seat', skoda: 'skoda', smart: 'smart', subaru: 'subaru', suzuki: 'suzuki', tata: 'tata',
  tesla: 'tesla', toyota: 'toyota', volkswagen: 'volkswagen', volvo: 'volvo',
};

const file = process.argv[2];
if (!file) throw new Error('usage: node add-make-marks.js <path to marques.ts>');
const src = fs.readFileSync(file, 'utf8');
const icons = Object.values(si).filter((x) => x && x.slug);

const start = src.indexOf('export const MAKE_MARKS');
const open = src.indexOf('{\n', start) + 2;
const close = src.indexOf('\n};', open);
const entries = new Map(
  src
    .slice(open, close)
    .split('\n')
    .map((line) => [line.trim().split(':')[0], line]),
);
for (const [key, slug] of Object.entries(ADD)) {
  if (entries.has(key)) continue;
  const icon = icons.find((i) => i.slug === slug);
  if (!icon) throw new Error(`simple-icons has no "${slug}"`);
  entries.set(key, `  ${key}: { title: ${JSON.stringify(icon.title)}, path: ${JSON.stringify(icon.path)} },`);
}
const sorted = [...entries.keys()].sort().map((k) => entries.get(k));
fs.writeFileSync(file, src.slice(0, open) + sorted.join('\n') + src.slice(close));
console.log(`${sorted.length} make marks`);
