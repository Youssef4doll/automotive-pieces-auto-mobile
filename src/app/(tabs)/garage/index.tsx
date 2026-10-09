import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';

import { initials, MakeLogo, MarkGlyph } from '@/components/ui/make-logo';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { MAKE_MARKS, markKey } from '@/illustrations/marques';
import { CareDueStrip } from '@/components/ui/care-due';
import { CarKey } from '@/illustrations/car-key';
import { useI18n } from '@/i18n/provider';
import { ltr, yearSpan } from '@/lib/format';
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
        <CarKey size={180} />
        <Text variant="screenTitle" style={styles.centred}>
          {t('garage.title')}
        </Text>
        <Text variant="body" tone={C.textMuted} style={styles.centred}>
          {t('look.garageEmptyWhy')}
        </Text>
        <Button label={t('home.chooseCar')} icon="plus" onPress={() => router.push('/garage/ajouter')} style={styles.wide} />
        <Button label={t('garage.byVinLong')} icon="credit-card" variant="secondary" onPress={() => router.push('/garage/vin')} style={styles.wide} />
      </View>
    );
  }

  // The principal first, then the others as they were added.
  const ordered = [active, ...vehicles.filter((v) => v.engineId !== active.engineId)];
  // Three tiles under the car — the next car, by the picker or by the VIN,
  // and every car — each one word and an icon. Orders live in Compte.
  const doors: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean; accent?: boolean }[] = [
    { icon: 'plus', label: t('look.bento.add'), onPress: () => router.push('/garage/ajouter'), disabled: isFull(), accent: true },
    { icon: 'credit-card', label: t('garage.byVin'), onPress: () => router.push('/garage/vin'), disabled: isFull() },
    { icon: 'layers', label: t('look.myVehiclesTitle'), onPress: () => router.push('/garage/vehicules') },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]} showsVerticalScrollIndicator={false}>
      <View style={styles.column}>
        <View style={[row, styles.head]}>
          <Text style={[styles.count, { fontFamily: familyFor('heading', rtl) }]}>{t('look.garageCount', { n: vehicles.length })}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/garage/vehicules')} style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.6 }]}>
            <Text style={[styles.seeAllText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('catalog.seeAll')}</Text>
          </Pressable>
        </View>

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
                  <HeroCard vehicle={v} principal={v.engineId === active.engineId} onMakePrincipal={() => setActive(v.engineId)} flat />
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

        <Text style={[styles.section, { textAlign: rtl ? 'right' : 'left', fontFamily: familyFor('heading', rtl) }]}>{t('look.garageShortcuts')}</Text>
        <View style={[row, styles.tiles]}>
          {doors.map((d) => (
            <PressScale
              key={d.label}
              accessibilityRole="button"
              accessibilityLabel={d.label}
              accessibilityState={{ disabled: d.disabled }}
              disabled={d.disabled}
              onPress={d.onPress}
              style={[styles.tile, d.disabled && styles.disabled]}
              pressedStyle={styles.doorPressed}
              scaleTo={0.97}
            >
              <View style={[styles.doorIcon, d.accent && styles.doorIconAccent]}>
                <Feather name={d.icon} size={19} color={d.accent ? Brand.navy950 : Brand.white} />
              </View>
              <Text style={[styles.tileLabel, { fontFamily: familyFor('bodySemi', rtl) }]} numberOfLines={2}>
                {d.label}
              </Text>
            </PressScale>
          ))}
        </View>

        {/* What its owner's own dates say is coming up; nothing when nothing is. */}
        <View style={styles.bleed}>
          <CareDueStrip />
        </View>

        {isFull() ? (
          <Text variant="hint" style={styles.centred}>
            {t('garage.full')}
          </Text>
        ) : null}
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
function HeroCard({
  vehicle,
  principal,
  onMakePrincipal,
  flat = false,
}: {
  vehicle: SavedVehicle;
  principal: boolean;
  onMakePrincipal: () => void;
  /** In the carousel: no shadow, which the scroller would cut into a grey box. */
  flat?: boolean;
}) {
  const { t, rtl } = useI18n();
  // A narrow phone: the button keeps its words whole, without its tick.
  const narrow = useWindowDimensions().width < 360;
  const router = useRouter();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const years = yearSpan(vehicle.yearFrom ?? null, vehicle.yearTo ?? null, t);
  const mark = MAKE_MARKS[markKey(vehicle.makeSlug)] ?? MAKE_MARKS[markKey(vehicle.makeName)];
  return (
    <View style={styles.passWrap}>
      <View style={[styles.pass, flat && styles.passFlat]}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 340 210" preserveAspectRatio="none">
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
        {/* The make large and faded behind the words — every car has one:
            a make the app has no mark for shows its initials there. */}
        <View style={[styles.watermark, rtl ? { left: -36 } : { right: -36 }]} pointerEvents="none">
          {mark ? (
            <MarkGlyph mark={mark} size={184} color={Brand.white} />
          ) : (
            <Text style={[styles.watermarkText, { fontFamily: familyFor('headingStrong', false) }]}>{initials(vehicle.makeName)}</Text>
          )}
        </View>
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
          <Text pointerEvents="none" style={[styles.kicker, narrow && styles.kickerNarrow, { fontFamily: familyFor('display', rtl) }]} numberOfLines={1}>
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
          <Field label={t('picker.stepEngine')} value={ltr(vehicle.engineName)} />
          {years ? <Field label={t('look.fieldYears')} value={`\u2066${years}\u2069`} /> : null}
        </View>

        <View style={[styles.passActions, row]}>
          <PressScale
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/pieces-compatibles', params: { engine: vehicle.engineId } })}
            style={[styles.heroCta, narrow && styles.heroCtaNarrow, row]}
            pressedStyle={{ backgroundColor: Brand.gold600 }}
          >
            {narrow ? null : <Feather name="check-circle" size={18} color={C.onAccent} />}
            <Text style={[styles.heroCtaText, narrow && styles.heroCtaTextNarrow, { fontFamily: familyFor('display', rtl) }]} numberOfLines={1}>
              {t('look.bento.parts')}
            </Text>
          </PressScale>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={t('look.bento.info')}
            onPress={() => router.push({ pathname: '/garage/vehicule/[engine]', params: { engine: vehicle.engineId } })}
            style={styles.passInfo}
            pressedStyle={{ backgroundColor: 'rgba(255,255,255,0.28)' }}
          >
            <Feather name="info" size={20} color={Brand.white} />
          </PressScale>
        </View>
      </View>

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
  root: { flex: 1, backgroundColor: C.background },
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
  passFlat: { shadowOpacity: 0, elevation: 0 },
  watermark: { position: 'absolute', top: 26, opacity: 0.08 },
  watermarkText: { width: 184, fontSize: 120, lineHeight: 184, textAlign: 'center', color: Brand.white },
  passHead: { alignItems: 'center', gap: Spacing.two },
  kicker: { fontSize: 12, lineHeight: 16, letterSpacing: 1.6, color: Brand.navy300, textTransform: 'uppercase', flexShrink: 1 },
  kickerNarrow: { fontSize: 11, letterSpacing: 0.8 },
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.gold500,
  },
  passActions: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  passInfo: {
    width: Tap.primary,
    height: Tap.primary,
    borderRadius: Tap.primary / 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontSize: 18, lineHeight: 24, color: C.text },
  seeAllText: { fontSize: 15, lineHeight: 20, color: C.text, textDecorationLine: 'underline' },
  tiles: { gap: Spacing.two + 2 },
  tile: { flex: 1, minWidth: 0, minHeight: 112, alignItems: 'center', justifyContent: 'center', gap: Spacing.two + 2, paddingHorizontal: Spacing.two, paddingVertical: Spacing.three, borderRadius: 20, backgroundColor: C.surface },
  tileLabel: { fontSize: 13, lineHeight: 17, color: C.text, textAlign: 'center' },
  doorPressed: { backgroundColor: C.surfacePressed },
  doorIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.navy900, alignItems: 'center', justifyContent: 'center' },
  doorIconAccent: { backgroundColor: Brand.gold500 },
  heroCtaText: { fontSize: 16, color: C.onAccent },
  heroCtaTextNarrow: { fontSize: 15 },
  heroCtaNarrow: { paddingHorizontal: Spacing.two },
  pressed: { backgroundColor: C.surface },
  disabled: { opacity: 0.45 },
  head: { alignItems: 'center', justifyContent: 'space-between' },
  section: { fontSize: 18, lineHeight: 24, color: C.text },
  seeAll: { minHeight: Tap.min, minWidth: Tap.min, justifyContent: 'center' },
  list: { gap: Spacing.two },
  carousel: { marginHorizontal: -2 },
  dots: { justifyContent: 'center', gap: 6, paddingTop: Spacing.two },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotOn: { width: 18, backgroundColor: C.text },
});
