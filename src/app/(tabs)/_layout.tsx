import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { TabBar } from '@/components/tab-bar';
import { Brand, familyFor } from '@/constants/theme';
import { TabIcon } from '@/illustrations/tab-icons';
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
 * On iOS 26 and later, the system's own: `NativeTabs`, Apple's tab bar of
 * liquid glass, with the lens that swells and magnifies as it moves to the
 * tab picked — what Apple Music has, drawn by iOS itself, so it behaves
 * exactly as every other app on the phone.
 *
 * Everywhere else (Android, the web, older iOS) components/tab-bar draws
 * one after it: a frosted capsule, a quiet pill at rest that swells into a
 * lens only while it moves. The active tab is still three signals, never
 * colour alone — see there.
 *
 * The titles of Catalogue, Garage, Panier and Compte are drawn by each tab's
 * own layout (components/tab-header), not by the navigator: the system's bar
 * draws none, and this way the title is the same with either.
 *
 * ## The icons
 *
 * One set, drawn for the bar (illustrations/tab-icons): navy outlines, and
 * the open tab's filled with the shop's gold. Feather had no car — the first
 * pass used `disc`, a brake rotor, and nobody read it as a garage — and a
 * set mixing Feather with two drawings of our own never quite matched.
 * The system's bar takes pictures, so the same drawings are rendered to PNG
 * (scripts/make-tab-icons.mjs) and shown in their own colours.
 */

/** Apple's own tab bar where the system has liquid glass; asked once. */
const SYSTEM_BAR = Platform.OS === 'ios' && isLiquidGlassAvailable();

const ICONS = {
  home: { default: require('@/assets/images/tabs/home.png'), selected: require('@/assets/images/tabs/home-on.png') },
  catalogue: { default: require('@/assets/images/tabs/catalogue.png'), selected: require('@/assets/images/tabs/catalogue-on.png') },
  garage: { default: require('@/assets/images/tabs/garage.png'), selected: require('@/assets/images/tabs/garage-on.png') },
  cart: { default: require('@/assets/images/tabs/cart.png'), selected: require('@/assets/images/tabs/cart-on.png') },
  account: { default: require('@/assets/images/tabs/account.png'), selected: require('@/assets/images/tabs/account-on.png') },
};
export default function TabsLayout() {
  return SYSTEM_BAR ? <SystemTabs /> : <DrawnTabs />;
}

/** iOS 26 and later: the system's tab bar. */
function SystemTabs() {
  const { t, rtl } = useI18n();
  const cartCount = useCartCount();
  const tabs = [
    { name: 'index', label: t('tab.home'), icon: ICONS.home },
    { name: 'catalogue', label: t('tab.catalog'), icon: ICONS.catalogue },
    { name: 'garage', label: t('tab.garage'), icon: ICONS.garage },
    { name: 'panier', label: t('tab.cart'), icon: ICONS.cart, badge: cartCount > 0 ? (cartCount > 99 ? '99+' : String(cartCount)) : null },
    { name: 'compte', label: t('tab.account'), icon: ICONS.account },
  ];

  return (
    <NativeTabs
      tintColor={Brand.navy900}
      // White figures on the shop's red: iOS sets a badge's text in white, and white on gold would not read.
      badgeBackgroundColor={Brand.red600}
      labelStyle={{
        default: { color: Brand.navy900, fontFamily: familyFor('bodyMedium', rtl), fontSize: 11 },
        selected: { color: Brand.navy900, fontFamily: familyFor('display', rtl), fontSize: 11 },
      }}
    >
      {tabs.map((tab) => (
        <NativeTabs.Trigger
          key={tab.name}
          name={tab.name}
          // Every tab screen keeps the bar's footprint clear itself (useTabBarSpace), as it does with the drawn bar.
          disableAutomaticContentInsets
          accessibilityLabel={tab.badge ? `${tab.label}, ${t('a11y.cartCount', { n: cartCount })}` : tab.label}
        >
          <NativeTabs.Trigger.Icon src={tab.icon} renderingMode="original" />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          {tab.badge ? <NativeTabs.Trigger.Badge>{tab.badge}</NativeTabs.Trigger.Badge> : null}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

/** Android, the web, iOS before 26: the bar drawn by components/tab-bar. */
function DrawnTabs() {
  const { t } = useI18n();
  const cartCount = useCartCount();

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('app.name'),
          tabBarLabel: t('tab.home'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="home" active={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalogue"
        options={{
          title: t('catalog.title'),
          tabBarLabel: t('tab.catalog'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="catalogue" active={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: t('garage.title'),
          tabBarLabel: t('tab.garage'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="garage" active={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="panier"
        options={{
          title: t('cart.title'),
          tabBarLabel: t('tab.cart'),
          tabBarBadge: cartCount > 0 ? (cartCount > 99 ? '99+' : cartCount) : undefined,
          tabBarAccessibilityLabel: cartCount > 0 ? `${t('tab.cart')}, ${t('a11y.cartCount', { n: cartCount })}` : t('tab.cart'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="cart" active={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="compte"
        options={{
          title: t('account.me'),
          tabBarLabel: t('tab.account'),
          tabBarIcon: ({ focused, color }) => <TabIcon name="account" active={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}

export { RouteError as ErrorBoundary } from '@/components/ui/route-error';
