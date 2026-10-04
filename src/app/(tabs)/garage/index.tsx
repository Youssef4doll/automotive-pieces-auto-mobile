import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { Image } from 'expo-image';

import { MakeLogo, MarkGlyph } from '@/components/ui/make-logo';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { MAKE_MARKS, markKey } from '@/illustrations/marques';
import { AdviceCard } from '@/components/ui/advice-card';
import { CareDueStrip } from '@/components/ui/care-due';
import { RENDERS } from '@/illustrations/renders';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { yearSpan } from '@/lib/format';
import { useGarage, type SavedVehicle } from '@/store/garage';

/**
 * Mon garage — the reference's personal space, not a list editor.
 *
 * The principal car at the top; a small grid of the four things a customer
 * does with a car (its parts, what was ordered, its details and the next
 * car); then every car in the garage, one tap to make another the principal;
 * then the yellow button to add one. Editing, switching and removing live one
 * level down in "Mes véhicules", so this screen stays a place to arrive.
 */
export default function GarageScreen() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const tabBarSpace = useTabBarSpace();
  const vehicles = useGarage((s) => s.vehicles);
  const active = useGarage((s) => s.active);
  const hydrated = useGarage((s) => s.hydrated);
  const setActive = useGarage((s) => s.setActive);
  const isFull = useGarage((s) => s.isFull);
  const [cardWidth, setCardWidth] = useState(0);
  const [page, setPage] = useState(0);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  if (!hydrated) return <View style={styles.root} />;

  if (!active) {
    return (
      <View style={[styles.root, styles.empty]}>
        <Image source={RENDERS.key} style={{ width: 180, height: 180 }} contentFit="contain" />
        <Text variant="screenTitle" style={styles.centred}>
          {t('garage.title')}
        </Text>
        <Text variant="body" tone={C.textMuted} style={styles.centred}>
          {t('look.garageEmptyWhy')}
        </Text>
        <Button label={t('home.chooseCar')} icon="plus" onPress={() => router.push('/garage/ajouter')} style={styles.wide} />
      </View>
    );
  }

  // The principal first, then the others as they were added.
  const ordered = [active, ...vehicles.filter((v) => v.engineId !== active.engineId)];
  const small: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean }[] = [
    { icon: 'clock', label: t('account.orders'), onPress: () => router.push('/compte/commandes') },
    { icon: 'info', label: t('look.bento.info'), onPress: () => router.push({ pathname: '/garage/vehicule/[engine]', params: { engine: active.engineId } }) },
    { icon: 'plus', label: t('look.bento.add'), onPress: () => router.push('/garage/ajouter'), disabled: isFull() },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]} showsVerticalScrollIndicator={false}>
      <View style={styles.column}>
        <Text variant="hint" tone={C.textMuted} style={{ textAlign: rtl ? 'right' : 'left' }}>
          {t('look.garageCount', { n: vehicles.length })}
        </Text>

        {/* The car, as the space's centrepiece — and with several, a
            carousel of them, the principal first. */}
        {ordered.length > 1 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onLayout={(e) => setCardWidth(Math.round(e.nativeEvent.layout.width))}
              onMomentumScrollEnd={(e) => cardWidth && setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth))}
              onScroll={Platform.OS === 'web' ? (e) => cardWidth && setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth)) : undefined}
              scrollEventThrottle={64}
              style={styles.carousel}
            >
              {ordered.map((v) => (
                <View key={v.engineId} style={{ width: cardWidth || undefined, paddingHorizontal: 2 }}>
                  <HeroCard vehicle={v} principal={v.engineId === active.engineId} onMakePrincipal={() => setActive(v.engineId)} />
                </View>
              ))}
            </ScrollView>
            <View style={[row, styles.dots]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {ordered.map((v, i) => (
                <View key={v.engineId} style={[styles.dot, i === page && styles.dotOn]} />
              ))}
            </View>
          </View>
        ) : (
          <HeroCard vehicle={active} principal onMakePrincipal={() => undefined} />
        )}

        {/* Three doors, each its own tile. */}
        <View style={[styles.quick, row]}>
          {small.map((b) => (
            <PressScale
              key={b.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: b.disabled }}
              disabled={b.disabled}
              onPress={b.onPress}
              style={[styles.quickItem, b.disabled && styles.disabled]}
              pressedStyle={styles.pressed}
              scaleTo={0.96}
            >
              <View style={styles.quickIcon}>
                <Feather name={b.icon} size={20} color={Brand.navy900} />
              </View>
              <Text style={[styles.quickLabel, { fontFamily: familyFor('bodySemi', rtl) }]} numberOfLines={2}>
                {b.label}
              </Text>
            </PressScale>
          ))}
        </View>

        {/* What its owner's own dates say is coming up; nothing when nothing is. */}
        <View style={styles.bleed}>
          <CareDueStrip />
        </View>

        <PressScale accessibilityRole="button" onPress={() => router.push('/garage/vehicules')} style={[row, styles.manage]} pressedStyle={styles.pressed}>
          <View style={styles.manageIcon}>
            <NavCar size={20} color={Brand.navy900} />
          </View>
          <View style={[styles.flex, { gap: 2 }]}>
            <Text variant="rowTitle" style={{ textAlign: rtl ? 'right' : 'left' }}>
              {t('look.myVehicles', { n: vehicles.length })}
            </Text>
            <Text variant="hint" style={{ textAlign: rtl ? 'right' : 'left' }}>
              {t('look.myVehiclesHint')}
            </Text>
          </View>
          <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={18} color={C.textMuted} />
        </PressScale>

        {isFull() ? (
          <Text variant="hint" style={styles.centred}>
            {t('garage.full')}
          </Text>
        ) : null}

        <AdviceCard onPale />
      </View>
    </ScrollView>
  );
}

