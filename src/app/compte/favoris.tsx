import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Product } from '@/api/catalogue';
import { productApi } from '@/api/product';
import { ProductGrid } from '@/components/ui/product-grid';
import { ProductListSkeleton } from '@/components/ui/skeleton';
import { Empty, Failed } from '@/components/ui/states';
import { C, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { useFavourites } from '@/store/favourites';
import { useGarage } from '@/store/garage';

/**
 * Mes favoris — the hearted parts as ordinary product tiles.
 *
 * The phone remembers which parts, never their price (store/favourites), so
 * each one is read fresh from the shop here, judged against the car in the
 * garage like any list. A part the shop has since withdrawn is simply not
 * shown here.
 */
export default function FavouritesScreen() {
  const { t } = useI18n();
  const slugs = useFavourites((s) => s.items.map((f) => f.slug).join('|'));
  const engineId = useGarage((s) => s.active?.engineId);

  const load = useCallback(
    async (signal: AbortSignal): Promise<Product[]> => {
      if (!slugs) return [];
      const settled = await Promise.allSettled(slugs.split('|').map((slug) => productApi.bySlug(slug, engineId, signal)));
      const found = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      // Every read failed: that is the connection, not a list of withdrawn parts.
      if (found.length === 0 && settled.length > 0) {
        const first = settled[0];
        if (first.status === 'rejected') throw first.reason;
      }
      return found;
    },
    [slugs, engineId],
  );
  const products = useResource(load);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: t('look.favourites') }} />
      {!slugs ? (
        <Empty title={t('look.favEmpty')} body={t('look.favEmptyWhy')} />
      ) : products.status === 'loading' ? (
        <View style={styles.pad}>
          <ProductListSkeleton rows={3} />
        </View>
      ) : products.status === 'failed' ? (
        <Failed failure={products.failure} onRetry={products.retry} />
      ) : products.data.length === 0 ? (
        <Empty title={t('look.favEmpty')} body={t('look.favEmptyWhy')} />
      ) : (
        <ProductGrid products={products.data} header={<View style={styles.top} />} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  pad: { padding: Spacing.three },
  top: { height: Spacing.two },
});
