import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { vehiclesApi, yearRange, type Model } from '@/api/vehicles';
import { PickerScreen, type PickerItem } from '@/components/picker-screen';
import type { TrailStep } from '@/components/ui/chip';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';

/**
 * Step 2 — the model.
 *
 * The make's name and id travel in the route params rather than being fetched
 * again. They were on the row the customer just tapped, and re-reading the
 * makes list to find out what "renault" is called would be a request whose
 * answer is already on screen behind this one.
 *
 * The year range is the honest one: `yearRange` returns null when the shop
 * has not recorded the years, and a null renders no second line at all.
 */
export default function ModelsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { make, makeName, makeId, notice } = useLocalSearchParams<{
    make: string;
    makeName?: string;
    makeId?: string;
    /** Set by the VIN screen: "VIN reconnu : BMW. Choisissez le modèle." */
    notice?: string;
  }>();

  const load = useCallback((signal: AbortSignal) => vehiclesApi.models(make, signal), [make]);
  const resource = useResource(load);

  const toItems = useCallback(
    (models: Model[]): PickerItem[] =>
      models.map((model) => ({
        key: model.id,
        title: model.name,
        subtitle: yearRange(model, t('picker.since')),
        note: model.partCount > 0 ? t('picker.partCount', { n: model.partCount }) : null,
        haystack: model.name,
        onPress: () =>
          router.push({
            pathname: '/garage/ajouter/[make]/[model]',
            params: {
              make,
              model: model.slug,
              makeName: makeName ?? '',
              makeId: makeId ?? '',
              modelName: model.name,
              modelId: model.id,
            },
          }),
      })),
    [make, makeName, makeId, router, t],
  );

  const trail: TrailStep[] = [
    // The first step shows what was chosen, not what it asked, and goes back
    // to it. That is the breadcrumb doing two jobs at once.
    { label: makeName || t('picker.stepMake'), state: 'done', onPress: () => router.back() },
    { label: t('picker.stepModel'), state: 'current' },
    { label: t('picker.stepEngine'), state: 'upcoming' },
  ];

  return (
    <>
      {/* The make's name is the title — "Renault", not "Modèle". The customer
          has just chosen it and the header is where they check they did. */}
      <Stack.Screen options={{ title: makeName || t('picker.stepModel') }} />
      <PickerScreen
        trail={trail}
        heading={t('picker.chooseModel')}
        resource={resource}
        toItems={toItems}
        emptyTitle={t('picker.noModels')}
        emptyBody={t('picker.missingData')}
        footer={t('picker.missingData')}
        notice={notice}
      />
    </>
  );
}
