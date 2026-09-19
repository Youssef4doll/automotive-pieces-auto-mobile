import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, familyFor, Spacing, TabBarHeight } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/**
 * Three tabs, because three screens are finished.
 *
 * The brief lists seven screens for v1 — accueil, garage, recherche, fiche
 * produit, panier, commande, suivi, compte. They arrive as tabs as they are
 * built. Panier and Compte arrive with the basket
 * and the account. Shipping five tabs now, two of which open onto "bientôt
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
   * The number has now been wrong three times, in three different ways: 48
   * sheared the descenders off "Mon garage", 56 with 8pt of padding at each
   * end made the labels vanish entirely while the bar still looked
   * deliberate, and 64 sheared them again once the placeholder glyphs became
   * 20pt icons. 76 leaves the icon (20), the label (17 of line box) and the
   * gap between them about 12pt of slack.
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
          height: barHeight,
          paddingTop: Spacing.two,
          paddingBottom: insets.bottom + Spacing.two,
        },
        tabBarLabelStyle: { fontFamily: familyFor('display', rtl), fontSize: 12 },
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
          tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalogue"
        options={{
          title: t('catalog.title'),
          tabBarLabel: t('tab.catalog'),
          tabBarIcon: ({ color }) => <Feather name="grid" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: t('garage.title'),
          tabBarLabel: t('tab.garage'),
          tabBarIcon: ({ color }) => <Feather name="disc" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
