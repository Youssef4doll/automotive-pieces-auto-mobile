import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { LaunchBackground } from '@/constants/theme';

/**
 * The launch screen, carried on from the native splash.
 *
 * Just the shop's name — AUTOMOTIVE and PIÈCES AUTO, white on the shop's
 * navy — no tile, no frame. The phone's native splash (app.json) shows the
 * name alone while JavaScript starts; this takes over on its first frame at
 * exactly that spot, then draws the logo's red swoosh in under the name,
 * left to right, the way a pen would. When the app is ready it lifts away.
 *
 * The two pictures are cut from the shop's logo file by make-icons.mjs, on
 * the same square, so they stack exactly.
 *
 * Never less than `MIN_MS` (a flash of the logo reads as a glitch), never
 * more than `MAX_MS` whatever the network does: a launch screen that waits
 * on a slow connection is a hang with a logo on it. With reduced motion on,
 * the swoosh is simply there and the screen fades.
 */
const MIN_MS = 1000;
const MAX_MS = 2600;
/** The picture's side in points — `imageWidth` of expo-splash-screen in app.json. */
export const SPLASH_WIDTH = 360;

export function Preloader({ ready, onShown, onDone }: { ready: boolean; onShown: () => void; onDone: () => void }) {
  const reduce = useReducedMotion();
  const [minPassed, setMinPassed] = useState(false);
  const [capPassed, setCapPassed] = useState(false);
  const [painted, setPainted] = useState(false);
  const leaving = useRef(false);
  const shownOnce = useRef(false);

  const opacity = useSharedValue(1);
  const lift = useSharedValue(1);
  const draw = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    const a = setTimeout(() => setMinPassed(true), MIN_MS);
    const b = setTimeout(() => setCapPassed(true), MAX_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  /** Once: the native splash may go — this is on screen at its spot. */
  const shown = useCallback(() => {
    if (shownOnce.current) return;
    shownOnce.current = true;
    onShown();
    setPainted(true);
  }, [onShown]);

  // The name is on screen: draw the swoosh in under it.
  useEffect(() => {
    if (!painted || reduce) return;
    draw.value = withDelay(120, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [painted, reduce, draw]);

  useEffect(() => {
    if (leaving.current || !minPassed || !(ready || capPassed)) return;
    leaving.current = true;
    // Should the picture never have reported in, the native splash still goes.
    shown();
    const motion = reduce ? ReduceMotion.Always : ReduceMotion.System;
    lift.value = withTiming(1.04, { duration: 300, easing: Easing.out(Easing.cubic), reduceMotion: motion });
    opacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [ready, capPassed, minPassed, reduce, lift, opacity, onDone, shown]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: lift.value }] }));
  // The swoosh is revealed by a window opening from the left: the logo is
  // never mirrored, in any language.
  const drawStyle = useAnimatedStyle(() => ({ width: draw.value * SPLASH_WIDTH }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
      accessibilityRole="progressbar"
      accessibilityLabel="Automotive Pièces Auto"
      testID="preloader"
    >
      <StatusBar style="light" />
      <Animated.View style={[styles.logo, logoStyle]}>
        <View style={styles.window}>
          <Animated.View style={[styles.window, styles.reveal, drawStyle]} testID="preloader-swoosh">
            <Image source={require('@/assets/images/splash-swoosh.png')} style={styles.picture} contentFit="contain" />
          </Animated.View>
        </View>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.picture}
          contentFit="contain"
          onLoad={shown}
          // A picture that fails still hands over: the native splash must not stay up.
          onError={shown}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: LaunchBackground, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  logo: { width: SPLASH_WIDTH, height: SPLASH_WIDTH },
  picture: { width: SPLASH_WIDTH, height: SPLASH_WIDTH },
  window: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  reveal: { right: undefined, overflow: 'hidden' },
});
