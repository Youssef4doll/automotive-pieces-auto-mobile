/**
 * The arithmetic of a web map (Web Mercator, 256-pixel tiles) for the
 * delivery pin (components/ui/pin-map) — pure, so it is tested.
 *
 * Tiles come from OpenStreetMap by default. Its tile servers are run by
 * volunteers for light use and ask every app to say who it is and to credit
 * the map; a shop sending many orders a day should point
 * `EXPO_PUBLIC_MAP_TILES` at a paid provider (MapTiler, Stadia…) with the
 * same `{z}/{x}/{y}` pattern.
 */
export const TILE = 256;

export const TILE_URL = process.env.EXPO_PUBLIC_MAP_TILES || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export type LatLng = { lat: number; lng: number };

/** World pixel position of a point at zoom `z`. */
export function project({ lat, lng }: LatLng, z: number): { x: number; y: number } {
  const scale = TILE * 2 ** z;
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  };
}

/** The point at a world pixel position, at zoom `z`. */
export function unproject({ x, y }: { x: number; y: number }, z: number): LatLng {
  const scale = TILE * 2 ** z;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

/** The tiles that cover a `width` × `height` view centred on `center`, each with where it sits in the view. */
export function tilesFor(center: LatLng, z: number, width: number, height: number) {
  const c = project(center, z);
  const left = c.x - width / 2;
  const top = c.y - height / 2;
  const count = 2 ** z;
  const out: { key: string; url: string; x: number; y: number }[] = [];
  for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) {
    if (ty < 0 || ty >= count) continue;
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++) {
      const wrapped = ((tx % count) + count) % count;
      out.push({
        key: `${z}/${tx}/${ty}`,
        url: TILE_URL.replace('{z}', String(z)).replace('{x}', String(wrapped)).replace('{y}', String(ty)),
        x: tx * TILE - left,
        y: ty * TILE - top,
      });
    }
  }
  return out;
}

/** Five decimals: about a metre, the most a pin on a phone can mean. */
export const roundCoord = (n: number) => Math.round(n * 1e5) / 1e5;

/**
 * The capital of each governorate — only where the map opens before the
 * customer has a pin or a position, so it opens on their town and not on
 * the sea.
 */
export const GOVERNORATE_CENTRES: Record<string, LatLng> = {
  Tunis: { lat: 36.8065, lng: 10.1815 },
  Ariana: { lat: 36.8625, lng: 10.1956 },
  'Ben Arous': { lat: 36.7531, lng: 10.2189 },
  Manouba: { lat: 36.8081, lng: 10.0972 },
  Nabeul: { lat: 36.4561, lng: 10.7376 },
  Zaghouan: { lat: 36.4029, lng: 10.1429 },
  Bizerte: { lat: 37.2744, lng: 9.8739 },
  Béja: { lat: 36.7256, lng: 9.1817 },
  Jendouba: { lat: 36.5011, lng: 8.7802 },
  'Le Kef': { lat: 36.1826, lng: 8.7149 },
  Siliana: { lat: 36.0849, lng: 9.3708 },
  Sousse: { lat: 35.8256, lng: 10.636 },
  Monastir: { lat: 35.7643, lng: 10.8113 },
  Mahdia: { lat: 35.5047, lng: 11.0622 },
  Sfax: { lat: 34.7406, lng: 10.7603 },
  Kairouan: { lat: 35.6781, lng: 10.0963 },
  Kasserine: { lat: 35.1676, lng: 8.8365 },
  'Sidi Bouzid': { lat: 35.0382, lng: 9.4849 },
  Gabès: { lat: 33.8815, lng: 10.0982 },
  Médenine: { lat: 33.3549, lng: 10.5055 },
  Tataouine: { lat: 32.9297, lng: 10.4518 },
  Gafsa: { lat: 34.425, lng: 8.7842 },
  Tozeur: { lat: 33.9197, lng: 8.1335 },
  Kébili: { lat: 33.7044, lng: 8.969 },
};

/** Inside the box the shop accepts a pin in (the website's lib/orders/place). */
export const inTunisia = ({ lat, lng }: LatLng) => lat >= 30 && lat <= 38 && lng >= 7 && lng <= 12;

/**
 * The governorate a reverse-geocoded region names — "Ariana", "Gouvernorat
 * de Sfax", "Sfax Governorate", "ولاية صفاقس" won't match and gives null —
 * matched against the shop's own list without accents or case. Null when
 * nothing matches: the customer then picks it, as before.
 */
export function governorateFromRegion(region: string | null | undefined, list: string[]): string | null {
  if (!region) return null;
  const plain = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\b(gouvernorat|governorate|de|du|delegation)\b/g, '')
      .replace(/[^a-z ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const r = plain(region);
  return list.find((g) => plain(g) === r) ?? list.find((g) => r.includes(plain(g))) ?? null;
}
