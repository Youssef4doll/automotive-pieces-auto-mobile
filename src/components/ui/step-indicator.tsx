import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Brand, C, familyFor, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * Where the customer is in a guided flow: dots on a line, a label under each.
 *
 * Done steps carry a check, the current one is the gold dot, the rest are
 * hollow — three states that do not rely on colour alone, and one sentence
 * for the screen reader ("Étape 2 sur 4 : Livraison") in place of four dots
 * it would otherwise read one by one.
 *
 * Deliberately not tappable. Going back is what the back gesture and the
 * header's back button are for; a stepper that is also navigation invites a
 * tap on "Paiement" from "Panier" that skips the address.
 */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  const { t, rtl } = useI18n();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('checkout.progress', { n: current + 1, total: steps.length, step: steps[current] })}
      accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}
      style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
    >
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.track, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              {/* `hidden` last: a later style wins, and with it first the
                  "done" colour painted a line off the edge of step one. */}
              <View style={[styles.line, i <= current && styles.lineDone, i === 0 && styles.hidden]} />
              <View style={[styles.dot, state === 'done' && styles.dotDone, state === 'current' && styles.dotCurrent]}>
                {state === 'done' ? <Feather name="check" size={10} color={Brand.white} /> : null}
              </View>
              <View style={[styles.line, i < current && styles.lineDone, i === steps.length - 1 && styles.hidden]} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: familyFor(state === 'current' ? 'display' : 'body', rtl),
                fontSize: 12,
                lineHeight: 16,
                color: state === 'upcoming' ? C.textFaint : C.text,
                textAlign: 'center',
              }}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 16;

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.two,
  },
  step: {
    flex: 1,
    gap: Spacing.one,
  },
  track: {
    alignItems: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: C.border,
  },
  lineDone: {
    backgroundColor: C.surfaceBrand,
  },
  hidden: {
    backgroundColor: 'transparent',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    borderColor: C.surfaceBrand,
    backgroundColor: C.surfaceBrand,
  },
  dotCurrent: {
    borderColor: C.surfaceBrand,
    backgroundColor: C.accent,
  },
});
