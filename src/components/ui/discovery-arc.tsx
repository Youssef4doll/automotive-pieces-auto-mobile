import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Arc, Border, Brand, C, Elevation, Radius, Spacing } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * "Que cherchez-vous ?" — the ways into the catalogue, along a shallow arc.
 *
 * This is the home screen's signature interaction, and the reason it is an
 * arc rather than a row of cards is not decoration. A parts shop's hardest
 * moment is the first one: the customer is holding a broken thing and does
 * not know whether they know its name, their car's engine code, or nothing at
 * all. A grid of equal cards asks them to read four labels and judge which
 * one describes them. A path asks them to move along it until something looks
 * like their situation, which is a smaller question.
 *
 * ## How it moves
 *
 * A horizontal scroll view that snaps to one card per page. Each card's
 * vertical offset, scale and opacity are derived from the scroll position, so
 * the active card sits at the top of a shallow dome and its neighbours fall
 * away either side:
 *
 *              ( ● )
 *       ( ○ )         ( ○ )
 *
 * All of that runs on the UI thread. `useAnimatedScrollHandler` writes one
 * shared value and every card reads it inside a worklet — React renders each
 * card exactly once and is not involved in the gesture at all. The only thing
 * that crosses back to JavaScript is the active index, and only when it
 * actually changes (see `useAnimatedReaction` below), because the selected
 * state has to reach the accessibility tree and that lives in React.
 *
 * ## Why there are no dots
 *
 * The scroll affordance is the peek: a slide is 62% of the container, so the
 * next card is always about a third visible at the edge. That is a stronger
 * signal than a row of dots because it shows *what* is next rather than how
 * many there are, and it costs no vertical space. The card's number ("02")
 * carries the counting.
 *
 * ## What it refuses to do
 *
 * It does not fill itself with intents that lead nowhere. `items` is whatever
 * the caller can actually honour, and on a screen where a route is not built
 * yet the card is absent rather than present-and-disappointing. An arc of six
 * is prettier than an arc of three; an arc of six where three are dead ends
 * teaches the customer that this app's front door is decoration.
 */
/**
 * Snapping, on the web.
 *
 * `snapToInterval` is a real ScrollView prop on iOS and Android and a no-op
 * on react-native-web — measured, not assumed: the scroller's computed
 * `scroll-snap-type` came back `none` with the prop set. Without this the
 * arc drifts to a stop between two cards in a browser, which is both wrong
 * in itself and misleading during development, because the dev surface is
 * where this component gets looked at.
 *
 * `center` rather than `start` because the track is padded by half the
 * leftover width either side, so each card is already centred at its own
 * snap position; `start` would need a matching `scroll-padding` and would
 * break the moment the padding changed.
 *
 * The casts are the cost of naming two CSS properties React Native's own
 * style types do not have. They are confined to these two constants.
 */
const WEB_SNAP =
  Platform.OS === 'web' ? ({ scrollSnapType: 'x mandatory' } as unknown as ViewStyle) : null;
const WEB_SNAP_CHILD =
  Platform.OS === 'web' ? ({ scrollSnapAlign: 'center' } as unknown as ViewStyle) : null;

export type DiscoveryItem = {
  key: string;
  /** "01", "02" — position along the path, not a database id. */
  artwork: React.ReactNode;
  title: string;
  hint: string;
  onPress: () => void;
};

