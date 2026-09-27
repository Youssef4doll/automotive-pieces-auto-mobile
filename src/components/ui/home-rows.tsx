import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ordersApi } from '@/api/orders';
import { productsApi, type Product } from '@/api/catalogue';
import { C, familyFor, MaxContentWidth, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { useOrders } from '@/store/orders';
import { ProductTile } from './product-tile';
import { Rail } from './rail';
import { Text } from './text';

/**
 * The home screen's two personal rows, each shown only when it has
 * something real in it:
 *
 *   "Pour votre BMW Série 1" — parts CONFIRMED for the car in the garage
 *   (fits=1, VERIFIED rows only), with prices and quick add.
 *   "Commander à nouveau" — the parts of this phone's last orders that are
 *   still on sale, read again from the shop so the price is today's.
 */
export function HomeRows() {
  const active = useGarage((s) => s.active);
  const orders = useOrders((s) => s.orders);
  const tokenFor = useOrders((s) => s.tokenFor);
  const { t } = useI18n();
  const router = useRouter();

  const engineId = active?.engineId;
  const loadFits = useCallback(
    (signal: AbortSignal) => (engineId ? productsApi.fitsEngine(engineId, {}, signal).then((p) => p.products.slice(0, 10)) : Promise.resolve([])),
    [engineId],
  );
  const fits = useResource(loadFits);

  const recent = orders.slice(0, 3).map((o) => o.ref).join(',');
  const loadAgain = useCallback(
    async (signal: AbortSignal) => {
      const ids = new Set<string>();
      for (const ref of recent.split(',').filter(Boolean)) {
        const token = await tokenFor(ref);
        if (!token) continue;
        try {
          const order = await ordersApi.get(ref, token, signal);
          if (order.status === 'CANCELLED') continue;
          for (const item of order.items) if (item.productId && item.slug) ids.add(item.productId);
        } catch {
          // That order is not readable from here; the others still are.
        }
      }
      if (!ids.size) return [];
      return (await productsApi.byIds([...ids], engineId, signal)).products;
    },
    [recent, tokenFor, engineId],
  );
  const again = useResource(loadAgain);

  return (
    <>
      {active && fits.status === 'loaded' && fits.data.length > 0 ? (
        <Row
          title={t('home.forYourCar', { car: `${active.makeName} ${active.modelName}` })}
          products={fits.data}
          onAll={() => router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } })}
        />
      ) : null}
      {again.status === 'loaded' && again.data.length > 0 ? (
        <Row title={t('home.orderAgain')} products={again.data} onAll={() => router.push('/compte/commandes')} />
      ) : null}
    </>
  );
}

function Row({ title, products, onAll }: { title: string; products: Product[]; onAll: () => void }) {
  const { t, rtl } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  return (
    <View style={styles.block}>
      <View style={[styles.column, styles.head, row]}>
        <Text numberOfLines={1} style={[styles.title, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>
          {title}
        </Text>
        <Pressable accessibilityRole="button" onPress={onAll} hitSlop={8} style={[styles.all, row]}>
          <Text variant="hint" tone={C.text}>
            {t('catalog.seeAll')}
          </Text>
          <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
        </Pressable>
      </View>
      <Rail contentContainerStyle={[styles.rail, row]}>
        {products.map((p) => (
          <View key={p.id} style={styles.tile}>
            <ProductTile product={p} />
          </View>
        ))}
      </Rail>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingTop: Spacing.four, gap: Spacing.two },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three },
  head: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { flex: 1, fontSize: 20, lineHeight: 26, color: C.text },
  all: { alignItems: 'center', gap: 4 },
  rail: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  tile: { width: 172 },
});
