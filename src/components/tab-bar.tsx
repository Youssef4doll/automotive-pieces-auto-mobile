import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, C, familyFor, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from '@/components/ui/text';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/** The bar itself, and the room around it. `TabBarHeight` in theme.ts is TOP + BAR + GAP. */
export const BAR = 66;
export const GAP = 12;
export const TOP = Spacing.one;
/** The pill's inset from the bar's edge, all round. */
const INSET = 5;
const PILL_H = BAR - INSET * 2;
const PILL_MAX_W = 92;
const SPRING = { damping: 20, stiffness: 220, mass: 0.7 };

/** Apple's own material where the system has it (iOS 26 and later); asked once. */
const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

/** The bar's footprint over the bottom of the screen: what a screen ending under it must leave clear. */
export function tabBarFootprint(insetBottom: number) {
  return TOP + BAR + Math.max(insetBottom, GAP);
}

/**
 * The tab bar: a white, fully rounded bar lifted off the bottom edge, and a
 * pale pill behind the open tab — icon and label together — that slides to
 * the tab you pick. The open tab's icon fills with the shop's gold under its
 * navy outline (illustrations/tab-icons); the others stay outlines.
 *
 * The active tab is said three ways, never by colour alone: the pill (shape
 * and position), the icon filling in and the label going bold, and
 * `accessibilityState.selected` for the screen reader. Every label stays
 * navy — a grey label on white is the one thing a customer squints at. The
 * pill moves with a short spring, and not at all when the phone asks for
 * reduced motion (Reanimated's default follows it).
 *
 * It floats over the screens, the way the system's own bars now do, and is
 * made of glass: Apple's liquid glass (expo-glass-effect) where iOS has it,
 * elsewhere a frosted white — blurred on the web, near-opaque on Android,
 * which has no live blur to lean on. Content scrolls on under it; every tab
 * screen keeps the bar's footprint clear at its end (useTabBarSpace,
 * `tabBarFootprint`), and the basket's checkout bar sits above it.
 *
 * The basket's count is gold with navy figures — the button colours — ringed
 * in white so it reads on the pill and off it, hidden at zero.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { rtl } = useI18n();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const slot = width / count;
  // In Arabic the first tab is on the right: the pill counts from there.
  const visual = rtl ? count - 1 - state.index : state.index;
  // Almost the whole slot on a 320pt phone, capped on a wide one.
  const pillW = slot ? Math.min(PILL_MAX_W, slot - 4) : PILL_MAX_W;
  const x = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (!slot) return;
    const to = visual * slot + (slot - pillW) / 2;
    // The first measure places the pill; after that it slides.
    x.value = placed.current ? withSpring(to, SPRING) : to;
    placed.current = true;
  }, [visual, slot, pillW, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, GAP) }]}>
      <View
        style={[styles.bar, LIQUID_GLASS ? styles.barGlass : styles.barFrost]}
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {LIQUID_GLASS ? (
          <GlassView pointerEvents="none" glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
        ) : null}
        {width ? <Animated.View pointerEvents="none" style={[styles.pill, { width: pillW }, pill]} /> : null}
        <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);
            const badge = options.tabBarBadge;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                testID={options.tabBarButtonTestID}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                style={({ pressed }) => [styles.tab, pressed && !focused && styles.pressed]}
              >
                <View style={styles.iconBox}>
                  {options.tabBarIcon?.({ focused, color: C.text, size: 24 })}
                  {badge !== undefined ? (
                    <View style={[styles.badge, rtl ? { left: -8 } : { right: -8 }]}>
                      <Text style={[styles.badgeText, { fontFamily: familyFor('display', rtl) }]}>{String(badge)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.label, { fontFamily: familyFor(focused ? 'display' : 'bodyMedium', rtl) }]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Spacing.three, paddingTop: TOP },
  bar: {
    height: BAR,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: BAR / 2,
    overflow: 'hidden',
    shadowColor: Brand.navy950,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  // The system draws the glass, its edge and its shine.
  barGlass: { backgroundColor: 'transparent' },
  barFrost: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.9)',
    ...(Platform.OS === 'web'
      ? ({
          backgroundColor: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(22px) saturate(180%)',
          WebkitBackdropFilter: 'blur(22px) saturate(180%)',
          boxShadow: '0 8px 28px rgba(8,22,51,0.14), inset 0 1px 0 rgba(255,255,255,0.8)',
        } as object)
      : { backgroundColor: 'rgba(255,255,255,0.94)' }),
  },
  row: { flex: 1 },
  pill: { position: 'absolute', top: INSET, left: 0, height: PILL_H, borderRadius: PILL_H / 2, backgroundColor: 'rgba(15,35,82,0.08)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: PILL_H / 2 },
  pressed: { opacity: 0.6 },
  iconBox: { width: 28, height: 26, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, lineHeight: 15, color: C.text },
  badge: {
    position: 'absolute',
    top: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Brand.gold500,
    borderWidth: 2,
    borderColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12, color: Brand.navy900 },
});
