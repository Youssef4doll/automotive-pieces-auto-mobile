import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { C, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * The frame every screen sits in: safe area, background, content width.
 *
 * `edges` defaults to the top and the two sides and leaves the bottom alone,
 * because a screen inside the tab navigator already has the tab bar's inset
 * and adding the safe area on top of it leaves a visible band of background
 * under the last row. A screen presented on its own passes `bottom` in.
 */
export function Screen({
  children,
  edges = ['top', 'left', 'right'],
  style,
}: {
  /** Optional: a screen still settling renders the frame and nothing in it. */
  children?: React.ReactNode;
  edges?: readonly Edge[];
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={styles.fill} edges={edges}>
      {/* Centred on a tablet or a browser window; see MaxContentWidth. */}
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
  },
});
