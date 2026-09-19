import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * One tappable row, as a card.
 *
 * The garage's first two steps are screens of these, so the details matter.
 *
 * It is a card rather than a hairline-separated row because a list of ten
 * makes separated by 1px lines reads as a settings screen, and this is the
 * shop's front door. Cards with air between them also give the count on the
 * right somewhere to sit without colliding with the name.
 *
 * The whole card is the touch target, 64pt tall against the 44 minimum —
 * this is scrolled with a thumb by somebody holding a gearbox part in the
 * other hand.
 *
 * `subtitle` and `note` are `string | null`, not `string | undefined`, and a
 * null renders nothing. That is the shop's rule in the type system: a row
 * about a model with no recorded years shows the model and stops. No
 * placeholder, no "—", no "année inconnue".
 *
 * The chevron flips under RTL, and so does the row — a right-to-left list
 * with the chevron still on the right points back the way the customer came.
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

      {/* The count is a quiet pill, not a sentence in grey. It is a fact
          about the catalogue and it should read as a tag, not as a caption
          competing with the model's years on the line above. */}
      {note ? (
        <View style={styles.noteChip}>
          <Text variant="hint" tone={C.textMuted} numberOfLines={1}>
            {note}
          </Text>
        </View>
      ) : null}

      <Feather
        name={rtl ? 'chevron-left' : 'chevron-right'}
        size={20}
        color={C.textFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  noteChip: {
    flexShrink: 0,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.chip,
    backgroundColor: C.background,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  pressed: {
    backgroundColor: C.surfacePressed,
  },
});

export const ROW_MIN_HEIGHT = Math.max(64, Tap.min);
