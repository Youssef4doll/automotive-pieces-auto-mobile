import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * The shop's own drawings of the things it sells.
 *
 * Every part family, and every way into the catalogue, is drawn here as SVG
 * on one 24×24 grid with one stroke weight. That is the whole point: sixteen
 * illustrations that visibly belong to each other are a brand, and sixteen
 * icons pulled from three different sets are a template.
 *
 * Why drawn rather than photographed or licensed:
 *
 *   The shop has almost no product photography — `BRIEF.md` §8 — so the
 *   alternative to a drawing is a stock photograph of somebody else's brake
 *   disc, which is both an invention and somebody else's asset. The website
 *   already solved this the same way, with a per-family line drawing behind
 *   anything unphotographed, and the app inherits that answer rather than
 *   inventing a second one.
 *
 *   They are vector, so one file is correct at 20pt in a list row and at
 *   64pt on a home tile, and they take the colour they are given rather than
 *   shipping the navy baked in.
 *
 * The rules that keep them a family — break these and the set stops cohering:
 *
 *   one 24×24 viewBox, so nothing is optically larger than its neighbours;
 *   strokes at 1.6, round caps and joins, never a filled silhouette;
 *   exactly one flat accent shape per drawing, laid down before the strokes;
 *   readable at 20pt, which rules out anything finer than about 2 units;
 *   the recognisable silhouette, not the accurate one — a brake disc gets
 *   four vents because four reads as "vented" and eleven reads as noise.
 */

type ArtProps = {
  size: number;
  /** The line colour. Defaults to the shop's navy. */
  color?: string;
  /** The single flat fill. Defaults to the pale navy surface. */
  accent?: string;
};

type Art = (props: Required<ArtProps>) => React.ReactElement;

/** Every drawing shares these, so a stroke cannot drift between two files. */
const S = {
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Frame({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

// --- Freinage: a vented disc with a pad closing on it ------------------------
const Freinage: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Circle cx={10.5} cy={12} r={7.2} fill={accent} />
    <Circle cx={10.5} cy={12} r={7.2} stroke={color} {...S} />
    <Circle cx={10.5} cy={12} r={2.6} stroke={color} {...S} />
    <Circle cx={10.5} cy={6.6} r={0.85} fill={color} />
    <Circle cx={15.9} cy={12} r={0.85} fill={color} />
    <Circle cx={10.5} cy={17.4} r={0.85} fill={color} />
    <Circle cx={5.1} cy={12} r={0.85} fill={color} />
    <Rect x={18.4} y={8.2} width={3.2} height={7.6} rx={1.3} stroke={color} {...S} />
  </Frame>
);

// --- Filtres: a spin-on canister with its seam and thread --------------------
const Filtres: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Rect x={6.8} y={5.4} width={10.4} height={15} rx={2.4} fill={accent} />
    <Rect x={6.8} y={5.4} width={10.4} height={15} rx={2.4} stroke={color} {...S} />
    <Rect x={9.4} y={2.6} width={5.2} height={2.8} rx={1.2} stroke={color} {...S} />
    <Line x1={6.8} y1={9.4} x2={17.2} y2={9.4} stroke={color} {...S} />
    <Line x1={6.8} y1={16.4} x2={17.2} y2={16.4} stroke={color} {...S} />
  </Frame>
);

// --- Courroie: a belt wrapping a drive and an idler --------------------------
const Courroie: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Circle cx={8.2} cy={8.6} r={4.6} fill={accent} />
    <Circle cx={8.2} cy={8.6} r={4.6} stroke={color} {...S} />
    <Circle cx={8.2} cy={8.6} r={1.5} stroke={color} {...S} />
    <Circle cx={16.6} cy={16} r={3.2} stroke={color} {...S} />
    <Circle cx={16.6} cy={16} r={1.1} stroke={color} {...S} />
    <Path d="M11.6 5.5 L19.3 13.6" stroke={color} {...S} />
    <Path d="M4.8 11.7 L13.9 18.4" stroke={color} {...S} />
  </Frame>
);

