import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * What a touch feels like, in four words — the phone's own haptics, never a
 * buzz of our own. On Android they are the system's haptic constants
 * (View.performHapticFeedback): they follow the phone's "touch feedback"
 * setting and need no vibration permission. Nothing on the web, and a phone
 * without a motor simply stays still.
 */
const android = Platform.OS === 'android';

function run(effect: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  effect().catch(() => {});
}

export const feel = {
  /** Moving between choices: a tab, a quantity, a step. */
  tick: () => run(() => (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick) : Haptics.selectionAsync())),
  /** Passing over choices quickly, as a finger slides along the tab bar. */
  glide: () =>
    run(() => (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Frequent_Tick) : Haptics.selectionAsync())),
  /** Something done: in the basket, an order placed. */
  done: () =>
    run(() =>
      android
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ),
  /** Taking hold of something: the tab bar's lens, a pin on the map. */
  grab: () =>
    run(() =>
      android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_Start) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    ),
};
