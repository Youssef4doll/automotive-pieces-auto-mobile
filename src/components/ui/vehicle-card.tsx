import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Border, Brand, C, Elevation, familyFor, Radius, Spacing } from '@/constants/theme';
import { CarArt } from '@/illustrations/car-art';
import { useI18n } from '@/i18n/provider';
import { yearSpan } from '@/lib/format';
import type { SavedVehicle } from '@/store/garage';
import { Text } from './text';

/** "116i · 2004–2011", or just the engine when the shop recorded no years. */
export function useVehicleLine() {
  const { t } = useI18n();
  return (v: SavedVehicle) => [v.engineName, yearSpan(v.yearFrom ?? null, v.yearTo ?? null, t)].filter(Boolean).join(' · ');
}

/**
 * A car as the reference draws it everywhere — the illustration on the
 * left, a small label, the car in bold, the engine and years, and the green
 * "Véhicule principal" pill on the active one.
 *
 * `selected` is the navy outline "Mes véhicules" puts round the car being
 * acted on. Without a vehicle, the same card is the invitation to choose one.
 */
export function VehicleCard({
  vehicle,
  label,
  principal = false,
  selected = false,
  onPress,
  empty,
  style,
  compactArt = false,
}: {
  vehicle: SavedVehicle | null;
  label?: string | null;
  principal?: boolean;
  selected?: boolean;
  onPress: () => void;
  /** Title and line when there is no vehicle yet. */
  empty?: { title: string; line: string };
  style?: ViewStyle;
  compactArt?: boolean;
}) {
  const { t, rtl } = useI18n();
  const line = useVehicleLine();
  const start = { alignItems: rtl ? ('flex-end' as const) : ('flex-start' as const) };
  const title = vehicle ? `${vehicle.makeName} ${vehicle.modelName}` : empty?.title ?? '';
  const sub = vehicle ? line(vehicle) : empty?.line ?? '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, title, sub, principal ? t('look.principal') : null].filter(Boolean).join(', ')}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.art, rtl && { transform: [{ scaleX: -1 }] }]}>
        <CarArt width={compactArt ? 84 : 104} />
      </View>
      <View style={[styles.body, start]}>
        {label ? (
          <Text variant="hint" tone={C.textMuted} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <Text style={[styles.title, { fontFamily: familyFor('heading', rtl) }]} numberOfLines={2}>
          {title}
        </Text>
        {sub ? (
          <Text variant="hint" tone={C.textMuted} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
        {principal ? (
          <View style={[styles.pill, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <Feather name="check-circle" size={12} color={C.success} />
            <Text style={[styles.pillText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.principal')}</Text>
          </View>
        ) : null}
      </View>
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={C.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: Brand.white,
    borderWidth: Border.thin,
    borderColor: C.border,
    ...Elevation.resting,
  },
  selected: { borderColor: Brand.navy700, borderWidth: 1.5 },
  pressed: { backgroundColor: C.surface },
  art: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 17, lineHeight: 22, color: C.text },
  pill: {
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: C.successSurface,
  },
  pillText: { fontSize: 12, lineHeight: 16, color: C.success },
});
