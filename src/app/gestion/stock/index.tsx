import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { staffApi, type ProductRow, type StockFilter } from '@/api/staff';
import { FilterChips, Tag, staffStyles } from '@/components/staff/kit';
import { SearchBox } from '@/components/staff/search-box';
import { Button } from '@/components/ui/button';
import { PartImage } from '@/components/ui/part-image';
import { Empty, Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, Radius, Spacing } from '@/constants/theme';
import { usePages } from '@/hooks/use-pages';
import { useI18n } from '@/i18n/provider';
import { formatDT } from '@/lib/format';

const FILTERS: StockFilter[] = ['', 'rupture', 'bas', 'sansphoto', 'inactif'];

/** The stock room: the website's /admin/stock filters, newest first, searched by name or reference. */
export default function StaffStock() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ f?: string }>();
  const [f, setF] = useState<StockFilter>((FILTERS as string[]).includes(params.f ?? '') ? (params.f as StockFilter) : '');
  const [q, setQ] = useState('');

  const loadPage = useCallback(
    async (cursor: string | undefined, signal?: AbortSignal) => {
      const page = await staffApi.products({ f: f || undefined, q: q || undefined, cursor }, signal);
      return { items: page.products, next: page.next };
    },
    [f, q],
  );
  const { live, items, hasMore, loadingMore, loadMore } = usePages<ProductRow>(loadPage);

  return (
    <View style={staffStyles.root}>
      <Stack.Screen options={{ title: t('staff.menu.stock') }} />
      <View style={styles.head}>
        <SearchBox placeholder={t('staff.stock.search')} onSearch={setQ} />
        <FilterChips options={FILTERS.map((k) => ({ key: k, label: t(`staff.f.${k || 'all'}`) }))} value={f} onChange={setF} />
      </View>
      {live.status === 'loading' ? (
        <Loading />
      ) : live.status === 'failed' ? (
        <Failed failure={live.failure} onRetry={live.retry} />
      ) : items.length === 0 ? (
        <Empty title={t('staff.stock.none')} body={t('staff.stock.noneWhy')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => router.push({ pathname: '/gestion/stock/[id]', params: { id: item.id } })} />
          )}
          ListFooterComponent={hasMore ? <Button label={t('staff.more')} variant="secondary" onPress={loadMore} loading={loadingMore} /> : null}
        />
      )}
    </View>
  );
}

function ProductCard({ product, onPress }: { product: ProductRow; onPress: () => void }) {
  const { t, rtl } = useI18n();
  const out = product.stockQty <= 0;
  const low = !out && product.stockQty <= product.lowStockThreshold;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${t('staff.qtyN', { n: product.stockQty })}, ${formatDT(product.price)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
    >
      <View style={styles.thumb}>
        <PartImage slug={product.family} imageUrl={product.imageUrl} size={56} label={product.name} />
      </View>
      <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start', gap: 2 }]}>
        <Text variant="rowTitle" numberOfLines={2}>
          {product.name}
        </Text>
        <Text variant="hint" style={styles.ltr}>
          {[product.brand, product.sku].filter(Boolean).join(' · ')}
        </Text>
        <View style={[styles.tags, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <Tag label={t('staff.qtyN', { n: product.stockQty })} tone={out ? 'danger' : low ? 'caution' : 'muted'} />
          {!product.active ? <Tag label={t('staff.offline')} tone="danger" /> : null}
          {!product.imageUrl ? <Tag label={t('staff.f.sansphoto')} tone="muted" /> : null}
        </View>
      </View>
      <Text variant="rowTitle">{formatDT(product.price)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { padding: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.two, width: '100%', maxWidth: 720, alignSelf: 'center' },
  list: { padding: Spacing.three, paddingTop: 0, gap: Spacing.two, width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: Spacing.six },
  card: {
    backgroundColor: Brand.white,
    borderRadius: Radius.tile,
    borderWidth: Border.hairline,
    borderColor: C.border,
    padding: Spacing.three,
    gap: Spacing.three,
    alignItems: 'center',
  },
  thumb: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  tags: { flexWrap: 'wrap', gap: 6, marginTop: 4 },
  ltr: { writingDirection: 'ltr' },
  pressed: { opacity: 0.6 },
});
