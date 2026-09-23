import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { staffApi, type OrderRow, type OrderStatus } from '@/api/staff';
import { FilterChips, StatusPill, Tag, staffStyles } from '@/components/staff/kit';
import { SearchBox } from '@/components/staff/search-box';
import { Button } from '@/components/ui/button';
import { Empty, Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, Radius, Spacing } from '@/constants/theme';
import { usePages } from '@/hooks/use-pages';
import { useI18n } from '@/i18n/provider';
import { formatDate, formatDT } from '@/lib/format';

const STATUSES: ('' | OrderStatus)[] = ['', 'PENDING', 'CONFIRMED', 'PREPARED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

/** The order desk: the website's /admin/commandes, newest first, filtered by status and searched by ref, name or phone. */
export default function StaffOrders() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState<'' | OrderStatus>(
    (STATUSES as string[]).includes(params.status ?? '') ? (params.status as OrderStatus) : '',
  );
  const [q, setQ] = useState('');

  const loadPage = useCallback(
    async (cursor: string | undefined, signal?: AbortSignal) => {
      const page = await staffApi.orders({ status: status || undefined, q: q || undefined, cursor }, signal);
      return { items: page.orders, next: page.next };
    },
    [status, q],
  );
  const { live, items, hasMore, loadingMore, loadMore } = usePages<OrderRow>(loadPage);

  return (
    <View style={staffStyles.root}>
      <Stack.Screen options={{ title: t('staff.menu.orders') }} />
      <View style={styles.head}>
        <SearchBox placeholder={t('staff.orders.search')} onSearch={setQ} />
        <FilterChips
          options={STATUSES.map((s) => ({ key: s, label: s ? t(`status.${s}`) : t('staff.orders.all') }))}
          value={status}
          onChange={setStatus}
        />
      </View>
      {live.status === 'loading' ? (
        <Loading />
      ) : live.status === 'failed' ? (
        <Failed failure={live.failure} onRetry={live.retry} />
      ) : items.length === 0 ? (
        <Empty title={t('staff.orders.none')} body={t('staff.orders.noneWhy')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => router.push({ pathname: '/gestion/commandes/[id]', params: { id: item.id } })} />
          )}
          ListFooterComponent={
            hasMore ? <Button label={t('staff.more')} variant="secondary" onPress={loadMore} loading={loadingMore} /> : null
          }
        />
      )}
    </View>
  );
}

function OrderCard({ order, onPress }: { order: OrderRow; onPress: () => void }) {
  const { t, rtl, locale } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const end = { alignItems: rtl ? ('flex-start' as const) : ('flex-end' as const) };
  const start = { alignItems: rtl ? ('flex-end' as const) : ('flex-start' as const) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${order.ref}, ${order.customerName}, ${t(`status.${order.status}`)}, ${formatDT(order.total)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[row, styles.between]}>
        <View style={[styles.flex, start]}>
          <Text variant="rowTitle">{order.ref}</Text>
          <Text variant="body" numberOfLines={1}>
            {order.customerName}
          </Text>
        </View>
        <View style={[end, { gap: 4 }]}>
          <Text variant="rowTitle">{formatDT(order.total)}</Text>
          <StatusPill status={order.status} />
        </View>
      </View>
      <View style={[row, styles.meta]}>
        <Text variant="hint">{formatDate(order.createdAt, locale, true)}</Text>
        {order.lines ? <Text variant="hint">· {t('staff.linesN', { n: order.lines })}</Text> : null}
        {order.deliveryMethod ? (
          <Text variant="hint">· {order.deliveryMethod === 'PICKUP' ? t('staff.pickup') : order.governorate}</Text>
        ) : null}
        {order.hasBackorder ? <Tag label={t('staff.backorder')} /> : null}
      </View>
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
    gap: Spacing.two,
  },
  between: { gap: Spacing.three, alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
  meta: { flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  pressed: { opacity: 0.6 },
});
