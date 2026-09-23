import { StyleSheet, View } from 'react-native';

import { Border, C, familyFor, Radius, Spacing } from '@/constants/theme';
import { formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * Subtotal, delivery, stamp duty, total — the same four rows on the basket,
 * on the payment step and on a tracked order, so the figure a customer
 * agreed to reads the same way wherever they meet it again.
 *
 * The stamp duty row appears only when the shop charges one. It is a real
 * dinar when it applies and it is inside the total; a row showing "0,00 DT"
 * for a tax the shop is not charging would be a line of noise that looks like
 * a fee.
 */
export function OrderSummary({
  subtotal,
  deliveryFee,
  stampDuty,
  total,
  deliveryLabel,
  stale = false,
}: {
  subtotal: number;
  deliveryFee: number;
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
      <View style={[styles.row, row]}>
        <Text variant="body">{deliveryLabel ?? t('cart.delivery')}</Text>
        <Text variant="body" tone={deliveryFee === 0 ? C.success : C.text}>
          {deliveryFee === 0 ? t('cart.free') : formatDT(deliveryFee)}
        </Text>
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
  totalRow: {
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: Border.hairline,
    borderTopColor: C.border,
  },
});
