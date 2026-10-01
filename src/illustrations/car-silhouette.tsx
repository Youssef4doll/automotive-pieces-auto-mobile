import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * A car in profile at night, for the garage's hero card: a low saloon in
 * the navy of the card, a line of gold light along its roof, a lit headlamp,
 * alloy wheels and a warm glow on the road under it — the mood of the
 * launch artwork rather than a cartoon.
 *
 * Still deliberately no car in particular: no grille, badge or light
 * signature of any maker. The shop knows a make, model and engine, not a
 * body or a colour; the make's own badge sits beside the name instead.
 *
 * 320×120 units, facing right; `width` sets the rendered size.
 */
export function CarSilhouette({ width = 280 }: { width?: number }) {
  const height = (width * 120) / 320;
  const roof = 'M44 60 C60 56 82 54 98 52 C116 36 140 24 172 22 C200 20 222 24 238 40 C246 48 254 52 268 54 C286 57 300 62 304 72';
  return (
    <Svg width={width} height={height} viewBox="0 0 320 120">
      <Defs>
        <LinearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={Brand.navy600} />
          <Stop offset="0.55" stopColor={Brand.navy800} />
          <Stop offset="1" stopColor={Brand.navy950} />
        </LinearGradient>
        <LinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9fb4d8" stopOpacity="0.55" />
          <Stop offset="1" stopColor={Brand.navy900} stopOpacity="0.9" />
        </LinearGradient>
        <RadialGradient id="ground" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor={Brand.gold500} stopOpacity="0.38" />
          <Stop offset="1" stopColor={Brand.gold500} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="lamp" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor={Brand.gold400} stopOpacity="0.9" />
          <Stop offset="1" stopColor={Brand.gold400} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={Brand.gold400} stopOpacity="0.35" />
          <Stop offset="1" stopColor={Brand.gold400} stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id="rim" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor="#c9d3e6" />
          <Stop offset="1" stopColor={Brand.navy400} />
        </RadialGradient>
      </Defs>

      {/* The warm light on the road, and the shadow right under the car. */}
      <Ellipse cx={162} cy={110} rx={150} ry={9} fill="url(#ground)" />
      <Ellipse cx={160} cy={106} rx={122} ry={4} fill={Brand.navy950} opacity={0.7} />

      {/* The headlamp's beam ahead of it. */}
      <Path d="M300 66 L320 58 L320 84 L300 74 Z" fill="url(#beam)" />

      {/* The body, its arches cut for the wheels. */}
      <Path
        d={`${roof} C307 78 306 84 300 88 L262 88 A28 28 0 0 0 206 88 L112 88 A28 28 0 0 0 56 88 L18 86 C14 78 16 70 24 66 Z`}
        fill="url(#body)"
      />
      {/* Glass, split by the B-pillar. */}
      <Path d="M108 52 C122 40 142 31 168 30 L170 52 Z" fill="url(#glass)" />
      <Path d="M177 30 C200 30 218 34 229 45 L233 52 L177 52 Z" fill="url(#glass)" />
      {/* The shoulder line and a door seam, barely there. */}
      <Path d="M28 70 C110 66 210 66 292 68" stroke={Brand.white} strokeOpacity={0.14} strokeWidth={1.5} fill="none" />
      <Path d="M172 54 L170 86" stroke={Brand.navy950} strokeOpacity={0.6} strokeWidth={1.2} />
      {/* Gold light along the roof. */}
      <Path d={roof} stroke={Brand.gold400} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.9} />

      {/* Lamps. */}
      <Ellipse cx={298} cy={67} rx={14} ry={9} fill="url(#lamp)" />
      <Path d="M290 63 L303 65 L301 70 L290 68 Z" fill={Brand.gold400} />
      <Path d="M20 68 L30 66 L30 72 L21 73 Z" fill={Brand.red500} opacity={0.9} />

      {/* Wheels: tyre, alloy, five spokes, hub. */}
      {[84, 234].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={88} r={23} fill="#070f22" />
          <Circle cx={x} cy={88} r={14} fill="url(#rim)" />
          {[0, 72, 144, 216, 288].map((a) => (
            <Path
              key={a}
              d={`M${x} 88 L${x + 13 * Math.cos(((a - 90) * Math.PI) / 180)} ${88 + 13 * Math.sin(((a - 90) * Math.PI) / 180)}`}
              stroke={Brand.navy700}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
          <Circle cx={x} cy={88} r={4} fill={Brand.navy900} />
          <Circle cx={x} cy={88} r={14} fill="none" stroke={Brand.navy950} strokeWidth={1.5} />
        </G>
      ))}
    </Svg>
  );
}
