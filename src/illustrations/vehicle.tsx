import type { ColorValue } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * The car itself, drawn in the same hand as the part families.
 *
 * `./parts.tsx` and `./paths.tsx` work on a 24×24 grid with a 1.6pt stroke. A
 * car does not fit a square — squeezed into one it becomes a shape that could
 * equally be a van or a shoe — so these use a wide box instead, and keep the
 * family by matching the *rendered* stroke rather than the number in the file.
 *
 * That is what `strokeFor` does. A stroke of 1.6 on a 24-unit box rendered at
 * 24pt is 1.6pt on the glass; the same drawing on a 64-unit box rendered at
 * 200pt would come out at 0.5pt and look like a different, thinner icon set.
 * So the stroke is computed back from the size it will be drawn at, and a
 * 56pt context card and a 220pt garage hero are visibly the same pen.
 *
 * No make is implied. This is a generic three-box saloon and it is drawn for
 * every car in the garage, because the shop's database holds a make, a model
 * and an engine — not a body style — and drawing a hatchback for a "208" and
 * an estate for a "Passat" would be the app inventing a fact about the
 * customer's car. A neutral silhouette says "your vehicle" and claims nothing.
 */

const VIEW_W = 64;
const VIEW_H = 26;

/** The stroke that renders at `pt` points, for a drawing `units` wide. */
function strokeFor(width: number, pt = 1.8): number {
  return (pt * VIEW_W) / Math.max(width, 1);
}

const BODY =
  'M4 20.5 L4 16.4 C4 15.3 4.7 14.5 5.8 14.3 L16.6 12.7 L22.6 6.9 ' +
  'C23.1 6.3 23.9 5.9 24.7 5.9 L38.6 5.9 C39.5 5.9 40.3 6.2 40.9 6.8 ' +
  'L47.6 12.5 L57.6 13.7 C59.3 14 60.5 15.4 60.5 17.1 L60.5 20.5 ' +
  'L52.2 20.5 A4.2 4.2 0 0 0 43.8 20.5 L20.2 20.5 A4.2 4.2 0 0 0 11.8 20.5 Z';

const GLASS_FRONT = 'M23.6 7.4 L31.2 7.4 L31.2 12 L18.8 12 Z';
const GLASS_REAR = 'M32.8 7.4 L38.6 7.4 L44.4 12 L32.8 12 Z';

type CarProps = {
  /** Rendered width in points. The height follows the box's ratio. */
  width?: number;
  color?: string;
  accent?: string;
  /** A faint line under the wheels. On a light card it reads as ground. */
  ground?: boolean;
};

/**
 * Below this, the fine detail comes off.
 *
 * A door handle is 2.8 units on a 64-unit box. Rendered at 56pt that is
 * 2.4pt of line with a 1.8pt stroke on it, which is not a handle — it is a
 * smudge next to the door seam, and it made the small car look dirty rather
 * than detailed. Above 80pt there is room for it and the drawing gains from
 * it. The seam stays at every size: it is the one line that stops the
 * silhouette reading as a single moulded lump.
 */
const DETAIL_FROM = 80;

/** …and the bay lines around the empty-garage drawing. See `EmptyBay`. */
const BAY_FROM = 120;