// --- Allumage: a spark plug, terminal to electrode ---------------------------
const Allumage: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Rect x={9.6} y={8.4} width={4.8} height={5.4} fill={accent} />
    <Rect x={10.2} y={2.4} width={3.6} height={3.4} rx={1.2} stroke={color} {...S} />
    <Line x1={12} y1={5.8} x2={12} y2={8.4} stroke={color} {...S} />
    <Polygon points="9.6,8.4 14.4,8.4 15.4,11.1 14.4,13.8 9.6,13.8 8.6,11.1" stroke={color} {...S} />
    <Rect x={10.2} y={13.8} width={3.6} height={4.4} stroke={color} {...S} />
    <Line x1={12} y1={18.2} x2={12} y2={21} stroke={color} {...S} />
    <Path d="M14.6 21 L12 21" stroke={color} {...S} />
  </Frame>
);

// --- Suspension: a coil between two plates, rod through it -------------------
const Suspension: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Rect x={10.9} y={4} width={2.2} height={16} fill={accent} />
    <Line x1={6.6} y1={3.4} x2={17.4} y2={3.4} stroke={color} {...S} />
    <Line x1={6.6} y1={20.6} x2={17.4} y2={20.6} stroke={color} {...S} />
    <Polyline
      points="7.4,5.4 16.6,7.6 7.4,9.8 16.6,12 7.4,14.2 16.6,16.4 7.4,18.6"
      stroke={color}
      {...S}
    />
  </Frame>
);

// --- Direction: a tie rod with its ball socket -------------------------------
const Direction: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Circle cx={6.6} cy={17.2} r={3.6} fill={accent} />
    <Circle cx={6.6} cy={17.2} r={3.6} stroke={color} {...S} />
    <Circle cx={6.6} cy={17.2} r={1.2} stroke={color} {...S} />
    <Path d="M9.4 14.9 L15.6 8.7" stroke={color} {...S} />
    <Line x1={13.9} y1={7} x2={17.3} y2={10.4} stroke={color} {...S} />
    <Line x1={15.9} y1={5} x2={19.3} y2={8.4} stroke={color} {...S} />
    <Path d="M17.9 3 L21.3 6.4" stroke={color} {...S} />
  </Frame>
);

// --- Embrayage: a friction disc on its splined hub ---------------------------
const Embrayage: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Circle cx={12} cy={12} r={8.2} fill={accent} />
    <Circle cx={12} cy={12} r={8.2} stroke={color} {...S} />
    <Circle cx={12} cy={12} r={3.4} stroke={color} {...S} />
    <Line x1={12} y1={3.8} x2={12} y2={8.6} stroke={color} {...S} />
    <Line x1={12} y1={15.4} x2={12} y2={20.2} stroke={color} {...S} />
    <Line x1={3.8} y1={12} x2={8.6} y2={12} stroke={color} {...S} />
    <Line x1={15.4} y1={12} x2={20.2} y2={12} stroke={color} {...S} />
  </Frame>
);

// --- Moteur: a block, a head and the crank pulley ----------------------------
const Moteur: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Rect x={4.4} y={9.6} width={12.4} height={9.2} rx={1.6} fill={accent} />
    <Rect x={4.4} y={9.6} width={12.4} height={9.2} rx={1.6} stroke={color} {...S} />
    <Rect x={7.2} y={5.6} width={7.2} height={4} rx={1.2} stroke={color} {...S} />
    <Line x1={9.4} y1={3.4} x2={9.4} y2={5.6} stroke={color} {...S} />
    <Line x1={12.2} y1={3.4} x2={12.2} y2={5.6} stroke={color} {...S} />
    <Circle cx={18.6} cy={15.4} r={2.8} stroke={color} {...S} />
    <Path d="M16.8 18.8 L4.4 18.8" stroke={color} {...S} />
  </Frame>
);

// --- Eclairage: a headlamp throwing light ------------------------------------
const Eclairage: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Path d="M4 8.4 C4 6.5 5.4 5.2 7.4 5.2 L11.6 5.2 C13.2 6.6 13.2 17.4 11.6 18.8 L7.4 18.8 C5.4 18.8 4 17.5 4 15.6 Z" fill={accent} />
    <Path d="M4 8.4 C4 6.5 5.4 5.2 7.4 5.2 L11.6 5.2 C13.2 6.6 13.2 17.4 11.6 18.8 L7.4 18.8 C5.4 18.8 4 17.5 4 15.6 Z" stroke={color} {...S} />
    <Line x1={15.2} y1={8.4} x2={20.4} y2={6.6} stroke={color} {...S} />
    <Line x1={15.6} y1={12} x2={21} y2={12} stroke={color} {...S} />
    <Line x1={15.2} y1={15.6} x2={20.4} y2={17.4} stroke={color} {...S} />
  </Frame>
);

