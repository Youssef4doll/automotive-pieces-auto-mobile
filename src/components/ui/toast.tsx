import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, C, Elevation, familyFor, IconSize, MaxContentWidth, Radius, Spacing, TabBarHeight, Tap, ZIndex } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/store/toast';
import { Text } from './text';

/** Long enough to read a short sentence twice; longer when there is a button to reach. */
const PLAIN_MS = 2800;
const WITH_ACTION_MS = 5000;

/**
 * The one toast, drawn once at the root.
 *
 * Navy, not green, even for "ajouté au panier": a green slab at the bottom of
 * the screen reads as an alert, and this is a receipt. The check glyph
 * carries the "it worked".
 *
 * It sits above the tab bar's height whether or not the current screen has
 * one, which also clears a screen's own sticky button bar — the two are the
 * same height by design.
 *
 * Announced to the screen reader, because a toast is otherwise invisible to
 * someone who cannot see it slide in; and it does not steal focus, because a
 * customer halfway through a list should not be yanked to the bottom of it.
 */
export function ToastHost() {
  const toast = useToast((s) => s.toast);
  const hide = useToast((s) => s.hide);
  const insets = useSafeAreaInsets();
  const { rtl } = useI18n();

  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast.message);
    const timer = setTimeout(() => hide(toast.id), toast.action ? WITH_ACTION_MS : PLAIN_MS);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  if (!toast) return null;

  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom: insets.bottom + TabBarHeight + Spacing.two }]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.System)}
        exiting={FadeOutDown.duration(140).reduceMotion(ReduceMotion.System)}
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          Elevation.lifted,
          // Set per side rather than with paddingStart/End: this app mirrors
          // with row-reverse, not `direction: rtl`, so "start" is always the
          // left and the icon would sit against the edge in Arabic.
          rtl
            ? { flexDirection: 'row-reverse', paddingRight: Spacing.three, paddingLeft: Spacing.one }
            : { flexDirection: 'row', paddingLeft: Spacing.three, paddingRight: Spacing.one },
        ]}
      >
        <Feather
          name={toast.tone === 'neutral' ? 'info' : 'check-circle'}
          size={IconSize.medium}
          color={toast.tone === 'neutral' ? Brand.navy300 : Brand.gold400}
        />
        <Text variant="body" tone={C.textInverse} style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              hide(toast.id);
              toast.action?.onPress();
            }}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={{ fontFamily: familyFor('display', rtl), fontSize: 15, lineHeight: 20, color: Brand.gold400 }}>
              {toast.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    zIndex: ZIndex.toast,
  },
  toast: {
    width: '100%',
    maxWidth: MaxContentWidth - Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary + Spacing.two,
    borderRadius: Radius.tile,
    backgroundColor: C.surfaceBrand,
  },
  message: {
    flex: 1,
    paddingVertical: Spacing.two,
  },
  action: {
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    borderRadius: Radius.chip,
  },
  actionPressed: {
    backgroundColor: C.heroSurface,
  },
});
