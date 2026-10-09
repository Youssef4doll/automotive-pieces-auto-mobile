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
import { RENDERS } from '@/illustrations/renders';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { useOnboarding } from '@/store/onboarding';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { Rail } from '@/components/ui/rail';

const LOGO = require('../../../assets/images/logo-lockup.png');

/** Where the disc is in the hero render, as fractions of its width and height. */
const DISC = { x: 0.53, y: 0.55 };

/**
 * Accueil — the reference's home, top to bottom, on the shop's data.
 *
 * On the night road, kept short so the families are on the first screen,
 * and in three weights rather than a stack of boxes: the shop's logo; the
 * car beside the disc as a few lines of type (or the invitation to choose
 * one); the search, the one white thing; and, quietest, "Comment trouver
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
  // The hero photograph (3:4) sits beside the car, its disc near the
  // column's far edge, rather than in a band of its own: the families are
  // on the first screen. Mirrored for Arabic.
  const column = Math.min(width, MaxContentWidth);
  const artHeight = Math.round(Math.min(column, 460) * 1.04);
  const artWidth = Math.round(artHeight * 0.75);
  const artSide = Math.round((width - column) / 2 + column * 0.885 - artWidth * DISC.x);
  const artTop = Math.round(insets.top + 118 - artHeight * DISC.y);
  // A narrow phone: the car's name a size down, clear of the disc.
  const narrow = column < 360;

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
          <View
            style={[styles.art, { top: artTop, width: artWidth, height: artHeight }, rtl ? { right: artSide, transform: [{ scaleX: -1 }] } : { left: artSide }]}
            pointerEvents="none"
          >
            {/* Inset under the gradient's edge: flush, a one-pixel seam of the
                bright floor showed down the hero as a line. */}
            <Image source={RENDERS.hero} style={styles.artImage} contentFit="cover" accessibilityIgnoresInvertColors />
            {/* Into the navy on every side the text is: the photograph has no edge. */}
            <Svg style={StyleSheet.absoluteFill} width={artWidth} height={artHeight}>
              <Defs>
                <LinearGradient id="fadeX" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={Brand.navy950} stopOpacity="1" />
                  <Stop offset="0.12" stopColor={Brand.navy950} stopOpacity="1" />
                  <Stop offset="0.42" stopColor={Brand.navy950} stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0.18" stopColor={Brand.navy950} stopOpacity="0.9" />
                  <Stop offset="0.36" stopColor={Brand.navy950} stopOpacity="0" />
                  <Stop offset="0.6" stopColor={Brand.navy950} stopOpacity="0" />
                  <Stop offset="0.74" stopColor={Brand.navy950} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={artWidth} height={artHeight} fill="url(#fadeX)" />
              <Rect x="0" y="0" width={artWidth} height={artHeight} fill="url(#fadeY)" />
            </Svg>
          </View>

          <View style={[styles.column, { paddingTop: insets.top + Spacing.three }]}>
            {/* The shop's logo alone on top: the search is the field below,
                not a second button beside it. */}
            <View style={[styles.topRow, row]}>
              <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel={t('app.name')} />
            </View>

            {/* Beside the disc, where the slogan was: the car, as a few
                lines on the navy rather than a box — what it is in white,
                what to do with it in gold, the rest quieter. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={active ? `${t('look.forVehicle', { car: `${active.makeName} ${active.modelName}` })}, ${t('home.change')}` : t('look.noVehicleLine')}
              onPress={() => (active ? router.navigate('/garage') : router.push('/garage/ajouter'))}
              style={({ pressed }) => [styles.car, { alignItems: rtl ? 'flex-end' : 'flex-start' }, pressed && { opacity: 0.75 }]}
            >
              <View style={[styles.carKicker, row]}>
                {active ? (
                  <MakeLogo name={active.makeName} slug={active.makeSlug} size={28} lifted={false} />
                ) : (
                  <View style={styles.carIcon}>
                    <NavCar size={15} color={Brand.gold400} />
                  </View>
                )}
                <Text style={[styles.kicker, { fontFamily: familyFor('display', rtl) }]}>{t('account.myVehicle')}</Text>
              </View>
              <Text
                numberOfLines={2}
                style={[styles.carName, narrow && styles.carNameNarrow, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}
              >
                {active ? `${active.makeName} ${active.modelName}` : t('look.noVehicleLine')}
              </Text>
              <View style={[styles.carSub, row]}>
                <Text numberOfLines={1} style={[styles.carSubText, { fontFamily: familyFor('body', rtl) }]}>
                  {active ? vehicleLine(active) : t('look.chooseWhy')}
                </Text>
                {active ? (
                  <Text style={[styles.carAction, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('home.change')}</Text>
                ) : null}
                <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={16} color={Brand.gold400} />
              </View>
            </Pressable>

            {/* The one white thing on the navy: the search. */}
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

            {/* Every other way in (/trouver): the quietest line of the three. */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/trouver')}
              style={({ pressed }) => [styles.allWays, row, pressed && { opacity: 0.7 }]}
            >
              <Text numberOfLines={1} style={[styles.allWaysText, { fontFamily: familyFor('body', rtl) }]}>
                {t('look.find')}
              </Text>
              <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.heroTextMuted} />
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
  hero: { overflow: 'hidden' },
  art: { position: 'absolute' },
  artImage: { position: 'absolute', top: 0, bottom: 0, left: 4, right: 0 },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  topRow: { alignItems: 'center', minHeight: Tap.min },
  logo: { width: 176, height: 32 },
  // The car beside the disc: kept to the text side of the photograph.
  car: { maxWidth: '68%', gap: 6, paddingTop: Spacing.four, paddingBottom: Spacing.four },
  carKicker: { alignItems: 'center', gap: Spacing.two },
  carIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(251,192,0,0.14)', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, lineHeight: 16, letterSpacing: 1.6, color: C.heroTextMuted, textTransform: 'uppercase' },
  carName: { fontSize: 23, lineHeight: 28, letterSpacing: -0.3, color: Brand.white },
  carNameNarrow: { fontSize: 20, lineHeight: 25 },
  carSub: { alignItems: 'center', gap: 6, minHeight: 24 },
  carSubText: { fontSize: 15, lineHeight: 20, color: C.heroTextMuted, flexShrink: 1 },
  carAction: { fontSize: 15, lineHeight: 20, color: Brand.gold400 },
  searchPill: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 58,
    paddingLeft: Spacing.three,
    paddingRight: 7,
    borderRadius: Radius.pill,
    backgroundColor: Brand.white,
    ...Elevation.resting,
  },
  searchPillPressed: { backgroundColor: C.surface },
  searchText: { fontSize: 16, lineHeight: 22, color: C.textMuted },
  searchGo: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.gold500, alignItems: 'center', justifyContent: 'center' },
  allWays: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    minHeight: Tap.min,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  allWaysText: { fontSize: 14, lineHeight: 18, color: C.heroTextMuted, flexShrink: 1 },
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
