import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { engineDetail, vehiclesApi, type Engine } from '@/api/vehicles';
import { PickerScreen, type PickerItem } from '@/components/picker-screen';
import { useResource } from '@/hooks/use-resource';
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
      });

      // Back to the garage, not forward to a confirmation. The customer came
      // here to tell the app their car; the proof that it worked is the car
      // sitting at the top of the garage marked active, which is the screen
      // they land on. `dismissTo` collapses the three picker screens so the
      // back gesture does not walk them through the flow again.
      router.dismissTo('/garage');
    },
    [add, isFull, isSaved, make, makeId, makeName, model, modelId, modelName, router, t],
  );

  const toItems = useCallback(
    (engines: Engine[]): PickerItem[] =>
      engines.map((engine) => ({
        key: engine.id,
        title: engine.name,
        subtitle: engineDetail(engine),
        note: isSaved(engine.id)
          ? t('picker.alreadySaved')
          : engine.partCount > 0
            ? t('picker.partCount', { n: engine.partCount })
            : null,
        haystack: [engine.name, engine.fuel, engine.engineCode].filter(Boolean).join(' '),
        onPress: () => choose(engine),
      })),
    // `vehicles` is in here on purpose: `isSaved` reads the store at call
    // time, so without it the "déjà dans votre garage" note would not appear
    // until the screen remounted.
    [choose, isSaved, t, vehicles],
  );

  return (
    <>
      <Stack.Screen options={{ title: modelName || t('picker.stepEngine') }} />
      <PickerScreen
        step={3}
        heading={t('picker.chooseEngine')}
        resource={resource}
        toItems={toItems}
        emptyTitle={t('picker.noEngines')}
        emptyBody={t('picker.missingData')}
        footer={t('picker.missingData')}
      />
    </>
  );
}
