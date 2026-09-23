import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogueApi, type Family } from '@/api/catalogue';
import { hasContactChannel } from '@/api/shop';
import { BubbleArc, type BubbleItem } from '@/components/ui/bubble-arc';
import { PromoBanner } from '@/components/ui/promo-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { BubbleCar, BubblePart, BubblePhoto, BubbleReference } from '@/illustrations/bubbles';
import { PartArtwork } from '@/illustrations/parts';
import { RoadScene } from '@/illustrations/road-scene';
import { CarProfile } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/** How tall the night road is before the white sheet pulls over it. */
const HERO_HEIGHT = 470;

/**
 * Accueil — the reference design's home, built on the shop's data.
 *
 *   a dark hero: the greeting, "Que recherchez-vous ?", and three round
 *   doors on an arc over a night road, the car in the big one;
 *   a white sheet pulled over its foot: the popular part families, then the
 *   "Entretien auto" card, then the shop's own campaign banners when it is
 *   running one.
 *
 * Kept true where the reference could not be:
 *
 *   "Bonjour Youssef" is "Bonjour" — there is no sign-in, so there is no
 *   name to say;
 *   "Photo / Expert" is a bubble only when the shop has published a way to
 *   reach a person (production has not yet); until then that slot is
 *   "Quelle pièce", which opens the catalogue;
 *   "Entretien auto" is a way into the filters — the maintenance parts —
 *   and says nothing about price or discount, because it is navigation,
 *   not a promotion. The shop's real promotions follow it when there are any.
 *
 * Search is the magnifier at the top right, one tap to the search screen.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const { t, rtl } = useI18n();
  const active = useGarage((s) => s.active);

  // Light clock and battery over the night road; dark again on the white
  // screens. The tabs stay mounted, so this follows focus rather than mount.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const load = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(load);
  const settings = useShopSettings();
  const canAskShop = settings.status === 'loaded' && hasContactChannel(settings.data);

  const bubbles = useMemo<BubbleItem[]>(() => {
    const items: BubbleItem[] = [
      {
        key: 'reference',
        icon: <BubbleReference size={52} />,
        label: t('bubble.reference'),
        onPress: () => router.push({ pathname: '/recherche', params: { mode: 'reference' } }),
      },
      {
        key: 'car',
        icon: <BubbleCar size={64} />,
        // Once the garage knows the car, the big bubble IS the car, and it
        // opens the parts the shop has confirmed for it.
        label: active ? `${active.makeName} ${active.modelName}` : t('bubble.myCar'),
        onPress: () =>
          active
            ? router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } })
            : router.push('/garage/ajouter'),
      },
      canAskShop
        ? { key: 'photo', icon: <BubblePhoto size={52} />, label: t('bubble.photo'), onPress: () => router.push('/aide') }
        : { key: 'part', icon: <BubblePart size={52} />, label: t('bubble.part'), onPress: () => router.push('/catalogue') },
    ];
    if (canAskShop) {
      items.push({ key: 'part', icon: <BubblePart size={52} />, label: t('bubble.part'), onPress: () => router.push('/catalogue') });
    }
    return items;
  }, [active, canAskShop, router, t]);

  // The families with the most parts, the four the reference shows.
  const popular = useMemo<Family[]>(
    () => (families.status === 'loaded' ? [...families.data].sort((a, b) => b.productCount - a.productCount).slice(0, 4) : []),
    [families],
  );
  const careFamily = families.status === 'loaded' ? families.data.find((f) => f.slug === 'filtres') : undefined;

  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const openFamily = (f: Family) =>
    router.push({ pathname: '/famille/[family]', params: { family: f.slug, familyName: f.name } });

  return (
    <View style={styles.root}>
      {focused ? <StatusBar style="light" /> : null}
      <View style={styles.heroBg} pointerEvents="none">
        <RoadScene width={width} height={HERO_HEIGHT + insets.top} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: tabBarSpace }} showsVerticalScrollIndicator={false}>
        <View style={[styles.column, { paddingTop: insets.top + Spacing.three }]}>
          <View style={[styles.topRow, row]}>
            <Text style={[styles.hello, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('home.hello')}</Text>
            <Pressable
              accessibilityRole="search"
              accessibilityLabel={t('home.searchA11y')}
              onPress={() => router.push('/recherche')}
              style={({ pressed }) => [styles.searchBtn, pressed && styles.searchBtnPressed]}
            >
              <Feather name="search" size={20} color={Brand.white} />
            </Pressable>
          </View>

          <View style={styles.titles}>
            <Text style={[styles.title, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('home.whatLooking')}</Text>
            <Text style={[styles.subtitle, { fontFamily: familyFor('body', rtl) }]}>{t('home.whatLookingWhy')}</Text>
          </View>
        </View>

        <View style={styles.arc}>
          <BubbleArc items={bubbles} initial={1} />
        </View>

        {/* The white sheet, pulled up over the road. */}
        <View style={styles.sheet}>
          <View style={styles.column}>
            <View style={[styles.sectionHead, row]}>
              <Text style={[styles.sectionTitle, { fontFamily: familyFor('heading', rtl) }]}>{t('home.popular')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/catalogue')}
                hitSlop={8}
                style={[styles.seeAll, row]}
              >
                <Text variant="hint" tone={C.text}>
                  {t('catalog.seeAll')}
                </Text>
                <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
              </Pressable>
            </View>

            <View style={[styles.cats, row]}>
              {families.status === 'loading'
                ? [0, 1, 2, 3].map((i) => (
                    <View key={i} style={styles.cat}>
                      <Skeleton style={styles.catSkeleton} />
                    </View>
                  ))
                : popular.map((f) => (
                    <Pressable
                      key={f.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${f.name}, ${t('catalog.partCount', { n: f.productCount })}`}
                      onPress={() => openFamily(f)}
                      style={({ pressed }) => [styles.cat, pressed && styles.catPressed]}
                    >
                      <View style={styles.catDisc}>
                        <PartArtwork slug={f.slug} size={38} />
                      </View>
                      <Text variant="hint" tone={C.text} numberOfLines={1} style={styles.catName}>
                        {f.name}
                      </Text>
                    </Pressable>
                  ))}
            </View>

            {/* Entretien auto — a way into the maintenance parts, drawn as the
                reference's dark card. Navigation, not a promotion. */}
            {careFamily ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('home.care')}. ${t('home.careWhy')}`}
                onPress={() => openFamily(careFamily)}
                style={({ pressed }) => [styles.care, row, pressed && styles.carePressed]}
              >
                <View style={styles.careText}>
                  <Text style={[styles.careTitle, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('home.care')}</Text>
                  <Text style={[styles.careWhy, { fontFamily: familyFor('body', rtl) }]}>{t('home.careWhy')}</Text>
                  <View style={[styles.careCta, row, { alignSelf: rtl ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.careCtaText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('home.careCta')}</Text>
                    <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={Brand.white} />
                  </View>
                </View>
                <View style={[styles.careArt, rtl ? { left: -28 } : { right: -28 }]} pointerEvents="none">
                  <CarProfile width={190} color={Brand.navy300} accent={Brand.navy800} />
                </View>
              </Pressable>
            ) : null}
          </View>

          {/* The shop's real campaigns, when it is running one. */}
          <View style={styles.promo}>
            <PromoBanner />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.navy950 },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0 },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  topRow: { alignItems: 'center', justifyContent: 'space-between' },
  hello: { fontSize: 18, lineHeight: 24, color: Brand.white },
  searchBtn: {
    width: Tap.min,
    height: Tap.min,
    borderRadius: Tap.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  searchBtnPressed: { backgroundColor: 'rgba(255,255,255,0.24)' },
  titles: { paddingTop: Spacing.two, gap: Spacing.two },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.4, color: Brand.white },
  subtitle: { fontSize: 15, lineHeight: 21, color: '#c7d1e3', maxWidth: 300 },
  arc: { marginTop: Spacing.four, height: 250 },
  sheet: {
    marginTop: -Spacing.two,
    backgroundColor: C.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Spacing.four,
    minHeight: 420,
  },
  sectionHead: { alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, lineHeight: 26, color: C.text },
  seeAll: { alignItems: 'center', gap: 4, minHeight: Tap.min },
  cats: { justifyContent: 'space-between', paddingTop: Spacing.two, gap: Spacing.two },
  cat: { flex: 1, alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.tile },
  catPressed: { backgroundColor: C.surface },
  catDisc: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catSkeleton: { width: 68, height: 68, borderRadius: 34 },
  catName: { textAlign: 'center' },
  care: {
    marginTop: Spacing.four,
    minHeight: 150,
    borderRadius: Radius.card,
    backgroundColor: Brand.navy900,
    overflow: 'hidden',
    padding: Spacing.four,
  },
  carePressed: { backgroundColor: Brand.navy800 },
  careText: { flex: 1, gap: 6, zIndex: 1, maxWidth: '62%' },
  careTitle: { fontSize: 20, lineHeight: 26, color: Brand.white },
  careWhy: { fontSize: 14, lineHeight: 19, color: '#c7d1e3' },
  careCta: {
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 36,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  careCtaText: { fontSize: 14, lineHeight: 18, color: Brand.white },
  careArt: { position: 'absolute', bottom: 10, opacity: 0.95 },
  promo: { paddingTop: Spacing.four },
});
