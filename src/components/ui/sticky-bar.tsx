import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Border, C, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * The bottom of a screen that exists to be acted on: the product page's
 * "Ajouter au panier", the basket's "Passer la commande", checkout's
 * "Continuer".
 *
 * Pinned, because the action has to be under the thumb whatever the
 * customer has scrolled to — a product page whose button is 900pt below the
 * description has no button as far as a phone is concerned. It carries the
 * home-indicator inset itself, so the button never sits under the swipe bar,
 * and `inTabs` drops that inset when the tab bar already accounts for it.
 */
export function StickyBar({
  children,
  inTabs = false,
  style,
}: {
  children: React.ReactNode;
  inTabs?: boolean;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: (inTabs ? 0 : insets.bottom) + Spacing.three }, style]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: Border.thin,
    borderTopColor: C.border,
    backgroundColor: C.background,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
  },
});