/** A car, from the side. The app's picture of "your vehicle". */
export function CarProfile({
  width = 64,
  color = Brand.navy900,
  accent = Brand.navy50,
  ground = false,
}: CarProps) {
  const stroke = strokeFor(width);
  const common = {
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  } as const;

  return (
    <Svg
      width={width}
      height={(width * VIEW_H) / VIEW_W}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      fill="none"
    >
      {ground ? (
        <Line
          x1={7}
          y1={25.3}
          x2={57}
          y2={25.3}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          opacity={0.18}
        />
      ) : null}

      <Path d={BODY} fill={accent} />
      <Path d={BODY} {...common} />

      {/* The greenhouse, split at the B-pillar. Two panes rather than one
          read as a car with doors; one long pane reads as a bus. */}
      <Path d={GLASS_FRONT} fill={Brand.white} opacity={0.65} />
      <Path d={GLASS_FRONT} {...common} />
      <Path d={GLASS_REAR} fill={Brand.white} opacity={0.65} />
      <Path d={GLASS_REAR} {...common} />

      {/* The door seam, at every size. See DETAIL_FROM. */}
      <Line x1={32} y1={12.6} x2={32} y2={19.2} {...common} />

      {width >= DETAIL_FROM ? (
        <G>
          <Line x1={34.6} y1={14.6} x2={37.4} y2={14.6} {...common} />
          <Line x1={5.1} y1={15.8} x2={8.2} y2={15.4} {...common} />
          <Line x1={58} y1={15.6} x2={60.3} y2={16} {...common} />
        </G>
      ) : null}

      <G>
        <Circle cx={16} cy={20.5} r={4.2} fill={Brand.white} />
        <Circle cx={16} cy={20.5} r={4.2} {...common} />
        <Circle cx={16} cy={20.5} r={1.5} {...common} />
        <Circle cx={48} cy={20.5} r={4.2} fill={Brand.white} />
        <Circle cx={48} cy={20.5} r={4.2} {...common} />
        <Circle cx={48} cy={20.5} r={1.5} {...common} />
      </G>
    </Svg>
  );
}

/**
 * An empty bay: the garage with nothing in it.
 *
 * The same car, drawn as a dashed outline between two bay lines. It says
 * "there is room here for your car" in one picture, which is exactly what the
 * empty garage screen is asking for — and it does it without the shrugging
 * cartoon person that generic empty states reach for.
 */
export function EmptyBay({ width = 180, color = Brand.navy300 }: { width?: number; color?: string }) {
  const stroke = strokeFor(width, 1.6);

  return (
    <Svg
      width={width}
      height={(width * VIEW_H) / VIEW_W}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      fill="none"
    >
      {/* The bay. Solid, because the bay is real; the car is what is missing.

          Only at a size where it reads as a bay. Below about 120pt the three
          lines are 1pt marks a few points from the drawing they frame, and
          they stop meaning "parking space" and start looking like the
          illustration has a border it did not ask for. */}
      {width >= BAY_FROM ? (
        <G>
          <Line x1={1.5} y1={3} x2={1.5} y2={24} stroke={color} strokeWidth={stroke} strokeLinecap="round" opacity={0.5} />
          <Line x1={62.5} y1={3} x2={62.5} y2={24} stroke={color} strokeWidth={stroke} strokeLinecap="round" opacity={0.5} />
          <Line x1={1.5} y1={24} x2={62.5} y2={24} stroke={color} strokeWidth={stroke} strokeLinecap="round" opacity={0.5} />
        </G>
      ) : null}

      <Path
        d={BODY}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${stroke * 2.5} ${stroke * 2}`}
        fill="none"
      />
    </Svg>
  );
}

/**
 * The car head-on, at icon size, for the tab bar.
 *
 * Feather — which every other glyph in the bar comes from — has no car. Its
 * own grammar is a 24-unit box, a 2.0 stroke, round caps and round joins, so
 * this is drawn to exactly that and sits in the row without looking borrowed.
 * The alternative was `disc`, a brake rotor standing in for a garage, which
 * nobody read as a garage.
 */
export function NavCar({
  size = 20,
  // `ColorValue`, not `string`: the tab navigator hands its icons a tint that
  // can be a platform colour object rather than a hex string, and narrowing
  // it here would make every call site cast.
  color = Brand.navy900,
}: {
  size?: number;
  color?: ColorValue;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* A closed body with the wheels sitting on its lower edge. The first
          try left the body open and ran the axle line out past it to suggest
          bumpers; at 20pt that extra width read as a bench, not a car. */}
      <Path
        d="M3.6 16.8 V12.8 a2 2 0 0 1 2-2 h12.8 a2 2 0 0 1 2 2 v4 Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M7 10.8 8.6 7.2 A2 2 0 0 1 10.4 6 h3.2 a2 2 0 0 1 1.8 1.2 L17 10.8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Filled white rather than left open: the body's bottom edge runs
          behind them, and an unfilled wheel shows that line as a chord. */}
      <Circle cx={7.4} cy={17.6} r={1.7} fill={Brand.white} stroke={color} strokeWidth={2} />
      <Circle cx={16.6} cy={17.6} r={1.7} fill={Brand.white} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
