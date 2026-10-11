import { Feather } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogueApi, type Family } from '@/api/catalogue';
import { BrandStrip } from '@/components/ui/brand-strip';
import { CareDueStrip } from '@/components/ui/care-due';
import { AdviceCard } from '@/components/ui/advice-card';
import { PartImage } from '@/components/ui/part-image';
import { PressScale } from '@/components/ui/press-scale';
import { PromoBanner } from '@/components/ui/promo-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { Glass } from '@/components/ui/glass';
import { Text } from '@/components/ui/text';
import { MakeLogo } from '@/components/ui/make-logo';
import { MakeRail } from '@/components/ui/make-rail';
import { useVehicleLine } from '@/components/ui/vehicle-card';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { useOnboarding } from '@/store/onboarding';
import { unreadAnswers, useQuestions } from '@/store/questions';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useSvgId } from '@/hooks/use-svg-id';
import { Rail } from '@/components/ui/rail';

const LOGO = require('@/assets/images/logo-lockup.png');

/** The owner's photograph of the car on the evening road, and where the car is in it. */
const HOME_ROAD = require('@/assets/images/home-road.webp');
const ROAD = { w: 1672, h: 941, carX: 0.574, carY: 0.425 };

/**
 * Accueil — the reference's home, top to bottom, on the shop's data.
 *
 * The navy part is the owner's mock-up, to the letter (October 2026): the
 * shop's logo and the bell, the car in a white card, the owner's photograph
 * of the car on the evening road, "Votre voiture. Les bonnes pièces.", the
 * line under it, and the search with its gold arrow.
 *
 * On the white sheet: every family, most parts first, the car makes (a door
 * into the picker at each), the shop's own campaigns when it runs one, the
 * parts makers the shop carries, and "Besoin d'un conseil ?".
 *
 * The bell opens what the shop has said: new answers to questions when there
 * are some (its dot), the orders and their steps otherwise.
 */
