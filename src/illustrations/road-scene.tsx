import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * The home hero's night road, drawn rather than photographed.
 *
 * The reference design puts a photograph of a car on a mountain road behind
 * "Que recherchez-vous ?". The shop has no such photograph, and a stock one
 * would be somebody else's asset — so the same mood is drawn: a navy sky, two
 * ridges, a road running to a lit horizon with its centre line in the shop's
 * gold. It scales to any width (`slice`) and costs a few hundred bytes.
 *
 * When the shop has its own photography, this is the component that gives
 * way to it.
 */
export function RoadScene({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 390 460" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#060d24" />
          <Stop offset="0.55" stopColor="#12264f" />
          <Stop offset="1" stopColor="#0a1633" />
        </LinearGradient>
        <RadialGradient id="glow" cx="195" cy="300" r="190" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
          <Stop offset="0.35" stopColor="#9aabc8" stopOpacity="0.22" />
          <Stop offset="1" stopColor="#0f2352" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1c2c50" />
          <Stop offset="1" stopColor="#070d1f" />
        </LinearGradient>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#060d24" stopOpacity="0.55" />
          <Stop offset="0.3" stopColor="#060d24" stopOpacity="0" />
          <Stop offset="0.85" stopColor="#060d24" stopOpacity="0" />
          <Stop offset="1" stopColor="#060d24" stopOpacity="0.5" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="390" height="460" fill="url(#sky)" />
      {/* a few stars */}
      {[
        [40, 60], [92, 28], [150, 70], [268, 40], [330, 82], [360, 22], [210, 18],
      ].map(([x, y]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} fill="#9aabc8" opacity={0.6} />
      ))}
      <Ellipse cx="195" cy="300" rx="260" ry="150" fill="url(#glow)" />
      {/* far ridge, near ridge */}
      <Path d="M0 250 L50 212 L96 236 L150 190 L205 232 L250 204 L300 236 L352 198 L390 222 L390 320 L0 320 Z" fill="#1c3a70" opacity={0.55} />
      <Path d="M0 282 L60 244 L118 276 L170 256 L195 296 L230 262 L290 280 L340 250 L390 272 L390 340 L0 340 Z" fill="#0d1d42" />
      {/* the road */}
      <Path d="M186 296 L204 296 L430 460 L-40 460 Z" fill="url(#road)" />
      <Path d="M186 296 L-40 460" stroke="#6b83ad" strokeWidth={1.4} opacity={0.55} />
      <Path d="M204 296 L430 460" stroke="#6b83ad" strokeWidth={1.4} opacity={0.55} />
      {[
        [300, 312, 1.2],
        [322, 340, 2],
        [358, 392, 3],
        [410, 460, 4.4],
      ].map(([y1, y2, w]) => (
        <Path key={y1} d={`M195 ${y1} L195 ${y2}`} stroke="#fbc000" strokeWidth={w} strokeLinecap="round" opacity={0.85} />
      ))}
      <Rect x="0" y="0" width="390" height="460" fill="url(#fade)" />
    </Svg>
  );
}
