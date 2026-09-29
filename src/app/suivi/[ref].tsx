import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { ordersApi, type Order, type OrderStatus } from '@/api/orders';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { ShopContact } from '@/components/ui/shop-contact';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { arrivalWindow, sameDay } from '@/lib/arrival';
import { deliveryDelay } from '@/lib/checkout';
import { OrderSummary } from '@/components/ui/order-summary';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, C, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { PartImage } from '@/components/ui/part-image';
import { formatDate, formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useCart } from '@/store/cart';
import { useOrders } from '@/store/orders';
import { useToast } from '@/store/toast';
import { track } from '@/services/analytics';
import { OrderNotify } from '@/components/ui/order-notify';
import { OrderRating } from '@/components/ui/order-rating';
import { OrderReturns } from '@/components/ui/order-returns';

/** The shop's own status flow — see `ORDER_STATUS_FLOW` on the website. */
const FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARED', 'SHIPPED', 'DELIVERED'];

/**
 * Suivi — where is my order?
 *
 * Answered in the first line, in words, before any timeline: the status and
 * what happens next, the website's sentences. The timeline under it is built
 * from the shop's dated history rows. A step that has happened shows WHEN it
 * happened; a step that has not shows nothing — never an estimated date,
 * because the shop has not given one and a computed one would be a promise.
 *
 * Read with the token this phone holds for the order and nothing else. A
 * phone that has the reference but lost the token is told so and pointed at
 * the recovery form, rather than shown a bare "introuvable".
 */
export default function TrackingScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const tokenFor = useOrders((s) => s.tokenFor);

  const load = useCallback(
    async (signal: AbortSignal) => {
      const token = await tokenFor(ref);
      if (!token) throw new ApiError({ kind: 'unauthorized' }, 'no token on this phone');
      return ordersApi.get(ref, token, signal);
    },
    [ref, tokenFor],
  );
  const order = useResource(load);
  const status = order.status === 'loaded' ? order.data.status : null;
  // Back from "Retourner une pièce" (or anything else pushed over this
  // screen): read the order again, so a request just sent is on it.
  const focusedOnce = useRef(false);
  const reload = order.status === 'loaded' ? order.reload : null;
  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) reload?.();
      focusedOnce.current = true;
    }, [reload]),
  );
  useEffect(() => {
    if (status) track('order_viewed', { ref, status });
  }, [ref, status]);

  return (
    <>
      <Stack.Screen options={{ title: t('track.title') }} />
      {order.status === 'loading' ? (
        <Loading />
      ) : order.status === 'failed' ? (
        order.failure.kind === 'unauthorized' || order.failure.kind === 'notFound' ? (
          <View style={styles.noKey}>
            <Feather name="key" size={32} color={C.textMuted} />
            <Text variant="body" style={styles.centred}>
              {t(order.failure.kind === 'unauthorized' ? 'track.noKey' : 'track.notFound')}
            </Text>
            <Button label={t('account.find')} onPress={() => router.replace({ pathname: '/compte/retrouver', params: { ref } })} />
          </View>
        ) : (
          <Failed failure={order.failure} onRetry={order.retry} />
        )
      ) : (
        <Tracking order={order.data} onRefresh={order.reload} />
      )}
    </>
  );
}