// --- Démarrage électrique: a battery with its posts --------------------------
const Demarrage: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Rect x={3.4} y={7.6} width={17.2} height={11.4} rx={2} fill={accent} />
    <Rect x={3.4} y={7.6} width={17.2} height={11.4} rx={2} stroke={color} {...S} />
    <Rect x={6.2} y={5} width={3.2} height={2.6} rx={0.8} stroke={color} {...S} />
    <Rect x={14.6} y={5} width={3.2} height={2.6} rx={0.8} stroke={color} {...S} />
    <Line x1={6.4} y1={13.3} x2={10} y2={13.3} stroke={color} {...S} />
    <Line x1={8.2} y1={11.5} x2={8.2} y2={15.1} stroke={color} {...S} />
    <Line x1={14} y1={13.3} x2={17.6} y2={13.3} stroke={color} {...S} />
  </Frame>
);

// --- Capteurs: a probe body with its lead ------------------------------------
const Capteurs: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Polygon points="7.6,4.6 12.4,4.6 13.8,7.4 12.4,10.2 7.6,10.2 6.2,7.4" fill={accent} />
    <Polygon points="7.6,4.6 12.4,4.6 13.8,7.4 12.4,10.2 7.6,10.2 6.2,7.4" stroke={color} {...S} />
    <Rect x={8.4} y={10.2} width={3.2} height={4.4} stroke={color} {...S} />
    <Line x1={10} y1={14.6} x2={10} y2={17.2} stroke={color} {...S} />
    <Path d="M10 17.2 C10 19.6 14 19.6 14 17.2 C14 15.2 17.6 15.2 17.6 17.6 L17.6 20.4" stroke={color} {...S} />
  </Frame>
);

// --- Carosserie: the car itself, in profile ----------------------------------
const Carosserie: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Path d="M2.6 15.4 L3.6 11.4 L6.6 8 L14.6 8 L18.4 11.4 L21.4 12.2 L21.4 15.4 Z" fill={accent} />
    <Path d="M2.6 15.4 L3.6 11.4 L6.6 8 L14.6 8 L18.4 11.4 L21.4 12.2 L21.4 15.4 Z" stroke={color} {...S} />
    <Line x1={10.4} y1={8} x2={10.4} y2={11.4} stroke={color} {...S} />
    <Line x1={3.6} y1={11.4} x2={18.4} y2={11.4} stroke={color} {...S} />
    <Circle cx={7.4} cy={16.4} r={2.2} stroke={color} {...S} />
    <Circle cx={16.8} cy={16.4} r={2.2} stroke={color} {...S} />
  </Frame>
);

// --- Refroidissement: a finned radiator with its cap -------------------------
const Refroidissement: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Rect x={4} y={6.4} width={16} height={13.2} rx={1.8} fill={accent} />
    <Rect x={4} y={6.4} width={16} height={13.2} rx={1.8} stroke={color} {...S} />
    <Line x1={8} y1={6.4} x2={8} y2={19.6} stroke={color} {...S} />
    <Line x1={12} y1={6.4} x2={12} y2={19.6} stroke={color} {...S} />
    <Line x1={16} y1={6.4} x2={16} y2={19.6} stroke={color} {...S} />
    <Rect x={9.8} y={3.4} width={4.4} height={3} rx={1} stroke={color} {...S} />
  </Frame>
);

// --- Cardan: a shaft into its pleated boot -----------------------------------
const Cardan: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Path d="M11.6 6.6 L17.4 4.4 L17.4 19.6 L11.6 17.4 Z" fill={accent} />
    <Path d="M11.6 6.6 L17.4 4.4 L17.4 19.6 L11.6 17.4 Z" stroke={color} {...S} />
    <Line x1={13.5} y1={5.9} x2={13.5} y2={18.1} stroke={color} {...S} />
    <Line x1={15.5} y1={5.1} x2={15.5} y2={18.9} stroke={color} {...S} />
    <Rect x={2.6} y={10} width={9} height={4} rx={1.2} stroke={color} {...S} />
    <Circle cx={19.8} cy={12} r={1.6} stroke={color} {...S} />
  </Frame>
);

