import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { productsApi } from '@/api/catalogue';
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
      if (!engineId) return Promise.resolve({ products: [], total: 0, page: 1, perPage: 0, hasMore: false });
      return productsApi.fitsEngine(engineId, {}, signal);
    },
    [engineId],
  );
  const parts = useResource(load);

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
        {/* Which car this page is answering for. Without it a list of two
            brake pads is just a list of two brake pads. */}
        {vehicle ? (
          <View style={[styles.context, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <Feather name="check-circle" size={IconSize.medium} color={C.success} />
            <Text variant="hint" tone={C.text} style={styles.contextText} numberOfLines={2}>
              {t('fits.for', { vehicle: vehicleLabel(vehicle) ?? '' })}
            </Text>
          </View>
        ) : null}

        {parts.status === 'loading' ? (
          <View style={styles.body}>
            <ProductListSkeleton />
          </View>
        ) : parts.status === 'failed' ? (
          <Failed failure={parts.failure} onRetry={parts.retry} />
        ) : parts.data.products.length === 0 ? (
          <View style={styles.centre}>
            <Text variant="sectionTitle" style={styles.centred}>
              {t('fits.empty')}
            </Text>
            <Text variant="hint" style={styles.centred}>
              {t('fits.emptyWhy')}
            </Text>
            <Button
              label={t('fits.browse')}
              variant="secondary"
              onPress={() => router.dismissTo('/catalogue')}
            />
          </View>
        ) : (
          <FlatList
            data={parts.data.products}
            keyExtractor={(product) => product.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={Gap}
            ListHeaderComponent={
              <Text variant="hint" tone={C.textMuted} style={styles.count}>
                {t('fits.count', { n: parts.data.total })}
              </Text>
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
  context: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.successBorder,
    backgroundColor: C.successSurface,
  },
  contextText: { flex: 1 },
  body: { flex: 1, paddingTop: Spacing.three },
  list: { paddingTop: Spacing.three, paddingBottom: Spacing.six },
  count: { paddingBottom: Spacing.two },
  gap: { height: Spacing.two },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  centred: { textAlign: 'center' },
});
