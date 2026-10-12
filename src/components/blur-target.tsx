import { BlurTargetView } from 'expo-blur';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

/**
 * Android 12 and later can blur live, as iOS does: what scrolls under the
 * tab bar shows through it, softened, instead of stopping at an opaque edge.
 *
 * Android blurs only what it is told to: a `BlurTargetView` around the
 * content, and a `BlurView` that names it (expo-blur, the Dimezis BlurView
 * underneath). The bar cannot sit inside the content it blurs, so each tab's
 * stack is wrapped (components/tab-header) and the open tab hands its own
 * wrapper to the bar. Older Androids keep the bar's near-opaque frost: the
 * blur there costs more than it gives.
 */
export const LIVE_BLUR = Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 31;

type Target = RefObject<View | null>;

export const useBlurTarget = create<{ target: Target | null }>()(() => ({ target: null }));

/** One tab's content, as something the bar can blur. Elsewhere, just the content. */
export function TabBlurTarget({ children }: { children: ReactNode }) {
  const ref = useRef<View | null>(null);
  const focused = useIsFocused();
  useEffect(() => {
    if (LIVE_BLUR && focused) useBlurTarget.setState({ target: ref });
  }, [focused]);
  if (!LIVE_BLUR) return <>{children}</>;
  return (
    <BlurTargetView ref={ref} style={styles.fill}>
      {children}
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
