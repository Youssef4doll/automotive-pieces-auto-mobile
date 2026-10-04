import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Product } from '@/api/catalogue';
import type { CartQuoteLine } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { CompatibilityBadge } from '@/components/ui/compatibility';
import { OrderSummary } from '@/components/ui/order-summary';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Loading } from '@/components/ui/states';
import { StickyBar } from '@/components/ui/sticky-bar';
import { Text } from '@/components/ui/text';
import { API_BASE_URL } from '@/constants/config';
import { Border, Brand, C, Elevation, familyFor, IconSize, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { quoteOf, useCartQuote } from '@/hooks/use-cart-quote';
import { PartImage } from '@/components/ui/part-image';
import { PromoField } from '@/components/ui/promo-field';
import { formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { MAX_QTY, useCart, type CartItem } from '@/store/cart';
import { track } from '@/services/analytics';
import { EmptyBasketArt } from '@/illustrations/empty-art';
import { catalogueApi } from '@/api/catalogue';
import { PressScale } from '@/components/ui/press-scale';
import { useResource } from '@/hooks/use-resource';
import { useGarage } from '@/store/garage';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';

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
  const tabBarSpace = useTabBarSpace();
  const { t, rtl } = useI18n();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const add = useCart((s) => s.add);
  const { state, retry, hydrated } = useCartQuote();
  const quote = quoteOf(state);
  const lines = items.length;
  useFocusEffect(
    useCallback(() => {
      track('view_cart', { lines });
    }, [lines]),
  );

  if (!hydrated) return <Loading />;

  if (items.length === 0) return <EmptyCart bottom={tabBarSpace} />;

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
              <FreeDelivery
                remaining={quote.remainingForFree}
                threshold={quote.freeShippingThreshold}
                subtotal={quote.subtotal - quote.discount}
                suggestion={stale ? null : quote.suggestion}
                onAdd={(p) => {
                  track('free_delivery_suggestion_added', { productId: p.id, gap: quote.remainingForFree });
                  add(p);
                }}
                onOpen={(p) => router.push({ pathname: '/produit/[slug]', params: { slug: p.slug } })}
              />
            ) : quote ? (
              <View style={[styles.freeDone, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                <Feather name="gift" size={IconSize.medium} color={C.success} />
                <Text variant="body" tone={C.success}>
                  {t('cart.freeEarned')}
                </Text>
              </View>
            ) : null}

            <PromoField quote={quote} stale={stale} />

            {quote ? (
              <OrderSummary
                subtotal={quote.subtotal}
                discount={quote.discount}
                promoCode={quote.promo?.code}
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
            <PartImage slug={family} size={40} />
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
 *
 * Under it, when the shop has one, a single part that closes the gap: one
 * the shop links to something in the basket, or one confirmed for the
 * customer's car, and on the shelf (see quoteAppCart). Never a random part to
 * make a number go up.
 */
function FreeDelivery({
  remaining,
  threshold,
  subtotal,
  suggestion,
  onAdd,
  onOpen,
}: {
  remaining: number;
  threshold: number;
  subtotal: number;
  suggestion: Product | null;
  onAdd: (p: Product) => void;
  onOpen: (p: Product) => void;
}) {
  const { t, rtl } = useI18n();
  const share = Math.max(0, Math.min(1, subtotal / threshold));
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
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
      {suggestion ? (
        <View style={styles.suggest}>
          <Text variant="hint" tone={C.text} style={{ textAlign: rtl ? 'right' : 'left' }}>
            {t('cart.suggest.title')}
          </Text>
          <View style={[row, styles.suggestRow]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpen(suggestion)}
              style={({ pressed }) => [row, styles.suggestOpen, pressed && styles.pressed]}
            >
              <View style={styles.suggestArt}>
                {suggestion.imageUrl ? (
                  <Image source={{ uri: `${API_BASE_URL}${suggestion.imageUrl}` }} style={styles.photo} contentFit="contain" />
                ) : (
                  <PartImage slug={suggestion.familySlug} size={32} />
                )}
              </View>
              <View style={styles.lineText}>
                <Text variant="body" tone={C.text} numberOfLines={2} style={{ textAlign: rtl ? 'right' : 'left' }}>
                  {suggestion.name}
                </Text>
                <Text variant="rowTitle" style={{ textAlign: rtl ? 'right' : 'left' }}>
                  {formatDT(suggestion.price)}
                </Text>
              </View>
            </Pressable>
            <Button label={t('cart.suggest.add')} icon="plus" variant="secondary" onPress={() => onAdd(suggestion)} />
          </View>
          {suggestion.fitment ? <CompatibilityBadge verdict={suggestion.fitment} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function Gap() {
  return <View style={{ height: Spacing.two }} />;
}

/**
 * The empty basket, as a place to start rather than a dead end.
 *
 * The drawing (an empty basket, two parts on their way in), what it is and
 * that it keeps what is put in it, the two ways in — then the shortcuts that
 * actually fill it: the parts the shop has confirmed for the car in the
 * garage, when there is one, and the four best-stocked families as round
 * drawings, one tap from their parts. All of it from what the shop holds;
 * nothing is suggested that it does not have.
 *
 * Laid out from the top, not centred: centred, it floated in the middle of a
 * tall phone with a hand's width of nothing above it.
 */
function EmptyCart({ bottom }: { bottom: number }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const active = useGarage((s) => s.active);
  const load = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(load);
  const top = families.status === 'loaded' ? [...families.data].sort((a, b) => b.productCount - a.productCount).slice(0, 4) : [];
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <ScrollView style={styles.emptyRoot} contentContainerStyle={[styles.emptyScroll, { paddingBottom: bottom }]}>
      <View style={styles.emptyColumn}>
        <View style={styles.emptyHero}>
          <EmptyBasketArt width={232} />
          <Text style={[styles.emptyTitle, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('cart.empty')}</Text>
          <Text variant="hint" style={styles.emptyWhy}>
            {t('cart.emptyWhy')}
          </Text>
        </View>

        <View style={styles.emptyActions}>
          <Button label={t('cart.browse')} icon="grid" onPress={() => router.navigate('/catalogue')} />
          <Button label={t('cart.search')} variant="secondary" icon="search" onPress={() => router.push('/recherche')} />
        </View>

        {active ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } })}
            style={({ pressed }) => [styles.forCar, row, pressed && styles.forCarPressed]}
          >
            <View style={styles.forCarIcon}>
              <Feather name="check-circle" size={IconSize.large} color={Brand.navy950} />
            </View>
            <View style={styles.flexText}>
              <Text variant="rowTitle" tone={Brand.white} numberOfLines={1}>
                {t('cart.forCar')}
              </Text>
              <Text variant="hint" tone={Brand.navy300} numberOfLines={1}>
                {`${active.makeName} ${active.modelName} · ${active.engineName}`}
              </Text>
            </View>
            <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={Brand.white} />
          </Pressable>
        ) : null}

        {top.length ? (
          <View style={styles.startCard}>
            <Text style={[styles.startTitle, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>
              {t('cart.startFamily')}
            </Text>
            <View style={[styles.startRow, row]}>
              {top.map((f) => (
                <PressScale
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.name}, ${t('catalog.partCount', { n: f.productCount })}`}
                  onPress={() => router.push({ pathname: '/famille/[family]', params: { family: f.slug, familyName: f.name } })}
                  style={styles.startCell}
                  scaleTo={0.94}
                >
                  <View style={styles.startDisc}>
                    <PartImage slug={f.slug} imageUrl={f.imageUrl} size={f.imageUrl ? 56 : 38} label={f.name} fit="cover" drawn />
                  </View>
                  <Text variant="hint" tone={C.text} numberOfLines={2} style={styles.startName}>
                    {f.name}
                  </Text>
                </PressScale>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
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
  emptyRoot: { flex: 1, backgroundColor: C.background },
  emptyScroll: { paddingTop: Spacing.three },
  emptyColumn: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.four },
  emptyHero: { alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: 22, lineHeight: 28, color: C.text, textAlign: 'center', marginTop: Spacing.two },
  emptyWhy: { textAlign: 'center', maxWidth: 300 },
  emptyActions: { gap: Spacing.two },
  forCar: { alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: Brand.navy950 },
  forCarPressed: { backgroundColor: Brand.navy900 },
  forCarIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.gold500, alignItems: 'center', justifyContent: 'center' },
  flexText: { flex: 1, minWidth: 0, gap: 2 },
  startCard: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card, borderWidth: Border.thin, borderColor: C.border, backgroundColor: Brand.white, ...Elevation.resting },
  startTitle: { fontSize: 17, lineHeight: 22, color: C.text },
  startRow: { justifyContent: 'space-between' },
  startCell: { width: '24%', alignItems: 'center', gap: 6 },
  startDisc: { width: 56, height: 56, borderRadius: 28, borderWidth: Border.thin, borderColor: C.border, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  startName: { textAlign: 'center', fontSize: 12, lineHeight: 15 },
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
  suggest: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: Border.hairline,
    borderTopColor: C.border,
  },
  suggestRow: { alignItems: 'center', gap: Spacing.two },
  suggestOpen: { flex: 1, alignItems: 'center', gap: Spacing.two, borderRadius: Radius.tile },
  suggestArt: {
    width: 44,
    height: 44,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeDone: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  notice: { gap: Spacing.two },
});
