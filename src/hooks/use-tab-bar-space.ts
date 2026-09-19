import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, TabBarHeight } from '@/constants/theme';

/**
 * The padding a scrolling screen inside the tabs needs at its bottom.
 *
 * The tab bar floats over the content rather than sitting below it, so a list
 * that ends with the screen ends underneath the bar: its last row is half
 * visible and its last control is unreachable. Every scrolling tab screen
 * adds this to its content padding.
 *
 * Not needed on a screen pushed over the tabs — the picker, a part family —
 * because those cover the bar entirely.
 */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TabBarHeight + insets.bottom + Spacing.four;
}