export function DiscoveryArc({ items }: { items: DiscoveryItem[] }) {
  const { rtl } = useI18n();
  const flat = useReduceMotion();

  /**
   * Measured, not taken from the window.
   *
   * The home screen is capped at `MaxContentWidth` and centred on a tablet,
   * so the window is 1024 while this component is 800. Sizing the slide off
   * the window put the snap interval 40% wider than the cards on every iPad.
   */
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(Math.round(e.nativeEvent.layout.width));
  }, []);

  const slide = useMemo(() => {
    if (width <= 0) return 0;
    // Never wider than the container itself — on a 320pt phone the clamp
    // floor would otherwise exceed the screen and kill the peek entirely.
    return Math.min(width, Math.max(Arc.slideMin, Math.min(Arc.slideMax, width * Arc.slideRatio)));
  }, [width]);

  const sidePad = slide > 0 ? Math.max(0, (width - slide) / 2) : 0;

  /**
   * In Arabic the path runs the other way.
   *
   * Rather than fight a right-to-left scroll view — whose content offset is
   * measured from a different edge on every platform, and differently again
   * on the web — the list is reversed and the scroll stays ordinary
   * left-to-right. Item 01 then sits at the right-hand end, which is where an
   * Arabic reader starts, and the initial offset puts it under the thumb.
   */
  const ordered = useMemo(() => (rtl ? [...items].reverse() : items), [items, rtl]);
  const indexOf = useCallback(
    (position: number) => (rtl ? items.length - 1 - position : position),
    [items.length, rtl],
  );

  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // The active card, in React, for `accessibilityState` and the live region.
  // Seeded to the card the arc actually opens on, which under RTL is the last.
  const [active, setActive] = useState(0);
  useAnimatedReaction(
    () => (slide > 0 ? Math.round(scrollX.value / slide) : 0),
    (current, previous) => {
      // Only when it changes. A `runOnJS` per frame is the exact thing this
      // component is built to avoid.
      if (current !== previous) runOnJS(setActive)(current);
    },
    [slide],
  );

  const scroller = useRef<ScrollView>(null);
  /**
   * Tab-focusing a card off the edge scrolls it into view.
   *
   * Without this, keyboard users on the web could focus a card they cannot
   * see and press it blind. It is the keyboard's equivalent of the swipe.
   */
  const revealOnFocus = useCallback(
    (position: number) => {
      if (slide <= 0) return;
      scroller.current?.scrollTo({ x: position * slide, animated: !flat });
    },
    [slide, flat],
  );

  // React Native fires momentum end on native; react-native-web does not
  // always. The reaction above is the real source of truth for `active`, so
  // this only exists to settle the index after a slow drag that never gained
  // momentum on platforms where that is possible.
  const settle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (slide <= 0) return;
      setActive(Math.round(e.nativeEvent.contentOffset.x / slide));
    },
    [slide],
  );

  return (
    <View onLayout={onLayout} style={styles.frame}>
      {slide > 0 ? (
        <Animated.ScrollView
          ref={scroller as never}
          horizontal
          showsHorizontalScrollIndicator={false}
          // One card per page, with a deceleration that stops rather than
          // glides. "normal" on a 62%-width slide overshoots by two cards.
          snapToInterval={slide}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
          scrollEventThrottle={16}
          style={WEB_SNAP}
          onScroll={onScroll}
          onMomentumScrollEnd={settle}
          onScrollEndDrag={settle}
          contentOffset={{ x: rtl ? (items.length - 1) * slide : 0, y: 0 }}
          contentContainerStyle={[
            styles.track,
            { paddingHorizontal: sidePad, paddingBottom: Arc.liftFar },
          ]}
        >
          {ordered.map((item, position) => (
            <Bubble
              key={item.key}
              item={item}
              number={indexOf(position) + 1}
              total={items.length}
              position={position}
              slide={slide}
              scrollX={scrollX}
              flat={flat}
              selected={position === active}
              onFocus={() => revealOnFocus(position)}
            />
          ))}
        </Animated.ScrollView>
      ) : (
        // One frame, before the container has a width. Reserving the height
        // stops the sections below it jumping up and then back down.
        <View style={{ height: CARD_HEIGHT + Arc.liftFar }} />
      )}
    </View>
  );
}

/**
 * 208pt, fixed.
 *
 * Fixed rather than intrinsic because the cards sit on an arc: if one is
 * three lines of title and its neighbour is two, the dome develops a step in
 * it and stops reading as a path. The height is set from the longest string
 * in the three languages — "Je ne sais pas comment ça s'appelle" — so the
 * French does not clip and the Arabic, which runs shorter, simply has more
 * air under it.
 */
const CARD_HEIGHT = 208;

