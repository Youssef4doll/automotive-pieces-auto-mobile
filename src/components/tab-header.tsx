import { Slot } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { C, familyFor, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/**
 * A tab's title, large and at the start of the line — "Mon garage" as in
 * the reference — above the tab's screen.
 *
 * The four titled tabs (Catalogue, Garage, Panier, Compte) each have a
 * layout that is this and a <Slot />, rather than taking the header from
 * the tab navigator. The navigator is not always the same one: on iOS 26
 * the system's own tab bar (app/(tabs)/_layout) draws no header at all. Drawn
 * here, the title is the same on every phone. Accueil has no header; its
 * navy hero is the top of the screen.
 */
export function TabScreen({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const { rtl } = useI18n();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[styles.title, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}
        >
          {title}
        </Text>
      </View>
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { backgroundColor: C.background },
  title: {
    minHeight: Platform.select({ ios: 52, android: 56, default: 64 }),
    lineHeight: Platform.select({ ios: 52, android: 56, default: 64 }),
    paddingHorizontal: Spacing.three,
    fontSize: 24,
    color: C.text,
  },
});
