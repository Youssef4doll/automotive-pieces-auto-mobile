import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { productsApi } from '@/api/catalogue';
import { ordersApi } from '@/api/orders';
import { Brand, C, Elevation, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { formatDT, ltr } from '@/lib/format';
import { useGarage } from '@/store/garage';
import { useOrders } from '@/store/orders';
import { CareDueStrip } from './care-due';
import { ProductTile } from './product-tile';
import { Rail } from './rail';
import { StatusPill } from './status-pill';
import { Text } from './text';

/** An order is "in progress" for a month at most; after that it is history. */
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
const OPEN = new Set(['PENDING', 'CONFIRMED', 'PREPARED', 'SHIPPED']);
const SHELF = 8;
const recent = (placedAt: string) => Date.now() - new Date(placedAt).getTime() < RECENT_MS;

/**
 * The top of Home's white sheet, about the customer and nothing else: the
 * order on its way, then the car's own shelf. Each part shows only when
 * there is something real behind it — a recent order the shop says is still
 * moving, a date the owner typed coming up, a car in the garage — so a first
 * visit sees the Home it always had.
 */
export function HomeForYou() {
  return (
    <>
      <OrderOnItsWay />
      {/* What the owner's own dates say is coming up for the main car. */}
      <CareDueStrip />
      <ForYourCar />
    </>
  );
}

/** The latest order, while the shop says it is still moving. */
function OrderOnItsWay() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const latest = useOrders((s) => s.orders[0]);
  const tokenFor = useOrders((s) => s.tokenFor);
  const ref = latest?.ref ?? null;
  const placedAt = latest?.placedAt ?? null;

  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!ref || !placedAt || !recent(placedAt)) return null;
      const token = await tokenFor(ref);
      return token ? ordersApi.get(ref, token, signal) : null;
    },
    [ref, placedAt, tokenFor],
  );
  const live = useLive(load);
  const order = live.status === 'loaded' ? live.data : null;
  if (!order || !OPEN.has(order.status)) return null;

  const items = order.items.reduce((n, i) => n + i.qty, 0);
  return (
    <View style={styles.column}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('home.orderOnItsWay')}, ${order.ref}, ${t(`status.${order.status}`)}`}
        onPress={() => router.push({ pathname: '/suivi/[ref]', params: { ref: order.ref } })}
        style={({ pressed }) => [styles.order, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
      >
        <View style={styles.orderIcon}>
          <Feather name="package" size={IconSize.medium} color={Brand.navy950} />
        </View>
        <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start', gap: 4 }]}>
          <Text variant="hint">{t('home.orderOnItsWay')}</Text>
          <Text numberOfLines={1} style={[styles.orderTitle, { fontFamily: familyFor('bodySemi', rtl) }]}>
            {`${order.ref} · ${t('home.itemCount', { n: items })} · ${formatDT(order.total)}`}
          </Text>
          <StatusPill status={order.status} />
        </View>
        <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={C.textMuted} />
      </Pressable>
    </View>
  );
}

/**
 * "Pour votre Logan II": the parts the shop confirmed for the active car,
 * with both counts, and the way to all of them. With nothing confirmed yet
 * it says so and points at the ones to confirm, rather than going quiet.
 */
function ForYourCar() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const active = useGarage((s) => s.active);
  const engineId = active?.engineId;

  const load = useCallback(
    (signal: AbortSignal) =>
      engineId
        ? Promise.all([productsApi.fitsEngine(engineId, {}, signal), productsApi.likelyForEngine(engineId, signal)]).then(([fits, likely]) => ({ fits, likely }))
        : Promise.resolve(null),
    [engineId],
  );
  const shelf = useResource(load);
  if (!active || shelf.status !== 'loaded' || !shelf.data) return null;

  const { fits, likely } = shelf.data;
  const car = `${active.makeName} ${active.modelName}`;
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const open = () => router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } });
  const shown = (fits.total > 0 ? fits.products : likely.products).slice(0, SHELF);

  return (
    <View style={styles.block}>
      <View style={[styles.column, styles.head, row]}>
        <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.title, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]} numberOfLines={1}>
            {t('look.forVehicle', { car: ltr(car) })}
          </Text>
          <Text variant="hint">{`${t('fits.count', { n: fits.total })} · ${t('fits.likelyCount', { n: likely.total })}`}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={open} hitSlop={8} style={[styles.seeAll, row]}>
          <Text variant="hint" tone={C.text}>
            {t('catalog.seeAll')}
          </Text>
          <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
        </Pressable>
      </View>
      {shown.length > 0 ? (
        <Rail contentContainerStyle={[styles.rail, row]}>
          {shown.map((p) => (
            <View key={p.id} style={styles.tile}>
              <ProductTile product={p} />
            </View>
          ))}
        </Rail>
      ) : (
        <View style={styles.column}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/demande')} style={[styles.empty, row]}>
            <Feather name="message-circle" size={IconSize.medium} color={C.text} />
            <Text variant="hint" tone={C.text} style={styles.flex}>
              {t('fits.ask')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Home's own column and rail, so these line up with "Parcourir par famille".
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.85 },
  order: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: Brand.white,
    ...Elevation.resting,
  },
  orderIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.gold500, alignItems: 'center', justifyContent: 'center' },
  orderTitle: { fontSize: 15, lineHeight: 20, color: C.text },
  block: { marginTop: Spacing.four },
  head: { alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 20, lineHeight: 26, color: C.text },
  seeAll: { alignItems: 'center', gap: 4, minHeight: Tap.min, justifyContent: 'center' },
  rail: { gap: Spacing.two, paddingHorizontal: Spacing.four - 4, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  tile: { width: 172 },
  empty: { alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.tile, backgroundColor: C.surface, minHeight: Tap.min },
});
