import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { ordersApi, type Order, type OrderStatus } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { OrderSummary } from '@/components/ui/order-summary';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, C, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { PartArtwork } from '@/illustrations/parts';
import { formatDate, formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useCart } from '@/store/cart';
import { useOrders } from '@/store/orders';
import { useToast } from '@/store/toast';

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

  return (
    <>
      <Stack.Screen options={{ title: t('track.title', { ref }) }} />
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
                {item.familySlug ? <PartArtwork slug={item.familySlug} size={32} /> : <Feather name="package" size={IconSize.large} color={C.textMuted} />}
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
    </ScrollView>
  );
}

const NODE = 22;

const styles = StyleSheet.create({
  scroll: { paddingBottom: Spacing.six },
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
