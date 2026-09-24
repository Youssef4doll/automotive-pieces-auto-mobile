import { Feather } from '@expo/vector-icons';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Brand, C, Elevation, familyFor, Radius, Spacing } from '@/constants/theme';
import { CarArt } from '@/illustrations/car-art';
import { useI18n } from '@/i18n/provider';
import { yearSpan } from '@/lib/format';
import type { SavedVehicle } from '@/store/garage';
import { PressScale } from './press-scale';
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
  action,
  onMore,
  flat = false,
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
  /** A word on the trailing edge instead of the chevron — "Changer". */
  action?: string;
  /** A "…" button for the row's own actions (Mes véhicules). */
  onMore?: () => void;
  /** No lift: for rows inside a list that already has its own surface. */
  flat?: boolean;
}) {
  const { t, rtl } = useI18n();
  const line = useVehicleLine();
  const start = { alignItems: rtl ? ('flex-end' as const) : ('flex-start' as const) };
  const title = vehicle ? `${vehicle.makeName} ${vehicle.modelName}` : empty?.title ?? '';
  const sub = vehicle ? line(vehicle) : empty?.line ?? '';

  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const body = (
    <>
      <View style={[styles.art, rtl && { transform: [{ scaleX: -1 }] }]}>
        <CarArt width={compactArt ? 84 : 104} />
      </View>
      <View style={[styles.body, start]}>
        {label || action ? (
          <View style={[row, styles.labelRow]}>
            {label ? (
              <Text variant="hint" tone={C.textMuted} numberOfLines={1} style={styles.shrink}>
                {label}
              </Text>
            ) : null}
            {action ? (
              <View style={[row, styles.actionRow]}>
                <Text variant="hint" tone={C.text}>
                  {action}
                </Text>
                <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={13} color={C.text} />
              </View>
            ) : null}
          </View>
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
          <View style={[styles.pill, row]}>
            <Feather name="check-circle" size={12} color={C.success} />
            <Text style={[styles.pillText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.principal')}</Text>
          </View>
        ) : null}
      </View>
    </>
  );
  const a11y = [label, title, sub, principal ? t('look.principal') : null, action].filter(Boolean).join(', ');

  // With a "…" the card is two buttons side by side — never one inside the
  // other, which is invalid on the web and ambiguous to a screen reader.
  if (onMore) {
    return (
      <View style={[styles.card, flat && styles.flat, row, selected && styles.selected, style]}>
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={a11y}
          accessibilityState={{ selected }}
          onPress={onPress}
          style={[styles.main, row]}
          scaleTo={0.98}
        >
          {body}
        </PressScale>
        <PressScale accessibilityRole="button" accessibilityLabel={`${t('garage.options')} — ${title}`} onPress={onMore} style={styles.more}>
          <Feather name="more-horizontal" size={20} color={C.textMuted} />
        </PressScale>
      </View>
    );
  }

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.card, flat && styles.flat, row, selected && styles.selected, style]}
      pressedStyle={styles.pressed}
    >
      {body}
      {action ? null : <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={C.textMuted} />}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Elevation.resting,
  },
  flat: { shadowOpacity: 0, elevation: 0 },
  selected: { borderColor: Brand.navy700 },
  more: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0, alignItems: 'center', gap: Spacing.three },
  labelRow: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  shrink: { flexShrink: 1 },
  actionRow: { alignItems: 'center', gap: 3 },
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
