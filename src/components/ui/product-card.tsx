import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { Product } from '@/api/catalogue';
import { API_BASE_URL } from '@/constants/config';
import { Border, C, IconSize, Radius, Spacing } from '@/constants/theme';
import { PartArtwork } from '@/illustrations/parts';
import { useI18n } from '@/i18n/provider';
import type { DictKey } from '@/i18n/dictionaries';
import { CompatibilityBadge } from './compatibility';
import { Price } from './price';
import { Text } from './text';

/**
 * One part in a list.
 *
 * Read top to bottom the way a customer decides: who made it, what it is,
 * whether it fits their car, what it costs, whether the shop has it. The
 * reference, the OEM numbers, the dimensions and the rest are real and are
 * not here — they belong on the part's own page, behind the decision this
 * card exists to support.
 *
 * It is NOT tappable, and that is deliberate rather than unfinished. There is
 * no product page and no basket in the app yet, so a card that lit up under a
 * thumb and then did nothing would be the one thing a shop's app must never
 * do. When those screens land this becomes a Pressable and gains its CTA; the
 * information design does not change.
 */
const STOCK: Record<Product['availability'], { icon: React.ComponentProps<typeof Feather>['name']; tone: string; label: DictKey }> = {
  IN_STOCK: { icon: 'check', tone: C.success, label: 'stock.inStock' },
  ON_ORDER: { icon: 'clock', tone: C.caution, label: 'stock.onOrder' },
  UNAVAILABLE: { icon: 'slash', tone: C.textFaint, label: 'stock.unavailable' },
};

export function ProductCard({ product }: { product: Product }) {
  const { t, rtl } = useI18n();
  const stock = STOCK[product.availability];

  return (
    <View style={[styles.card, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <View style={styles.art}>
        {product.imageUrl ? (
          <Image
            source={{ uri: `${API_BASE_URL}${product.imageUrl}` }}
            style={styles.photo}
            contentFit="contain"
            // The part on a plain tile, never cropped to fill: a brake pad
            // cropped square loses the shape that identifies it.
            transition={120}
            accessibilityLabel={product.name}
          />
        ) : (
          // Most of the catalogue. The family's own drawing rather than a
          // photograph of a different part — the shop's rule, and the same
          // answer the website gives.
          <PartArtwork slug={product.familySlug} size={44} />
        )}
      </View>

      <View style={styles.body}>
        {product.brand ? (
          <Text variant="label" tone={C.textMuted} numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}

        {/* Three lines, not two. A part name's distinguishing word is
            usually at the end — "frein arrière SACHS" against "frein avant
            SACHS" — so clamping to two lines on a 320pt phone truncated
            exactly the word the customer needed. */}
        <Text variant="rowTitle" numberOfLines={3}>
          {product.name}
        </Text>

        <View style={styles.badgeRow}>
          <CompatibilityBadge verdict={product.fitment} />
        </View>

        <View style={[styles.foot, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <Price value={product.price} compareAt={product.compareAtPrice} />

          <View style={[styles.stock, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <Feather name={stock.icon} size={IconSize.small} color={stock.tone} />
            <Text variant="hint" tone={stock.tone} numberOfLines={1}>
              {/* A count, never urgency. "il ne reste que 2, dépêchez-vous"
                  is the thing this project does not do; the shop's own
                  low-stock threshold decides when the number is worth
                  printing at all. */}
              {product.lowStockQty !== null
                ? t('stock.low', { n: product.lowStockQty })
                : t(stock.label)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  art: {
    width: 72,
    height: 72,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    // A compact, correctly proportioned tile — not a part floating in a
    // giant rectangle, which is what the old storefront cards did.
    flexShrink: 0,
  },
  photo: {
    width: '80%',
    height: '80%',
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  badgeRow: {
    paddingTop: Spacing.one,
  },
  foot: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  stock: {
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
});
