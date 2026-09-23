import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Brand } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

/**
 * A handful of paper bits, once, when an order goes through.
 *
 * Restrained on purpose: eighteen pieces in the shop's four colours, falling
 * about a third of the screen over a second and a half and fading as they
 * go. It marks the moment and gets out of the way of the reference number,
 * which is the thing on this screen the customer actually needs. It does not
 * loop and there is no sound.
 *
 * Nothing at all under Reduce Motion — not a shorter version. Falling,
 * spinning objects are exactly what that setting exists to switch off.
 */
const PIECES = 18;
const COLOURS = [Brand.gold500, Brand.navy900, Brand.gold400, Brand.navy300];

export function Confetti() {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        key: i,
        x: (width / PIECES) * i + Math.random() * 16 - 8,
        delay: Math.random() * 260,
        fall: 180 + Math.random() * 140,
        drift: Math.random() * 40 - 20,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
        colour: COLOURS[i % COLOURS.length],
        tall: i % 3 === 0,
      })),
    [width],
  );

  if (reduce) return null;

  return (
    <View pointerEvents="none" style={styles.layer} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {pieces.map(({ key, ...p }) => (
        <Piece key={key} {...p} />
      ))}
    </View>
  );
}

function Piece({
  x,
  delay,
  fall,
  drift,
  spin,
  colour,
  tall,
}: {
  x: number;
  delay: number;
  fall: number;
  drift: number;
  spin: number;
  colour: string;
  tall: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }));
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.7 ? 1 : 1 - (progress.value - 0.7) / 0.3,
    transform: [
      { translateY: -20 + progress.value * fall },
      { translateX: progress.value * drift },
      { rotate: `${progress.value * spin}deg` },
    ],
  }));

  return <Animated.View style={[styles.piece, { left: x, backgroundColor: colour, height: tall ? 12 : 7 }, style]} />;
}

const styles = StyleSheet.create({
  // Spelled out: react-native-web has no StyleSheet.absoluteFillObject.
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
    top: 0,
    width: 7,
    borderRadius: 1.5,
  },
});
