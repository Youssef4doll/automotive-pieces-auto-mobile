import { StyleSheet, View } from 'react-native';

import type { ReturnStatus } from '@/api/staff';
import { Brand, C, familyFor, Radius } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from '@/components/ui/text';

/** A return request's state — the word carries it, the colour repeats it. New requests are red: they wait on the shop. */
const TONE: Record<ReturnStatus, { bg: string; fg: string }> = {
  REQUESTED: { bg: C.dangerSurface, fg: C.danger },
  APPROVED: { bg: C.cautionSurface, fg: '#92400e' },
  RECEIVED: { bg: Brand.navy50, fg: Brand.navy700 },
  RESOLVED: { bg: C.successSurface, fg: C.success },
  REFUSED: { bg: C.surface, fg: C.textMuted },
  CANCELLED: { bg: C.surface, fg: C.textMuted },
};

export function ReturnPill({ status }: { status: ReturnStatus }) {
  const { t, rtl } = useI18n();
  const tone = TONE[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 12, lineHeight: 16, color: tone.fg }}>{t(`returns.status.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ pill: { alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 } });