// --- Climatisation: cold, as a snowflake -------------------------------------
const Climatisation: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Circle cx={12} cy={12} r={2.4} fill={accent} />
    <Line x1={12} y1={2.6} x2={12} y2={21.4} stroke={color} {...S} />
    <Line x1={3.9} y1={7.3} x2={20.1} y2={16.7} stroke={color} {...S} />
    <Line x1={3.9} y1={16.7} x2={20.1} y2={7.3} stroke={color} {...S} />
    <Polyline points="9.6,4.8 12,6.2 14.4,4.8" stroke={color} {...S} />
    <Polyline points="9.6,19.2 12,17.8 14.4,19.2" stroke={color} {...S} />
  </Frame>
);

// --- Lubrifiant: oil, leaving the can ----------------------------------------
const Lubrifiant: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Path d="M16.4 12.6 C16.4 15 14.6 16.6 12.6 16.6 C10.6 16.6 8.8 15 8.8 12.6 C8.8 10.2 12.6 6 12.6 6 C12.6 6 16.4 10.2 16.4 12.6 Z" fill={accent} />
    <Path d="M16.4 12.6 C16.4 15 14.6 16.6 12.6 16.6 C10.6 16.6 8.8 15 8.8 12.6 C8.8 10.2 12.6 6 12.6 6 C12.6 6 16.4 10.2 16.4 12.6 Z" stroke={color} {...S} />
    <Path d="M5.4 19.6 C5.4 20.6 4.4 20.6 4.4 19.6 C4.4 18.8 4.9 17.8 4.9 17.8 C4.9 17.8 5.4 18.8 5.4 19.6 Z" stroke={color} {...S} />
    <Path d="M19.6 18.4 C19.6 19.6 18.2 19.6 18.2 18.4 C18.2 17.4 18.9 16.2 18.9 16.2 C18.9 16.2 19.6 17.4 19.6 18.4 Z" stroke={color} {...S} />
  </Frame>
);

/**
 * Anything the app has no drawing for.
 *
 * The catalogue's families come from the database and the shop can add one
 * from the admin at any time, so the app will meet slugs that did not exist
 * when it was built. That must render something deliberate rather than a gap
 * where a tile's icon should be — a missing illustration should look like a
 * part nobody has drawn yet, not like a broken screen.
 */
const Generic: Art = ({ size, color, accent }) => (
  <Frame size={size}>
    <Rect x={4.2} y={7.4} width={15.6} height={11.4} rx={2} fill={accent} />
    <Rect x={4.2} y={7.4} width={15.6} height={11.4} rx={2} stroke={color} {...S} />
    <Path d="M8.6 7.4 L8.6 5.2 L15.4 5.2 L15.4 7.4" stroke={color} {...S} />
    <Line x1={4.2} y1={12} x2={19.8} y2={12} stroke={color} {...S} />
  </Frame>
);

/**
 * Keyed by the category slug the API sends, so adding a drawing is a one-line
 * change and no screen has to know which families have one.
 */
const BY_SLUG: Record<string, Art> = {
  freinage: Freinage,
  filtres: Filtres,
  'courroie-tendeur-et-chaine': Courroie,
  'allumage-prechauffage': Allumage,
  suspension: Suspension,
  'direction-et-trains-roulants': Direction,
  embrayage: Embrayage,
  moteur: Moteur,
  eclairage: Eclairage,
  'demarrage-electrique': Demarrage,
  'capteurs-et-sondes': Capteurs,
  carosserie: Carosserie,
  'refroidissement-moteur': Refroidissement,
  'cardan-et-transmission': Cardan,
  climatisation: Climatisation,
  lubrifiant: Lubrifiant,
};

export function PartArtwork({
  slug,
  size = 28,
  color = Brand.navy900,
  accent = Brand.navy50,
}: ArtProps & { slug: string }) {
  const Drawing = BY_SLUG[slug] ?? Generic;
  return <Drawing size={size} color={color} accent={accent} />;
}

/** Whether this family has a drawing of its own. For tests, not for screens. */
export function hasArtwork(slug: string) {
  return slug in BY_SLUG;
}

export const DRAWN_FAMILIES = Object.keys(BY_SLUG);
