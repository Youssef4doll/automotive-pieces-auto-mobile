import { isLiquidGlassAvailable } from 'expo-glass-effect';
import type { Tabs } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Brand, C, familyFor, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from '@/components/ui/text';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/** The bar itself, and the room around it. `TabBarHeight` in theme.ts is TOP + BAR + GAP. */
export const BAR = 66;
export const GAP = 12;
export const TOP = Spacing.one;
/** The pill's inset from the bar's edge, all round, at rest. */
const INSET = 4;
const PILL_H = BAR - INSET * 2;
const PILL_MAX_W = 96;
/** How far the pill swells into a lens while it moves: wider, and taller than the bar. */
const SWELL_X = 0.14;
const SWELL_Y = 0.3;
/** How much the lens magnifies what it passes over, at full swell. */
const MAGNIFY = 0.2;
const SPRING = { damping: 20, stiffness: 260, mass: 0.7 };
/** The lens's breath: out as it leaves, back into the pill as it lands — about half a second. */
const SWELL_IN = { duration: 120 };
const SWELL_OUT = { duration: 280 };
const LANDING = 160;

/** Apple's own tab bar where the system has liquid glass (app/(tabs)/_layout); asked once. */
export const SYSTEM_TAB_BAR = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * The bar's footprint over the bottom of the screen: what a screen ending
 * under it must leave clear.
 *
 * Under the system's bar, iOS already counts the bar in the bottom safe-area
 * inset (about 83pt, not 34), so the inset is the whole footprint. Adding
 * our own bar's height on top of it left a hand's width of white between the
 * basket's "Commander" and the bar.
 */
export function tabBarFootprint(insetBottom: number) {
  if (SYSTEM_TAB_BAR) return insetBottom;
  return TOP + BAR + Math.max(insetBottom, GAP);
}

