import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * The three bubble drawings on the home arc: filled, lightly shaded, in the
 * shop's navy and gold with one brighter blue for the car — the reference's
 * look, drawn by hand so nothing in them belongs to anybody else.
 */

const BLUE = '#1f5fd6';
const BLUE_DARK = '#1747a6';

/** The car, head on — the big centre bubble. */
export function BubbleCar({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.72} viewBox="0 0 64 46">
      <Defs>
        <LinearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={BLUE} />
          <Stop offset="1" stopColor={BLUE_DARK} />
        </LinearGradient>
      </Defs>
      {/* wheels */}
      <Rect x={8} y={34} width={10} height={10} rx={3} fill={Brand.navy950} />
      <Rect x={46} y={34} width={10} height={10} rx={3} fill={Brand.navy950} />
      {/* body */}
      <Path d="M6 24 L13 10 C14 7 16.5 5.5 19.5 5.5 L44.5 5.5 C47.5 5.5 50 7 51 10 L58 24 L60 26 L60 36 C60 38 58.5 39 57 39 L7 39 C5.5 39 4 38 4 36 L4 26 Z" fill="url(#body)" />
      {/* windscreen */}
      <Path d="M15.5 21 L19.5 11 C20 9.8 21 9 22.3 9 L41.7 9 C43 9 44 9.8 44.5 11 L48.5 21 Z" fill="#dbe7ff" />
      <Path d="M18 21 L22 11.5 L30 11.5 L25 21 Z" fill="#ffffff" opacity={0.55} />
      {/* lamps and grille */}
      <Rect x={8} y={27} width={11} height={5} rx={2.5} fill={Brand.gold400} />
      <Rect x={45} y={27} width={11} height={5} rx={2.5} fill={Brand.gold400} />
      <Rect x={23} y={29} width={18} height={4} rx={2} fill={BLUE_DARK} />
      <Rect x={4} y={24} width={56} height={2} fill="#ffffff" opacity={0.15} />
    </Svg>
  );
}

/** "Référence" — a part carrying its stamped number on a tag. */
export function BubbleReference({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Defs>
        <LinearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#d7dde8" />
          <Stop offset="1" stopColor="#7f8aa0" />
        </LinearGradient>
      </Defs>
      {/* a gear-toothed disc */}
      <G>
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          const cx = 24 + Math.cos(a) * 18;
          const cy = 24 + Math.sin(a) * 18;
          return <Circle key={i} cx={cx} cy={cy} r={4.2} fill="url(#metal)" />;
        })}
        <Circle cx={24} cy={24} r={18} fill="url(#metal)" />
        <Circle cx={24} cy={24} r={11} fill="#eef2f8" stroke={Brand.navy700} strokeWidth={1.4} />
        <Circle cx={24} cy={24} r={4.5} fill={Brand.navy700} />
      </G>
      {/* the tag */}
      <Path d="M32 34 L50 34 L54 41 L50 48 L32 48 Z" fill={Brand.gold500} stroke={Brand.navy900} strokeWidth={1.4} strokeLinejoin="round" />
      <Rect x={35} y={39.5} width={11} height={1.8} rx={0.9} fill={Brand.navy900} />
      <Rect x={35} y={43} width={8} height={1.8} rx={0.9} fill={Brand.navy900} />
    </Svg>
  );
}

/** "Photo / Expert" — a camera in front of a part. */
export function BubblePhoto({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Rect x={20} y={6} width={22} height={24} rx={4} fill="#c9d1de" stroke={Brand.navy700} strokeWidth={1.2} />
      <Rect x={25} y={11} width={12} height={3} rx={1.5} fill={Brand.navy700} />
      <Rect x={25} y={17} width={9} height={3} rx={1.5} fill={Brand.navy700} />
      <Path d="M8 24 C8 21.8 9.8 20 12 20 L18 20 L21 15.5 L33 15.5 L36 20 L44 20 C46.2 20 48 21.8 48 24 L48 44 C48 46.2 46.2 48 44 48 L12 48 C9.8 48 8 46.2 8 44 Z" fill={Brand.navy800} />
      <Circle cx={28} cy={34} r={10} fill="#e9eef6" />
      <Circle cx={28} cy={34} r={6.5} fill={Brand.navy600} />
      <Circle cx={25.8} cy={31.8} r={2} fill="#ffffff" opacity={0.8} />
      <Rect x={39} y={24} width={5} height={3} rx={1.5} fill={Brand.gold500} />
    </Svg>
  );
}

/** "Quelle pièce" — a part in its box, for the slot when no channel exists. */
export function BubblePart({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Path d="M8 18 L28 9 L48 18 L48 40 L28 49 L8 40 Z" fill="#e6c16a" stroke={Brand.navy900} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M8 18 L28 27 L48 18" fill="none" stroke={Brand.navy900} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M28 27 L28 49" stroke={Brand.navy900} strokeWidth={1.4} />
      <Path d="M18 13.5 L38 22.5 L38 29" fill="none" stroke={Brand.navy900} strokeWidth={1.4} />
      <Path d="M8 18 L28 27 L28 49 L8 40 Z" fill="#000" opacity={0.08} />
    </Svg>
  );
}
