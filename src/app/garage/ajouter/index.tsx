import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { vehiclesApi, type Make } from '@/api/vehicles';
import { PickerScreen, type PickerItem } from '@/components/picker-screen';
import type { TrailStep } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, Elevation, familyFor, Radius, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useSvgId } from '@/hooks/use-svg-id';
import { CarteGrise } from '@/illustrations/carte-grise';
import { MakeLogo } from '@/components/ui/make-logo';
import { VehicleCard } from '@/components/ui/vehicle-card';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { Rail } from '@/components/ui/rail';

/** How many makes get a badge on the rail above the full list. */
const RAIL_SIZE = 8;

/**
 * Step 1 — the make.
 *
 * Every manufacturer the shop has vehicle data for, including the ones it
 * currently has no parts for. That is deliberate and it is the decision this
 * whole flow turns on: fitment coverage is thin, so a picker that listed only
 * makes with parts behind them would be a very short list, and a customer
 * whose car was missing from it would conclude the shop does not serve their
 * car rather than that this particular table is incomplete.
 *
 * First, before the step itself, the registration card, large: most
 * customers do not know their model's generation or their engine, and the
 * VIN on the card names the make — and for many cars the model and the
 * year — without their having to (the owner, October 2026: "the VIN decoder
 * first, as a big option"). Then "or choose it yourself", and the step.
 *
 * Above the list, two shortcuts, each only when it has something behind it:
 *
 *   the cars already in the garage, one tap to switch back to one;
 *
 *   a rail of round make badges — always there, above the registration
 *   card: the makes the shop has the most parts for first, then the ones it
 *   has the most models of (both real counts; nothing invented), so the rail
 *   is never empty just because fitment data is still thin — which is how it
 *   once disappeared on a live catalogue. A badge is the shop's uploaded logo when there is
 *   one, otherwise the make's real mark (illustrations/marques — there to
 *   say which car, the way every parts catalogue does), and initials only
 *   for a make nobody has a mark for.
 */
export default function MakesScreen() {
  const router = useRouter();
  const { t } = useI18n();

  const load = useCallback((signal: AbortSignal) => vehiclesApi.makes(signal), []);
  const resource = useResource(load);

  const open = useCallback(
    (make: Make) =>
      router.push({
        pathname: '/garage/ajouter/[make]',
        params: { make: make.slug, makeName: make.name, makeId: make.id },
      }),
    [router],
  );

  const toItems = useCallback(
    (makes: Make[]): PickerItem[] =>
      makes.map((make) => ({
        key: make.id,
        title: make.name,
        subtitle: t('picker.modelCount', { n: make.modelCount }),
        note: make.partCount > 0 ? t('picker.partCount', { n: make.partCount }) : null,
        haystack: make.name,
        leading: <MakeLogo name={make.name} slug={make.slug} logoUrl={make.logoUrl} size={40} lifted={false} />,
        onPress: () => open(make),
      })),
    [open, t],
  );

  const trail: TrailStep[] = [
    { label: t('picker.stepMake'), state: 'current' },
    { label: t('picker.stepModel'), state: 'upcoming' },
    { label: t('picker.stepEngine'), state: 'upcoming' },
  ];

  const topMakes = useMemo(
    () =>
      resource.status === 'loaded'
        ? [...resource.data]
            .sort((a, b) => b.partCount - a.partCount || b.modelCount - a.modelCount || a.name.localeCompare(b.name))
            .slice(0, RAIL_SIZE)
        : [],
    [resource],
  );

  return (
    <>
      <Stack.Screen options={{ title: t('home.chooseCar') }} />
      <PickerScreen
        trail={trail}
        heading={t('look.whichMake')}
        subtitle={t('look.pickerWhy')}
        filterPlaceholder={t('look.brandSearch')}
        alwaysFilter
        resource={resource}
        toItems={toItems}
        emptyTitle={t('picker.noMakes')}
        footer={t('picker.missingData')}
        header={<Shortcuts topMakes={topMakes} onMake={open} />}
        lead={<VinFirst />}
      />
    </>
  );
}

