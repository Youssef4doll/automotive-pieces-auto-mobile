import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { vehiclesApi, type Make } from '@/api/vehicles';
import { PickerScreen, type PickerItem } from '@/components/picker-screen';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';

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
 * The part count rides along on each row so the customer can see what is
 * behind a choice, and a make with none says so in words rather than showing
 * a bare "0".
 */
export default function MakesScreen() {
  const router = useRouter();
  const { t } = useI18n();

  const load = useCallback((signal: AbortSignal) => vehiclesApi.makes(signal), []);
  const resource = useResource(load);

  const toItems = useCallback(
    (makes: Make[]): PickerItem[] =>
      makes.map((make) => ({
        key: make.id,
        title: make.name,
        subtitle: t('picker.modelCount', { n: make.modelCount }),
        note: make.partCount > 0 ? t('picker.partCount', { n: make.partCount }) : null,
        haystack: make.name,
        onPress: () =>
          router.push({
            pathname: '/garage/ajouter/[make]',
            params: { make: make.slug, makeName: make.name, makeId: make.id },
          }),
      })),
    [router, t],
  );

  return (
    <>
      <Stack.Screen options={{ title: t('picker.stepMake') }} />
      <PickerScreen
        step={1}
        heading={t('picker.chooseMake')}
        resource={resource}
        toItems={toItems}
        emptyTitle={t('picker.noMakes')}
        footer={t('picker.missingData')}
      />
    </>
  );
}
