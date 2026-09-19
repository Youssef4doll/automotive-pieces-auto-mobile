import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, Elevation, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * A choice as a tile in a grid, rather than a row in a list.
 *
 * Used for the motorisation, which is the last and most consequential step of
 * the garage: two Clio IVs with different engines take different filters, so
 * this is the choice the whole app hangs off. A list row gives it the same
 * weight as picking a make; a grid of tiles makes it look like what it is — a
 * small, closed set of options to compare side by side.
 *
 * `marked` is for an engine already in the garage. It gets the accent outline
 * and a check, the same treatment a selected item gets, because from the
 * customer's side "already chosen" and "chosen now" are the same fact.
 */
export function Tile({
  title,
  detail = null,
  note = null,
  marked = false,
  onPress,
}: {
  title: string;
  /** Fuel, power, code — whatever the shop recorded. Null renders nothing. */
  detail?: string | null;
  note?: string | null;
  marked?: boolean;
  onPress: () => void;
}) {
  const { rtl } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: marked }}
      accessibilityLabel={[title, detail, note].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        Elevation.resting,
        marked && styles.tileMarked,
        pressed && styles.tilePressed,
      ]}
    >
      {marked ? (
        <View style={[styles.check, rtl ? styles.checkRTL : styles.checkLTR]}>
          <Feather name="check" size={12} color={C.onAccent} />
        </View>
      ) : null}

      <View style={styles.tileBody}>
        <Text variant="rowTitle" numberOfLines={2}>
          {title}
        </Text>
        {detail ? (
          <Text variant="hint" numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>

      {note ? (
        <Text variant="hint" tone={C.textFaint} numberOfLines={1}>
          {note}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 104,
    backgroundColor: C.surface,
    borderRadius: Radius.tile,
    padding: Spacing.three,
    justifyContent: 'space-between',
    gap: Spacing.two,
    // The border is always there, transparent when unmarked, so marking a
    // tile does not change its size and shuffle the grid by 1.5pt.
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tileMarked: {
    borderColor: C.accent,
    backgroundColor: C.background,
  },
  tilePressed: {
    backgroundColor: C.surfacePressed,
  },
  check: {
    position: 'absolute',
    top: Spacing.two,
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLTR: {
    right: Spacing.two,
  },
  checkRTL: {
    left: Spacing.two,
  },
  tileBody: {
    gap: 1,
    // Leaves room for the check so a long engine name does not run under it.
    paddingRight: Spacing.four,
  },
});