function Shortcuts({ topMakes, onMake }: { topMakes: Make[]; onMake: (make: Make) => void }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const vehicles = useGarage((s) => s.vehicles);
  const active = useGarage((s) => s.active);
  const setActive = useGarage((s) => s.setActive);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <>
      {topMakes.length ? (
        <Rail style={styles.railBar} contentContainerStyle={[styles.rail, row]}>
          {topMakes.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={m.partCount > 0 ? `${m.name}, ${t('picker.partCount', { n: m.partCount })}` : m.name}
              onPress={() => onMake(m)}
              style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
            >
              <MakeLogo name={m.name} slug={m.slug} logoUrl={m.logoUrl} size={60} />
              <Text variant="hint" tone={C.text} numberOfLines={1} style={styles.badgeName}>
                {m.name}
              </Text>
            </Pressable>
          ))}
        </Rail>
      ) : null}

      {vehicles.length ? (
        <View style={styles.block}>
          <Text style={[styles.section, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('look.recentVehicles')}</Text>
          {vehicles.map((v) => (
            <VehicleCard
              key={v.engineId}
              vehicle={v}
              principal={v.engineId === active?.engineId}
              compactArt
              onPress={() => {
                setActive(v.engineId);
                router.dismissAll();
              }}
            />
          ))}
        </View>
      ) : null}

      <Text style={[styles.section, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('picker.allMakes')}</Text>
    </>
  );
}

/**
 * The registration card as the first way in: the shop's navy, the drawing
 * of the card with the serial-number line, its title and the gold button —
 * no paragraph (the owner, October 2026). Under it, "or choose it
 * yourself" leads into the make step.
 */
function VinFirst() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const gradient = useSvgId('vinFirst');
  return (
    <View style={styles.vinWrap}>
      <View style={styles.vinCard} testID="vin-first">
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 340 240" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradient} x1={rtl ? '1' : '0'} y1="0" x2={rtl ? '0' : '1'} y2="1">
              <Stop offset="0" stopColor={Brand.navy700} />
              <Stop offset="1" stopColor={Brand.navy950} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={340} height={240} fill={`url(#${gradient})`} />
        </Svg>
        <View style={[row, styles.vinTop]}>
          <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.vinKicker, align, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.vinFirstKicker')}</Text>
            <Text style={[styles.vinTitle, align, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('look.vinFirstTitle')}</Text>
          </View>
          <View style={styles.vinArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <CarteGrise width={92} />
          </View>
        </View>
        <Button label={t('look.vinFirstCta')} icon="credit-card" onPress={() => router.push('/garage/vin')} />
      </View>
      <View style={[row, styles.orRow]}>
        <View style={styles.orLine} />
        <Text variant="hint" tone={C.textMuted}>
          {t('look.orPickMake')}
        </Text>
        <View style={styles.orLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
  section: { fontSize: 17, lineHeight: 23, color: C.text },
  vinWrap: { gap: Spacing.three },
  // Navy under the gradient too: the card is never white, whatever the SVG does.
  vinCard: { gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.card, overflow: 'hidden', backgroundColor: Brand.navy900, ...Elevation.resting },
  vinTop: { alignItems: 'center', gap: Spacing.three },
  vinKicker: { fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase', color: Brand.gold400 },
  vinTitle: { fontSize: 22, lineHeight: 28, color: Brand.white },
  // The card drawing on a white tile, as it is printed: white paper.
  vinArt: { padding: 6, borderRadius: Radius.tile, backgroundColor: Brand.white },
  orRow: { alignItems: 'center', gap: Spacing.two },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  block: { gap: Spacing.two },
  // The rail bleeds to the screen edge so the next badge peeks.
  railBar: { flexGrow: 0, flexShrink: 0, marginHorizontal: -Spacing.three },
  rail: { gap: Spacing.three, paddingVertical: Spacing.one, paddingHorizontal: Spacing.three },
  badge: { width: 72, alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.one, borderRadius: Radius.tile },
  disc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.resting,
  },
  logo: { width: 40, height: 40 },
  badgeName: { textAlign: 'center' },
});
