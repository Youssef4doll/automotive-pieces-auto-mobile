import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Brand, C, familyFor } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * "Que recherchez-vous ?" — three round doors on an arc, the middle one big.
 *
 * The reference's signature: white bubbles floating over the night road, the
 * centre one large with a gold ring, its neighbours smaller and a little
 * lower, on a faint arc with a gold dot at its crown. With more than three
 * ways in, the row swipes and snaps, and whichever bubble is centred grows
 * into the big one — scale, drop and ring all derived from the scroll
 * position on the UI thread, as in the card arc this replaced.
 *
 * Under Reduce Motion the bubbles keep their sizes by position but nothing
 * animates between them.
 */
export type BubbleItem = {
  key: string;
  icon: React.ReactNode;
  label: string;
  /** One line under the arc while this bubble is centred: what tapping it does. */
  hint?: string;
  onPress: () => void;
};

const WEB_SNAP = Platform.OS === 'web' ? ({ scrollSnapType: 'x mandatory' } as unknown as ViewStyle) : null;
const WEB_SNAP_CHILD = Platform.OS === 'web' ? ({ scrollSnapAlign: 'center' } as unknown as ViewStyle) : null;

/** Scale and drop of a bubble one step, and two steps, off centre. */
const SIDE = { scale: 0.64, drop: 16 };
const FAR = { scale: 0.52, drop: 28 };