function Bubble({
  item,
  number,
  total,
  position,
  slide,
  scrollX,
  flat,
  selected,
  onFocus,
}: {
  item: DiscoveryItem;
  number: number;
  total: number;
  position: number;
  slide: number;
  scrollX: { value: number };
  flat: boolean;
  selected: boolean;
  onFocus: () => void;
}) {
  const { t, rtl } = useI18n();

  /** Distance from the centre of the arc, in cards. 0 is active. */
  const arc = useAnimatedStyle(() => {
    if (flat) return {};
    const offset = Math.abs(scrollX.value / slide - position);
    return {
      transform: [
        {
          translateY: interpolate(
            offset,
            [0, 1, 2],
            [0, Arc.lift, Arc.liftFar],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            offset,
            [0, 1, 2],
            [1, Arc.scaleIdle, Arc.scaleFar],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        offset,
        [0, 1, 2],
        [1, Arc.opacityIdle, Arc.opacityFar],
        Extrapolation.CLAMP,
      ),
    };
  }, [slide, position, flat]);

  /**
   * The active card's edge.
   *
   * Emphasis is never carried by size and opacity alone — someone who has
   * switched Reduce Motion on gets no arc at all, and at that point a 6%
   * scale difference is the only thing left saying which card is live. So the
   * border darkens too, and the gold marker below appears.
   */
  const edge = useAnimatedStyle(() => {
    const offset = Math.abs(scrollX.value / slide - position);
    return {
      borderColor: interpolateColor(
        Math.min(offset, 1),
        [0, 1],
        [Brand.navy300, C.border],
      ),
    };
  }, [slide, position]);

  const marker = useAnimatedStyle(() => {
    const offset = Math.abs(scrollX.value / slide - position);
    return { opacity: interpolate(offset, [0, 0.7], [1, 0], Extrapolation.CLAMP) };
  }, [slide, position]);

  return (
    <Animated.View style={[{ width: slide }, WEB_SNAP_CHILD, arc]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${item.title}. ${item.hint}. ${t('arc.position', {
          n: number,
          total,
        })}`}
        onPress={item.onPress}
        onFocus={onFocus}
        style={({ pressed }) => [
          styles.cardWrap,
          // The press scale lives on its own layer. Putting it in the same
          // transform array as the arc means the two fight over the property
          // and the card jumps when a press starts mid-scroll.
          pressed && styles.pressed,
        ]}
      >
        <Animated.View style={[styles.card, Elevation.resting, edge]}>
          <View style={[styles.head, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <View style={styles.disc}>{item.artwork}</View>
            {/* The step number. It is the counter this row would otherwise
                need a line of dots for, and it reads as a path: 01 of 03. */}
            <Text variant="label" tone={C.textFaint}>
              {String(number).padStart(2, '0')}
            </Text>
          </View>

          <View style={styles.body}>
            <Text variant="rowTitle" numberOfLines={2}>
              {item.title}
            </Text>
            <Text variant="hint" numberOfLines={2}>
              {item.hint}
            </Text>
          </View>

          <Animated.View
            style={[styles.marker, { alignSelf: rtl ? 'flex-end' : 'flex-start' }, marker]}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
  },
  track: {
    alignItems: 'flex-start',
    // The lift pushes neighbours down by up to `liftFar`; without room for it
    // the dropped cards are clipped along the bottom edge of the scroll view.
    paddingTop: Spacing.one,
  },
  cardWrap: {
    // The gutter between cards lives inside the slide, so `snapToInterval`
    // and the card's own width stay the same number. They were different
    // numbers once and the carousel drifted a gutter's width per page.
    paddingHorizontal: Spacing.two,
    height: CARD_HEIGHT,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  card: {
    flex: 1,
    backgroundColor: C.background,
    borderRadius: Radius.sheet,
    borderWidth: Border.thin,
    borderColor: C.border,
    padding: Spacing.three,
    justifyContent: 'space-between',
  },
  head: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  /**
   * The disc, which is where the "bubble" in the design actually lives.
   *
   * A literal circular card would waste most of its own area — a title fits
   * badly inside a circle and the two lines under it fit not at all. The
   * roundness the reference asks for comes from this disc, the 28pt corner on
   * the card, and the curve the row travels along. That reads as circular
   * without costing the text its room.
   */
  disc: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: Spacing.one,
  },
  /** The active mark: gold, small, and never the only signal. See `edge`. */
  marker: {
    width: 28,
    height: 3,
    borderRadius: 999,
    backgroundColor: C.accent,
  },
});