/**
 * The tab bar where the phone has no liquid glass — Android, the web, iOS
 * before 26 — drawn after iOS 26's own (Apple Music): a floating frosted
 * capsule. On iOS 26 and later the system draws the real one
 * (app/(tabs)/_layout).
 *
 * ## The pill, and the lens it becomes
 *
 * At rest the open tab sits on a quiet pill inside the bar — no bigger than
 * the bar, no glass. Only while the selection moves does the pill swell into
 * a lens: white glass with a rim that catches colour, wider than its slot and
 * taller than the bar, magnifying each tab it passes over. When it lands it
 * shrinks back into the pill. A finger can also take hold of the bar and
 * slide: the lens swells under it, follows it, and the tab it is let go over
 * opens.
 *
 * The bar is frosted — blurred on the web, near-opaque on Android, which has
 * no live blur to lean on.
 *
 * ## Still said three ways
 *
 * The open tab is the lens (shape and place), the icon filling with the
 * shop's gold and the label going bold, and `accessibilityState.selected`
 * for the screen reader — never colour alone. Every label stays navy. The
 * springs follow the phone's reduced-motion setting (Reanimated's default),
 * which leaves the lens jumping straight to its tab.
 *
 * It floats over the screens. Content scrolls on under it; every tab screen
 * keeps the bar's footprint clear at its end (useTabBarSpace,
 * `tabBarFootprint`), and the basket's checkout bar sits above it.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { rtl } = useI18n();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const slot = width / count;
  // In Arabic the first tab is on the right: the lens counts from there.
  const visual = rtl ? count - 1 - state.index : state.index;
  const lensW = slot ? Math.min(PILL_MAX_W, slot - 2) : PILL_MAX_W;
  const x = useSharedValue(0);
  // 0 the pill at rest, 1 the lens in flight.
  const grow = useSharedValue(0);
  const placed = useRef<{ slot: number } | null>(null);
  const barRef = useRef<View>(null);
  const barLeft = useRef(0);
  const dragging = useRef(false);
  // A slide already sent the lens to the tab it opens: the tab change that follows must not send it again.
  const released = useRef(false);

  const xFor = (v: number) => v * slot + (slot - lensW) / 2;

  useEffect(() => {
    if (!slot || dragging.current) return;
    const to = xFor(visual);
    if (released.current) {
      released.current = false;
      placed.current = { slot };
      return;
    }
    if (!placed.current || placed.current.slot !== slot) {
      // The first measure — or a turned phone — places the lens; after that it travels.
      x.value = to;
    } else if (Math.abs(x.value - to) > 1) {
      x.value = withSpring(to, SPRING);
      grow.value = withSequence(withTiming(1, SWELL_IN), withDelay(LANDING, withTiming(0, SWELL_OUT)));
    }
    placed.current = { slot };
    // xFor reads slot and lensW, both listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visual, slot, lensW, x, grow]);

  const open = (index: number) => {
    const route = state.routes[index];
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  // Sliding along the bar: the lens follows the finger and the tab under it
  // when let go is the one that opens. A tap never gets here — the move has
  // to be sideways and further than a wobble before the bar takes it from
  // the tab under the finger.
  const latest = useRef({ slot, lensW, count, rtl, visual, open });
  useEffect(() => {
    latest.current = { slot, lensW, count, rtl, visual, open };
  });
  const pan = useMemo(() => {
    const release = () => {
      dragging.current = false;
      const { slot: s, lensW: w, count: n, rtl: r, visual: v, open: go } = latest.current;
      grow.set(withDelay(LANDING, withTiming(0, SWELL_OUT)));
      if (!s) return;
      const over = Math.max(0, Math.min(n - 1, Math.round((x.get() + w / 2 - s / 2) / s)));
      x.set(withSpring(over * s + (s - w) / 2, SPRING));
      if (over !== v) {
        released.current = true;
        go(r ? n - 1 - over : over);
      }
    };
    // The handlers run on touches, never during render; the compiler cannot tell.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => {
        dragging.current = true;
        barRef.current?.measureInWindow((left) => {
          barLeft.current = left;
        });
        grow.set(withTiming(1, SWELL_IN));
      },
      onPanResponderMove: (_, g) => {
        const { slot: s, lensW: w, count: n } = latest.current;
        if (!s) return;
        const centre = g.moveX - barLeft.current;
        x.set(Math.max(-4, Math.min(n * s - w + 4, centre - w / 2)));
      },
      onPanResponderRelease: () => release(),
      onPanResponderTerminate: () => release(),
      onPanResponderTerminationRequest: () => false,
    });
    // The handlers read everything that changes through `latest`.
  }, [x, grow]);

  const lens = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scaleX: 1 + SWELL_X * grow.value }, { scaleY: 1 + SWELL_Y * grow.value }],
  }));
  const pillFill = useAnimatedStyle(() => ({ opacity: 1 - grow.value }));
  const glass = useAnimatedStyle(() => ({ opacity: grow.value }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, GAP) }]}>
      <View pointerEvents="box-none" style={styles.line}>
        <View ref={barRef} style={styles.bar} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <Skin />
          {width ? (
            <Animated.View pointerEvents="none" style={[styles.lens, { width: lensW }, lens]}>
              <Animated.View style={[StyleSheet.absoluteFill, styles.pill, pillFill]} />
              <Animated.View style={[StyleSheet.absoluteFill, glass]}>
                <Lens width={lensW} />
              </Animated.View>
            </Animated.View>
          ) : null}
          <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]} {...pan.panHandlers}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);
              return (
                <Tab
                  key={route.key}
                  label={label}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                  testID={options.tabBarButtonTestID}
                  focused={state.index === index}
                  badge={options.tabBarBadge}
                  icon={options.tabBarIcon}
                  place={rtl ? count - 1 - index : index}
                  slot={slot}
                  lensW={lensW}
                  x={x}
                  grow={grow}
                  rtl={rtl}
                  onPress={() => open(index)}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

/** One tab: magnified by however much of the lens, in flight, is over it. */
function Tab({
  label,
  accessibilityLabel,
  testID,
  focused,
  badge,
  icon,
  place,
  slot,
  lensW,
  x,
  grow,
  rtl,
  onPress,
  onLongPress,
}: {
  label: string;
  accessibilityLabel: string;
  testID?: string;
  focused: boolean;
  badge?: string | number;
  icon?: (p: { focused: boolean; color: string; size: number }) => React.ReactNode;
  place: number;
  slot: number;
  lensW: number;
  x: SharedValue<number>;
  grow: SharedValue<number>;
  rtl: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const magnified = useAnimatedStyle(() => {
    if (!slot) return {};
    const under = Math.max(0, 1 - Math.abs(x.value + lensW / 2 - (place * slot + slot / 2)) / slot);
    return {
      transform: [{ scale: 1 + under * MAGNIFY * grow.value }],
    };
  });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      // The web build reads only the aria prop.
      aria-selected={focused}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.tab, pressed && !focused && styles.pressed]}
    >
      <Animated.View style={[styles.tabInner, magnified]}>
        <View style={styles.iconBox}>
          {icon?.({ focused, color: C.text, size: 24 })}
          {badge !== undefined ? (
            <View style={[styles.badge, rtl ? { left: -8 } : { right: -8 }]}>
              <Text style={[styles.badgeText, { fontFamily: familyFor('display', rtl) }]}>{String(badge)}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={[styles.label, { fontFamily: familyFor(focused ? 'display' : 'bodyMedium', rtl) }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** The bar's material. */
function Skin() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: BAR / 2 }, styles.frost]} />;
}