/**
 * The car as a wallet pass: the navy of the shop with a soft diagonal sheen,
 * the make's own mark large and faded behind the text, the make's badge and
 * "MON VÉHICULE" across the top, the name, then the two facts the shop holds
 * for it as labelled fields — the engine, and the years when it recorded
 * them (left out, never guessed, when it did not). The
 * action that matters, the parts that fit, is the gold button under it.
 *
 * The whole pass opens "Mes véhicules"; a car that is not the principal one
 * offers to become it.
 */
function HeroCard({ vehicle, principal, onMakePrincipal }: { vehicle: SavedVehicle; principal: boolean; onMakePrincipal: () => void }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const years = yearSpan(vehicle.yearFrom ?? null, vehicle.yearTo ?? null, t);
  const mark = MAKE_MARKS[markKey(vehicle.makeSlug)] ?? MAKE_MARKS[markKey(vehicle.makeName)];
  return (
    <View style={styles.passWrap}>
      <View style={styles.pass}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 340 210" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="pass" x1={rtl ? '1' : '0'} y1="0" x2={rtl ? '0' : '1'} y2="1">
              <Stop offset="0" stopColor={Brand.navy700} />
              <Stop offset="1" stopColor={Brand.navy950} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={340} height={210} fill="url(#pass)" />
          <Path d={rtl ? 'M140 0 L0 0 L0 210 L220 210 Z' : 'M200 0 L340 0 L340 210 L120 210 Z'} fill={Brand.white} opacity={0.035} />
          <Path d={rtl ? 'M90 0 L0 0 L0 210 L150 210 Z' : 'M250 0 L340 0 L340 210 L190 210 Z'} fill={Brand.white} opacity={0.03} />
        </Svg>
        {mark ? (
          <View style={[styles.watermark, rtl ? { left: -36 } : { right: -36 }]} pointerEvents="none">
            <MarkGlyph mark={mark} size={184} color={Brand.white} />
          </View>
        ) : null}
        {/* The whole pass opens "Mes véhicules" — a layer behind the words,
            so the "Rendre principal" button on it is not a button inside a
            button. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[principal ? t('look.principal') : null, `${vehicle.makeName} ${vehicle.modelName}`, vehicle.engineName, years].filter(Boolean).join(', ')}
          onPress={() => router.push('/garage/vehicules')}
          style={({ pressed }) => [StyleSheet.absoluteFill, pressed && styles.passPressed]}
        />

        <View style={[styles.passHead, row]} pointerEvents="box-none">
          <View pointerEvents="none">
            <MakeLogo name={vehicle.makeName} slug={vehicle.makeSlug} size={40} lifted={false} />
          </View>
          <Text pointerEvents="none" style={[styles.kicker, { fontFamily: familyFor('display', rtl) }]} numberOfLines={1}>
            {t('account.myVehicle')}
          </Text>
          <View style={styles.flex} pointerEvents="none" />
          {principal ? (
            <View style={[styles.passTag, row]} pointerEvents="none">
              <Feather name="star" size={11} color={Brand.navy950} />
              <Text style={[styles.passTagText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.principalShort')}</Text>
            </View>
          ) : (
            // In the pass rather than under it, so every card in the
            // carousel is the same height.
            <Pressable
              accessibilityRole="button"
              onPress={onMakePrincipal}
              hitSlop={8}
              style={({ pressed }) => [styles.passMake, row, pressed && { opacity: 0.7 }]}
            >
              <Feather name="star" size={12} color={Brand.white} />
              <Text style={[styles.passMakeText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.setPrincipal')}</Text>
            </Pressable>
          )}
        </View>

        <Text pointerEvents="none" style={[styles.passName, align, { fontFamily: familyFor('headingStrong', rtl) }]} numberOfLines={2}>
          {vehicle.makeName} {vehicle.modelName}
        </Text>

        <View style={[styles.fields, row]} pointerEvents="none">
          <Field label={t('picker.stepEngine')} value={vehicle.engineName} />
          {years ? <Field label={t('look.fieldYears')} value={`\u2066${years}\u2069`} /> : null}
        </View>

      </View>

      <PressScale
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/pieces-compatibles', params: { engine: vehicle.engineId } })}
        style={[styles.heroCta, row]}
        pressedStyle={{ backgroundColor: Brand.gold600 }}
      >
        <Feather name="check-circle" size={18} color={C.onAccent} />
        <Text style={[styles.heroCtaText, { fontFamily: familyFor('display', rtl) }]}>{t('home.seeCompatible')}</Text>
      </PressScale>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const { rtl } = useI18n();
  return (
    <View style={[styles.field, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
      <Text style={[styles.fieldLabel, { fontFamily: familyFor('display', rtl) }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.fieldValue, { fontFamily: familyFor('bodySemi', rtl) }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { paddingTop: Spacing.one },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  flex: { flex: 1, minWidth: 0 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four, backgroundColor: C.background },
  centred: { textAlign: 'center' },
  wide: { alignSelf: 'stretch' },
  passWrap: { gap: Spacing.three },
  bleed: { marginHorizontal: -Spacing.three },
  pass: {
    minHeight: 204,
    borderRadius: 22,
    overflow: 'hidden',
    padding: Spacing.four,
    paddingBottom: Spacing.four + 6,
    gap: Spacing.three,
    backgroundColor: Brand.navy900,
    ...Elevation.lifted,
  },
  watermark: { position: 'absolute', top: 26, opacity: 0.08 },
  passHead: { alignItems: 'center', gap: Spacing.two },
  kicker: { fontSize: 12, lineHeight: 16, letterSpacing: 1.6, color: Brand.navy300, textTransform: 'uppercase', flexShrink: 1 },
  passTag: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Brand.gold500 },
  passTagText: { fontSize: 11, lineHeight: 15, color: Brand.navy950 },
  passMake: { alignItems: 'center', gap: 4, minHeight: 28, paddingHorizontal: 10, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  passMakeText: { fontSize: 12, lineHeight: 16, color: Brand.white },
  passName: { fontSize: 26, lineHeight: 31, color: Brand.white, marginTop: Spacing.one },
  fields: { gap: Spacing.five, flexWrap: 'wrap' },
  field: { gap: 2 },
  fieldLabel: { fontSize: 10, lineHeight: 13, letterSpacing: 1.4, color: Brand.navy300, textTransform: 'uppercase' },
  fieldValue: { fontSize: 16, lineHeight: 21, color: Brand.white },
  passPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  heroCta: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary,
    borderRadius: Radius.pill,
    backgroundColor: Brand.gold500,
  },
  heroCtaText: { fontSize: 16, color: C.onAccent },
  quick: { gap: Spacing.two },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: Brand.white,
    ...Elevation.resting,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.gold500, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, lineHeight: 17, color: C.text, textAlign: 'center' },
  pressed: { backgroundColor: C.surface },
  disabled: { opacity: 0.45 },
  head: { alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.one },
  section: { fontSize: 18, lineHeight: 24, color: C.text },
  seeAll: { alignItems: 'center', gap: 4, minHeight: Tap.min },
  list: { gap: Spacing.two },
  carousel: { marginHorizontal: -2 },
  dots: { justifyContent: 'center', gap: 6, paddingTop: Spacing.two },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotOn: { width: 18, backgroundColor: C.text },
  manage: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.primary + Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: Brand.white,
    ...Elevation.resting,
  },
  manageIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
});