export default function HomeScreen() {
  const onboarded = useOnboarding((s) => s.done);
  const onboardingRead = useOnboarding((s) => s.hydrated);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const { t, rtl } = useI18n();
  const active = useGarage((s) => s.active);
  const vehicleLine = useVehicleLine();
  // The owner's photograph, sized so the car stands at the right of the
  // screen under the vehicle card, as in the owner's mock-up (October 2026).
  const column = Math.min(width, MaxContentWidth);
  const photoW = Math.round(Math.min(width * 1.76, 1500));
  const photoH = Math.round((photoW * ROAD.h) / ROAD.w);
  const photoSide = Math.round((width - column) / 2 + column * 0.48 - photoW * ROAD.carX);
  const photoTop = Math.round(insets.top + 128 - photoH * ROAD.carY);
  const narrow = column < 360;
  // Answers not read yet light the bell, and it opens them.
  const unread = useQuestions((s) => unreadAnswers(s.questions));

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
  const refreshControl = usePullRefresh();
  const fadeY = useSvgId('fadeY');

  // Every family, most parts first — a rail to browse, not four fixed tiles.
  const rail = useMemo<Family[]>(
    () => (families.status === 'loaded' ? [...families.data].sort((a, b) => b.productCount - a.productCount) : []),
    [families],
  );

  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const openFamily = (f: Family) =>
    router.push({ pathname: '/famille/[family]', params: { family: f.slug, familyName: f.name } });

  // First launch: the welcome, once. Only from here — a link into the app
  // opens what it points at.
  if (onboardingRead && !onboarded) return <Redirect href="/bienvenue" />;

  return (
    <View style={styles.root}>
      {focused ? <StatusBar style="light" /> : null}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
        <View style={[styles.hero, { minHeight: insets.top + 380 }]}>
          {/* The owner's photograph: the car on the evening road, its navy
              side behind the words. Mirrored for Arabic, where they start on
              the right. */}
          <View
            style={[styles.photo, { top: photoTop, width: photoW, height: photoH }, rtl ? { right: photoSide, transform: [{ scaleX: -1 }] } : { left: photoSide }]}
            pointerEvents="none"
          >
            <Image source={HOME_ROAD} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
            {/* Into the navy under the road, where the words and the search are. */}
            <Svg style={StyleSheet.absoluteFill} width={photoW} height={photoH}>
              <Defs>
                <LinearGradient id={fadeY} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Brand.navy950} stopOpacity="0.55" />
                  <Stop offset="0.16" stopColor={Brand.navy950} stopOpacity="0" />
                  <Stop offset="0.58" stopColor={Brand.navy950} stopOpacity="0" />
                  <Stop offset="0.97" stopColor={Brand.navy950} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={photoW} height={photoH} fill={`url(#${fadeY})`} />
            </Svg>
          </View>

          <View style={[styles.column, { paddingTop: insets.top + Spacing.two }]}>
            <View style={[styles.topRow, row]}>
              <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel={t('app.name')} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.bell')}
                onPress={() => router.push(unread ? '/compte/questions' : '/compte/commandes')}
                hitSlop={6}
                style={({ pressed }) => [styles.bell, pressed && styles.bellPressed]}
                testID="home-bell"
              >
                <Feather name="bell" size={23} color={Brand.white} />
                {unread ? <View style={[styles.bellDot, rtl ? { left: 9 } : { right: 9 }]} /> : null}
              </Pressable>
            </View>

            {/* The car every result is judged against, and the way to change it. */}
            <Glass tone="bright" style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={active ? `${t('look.forVehicle', { car: `${active.makeName} ${active.modelName}` })}, ${t('home.change')}` : t('look.noVehicleLine')}
                onPress={() => (active ? router.navigate('/garage') : router.push('/garage/ajouter'))}
                style={({ pressed }) => [styles.carRow, row, pressed && styles.cardPressed]}
                testID="home-vehicle"
              >
                {active ? (
                  <MakeLogo name={active.makeName} slug={active.makeSlug} size={38} lifted={false} />
                ) : (
                  <View style={styles.vehicleIcon}>
                    <NavCar size={18} color={Brand.navy900} />
                  </View>
                )}
                <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
                  <Text numberOfLines={1} style={[styles.vehicleName, { fontFamily: familyFor('bodySemi', rtl) }]}>
                    {active ? `${active.makeName} ${active.modelName}` : t('look.noVehicleLine')}
                  </Text>
                  {active ? (
                    <Text numberOfLines={1} style={[styles.vehicleSub, { fontFamily: familyFor('body', rtl) }]}>
                      {vehicleLine(active)}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.vehicleAction, row]}>
                  <Text style={[styles.vehicleActionText, { fontFamily: familyFor('bodySemi', rtl) }]}>{active ? t('home.change') : t('home.choose')}</Text>
                  <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={18} color={C.text} />
                </View>
              </Pressable>
            </Glass>

            {/* The words, on the road under the car. */}
            <View style={{ height: narrow ? 64 : 92 }} />
            <Text style={[styles.title, narrow && styles.titleNarrow, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}>
              {`${t('home.title1')}\n${t('home.title2')}`}
            </Text>
            <Text style={[styles.tagline, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left', alignSelf: rtl ? 'flex-end' : 'flex-start' }]}>
              {t('home.tagline')}
            </Text>

            {/* The search, white, its gold arrow at the end. */}
            <Glass tone="bright" style={styles.search}>
              <Pressable
                accessibilityRole="search"
                accessibilityLabel={t('home.searchA11y')}
                onPress={() => router.push('/recherche')}
                style={({ pressed }) => [styles.searchRow, row, pressed && styles.cardPressed]}
              >
                <Feather name="search" size={20} color={C.text} />
                <Text numberOfLines={1} style={[styles.flex, styles.searchText, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}>
                  {t('home.searchHint')}
                </Text>
                <View style={styles.searchGo}>
                  <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={18} color={C.onAccent} />
                </View>
              </Pressable>
            </Glass>
          </View>
        </View>

        {/* The white sheet, pulled up over the road. */}
        <View style={[styles.sheet, { paddingBottom: tabBarSpace }]}>
          <View style={styles.column}>
            <View style={[styles.sectionHead, row]}>
              <Text style={[styles.sectionTitle, { fontFamily: familyFor('heading', rtl) }]}>{t('look.browse')}</Text>
              <Pressable accessibilityRole="button" onPress={() => router.navigate('/catalogue')} hitSlop={8} style={[styles.seeAll, row]}>
                <Text variant="hint" tone={C.text}>
                  {t('catalog.seeAll')}
                </Text>
                <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
              </Pressable>
            </View>

          </View>
          <Rail contentContainerStyle={[styles.rail, row]}>
            {families.status === 'loading'
              ? [0, 1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.cat}>
                    <Skeleton style={styles.catSkeleton} />
                  </View>
                ))
              : rail.map((f) => (
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
                    <Text variant="hint" tone={C.text} numberOfLines={2} style={styles.catName}>
                      {f.name}
                    </Text>
                  </PressScale>
                ))}
          </Rail>
          {/* The car makes, each a door into the picker at that make. */}
          <MakeRail />

          {/* What the owner's own dates say is coming up for the main car. */}
          <CareDueStrip />

          {/* The shop's real campaigns, when it is running one. */}
          <PromoBanner />

          <View style={[styles.column, styles.block]}>
            <BrandStrip />
          </View>


          {/* Always there: the photo goes to the shop's inbox (/demande). */}
          <View style={[styles.column, styles.adviceWrap]}>
            <AdviceCard />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.navy950 },
  flex: { flex: 1, minWidth: 0 },
  hero: { overflow: 'hidden', backgroundColor: Brand.navy950 },
  photo: { position: 'absolute' },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
  },
  topRow: { alignItems: 'center', justifyContent: 'space-between', minHeight: Tap.min },
  logo: { width: 168, height: 30 },
  bell: { width: Tap.min, height: Tap.min, borderRadius: Tap.min / 2, alignItems: 'center', justifyContent: 'center' },
  bellPressed: { backgroundColor: 'rgba(255,255,255,0.14)' },
  bellDot: { position: 'absolute', top: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: Brand.gold500, borderWidth: 1.5, borderColor: Brand.navy950 },
  // White cards over the photograph (bright liquid glass on iOS 26).
  card: { marginTop: Spacing.three, borderRadius: Radius.tile, overflow: 'hidden' },
  cardPressed: { backgroundColor: C.surface },
  carRow: { alignItems: 'center', gap: 12, minHeight: 62, paddingHorizontal: 14 },
  vehicleIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: 15, lineHeight: 20, color: C.text },
  vehicleSub: { fontSize: 13, lineHeight: 17, color: C.textMuted },
  vehicleAction: { alignItems: 'center', gap: 2 },
  vehicleActionText: { fontSize: 14, lineHeight: 18, color: C.text },
  title: { fontSize: 31, lineHeight: 36, letterSpacing: -0.5, color: Brand.white },
  titleNarrow: { fontSize: 26, lineHeight: 31 },
  tagline: { marginTop: Spacing.two, maxWidth: 300, fontSize: 14, lineHeight: 20, color: Brand.white },
  search: { marginTop: 20, marginBottom: Spacing.four + 4, borderRadius: Radius.tile, overflow: 'hidden' },
  searchRow: { alignItems: 'center', gap: Spacing.two, minHeight: 54, paddingLeft: 14, paddingRight: 9 },
  searchText: { fontSize: 13, lineHeight: 18, color: C.textMuted },
  searchGo: { width: 38, height: 38, borderRadius: 19, backgroundColor: Brand.gold500, alignItems: 'center', justifyContent: 'center' },
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
  rail: { gap: Spacing.two, paddingHorizontal: Spacing.four - 4, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  cat: { width: 84, alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.tile },
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
  adviceWrap: { marginTop: Spacing.four },
  block: { paddingTop: Spacing.four },
});
