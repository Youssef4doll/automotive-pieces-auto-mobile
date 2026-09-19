import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, IconSize, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * A section's title, and its one optional action.
 *
 * One action, not a row of them: a section that offers "Voir tout", "Filtrer"
 * and "Trier" above the content has three things competing with the content
 * itself. Where more are genuinely needed they belong in a sheet behind a
 * single control.
 */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  const { rtl } = useI18n();

  return (
    <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <Text variant="sectionTitle" style={styles.title}>
        {title}
      </Text>

      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            { flexDirection: rtl ? 'row-reverse' : 'row' },
            pressed && styles.pressed,
          ]}
        >
          <Text variant="hint" tone={C.text}>
            {action.label}
          </Text>
          <Feather
            name={rtl ? 'arrow-left' : 'arrow-right'}
            size={IconSize.small}
            color={C.text}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  action: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.two,
    marginHorizontal: -Spacing.two,
    borderRadius: Spacing.two,
  },
  pressed: {
    backgroundColor: C.surface,
  },
});
