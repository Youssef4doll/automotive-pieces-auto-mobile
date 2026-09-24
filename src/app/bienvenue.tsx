import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Brand, familyFor, MaxContentWidth, Spacing, Tap } from '@/constants/theme';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { track } from '@/services/analytics';
import { useAccount } from '@/store/account';
import { useOnboarding } from '@/store/onboarding';

const LOGO = require('../../assets/images/logo-lockup.png');

/**
 * Bienvenue — the first launch, in three short steps and never again:
 *
 *   1. What the app does, in four true sentences. The third one says that
 *      the shop may not have checked a part yet, because that is the normal
 *      case in this catalogue (BRIEF.md §8) and the app is built around it.
 *   2. An account — optional, and said to be. "Continuer sans compte" is the
 *      primary button: nobody is steered into registering before they have
 *      seen a single part.
 *   3. The car, which is what makes every later screen useful — or "Plus
 *      tard".
 *
 * No permission is asked here. The camera and photos are asked for on the
 * screen that uses them, when the customer has just tapped the thing that
 * needs them. "Passer" is on every step.
 */
export default function WelcomeScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const finish = useOnboarding((s) => s.finish);
  const signedIn = useAccount((s) => s.status === 'signedIn');
  const [step, setStep] = useState(0);
  // Read once, on arrival: somebody who has already been through it and
  // comes back (a back gesture, a stale link) goes home. Not re-read while
  // the steps run, or finishing would race the navigation it starts.
  const [alreadyDone] = useState(() => useOnboarding.getState().done);

  useEffect(() => {
    if (!alreadyDone) track('onboarding_started');
  }, [alreadyDone]);

  const done = (next: 'home' | 'picker' | 'vin', how: string) => {
    finish();
    track('onboarding_completed', { how, signedIn });
    router.replace('/');
    if (next === 'picker') router.push('/garage/ajouter');
    if (next === 'vin') router.push('/garage/vin');
  };

  if (alreadyDone) return <Redirect href="/" />;

  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const lines: { icon: React.ComponentProps<typeof Feather>['name'] | 'car'; text: string }[] = [
    { icon: 'car', text: t('welcome.v1') },
    { icon: 'search', text: t('welcome.v2') },
    { icon: 'check-circle', text: t('welcome.v3') },
    { icon: 'dollar-sign', text: t('welcome.v4') },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.three }]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar style="light" />
      <View style={[styles.column, styles.top, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" accessibilityLabel={t('app.name')} />
        <Pressable accessibilityRole="button" onPress={() => done('home', `skip-${step + 1}`)} style={styles.skip} hitSlop={8}>
          <Text style={[styles.skipText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('welcome.skip')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <Animated.View key={step} entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)} style={styles.column}>
          {step === 0 ? (
            <>
              <Text style={[styles.title, align, { fontFamily: familyFor('headingStrong', rtl) }]} accessibilityRole="header">
                {t('look.slogan1')} {t('look.slogan2')}
                <Text style={[styles.title, styles.accent, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('look.slogan2Accent')}</Text>
              </Text>
              <View style={styles.lines}>
                {lines.map((l) => (
                  <View key={l.icon} style={[styles.line, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                    <View style={styles.lineIcon}>
                      {l.icon === 'car' ? <NavCar size={18} color={Brand.navy950} /> : <Feather name={l.icon} size={18} color={Brand.navy950} />}
                    </View>
                    <Text style={[styles.body, align, styles.flex, { fontFamily: familyFor('body', rtl) }]}>{l.text}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : step === 1 ? (
            <>
              <Text style={[styles.title, align, { fontFamily: familyFor('headingStrong', rtl) }]} accessibilityRole="header">
                {t('welcome.accountTitle')}
              </Text>
              <Text style={[styles.body, align, { fontFamily: familyFor('body', rtl) }]}>{t('welcome.accountWhy')}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.title, align, { fontFamily: familyFor('headingStrong', rtl) }]} accessibilityRole="header">
                {t('welcome.carTitle')}
              </Text>
              <Text style={[styles.body, align, { fontFamily: familyFor('body', rtl) }]}>{t('welcome.carWhy')}</Text>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.column, styles.actions]}>
        <View
          style={[styles.dots, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
          accessible
          accessibilityLabel={t('welcome.step', { n: step + 1 })}
        >
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>
        {step === 0 ? (
          <Button label={t('welcome.start')} onPress={() => setStep(1)} />
        ) : step === 1 ? (
          signedIn ? (
            <Button label={t('welcome.start')} onPress={() => setStep(2)} />
          ) : (
            <>
              <Button label={t('welcome.guest')} onPress={() => setStep(2)} />
              <Button
                label={t('auth.signIn')}
                variant="secondary"
                onPress={() => {
                  // On the way back from signing in, the car is next.
                  setStep(2);
                  router.push('/compte/connexion');
                }}
              />
            </>
          )
        ) : (
          <>
            <Button label={t('look.changeVehicle')} onPress={() => done('picker', 'picker')} />
            <Button label={t('welcome.vin')} variant="secondary" onPress={() => done('vin', 'vin')} />
            <Pressable accessibilityRole="button" onPress={() => done('home', 'later')} style={styles.later}>
              <Text style={[styles.skipText, { fontFamily: familyFor('bodySemi', rtl), textAlign: 'center' }]}>{t('welcome.later')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.navy950 },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four },
  top: { alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.three },
  logo: { width: 176, height: 32 },
  skip: { minHeight: Tap.min, minWidth: Tap.min, justifyContent: 'center', alignItems: 'center' },
  skipText: { fontSize: 15, color: Brand.navy300 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.five },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.4, color: Brand.white },
  accent: { color: Brand.gold500 },
  body: { fontSize: 17, lineHeight: 25, color: Brand.navy50, marginTop: Spacing.three },
  lines: { marginTop: Spacing.three },
  line: { alignItems: 'flex-start', gap: Spacing.three },
  lineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.gold500,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  flex: { flex: 1 },
  actions: { gap: Spacing.three },
  dots: { justifyContent: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.navy700 },
  dotOn: { width: 24, backgroundColor: Brand.gold500 },
  later: { minHeight: Tap.min, justifyContent: 'center' },
});
