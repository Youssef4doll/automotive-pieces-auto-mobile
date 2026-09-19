import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { C, familyFor, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * The breadcrumb across the top of the garage picker.
 *
 * It replaces "ÉTAPE 1 SUR 3", which told the customer how far along they
 * were and nothing else. This tells them the same thing and also what they
 * have already chosen — "Renault · Clio IV · Motorisation" — which is the
 * question they actually have at step three, and it doubles as the way back.
 *
 * A step that is done shows the chosen name and is tappable; the current step
 * shows what is being asked and is filled; steps not reached yet are dimmed
 * and inert. Nothing here looks pressable unless it is, which is the whole
 * reason this is not three identical pills.
 */
export type TrailStep = {
  /** The chosen value once the step is done, otherwise what it is asking. */
  label: string;
  state: 'done' | 'current' | 'upcoming';
  /** Present only on a done step — goes back to it. */
  onPress?: () => void;
};

export function Trail({ steps }: { steps: TrailStep[] }) {
  const { rtl } = useI18n();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Under RTL the row runs the other way, and the scroll view has to
      // start at the other end or the first step begins off-screen.
      contentContainerStyle={[
        styles.trail,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
      ]}
    >
      {steps.map((step, index) => (
        <View
          key={`${step.label}-${index}`}
          style={[styles.trailItem, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
        >
          {index > 0 ? (
            <Feather
              name={rtl ? 'chevron-left' : 'chevron-right'}
              size={14}
              color={C.textFaint}
              style={styles.trailArrow}
            />
          ) : null}

          <Pressable
            accessibilityRole={step.onPress ? 'button' : undefined}
            disabled={!step.onPress}
            onPress={step.onPress}
            style={({ pressed }) => [
              styles.chip,
              step.state === 'current' && styles.chipCurrent,
              step.state === 'upcoming' && styles.chipUpcoming,
              pressed && step.onPress && styles.chipPressed,
            ]}
          >
            <Text
              style={{
                ...Type.hint,
                fontFamily: familyFor('display', rtl),
                color:
                  step.state === 'current'
                    ? C.onAccent
                    : step.state === 'upcoming'
                      ? C.textFaint
                      : C.text,
              }}
            >
              {step.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  trail: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  trailItem: {
    alignItems: 'center',
  },
  trailArrow: {
    marginHorizontal: Spacing.half,
  },
  chip: {
    minHeight: Tap.compact,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.chip,
    backgroundColor: C.surface,
  },
  chipCurrent: {
    backgroundColor: C.accent,
  },
  chipUpcoming: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.border,
  },
  chipPressed: {
    backgroundColor: C.surfacePressed,
  },
});
