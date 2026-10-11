import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { MapPreview } from '@/components/ui/pin-map';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, familyFor, IconSize, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { AddressArt } from '@/illustrations/address-art';
import type { LatLng } from '@/lib/map-tiles';

/**
 * The door, at the head of an address, as Glovo opens its checkout (the
 * owner, October 2026): the still map with the customer's pin on it — or,
 * before there is one, the artist's map and the invitation to place it.
 * Either way a tap opens the map picker; the screen around it says how.
 */
export function PinCard({ pin, onPress, height = 150, testID }: { pin: LatLng | null; onPress: () => void; height?: number; testID?: string }) {
  const { t, rtl } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const start = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  if (pin) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('addr.pinSet')}, ${t('addr.mapEdit')}`}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.map, pressed && styles.pressed]}
      >
        <MapPreview center={pin} height={height} />
        <View style={[styles.edit, row, rtl ? styles.editRtl : styles.editLtr]} pointerEvents="none">
          <Feather name="edit-2" size={13} color={C.text} />
          <Text style={[styles.editText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('addr.mapEdit')}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('addr.mapInviteTitle')}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.invite, row, pressed && styles.invitePressed]}
    >
      <AddressArt width={height > 130 ? 96 : 76} />
      <View style={styles.flex}>
        <Text style={[styles.title, start, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('addr.mapInviteTitle')}</Text>
      </View>
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  map: { borderRadius: Radius.card },
  pressed: { opacity: 0.85 },
  edit: {
    position: 'absolute',
    top: Spacing.two + 2,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Brand.white,
    ...Elevation.resting,
  },
  editLtr: { right: Spacing.two + 2 },
  editRtl: { left: Spacing.two + 2 },
  editText: { fontSize: 13, lineHeight: 17, color: C.text },
  invite: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
  },
  invitePressed: { backgroundColor: C.surfacePressed },
  title: { fontSize: 15, lineHeight: 20, color: C.text },
});