/** The lens in flight: white glass with a rim of colour and a shine along its top. */
function Lens({ width }: { width: number }) {
  const r = PILL_H / 2;
  return (
    <>
      <View style={[StyleSheet.absoluteFill, styles.lensGlass, { borderRadius: r }]} />
      <Svg pointerEvents="none" width={width} height={PILL_H} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* The rim: light split at the edge, warm on one side and cool on the other. */}
          <LinearGradient id="rim" x1="0" y1="0" x2="1" y2="0.35">
            <Stop offset="0" stopColor="#FF8FB1" stopOpacity="0.9" />
            <Stop offset="0.22" stopColor="#FFD27A" stopOpacity="0.75" />
            <Stop offset="0.48" stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="0.74" stopColor="#7FD3FF" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#B69CFF" stopOpacity="0.9" />
          </LinearGradient>
          <LinearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect
          x={0.75}
          y={0.75}
          width={width - 1.5}
          height={PILL_H - 1.5}
          rx={r - 0.75}
          fill="url(#shine)"
          stroke="url(#rim)"
          strokeWidth={1.5}
        />
      </Svg>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: TOP,
  },
  line: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
  },
  bar: {
    flex: 1,
    height: BAR,
    borderRadius: BAR / 2,
    shadowColor: Brand.navy950,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  frost: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.9)',
    ...(Platform.OS === 'web'
      ? ({
          backgroundColor: 'rgba(244,246,250,0.74)',
          backdropFilter: 'blur(22px) saturate(180%)',
          WebkitBackdropFilter: 'blur(22px) saturate(180%)',
          boxShadow: '0 8px 28px rgba(8,22,51,0.14), inset 0 1px 0 rgba(255,255,255,0.8)',
        } as object)
      : { backgroundColor: 'rgba(244,246,250,0.97)', elevation: 10 }),
  },
  lens: { position: 'absolute', top: INSET, left: 0, height: PILL_H },
  pill: { borderRadius: PILL_H / 2, backgroundColor: 'rgba(15,35,82,0.08)' },
  lensGlass: {
    ...(Platform.OS === 'web'
      ? ({
          backgroundColor: 'rgba(255,255,255,0.62)',
          backdropFilter: 'blur(3px) saturate(170%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(3px) saturate(170%) brightness(1.05)',
          boxShadow: '0 6px 18px rgba(8,22,51,0.16), 0 1px 3px rgba(8,22,51,0.10), inset 0 -3px 8px rgba(15,35,82,0.05)',
        } as object)
      : {
          // No elevation: an Android shadow does not fade with its view.
          backgroundColor: '#FFFFFF',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(15,35,82,0.12)',
          shadowColor: Brand.navy950,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 14,
        }),
  },
  row: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // A slide along the bar in the web build otherwise selects the labels.
    ...(Platform.OS === 'web' ? ({ userSelect: 'none', touchAction: 'pan-y' } as object) : {}),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BAR / 2,
  },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  pressed: { opacity: 0.6 },
  iconBox: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, lineHeight: 15, color: C.text },
  badge: {
    position: 'absolute',
    top: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    // The shop's red with white figures, as the iPhone's own bar draws it.
    backgroundColor: Brand.red600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14, color: Brand.white },
});
