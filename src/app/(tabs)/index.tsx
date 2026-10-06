import { Feather } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogueApi, type Family } from '@/api/catalogue';
import { BrandStrip } from '@/components/ui/brand-strip';
import { CareBanner } from '@/components/ui/care-banner';
import { HomeForYou } from '@/components/ui/home-for-you';
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
import { RENDERS } from '@/illustrations/renders';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { useOnboarding } from '@/store/onboarding';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { Rail } from '@/components/ui/rail';

const LOGO = require('../../../assets/images/logo-lockup.png');

/**
 * Accueil.
 *
 * On the night road, kept to about a third of the phone: the shop's logo and
 * the search, the slogan with the disc beside it, the search box, and the car
 * every result is judged against (or the invitation to choose one).
 *
 * On the white sheet, the customer first — "Youssef, voici pour vous" with
 * the car's own shelf, the order on its way and what is due (HomeForYou),
 * each only when it is real. Then the families, "Entretien auto" (a way into
 * the filters — navigation, not a promotion), the shop's campaigns when it
 * runs one, the parts makers it carries, and "Besoin d'un conseil ?".
 *
 * Kept true: the greeting uses the name on the account, or none; there is no
 * bell, because the app has no notifications to ring it.
 */
export default function HomeScreen() {
  const onboarded = useOnboarding((s) => s.done);
  const onboardingRead = useOnboarding((s) => s.hydrated);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const { t, rtl } = useI18n();
  const active = useGarage((s) => s.active);
  const vehicleLine = useVehicleLine();

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
        {/* The hero, kept to what earns its height: the shop's logo and the
            search, the promise with the disc beside it, the search box and
            the car every result is judged against — about a third of the
            phone, so what is for the customer starts above the fold. */}
        <View style={[styles.column, { paddingTop: insets.top + Spacing.two }]}>
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

          <View style={[styles.heroRow, row]}>
            <View style={[styles.flex, styles.slogan]}>
              <Text style={[styles.sloganText, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}>
                {t('look.slogan1')}
                {'\n'}
                {t('look.slogan2')}
                <Text style={[styles.sloganText, styles.sloganAccent, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('look.slogan2Accent')}</Text>
              </Text>
              <Text style={[styles.subtitle, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('look.slogan3')}</Text>
            </View>
            <Image
              source={RENDERS.heroDisc}
              style={[styles.disc, rtl ? styles.discRtl : styles.discLtr]}
              contentFit="contain"
              accessibilityIgnoresInvertColors
            />
          </View>

          {/* The main action, and the car it answers for, as one piece:
              the search, and directly under it the line that says which
              car every result will be judged against. */}
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

          <PressScale
            accessibilityRole="button"
            accessibilityLabel={active ? `${t('look.forVehicle', { car: `${active.makeName} ${active.modelName}` })}, ${t('home.change')}` : t('look.noVehicleLine')}
            onPress={() => (active ? router.navigate('/garage') : router.push('/garage/ajouter'))}
            style={[styles.vehicleLine, row]}
            scaleTo={0.985}
          >
            {active ? (
              <MakeLogo name={active.makeName} slug={active.makeSlug} size={32} lifted={false} />
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
            <Text style={[styles.vehicleAction, { fontFamily: familyFor('bodySemi', rtl) }]}>{active ? t('home.change') : t('look.choose')}</Text>
          </PressScale>
        </View>

        {/* The white sheet, pulled up over the road. */}
        <View style={[styles.sheet, { paddingBottom: tabBarSpace }]}>
          {/* The customer first: the order on its way, what is due on the
              car, and the car's own shelf — each only when it is real. */}
          <HomeForYou />

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

          <View style={styles.column}>
            {families.status === 'loaded' ? (
              <View style={styles.care}>
                <CareBanner families={families.data} onOpen={openFamily} />
              </View>
            ) : null}

          </View>

          {/* The shop's real campaigns, when it is running one. */}
          <View style={styles.promo}>
            <PromoBanner />
          </View>

          <View style={[styles.column, styles.block]}>
            <BrandStrip />
          </View>


          {/* Always there: the photo goes to the shop's inbox (/demande). */}
          <View style={[styles.column, styles.adviceWrap]}>
            <AdviceCard />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/trouver')}
              style={({ pressed }) => [styles.allWays, row, pressed && { opacity: 0.7 }]}
            >
              <Text variant="hint" tone={C.text} style={styles.allWaysText}>
                {t('look.find')}
              </Text>
              <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.navy950 },
  flex: { flex: 1, minWidth: 0 },
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
  heroRow: { alignItems: 'center', minHeight: 132 },
  slogan: { gap: 6, paddingVertical: Spacing.two },
  sloganText: { fontSize: 24, lineHeight: 29, letterSpacing: -0.4, color: Brand.white },
  // The disc beside the promise, its light bleeding a little past the column.
  disc: { width: 112, height: 127, marginVertical: -Spacing.one },
  discLtr: { marginRight: -Spacing.four },
  discRtl: { marginLeft: -Spacing.four, transform: [{ scaleX: -1 }] },
  sloganAccent: { color: Brand.gold500 },
  searchPill: {
    marginTop: 0,
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
  // The car, part of the hero rather than a card on it.
  vehicleLine: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  vehicleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(251,192,0,0.14)', alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: 15, lineHeight: 20, color: Brand.white },
  vehicleSub: { fontSize: 13, lineHeight: 17, color: '#aab6cc' },
  vehicleAction: { fontSize: 14, color: Brand.gold400 },
  // On its own dark pill: it sits over the road's centre line.
  subtitle: { fontSize: 14, lineHeight: 19, color: '#c7d1e3' },
  allWays: { alignSelf: 'center', alignItems: 'center', gap: 6, minHeight: Tap.min, marginTop: Spacing.two },
  allWaysText: { textDecorationLine: 'underline' },
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
  care: { marginTop: Spacing.four },
  adviceWrap: { marginTop: Spacing.four },
  block: { paddingTop: Spacing.four },
  promo: { paddingTop: Spacing.four },
});
