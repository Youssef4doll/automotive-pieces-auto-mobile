import type { Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, C, familyFor, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from '@/components/ui/text';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/** The bar itself, and the room around it. `TabBarHeight` in theme.ts is BAR + GAP. */
export const BAR = 64;
export const GAP = 12;
const CAPSULE_W = 56;
const CAPSULE_H = 32;
const SPRING = { damping: 20, stiffness: 220, mass: 0.7 };

/**
 * The tab bar: a rounded bar lifted off the bottom edge, with a navy capsule
 * behind the open tab's icon that slides to the tab you pick.
 *
 * The active tab is still said three ways, never by colour alone: the
 * capsule (shape and position), the icon turning white on it and the label
 * going to full-weight navy, and `accessibilityState.selected` for the
 * screen reader. The capsule moves with a short spring — and not at all when
 * the phone asks for reduced motion (Reanimated's default follows it).
 *
 * In the flow of the layout rather than floating over the screens: every
 * screen keeps its own bottom (the basket's checkout bar, the account's
 * footer) and nothing slides under the bar.
 *
 * The basket's count is gold with navy figures — the button colours — ringed
 * in white so it reads on the capsule and off it, hidden at zero.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { rtl } = useI18n();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const slot = width / count;
  // In Arabic the first tab is on the right: the capsule counts from there.
  const visual = rtl ? count - 1 - state.index : state.index;
  // Narrower than its slot, with room either side even on a 320pt phone.
  const capsuleW = slot ? Math.min(CAPSULE_W, slot - 12) : CAPSULE_W;
  const x = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (!slot) return;
    const to = visual * slot + (slot - capsuleW) / 2;
    // The first measure places the capsule; after that it slides.
    x.value = placed.current ? withSpring(to, SPRING) : to;
    placed.current = true;
  }, [visual, slot, capsuleW, x]);

  const capsule = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, GAP) }]}>
      <View
        style={styles.bar}
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width ? <Animated.View pointerEvents="none" style={[styles.capsule, { width: capsuleW }, capsule]} /> : null}
        <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);
            const badge = options.tabBarBadge;
            const color = focused ? Brand.white : C.textMuted;

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
                <View style={[styles.iconBox, { width: capsuleW }]}>
                  {options.tabBarIcon?.({ focused, color, size: 22 })}
                  {badge !== undefined ? (
                    <View style={styles.badge}>
                      <Text style={[styles.badgeText, { fontFamily: familyFor('display', rtl) }]}>{String(badge)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    { fontFamily: familyFor(focused ? 'display' : 'body', rtl), color: focused ? C.text : C.textMuted },
                  ]}
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
  wrap: { paddingHorizontal: Spacing.three, paddingTop: Spacing.one, backgroundColor: C.background },
  bar: {
    height: BAR,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: 24,
    backgroundColor: Brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    shadowColor: Brand.navy950,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(8,22,51,0.12)' } : null),
  },
  row: { flex: 1 },
  capsule: { position: 'absolute', top: 7, left: 0, height: CAPSULE_H, borderRadius: CAPSULE_H / 2, backgroundColor: Brand.navy900 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 7, gap: 3, borderRadius: 20 },
  pressed: { opacity: 0.6 },
  iconBox: { height: CAPSULE_H, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  badge: {
    position: 'absolute',
    top: -3,
    right: 6,
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
