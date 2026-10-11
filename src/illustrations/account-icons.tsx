import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';
import { NavCar } from './vehicle';

export type AccountIconName = 'user' | 'bag' | 'car' | 'pin' | 'lock' | 'return' | 'message' | 'help' | 'language' | 'briefcase';

/** The Compte list's stroke: heavier than Feather's 2.0, as Glovo draws its list. */
export const ACCOUNT_ICON_WEIGHT = 2.3;

/**
 * The icons of the Compte list, drawn bold (the owner, October 2026, from
 * Glovo's profile page).
 *
 * Feather is a font, and a font's stroke is fixed at 2.0 in a 24-unit box —
 * at the list's 20pt it read thin and grey beside the labels. These are the
 * same shapes (Feather's, MIT; "language" is Lucide's, ISC) drawn as lines
 * at 24pt with a 2.3 stroke, round caps and joins, so the column of icons
 * carries the weight of the words beside it.
 */
export function AccountIcon({ name, size = 24, color = Brand.navy900 }: { name: AccountIconName; size?: number; color?: ColorValue }) {
  if (name === 'car') return <NavCar size={size} color={color} weight={ACCOUNT_ICON_WEIGHT} />;
  const line = { stroke: color, strokeWidth: ACCOUNT_ICON_WEIGHT, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'user' ? (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...line} />
          <Circle cx={12} cy={7} r={4} {...line} />
        </>
      ) : name === 'bag' ? (
        <>
          <Path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" {...line} />
          <Line x1={3} y1={6} x2={21} y2={6} {...line} />
          <Path d="M16 10a4 4 0 0 1-8 0" {...line} />
        </>
      ) : name === 'pin' ? (
        <>
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" {...line} />
          <Circle cx={12} cy={10} r={3} {...line} />
        </>
      ) : name === 'lock' ? (
        <>
          <Rect x={3} y={11} width={18} height={11} rx={2} {...line} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" {...line} />
        </>
      ) : name === 'return' ? (
        <>
          <Polyline points="1 4 1 10 7 10" {...line} />
          <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" {...line} />
        </>
      ) : name === 'message' ? (
        <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" {...line} />
      ) : name === 'help' ? (
        <>
          <Circle cx={12} cy={12} r={10} {...line} />
          <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" {...line} />
          <Line x1={12} y1={17} x2={12.01} y2={17} {...line} />
        </>
      ) : name === 'language' ? (
        <>
          <Path d="m5 8 6 6" {...line} />
          <Path d="m4 14 6-6 2-3" {...line} />
          <Path d="M2 5h12" {...line} />
          <Path d="M7 2h1" {...line} />
          <Path d="m22 22-5-10-5 10" {...line} />
          <Path d="M14 18h6" {...line} />
        </>
      ) : (
        <>
          <Rect x={2} y={7} width={20} height={14} rx={2} {...line} />
          <Path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" {...line} />
        </>
      )}
    </Svg>
  );
}
