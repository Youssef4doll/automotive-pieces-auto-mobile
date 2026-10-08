import { StyleSheet, View } from 'react-native';

import { Border, Brand, C, familyFor, Radius, Spacing } from '@/constants/theme';
import { formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * Subtotal, the promo code when one applied, delivery, stamp duty, total —
 * the same rows on the basket, on the payment step and on a tracked order, so
 * the figure a customer agreed to reads the same way wherever they meet it
 * again.
 *
 * Delivery the basket earned for free shows what it would have cost, struck
 * through beside a red "Gratuite" — the figure the shop sends
 * (deliveryFeeWaived), never one worked out here.
 *
 * The stamp duty row appears only when the shop charges one. It is a real
 * dinar when it applies and it is inside the total; a row showing "0,00 DT"
 * for a tax the shop is not charging would be a line of noise that looks like
 * a fee.
 */
export function OrderSummary({
  subtotal,
  discount = 0,
  promoCode = null,
  deliveryFee,
  deliveryFeeWaived = 0,
  stampDuty,
  total,
  deliveryLabel,
  stale = false,
}: {
  subtotal: number;
  /** Off the parts by a promo code, as the shop worked it out. */
  discount?: number;
  promoCode?: string | null;
  deliveryFee: number;
  /** The fee the shop waived because the basket is over its threshold. */
  deliveryFeeWaived?: number;
  stampDuty: number;
  total: number;
  /** "Livraison", or "Retrait en magasin" when collecting. */
  deliveryLabel?: string;
  /** A figure being replaced by a newer one — dimmed, never hidden. */
  stale?: boolean;
}) {
  const { t, rtl } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <View style={[styles.card, stale && styles.stale]} accessibilityState={{ busy: stale }}>
      <View style={[styles.row, row]}>
        <Text variant="body">{t('cart.subtotal')}</Text>
        <Text variant="body">{formatDT(subtotal)}</Text>
      </View>
      {discount > 0 ? (
        <View style={[styles.row, row]}>
          <Text variant="body" tone={C.success}>
            {t('cart.promo.applied', { code: promoCode ?? '' })}
          </Text>
          <Text variant="body" tone={C.success}>{`−${formatDT(discount)}`}</Text>
        </View>
      ) : null}
      <View style={[styles.row, row]}>
        <Text variant="body">{deliveryLabel ?? t('cart.delivery')}</Text>
        {deliveryFee === 0 && deliveryFeeWaived > 0 ? (
          <View style={[styles.waived, row]} accessibilityLabel={`${t('cart.free')}, ${formatDT(deliveryFeeWaived)}`}>
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('cart.freeBadge')}</Text>
            </View>
            <Text variant="body" tone={C.textMuted} style={styles.struck}>
              {formatDT(deliveryFeeWaived)}
            </Text>
          </View>
        ) : (
          <Text variant="body" tone={deliveryFee === 0 ? C.success : C.text}>
            {deliveryFee === 0 ? t('cart.free') : formatDT(deliveryFee)}
          </Text>
        )}
      </View>
      {stampDuty > 0 ? (
        <View style={[styles.row, row]}>
          <Text variant="body">{t('cart.stamp')}</Text>
          <Text variant="body">{formatDT(stampDuty)}</Text>
        </View>
      ) : null}
      <View style={[styles.row, styles.totalRow, row]}>
        <Text variant="rowTitle">{t('cart.total')}</Text>
        <Text style={{ fontFamily: familyFor('headingStrong', rtl), fontSize: 20, lineHeight: 26, color: C.text }}>
          {formatDT(total)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
  },
  stale: {
    opacity: 0.55,
  },
  row: {
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  waived: { alignItems: 'center', gap: Spacing.two },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: Brand.red600 },
  badgeText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: Brand.white },
  struck: { textDecorationLine: 'line-through' },
  totalRow: {
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: Border.hairline,
    borderTopColor: C.border,
  },
});
