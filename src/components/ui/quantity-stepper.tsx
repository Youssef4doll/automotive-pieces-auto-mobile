import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Border, C, familyFor, IconSize, Radius, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * − 1 +
 *
 * Every button is a full 44pt target even though the control looks compact:
 * visual compactness is not the same thing as a small touch target, and a
 * quantity stepper is operated with a thumb on a phone held in one hand.
 *
 * At the floor the minus becomes a bin when `onRemove` is given — in the
 * basket, one fewer than one is "take it out", and a minus that silently did
 * nothing at 1 is a control that looks broken. On the product page there is
 * nothing to remove yet, so it simply stops.
 */
export function QuantityStepper({
  value,
  onChange,
  onRemove,
  min = 1,
  max = 99,
  size = 'normal',
}: {
  value: number;
  onChange: (value: number) => void;
  onRemove?: () => void;
  min?: number;
  max?: number;
  size?: 'normal' | 'compact';
}) {
  const { t, rtl } = useI18n();
  const atFloor = value <= min;
  const removes = atFloor && !!onRemove;
  const compact = size === 'compact';

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        { flexDirection: rtl ? 'row-reverse' : 'row', alignSelf: rtl ? 'flex-end' : 'flex-start' },
      ]}
      accessibilityRole="adjustable"
      accessibilityLabel={t('product.qty')}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) onChange(value + 1);
        if (e.nativeEvent.actionName === 'decrement') {
          if (value > min) onChange(value - 1);
          else onRemove?.();
        }
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={removes ? t('common.remove') : t('product.less')}
        accessibilityState={{ disabled: atFloor && !removes }}
        disabled={atFloor && !removes}
        hitSlop={4}
        onPress={() => (removes ? onRemove?.() : onChange(value - 1))}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Feather
          name={removes ? 'trash-2' : 'minus'}
          size={IconSize.medium}
          color={atFloor && !removes ? C.textFaint : removes ? C.danger : C.text}
        />
      </Pressable>

      <Text
        style={{ fontFamily: familyFor('headingStrong', rtl), fontSize: 17, lineHeight: 22, minWidth: 28, textAlign: 'center' }}
        // The screen reader already hears the value from the adjustable
        // container; reading the digit again is noise.
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {value}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('product.more')}
        accessibilityState={{ disabled: value >= max }}
        disabled={value >= max}
        hitSlop={4}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Feather name="plus" size={IconSize.medium} color={value >= max ? C.textFaint : C.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
    minHeight: Tap.primary,
  },
  wrapCompact: {
    minHeight: Tap.min,
  },
  button: {
    width: Tap.min,
    height: Tap.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  pressed: {
    backgroundColor: C.surfacePressed,
  },
});