function Tracking({ order, onRefresh }: { order: Order; onRefresh: () => void }) {
  const { t, locale, rtl } = useI18n();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const toast = useToast((s) => s.show);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const cancelled = order.status === 'CANCELLED';
  const reached = cancelled ? -1 : FLOW.indexOf(order.status);
  const when = (status: OrderStatus) => order.history.filter((h) => h.status === status).at(-1)?.at ?? null;

  const buyAgain = () => {
    let n = 0;
    for (const item of order.items) {
      if (!item.productId || !item.slug) continue;
      const ok = add(
        { id: item.productId, slug: item.slug, name: item.name, sku: item.sku, brand: null, familySlug: item.familySlug ?? '', imageUrl: null },
        item.qty,
      );
      if (ok) n += 1;
    }
    toast({
      message: t('track.buyAgainDone', { n }),
      action: { label: t('product.viewCart'), onPress: () => router.navigate('/panier') },
    });
  };
  const canBuyAgain = order.items.some((i) => i.slug);

  // Cancel, while the shop has not confirmed it yet (POST …/cancel).
  const tokenFor = useOrders((s) => s.tokenFor);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const cancel = async () => {
    setCancelling(true);
    try {
      const token = await tokenFor(order.ref);
      if (token) await ordersApi.cancel(order.ref, token);
      track('order_cancelled', { ref: order.ref });
      toast({ message: t('track.cancelled'), tone: 'neutral' });
    } catch (err) {
      // 409 "unavailable / not_pending": the shop confirmed it in the meantime.
      const notPending = err instanceof ApiError && err.failure.kind === 'server' && err.failure.status === 409;
      toast({ message: t(notPending ? 'track.cancelTooLate' : 'track.cancelFailed'), tone: 'neutral' });
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
      onRefresh();
    }
  };

  // When it should arrive: the shop's delay for this governorate, counted
  // from the moment it was really marked shipped (lib/arrival). Before
  // shipping, the delay itself; for pickup, nothing.
  const settings = useShopSettings();
  const delay = settings.status === 'loaded' && order.deliveryMethod === 'DELIVERY' ? deliveryDelay(settings.data, order.governorate) : null;
  const shippedAt = when('SHIPPED');
  const window = order.status === 'SHIPPED' && shippedAt ? arrivalWindow(shippedAt, delay) : null;
  const arrivalLine = window
    ? sameDay(window.from, window.to)
      ? t('track.arrivesOn', { date: formatDate(window.from.toISOString(), locale) })
      : t('track.arrivesBetween', { from: formatDate(window.from.toISOString(), locale), to: formatDate(window.to.toISOString(), locale) })
    : delay && (order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'PREPARED')
      ? t('track.deliversIn', { delay })
      : null;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
    >
      <View style={styles.column}>
        <View style={[styles.statusCard, cancelled && styles.statusCancelled]}>
          <Text variant="label">{t('track.placedOn', { date: formatDate(order.createdAt, locale) })}</Text>
          <Text variant="sectionTitle">{t(`status.${order.status}`)}</Text>
          <Text variant="body">{t(`next.${order.status}`)}</Text>
          <Text variant="hint">{t('orders.ref', { ref: order.ref })}</Text>
        </View>

        {!cancelled ? (
          <View style={styles.timeline} accessibilityRole="list">
            {FLOW.map((status, i) => {
              const done = i <= reached;
              const current = i === reached;
              const at = when(status);
              return (
                <View key={status} style={[styles.step, row, i === FLOW.length - 1 && styles.stepLast]} accessibilityLabel={`${t(`status.${status}`)}${at ? `, ${formatDate(at, locale, true)}` : ''}`}>
                  <View style={styles.rail}>
                    <View style={[styles.node, done && styles.nodeDone, current && styles.nodeCurrent]}>
                      {done && !current ? <Feather name="check" size={12} color={C.textInverse} /> : null}
                    </View>
                    {i < FLOW.length - 1 ? <View style={[styles.link, i < reached && styles.linkDone]} /> : null}
                  </View>
                  <View style={[styles.stepText, i === FLOW.length - 1 && styles.stepTextLast]}>
                    <Text variant={current ? 'rowTitle' : 'body'} tone={done ? C.text : C.textFaint}>
                      {t(`status.${status}`)}
                    </Text>
                    {at ? <Text variant="hint">{formatDate(at, locale, true)}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {arrivalLine ? (
          <View style={[styles.arrival, row]}>
            <Feather name="truck" size={IconSize.medium} color={C.text} />
            <Text variant="body" tone={C.text} style={styles.flexText}>
              {arrivalLine}
            </Text>
          </View>
        ) : null}

        {/* Delivered: the customer's word on it, for the shop. Before that:
            the option to be told when it moves (phones with push only). */}
        <OrderRating order={order} onRated={onRefresh} />
        {/* Returns: each request and the shop's answers; the way to start one while a window is open. */}
        <OrderReturns order={order} onChanged={onRefresh} />
        {!cancelled && order.status !== 'DELIVERED' ? <OrderNotify orderRef={order.ref} /> : null}

        {/* A question about this order: the shop's channels, with the
            reference written in; and, while nothing has started, a way out. */}
        {!cancelled ? (
          <View style={styles.help}>
            <Text variant="rowTitle">{t('track.help')}</Text>
            <ShopContact message={t('track.whatsappMsg', { ref: order.ref })} from="order" />
            {order.status === 'PENDING' ? (
              <Button label={t('track.cancel')} variant="danger" onPress={() => setConfirmCancel(true)} />
            ) : null}
          </View>
        ) : null}

        <Text variant="sectionTitle" style={styles.sectionTitle}>
          {t('track.items')}
        </Text>
        <View style={styles.items}>
          {order.items.map((item) => (
            <Pressable
              key={`${item.sku}-${item.name}`}
              accessibilityRole={item.slug ? 'button' : undefined}
              disabled={!item.slug}
              onPress={() => item.slug && router.push({ pathname: '/produit/[slug]', params: { slug: item.slug } })}
              style={({ pressed }) => [styles.item, row, pressed && styles.pressed]}
            >
              <View style={styles.art}>
                {item.familySlug ? <PartImage slug={item.familySlug} size={34} /> : <Feather name="package" size={IconSize.large} color={C.textMuted} />}
              </View>
              <View style={styles.stepText}>
                <Text variant="body" tone={C.text} numberOfLines={2}>
                  {`${item.qty} × ${item.name}`}
                </Text>
                <Text variant="hint">
                  {item.slug ? item.sku : `${item.sku} · ${t('track.noLongerSold')}`}
                </Text>
              </View>
              <Text variant="body">{formatDT(item.lineTotal)}</Text>
            </Pressable>
          ))}
        </View>

        <Text variant="sectionTitle" style={styles.sectionTitle}>
          {t('track.delivery')}
        </Text>
        <View style={styles.card}>
          <Text variant="body" tone={C.text}>
            {t(order.deliveryMethod === 'PICKUP' ? 'checkout.pickup' : 'checkout.home')}
          </Text>
          <Text variant="body">{order.customerName}</Text>
          <Text variant="body">{order.phone}</Text>
          {order.address ? <Text variant="body">{`${order.address}, ${order.governorate}`}</Text> : null}
          {order.vehicleLabel ? <Text variant="hint">{t('checkout.forVehicle', { vehicle: order.vehicleLabel })}</Text> : null}
          <Text variant="hint">{t('checkout.cod')}</Text>
        </View>

        <Text variant="sectionTitle" style={styles.sectionTitle}>
          {t('track.amount')}
        </Text>
        <OrderSummary
          subtotal={order.subtotal}
          discount={order.discount ?? 0}
          promoCode={order.promoCode}
          deliveryFee={order.shippingFee}
          stampDuty={order.stampDuty}
          total={order.total}
          deliveryLabel={t(order.deliveryMethod === 'PICKUP' ? 'checkout.pickup' : 'cart.delivery')}
        />

        {canBuyAgain ? (
          <View style={styles.again}>
            <Button label={t('track.buyAgain')} variant="secondary" icon="rotate-cw" onPress={buyAgain} />
          </View>
        ) : null}
      </View>

      <BottomSheet visible={confirmCancel} onClose={() => setConfirmCancel(false)} title={t('track.cancelTitle')}>
        <View style={styles.sheet}>
          <Text variant="body">{t('track.cancelBody', { ref: order.ref })}</Text>
          <Button label={t('track.cancelConfirm')} variant="danger" loading={cancelling} onPress={() => void cancel()} />
          <Button label={t('track.cancelKeep')} variant="secondary" onPress={() => setConfirmCancel(false)} />
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

const NODE = 22;

const styles = StyleSheet.create({
  scroll: { paddingBottom: Spacing.six },
  arrival: { alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.tile, backgroundColor: C.surface, marginTop: Spacing.three },
  flexText: { flex: 1 },
  help: { gap: Spacing.two, marginTop: Spacing.four },
  sheet: { gap: Spacing.three, padding: Spacing.three },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  centred: { textAlign: 'center' },
  noKey: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  statusCard: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
  },
  statusCancelled: {
    backgroundColor: C.dangerSurface,
  },
  timeline: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  step: {
    gap: Spacing.three,
    minHeight: 56,
  },
  rail: {
    alignItems: 'center',
    width: NODE,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: {
    borderColor: C.surfaceBrand,
    backgroundColor: C.surfaceBrand,
  },
  nodeCurrent: {
    backgroundColor: C.accent,
  },
  link: {
    flex: 1,
    width: 2,
    backgroundColor: C.border,
    marginVertical: 2,
  },
  linkDone: {
    backgroundColor: C.surfaceBrand,
  },
  stepText: {
    flex: 1,
    gap: 2,
    paddingBottom: Spacing.three,
  },
  // The last step has no link below it to make room for.
  stepLast: { minHeight: 0 },
  stepTextLast: { paddingBottom: 0 },
  sectionTitle: {
    paddingTop: Spacing.three,
  },
  items: { gap: Spacing.one },
  item: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.primary,
    paddingVertical: Spacing.one,
    borderRadius: Radius.tile,
  },
  pressed: { backgroundColor: C.surface },
  art: {
    width: 44,
    height: 44,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    gap: 2,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  again: {
    paddingTop: Spacing.three,
  },
});
