import { FlatList, StyleSheet, View } from 'react-native';

import type { Product } from '@/api/catalogue';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { ProductTile } from './product-tile';

/**
 * Parts two to a row, the reference's product grid. A FlatList, so a family
 * of four hundred parts renders what is on screen and not the rest. An odd
 * last tile keeps its half width (an empty spacer takes the other half)
 * rather than stretching into a banner.
 *
 * Under Arabic the pair is reversed, so the first part sits on the right
 * where a right-to-left reader starts.
 */
export function ProductGrid({
  products,
  header,
  footer,
  onEndReached,
}: {
  products: Product[];
  header?: React.ReactElement | null;
  footer?: React.ReactElement | null;
  onEndReached?: () => void;
}) {
  const { rtl } = useI18n();
  const refreshControl = usePullRefresh();
  const rows: (Product | null)[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push([products[i], products[i + 1] ?? null]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(pair) => pair[0]!.id}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item: pair }) => (
        <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          {pair.map((p, i) => (p ? <ProductTile key={p.id} product={p} /> : <View key={`gap-${i}`} style={styles.spacer} />))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two, width: '100%', maxWidth: 800, alignSelf: 'center' },
  row: { gap: Spacing.two, alignItems: 'stretch' },
  spacer: { flex: 1 },
});
