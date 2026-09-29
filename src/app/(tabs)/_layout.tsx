import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';
import { C, familyFor } from '@/constants/theme';
import { NavCart } from '@/illustrations/nav-cart';
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
 * customer will find inside — hidden at zero rather than showing a "0"
 * that reads as an error.
 *
 * ## The bar
 *
 * Drawn by components/tab-bar: a rounded bar lifted off the bottom edge, a
 * navy capsule sliding to the open tab. The active tab is still three
 * signals, never colour alone — see there.
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
  const cartCount = useCartCount();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: C.background },
        headerTintColor: C.text,
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        // Large and left, like "Mon garage" in the reference.
        headerTitleStyle: { fontFamily: familyFor('headingStrong', rtl), fontSize: 24 },
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
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalogue"
        options={{
          title: t('catalog.title'),
          tabBarLabel: t('tab.catalog'),
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: t('garage.title'),
          tabBarLabel: t('tab.garage'),
          tabBarIcon: ({ color }) => (
            <NavCar size={22} color={color} />
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
          tabBarIcon: ({ color }) => (
            <NavCart size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: t('account.me'),
          tabBarLabel: t('tab.account'),
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export { RouteError as ErrorBoundary } from '@/components/ui/route-error';
