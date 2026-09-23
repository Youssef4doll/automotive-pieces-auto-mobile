import { Feather } from '@expo/vector-icons';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError, type ApiFailure } from '@/api/client';
import { justPlaced, ordersApi } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { OrderSummary } from '@/components/ui/order-summary';
import { StepIndicator } from '@/components/ui/step-indicator';
import { StickyBar } from '@/components/ui/sticky-bar';
import { Text } from '@/components/ui/text';
import { Border, C, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { quoteOf, useCartQuote } from '@/hooks/use-cart-quote';
import type { DictKey } from '@/i18n/dictionaries';
import { formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useCart } from '@/store/cart';
import { useCheckout } from '@/store/checkout';
import { useGarage, vehicleLabel } from '@/store/garage';
import { useOrders } from '@/store/orders';

/**
 * Commande, step 3 of 4: how to pay, and a last look.
 *
 * Cash on delivery is the only way to pay, so this step is not a choice
 * among one — it is the review: what is being bought, where it is going,
 * for which car, and the total the shop has just priced. The total on the
 * button is the shop's quote for this basket and this delivery method, the
 * same computation the order will run a second later.
 *
 * The order is sent once. The button is not pressable while it is in
 * flight, and a failure is never retried automatically: a retried POST is a
 * second parcel on a delivery van. A timeout in particular says the order
 * may have gone through, because it may have.
 */
export default function PaymentStep() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const details = useCheckout((s) => s.details);
  const settle = useCheckout((s) => s.settle);
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const active = useGarage((s) => s.active);
  const remember = useOrders((s) => s.remember);
  const { state, retry } = useCartQuote(details.deliveryMethod);
  const quote = quoteOf(state);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  if (items.length === 0 && !placing) return <Redirect href="/panier" />;

  const place = async () => {
    setError(null);
    setPlacing(true);
    try {
      const result = await ordersApi.place({
        customerName: details.customerName.trim(),
        phone: details.phone.trim(),
        email: details.email.trim() || undefined,
        governorate: details.governorate,
        address: details.deliveryMethod === 'DELIVERY' ? details.address.trim() : undefined,
        deliveryMethod: details.deliveryMethod,
        paymentMethod: 'COD',
        notes: details.notes.trim() || undefined,
        vehicleEngineId: active?.engineId,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      });
      // The key first, then everything that depends on the order existing.
      await remember(
        {
          ref: result.ref,
          placedAt: result.order.createdAt,
          total: result.order.total,
          itemCount: result.order.items.reduce((n, i) => n + i.qty, 0),
        },
        result.token,
      );
      justPlaced.set(result.ref, result.order);
      clearCart();
      settle();
      // Back to the tabs, then forward to the confirmation: the stack ends up
      // [tabs, confirmation], so "back" from it lands in the app rather than
      // on a payment step for a basket that no longer exists.
      router.dismissAll();
      router.push({ pathname: '/commande/confirmation/[ref]', params: { ref: result.ref } });
    } catch (err) {
      setError(messageFor(err instanceof ApiError ? err.failure : { kind: 'offline' }));
      setPlacing(false);
    }
  };

  const canPlace = state.status === 'loaded' && !state.data.blocked && !placing;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: t('checkout.stepPayment') }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <StepIndicator
            steps={[t('checkout.stepCart'), t('checkout.stepDelivery'), t('checkout.stepPayment'), t('checkout.stepDone')]}
            current={2}
          />

          <View style={styles.head}>
            <Text variant="sectionTitle">{t('checkout.paymentTitle')}</Text>
          </View>
          <View style={[styles.card, styles.cardSelected, row]} accessibilityRole="radio" accessibilityState={{ checked: true }}>
            <Feather name="dollar-sign" size={IconSize.large} color={C.text} />
            <View style={styles.flex}>
              <Text variant="rowTitle">{t('checkout.cod')}</Text>
              <Text variant="hint">{t('checkout.codWhy')}</Text>
            </View>
            <Feather name="check-circle" size={IconSize.large} color={C.success} />
          </View>

          <View style={styles.head}>
            <Text variant="sectionTitle">{t('checkout.summary')}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityHint={t('common.edit')}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.card, row, pressed && styles.pressed]}
          >
            <Feather name={details.deliveryMethod === 'PICKUP' ? 'home' : 'map-pin'} size={IconSize.large} color={C.textMuted} />
            <View style={styles.flex}>
              <Text variant="hint">{t(details.deliveryMethod === 'PICKUP' ? 'checkout.pickupAt' : 'checkout.deliverTo')}</Text>
              <Text variant="body" tone={C.text}>
                {details.customerName.trim()}
              </Text>
              <Text variant="body">{details.phone.trim()}</Text>
              {details.deliveryMethod === 'DELIVERY' ? (
                <Text variant="body">{`${details.address.trim()}, ${details.governorate}`}</Text>
              ) : null}
            </View>
            <Text variant="hint" tone={C.text}>
              {t('common.edit')}
            </Text>
          </Pressable>

          {active ? (
            <View style={[styles.card, row]}>
              <Feather name="tool" size={IconSize.large} color={C.textMuted} />
              <Text variant="body" style={styles.flex}>
                {t('checkout.forVehicle', { vehicle: vehicleLabel(active) ?? '' })}
              </Text>
            </View>
          ) : null}

          <View style={styles.lines}>
            {items.map((i) => {
              const line = quote?.lines.find((l) => l.productId === i.productId);
              return (
                <View key={i.productId} style={[styles.lineRow, row]}>
                  <Text variant="body" tone={C.text} style={styles.flex} numberOfLines={2}>
                    {`${i.qty} × ${line?.product?.name ?? i.name}`}
                  </Text>
                  <Text variant="body">{line ? formatDT(line.lineTotal) : '—'}</Text>
                </View>
              );
            })}
          </View>

          {quote ? (
            <OrderSummary
              subtotal={quote.subtotal}
              deliveryFee={quote.deliveryFee}
              stampDuty={quote.stampDuty}
              total={quote.total}
              deliveryLabel={t(details.deliveryMethod === 'PICKUP' ? 'checkout.pickup' : 'cart.deliveryHome')}
              stale={state.status === 'loading'}
            />
          ) : null}

          {state.status === 'failed' ? (
            <View style={styles.notice}>
              <Text variant="hint" tone={C.danger}>
                {t('cart.quoteFailed')}
              </Text>
              <Button label={t('state.retry')} variant="secondary" onPress={retry} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <StickyBar>
        {error ? (
          <Text variant="hint" tone={C.danger} accessibilityLiveRegion="assertive">
            {t(error)}
          </Text>
        ) : null}
        <Button
          label={quote ? `${t('checkout.place')} · ${formatDT(quote.total)}` : t('checkout.place')}
          onPress={place}
          disabled={!canPlace}
          loading={placing || state.status === 'loading'}
        />
      </StickyBar>
    </View>
  );
}

/** Whose problem it is, in the customer's words — and whether it may have gone through. */
function messageFor(failure: ApiFailure): DictKey {
  switch (failure.kind) {
    case 'invalid':
      return failure.field === 'customerName'
        ? 'checkout.err.customerName'
        : failure.field === 'phone'
          ? 'checkout.err.phone'
          : failure.field === 'email'
            ? 'checkout.err.email'
            : failure.field === 'address'
              ? 'checkout.err.address'
              : failure.field === 'governorate'
                ? 'checkout.err.governorate'
                : 'checkout.err.form';
    case 'unavailable':
      return 'checkout.err.unavailable';
    case 'rateLimited':
      return 'checkout.err.rateLimited';
    case 'offline':
      return 'checkout.err.offline';
    case 'timeout':
      return 'checkout.err.timeout';
    default:
      return 'checkout.err.server';
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.five },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  flex: { flex: 1, gap: 2 },
  head: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    minHeight: Tap.primary,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  cardSelected: {
    borderWidth: Border.selected,
    borderColor: C.text,
    backgroundColor: C.surface,
  },
  pressed: { backgroundColor: C.surface },
  lines: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  lineRow: {
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  notice: { gap: Spacing.two },
});
