import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { ordersApi, type Order, type OrderStatus } from '@/api/orders';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { QuestionThread } from '@/components/ui/question-thread';
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
import { DELIVERY_FLOW, PICKUP_FLOW, readyToCollect, statusNext, statusWord } from '@/lib/order-status';
import { useI18n } from '@/i18n/provider';
import { useCart } from '@/store/cart';
import { useOrders } from '@/store/orders';
import { useQuestions } from '@/store/questions';
import { useToast } from '@/store/toast';
import { track } from '@/services/analytics';
import { OrderNotify } from '@/components/ui/order-notify';
import { OrderRating } from '@/components/ui/order-rating';
import { OrderReturns } from '@/components/ui/order-returns';


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
  // The shop's own flow (website ORDER_STATUS_FLOW), without "Expédiée" for
  // an order collected in store (lib/order-status).
  const pickup = order.deliveryMethod === 'PICKUP';
  const FLOW = pickup ? PICKUP_FLOW : DELIVERY_FLOW;
  const reached = cancelled ? -1 : FLOW.indexOf(pickup && order.status === 'SHIPPED' ? 'PREPARED' : order.status);
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

  // An answer shown here is an answer read: "Mes questions" stops calling it new.
  useEffect(() => {
    for (const q of order.questions ?? []) if (q.repliedAt) useQuestions.getState().answered(q.id, q.repliedAt);
  }, [order.questions]);

  // Cancel, while the shop has not confirmed it yet (POST …/cancel).
  const tokenFor = useOrders((s) => s.tokenFor);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Locked on the first tap: a second POST would come back 409 "already not
  // pending" and tell the customer it was too late for a cancel that worked.
  const cancelBusy = useRef(false);
  const cancel = async () => {
    if (cancelBusy.current) return;
    cancelBusy.current = true;
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
      cancelBusy.current = false;
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
          <Text variant="sectionTitle">{t(statusWord(order.status, order.deliveryMethod))}</Text>
          <Text variant="body">{t(statusNext(order.status, order.deliveryMethod))}</Text>
          <Text variant="hint">{t('orders.ref', { ref: order.ref })}</Text>
        </View>

        {/* Waiting at the counter: where and when to come, in green. */}
        {readyToCollect(order.status, order.deliveryMethod) && settings.status === 'loaded' && settings.data.pickup ? (
          <View style={[styles.ready, row]}>
            <Feather name="map-pin" size={IconSize.large} color={C.success} />
            <View style={styles.flexText}>
              <Text variant="rowTitle" tone={C.success}>
                {t('checkout.pickupAt')}
              </Text>
              <Text variant="body" tone={C.text}>
                {[settings.data.pickup.address, settings.data.pickup.hours].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        ) : null}

        {!cancelled ? (
          <View style={styles.timeline} accessibilityRole="list">
            {FLOW.map((status, i) => {
              const done = i <= reached;
              const current = i === reached;
              const at = when(status);
              return (
                <View key={status} style={[styles.step, row, i === FLOW.length - 1 && styles.stepLast]} accessibilityLabel={`${t(statusWord(status, order.deliveryMethod))}${at ? `, ${formatDate(at, locale, true)}` : ''}`}>
                  <View style={styles.rail}>
                    <View style={[styles.node, done && styles.nodeDone, current && styles.nodeCurrent]}>
                      {done && !current ? <Feather name="check" size={12} color={C.textInverse} /> : null}
                    </View>
                    {i < FLOW.length - 1 ? <View style={[styles.link, i < reached && styles.linkDone]} /> : null}
                  </View>
                  <View style={[styles.stepText, i === FLOW.length - 1 && styles.stepTextLast]}>
                    <Text variant={current ? 'rowTitle' : 'body'} tone={done ? C.text : C.textFaint}>
                      {t(statusWord(status, order.deliveryMethod))}
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

        {/* A question about this order: asked in the app — always there,
            whatever the shop has published — with the answers under it; the
            shop's WhatsApp and phone when it has them; and, while nothing has
            started, a way out. */}
        <View style={styles.help} testID="order-questions">
          <Text variant="rowTitle">{t('track.help')}</Text>
          {order.questions?.map((q) => <QuestionThread key={q.id} q={q} />)}
          <Button
            label={t('track.askShop')}
            icon="message-square"
            variant={order.questions?.length ? 'secondary' : 'primary'}
            onPress={() => router.push({ pathname: '/demande', params: { order: order.ref } })}
          />
          <ShopContact message={t('track.whatsappMsg', { ref: order.ref })} from="order" />
        </View>
        {/* The way out, apart from the help and quieter than it: a red
            full-width button right under "WhatsApp" was one slip from a
            cancelled order. It still asks first (the sheet below). */}
        {order.status === 'PENDING' ? (
          <Pressable accessibilityRole="button" onPress={() => setConfirmCancel(true)} hitSlop={6} style={styles.cancelLink}>
            <Feather name="x-circle" size={IconSize.small} color={C.danger} />
            <Text variant="body" tone={C.danger} style={styles.cancelText}>
              {t('track.cancel')}
            </Text>
          </Pressable>
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
  ready: { alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: C.successSurface, borderWidth: Border.thin, borderColor: C.successBorder },
  cancelLink: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: Spacing.one, minHeight: Tap.min, paddingHorizontal: Spacing.three, marginTop: Spacing.four },
  cancelText: { textDecorationLine: 'underline' },
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
