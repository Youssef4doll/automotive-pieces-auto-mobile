import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { Product } from '@/api/catalogue';
import { Brand, C, Elevation, familyFor, Radius, Spacing } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { useAddToCart } from '@/hooks/use-add-to-cart';
import { fitState, FIT_LOOK } from '@/lib/fit';
import { PartImage } from './part-image';
import { PressScale } from './press-scale';
import { Price } from './price';
import { Text } from './text';

/**
 * A part as a half-width tile — the reference's "Nos produits" grid.
 *
 * Picture on top (the shop's photo, else the family's illustration), the
 * maker in red capitals, the name, then one short verdict line and the
 * price with its stock. The verdict is the same four states as the full
 * badge, shortened to fit a column, and a tile never drops it: in a grid
 * it is the one thing that separates two parts that look alike.
 *
 * A small "+" adds one without leaving the grid — beside the tile's own
 * button, never inside it, and absent for a part that cannot be bought or
 * is known not to fit (that one needs the product page's explanation).
 */
const STOCK: Record<Product['availability'], { tone: string; key: DictKey }> = {
  IN_STOCK: { tone: C.success, key: 'stock.inStock' },
  ON_ORDER: { tone: C.cautionText, key: 'stock.onOrder' },
  UNAVAILABLE: { tone: C.textFaint, key: 'stock.unavailable' },
};

/** The "+" (44) and a gap, kept free at the end of the price and stock lines. */
const ADD_ROOM = 44 + Spacing.one;

export function ProductTile({ product }: { product: Product }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const addToCart = useAddToCart();
  const quickAdd = product.availability !== 'UNAVAILABLE' && product.fitment !== 'DOES_NOT_FIT';
  const state = fitState(product);
  const fit = state ? { icon: FIT_LOOK[state].icon, iconTone: FIT_LOOK[state].iconTone, tone: FIT_LOOK[state].tone, key: FIT_LOOK[state].short } : null;
  const stock = STOCK[product.availability];
  const stockLine = product.lowStockQty !== null ? t('stock.low', { n: product.lowStockQty }) : t(stock.key);
  const start = { alignItems: rtl ? ('flex-end' as const) : ('flex-start' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <View style={styles.wrap}>
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={[product.brand, product.name, fit ? t(fit.key) : null, stockLine].filter(Boolean).join(', ')}
      onPress={() => router.push({ pathname: '/produit/[slug]', params: { slug: product.slug } })}
      style={styles.tile}
      pressedStyle={styles.pressed}
    >
      <View style={styles.art}>
        <PartImage slug={product.familySlug} imageUrl={product.imageUrl} size={96} label={product.name} tagIllustration />
      </View>
      <View style={[styles.body, start]}>
        {product.brand ? (
          <Text style={[styles.brand, { fontFamily: familyFor('display', rtl) }]} numberOfLines={1}>
            {product.brand.toUpperCase()}
          </Text>
        ) : null}
        <Text style={[styles.name, { fontFamily: familyFor('bodySemi', rtl) }]} numberOfLines={3}>
          {product.name}
        </Text>
        {fit ? (
          <View style={[row, styles.line]}>
            <Feather name={fit.icon} size={13} color={fit.iconTone} />
            <Text variant="hint" tone={fit.tone} numberOfLines={1}>
              {t(fit.key)}
            </Text>
          </View>
        ) : null}
        {/* Clear of the "+" in the corner: a long price ("118,00 DT" under
            "138,60 DT") ran under it and lost its last digits. */}
        <View style={[styles.foot, start, quickAdd && (rtl ? { paddingLeft: ADD_ROOM } : { paddingRight: ADD_ROOM })]}>
          <View style={styles.price}>
            <Price value={product.price} compareAt={product.compareAtPrice} />
          </View>
          <View style={[row, styles.line]}>
            <View style={[styles.dot, { backgroundColor: stock.tone }]} />
            <Text variant="hint" tone={stock.tone} numberOfLines={1} style={styles.shrink}>
              {stockLine}
            </Text>
          </View>
        </View>
      </View>
    </PressScale>
      {quickAdd ? (
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={t('product.quickAdd', { name: product.name })}
          onPress={() => addToCart(product)}
          hitSlop={4}
          scaleTo={0.9}
          style={[styles.add, rtl ? { left: Spacing.two } : { right: Spacing.two }]}
          pressedStyle={{ backgroundColor: Brand.gold600 }}
        >
          <Feather name="plus" size={20} color={C.onAccent} />
        </PressScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  add: {
    position: 'absolute',
    bottom: Spacing.two,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.gold500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    flex: 1,
    backgroundColor: Brand.white,
    borderRadius: Radius.tile,
    padding: Spacing.two,
    ...Elevation.resting,
    gap: Spacing.two,
  },
  pressed: { backgroundColor: C.surface },
  art: {
    height: 116,
    borderRadius: 14,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { gap: 3, paddingHorizontal: Spacing.one, paddingBottom: Spacing.one },
  brand: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: Brand.red600 },
  name: { fontSize: 14, lineHeight: 18, color: C.text },
  line: { alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  price: { paddingTop: 2 },
  foot: { alignSelf: 'stretch', gap: 3 },
  shrink: { flexShrink: 1 },
});
