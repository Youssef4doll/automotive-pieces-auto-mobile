import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogueApi, type Family } from '@/api/catalogue';
import { hasContactChannel } from '@/api/shop';
import { BrandStrip } from '@/components/ui/brand-strip';
import { BubbleArc, type BubbleItem } from '@/components/ui/bubble-arc';
import { PartImage } from '@/components/ui/part-image';
import { PressScale } from '@/components/ui/press-scale';
import { PromoBanner } from '@/components/ui/promo-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { VehicleCard } from '@/components/ui/vehicle-card';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { BubbleCar, BubblePart, BubblePhoto, BubbleReference } from '@/illustrations/bubbles';
import { RoadScene } from '@/illustrations/road-scene';
import { CarArt } from '@/illustrations/car-art';
import { useI18n } from '@/i18n/provider';
import { useCheckout } from '@/store/checkout';
import { useGarage } from '@/store/garage';

const LOGO = require('../../../assets/images/logo-lockup.png');

/**
 * Accueil — the reference's home, top to bottom, on the shop's data.
 *
 * On the night road: the shop's own logo and the search, the slogan, a
 * search box, and "Votre véhicule" — the car in the garage, or the
 * invitation to choose one. Then "Que recherchez-vous ?" and the three
 * round doors on their arc.
 *
 * On the white sheet: the popular families (the four with the most parts,
 * counted), "Entretien auto" (a way into the filters — navigation, not a
 * promotion), the parts makers the shop carries, the shop's own campaigns
 * when it runs one, and "Besoin d'un conseil ?" — only when the shop has
 * published a way to be reached.
 *
 * Kept true where the reference could not be: the greeting uses the name the
 * customer gave at checkout, or none; there is no bell, because the app has
 * no notifications to ring it.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const { t, rtl } = useI18n();
  const active = useGarage((s) => s.active);
  const firstName = useCheckout((s) => s.details.customerName.trim().split(/\s+/)[0] ?? '');
  const [darkHeight, setDarkHeight] = useState(900);
  const onDarkLayout = useCallback((e: LayoutChangeEvent) => setDarkHeight(Math.round(e.nativeEvent.layout.height)), []);

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
        icon: <BubbleReference size={60} />,
        label: t('bubble.reference'),
        onPress: () => router.push({ pathname: '/recherche', params: { mode: 'reference' } }),
      },
      {
        key: 'car',
        icon: <BubbleCar size={72} />,
        // Once the garage knows the car, the big bubble IS the car, and it
        // opens the parts the shop has confirmed for it.
        label: active ? `${active.makeName} ${active.modelName}` : t('bubble.myCar'),
        onPress: () =>
          active
            ? router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } })
            : router.push('/garage/ajouter'),
      },
      canAskShop
        ? { key: 'photo', icon: <BubblePhoto size={60} />, label: t('bubble.photo'), onPress: () => router.push('/aide') }
        : { key: 'part', icon: <BubblePart size={60} />, label: t('bubble.part'), onPress: () => router.push('/catalogue') },
    ];
    if (canAskShop) {
      items.push({ key: 'part', icon: <BubblePart size={60} />, label: t('bubble.part'), onPress: () => router.push('/catalogue') });
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View onLayout={onDarkLayout}>
          <View style={styles.heroBg} pointerEvents="none">
            <RoadScene width={width} height={darkHeight} />
          </View>

          <View style={[styles.column, { paddingTop: insets.top + Spacing.three }]}>
            <View style={[styles.topRow, row]}>
              <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel={t('app.name')} />
              <Pressable
                accessibilityRole="search"
                accessibilityLabel={t('home.searchA11y')}
                onPress={() => router.push('/recherche')}
                style={({ pressed }) => [styles.roundBtn, pressed && styles.roundBtnPressed]}
              >
                <Feather name="search" size={20} color={Brand.white} />
              </Pressable>
            </View>

            <View style={styles.slogan}>
              <Text style={[styles.sloganText, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}>
                {t('look.slogan1')}
                {'\n'}
                {t('look.slogan2')}
                <Text style={[styles.sloganText, styles.sloganAccent, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('look.slogan2Accent')}</Text>
              </Text>
              <Text style={[styles.subtitle, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('look.slogan3')}</Text>
            </View>

            <Pressable
              accessibilityRole="search"
              accessibilityLabel={t('home.searchA11y')}
              onPress={() => router.push('/recherche')}
              style={({ pressed }) => [styles.searchPill, row, pressed && styles.searchPillPressed]}
            >
              <Feather name="search" size={20} color={C.text} />
              <Text variant="body" tone={C.textMuted} numberOfLines={1} style={styles.flex}>
                {t('look.search')}
              </Text>
            </Pressable>

            <VehicleCard
              vehicle={active}
              label={t('look.yourVehicle')}
              empty={{ title: t('home.chooseCar'), line: t('look.chooseWhy') }}
              onPress={() => (active ? router.navigate('/garage') : router.push('/garage/ajouter'))}
              style={styles.vehicle}
              action={active ? t('home.change') : undefined}
              compactArt
            />

            <View style={styles.titles}>
              <Text style={[styles.hello, { fontFamily: familyFor('bodySemi', rtl), textAlign: rtl ? 'right' : 'left' }]}>
                {firstName ? t('look.hello', { name: firstName }) : t('look.helloAnon')}
              </Text>
              <Text style={[styles.title, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('home.whatLooking')}</Text>
              <Text style={[styles.subtitle, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('home.whatLookingWhy')}</Text>
            </View>
          </View>

          <View style={styles.arc}>
            <BubbleArc items={bubbles} initial={1} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/trouver')}
            style={({ pressed }) => [styles.allWays, row, pressed && { opacity: 0.7 }]}
          >
            <Text variant="hint" tone={Brand.white}>
              {t('look.find')}
            </Text>
            <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={Brand.white} />
          </Pressable>
        </View>

        {/* The white sheet, pulled up over the road. */}
        <View style={[styles.sheet, { paddingBottom: tabBarSpace }]}>
          <View style={styles.column}>
            <View style={[styles.sectionHead, row]}>
              <Text style={[styles.sectionTitle, { fontFamily: familyFor('heading', rtl) }]}>{t('home.popular')}</Text>
              <Pressable accessibilityRole="button" onPress={() => router.navigate('/catalogue')} hitSlop={8} style={[styles.seeAll, row]}>
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
                    <PressScale
                      key={f.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${f.name}, ${t('catalog.partCount', { n: f.productCount })}`}
                      onPress={() => openFamily(f)}
                      style={styles.cat}
                      scaleTo={0.94}
                    >
                      <View style={styles.catDisc}>
                        <PartImage slug={f.slug} imageUrl={f.imageUrl} size={f.imageUrl ? 72 : 50} label={f.name} fit="cover" />
                      </View>
                      <Text variant="hint" tone={C.text} numberOfLines={1} style={styles.catName}>
                        {f.name}
                      </Text>
                    </PressScale>
                  ))}
            </View>

            {careFamily ? (
              <PressScale
                accessibilityRole="button"
                accessibilityLabel={`${t('home.care')}. ${t('home.careWhy')}`}
                onPress={() => openFamily(careFamily)}
                style={[styles.care, row]}
                pressedStyle={styles.carePressed}
                scaleTo={0.985}
              >
                <View style={styles.careText}>
                  <Text style={[styles.careTitle, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('home.care')}</Text>
                  <Text style={[styles.careWhy, { fontFamily: familyFor('body', rtl) }]}>{t('home.careWhy')}</Text>
                  <View style={[styles.careCta, row, { alignSelf: rtl ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.careCtaText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('home.careCta')}</Text>
                    <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={Brand.navy900} />
                  </View>
                </View>
                <View style={[styles.careArt, rtl ? { left: -18, transform: [{ scaleX: -1 }] } : { right: -18 }]} pointerEvents="none">
                  <CarArt width={180} body={Brand.navy600} />
                </View>
              </PressScale>
            ) : null}

          </View>

          {/* The shop's real campaigns, when it is running one. */}
          <View style={styles.promo}>
            <PromoBanner />
          </View>

          <View style={[styles.column, styles.block]}>
            <BrandStrip />
          </View>


          {canAskShop ? (
            <View style={styles.column}>
              <View style={[styles.advice, row]}>
                <View style={styles.adviceArt}>
                  <BubblePhoto size={64} />
                </View>
                <View style={[styles.flex, { gap: 6, alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.careTitle, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('look.advice')}</Text>
                  <Text style={[styles.careWhy, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('look.adviceWhy')}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/aide')}
                    style={({ pressed }) => [styles.adviceCta, row, pressed && { backgroundColor: Brand.gold600 }]}
                  >
                    <Feather name="camera" size={16} color={C.onAccent} />
                    <Text style={[styles.adviceCtaText, { fontFamily: familyFor('display', rtl) }]}>{t('look.adviceCta')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.navy950 },
  flex: { flex: 1, minWidth: 0 },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0 },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  topRow: { alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 176, height: 32 },
  roundBtn: {
    width: Tap.min,
    height: Tap.min,
    borderRadius: Tap.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  roundBtnPressed: { backgroundColor: 'rgba(255,255,255,0.24)' },
  slogan: { paddingTop: Spacing.four, gap: Spacing.two },
  sloganText: { fontSize: 30, lineHeight: 36, letterSpacing: -0.4, color: Brand.white },
  sloganAccent: { color: Brand.gold500 },
  searchPill: {
    marginTop: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.white,
    ...Elevation.resting,
  },
  searchPillPressed: { backgroundColor: C.surface },
  vehicle: { marginTop: Spacing.three },
  titles: { paddingTop: Spacing.five, gap: Spacing.one },
  hello: { fontSize: 16, lineHeight: 22, color: Brand.white },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.4, color: Brand.white },
  subtitle: { fontSize: 15, lineHeight: 21, color: '#c7d1e3', maxWidth: 320 },
  arc: { marginTop: Spacing.three, height: 250 },
  // On its own dark pill: it sits over the road's centre line.
  allWays: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: Brand.navy900,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  // The white sheet runs to the bottom of the content, so a short page never
  // shows the navy root beneath it.
  scroll: { flexGrow: 1 },
  sheet: {
    flexGrow: 1,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.resting,
  },
  catSkeleton: { width: 72, height: 72, borderRadius: 36 },
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
    backgroundColor: Brand.gold500,
  },
  careCtaText: { fontSize: 14, lineHeight: 18, color: Brand.navy900 },
  careArt: { position: 'absolute', bottom: 8 },
  block: { paddingTop: Spacing.four },
  promo: { paddingTop: Spacing.four },
  advice: {
    marginTop: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: Brand.navy950,
    alignItems: 'center',
  },
  adviceArt: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adviceCta: {
    marginTop: Spacing.one,
    alignItems: 'center',
    gap: 6,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.gold500,
  },
  adviceCtaText: { fontSize: 15, color: C.onAccent },
});
