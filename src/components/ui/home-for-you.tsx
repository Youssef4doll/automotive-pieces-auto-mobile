import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { productsApi, type Product } from '@/api/catalogue';
import { ordersApi, type Order } from '@/api/orders';
import { productApi } from '@/api/product';
import { Brand, C, Elevation, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { fitState, FIT_LOOK } from '@/lib/fit';
import { formatDT, ltr } from '@/lib/format';
import { useAccount } from '@/store/account';
import { useGarage } from '@/store/garage';
import { useOrders } from '@/store/orders';
import { CareDueStrip } from './care-due';
import { PartImage } from './part-image';
import { PressScale } from './press-scale';
import { Rail } from './rail';
import { StatusPill } from './status-pill';
import { Text } from './text';

/** An order is "in progress" for a month at most; after that it is history. */
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;
const OPEN = new Set(['PENDING', 'CONFIRMED', 'PREPARED', 'SHIPPED']);
const SHELF = 10;
const recent = (placedAt: string) => Date.now() - new Date(placedAt).getTime() < RECENT_MS;

/**
 * "Youssef, voici pour vous" — the top of Home's white sheet, about the
 * customer and nothing else.
 *
 * The greeting uses the name on the account, or none. Under it, the car's
 * own shelf (the parts the shop confirmed for the active car, then the ones
 * to confirm), the order on its way, and what the owner's dates say is due.
 * Each shows only when there is something real behind it; with no car and
 * no order there is nothing to say "for you" about, and the section is not
 * drawn at all.
 */
export function HomeForYou() {
  const { t, rtl } = useI18n();
  const name = useAccount((s) => (s.status === 'signedIn' ? s.account?.name : null));
  const first = name?.trim().split(/\s+/)[0] || null;
  const active = useGarage((s) => s.active);
  const order = useOpenOrder();
  const [why, setWhy] = useState(false);
  if (!active && !order) return null;
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <View>
      <View style={[styles.column, styles.greetRow, row]}>
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={[styles.greet, styles.flex, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}
        >
          {first ? t('home.forYouNamed', { name: first }) : t('home.forYou')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.forYouWhyA11y')}
          accessibilityState={{ expanded: why }}
          onPress={() => setWhy((v) => !v)}
          hitSlop={6}
          style={({ pressed }) => [styles.info, pressed && styles.pressed]}
        >
          <Feather name="info" size={20} color={C.text} />
        </Pressable>
      </View>
      {why ? (
        <View style={styles.column}>
          <Text variant="hint" style={{ textAlign: rtl ? 'right' : 'left' }}>
            {t('home.forYouWhy')}
          </Text>
        </View>
      ) : null}

      {active ? <CarShelf /> : null}
      {order ? <OrderOnItsWay order={order} /> : null}
      <View style={styles.care}>
        <CareDueStrip />
      </View>
    </View>
  );
}

/** The latest order, while the shop says it is still moving. */
function useOpenOrder(): Order | null {
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
  return order && OPEN.has(order.status) ? order : null;
}

function OrderOnItsWay({ order }: { order: Order }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
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
 * The active car's shelf: what the shop confirmed for its engine first, then
 * the leads to confirm, each tile carrying its own verdict. With neither, it
 * says so and offers to ask the shop rather than going quiet.
 */
function CarShelf() {
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
  // The make is on the hero's car line just above; the model is enough here.
  const car = active.modelName;
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const open = () => router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } });
  const shown = [...fits.products, ...likely.products].slice(0, SHELF);
  // The confirmed count only: the leads ride in the rail with their own amber mark.
  const counts = fits.total > 0 ? t('home.confirmedShort', { n: fits.total }) : likely.total > 0 ? t('fits.likelyCount', { n: likely.total }) : null;

  return (
    <View>
      <View style={[styles.column, styles.subRow, row]}>
        <Text variant="hint" numberOfLines={1} style={[styles.flex, { textAlign: rtl ? 'right' : 'left' }]}>
          {[t('look.forVehicle', { car: ltr(car) }), counts].filter(Boolean).join(' · ')}
        </Text>
        {shown.length ? (
          <Pressable accessibilityRole="button" onPress={open} hitSlop={8} style={[styles.seeAll, row]}>
            <Text variant="hint" tone={C.text} style={styles.seeAllText}>
              {t('catalog.seeAll')}
            </Text>
            <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={16} color={C.text} />
          </Pressable>
        ) : null}
      </View>
      {shown.length > 0 ? (
        <Rail contentContainerStyle={[styles.rail, row]}>
          {shown.map((p) => (
            <PickTile key={p.id} product={p} />
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

/**
 * One part on the shelf, as the reference draws its picks: a rounded square
 * picture, the name under it, the price. The verdict rides on the picture's
 * corner as its own icon shape (a tick only for a confirmed fit), and is read
 * out in full.
 */
function PickTile({ product }: { product: Product }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const engineId = useGarage((s) => s.active?.engineId);
  const state = fitState(product);
  const look = state ? FIT_LOOK[state] : null;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={[product.brand, product.name, look ? t(look.short) : null, formatDT(product.price)].filter(Boolean).join(', ')}
      onPressIn={() => productApi.prefetch(product.slug, engineId)}
      onPress={() => router.push({ pathname: '/produit/[slug]', params: { slug: product.slug } })}
      style={styles.pick}
      scaleTo={0.96}
    >
      <View style={styles.pickArt}>
        <PartImage slug={product.familySlug} imageUrl={product.imageUrl} size={88} label={product.name} />
        {look ? (
          <View style={[styles.pickFit, rtl ? { right: 8 } : { left: 8 }]}>
            <Feather name={look.icon} size={14} color={look.iconTone} />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={[styles.pickName, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}>
        {product.name}
      </Text>
      <Text style={[styles.pickPrice, { fontFamily: familyFor('bodySemi', rtl), textAlign: rtl ? 'right' : 'left' }]}>{formatDT(product.price)}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  // Home's own column and rail, so these line up with "Parcourir par famille".
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.85 },
  greetRow: { alignItems: 'center', gap: Spacing.two },
  greet: { fontSize: 24, lineHeight: 30, letterSpacing: -0.3, color: C.text },
  info: { width: Tap.min, height: Tap.min, alignItems: 'center', justifyContent: 'center', borderRadius: Tap.min / 2 },
  subRow: { alignItems: 'center', gap: Spacing.two, minHeight: 32 },
  seeAll: { alignItems: 'center', gap: 2, minHeight: Tap.min, justifyContent: 'center' },
  seeAllText: { textDecorationLine: 'underline' },
  rail: { gap: Spacing.three, paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  pick: { width: 116, gap: 6 },
  pickArt: {
    width: 116,
    height: 116,
    borderRadius: 24,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pickFit: {
    position: 'absolute',
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickName: { fontSize: 14, lineHeight: 18, color: C.text },
  pickPrice: { fontSize: 14, lineHeight: 18, color: C.text },
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
  care: { marginTop: Spacing.two },
  empty: { alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.tile, backgroundColor: C.surface, minHeight: Tap.min },
});
