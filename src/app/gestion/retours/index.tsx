import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { staffApi, type ReturnFilter, type ReturnRow } from '@/api/staff';
import { FilterChips, staffStyles } from '@/components/staff/kit';
import { ReturnPill } from '@/components/staff/return-pill';
import { Empty, Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, C, Radius, Spacing } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useI18n } from '@/i18n/provider';
import { formatDate } from '@/lib/format';

const FILTERS = ['open', 'REQUESTED', 'APPROVED', 'RECEIVED', 'all'] as const satisfies readonly ReturnFilter[];
type Tab = (typeof FILTERS)[number];

/** Return requests, open ones first — the website's /admin/retours on a phone. */
export default function StaffReturns() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<Tab>((FILTERS as readonly string[]).includes(params.filter ?? '') ? (params.filter as Tab) : 'open');
  const load = useCallback((signal: AbortSignal) => staffApi.returns(filter, signal), [filter]);
  const list = useLive(load);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <View style={staffStyles.root}>
      <Stack.Screen options={{ title: t('staff.returns') }} />
      <View style={styles.head}>
        <FilterChips options={FILTERS.map((f) => ({ key: f, label: t(`staff.returns.tab.${f}`) }))} value={filter} onChange={setFilter} />
      </View>
      {list.status === 'loading' ? (
        <Loading />
      ) : list.status === 'failed' ? (
        <Failed failure={list.failure} onRetry={list.retry} />
      ) : list.data.returns.length === 0 ? (
        <Empty title={t('staff.returns.empty')} />
      ) : (
        <FlatList
          data={list.data.returns}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await list.refresh();
                setRefreshing(false);
              }}
            />
          }
          renderItem={({ item }) => <ReturnCard item={item} onPress={() => router.push({ pathname: '/gestion/retours/[id]', params: { id: item.id } })} />}
        />
      )}
    </View>
  );
}

function ReturnCard({ item, onPress }: { item: ReturnRow; onPress: () => void }) {
  const { t, rtl, locale } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.ref}, ${t(`returns.reason.${item.reason}`)}, ${t(`returns.status.${item.status}`)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[row, styles.top]}>
        <View style={styles.flex}>
          <Text variant="rowTitle" style={align}>
            {`${item.ref} · ${t(`returns.reason.${item.reason}`)}`}
          </Text>
          <Text variant="hint" numberOfLines={2} style={align}>
            {item.parts.join(', ')}
          </Text>
        </View>
        <ReturnPill status={item.status} />
      </View>
      <Text variant="hint" style={align}>
        {`${item.customerName} · ${item.orderRef} · ${formatDate(item.createdAt, locale)} · ${t('staff.returns.wishes', { wish: t(`returns.wish.${item.wish}`).toLowerCase() })}`}
      </Text>
      {item.cover === 'shop' && item.status === 'REQUESTED' ? (
        <Text variant="hint" tone={C.danger} style={[styles.strong, align]}>
          {t('returns.cover.shop')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { gap: 6, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: C.background, borderWidth: Border.hairline, borderColor: C.border },
  pressed: { backgroundColor: C.surfacePressed },
  top: { alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  strong: { fontWeight: '600' },
});
