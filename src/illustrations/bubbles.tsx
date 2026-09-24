import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * The four ways in — "Je connais ma voiture", "Je sais quelle pièce",
 * "J'ai la référence", "Je ne sais pas comment ça s'appelle" — drawn in the
 * hand of the part-family illustrations the website serves
 * (automotive-pieces-auto: src/lib/part-art.ts): a 64-unit grid, navy
 * outline, flat metal greys, the brand's yellow as the one accent, a soft
 * ground shadow. On the home arc they sit beside the family tiles and
 * should look drawn by the same person.
 *
 * Our own drawings; the car belongs to no maker.
 */

const O = Brand.navy950;
const N = Brand.navy700;
const M1 = '#eef2f8';
const M2 = '#c9d3e3';
const M3 = '#8f9db6';
const D = '#26324a';
const Y = Brand.gold500;
const W = Brand.white;

type Props = { size?: number };

function Frame({ size = 56, children }: Props & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Ellipse cx={32} cy={60} rx={20} ry={2.6} fill={O} opacity={0.1} />
      <G stroke={O} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </G>
    </Svg>
  );
}

/** A car head on — "Je connais ma voiture". */
export function BubbleCar({ size }: Props) {
  return (
    <Frame size={size}>
      <Rect x={10} y={42} width={10} height={12} rx={3} fill={D} />
      <Rect x={44} y={42} width={10} height={12} rx={3} fill={D} />
      <Path d="M6 46v-9c0-3.2 2-5.6 4.8-6.5l5.6-13.2c1.1-2.6 3.4-4.3 6.2-4.3h18.8c2.8 0 5.1 1.7 6.2 4.3l5.6 13.2c2.8.9 4.8 3.3 4.8 6.5v9z" fill={N} />
      <Path d="M18.5 29l4.3-10c.5-1.3 1.8-2.1 3.2-2.1h12c1.4 0 2.7.8 3.2 2.1l4.3 10z" fill={M2} />
      <Path d="M22 27l3.3-7.4h6.2l-4.4 7.4z" fill={W} stroke="none" opacity={0.7} />
      <Rect x={10} y={34} width={11} height={5} rx={2.5} fill={Y} />
      <Rect x={43} y={34} width={11} height={5} rx={2.5} fill={Y} />
      <Rect x={25} y={36} width={14} height={4} rx={2} fill={D} />
      <Path d="M6 42.5h52" fill="none" stroke={W} strokeOpacity={0.3} strokeWidth={1.4} />
    </Frame>
  );
}

/** A brake disc and its pad — "Je sais quelle pièce". */
export function BubblePart({ size }: Props) {
  const holes = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return <Circle key={i} cx={24 + 15 * Math.cos(a)} cy={34 + 15 * Math.sin(a)} r={1} fill={M3} stroke="none" />;
  });
  return (
    <Frame size={size}>
      <Circle cx={24} cy={34} r={19} fill={M1} />
      <Circle cx={24} cy={34} r={12} fill={M2} />
      {holes}
      <Circle cx={24} cy={34} r={6} fill={M1} />
      <Circle cx={24} cy={34} r={1.8} fill={O} stroke="none" />
      <Path d="M42 12h11c2.8 0 5 2.2 5 5v26c0 2.8-2.2 5-5 5H42z" fill={Y} />
      <Path d="M46 17h7v26h-7z" fill={D} />
    </Frame>
  );
}

/** A part's label with its stamped number — "J'ai la référence". */
export function BubbleReference({ size }: Props) {
  return (
    <Frame size={size}>
      <Path d="M8 15h34l14 17-14 17H8c-2.2 0-4-1.8-4-4V19c0-2.2 1.8-4 4-4z" fill={W} />
      <Circle cx={45} cy={32} r={3} fill={M2} />
      <Path d="M11 21v16M14 21v16M18 21v16M20 21v16M24 21v16M27 21v16M31 21v16M33 21v16" stroke={O} strokeWidth={1.6} fill="none" />
      <Rect x={10} y={40.5} width={24} height={4.5} rx={1.5} fill={Y} />
    </Frame>
  );
}

/** A phone photographing a part, and a question for the shop — "Je ne sais pas comment ça s'appelle". */
export function BubblePhoto({ size }: Props) {
  return (
    <Frame size={size}>
      <Rect x={12} y={8} width={30} height={50} rx={5} fill={N} />
      <Rect x={15.5} y={14} width={23} height={36} rx={2} fill={M1} />
      <Circle cx={27} cy={32} r={7.5} fill={M2} />
      <Circle cx={27} cy={32} r={2.8} fill={M1} />
      <Path d="M22 53.5h10" stroke={W} strokeOpacity={0.6} fill="none" />
      <Path d="M44 6h13c2.2 0 4 1.8 4 4v9c0 2.2-1.8 4-4 4h-6l-5 5v-5h-2c-2.2 0-4-1.8-4-4v-9c0-2.2 1.8-4 4-4z" fill={Y} />
      <Path d="M48.6 11.6a2.6 2.6 0 1 1 3.4 2.5c-.7.3-1 .9-1 1.6" fill="none" strokeWidth={1.8} />
      <Circle cx={51} cy={19.2} r={0.9} fill={O} stroke="none" />
    </Frame>
  );
}
