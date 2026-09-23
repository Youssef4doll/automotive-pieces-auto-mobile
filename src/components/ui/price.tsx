import { StyleSheet, View } from 'react-native';

import { C, familyFor, Spacing } from '@/constants/theme';
import { formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * A price in Tunisian dinars.
 *
 * Two things this gets right that a template string does not.
 *
 * The decimals are set smaller and are optically aligned to the top of the
 * whole number rather than sitting on its baseline, so "89,00 DT" reads as
 * eighty-nine first and the centimes second. That is how a price is scanned,
 * and lining the two at the same size makes the eye read four digits.
 *
 * And the comma is the decimal separator, because that is how Tunisia writes
 * money. `toFixed` gives a full stop and nothing in this app should print
 * "89.00 DT" to a customer in Ariana.
 *
 * The currency is not translated. "DT" is what is on the shelf label and on
 * the invoice in all three languages.
 *
 * The figure itself is never mirrored. The first version reversed the
 * whole-and-centimes row under Arabic along with everything else, and a
 * 32,70 DT filter read "DT 70,32" — the centimes on the wrong side of the
 * dinars. A number is left-to-right in every language this app speaks, so
 * only the struck-through reference price and the amount swap sides; the
 * amount's own parts stay put.
 */
export function Price({
  value,
  /** A struck-through reference price. Only pass one the shop actually set. */
  compareAt = null,
  size = 'normal',
}: {
  value: number;
  compareAt?: number | null;
  size?: 'normal' | 'large';
}) {
  const { rtl } = useI18n();
  const [whole, cents] = value.toFixed(2).split('.');
  const large = size === 'large';

  return (
    <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      {compareAt !== null && compareAt > value ? (
        <Text variant="hint" tone={C.textFaint} style={styles.struck}>
          {formatDT(compareAt)}
        </Text>
      ) : null}

      <View style={[styles.amount, { flexDirection: 'row' }]} accessibilityLabel={formatDT(value)} accessible>
        <Text
          style={{
            fontFamily: familyFor('headingStrong', rtl),
            fontSize: large ? 28 : 19,
            lineHeight: large ? 32 : 23,
            color: C.text,
            writingDirection: 'ltr',
          }}
        >
          {whole}
        </Text>
        <Text
          style={{
            fontFamily: familyFor('bodySemi', rtl),
            fontSize: large ? 15 : 12,
            lineHeight: large ? 20 : 16,
            color: C.text,
            // Optical, not mechanical: the decimals ride high against the
            // whole number instead of centring in the line box.
            marginTop: large ? 2 : 1,
            writingDirection: 'ltr',
          }}
        >
          {`,${cents} DT`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  amount: {
    alignItems: 'flex-start',
    gap: 1,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
});
