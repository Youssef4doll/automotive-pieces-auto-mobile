import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * "Send us a photo", drawn in the shop's flat navy and gold like the other
 * empty-screen drawings (illustrations/empty-art): a phone framing a brake
 * disc in its viewfinder, and a gold speech bubble asking the question the
 * shop answers. It replaced a photographed phone in a white disc that sat on
 * the navy card like a sticker.
 */
export function AdviceArt({ size = 88 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Ellipse cx={44} cy={90} rx={26} ry={3.5} fill={Brand.navy950} opacity={0.08} />
      {/* The phone, a little turned. */}
      <G transform="rotate(-8 44 50)">
        <Rect x={22} y={12} width={44} height={74} rx={9} fill={Brand.navy900} />
        <Rect x={26.5} y={19} width={35} height={56} rx={4.5} fill={Brand.navy700} />
        {/* The viewfinder. */}
        <Path d="M31 29v-5h5M57 29v-5h-5M31 65v5h5M57 65v5h-5" stroke={Brand.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* The part in it: a disc with its hub and bolt holes. */}
        <Circle cx={44} cy={47} r={13} fill={Brand.gold500} />
        <Circle cx={44} cy={47} r={13} fill="none" stroke={Brand.gold600} strokeWidth={1.5} />
        <Circle cx={44} cy={47} r={5.5} fill={Brand.navy900} />
        {[0, 72, 144, 216, 288].map((a) => (
          <Circle
            key={a}
            cx={44 + 8.6 * Math.cos((a * Math.PI) / 180)}
            cy={47 + 8.6 * Math.sin((a * Math.PI) / 180)}
            r={1.4}
            fill={Brand.navy900}
          />
        ))}
        <Circle cx={44} cy={80.5} r={2.6} fill={Brand.white} opacity={0.35} />
      </G>
      {/* The question, in a bubble. */}
      <Path d="M62 8h22a8 8 0 0 1 8 8v9a8 8 0 0 1-8 8h-12l-6 5v-5h-4a8 8 0 0 1-8-8v-9a8 8 0 0 1 8-8Z" fill={Brand.gold500} />
      <Path d="M69.4 16.8a3.6 3.6 0 1 1 5.1 3.3c-1.1.5-1.6 1.3-1.6 2.4" stroke={Brand.navy900} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Circle cx={72.9} cy={26.4} r={1.35} fill={Brand.navy900} />
    </Svg>
  );
}
