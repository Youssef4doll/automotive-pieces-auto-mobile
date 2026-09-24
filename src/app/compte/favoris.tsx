import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Product } from '@/api/catalogue';
import { productApi } from '@/api/product';
import { ProductGrid } from '@/components/ui/product-grid';
import { ProductListSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { HeartIcon } from '@/illustrations/heart';
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
        <NoFavourites />
      ) : products.status === 'loading' ? (
        <View style={styles.pad}>
          <ProductListSkeleton rows={3} />
        </View>
      ) : products.status === 'failed' ? (
        <Failed failure={products.failure} onRetry={products.retry} />
      ) : products.data.length === 0 ? (
        <NoFavourites />
      ) : (
        <ProductGrid products={products.data} header={<View style={styles.top} />} />
      )}
    </View>
  );
}

/** What happened, and the one thing to do about it. */
function NoFavourites() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArt}>
        <HeartIcon filled size={44} />
      </View>
      <Text variant="sectionTitle" style={styles.centred}>
        {t('look.favEmpty')}
      </Text>
      <Text variant="body" tone={C.textMuted} style={styles.centred}>
        {t('look.favEmptyWhy')}
      </Text>
      <Button label={t('look.favBrowse')} onPress={() => router.navigate('/catalogue')} style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  emptyArt: { width: 104, height: 104, borderRadius: 52, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
  centred: { textAlign: 'center', maxWidth: 320 },
  cta: { alignSelf: 'stretch', maxWidth: 360, width: '100%' },
  root: { flex: 1, backgroundColor: C.surface },
  pad: { padding: Spacing.three },
  top: { height: Spacing.two },
});
