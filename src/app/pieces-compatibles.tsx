import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { productsApi, type ProductPage } from '@/api/catalogue';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ui/product-card';
import { Screen } from '@/components/ui/screen';
import { ProductListSkeleton } from '@/components/ui/skeleton';
import { Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, C, IconSize, Radius, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { EmptyBay } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage, vehicleLabel } from '@/store/garage';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { ltr } from '@/lib/format';

/**
 * What the shop has confirmed fits this car.
 *
 * The narrowest and most valuable list in the app, and the one that has to be
 * most careful about what it claims. Every row here has a real
 * `ProductFitment` joining that part to that engine — somebody at the shop
 * recorded it. Parts with no fitment data are not in this list, even though
 * plenty of them would fit, because "compatible avec votre véhicule" is a
 * promise and the database can only back it for the rows it actually holds.
 *
 * That makes the empty state the common one for now, and it is written to say
 * so plainly: not "aucun résultat", which reads as the shop having nothing,
 * but that fitment is recorded part by part and is still partial, with the
 * catalogue one tap away. `BRIEF.md` §8 calls thin fitment coverage out as
 * the honest state of the data; this screen is where a customer meets it, so
 * this is where it gets said rather than designed around.
 *
 * The engine arrives as a route param rather than being read from the store,
 * so the screen is about one specific car and survives the customer switching
 * the active vehicle in another tab while it is open. It falls back to the
 * active vehicle when opened without one.
 */
export default function CompatiblePartsScreen() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const { engine } = useLocalSearchParams<{ engine?: string }>();

  const active = useGarage((s) => s.active);
  const vehicles = useGarage((s) => s.vehicles);
  const hydrated = useGarage((s) => s.hydrated);

  const engineId = engine ?? active?.engineId;
  const vehicle = vehicles.find((v) => v.engineId === engineId) ?? active;

  const load = useCallback(
    (signal: AbortSignal) => {
      // The screen is never rendered without an engine (see the guard below);
      // this keeps `useResource`'s contract honest rather than firing a
      // request with "undefined" in the query string.
      const none: ProductPage = { products: [], total: 0, page: 1, perPage: 0, hasMore: false };
      if (!engineId) return Promise.resolve({ fits: none, likely: none });
      // Both lists at once: the confirmed parts, and the leads still to be
      // confirmed. Never merged — they are two different promises.
      return Promise.all([productsApi.fitsEngine(engineId, {}, signal), productsApi.likelyForEngine(engineId, signal)]).then(
        ([fits, likely]) => ({ fits, likely }),
      );
    },
    [engineId],
  );
  const parts = useResource(load);
  const refreshControl = usePullRefresh();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  // The shop's inbox, with the car attached by the request screen.
  const ask = () => router.push('/demande');

  // Opened with no car at all — from a deep link, or after the last vehicle
  // was removed while this screen sat in the stack. Send them to the picker
  // rather than showing an empty list that blames the catalogue.
  if (hydrated && !engineId) {
    return (
      <>
        <Stack.Screen options={{ title: t('fits.title') }} />
        <Screen edges={['left', 'right', 'bottom']} style={styles.centre}>
          <EmptyBay width={160} />
          <Text variant="sectionTitle" style={styles.centred}>
            {t('home.noVehicle')}
          </Text>
          <Text variant="hint" style={styles.centred}>
            {t('home.noVehicleWhy')}
          </Text>
          <Button label={t('home.chooseCar')} onPress={() => router.push('/garage/ajouter')} />
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('fits.title') }} />
      <Screen edges={['left', 'right', 'bottom']}>
        {parts.status === 'loading' ? (
          <View style={styles.body}>
            <ProductListSkeleton />
          </View>
        ) : parts.status === 'failed' ? (
          <Failed failure={parts.failure} onRetry={parts.retry} />
        ) : (
          <SectionList
            sections={[
              { key: 'fits', data: parts.data.fits.products },
              { key: 'likely', data: parts.data.likely.products },
            ].filter((section) => section.data.length > 0)}
            keyExtractor={(product) => product.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={Gap}
            ListHeaderComponent={
              <View style={styles.head}>
                {/* Which car this page answers for, and what it found — the
                    tick only when there is something confirmed to tick. */}
                {vehicle ? (
                  <View
                    style={[
                      styles.context,
                      { flexDirection: rtl ? 'row-reverse' : 'row' },
                      parts.data.fits.total > 0 ? styles.contextYes : styles.contextNeutral,
                    ]}
                  >
                    <Feather
                      name={parts.data.fits.total > 0 ? 'check-circle' : 'truck'}
                      size={IconSize.medium}
                      color={parts.data.fits.total > 0 ? C.success : C.textMuted}
                    />
                    <View style={styles.contextText}>
                      <Text variant="hint" tone={C.text} numberOfLines={2} style={align}>
                        {t('fits.forCar', { vehicle: ltr(vehicleLabel(vehicle) ?? '') })}
                      </Text>
                      <Text variant="hint" tone={C.textMuted} style={align}>
                        {`${t('fits.count', { n: parts.data.fits.total })} · ${t('fits.likelyCount', { n: parts.data.likely.total })}`}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {parts.data.fits.total === 0 && parts.data.likely.total === 0 ? (
                  <View style={styles.emptyBlock}>
                    <Text variant="sectionTitle" style={styles.centred}>
                      {t('fits.empty')}
                    </Text>
                    <Text variant="hint" style={styles.centred}>
                      {t('fits.emptyWhy')}
                    </Text>
                    <Button label={t('fits.ask')} icon="message-circle" onPress={ask} />
                    <Button label={t('fits.browse')} variant="secondary" onPress={() => router.dismissTo('/catalogue')} />
                  </View>
                ) : null}
              </View>
            }
            renderSectionHeader={({ section }) =>
              section.key === 'likely' ? (
                <View style={styles.likelyHead}>
                  <Text variant="sectionTitle" style={align}>
                    {t('fits.likelyTitle')}
                  </Text>
                  <Text variant="hint" style={align}>
                    {t('fits.likelyWhy')}
                  </Text>
                  <Button label={t('fits.ask')} icon="message-circle" variant="secondary" onPress={ask} />
                </View>
              ) : null
            }
            renderItem={({ item }) => <ProductCard product={item} />}
          />
        )}
      </Screen>
    </>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  head: { gap: Spacing.three, paddingBottom: Spacing.three },
  context: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
  },
  contextYes: { borderColor: C.successBorder, backgroundColor: C.successSurface },
  contextNeutral: { borderColor: C.border, backgroundColor: C.surface },
  likelyHead: { gap: Spacing.two, paddingTop: Spacing.five, paddingBottom: Spacing.three },
  contextText: { flex: 1 },
  body: { flex: 1, paddingTop: Spacing.three },
  list: { paddingTop: Spacing.three, paddingBottom: Spacing.six },
  gap: { height: Spacing.two },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  emptyBlock: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.five },
  centred: { textAlign: 'center' },
});
