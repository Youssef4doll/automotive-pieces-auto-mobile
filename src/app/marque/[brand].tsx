import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { productsApi } from '@/api/catalogue';
import { ProductGrid } from '@/components/ui/product-grid';
import { ProductListSkeleton } from '@/components/ui/skeleton';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/** One parts maker's parts, from a "Nos marques" tile — judged against the car in the garage like every list. */
export default function BrandScreen() {
  const { t } = useI18n();
  const { brand, brandName } = useLocalSearchParams<{ brand: string; brandName?: string }>();
  const engineId = useGarage((s) => s.active?.engineId);
  const load = useCallback((signal: AbortSignal) => productsApi.ofBrand(brand, { engineId }, signal), [brand, engineId]);
  const products = useResource(load);
  const title = brandName || products.status === 'loaded' && products.data.products[0]?.brand || brand;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: String(title) }} />
      {products.status === 'loading' ? (
        <View style={styles.pad}>
          <ProductListSkeleton />
        </View>
      ) : products.status === 'failed' ? (
        <Failed failure={products.failure} onRetry={products.retry} />
      ) : products.data.products.length === 0 ? (
        <Empty title={t('catalog.empty')} body={t('catalog.emptyWhy')} />
      ) : (
        <ProductGrid
          products={products.data.products}
          header={
            <Text variant="hint" tone={C.textMuted} style={styles.count}>
              {t('look.brandParts', { n: products.data.total })}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  pad: { padding: Spacing.three },
  count: { paddingTop: Spacing.three },
});
