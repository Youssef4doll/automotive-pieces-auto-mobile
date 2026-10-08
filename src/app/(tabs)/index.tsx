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
import { Text } from '@/components/ui/text';
import { MakeLogo } from '@/components/ui/make-logo';
import { useVehicleLine } from '@/components/ui/vehicle-card';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { useOnboarding } from '@/store/onboarding';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { Rail } from '@/components/ui/rail';

const LOGO = require('../../../assets/images/logo-lockup.png');

/**
 * Accueil — the reference's home, top to bottom, on the shop's data.
 *
 * On the navy, kept short so the families are on the first screen: the
 * shop's own logo and the search, the search box, and the car bar — the car
 * in the garage, or the invitation to choose one — then "Comment trouver
 * votre pièce ?".
 *
 * On the white sheet: every family, most parts first, the shop's own
 * campaigns when it runs one, the parts makers the shop carries, and
 * "Besoin d'un conseil ?".
 *
 * Kept true where the reference could not be: the greeting uses the name the
 * customer gave at checkout, or none; there is no bell, because the app has
 * no notifications to ring it.
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
  // A narrow phone: the hero's lines keep their words.
  const narrow = Math.min(width, MaxContentWidth) < 360;

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
        <View style={styles.hero}>
          {/* The shop's navy, lighter towards the sheet: a colour, not a
              photograph (the owner, October 2026). */}
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="heroSky" x1={rtl ? '1' : '0'} y1="0" x2={rtl ? '0' : '1'} y2="1">
                <Stop offset="0" stopColor={Brand.navy950} />
                <Stop offset="0.55" stopColor={Brand.navy900} />
                <Stop offset="1" stopColor={Brand.navy700} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroSky)" />
          </Svg>

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

            {/* The search on its own, white on the navy. */}
            <PressScale
              accessibilityRole="search"
              accessibilityLabel={t('home.searchA11y')}
              onPress={() => router.push('/recherche')}
              style={[styles.searchPill, row]}
              pressedStyle={styles.searchPillPressed}
              scaleTo={0.985}
            >
              <Feather name="search" size={20} color={C.text} />
              <Text numberOfLines={1} style={[styles.flex, styles.searchText, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}>
                {t('look.searchBig')}
              </Text>
              <View style={styles.searchGo}>
                <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={18} color={C.onAccent} />
              </View>
            </PressScale>

            {/* The car every result is judged against, its own bar on the
                navy: the make's mark, the car, "Changer". */}
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={active ? `${t('look.forVehicle', { car: `${active.makeName} ${active.modelName}` })}, ${t('home.change')}` : t('look.noVehicleLine')}
              onPress={() => (active ? router.navigate('/garage') : router.push('/garage/ajouter'))}
              style={[styles.vehicleLine, row]}
              scaleTo={0.985}
            >
              {active ? (
                <MakeLogo name={active.makeName} slug={active.makeSlug} size={36} lifted={false} />
              ) : (
                <View style={styles.vehicleIcon}>
                  <NavCar size={18} color={Brand.gold400} />
                </View>
              )}
              <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
                <Text numberOfLines={1} style={[styles.vehicleName, { fontFamily: familyFor('bodySemi', rtl) }]}>
                  {active ? `${active.makeName} ${active.modelName}` : t('look.noVehicleLine')}
                </Text>
                <Text numberOfLines={1} style={[styles.vehicleSub, { fontFamily: familyFor('body', rtl) }]}>
                  {active ? vehicleLine(active) : t('look.chooseWhy')}
                </Text>
              </View>
              {/* "Changer" where the name keeps room beside it; a chevron on
                  a narrow phone, and without a car, whose line already says
                  "Choisissez votre véhicule". */}
              {active && !narrow ? (
                <Text style={[styles.vehicleAction, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('home.change')}</Text>
              ) : (
                <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={Brand.gold400} />
              )}
            </PressScale>

            {/* Every other way in (/trouver): a line to follow, not a fourth box. */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/trouver')}
              style={({ pressed }) => [styles.allWays, row, pressed && { opacity: 0.7 }]}
            >
              <Text numberOfLines={1} style={[styles.allWaysText, narrow && styles.allWaysNarrow, { fontFamily: familyFor('bodySemi', rtl) }]}>
                {t('look.find')}
              </Text>
              <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={16} color={Brand.white} />
            </Pressable>
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
  // The gradient runs on under the sheet's rounded corners.
  hero: { overflow: 'hidden', paddingBottom: Radius.sheet },
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
  searchPill: {
    marginTop: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingLeft: Spacing.three,
    paddingRight: 6,
    borderRadius: Radius.pill,
    backgroundColor: Brand.white,
    ...Elevation.resting,
  },
  searchPillPressed: { backgroundColor: C.surface },
  searchText: { fontSize: 16, lineHeight: 22, color: C.textMuted },
  searchGo: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.gold500, alignItems: 'center', justifyContent: 'center' },
  // The car, part of the hero rather than a white card on it.
  vehicleLine: {
    marginTop: Spacing.three,
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  vehicleIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(251,192,0,0.14)', alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: 15, lineHeight: 20, color: Brand.white },
  vehicleSub: { fontSize: 13, lineHeight: 17, color: Brand.navy300 },
  vehicleAction: { fontSize: 14, lineHeight: 18, color: Brand.gold400 },
  allWays: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    minHeight: Tap.min,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  allWaysText: { fontSize: 14, lineHeight: 18, color: Brand.white, flexShrink: 1 },
  allWaysNarrow: { fontSize: 13, lineHeight: 17 },
  // The white sheet runs to the bottom of the content, so a short page never
  // shows the navy root beneath it.
  scroll: { flexGrow: 1 },
  sheet: {
    flexGrow: 1,
    marginTop: -Radius.sheet,
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
