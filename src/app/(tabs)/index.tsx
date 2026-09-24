import { Feather } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
import { MakeLogo } from '@/components/ui/make-logo';
import { useVehicleLine } from '@/components/ui/vehicle-card';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { familyRender, RENDERS } from '@/illustrations/renders';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useCheckout } from '@/store/checkout';
import { useAccount } from '@/store/account';
import { useGarage } from '@/store/garage';
import { useOnboarding } from '@/store/onboarding';
import { usePullRefresh } from '@/hooks/use-pull-refresh';

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
  const onboarded = useOnboarding((s) => s.done);
  const onboardingRead = useOnboarding((s) => s.hydrated);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const { t, rtl } = useI18n();
  const active = useGarage((s) => s.active);
  const vehicleLine = useVehicleLine();
  const accountName = useAccount((s) => (s.status === 'signedIn' ? s.account?.name : null));
  const checkoutName = useCheckout((s) => s.details.customerName);
  const firstName = ((accountName ?? checkoutName).trim().split(/\s+/)[0] ?? '').slice(0, 24);
  // The hero photograph is 3:4; it is lifted so the part sits beside the
  // slogan and under the search, then fades into the navy below.
  const heroHeight = Math.round(Math.min(width, MaxContentWidth + 120) * 4 / 3);
  const heroLift = Math.round(heroHeight * 0.06);

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
  const refreshControl = usePullRefresh();
  const canAskShop = settings.status === 'loaded' && hasContactChannel(settings.data);

  // The radial menu: the car in the middle — the one the app answers for,
  // or the invitation to name one — with the other ways in either side.
  // Side bubbles come to the centre when tapped; the centred one goes.
  const { bubbles, centre } = useMemo(() => {
    const car: BubbleItem = active
      ? {
          key: 'car',
          icon: <MakeLogo name={active.makeName} slug={active.makeSlug} size={62} lifted={false} />,
          label: `${active.makeName} ${active.modelName}`,
          hint: t('look.hint.car'),
          onPress: () => router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } }),
        }
      : { key: 'car', icon: <Render source={RENDERS.key} size={84} />, label: t('bubble.myCar'), hint: t('look.hint.pick'), onPress: () => router.push('/garage/ajouter') };
    const reference: BubbleItem = {
      key: 'reference',
      icon: <Render source={RENDERS.magnifier} size={70} />,
      label: t('bubble.reference'),
      hint: t('look.hint.ref'),
      onPress: () => router.push({ pathname: '/recherche', params: { mode: 'reference' } }),
    };
    const part: BubbleItem = { key: 'part', icon: <Render source={familyRender('freinage') ?? RENDERS.magnifier} size={70} />, label: t('bubble.part'), hint: t('look.hint.part'), onPress: () => router.navigate('/catalogue') };
    const photo: BubbleItem | null = canAskShop
      ? { key: 'photo', icon: <Render source={RENDERS.phone} size={70} />, label: t('bubble.photo'), hint: t('look.hint.photo'), onPress: () => router.push('/aide') }
      : null;
    // Balanced either side of the car: with one, "une autre voiture" takes
    // the right; without, the reference does. Photo / Expert only when the
    // shop has published a way to be reached — a promise of advice nobody
    // can answer is worse than no promise.
    const items: BubbleItem[] = active
      ? [reference, part, car, { key: 'other', icon: <Render source={RENDERS.key} size={70} />, label: t('look.otherCar'), hint: t('look.hint.pick'), onPress: () => router.push('/garage/ajouter') }]
      : [part, car, reference];
    if (photo) items.push(photo);
    return { bubbles: items, centre: active ? 2 : 1 };
  }, [active, canAskShop, router, t]);

  // Every family, most parts first — a rail to browse, not four fixed tiles.
  const rail = useMemo<Family[]>(
    () => (families.status === 'loaded' ? [...families.data].sort((a, b) => b.productCount - a.productCount) : []),
    [families],
  );
  const careFamily = families.status === 'loaded' ? families.data.find((f) => f.slug === 'filtres') : undefined;

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
        <View>
          <View style={[styles.heroBg, { top: -heroLift }]} pointerEvents="none">
            <Image
              source={RENDERS.hero}
              style={{ width: '100%', height: heroHeight, transform: rtl ? [{ scaleX: -1 }] : undefined }}
              contentFit="cover"
              contentPosition={rtl ? 'left center' : 'right center'}
              accessibilityIgnoresInvertColors
            />
            {/* Into the navy: the photograph ends where the questions start. */}
            <Svg style={StyleSheet.absoluteFill} width="100%" height={heroHeight}>
              <Defs>
                <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Brand.navy950} stopOpacity="0.55" />
                  <Stop offset="0.3" stopColor={Brand.navy950} stopOpacity="0.05" />
                  <Stop offset="0.72" stopColor={Brand.navy950} stopOpacity="0.15" />
                  <Stop offset="0.94" stopColor={Brand.navy950} stopOpacity="1" />
                </LinearGradient>
                <LinearGradient id="side" x1={rtl ? '1' : '0'} y1="0" x2={rtl ? '0' : '1'} y2="0">
                  <Stop offset="0" stopColor={Brand.navy950} stopOpacity="0.5" />
                  <Stop offset="0.5" stopColor={Brand.navy950} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height={heroHeight} fill="url(#side)" />
              <Rect x="0" y="0" width="100%" height={heroHeight} fill="url(#fade)" />
            </Svg>
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

            {/* Room for the photograph between the promise and the search, as
                the reference leaves room for its car. */}
            <View style={{ height: Math.round(heroHeight * 0.44) }} />

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
              <Text style={[styles.vehicleAction, { fontFamily: familyFor('bodySemi', rtl) }]}>{active ? t('home.change') : t('look.choose')}</Text>
            </PressScale>

            <View style={styles.titles}>
              <Text style={[styles.hello, { fontFamily: familyFor('bodySemi', rtl), textAlign: rtl ? 'right' : 'left' }]}>
                {firstName ? t('look.hello', { name: firstName }) : t('look.helloAnon')}
              </Text>
              <Text style={[styles.title, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('home.whatLooking')}</Text>
              <Text style={[styles.subtitle, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('home.whatLookingWhy')}</Text>
            </View>
          </View>

          <View style={styles.arc}>
            <BubbleArc items={bubbles} initial={centre} />
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
              <Text style={[styles.sectionTitle, { fontFamily: familyFor('heading', rtl) }]}>{t('look.browse')}</Text>
              <Pressable accessibilityRole="button" onPress={() => router.navigate('/catalogue')} hitSlop={8} style={[styles.seeAll, row]}>
                <Text variant="hint" tone={C.text}>
                  {t('catalog.seeAll')}
                </Text>
                <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
              </Pressable>
            </View>

          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, row]}>
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
          </ScrollView>
          <View style={styles.column}>
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
                <View style={[styles.careArt, rtl ? { left: -6 } : { right: -6 }]} pointerEvents="none">
                  <Image source={familyRender('lubrifiant') ?? RENDERS.key} style={{ width: 132, height: 132 }} contentFit="contain" />
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
                  <Image source={RENDERS.phone} style={{ width: 92, height: 92 }} contentFit="contain" />
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
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
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

/** A studio render inside an arc bubble. */
function Render({ source, size }: { source: ImageSourcePropType; size: number }) {
  return <Image source={source} style={{ width: size, height: size }} contentFit="contain" />;
}
