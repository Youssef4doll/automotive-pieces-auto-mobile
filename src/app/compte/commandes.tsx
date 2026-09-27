import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ordersApi, type Order } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PartImage } from '@/components/ui/part-image';
import { PressScale } from '@/components/ui/press-scale';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { ParcelArt } from '@/illustrations/empty-art';
import { formatDate, formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useOrders, type PlacedOrder } from '@/store/orders';

/**
 * Mes commandes — led by what was bought, not by a reference number.
 *
 * A customer with three orders tells them apart by "the brake discs" and
 * "the oil", and by whether each has arrived. So a card shows the parts'
 * pictures, the first part's name, the order's live state, date and total;
 * the reference stays, small, for the phone call to the shop that quotes it.
 *
 * The states are read from the shop each time the screen opens (and on a
 * pull), with each order's own key. A card whose order cannot be read shows
 * what the phone remembers and no state — never a guessed one.
 */
export default function OrdersScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const orders = useOrders((s) => s.orders);
  const tokenFor = useOrders((s) => s.tokenFor);
  const refreshControl = usePullRefresh();

  const refs = orders.map((o) => o.ref).join(',');
  const load = useCallback(
    async (signal: AbortSignal) => {
      const out: Record<string, Order> = {};
      await Promise.all(
        refs
          .split(',')
          .filter(Boolean)
          .map(async (ref) => {
            const token = await tokenFor(ref);
            if (!token) return;
            try {
              out[ref] = await ordersApi.get(ref, token, signal);
            } catch {
              // This card keeps what the phone remembers.
            }
          }),
      );
      return out;
    },
    [refs, tokenFor],
  );
  const live = useLive(load);
  const details = live.status === 'loaded' ? live.data : null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} refreshControl={refreshControl}>
      <Stack.Screen options={{ title: t('account.orders') }} />
      <View style={styles.column}>
        {orders.length === 0 ? (
          <EmptyState art={<ParcelArt size={112} />} title={t('orders.emptyTitle')} body={t('orders.emptyBody')}>
            <Button label={t('orders.shop')} onPress={() => router.navigate('/catalogue')} />
          </EmptyState>
        ) : (
          orders.map((o) => (
            <OrderCard
              key={o.ref}
              order={o}
              detail={details?.[o.ref] ?? null}
              loading={live.status === 'loading'}
              onPress={() => router.push({ pathname: '/suivi/[ref]', params: { ref: o.ref } })}
            />
          ))
        )}
        <FindRow onPress={() => router.push('/compte/retrouver')} />
      </View>
    </ScrollView>
  );
}

function OrderCard({ order, detail, loading, onPress }: { order: PlacedOrder; detail: Order | null; loading: boolean; onPress: () => void }) {
  const { t, locale, rtl } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  const name = detail?.items[0]?.name ?? order.lead?.name ?? null;
  const families = detail ? detail.items.slice(0, 3).map((i) => i.familySlug) : (order.lead?.families ?? []);
  const lines = detail?.items.length ?? null;
  const more = lines !== null ? lines - 1 : 0;

  return (
    <PressScale accessibilityRole="button" accessibilityLabel={[name, order.ref].filter(Boolean).join(', ')} onPress={onPress} style={styles.card} scaleTo={0.98}>
      <View style={[row, styles.top]}>
        <Thumbs families={families} />
        <View style={styles.flex}>
          {name ? (
            <Text numberOfLines={2} style={[styles.name, align, { fontFamily: familyFor('bodySemi', rtl) }]}>
              {name}
            </Text>
          ) : loading ? (
            <Skeleton style={styles.nameSkeleton} />
          ) : (
            <Text style={[styles.name, align, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('done.items', { n: order.itemCount })}</Text>
          )}
          {more > 0 ? (
            <Text variant="hint" style={align}>
              {t('orders.more', { n: more })}
            </Text>
          ) : null}
          {detail ? <StatusPill status={detail.status} /> : null}
        </View>
        <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
      </View>
      <View style={[row, styles.foot]}>
        <View style={styles.flex}>
          <Text variant="hint" style={align}>
            {t('orders.placed', { date: formatDate(order.placedAt, locale) })}
          </Text>
          <Text style={[styles.ref, align, { fontFamily: familyFor('body', rtl) }]}>{t('orders.ref', { ref: order.ref })}</Text>
        </View>
        <Text style={[styles.total, { fontFamily: familyFor('headingStrong', rtl) }]}>{formatDT(order.total)}</Text>
      </View>
    </PressScale>
  );
}

/** Up to three parts' pictures, overlapping like a small stack of boxes. */
function Thumbs({ families }: { families: (string | null)[] }) {
  const shown = families.length ? families : [null];
  return (
    <View style={[styles.thumbs, { width: 64 + (shown.length - 1) * 14 }]}>
      {shown.map((f, i) => (
        <View key={i} style={[styles.thumb, { left: i * 14, zIndex: shown.length - i, transform: [{ scale: 1 - i * 0.08 }] }]}>
          {f ? <PartImage slug={f} size={52} /> : <Feather name="package" size={24} color={C.textMuted} />}
        </View>
      ))}
    </View>
  );
}

function FindRow({ onPress }: { onPress: () => void }) {
  const { t, rtl } = useI18n();
  return (
    <PressScale accessibilityRole="button" onPress={onPress} style={[styles.find, { flexDirection: rtl ? 'row-reverse' : 'row' }]} scaleTo={0.98}>
      <View style={styles.findIcon}>
        <Feather name="search" size={IconSize.medium} color={Brand.navy900} />
      </View>
      <View style={styles.flex}>
        <Text variant="body" tone={C.text} style={{ textAlign: rtl ? 'right' : 'left' }}>
          {t('account.find')}
        </Text>
        <Text variant="hint" style={{ textAlign: rtl ? 'right' : 'left' }}>
          {t('account.findWhy')}
        </Text>
      </View>
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.three },
  flex: { flex: 1, gap: 4 },
  card: {
    backgroundColor: C.background,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: Spacing.three,
    gap: Spacing.three,
    ...Elevation.resting,
  },
  top: { alignItems: 'center', gap: Spacing.three },
  name: { fontSize: 16, lineHeight: 21, color: C.text },
  nameSkeleton: { height: 18, width: '80%', borderRadius: 6 },
  foot: { alignItems: 'flex-end', gap: Spacing.three, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  ref: { fontSize: 12, lineHeight: 16, color: C.textMuted, letterSpacing: 0.2 },
  total: { fontSize: 18, lineHeight: 24, color: C.text },
  thumbs: { height: 64 },
  thumb: {
    position: 'absolute',
    top: 0,
    width: 64,
    height: 64,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  find: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.primary,
    paddingVertical: Spacing.two,
  },
  findIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
});
