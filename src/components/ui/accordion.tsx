import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Border, C, familyFor, IconSize, Motion, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * A section that opens.
 *
 * For what a customer needs sometimes and a phone cannot show all at once —
 * the description, the specification rows, the forty engines a filter is
 * listed for, the OE numbers. What decides the purchase (price, stock,
 * compatibility with *their* car, the button) is never in one of these.
 *
 * `summary` is the answer in one line when the section is closed — "Listée
 * pour 12 motorisations", "3 références" — so the customer can decide whether
 * it is worth opening without opening it.
 *
 * The content fades in; it does not animate its height. Measuring an
 * unknown height and animating to it is the classic source of accordions
 * that jump, clip their last line, or stutter on a mid-range Android, and a
 * section that simply appears under its header reads just as well.
 */
export function Accordion({
  title,
  summary,
  initiallyOpen = false,
  children,
}: {
  title: string;
  summary?: string | null;
  initiallyOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const { rtl } = useI18n();

  // A row with a chevron that turns down as it opens — the reference's
  // "Description ›" list, rather than a drop-down arrow.
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? (rtl ? '-90deg' : '90deg') : '0deg', { duration: Motion.fast }) }],
  }));

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={summary ? `${title}, ${summary}` : title}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.header, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
      >
        <View style={styles.titles}>
          <Text variant="body" tone={C.text} style={{ fontFamily: familyFor('bodySemi', rtl) }}>
            {title}
          </Text>
          {summary && !open ? (
            <Text variant="hint" numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Animated.View style={chevron}>
          <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
        </Animated.View>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(Motion.normal).reduceMotion(ReduceMotion.System)} style={styles.body}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderTopWidth: Border.hairline,
    borderTopColor: C.border,
  },
  header: {
    minHeight: Tap.primary + Spacing.one,
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  body: {
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
});
