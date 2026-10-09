import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { engineDetail, vehiclesApi, type Engine } from '@/api/vehicles';
import { PickerScreen, type PickerItem } from '@/components/picker-screen';
import type { TrailStep } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useSaveVehicle } from '@/hooks/use-save-vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * Step 3 — the motorisation, and the end of the flow.
 *
 * This is where the app learns the car. Everything downstream — the fitment
 * verdict on a product card, "pièces pour votre voiture", the reorder list —
 * hangs off the engine id chosen here, which is why the picker goes all the
 * way down to the engine instead of stopping at the model: two Clio IVs with
 * different engines take different filters, and a shop that answered at model
 * level would be confidently wrong rather than honestly unsure.
 *
 * The line under each engine is whatever the shop has actually recorded —
 * fuel, power, engine code, displacement — and nothing is inferred from the
 * engine's name. "1.5 dCi" implies 1461cc to anybody in the trade and the app
 * still will not print it, because the shop has not written it down.
 *
 * Most customers do not know their engine. Two helps above the tiles: the
 * fuel, as chips, when the model has more than one (everyone knows whether
 * they fill up with diesel) — and "Je ne connais pas ma motorisation", which
 * says where the card shows it and offers the VIN or the shop.
 */
export default function EnginesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const isSaved = useGarage((s) => s.isSaved);
  const vehicles = useGarage((s) => s.vehicles);

  const { make, model, makeName, makeId, modelName, modelId } = useLocalSearchParams<{
    make: string;
    model: string;
    makeName?: string;
    makeId?: string;
    modelName?: string;
    modelId?: string;
  }>();

  const load = useCallback(
    (signal: AbortSignal) => vehiclesApi.engines(make, model, signal),
    [make, model],
  );
  const resource = useResource(load);

  const save = useSaveVehicle();
  const choose = useCallback(
    (engine: Engine) => save({ make, makeId, makeName, model, modelId, modelName }, engine),
    [save, make, makeId, makeName, model, modelId, modelName],
  );

  // The fuels this model's engines come in, as the shop recorded them.
  const fuels = useMemo(
    () => (resource.status === 'loaded' ? [...new Set(resource.data.map((e) => e.fuel).filter((f): f is string => Boolean(f)))] : []),
    [resource],
  );
  const [fuel, setFuel] = useState<string | null>(null);

  const toItems = useCallback(
    (engines: Engine[]): PickerItem[] =>
      engines.filter((engine) => !fuel || engine.fuel === fuel).map((engine) => ({
        key: engine.id,
        title: engine.name,
        subtitle: engineDetail(engine),
        // A tile that is already in the garage says so instead of repeating
        // the part count — "déjà dans votre garage" is the more useful fact
        // at the moment of choosing, and the count is on the row behind it.
        note: isSaved(engine.id)
          ? t('picker.alreadySaved')
          : engine.partCount > 0
            ? t('picker.partCount', { n: engine.partCount })
            : null,
        marked: isSaved(engine.id),
        haystack: [engine.name, engine.fuel, engine.engineCode].filter(Boolean).join(' '),
        onPress: () => choose(engine),
      })),
    // `vehicles` is in here on purpose: `isSaved` reads the store at call
    // time, so without it the "déjà dans votre garage" note would not appear
    // until the screen remounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [choose, isSaved, t, vehicles, fuel],
  );

  const car = [makeName, modelName].filter(Boolean).join(' ');

  const trail: TrailStep[] = [
    // Two taps back, not one. `router.back()` twice would animate through
    // the model list; `dismissTo` goes straight there.
    {
      label: makeName || t('picker.stepMake'),
      state: 'done',
      onPress: () => router.dismissTo('/garage/ajouter'),
    },
    { label: modelName || t('picker.stepModel'), state: 'done', onPress: () => router.back() },
    { label: t('picker.stepEngine'), state: 'current' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: modelName || t('picker.stepEngine') }} />
      <PickerScreen
        trail={trail}
        heading={t('picker.chooseEngine')}
        // A grid, not a list. This is the last choice and the one the whole
        // app hangs off; there are rarely more than four, and they are
        // compared side by side rather than scanned down a column.
        layout="grid"
        resource={resource}
        toItems={toItems}
        emptyTitle={t('picker.noEngines')}
        emptyBody={t('picker.missingData')}
        footer={t('picker.missingData')}
        header={<EngineHelp fuels={fuels} fuel={fuel} onFuel={setFuel} car={car} />}
      />
    </>
  );
}

function EngineHelp({ fuels, fuel, onFuel, car }: { fuels: string[]; fuel: string | null; onFuel: (f: string | null) => void; car: string }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <View style={styles.help}>
      {fuels.length > 1 ? (
        <View style={[row, styles.chips]}>
          {[null, ...fuels].map((f) => {
            const on = fuel === f;
            return (
              <Pressable
                key={f ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => onFuel(f)}
                style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && !on && styles.chipPressed]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn, { fontFamily: familyFor('bodySemi', rtl) }]}>{f ?? t('picker.fuelAll')}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.unsure}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((v) => !v)}
          style={[row, styles.unsureHead]}
          testID="engine-help"
        >
          <Feather name="help-circle" size={IconSize.medium} color={C.text} />
          <Text style={[styles.unsureTitle, align, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('picker.engineHelp')}</Text>
          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={IconSize.medium} color={C.textMuted} />
        </Pressable>
        {open ? (
          <View style={styles.unsureBody}>
            <Text variant="hint" tone={C.textMuted} style={align}>
              {t('picker.engineHelpBody')}
            </Text>
            <View style={[row, styles.unsureActions]}>
              <Pressable accessibilityRole="button" onPress={() => router.push('/garage/vin')} style={({ pressed }) => [row, styles.action, pressed && styles.chipPressed]}>
                <Feather name="credit-card" size={IconSize.small} color={C.text} />
                <Text style={[styles.actionText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('picker.engineByVin')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/demande', params: { photo: '1', q: t('picker.engineAskQ', { car }) } })}
                style={({ pressed }) => [row, styles.action, pressed && styles.chipPressed]}
              >
                <Feather name="message-square" size={IconSize.small} color={C.text} />
                <Text style={[styles.actionText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('picker.engineAskShop')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  help: { gap: Spacing.three },
  chips: { flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Tap.min / 2,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: Brand.navy900, borderColor: Brand.navy900 },
  chipPressed: { backgroundColor: C.surface },
  chipText: { fontSize: 15, lineHeight: 20, color: C.text },
  chipTextOn: { color: Brand.white },
  unsure: { borderRadius: Radius.card, backgroundColor: C.surface, overflow: 'hidden' },
  unsureHead: { alignItems: 'center', gap: Spacing.two, minHeight: Tap.min + 4, paddingHorizontal: Spacing.three },
  unsureTitle: { flex: 1, fontSize: 15, lineHeight: 20, color: C.text },
  unsureBody: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  unsureActions: { flexWrap: 'wrap', gap: Spacing.two },
  action: {
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Tap.min / 2,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  actionText: { fontSize: 14, lineHeight: 18, color: C.text },
});
