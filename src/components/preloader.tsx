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
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Brand, LaunchBackground } from '@/constants/theme';

/**
 * The launch screen, carried on from the native splash.
 *
 * The phone shows the native splash (app.json: the same picture, the same
 * size, the same night) while JavaScript starts; this takes over on its first
 * frame at exactly that spot, so the hand-over cannot be seen, and then does
 * what a native splash cannot: a light passing over the glass, a gold line
 * running under it while the app gets ready — fonts, and the home screen's
 * first data asked for in the background so the home arrives filled — then
 * the whole thing lifts away.
 *
 * Never less than `MIN_MS` (a flash of the logo reads as a glitch), never
 * more than `MAX_MS` whatever the network does: a launch screen that waits
 * on a slow connection is a hang with a logo on it. With reduced motion on,
 * no light and no running line — it simply fades.
 */
const MIN_MS = 900;
const MAX_MS = 2600;
/** The picture's width in points — `imageWidth` of expo-splash-screen in app.json. */
export const SPLASH_WIDTH = 240;
/** Where the glass sits inside splash-icon.png (fractions of its side). */
const GLASS = { left: 0.227, top: 0.232, width: 0.547, height: 0.536, radius: 0.103 };

export function Preloader({ ready, onShown, onDone }: { ready: boolean; onShown: () => void; onDone: () => void }) {
  const reduce = useReducedMotion();
  const [minPassed, setMinPassed] = useState(false);
  const [capPassed, setCapPassed] = useState(false);
  const leaving = useRef(false);
  const shownOnce = useRef(false);

  const opacity = useSharedValue(1);
  const lift = useSharedValue(1);
  const shine = useSharedValue(-1);
  const run = useSharedValue(0);

  useEffect(() => {
    const a = setTimeout(() => setMinPassed(true), MIN_MS);
    const b = setTimeout(() => setCapPassed(true), MAX_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  useEffect(() => {
    if (reduce) return;
    // A light across the glass every 1.6 s, and a gold line running under it.
    shine.value = withDelay(250, withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false));
    run.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), -1, false);
  }, [reduce, shine, run]);

  /** Once: the native splash may go — this is on screen at its spot. */
  const shown = useCallback(() => {
    if (shownOnce.current) return;
    shownOnce.current = true;
    onShown();
  }, [onShown]);

  useEffect(() => {
    if (leaving.current || !minPassed || !(ready || capPassed)) return;
    leaving.current = true;
    // Should the picture never have reported in, the native splash still goes.
    shown();
    const motion = reduce ? ReduceMotion.Always : ReduceMotion.System;
    lift.value = withTiming(1.06, { duration: 320, easing: Easing.out(Easing.cubic), reduceMotion: motion });
    opacity.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [ready, capPassed, minPassed, reduce, lift, opacity, onDone, shown]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: lift.value }] }));
  const glassWidth = SPLASH_WIDTH * GLASS.width;
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shine.value * glassWidth * 1.4 }, { rotate: '18deg' }] }));
  const TRACK = 112;
  const BAR = 36;
  const runStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -BAR + run.value * (TRACK + BAR) }] }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
      accessibilityRole="progressbar"
      accessibilityLabel="Automotive Pièces Auto"
      testID="preloader"
    >
      <StatusBar style="light" />
      <Animated.View style={[styles.icon, iconStyle]}>
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.picture}
          contentFit="contain"
          onLoad={shown}
          // A picture that fails still hands over: the native splash must not stay up.
          onError={shown}
        />
        {!reduce ? (
          <View style={styles.glass} pointerEvents="none">
            <Animated.View style={[styles.shine, shineStyle]}>
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={Brand.white} stopOpacity="0" />
                    <Stop offset="0.5" stopColor={Brand.white} stopOpacity="0.28" />
                    <Stop offset="1" stopColor={Brand.white} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#shine)" />
              </Svg>
            </Animated.View>
          </View>
        ) : null}
      </Animated.View>
      <View style={[styles.track, { width: TRACK }]}>
        {!reduce ? <Animated.View style={[styles.bar, { width: BAR }, runStyle]} /> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: LaunchBackground, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  icon: { width: SPLASH_WIDTH, height: SPLASH_WIDTH },
  picture: { width: SPLASH_WIDTH, height: SPLASH_WIDTH },
  glass: {
    position: 'absolute',
    left: SPLASH_WIDTH * GLASS.left,
    top: SPLASH_WIDTH * GLASS.top,
    width: SPLASH_WIDTH * GLASS.width,
    height: SPLASH_WIDTH * GLASS.height,
    borderRadius: SPLASH_WIDTH * GLASS.radius,
    overflow: 'hidden',
  },
  shine: { position: 'absolute', top: '-30%', left: '-60%', width: '45%', height: '160%' },
  // Under the picture's own glow, far enough below it to read as separate.
  track: {
    position: 'absolute',
    top: '50%',
    marginTop: SPLASH_WIDTH / 2 - 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  bar: { height: 3, borderRadius: 2, backgroundColor: Brand.gold500 },
});
