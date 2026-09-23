import Svg, { Path } from 'react-native-svg';

import { Brand, C } from '@/constants/theme';

/** Feather's heart, which cannot be filled; drawn so the saved state is solid red, not just a colour change. */
export function HeartIcon({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.3l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z"
        fill={filled ? Brand.red600 : 'none'}
        stroke={filled ? Brand.red600 : C.text}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
