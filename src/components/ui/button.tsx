import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Border, Brand, C, familyFor, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * The shop has three buttons and one of them is gold.
 *
 * `primary` is a gold fill with navy text on it. That is the only place gold
 * is allowed: `gold-500` on white measures 2.09:1 and fails WCAG AA for text,
 * which the website found out the hard way, so there is no gold-text variant
 * here to reach for by mistake.
 *
 * `secondary` is a navy outline.
 *
 * `danger` is a red fill with white text, copied from the website's own
 * destructive buttons (`bg-red-600 … text-white`). It exists because the
 * garage's "retirer ce véhicule" confirmation was shipping with a gold
 * button on it, which is the shop's yes-do-this colour: the two buttons in
 * that dialog looked like a choice between cancelling and proceeding rather
 * than between keeping and deleting. Gold means go; it must not also mean
 * destroy.
 *
 * None of them has a disabled-looking-but-tappable state: a disabled button
 * in this app is genuinely not pressable and says why somewhere near itself.
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
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { rtl } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        FILL[variant],
        // Pressed is a darkening rather than an opacity fade: fading the
        // whole button takes the label down with it and the press reads as
        // the button going away.
        pressed && PRESSED[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text
          style={{
            ...Type.rowTitle,
            fontFamily: familyFor('display', rtl),
            color: LABEL[variant],
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const FILL = {
  primary: { backgroundColor: C.accent },
  secondary: { borderWidth: Border.selected, borderColor: C.text, backgroundColor: C.background },
  danger: { backgroundColor: C.danger },
} as const;

const PRESSED = {
  primary: { backgroundColor: Brand.gold600 },
  secondary: { backgroundColor: C.surface },
  danger: { backgroundColor: C.dangerPressed },
} as const;

const LABEL = {
  primary: C.onAccent,
  secondary: C.text,
  danger: C.textInverse,
} as const;

const styles = StyleSheet.create({
  base: {
    minHeight: Tap.primary,
    borderRadius: Radius.card,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  inner: {
    paddingVertical: Spacing.two,
  },
  disabled: {
    opacity: 0.4,
  },
});
