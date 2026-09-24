import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { engineDetail, vehiclesApi, type Engine } from '@/api/vehicles';
import { PickerScreen, type PickerItem } from '@/components/picker-screen';
import type { TrailStep } from '@/components/ui/chip';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { useToast } from '@/store/toast';

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
 */
export default function EnginesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const add = useGarage((s) => s.add);
  const isSaved = useGarage((s) => s.isSaved);
  const isFull = useGarage((s) => s.isFull);
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

  const toast = useToast((st) => st.show);
  const choose = useCallback(
    (engine: Engine) => {
      const already = isSaved(engine.id);

      // The ceiling is six. Re-selecting a car already in the garage is
      // always allowed — it is how somebody switches between two cars — so
      // the check is only for a genuinely new one.
      if (!already && isFull()) {
        Alert.alert(t('garage.title'), t('garage.full'));
        return;
      }

      add({
        makeId: makeId ?? '',
        makeName: makeName ?? '',
        makeSlug: make,
        modelId: modelId ?? '',
        modelName: modelName ?? '',
        modelSlug: model,
        engineId: engine.id,
        engineName: engine.name,
        yearFrom: engine.yearFrom ?? null,
        yearTo: engine.yearTo ?? null,
      });

      // Back to the garage, not forward to a confirmation. The customer came
      // here to tell the app their car; the proof that it worked is the car
      // sitting at the top of the garage marked active, which is the screen
      // they land on. `dismissTo` collapses the three picker screens so the
      // back gesture does not walk them through the flow again.
      router.dismissTo('/garage');
      // Said once, with the obvious next step: the car is remembered, and
      // every part is now judged against it.
      toast({
        message: t('look.saved', { car: `${makeName ?? ''} ${modelName ?? ''}`.trim() }),
        tone: 'success',
        action: { label: t('home.seeCompatible'), onPress: () => router.push({ pathname: '/pieces-compatibles', params: { engine: engine.id } }) },
      });
    },
    [add, isFull, isSaved, make, makeId, makeName, model, modelId, modelName, router, t, toast],
  );

  const toItems = useCallback(
    (engines: Engine[]): PickerItem[] =>
      engines.map((engine) => ({
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
    [choose, isSaved, t, vehicles],
  );

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
      />
    </>
  );
}
