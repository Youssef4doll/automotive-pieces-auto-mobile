import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Border, C, familyFor, IconSize, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useCartCount } from '@/store/cart';

/**
 * Five tabs: Accueil, Catalogue, Garage, Panier, Compte.
 *
 * There were three until the basket and the account existed, on the rule
 * that a tab opening onto "bientôt disponible" is the app advertising what it
 * does not have. Panier and Compte arrived with the checkout; each opens onto
 * something that works.
 *
 * Search is not a tab. It is the box at the top of Accueil and Catalogue,
 * one tap from anywhere a customer starts, and a sixth tab would push every
 * label under the width a 320pt phone can set them at.
 *
 * The basket's badge is the number of parts, counting quantities — what the
 * customer will find inside — gold with navy figures, the button colours,
 * and hidden at zero rather than showing a "0" that reads as an error.
 *
 * ## The active state is three signals, not one
 *
 * A gold pill behind the icon, the icon and label going to full navy from
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
  const cartCount = useCartCount();

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
        headerStyle: { backgroundColor: C.background },
        headerTintColor: C.text,
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        // Large and left, like "Mon garage" in the reference.
        headerTitleStyle: { fontFamily: familyFor('headingStrong', rtl), fontSize: 24 },
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
        tabBarBadgeStyle: {
          backgroundColor: C.accent,
          color: C.onAccent,
          fontFamily: familyFor('display', rtl),
          fontSize: 11,
        },
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
              <Feather name="home" size={IconSize.large} color={focused ? C.onAccent : color} />
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
              <Feather name="grid" size={IconSize.large} color={focused ? C.onAccent : color} />
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
              <NavCar size={IconSize.large} color={focused ? C.onAccent : color} />
            </NavIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="panier"
        options={{
          title: t('cart.title'),
          tabBarLabel: t('tab.cart'),
          tabBarBadge: cartCount > 0 ? (cartCount > 99 ? '99+' : cartCount) : undefined,
          tabBarAccessibilityLabel: cartCount > 0 ? `${t('tab.cart')}, ${t('a11y.cartCount', { n: cartCount })}` : t('tab.cart'),
          tabBarIcon: ({ color, focused }) => (
            <NavIcon focused={focused}>
              <Feather name="shopping-cart" size={IconSize.large} color={focused ? C.onAccent : color} />
            </NavIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: t('account.me'),
          tabBarLabel: t('tab.account'),
          tabBarIcon: ({ color, focused }) => (
            <NavIcon focused={focused}>
              <Feather name="user" size={IconSize.large} color={focused ? C.onAccent : color} />
            </NavIcon>
          ),
        }}
      />
    </Tabs>
  );
}

/**
 * The glyph, on a gold pill when its tab is the one open — the reference's
 * active state, in the button colour. The pill is always laid out (clear when
 * inactive) so nothing shifts as tabs change. The label going to full navy
 * and `accessibilityState.selected` carry the state too: gold on white is
 * 2.09:1 and cannot be the only signal.
 */
function NavIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return <View style={[styles.pill, focused && styles.pillActive]}>{children}</View>;
}

const styles = StyleSheet.create({
  pill: {
    width: 48,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: C.accent,
  },
});
