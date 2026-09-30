import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { productsApi, type ProductSort } from '@/api/catalogue';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/ui/product-grid';
import { ProductListSkeleton } from '@/components/ui/skeleton';
import { SortChip, SortSheet } from '@/components/ui/sort-sheet';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, Spacing } from '@/constants/theme';
import { useMoreProducts } from '@/hooks/use-more-products';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * One parts maker's parts, from a "Nos marques" tile — judged against the
 * car in the garage like every list, in the order the customer picks, and
 * all of them: the next page arrives as the end of the grid comes into view.
 */
export default function BrandScreen() {
  const { t, rtl } = useI18n();
  const { brand, brandName } = useLocalSearchParams<{ brand: string; brandName?: string }>();
  const engineId = useGarage((s) => s.active?.engineId);
  const [sort, setSort] = useState<ProductSort>('relevance');
  const [sorting, setSorting] = useState(false);
  const loadPage = useCallback(
    (page: number, signal: AbortSignal) => productsApi.ofBrand(brand, { engineId, sort, page }, signal),
    [brand, engineId, sort],
  );
  const load = useCallback((signal: AbortSignal) => loadPage(1, signal), [loadPage]);
  const products = useResource(load);
  const more = useMoreProducts(products, [brand, engineId, sort].join('|'), loadPage);
  const title = brandName || (products.status === 'loaded' && products.data.products[0]?.brand) || brand;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: String(title) }} />
      <SortSheet visible={sorting} sort={sort} onChoose={setSort} onClose={() => setSorting(false)} />
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
          products={more.products}
          onEndReached={more.loadMore}
          header={
            <View style={[styles.head, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              <Text variant="hint" tone={C.textMuted} style={styles.count}>
                {t('look.brandParts', { n: products.data.total })}
              </Text>
              <SortChip sort={sort} onPress={() => setSorting(true)} />
            </View>
          }
          footer={
            more.loadingMore ? (
              <View style={styles.more}>
                <ActivityIndicator color={C.textMuted} />
              </View>
            ) : more.failedMore ? (
              <View style={styles.more}>
                <Text variant="hint">{t('catalog.moreFailed')}</Text>
                <Button label={t('catalog.moreRetry')} variant="secondary" onPress={more.loadMore} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  pad: { padding: Spacing.three },
  head: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingTop: Spacing.three, paddingBottom: Spacing.one },
  count: { flexShrink: 1 },
  more: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
});
