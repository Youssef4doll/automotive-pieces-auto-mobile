import { Stack } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStackOptions } from '@/components/stack-options';
import { Text } from '@/components/ui/text';
import { C, familyFor, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/**
 * A tab, as a stack of its own (the owner, October 2026).
 *
 * Each tab keeps what was opened in it. A part opened from the catalogue
 * is still there after a look at the basket or the account: tapping
 * Catalogue again comes back to that part, not to the list it was found
 * in — the way every shop's app behaves. Tapping the tab it is already on
 * goes back to its first screen.
 *
 * The pages a customer browses through (a part, a family, a brand, the
 * search, the parts for a car) are shared by the five tabs — the routes
 * under app/(tabs)/(home,catalogue,garage,panier,compte)/ — and open in
 * whichever tab the customer is in, with the tab bar still under them.
 * The flows that take over the screen (checkout, the picker, sign-in, an
 * order) stay on the root stack, over the tabs.
 *
 * The tab's own first screen carries its title, large and at the start of
 * the line — "Mon garage" as in the reference — drawn here rather than by
 * the tab navigator, which on iOS 26 (the system's own tab bar) draws none.
 * Accueil has no title; its navy hero is the top of the screen.
 */
export function TabStack({ root, title, centered = false }: { root: string; title?: string; centered?: boolean }) {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name={root}
        options={title ? { header: () => <TabTitle title={title} centered={centered} /> } : { headerShown: false }}
      />
      <Stack.Screen name="recherche" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}

function TabTitle({ title, centered }: { title: string; centered: boolean }) {
  const insets = useSafeAreaInsets();
  const { rtl } = useI18n();
  return (
    <View style={[styles.header, centered && styles.headerCentered, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[
          styles.title,
          centered && styles.titleCentered,
          { fontFamily: familyFor('headingStrong', rtl), textAlign: centered ? 'center' : rtl ? 'right' : 'left' },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: C.background },
  // A screen whose own content opens with a large title (the basket): the
  // bar is a small centred name over a hairline, as a shop's app draws it.
  headerCentered: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  title: {
    minHeight: Platform.select({ ios: 52, android: 56, default: 64 }),
    lineHeight: Platform.select({ ios: 52, android: 56, default: 64 }),
    paddingHorizontal: Spacing.three,
    fontSize: 24,
    color: C.text,
  },
  titleCentered: { minHeight: 52, lineHeight: 52, fontSize: 17 },
});
