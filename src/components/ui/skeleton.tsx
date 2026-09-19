import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';

import { C, Radius, Spacing } from '@/constants/theme';

/**
 * The shape of the content, while the content is on its way.
 *
 * A skeleton beats a spinner here because the customer's eye can settle on
 * where the price and the name will be before they arrive, and because a
 * spinner in the middle of an empty screen says "wait" without saying what
 * for. It must match the real layout closely enough that nothing jumps when
 * the data lands — a skeleton of the wrong height is worse than none.
 *
 * `ReduceMotion.System` hands the decision to the operating system: with
 * "Reduce Motion" switched on, the pulse stops and the blocks are simply
 * there. The screen still says the same thing; it just stops moving.
 */
export function Skeleton({ style }: { style?: ViewStyle }) {
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 750, reduceMotion: ReduceMotion.System }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return <Animated.View style={[styles.block, style, animated]} />;
}

/** A list of product-card-shaped placeholders. */
export function ProductListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton style={styles.art} />
          <View style={styles.lines}>
            <Skeleton style={{ width: '35%', height: 10 }} />
            <Skeleton style={{ width: '85%', height: 14 }} />
            <Skeleton style={{ width: '55%', height: 20, borderRadius: Radius.tile }} />
            <Skeleton style={{ width: '45%', height: 18 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: C.surface,
    borderRadius: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: C.background,
  },
  art: {
    width: 72,
    height: 72,
    borderRadius: Radius.tile,
  },
  lines: {
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'center',
  },
});
