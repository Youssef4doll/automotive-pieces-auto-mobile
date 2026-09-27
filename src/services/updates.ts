import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { track } from './analytics';

/**
 * Over-the-air updates (EAS Update). Off until the owner connects the app to
 * an EAS project (`eas init`, then `eas update:configure`, which writes the
 * update URL into app.json) — `Updates.isEnabled` is false until then, and so
 * in development and on the web, and this does nothing.
 *
 * When on: on launch and whenever the app comes back to the foreground (at
 * most every half hour), ask for a newer JavaScript bundle for this build's
 * runtime version and download it. It is applied the next time the app
 * starts, never mid-use — a screen changing under a customer's thumb in the
 * middle of a checkout is worse than a fix arriving an hour later.
 */
const EVERY_MS = 30 * 60_000;
let lastCheck = 0;

async function check() {
  if (Date.now() - lastCheck < EVERY_MS) return;
  lastCheck = Date.now();
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) track('update_downloaded', { from: Updates.updateId ?? 'embedded' });
  } catch {
    // Offline, or the update server unreachable: next time.
  }
}

export function useRemoteUpdates() {
  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__ || !Updates.isEnabled) return;
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => sub.remove();
  }, []);
}
