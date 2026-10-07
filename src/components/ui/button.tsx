import { Feather, FontAwesome } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

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
 * `whatsapp` is WhatsApp's own: green, with its logo. A customer finds
 * WhatsApp by that mark and that colour before reading a word. The green is
 * the storefront's green-700 rather than WhatsApp's #25D366: white on #25D366
 * measures 2:1, and the label has to be read.
 *
 * None of them has a disabled-looking-but-tappable state: a disabled button
 * in this app is genuinely not pressable and says why somewhere near itself.
 *
 * `loading` keeps the label and adds a spinner beside it rather than swapping
 * the label out. "Confirmer la commande" turning into a bare spinner leaves
 * the customer unsure what is being waited on; the words staying put, dimmed
 * a little, says "this is happening". It is also not pressable while loading,
 * which is what stops a second tap from placing a second order.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'whatsapp';
  disabled?: boolean;
  loading?: boolean;
  /** A leading Feather glyph, for the few buttons whose verb is clearer with one. */
  icon?: React.ComponentProps<typeof Feather>['name'];
  style?: ViewStyle;
  testID?: string;
}) {
  const { rtl } = useI18n();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
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
      <View style={[styles.inner, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        {loading ? (
          <ActivityIndicator size="small" color={LABEL[variant]} />
        ) : variant === 'whatsapp' ? (
          <FontAwesome name="whatsapp" size={22} color={LABEL[variant]} />
        ) : icon ? (
          <Feather name={icon} size={18} color={LABEL[variant]} />
        ) : null}
        <Text
          style={{
            ...Type.rowTitle,
            fontFamily: familyFor('display', rtl),
            color: LABEL[variant],
            textAlign: 'center',
            opacity: loading ? 0.75 : 1,
            flexShrink: 1,
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
  whatsapp: { backgroundColor: Brand.green700 },
} as const;

const PRESSED = {
  primary: { backgroundColor: Brand.gold600 },
  secondary: { backgroundColor: C.surface },
  danger: { backgroundColor: C.dangerPressed },
  whatsapp: { backgroundColor: Brand.green800 },
} as const;

const LABEL = {
  primary: C.onAccent,
  secondary: C.text,
  danger: C.textInverse,
  whatsapp: Brand.white,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  disabled: {
    opacity: 0.4,
  },
});