export function BubbleArc({ items, initial = 0 }: { items: BubbleItem[]; initial?: number }) {
  const { rtl } = useI18n();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const ordered = useMemo(() => (rtl ? [...items].reverse() : items), [items, rtl]);
  const start = rtl ? items.length - 1 - initial : initial;

  const slide = width ? Math.round(width * 0.34) : 0;
  const diameter = Math.min(156, Math.round(slide * 1.12));
  const pad = width ? (width - slide) / 2 : 0;
  const height = diameter + FAR.drop + 24;

  const x = useSharedValue(start * slide);
  const scroller = useAnimatedRef<Animated.ScrollView>();

  // Open on the middle door. `contentOffset` does this on iOS and Android and
  // is ignored by react-native-web, so the position is also set once the
  // width is known.
  useEffect(() => {
    if (!slide) return;
    x.set(start * slide);
    const id = requestAnimationFrame(() => scroller.current?.scrollTo({ x: start * slide, animated: false }));
    return () => cancelAnimationFrame(id);
  }, [slide, start, scroller, x]);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });

  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width)), []);

  // Which bubble is centred, for the caption and for the tap rule below.
  // Updated only when the rounded index changes, not on every frame.
  const [centred, setCentred] = useState(start);
  useAnimatedReaction(
    () => (slide ? Math.round(x.value / slide) : start),
    (now, before) => {
      if (now !== before) runOnJS(setCentred)(now);
    },
    [slide, start],
  );

  // A radial menu's rule: a side bubble comes to the centre first, the
  // centred one goes. One tap on the obvious choice, two on any other —
  // and never a jump somewhere the customer did not see coming.
  // …except with a screen reader, where a first activation that only moves
  // things would be a trap: there, every bubble acts on its first activation.
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    // react-native-web answers `true` unconditionally — it cannot know — so
    // on the web the radial rule stands; browsers' screen readers activate
    // the element they are on, which is the centred one after a swipe.
    if (Platform.OS === 'web') return;
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => alive && setScreenReader(on)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const press = useCallback(
    (index: number) => {
      const current = slide ? Math.round(x.get() / slide) : start;
      if (index === current || screenReader) {
        ordered[index]?.onPress();
        return;
      }
      scroller.current?.scrollTo({ x: index * slide, animated: !reduce });
    },
    [slide, start, x, ordered, scroller, reduce, screenReader],
  );
  const hint = ordered[Math.min(Math.max(centred, 0), ordered.length - 1)]?.hint;

  return (
    <View>
    <View onLayout={onLayout} style={{ height }}>
      {width ? (
        <>
          {/* The arc and its crown, drawn behind the bubbles. */}
          <Svg width={width} height={height} style={styles.arc} pointerEvents="none">
            <Path
              d={`M -20 ${height * 0.78} Q ${width / 2} ${-height * 0.34} ${width + 20} ${height * 0.78}`}
              stroke={Brand.white}
              strokeOpacity={0.22}
              strokeWidth={1.2}
              fill="none"
            />
            <Circle cx={width / 2} cy={height * 0.22 - diameter / 2 + 8} r={4} fill={Brand.gold500} />
          </Svg>
          <Animated.ScrollView
            ref={scroller}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={slide}
            decelerationRate="fast"
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentOffset={{ x: start * slide, y: 0 }}
            style={WEB_SNAP}
            contentContainerStyle={{ paddingHorizontal: pad, alignItems: 'flex-start' }}
          >
            {ordered.map((item, i) => (
              <Bubble
                key={item.key}
                item={item}
                index={i}
                slide={slide}
                diameter={diameter}
                x={x}
                flat={reduce}
                start={start}
                centred={i === centred}
                onPress={() => press(i)}
              />
            ))}
          </Animated.ScrollView>
        </>
      ) : null}
    </View>
      {hint ? (
        <Text
          accessibilityLiveRegion="polite"
          numberOfLines={1}
          style={{ fontFamily: familyFor('body', rtl), fontSize: 14, lineHeight: 19, color: '#c7d1e3', textAlign: 'center', paddingHorizontal: 24 }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function Bubble({
  item,
  index,
  slide,
  diameter,
  x,
  flat,
  start,
  centred,
  onPress,
}: {
  item: BubbleItem;
  index: number;
  slide: number;
  diameter: number;
  x: { value: number };
  flat: boolean;
  start: number;
  centred: boolean;
  onPress: () => void;
}) {
  const { rtl } = useI18n();

  const body = useAnimatedStyle(() => {
    const d = flat ? Math.abs(index - start) : Math.abs(x.value / slide - index);
    return {
      transform: [
        { translateY: interpolate(d, [0, 1, 2], [0, SIDE.drop, FAR.drop], Extrapolation.CLAMP) },
        { scale: interpolate(d, [0, 1, 2], [1, SIDE.scale, FAR.scale], Extrapolation.CLAMP) },
      ],
    };
  });
  const ring = useAnimatedStyle(() => {
    const d = flat ? Math.abs(index - start) : Math.abs(x.value / slide - index);
    return { opacity: interpolate(d, [0, 0.6], [1, 0], Extrapolation.CLAMP) };
  });

  return (
    <View style={[{ width: slide, alignItems: 'center' }, WEB_SNAP_CHILD]}>
      <Animated.View style={[{ width: diameter, height: diameter }, body]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            { width: diameter + 16, height: diameter + 16, borderRadius: (diameter + 16) / 2, top: -8, left: -8 },
            ring,
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityHint={centred ? item.hint : undefined}
          onPress={onPress}
          style={({ pressed }) => [
            styles.bubble,
            { width: diameter, height: diameter, borderRadius: diameter / 2 },
            pressed && styles.pressed,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.ring, { borderRadius: diameter / 2 }, ring]}
          />
          <View style={styles.icon}>{item.icon}</View>
          <Text
            numberOfLines={2}
            style={{
              fontFamily: familyFor('bodySemi', rtl),
              fontSize: 15,
              lineHeight: 19,
              color: C.text,
              textAlign: 'center',
              paddingHorizontal: 14,
            }}
          >
            {item.label}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  arc: { position: 'absolute', top: 0, left: 0 },
  bubble: {
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  pressed: {
    backgroundColor: C.surface,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: Brand.gold500,
  },
  halo: {
    position: 'absolute',
    borderWidth: 6,
    borderColor: 'rgba(255,210,61,0.18)',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
