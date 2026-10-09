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
 * A new car opens straight on its parts: the customer just told the app
 * their car, and the payback is the list judged against it. The garage sits
 * under it, so "back" lands there. Re-selecting a car already saved is a
 * switch, and goes to the garage. The ceiling is six cars; re-selecting one
 * already in the garage is always allowed.
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
      // On the next frame: pushed in the same tick as the dismiss, the parts
      // landed on top of the picker and "back" walked into it again.
      if (!already) requestAnimationFrame(() => router.push({ pathname: '/pieces-compatibles', params: { engine: engine.id } }));
      toast({
        message: t('look.saved', { car: `${car.makeName ?? ''} ${car.modelName ?? ''}`.trim() }),
        tone: 'success',
        ...(already
          ? { action: { label: t('home.seeCompatible'), onPress: () => router.push({ pathname: '/pieces-compatibles', params: { engine: engine.id } }) } }
          : {}),
      });
    },
    [add, isFull, isSaved, router, t, toast],
  );
}
