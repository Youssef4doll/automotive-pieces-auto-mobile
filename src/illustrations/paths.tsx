import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * The four ways in, drawn in the same hand as the part families.
 *
 * "Que cherchez-vous ?" offers the customer four routes and lets them pick
 * the one that matches what they already know. The drawings carry most of
 * that choice: somebody who cannot name the part they are holding recognises
 * a camera faster than they read "Je ne sais pas comment ça s'appelle".
 *
 * Same 24×24 grid, same 1.6 stroke, same single accent fill as
 * `./parts.tsx`. They sit next to each other on the home screen and a
 * different weight between the two sets would be visible immediately.
 */

type ArtProps = { size?: number; color?: string; accent?: string };

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

/** "Je connais ma voiture" — the car, head on. */
export function ArtKnowCar({ size = 28, color = Brand.navy900, accent = Brand.navy50 }: ArtProps) {
  return (
    <Frame size={size}>
      <Path d="M3.4 17.4 L3.4 12.6 L5.6 7.4 C5.9 6.6 6.6 6.2 7.4 6.2 L16.6 6.2 C17.4 6.2 18.1 6.6 18.4 7.4 L20.6 12.6 L20.6 17.4 Z" fill={accent} />
      <Path d="M3.4 17.4 L3.4 12.6 L5.6 7.4 C5.9 6.6 6.6 6.2 7.4 6.2 L16.6 6.2 C17.4 6.2 18.1 6.6 18.4 7.4 L20.6 12.6 L20.6 17.4 Z" stroke={color} {...S} />
      <Line x1={3.4} y1={12.6} x2={20.6} y2={12.6} stroke={color} {...S} />
      <Circle cx={7} cy={15.2} r={1.1} stroke={color} {...S} />
      <Circle cx={17} cy={15.2} r={1.1} stroke={color} {...S} />
      <Line x1={6.2} y1={17.4} x2={6.2} y2={19.2} stroke={color} {...S} />
      <Line x1={17.8} y1={17.4} x2={17.8} y2={19.2} stroke={color} {...S} />
    </Frame>
  );
}

/** "Je sais quelle pièce" — a part in its box. */
export function ArtKnowPart({ size = 28, color = Brand.navy900, accent = Brand.navy50 }: ArtProps) {
  return (
    <Frame size={size}>
      <Path d="M3.6 8.2 L12 4.4 L20.4 8.2 L20.4 16.6 L12 20.4 L3.6 16.6 Z" fill={accent} />
      <Path d="M3.6 8.2 L12 4.4 L20.4 8.2 L20.4 16.6 L12 20.4 L3.6 16.6 Z" stroke={color} {...S} />
      <Path d="M3.6 8.2 L12 12 L20.4 8.2" stroke={color} {...S} />
      <Line x1={12} y1={12} x2={12} y2={20.4} stroke={color} {...S} />
      <Line x1={7.8} y1={6.3} x2={16.2} y2={10.1} stroke={color} {...S} />
    </Frame>
  );
}

/** "J'ai la référence" — the code stamped on the old part. */
export function ArtReference({ size = 28, color = Brand.navy900, accent = Brand.navy50 }: ArtProps) {
  return (
    <Frame size={size}>
      <Path d="M12.4 3.6 L20.4 3.6 L20.4 11.6 L11.6 20.4 L3.6 12.4 Z" fill={accent} />
      <Path d="M12.4 3.6 L20.4 3.6 L20.4 11.6 L11.6 20.4 L3.6 12.4 Z" stroke={color} {...S} />
      <Circle cx={16.8} cy={7.2} r={1.5} stroke={color} {...S} />
      <Line x1={7.6} y1={12} x2={11.4} y2={15.8} stroke={color} {...S} />
      <Line x1={9.8} y1={9.8} x2={11} y2={11} stroke={color} {...S} />
      <Line x1={12.6} y1={13.4} x2={13.8} y2={14.6} stroke={color} {...S} />
    </Frame>
  );
}

/** "Je ne sais pas comment ça s'appelle" — send us a photo. */
export function ArtPhoto({ size = 28, color = Brand.navy900, accent = Brand.navy50 }: ArtProps) {
  return (
    <Frame size={size}>
      <Rect x={2.8} y={7} width={18.4} height={13} rx={2.4} fill={accent} />
      <Rect x={2.8} y={7} width={18.4} height={13} rx={2.4} stroke={color} {...S} />
      <Path d="M8.6 7 L9.8 4.4 L14.2 4.4 L15.4 7" stroke={color} {...S} />
      <Circle cx={12} cy={13.4} r={3.6} stroke={color} {...S} />
      <Circle cx={12} cy={13.4} r={1.2} stroke={color} {...S} />
    </Frame>
  );
}
