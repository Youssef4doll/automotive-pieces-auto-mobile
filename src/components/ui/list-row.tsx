import { Pressable, StyleSheet, View } from 'react-native';

import { C, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * One tappable row: a title, an optional line under it, an optional trailing
 * note, and a chevron.
 *
 * The garage is three screens of these, so the details are worth stating.
 *
 * The whole row is the touch target, 56pt tall rather than the 44 minimum —
 * this is a list somebody scrolls with a thumb while holding a gearbox part
 * in the other hand, and the rows are mostly short words with a lot of space
 * between them.
 *
 * `subtitle` and `note` are `string | null`, not `string | undefined`, and a
 * null renders nothing. That is the shop's rule in the type system: a row
 * about a model with no recorded years shows the model and stops. There is no
 * placeholder, no "—", no "année inconnue".
 *
 * The chevron flips under RTL, and so does the row, because a right-to-left
 * list with the chevron still on the right points back the way the customer
 * came.
 */
export function ListRow({
  title,
  subtitle = null,
  note = null,
  onPress,
  selected = false,
}: {
  title: string;
  subtitle?: string | null;
  note?: string | null;
  onPress: () => void;
  /** Marks the row the app currently answers for. Not a hover state. */
  selected?: boolean;
}) {
  const { rtl } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, note].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.text}>
        <Text variant="rowTitle">{title}</Text>
        {subtitle ? <Text variant="hint">{subtitle}</Text> : null}
      </View>

      {note ? (
        <Text variant="hint" style={styles.note}>
          {note}
        </Text>
      ) : null}

      <Text variant="rowTitle" tone={C.textMuted} style={styles.chevron}>
        {rtl ? '‹' : '›'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.row,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  note: {
    // The count must not push the name off the row on a narrow phone, and it
    // must not wrap onto two lines either.
    flexShrink: 0,
    textAlign: 'right',
  },
  chevron: {
    flexShrink: 0,
    minWidth: Spacing.three,
    textAlign: 'center',
  },
  selected: {
    backgroundColor: C.surface,
  },
  pressed: {
    backgroundColor: C.surface,
  },
});

export const ROW_MIN_HEIGHT = Math.max(56, Tap.min);
