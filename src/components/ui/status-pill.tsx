import { StyleSheet, View } from 'react-native';

import type { OrderStatus } from '@/api/orders';
import { Brand, C, familyFor, Radius } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * An order's state as a small coloured pill: the word carries the meaning,
 * the colour only repeats it. Shared by "Mes commandes" and the staff screens.
 */
const TONE: Record<OrderStatus, { bg: string; fg: string; dot: string }> = {
  PENDING: { bg: C.cautionSurface, fg: '#92400e', dot: '#d97706' },
  CONFIRMED: { bg: Brand.navy50, fg: Brand.navy700, dot: Brand.navy700 },
  PREPARED: { bg: Brand.navy50, fg: Brand.navy700, dot: Brand.navy700 },
  SHIPPED: { bg: Brand.navy50, fg: Brand.navy700, dot: Brand.gold500 },
  DELIVERED: { bg: C.successSurface, fg: C.success, dot: C.success },
  CANCELLED: { bg: C.dangerSurface, fg: C.danger, dot: C.danger },
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const { t, rtl } = useI18n();
  const tone = TONE[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg, flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 12, lineHeight: 16, color: tone.fg }}>{t(`status.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', alignItems: 'center', gap: 6, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
