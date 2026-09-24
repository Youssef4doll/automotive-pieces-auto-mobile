import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * A card that answers the thumb: it settles to 97% while pressed and springs
 * back on release — the physical "I felt that" of a native list, instead of
 * a colour flash that says nothing about which card was touched.
 *
 * The scale runs on the UI thread (Reanimated), so it keeps up with the
 * finger on a slow Android. Reduce Motion turns it into no movement at all;
 * `pressedStyle` still marks the press, so the feedback never depends on the
 * animation.
 */
export function PressScale({
  style,
  pressedStyle,
  scaleTo = 0.97,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
}) {
  const scale = useSharedValue(1);
  // Tracked here rather than through Pressable's style callback: an animated
  // component's style must be a value, not a function.
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const spring = { ...Motion.spring, reduceMotion: ReduceMotion.System };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, spring));
        setPressed(true);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, spring));
        setPressed(false);
        rest.onPressOut?.(e);
      }}
      style={[style, pressed && pressedStyle, animated]}
    >
      {typeof children === 'function' ? children({ pressed }) : children}
    </AnimatedPressable>
  );
}
