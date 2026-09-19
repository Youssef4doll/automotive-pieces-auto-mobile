import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { C, familyFor, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * The shop has two buttons and one of them is gold.
 *
 * `primary` is a gold fill with navy text on it. That is the only place gold
 * is allowed: `gold-500` on white measures 2.09:1 and fails WCAG AA for text,
 * which the website found out the hard way, so there is no gold-text variant
 * here to reach for by mistake.
 *
 * `secondary` is a navy outline. Neither has a disabled-looking-but-tappable
 * state: a disabled button in this app is genuinely not pressable and says
 * why somewhere near itself.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { rtl } = useI18n();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        // Pressed is a darkening rather than an opacity fade: fading the
        // whole button takes the navy label down with it and the press reads
        // as the button going away.
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text
          style={{
            ...Type.rowTitle,
            fontFamily: familyFor('display', rtl),
            color: primary ? C.onAccent : C.text,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Tap.primary,
    borderRadius: Radius.row,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  inner: {
    paddingVertical: Spacing.two,
  },
  primary: {
    backgroundColor: C.accent,
  },
  primaryPressed: {
    backgroundColor: '#e0ac00',
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: C.text,
    backgroundColor: C.background,
  },
  secondaryPressed: {
    backgroundColor: C.surface,
  },
  disabled: {
    opacity: 0.4,
  },
});
