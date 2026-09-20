import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Border, C, familyFor, IconSize, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';

/**
 * Three tabs, because three screens are finished.
 *
 * The brief lists seven screens for v1 — accueil, garage, recherche, fiche
 * produit, panier, commande, suivi, compte. They arrive as tabs as they are
 * built. Panier and Compte arrive with the basket and the account. Shipping
 * five tabs now, two of which open onto "bientôt disponible", would be the
 * app telling the customer about features it does not have, which is the same
 * habit as inventing stock: it just happens to be about the app rather than
 * about a part.
 *
 * ## The active state is three signals, not one
 *
 * A gold bar above the icon, the icon and label going to full navy from
 * muted, and `accessibilityState.selected` for the screen reader. Colour
 * alone is not a signal everybody receives, and the shop's gold on white is
 * 2.09:1 — it cannot be the thing carrying the meaning even for people who
 * do see it. The bar is 3pt and 20 wide: enough to find, not enough to
 * shout. The navigator supplies the selected state to the icon as `focused`,
 * which is what draws it.
 *
 * ## The icons
 *
 * Feather, at 20pt, except the garage. Feather has no car — the first pass
 * used `disc`, a brake rotor, and nobody read it as a garage. `NavCar` is
 * drawn to Feather's own grammar (24-unit box, 2.0 stroke, round caps and
 * joins) so the row still looks like one set.
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
   * The number has now been wrong three times, in three different ways: 48
   * sheared the descenders off "Mon garage", 56 with 8pt of padding at each
   * end made the labels vanish entirely while the bar still looked
   * deliberate, and 64 sheared them again once the placeholder glyphs became
   * 20pt icons. 76 leaves the icon (20), the label (17 of line box), the
   * active bar (3) and the gaps between them about 8pt of slack.
   *
   * The lesson, written here because it keeps being relearned: this cannot
   * be reasoned about from the font size, because the navigator adds margins
   * of its own. Screenshot the bar after every change to it.
   */
  const barHeight = TabBarHeight + insets.bottom;

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
          borderTopWidth: Border.thin,
          height: barHeight,
          paddingTop: Spacing.one,
          paddingBottom: insets.bottom + Spacing.two,
        },
        tabBarLabelStyle: { fontFamily: familyFor('display', rtl), fontSize: 12 },
        tabBarItemStyle: { paddingTop: Spacing.half },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          // The hero is the header on this screen. A navy bar above a navy
          // hero is two headers with a seam between them.
          headerShown: false,
          title: t('app.name'),
          tabBarLabel: t('tab.home'),
          tabBarIcon: ({ color, focused }) => (
            <NavIcon focused={focused}>
              <Feather name="home" size={IconSize.large} color={color} />
            </NavIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="catalogue"
        options={{
          title: t('catalog.title'),
          tabBarLabel: t('tab.catalog'),
          tabBarIcon: ({ color, focused }) => (
            <NavIcon focused={focused}>
              <Feather name="grid" size={IconSize.large} color={color} />
            </NavIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: t('garage.title'),
          tabBarLabel: t('tab.garage'),
          tabBarIcon: ({ color, focused }) => (
            <NavIcon focused={focused}>
              <NavCar size={IconSize.large} color={color} />
            </NavIcon>
          ),
        }}
      />
    </Tabs>
  );
}

/**
 * The glyph, with the active bar above it.
 *
 * The bar occupies its row whether or not it is visible, so the icons do not
 * shift down by 3pt when a tab loses focus — a tab bar whose contents move as
 * you change tabs reads as a rendering bug even when it is deliberate.
 */
function NavIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.icon}>
      <View style={[styles.bar, focused && styles.barActive]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  bar: {
    width: 20,
    height: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'transparent',
  },
  barActive: {
    backgroundColor: C.accent,
  },
});
