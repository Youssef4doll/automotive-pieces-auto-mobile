import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { C, familyFor, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/**
 * Two tabs, because two screens are finished.
 *
 * The brief lists seven screens for v1 — accueil, garage, recherche, fiche
 * produit, panier, commande, suivi, compte. They arrive as tabs as they are
 * built. Shipping five tabs now, three of which open onto "bientôt
 * disponible", would be the app telling the customer about features it does
 * not have, which is the same habit as inventing stock: it just happens to be
 * about the app rather than about a part.
 */
export default function TabsLayout() {
  const { t, rtl } = useI18n();
  const insets = useSafeAreaInsets();

  /**
   * The bar is sized here rather than left to the default.
   *
   * The default is 48pt tall, which fits an icon and a label only if the
   * label is one short line in a face with tight metrics. Barlow Semi
   * Condensed at 12pt is not, and "Mon garage" came out with its descenders
   * sheared off along the bottom edge — visible in a screenshot, invisible to
   * a typecheck.
   *
   * 64 is measured rather than guessed: the mark is 21pt of line box and the
   * label another 15, so the content needs about 44 before padding. A first
   * fix set 56 with 8pt of padding at each end, which left 40 — and the
   * labels did not clip, they disappeared entirely, which is the worse
   * failure because the tab bar still looked deliberate. Screenshot every
   * change to this number.
   */
  const barHeight = 64 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.surfaceBrand },
        headerTintColor: C.textInverse,
        headerTitleStyle: { fontFamily: familyFor('heading', rtl), fontSize: 17 },
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.background,
          borderTopColor: C.border,
          height: barHeight,
          paddingTop: Spacing.two,
          paddingBottom: insets.bottom + Spacing.one,
        },
        tabBarLabelStyle: { fontFamily: familyFor('display', rtl), fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('app.name'),
          tabBarLabel: t('tab.home'),
          tabBarIcon: ({ focused }) => <TabMark glyph="◆" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: t('garage.title'),
          tabBarLabel: t('tab.garage'),
          tabBarIcon: ({ focused }) => <TabMark glyph="▮" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

/**
 * A mark rather than an icon, for now.
 *
 * There is no icon set in this project and no drawings from the shop. A
 * borrowed icon pack would be the fastest way to put a wrench and a car in
 * the tab bar and it is also the shop's rule about not using another party's
 * assets, so: two geometric marks, the label doing the real work, until the
 * shop's own icons exist. The website has the same problem and solves it with
 * per-family line drawings it owns.
 */
function TabMark({ glyph, focused }: { glyph: string; focused: boolean }) {
  return (
    <View style={styles.mark}>
      <Text variant="body" tone={focused ? C.text : C.textMuted}>
        {glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
