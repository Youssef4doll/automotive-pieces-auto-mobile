import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { vehiclesApi, type Make } from '@/api/vehicles';
import { PickerScreen, type PickerItem } from '@/components/picker-screen';
import type { TrailStep } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { API_BASE_URL } from '@/constants/config';
import { Border, C, Elevation, familyFor, IconSize, Radius, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { CarteGrise } from '@/illustrations/carte-grise';
import { VehicleCard } from '@/components/ui/vehicle-card';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

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
 * Above the list, three shortcuts, each only when it has something behind it:
 *
 *   the registration card, for a customer holding it — it names the make
 *   from the VIN and saves one step, and says that that is all it does;
 *
 *   the cars already in the garage, one tap to switch back to one;
 *
 *   a rail of the makes the shop has the most parts for, ranked by that real
 *   count and nothing else. A badge is the shop's uploaded logo when there is
 *   one and a monogram when there is not — the manufacturers' own marks are
 *   theirs, and the app does not ship copies of them.
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
        ? [...resource.data].filter((m) => m.partCount > 0).sort((a, b) => b.partCount - a.partCount).slice(0, RAIL_SIZE)
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.railBar} contentContainerStyle={[styles.rail, row]}>
          {topMakes.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`${m.name}, ${t('picker.partCount', { n: m.partCount })}`}
              onPress={() => onMake(m)}
              style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
            >
              <View style={styles.disc}>
                {m.logoUrl ? (
                  <Image source={{ uri: m.logoUrl.startsWith('http') ? m.logoUrl : `${API_BASE_URL}${m.logoUrl}` }} style={styles.logo} contentFit="contain" />
                ) : (
                  <Text style={{ fontFamily: familyFor('headingStrong', false), fontSize: 18, lineHeight: 22, color: C.text }}>{monogram(m.name)}</Text>
                )}
              </View>
              <Text variant="hint" tone={C.text} numberOfLines={1} style={styles.badgeName}>
                {m.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
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

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/garage/vin')}
        style={({ pressed }) => [styles.vin, row, pressed && styles.pressed]}
      >
        <View style={styles.vinIcon}>
          <CarteGrise width={44} compact />
        </View>
        <View style={styles.flex}>
          <Text variant="rowTitle">{t('look.scanCard')}</Text>
          <Text variant="hint">{t('look.scanCardWhy')}</Text>
        </View>
        <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
      </Pressable>

      <Text style={[styles.section, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('picker.allMakes')}</Text>
    </>
  );
}

/** "BMW" stays "BMW"; "Land Rover" becomes "LR"; "Citroën" becomes "CI". */
function monogram(name: string) {
  const words = name.split(/[\s-]+/).filter(Boolean);
  if (name.length <= 3) return name.toUpperCase();
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
  section: { fontSize: 17, lineHeight: 23, color: C.text },
  vin: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  vinIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
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
