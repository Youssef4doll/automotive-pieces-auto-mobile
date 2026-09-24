import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Product } from '@/api/catalogue';
import { API_BASE_URL } from '@/constants/config';
import { Brand, C, Elevation, familyFor, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { useAddToCart } from '@/hooks/use-add-to-cart';
import { formatDT } from '@/lib/format';
import { PartImage } from './part-image';
import { useI18n } from '@/i18n/provider';
import type { DictKey } from '@/i18n/dictionaries';
import { useGarage } from '@/store/garage';
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
 * The card opens the part's page. The "+" in its corner adds one to the
 * basket without leaving the list — the difference between adding three
 * filters in three taps and in nine.
 *
 * No "+" on two kinds of part. One the shop cannot source has nothing to add.
 * One listed as NOT fitting the customer's car must not go in the basket on
 * a single tap from a list: the product page asks first, and a shortcut
 * around that question would be the app quietly helping somebody buy the
 * wrong brake disc.
 *
 * The "+" is a sibling of the card's pressable area, not a child of it. On
 * the web build both render as <button>, and a button inside a button is
 * invalid HTML that browsers repair unpredictably.
 */
const STOCK: Record<Product['availability'], { icon: React.ComponentProps<typeof Feather>['name']; tone: string; label: DictKey }> = {
  IN_STOCK: { icon: 'check', tone: C.success, label: 'stock.inStock' },
  ON_ORDER: { icon: 'clock', tone: C.caution, label: 'stock.onOrder' },
  UNAVAILABLE: { icon: 'slash', tone: C.textFaint, label: 'stock.unavailable' },
};

export function ProductCard({ product }: { product: Product }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const addToCart = useAddToCart();
  const stock = STOCK[product.availability];
  const car = useGarage((st) => (st.active ? `${st.active.makeName} ${st.active.modelName}` : ''));
  // The verdict as a sentence naming THEIR car where there is one — the line
  // the brief puts straight under the name — quiet text, not another pill.
  const fit =
    product.fitment === 'FITS'
      ? { icon: 'check-circle' as const, tone: C.success, text: car ? t('product.fitsYour', { car }) : t('fit.fits') }
      : product.fitment === 'DOES_NOT_FIT'
        ? { icon: 'x-circle' as const, tone: C.danger, text: car ? t('product.notYour', { car }) : t('fit.no') }
        : product.fitment === 'UNKNOWN'
          ? { icon: 'help-circle' as const, tone: C.caution, text: t('fit.unknown') }
          : null;
  const quickAdd = product.availability !== 'UNAVAILABLE' && product.fitment !== 'DOES_NOT_FIT';
  const stockLine =
    product.lowStockQty !== null ? t('stock.low', { n: product.lowStockQty }) : t(stock.label);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        // One sentence for the whole card, in the order the eye reads it.
        accessibilityLabel={[product.brand, product.name, formatDT(product.price), stockLine]
          .filter(Boolean)
          .join(', ')}
        onPress={() => router.push({ pathname: '/produit/[slug]', params: { slug: product.slug } })}
        style={({ pressed }) => [
          styles.pressable,
          { flexDirection: rtl ? 'row-reverse' : 'row' },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.art}>
          {product.imageUrl ? (
            <Image
              source={{ uri: `${API_BASE_URL}${product.imageUrl}` }}
              style={styles.photo}
              contentFit="contain"
              // The part on a plain tile, never cropped to fill: a brake pad
              // cropped square loses the shape that identifies it.
              transition={120}
            />
          ) : (
            // Most of the catalogue. The family's own drawing rather than a
            // photograph of a different part — the shop's rule, and the same
            // answer the website gives.
            <PartImage slug={product.familySlug} size={48} />
          )}
        </View>

        <View style={styles.body}>
          {product.brand ? (
            <Text style={[styles.brand, { fontFamily: familyFor('display', rtl) }]} numberOfLines={1}>
              {product.brand.toUpperCase()}
            </Text>
          ) : null}

          {/* Three lines, not two. A part name's distinguishing word is
              usually at the end — "frein arrière SACHS" against "frein avant
              SACHS" — so clamping to two lines on a 320pt phone truncated
              exactly the word the customer needed. */}
          <Text variant="rowTitle" numberOfLines={3}>
            {product.name}
          </Text>

          {fit ? (
            <View style={[styles.fitRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              <Feather name={fit.icon} size={14} color={fit.tone} />
              <Text variant="hint" tone={fit.tone} numberOfLines={2} style={styles.fitText}>
                {fit.text}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.foot,
              { flexDirection: rtl ? 'row-reverse' : 'row' },
              // Room for the "+" that sits over this corner.
              quickAdd && (rtl ? { paddingLeft: Tap.min + Spacing.two } : { paddingRight: Tap.min + Spacing.two }),
            ]}
          >
            <Price value={product.price} compareAt={product.compareAtPrice} />

            <View style={[styles.stock, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              <Feather name={stock.icon} size={IconSize.small} color={stock.tone} />
              <Text variant="hint" tone={stock.tone} numberOfLines={1}>
                {/* A count, never urgency. "il ne reste que 2, dépêchez-vous"
                    is the thing this project does not do; the shop's own
                    low-stock threshold decides when the number is worth
                    printing at all. */}
                {stockLine}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {quickAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('product.quickAdd', { name: product.name })}
          onPress={() => addToCart(product)}
          hitSlop={4}
          style={({ pressed }) => [
            styles.add,
            rtl ? { left: Spacing.three } : { right: Spacing.three },
            pressed && styles.addPressed,
          ]}
        >
          <Feather name="plus" size={IconSize.large} color={C.onAccent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // No outline: a soft lift separates the cards, so a list of twenty reads
  // as twenty parts and not as a table of boxes.
  card: {
    borderRadius: Radius.card,
    backgroundColor: C.background,
    ...Elevation.resting,
  },
  brand: { fontSize: 12, lineHeight: 16, letterSpacing: 0.5, color: Brand.red600 },
  fitRow: { alignItems: 'flex-start', gap: 6, paddingTop: 2 },
  fitText: { flexShrink: 1 },
  pressable: {
    borderRadius: Radius.card,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  pressed: {
    backgroundColor: C.surface,
  },
  add: {
    position: 'absolute',
    bottom: Spacing.three,
    width: Tap.min,
    height: Tap.min,
    borderRadius: Radius.pill,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPressed: {
    backgroundColor: Brand.gold600,
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
