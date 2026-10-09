import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import type { Engine } from '@/api/vehicles';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { useToast } from '@/store/toast';

export type CarOf = {
  make: string;
  makeId?: string;
  makeName?: string;
  model: string;
  modelId?: string;
  modelName?: string;
};

/**
 * Put a car in the garage from the engine the customer tapped — the end of
 * the picker, and of the VIN screen when the VIN named the model.
 *
 * Back to the garage with the car on it, and a toast that says so — no
 * list of parts pushed on top (the owner, October 2026). The ceiling is six
 * cars; re-selecting one already in the garage is always allowed.
 */
export function useSaveVehicle() {
  const router = useRouter();
  const { t } = useI18n();
  const add = useGarage((s) => s.add);
  const isSaved = useGarage((s) => s.isSaved);
  const isFull = useGarage((s) => s.isFull);
  const toast = useToast((st) => st.show);

  return useCallback(
    (car: CarOf, engine: Engine) => {
      const already = isSaved(engine.id);
      if (!already && isFull()) {
        Alert.alert(t('garage.title'), t('garage.full'));
        return;
      }

      add({
        makeId: car.makeId ?? '',
        makeName: car.makeName ?? '',
        makeSlug: car.make,
        modelId: car.modelId ?? '',
        modelName: car.modelName ?? '',
        modelSlug: car.model,
        engineId: engine.id,
        engineName: engine.name,
        yearFrom: engine.yearFrom ?? null,
        yearTo: engine.yearTo ?? null,
      });

      // `dismissTo` collapses the screens that led here first, so the back
      // gesture does not walk them through the flow again.
      router.dismissTo('/garage');
      toast({ message: t('look.saved', { car: `${car.makeName ?? ''} ${car.modelName ?? ''}`.trim() }), tone: 'success' });
    },
    [add, isFull, isSaved, router, t, toast],
  );
}
