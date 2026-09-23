import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Product } from '@/api/catalogue';
import { Border, Brand, C, familyFor, Radius, Spacing } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { PartImage } from './part-image';
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
 * No quick-add here. At half width a "+" competes with the price for the
 * same corner, and the grid is a place to choose, not to buy.
 */
const FIT: Record<'FITS' | 'UNKNOWN' | 'DOES_NOT_FIT', { icon: React.ComponentProps<typeof Feather>['name']; tone: string; key: DictKey }> = {
  FITS: { icon: 'check-circle', tone: C.success, key: 'look.fit.FITS' },
  UNKNOWN: { icon: 'help-circle', tone: C.caution, key: 'look.fit.UNKNOWN' },
  DOES_NOT_FIT: { icon: 'x-circle', tone: C.danger, key: 'look.fit.DOES_NOT_FIT' },
};
const STOCK: Record<Product['availability'], { tone: string; key: DictKey }> = {
  IN_STOCK: { tone: C.success, key: 'stock.inStock' },
  ON_ORDER: { tone: C.caution, key: 'stock.onOrder' },
  UNAVAILABLE: { tone: C.textFaint, key: 'stock.unavailable' },
};

export function ProductTile({ product }: { product: Product }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const fit = product.fitment ? FIT[product.fitment] : null;
  const stock = STOCK[product.availability];
  const stockLine = product.lowStockQty !== null ? t('stock.low', { n: product.lowStockQty }) : t(stock.key);
  const start = { alignItems: rtl ? ('flex-end' as const) : ('flex-start' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[product.brand, product.name, fit ? t(fit.key) : null, stockLine].filter(Boolean).join(', ')}
      onPress={() => router.push({ pathname: '/produit/[slug]', params: { slug: product.slug } })}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.art}>
        <PartImage slug={product.familySlug} imageUrl={product.imageUrl} size={96} label={product.name} />
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
            <Feather name={fit.icon} size={13} color={fit.tone} />
            <Text variant="hint" tone={fit.tone} numberOfLines={1}>
              {t(fit.key)}
            </Text>
          </View>
        ) : null}
        <View style={styles.price}>
          <Price value={product.price} compareAt={product.compareAtPrice} />
        </View>
        <View style={[row, styles.line]}>
          <View style={[styles.dot, { backgroundColor: stock.tone }]} />
          <Text variant="hint" tone={stock.tone} numberOfLines={1}>
            {stockLine}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Brand.white,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
    padding: Spacing.two,
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
});
