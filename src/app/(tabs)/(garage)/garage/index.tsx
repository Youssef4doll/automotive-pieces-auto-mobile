import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { CareDueStrip } from '@/components/ui/care-due';
import { initials, MakeLogo, MarkGlyph } from '@/components/ui/make-logo';
import { PressScale } from '@/components/ui/press-scale';
import { Rail } from '@/components/ui/rail';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useSvgId } from '@/hooks/use-svg-id';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { useI18n } from '@/i18n/provider';
import { CarKey } from '@/illustrations/car-key';
import { MAKE_MARKS, markKey } from '@/illustrations/marques';
import { ltr, yearSpan } from '@/lib/format';
import { useGarage, type SavedVehicle } from '@/store/garage';
import { useVehicleCare } from '@/store/vehicle-care';

/** The owner's photograph of the evening road; the card shows its mountains, not the car in it. */
const ROAD = require('@/assets/images/garage-road.webp');
const ROAD_RATIO = 1672 / 941;

/**
 * Mon garage — the customer's car, the way the owner's references show a
 * thing worth having (October 2026): a dark card that is the car, its
 * facts large on the evening road and one gold action; three tiles for what
 * a customer does next; then the other cars, side by side.
 *
 * The road is the owner's photograph, framed on its mountains and lake: the
 * car in it is not the customer's, and the card never shows a car that is
 * not theirs. The make's own mark stands in for it, large and faded. Only
 * what the garage knows is written — the engine, the years when the shop
 * recorded them, the mileage when the owner gave it.
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
  const mileage = useVehicleCare((s) => (active ? s.byEngine[active.engineId]?.mileageKm : undefined));
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
      </View>
    );
  }

  const others = vehicles.filter((v) => v.engineId !== active.engineId);
  const full = isFull();

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]} showsVerticalScrollIndicator={false}>
      <View style={styles.column}>
        <Hero vehicle={active} mileage={mileage} />

        {/* What a customer does next, as the references' three tiles: the dark one first. */}
        <View style={[row, styles.tiles]}>
          <Tile
            dark
            icon="tool"
            label={t('garage.tileInfo')}
            onPress={() => router.push({ pathname: '/garage/vehicule/[engine]', params: { engine: active.engineId } })}
            testID="garage-tile-info"
          />
          <Tile
            icon="layers"
            label={t('look.myVehiclesTitle')}
            value={t('look.garageCount', { n: vehicles.length })}
            onPress={() => router.push('/garage/vehicules')}
            testID="garage-tile-list"
          />
          <Tile icon="plus" accent label={t('look.bento.add')} disabled={full} onPress={() => router.push('/garage/ajouter')} testID="garage-tile-add" />
        </View>
      </View>

      {/* What its owner's own dates say is coming up; nothing when nothing is. */}
      <CareDueStrip />

      {others.length ? (
        <>
          <View style={[styles.column, row, styles.sectionHead]}>
            <Text style={[styles.section, { textAlign: rtl ? 'right' : 'left', fontFamily: familyFor('heading', rtl) }]}>{t('garage.others')}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/garage/vehicules')} hitSlop={8} style={[styles.seeAll, row]}>
              <Text variant="hint" tone={C.text}>
                {t('catalog.seeAll')}
              </Text>
              <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
            </Pressable>
          </View>
          <Rail contentContainerStyle={[styles.rail, row]}>
            {others.map((v, i) => (
              <OtherCard key={v.engineId} vehicle={v} dark={i % 2 === 1} onMakePrincipal={() => setActive(v.engineId)} />
            ))}
          </Rail>
        </>
      ) : null}

      {full ? (
        <Text variant="hint" style={[styles.centred, styles.fullNote]}>
          {t('garage.full')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

/**
 * The car: a dark card on the owner's evening road, the make's badge and
 * "MON VÉHICULE" across the top, the make's mark large and faded at the
 * far side, the name large, the facts the garage holds as labelled fields,
 * and the gold "Pièces compatibles" with the details beside it.
 */
function Hero({ vehicle, mileage }: { vehicle: SavedVehicle; mileage?: number }) {
  const { t, rtl, locale } = useI18n();
  const router = useRouter();
  const [width, setWidth] = useState(0);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const years = yearSpan(vehicle.yearFrom ?? null, vehicle.yearTo ?? null, t);
  const mark = MAKE_MARKS[markKey(vehicle.makeSlug)] ?? MAKE_MARKS[markKey(vehicle.makeName)];
  const shade = useSvgId('garageShade');
  const floor = useSvgId('garageFloor');
  const km =
    mileage != null
      ? `${new Intl.NumberFormat(locale === 'ar' ? 'ar-TN-u-nu-latn' : locale === 'en' ? 'en-GB' : 'fr-FR').format(mileage)} km`
      : null;
  // The photograph 2.6 times the card's width, its mountains and lake in
  // the card, the car just past its far edge.
  const photoW = width * 2.6;
  const photoH = photoW / ROAD_RATIO;
  const height = 318;

  return (
    <View style={styles.heroWrap} testID="garage-hero">
      <View style={[styles.hero, { minHeight: height }]} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {width ? (
          <Image
            source={ROAD}
            style={[styles.photo, { width: photoW, height: photoH, top: -photoH * 0.2 }, rtl ? { right: -photoW * 0.17, transform: [{ scaleX: -1 }] } : { left: -photoW * 0.17 }]}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}
        {width ? (
          <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
            <Defs>
              <LinearGradient id={shade} x1={rtl ? '1' : '0'} y1="0" x2={rtl ? '0' : '1'} y2="0">
                <Stop offset="0" stopColor={Brand.navy950} stopOpacity="0.85" />
                <Stop offset="0.5" stopColor={Brand.navy950} stopOpacity="0.35" />
                <Stop offset="1" stopColor={Brand.navy950} stopOpacity="0" />
              </LinearGradient>
              <LinearGradient id={floor} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.45" stopColor={Brand.navy950} stopOpacity="0" />
                <Stop offset="1" stopColor={Brand.navy950} stopOpacity="0.9" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={height} fill={`url(#${shade})`} />
            <Rect x={0} y={0} width={width} height={height} fill={`url(#${floor})`} />
          </Svg>
        ) : null}

        {/* The make, large and faded, where the car would stand. */}
        <View style={[styles.watermark, rtl ? { left: -30 } : { right: -30 }]} pointerEvents="none">
          {mark ? (
            <MarkGlyph mark={mark} size={176} color={Brand.white} />
          ) : (
            <Text style={[styles.watermarkText, { fontFamily: familyFor('headingStrong', false) }]}>{initials(vehicle.makeName)}</Text>
          )}
        </View>

        <View style={[styles.heroHead, row]}>
          <MakeLogo name={vehicle.makeName} slug={vehicle.makeSlug} size={44} lifted={false} />
          <Text style={[styles.kicker, { fontFamily: familyFor('display', rtl) }]} numberOfLines={1}>
            {t('account.myVehicle')}
          </Text>
          <View style={styles.flex} />
          <View style={[styles.tag, row]}>
            <Feather name="star" size={11} color={Brand.navy950} />
            <Text style={[styles.tagText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.principalShort')}</Text>
          </View>
        </View>

        <View style={styles.flex} />

        <Text style={[styles.name, align, { fontFamily: familyFor('headingStrong', rtl) }]} numberOfLines={2}>
          {vehicle.makeName} {vehicle.modelName}
        </Text>

        <View style={[styles.fields, row]}>
          <Field label={t('picker.stepEngine')} value={ltr(vehicle.engineName)} />
          {years ? <Field label={t('look.fieldYears')} value={`⁦${years}⁩`} /> : null}
          {km ? <Field label={t('garage.mileage')} value={ltr(km)} /> : null}
        </View>

        <View style={[styles.actions, row]}>
          <PressScale
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/pieces-compatibles', params: { engine: vehicle.engineId } })}
            style={[styles.cta, row]}
            pressedStyle={{ backgroundColor: Brand.gold600 }}
            testID="garage-parts"
          >
            <Feather name="check-circle" size={18} color={C.onAccent} />
            <Text style={[styles.ctaText, { fontFamily: familyFor('display', rtl) }]} numberOfLines={1}>
              {t('look.bento.parts')}
            </Text>
          </PressScale>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={t('look.bento.info')}
            onPress={() => router.push({ pathname: '/garage/vehicule/[engine]', params: { engine: vehicle.engineId } })}
            style={styles.info}
            pressedStyle={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
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

/** One of the three tiles: its icon at the top, its words at the foot. */
function Tile({
  icon,
  label,
  value,
  dark = false,
  accent = false,
  disabled = false,
  onPress,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value?: string;
  dark?: boolean;
  accent?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { rtl } = useI18n();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tile, dark && styles.tileDark, disabled && styles.disabled, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}
      pressedStyle={dark ? styles.tileDarkPressed : styles.tilePressed}
      scaleTo={0.96}
      testID={testID}
    >
      <View style={[styles.tileIcon, dark && styles.tileIconDark, accent && styles.tileIconAccent]}>
        <Feather name={icon} size={18} color={accent ? Brand.navy950 : dark ? Brand.white : C.text} />
      </View>
      <View style={styles.tileWords}>
        <Text style={[styles.tileLabel, dark && styles.onDark, align, { fontFamily: familyFor('bodySemi', rtl) }]} numberOfLines={2}>
          {label}
        </Text>
        {value ? (
          <Text style={[styles.tileValue, dark && styles.onDarkMuted, align, { fontFamily: familyFor('body', rtl) }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
      </View>
    </PressScale>
  );
}

/** Another car in the garage: its badge and name, its details on a tap, and the way to make it the main one. */
function OtherCard({ vehicle, dark, onMakePrincipal }: { vehicle: SavedVehicle; dark: boolean; onMakePrincipal: () => void }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const mark = MAKE_MARKS[markKey(vehicle.makeSlug)] ?? MAKE_MARKS[markKey(vehicle.makeName)];
  return (
    <View style={[styles.other, dark && styles.otherDark]} testID="garage-other">
      <View style={[styles.otherMark, rtl ? { left: -18 } : { right: -18 }]} pointerEvents="none">
        {mark ? <MarkGlyph mark={mark} size={96} color={dark ? Brand.white : Brand.navy900} /> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${vehicle.makeName} ${vehicle.modelName}, ${vehicle.engineName}`}
        onPress={() => router.push({ pathname: '/garage/vehicule/[engine]', params: { engine: vehicle.engineId } })}
        style={({ pressed }) => [styles.otherBody, pressed && { opacity: 0.8 }]}
      >
        <MakeLogo name={vehicle.makeName} slug={vehicle.makeSlug} size={36} lifted={false} />
        <Text style={[styles.otherName, dark && styles.onDark, align, { fontFamily: familyFor('headingStrong', rtl) }]} numberOfLines={2}>
          {vehicle.makeName} {vehicle.modelName}
        </Text>
        <Text style={[styles.otherEngine, dark && styles.onDarkMuted, align, { fontFamily: familyFor('body', rtl) }]} numberOfLines={1}>
          {ltr(vehicle.engineName)}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onMakePrincipal}
        style={({ pressed }) => [styles.otherMake, row, dark ? styles.otherMakeDark : null, pressed && { opacity: 0.7 }, { alignSelf: rtl ? 'flex-end' : 'flex-start' }]}
      >
        <Feather name="star" size={13} color={dark ? Brand.navy950 : Brand.white} />
        <Text style={[styles.otherMakeText, dark && { color: Brand.navy950 }, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.setPrincipal')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingTop: Spacing.two, gap: Spacing.four },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  flex: { flex: 1, minWidth: 0 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four, backgroundColor: C.background },
  centred: { textAlign: 'center' },
  wide: { alignSelf: 'stretch' },
  fullNote: { paddingHorizontal: Spacing.three },

  heroWrap: { borderRadius: 28, ...Elevation.lifted },
  hero: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: Spacing.four - 4,
    paddingBottom: Spacing.four - 4,
    backgroundColor: Brand.navy950,
  },
  photo: { position: 'absolute' },
  watermark: { position: 'absolute', top: 54, opacity: 0.07 },
  watermarkText: { width: 176, fontSize: 116, lineHeight: 176, textAlign: 'center', color: Brand.white },
  heroHead: { alignItems: 'center', gap: Spacing.two },
  kicker: { fontSize: 12, lineHeight: 16, letterSpacing: 1.6, color: Brand.navy300, textTransform: 'uppercase', flexShrink: 1 },
  tag: { alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Brand.gold500 },
  tagText: { fontSize: 11, lineHeight: 15, color: Brand.navy950 },
  name: { fontSize: 30, lineHeight: 35, letterSpacing: -0.4, color: Brand.white, marginTop: Spacing.three },
  fields: { gap: Spacing.four, flexWrap: 'wrap', marginTop: Spacing.two },
  field: { gap: 2 },
  fieldLabel: { fontSize: 10, lineHeight: 13, letterSpacing: 1.4, color: Brand.navy300, textTransform: 'uppercase' },
  fieldValue: { fontSize: 16, lineHeight: 21, color: Brand.white },
  actions: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three + 2 },
  cta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary + 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.gold500,
  },
  ctaText: { fontSize: 16, color: C.onAccent },
  info: {
    width: Tap.primary + 4,
    height: Tap.primary + 4,
    borderRadius: (Tap.primary + 4) / 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tiles: { gap: Spacing.two + 2 },
  tile: {
    flex: 1,
    minHeight: 118,
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 22,
    backgroundColor: C.surface,
  },
  tileDark: { backgroundColor: Brand.navy900 },
  tilePressed: { backgroundColor: C.surfacePressed },
  tileDarkPressed: { backgroundColor: Brand.navy800 },
  tileIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.white },
  tileIconDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  tileIconAccent: { backgroundColor: Brand.gold500 },
  tileWords: { gap: 2, alignSelf: 'stretch' },
  tileLabel: { fontSize: 13, lineHeight: 17, color: C.text },
  tileValue: { fontSize: 12, lineHeight: 16, color: C.textMuted },
  onDark: { color: Brand.white },
  onDarkMuted: { color: Brand.navy300 },
  disabled: { opacity: 0.45 },

  sectionHead: { alignItems: 'center', justifyContent: 'space-between', marginBottom: -Spacing.two },
  section: { fontSize: 19, lineHeight: 25, color: C.text },
  seeAll: { alignItems: 'center', gap: 4, minHeight: Tap.min },
  rail: { gap: Spacing.two + 4, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  other: {
    width: 208,
    minHeight: 196,
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: C.border,
    ...Elevation.resting,
  },
  otherDark: { backgroundColor: Brand.navy900, borderColor: Brand.navy900 },
  otherMark: { position: 'absolute', top: -14, opacity: 0.07 },
  otherBody: { gap: Spacing.two },
  otherName: { fontSize: 17, lineHeight: 22, color: C.text },
  otherEngine: { fontSize: 13, lineHeight: 17, color: C.textMuted },
  otherMake: { alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: Radius.pill, backgroundColor: Brand.navy900 },
  otherMakeDark: { backgroundColor: Brand.gold500 },
  otherMakeText: { fontSize: 13, lineHeight: 17, color: Brand.white },
});
