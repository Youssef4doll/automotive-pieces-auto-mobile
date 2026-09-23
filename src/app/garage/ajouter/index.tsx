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
import { Border, C, familyFor, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { CarteGrise } from '@/illustrations/carte-grise';
import { CarProfile } from '@/illustrations/vehicle';
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
        heading={t('picker.chooseMake')}
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
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/garage/vin')}
        style={({ pressed }) => [styles.vin, row, pressed && styles.pressed]}
      >
        <CarteGrise width={56} compact />
        <View style={styles.flex}>
          <Text variant="rowTitle">{t('picker.orVin')}</Text>
          <Text variant="hint">{t('picker.orVinHint')}</Text>
        </View>
        <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
      </Pressable>

      {vehicles.length ? (
        <View style={styles.block}>
          <Text variant="label">{t('picker.yourVehicles')}</Text>
          {vehicles.map((v) => {
            const isActive = v.engineId === active?.engineId;
            return (
              <Pressable
                key={v.engineId}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => {
                  setActive(v.engineId);
                  router.dismissAll();
                }}
                style={({ pressed }) => [styles.saved, row, isActive && styles.savedActive, pressed && styles.pressed]}
              >
                <CarProfile width={56} />
                <View style={styles.flex}>
                  <Text variant="body" tone={C.text} numberOfLines={1}>
                    {`${v.makeName} ${v.modelName}`}
                  </Text>
                  <Text variant="hint" numberOfLines={1}>
                    {isActive ? `${v.engineName} · ${t('garage.primary')}` : v.engineName}
                  </Text>
                </View>
                {isActive ? <Feather name="check-circle" size={IconSize.medium} color={C.success} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {topMakes.length ? (
        <View style={styles.block}>
          <Text variant="label">{t('picker.topMakes')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.railBar}
            contentContainerStyle={[styles.rail, row]}
          >
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
                    <Text style={{ fontFamily: familyFor('headingStrong', false), fontSize: 17, lineHeight: 22, color: C.text }}>
                      {monogram(m.name)}
                    </Text>
                  )}
                </View>
                <Text variant="hint" tone={C.text} numberOfLines={1} style={styles.badgeName}>
                  {m.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Text variant="label">{t('picker.allMakes')}</Text>
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
  pressed: { backgroundColor: C.surface },
  vin: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  block: { gap: Spacing.two },
  saved: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.primary + Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  savedActive: {
    borderColor: C.successBorder,
    backgroundColor: C.successSurface,
  },
  // The rail bleeds to the screen edge so the next badge peeks — clipped at
  // the page gutter, eight badges looked like four and the row looked done.
  railBar: { flexGrow: 0, flexShrink: 0, marginHorizontal: -Spacing.three },
  rail: { gap: Spacing.two, paddingVertical: Spacing.one, paddingHorizontal: Spacing.three },
  badge: {
    width: 68,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radius.tile,
  },
  disc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 36, height: 36 },
  badgeName: { textAlign: 'center' },
});
