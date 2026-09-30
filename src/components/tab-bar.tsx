import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
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
 * In the flow of the layout rather than floating over the screens: every
 * screen keeps its own bottom (the basket's checkout bar, the account's
 * footer) and nothing slides under the bar.
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
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, GAP) }]}>
      <View
        style={styles.bar}
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
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
  wrap: { paddingHorizontal: Spacing.three, paddingTop: TOP, backgroundColor: C.background },
  bar: {
    height: BAR,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: BAR / 2,
    backgroundColor: Brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    shadowColor: Brand.navy950,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
    ...(Platform.OS === 'web' ? { boxShadow: '0 6px 22px rgba(8,22,51,0.10)' } : null),
  },
  row: { flex: 1 },
  pill: { position: 'absolute', top: INSET, left: 0, height: PILL_H, borderRadius: PILL_H / 2, backgroundColor: C.surface },
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
