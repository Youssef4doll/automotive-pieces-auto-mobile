import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Brand, familyFor, Spacing, ZIndex } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { useAccount } from '@/store/account';

/**
 * The moment of signing in or out, drawn over the whole app.
 *
 * The shop's navy washes in, a disc springs up in the middle with a ring
 * opening out behind it — gold with a tick and "Bienvenue, Prénom" on the
 * way in, white with the door icon and "À bientôt" on the way out — and the
 * navy lifts away onto the screen the app has moved to underneath. About a
 * second and a half; it never takes a tap, so nothing waits on it. With
 * reduced motion on, the same words simply fade in and out.
 *
 * It reads `moment` from the account store, which only a sign-in, sign-up
 * or sign-out sets — never the quiet check of a saved session at launch.
 */
const IN_MS = 220;
const HOLD_MS = 950;
const OUT_MS = 320;

export function AuthMoment() {
  const moment = useAccount((s) => s.moment);
  const clear = useAccount((s) => s.clearMoment);
  const { t, rtl } = useI18n();
  const reduce = useReducedMotion();

  const wash = useSharedValue(0);
  const pop = useSharedValue(0);
  const ring = useSharedValue(0);
  const words = useSharedValue(0);

  useEffect(() => {
    if (!moment) return;
    const text = moment.kind === 'in' ? t('auth.welcome', { name: moment.name }) : t('auth.seeYou');
    AccessibilityInfo.announceForAccessibility(text);

    // The store keeps the moment until the navy has lifted, so the words
    // never vanish before it does.
    const done = () => clear();
    wash.value = withSequence(
      withTiming(1, { duration: IN_MS, easing: Easing.out(Easing.quad) }),
      withDelay(HOLD_MS, withTiming(0, { duration: OUT_MS, easing: Easing.in(Easing.quad) }, (fin) => fin && runOnJS(done)())),
    );
    if (reduce) {
      pop.value = 1;
      ring.value = 0;
      words.value = 1;
      return;
    }
    pop.value = 0;
    ring.value = 0;
    words.value = 0;
    pop.value = withDelay(IN_MS * 0.6, withSpring(1, { damping: 11, stiffness: 180, mass: 0.8 }));
    ring.value = withDelay(IN_MS, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    words.value = withDelay(IN_MS + 120, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
    // `at` makes a second sign-in in a row a new moment; t and clear are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment?.at]);

  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));
  const discStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + pop.value * 0.5 }, { rotate: `${(1 - pop.value) * -25}deg` }],
    opacity: Math.min(1, pop.value * 1.6),
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring.value * 1.1 }],
    opacity: (1 - ring.value) * 0.55,
  }));
  const wordsStyle = useAnimatedStyle(() => ({
    opacity: words.value,
    transform: [{ translateY: (1 - words.value) * 14 }],
  }));

  if (!moment) return null;
  const signedIn = moment.kind === 'in';
  const accent = signedIn ? Brand.gold500 : Brand.white;

  return (
    <Animated.View pointerEvents="none" style={[styles.wash, washStyle]} testID="auth-moment">
      <View style={styles.stage}>
        <Animated.View style={[styles.ring, { borderColor: accent }, ringStyle]} />
        <Animated.View style={[styles.disc, { backgroundColor: accent }, discStyle]}>
          <Feather
            name={signedIn ? 'check' : 'log-out'}
            size={40}
            color={Brand.navy950}
            style={!signedIn && rtl ? { transform: [{ scaleX: -1 }] } : undefined}
          />
        </Animated.View>
      </View>
      <Animated.View style={[styles.words, wordsStyle]}>
        <Text style={[styles.title, { fontFamily: familyFor('display', rtl) }]} numberOfLines={2}>
          {signedIn ? t('auth.welcome', { name: moment.name }) : t('auth.seeYou')}
        </Text>
        <Text style={[styles.body, { fontFamily: familyFor('body', rtl) }]} numberOfLines={2}>
          {signedIn ? t('auth.momentIn') : t('auth.signedOut')}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const DISC = 96;

const styles = StyleSheet.create({
  wash: {
    ...StyleSheet.absoluteFill,
    zIndex: ZIndex.toast + 1,
    backgroundColor: 'rgba(8, 22, 51, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  stage: { width: DISC * 2.4, height: DISC * 2.4, alignItems: 'center', justifyContent: 'center', marginBottom: -DISC * 0.6 },
  ring: { position: 'absolute', width: DISC, height: DISC, borderRadius: DISC / 2, borderWidth: 2 },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2, alignItems: 'center', justifyContent: 'center' },
  words: { alignItems: 'center', gap: Spacing.one, maxWidth: 420 },
  title: { fontSize: 26, lineHeight: 32, color: Brand.white, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, color: Brand.navy300, textAlign: 'center' },
});
