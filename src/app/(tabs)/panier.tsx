import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import type { CartQuoteLine } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { CompatibilityBadge } from '@/components/ui/compatibility';
import { OrderSummary } from '@/components/ui/order-summary';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Loading } from '@/components/ui/states';
import { StickyBar } from '@/components/ui/sticky-bar';
import { Text } from '@/components/ui/text';
import { API_BASE_URL } from '@/constants/config';
import { Border, C, IconSize, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { quoteOf, useCartQuote } from '@/hooks/use-cart-quote';
import { PartArtwork } from '@/illustrations/parts';
import { formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { MAX_QTY, useCart, type CartItem } from '@/store/cart';

/**
 * Panier.
 *
 * The lines come from the phone; every number comes from the shop. The
 * basket is re-priced on each change by the same functions checkout charges
 * with, so the total here is the total on the order — the website learnt
 * that one the hard way, when its basket showed a "Total" that was not the
 * total.
 *
 * A part that has been withdrawn, or can no longer be sourced, stays in the
 * list with a sentence saying so, and checkout waits until it is removed.
 * Silently dropping it would leave a customer wondering where their brake
 * pads went.
 *
 * The free-delivery line is a real threshold from the shop's settings and a
 * real difference. It is information, never a countdown.
 */
export default function CartScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { state, retry, hydrated } = useCartQuote();
  const quote = quoteOf(state);

  if (!hydrated) return <Loading />;

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyArt}>
          <Feather name="shopping-bag" size={40} color={C.textMuted} />
        </View>
        <Text variant="sectionTitle" style={styles.centred}>
          {t('cart.empty')}
        </Text>
        <Text variant="hint" style={styles.centred}>
          {t('cart.emptyWhy')}
        </Text>
        <View style={styles.emptyActions}>
          <Button label={t('cart.browse')} onPress={() => router.navigate('/catalogue')} />
          <Button label={t('search.placeholder')} variant="secondary" icon="search" onPress={() => router.push('/recherche')} />
        </View>
      </View>
    );
  }

  const lineFor = (productId: string) => quote?.lines.find((l) => l.productId === productId) ?? null;
  const stale = state.status === 'loading';
  const canCheckout = state.status === 'loaded' && !state.data.blocked;
  const count = items.reduce((n, i) => n + i.qty, 0);

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Gap}
        ListHeaderComponent={
          <Text variant="hint" style={styles.count}>
            {t('cart.itemCount', { n: count })}
          </Text>
        }
        renderItem={({ item }) => (
          <Line
            item={item}
            line={lineFor(item.productId)}
            stale={stale}
            onQty={(q) => setQty(item.productId, q)}
            onRemove={() => remove(item.productId)}
            onOpen={item.slug ? () => router.push({ pathname: '/produit/[slug]', params: { slug: item.slug as string } }) : undefined}
          />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {quote && quote.remainingForFree > 0 ? (
              <FreeDelivery remaining={quote.remainingForFree} threshold={quote.freeShippingThreshold} subtotal={quote.subtotal} />
            ) : quote ? (
              <View style={[styles.freeDone, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                <Feather name="gift" size={IconSize.medium} color={C.success} />
                <Text variant="body" tone={C.success}>
                  {t('cart.freeEarned')}
                </Text>
              </View>
            ) : null}

            {quote ? (
              <OrderSummary
                subtotal={quote.subtotal}
                deliveryFee={quote.deliveryFee}
                stampDuty={quote.stampDuty}
                total={quote.total}
                deliveryLabel={t('cart.deliveryHome')}
                stale={stale}
              />
            ) : null}

            {state.status === 'failed' ? (
              <View style={styles.notice}>
                <Text variant="hint" tone={C.danger}>
                  {t('cart.quoteFailed')}
                </Text>
                <Button label={t('state.retry')} variant="secondary" onPress={retry} />
              </View>
            ) : state.status === 'loaded' && state.data.blocked ? (
              <Text variant="hint" tone={C.danger}>
                {t('cart.blocked')}
              </Text>
            ) : null}
          </View>
        }
      />

      <StickyBar inTabs>
        <Button
          label={quote ? `${t('cart.checkout')} · ${formatDT(quote.total)}` : t('cart.checkout')}
          onPress={() => router.push('/commande/livraison')}
          disabled={!canCheckout}
          loading={stale}
        />
      </StickyBar>
    </View>
  );
}

function Line({
  item,
  line,
  stale,
  onQty,
  onRemove,
  onOpen,
}: {
  item: CartItem;
  line: CartQuoteLine | null;
  stale: boolean;
  onQty: (qty: number) => void;
  onRemove: () => void;
  onOpen?: () => void;
}) {
  const { t, rtl } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  // The shop's current view of the part when there is one; the phone's
  // snapshot while there is not.
  const product = line?.product;
  const name = product?.name ?? item.name;
  const brand = product?.brand ?? item.brand;
  const image = product?.imageUrl ?? item.imageUrl;
  const family = product?.familySlug ?? item.familySlug;
  const problem = line && !line.buyable ? (line.product ? t('cart.lineUnavailable') : t('cart.lineGone')) : null;

  return (
    <View style={[styles.line, problem && styles.lineProblem]}>
      <Pressable
        accessibilityRole={onOpen ? 'button' : undefined}
        disabled={!onOpen}
        onPress={onOpen}
        style={({ pressed }) => [styles.lineTop, row, pressed && styles.pressed]}
      >
        <View style={styles.art}>
          {image ? (
            <Image source={{ uri: `${API_BASE_URL}${image}` }} style={styles.photo} contentFit="contain" />
          ) : family ? (
            <PartArtwork slug={family} size={36} />
          ) : (
            <Feather name="package" size={IconSize.large} color={C.textMuted} />
          )}
        </View>
        <View style={styles.lineText}>
          {brand ? <Text variant="label">{brand}</Text> : null}
          <Text variant="body" tone={C.text} numberOfLines={2}>
            {name}
          </Text>
          {product ? <CompatibilityBadge verdict={product.fitment} /> : null}
        </View>
      </Pressable>

      {problem ? (
        <View style={[styles.lineFoot, row]}>
          <Text variant="hint" tone={C.danger} style={styles.lineText}>
            {problem}
          </Text>
          <Button label={t('common.remove')} variant="secondary" onPress={onRemove} />
        </View>
      ) : (
        <>
          <View style={[styles.lineFoot, row]}>
            <QuantityStepper value={item.qty} onChange={onQty} onRemove={onRemove} max={MAX_QTY} size="compact" />
            <Text variant="rowTitle" style={stale && styles.staleText}>
              {line ? formatDT(line.lineTotal) : '—'}
            </Text>
          </View>
          {line?.backorder ? (
            <Text variant="hint" tone={C.caution}>
              {t('cart.backorder')}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * How far off free delivery is — a bar and a sentence, both from the shop's
 * own threshold. Shown only while there is a difference to make up.
 */
function FreeDelivery({ remaining, threshold, subtotal }: { remaining: number; threshold: number; subtotal: number }) {
  const { t, rtl } = useI18n();
  const share = Math.max(0, Math.min(1, subtotal / threshold));
  return (
    <View style={styles.free}>
      <View style={[styles.freeHead, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Feather name="truck" size={IconSize.medium} color={C.text} />
        <Text variant="hint" tone={C.text} style={styles.lineText}>
          {t('cart.toFree', { amount: formatDT(remaining) })}
        </Text>
      </View>
      <View style={[styles.track, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <View style={[styles.fill, { flex: share }]} />
        <View style={{ flex: 1 - share }} />
      </View>
    </View>
  );
}

function Gap() {
  return <View style={{ height: Spacing.two }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: Spacing.five,
  },
  count: { paddingBottom: Spacing.two },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    backgroundColor: C.background,
  },
  emptyArt: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyActions: {
    alignSelf: 'stretch',
    maxWidth: 360,
    width: '100%',
    marginTop: Spacing.three,
    gap: Spacing.two,
    alignItems: 'stretch',
  },
  centred: { textAlign: 'center' },
  line: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  lineProblem: {
    borderColor: '#f6d5d9',
    backgroundColor: C.dangerSurface,
  },
  lineTop: {
    gap: Spacing.three,
    borderRadius: Radius.tile,
  },
  pressed: { backgroundColor: C.surface },
  art: {
    width: 56,
    height: 56,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '80%', height: '80%' },
  lineText: { flex: 1, gap: 2 },
  lineFoot: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  staleText: { opacity: 0.55 },
  footer: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  free: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  freeHead: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.surface,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: C.accent,
    borderRadius: 3,
  },
  freeDone: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  notice: { gap: Spacing.two },
});
