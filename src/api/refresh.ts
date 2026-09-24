import { AppState, type AppStateStatus } from 'react-native';

import { clearCache } from './client';

/**
 * "The shop may have changed — read it again."
 *
 * Every mounted `useResource` listens here. Two things ring it: the app
 * coming back to the foreground (the owner changed a price on the website
 * while the phone sat in a pocket), and a customer pulling a screen down,
 * which also empties the catalogue cache so the answer is the shop's, not
 * the phone's memory of it.
 *
 * A re-read is quiet: the screen keeps what it shows until the new answer
 * arrives, and keeps it if the re-read fails.
 */
type Listener = () => Promise<void>;
const listeners = new Set<Listener>();

let watching = false;
let last: AppStateStatus = AppState.currentState;

function watchForeground() {
  if (watching) return;
  watching = true;
  AppState.addEventListener('change', (next) => {
    const back = last !== 'active' && next === 'active';
    last = next;
    if (back) void refreshAll({ hard: false });
  });
}

export function onRefresh(listener: Listener) {
  watchForeground();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `hard` empties the cache first, so nothing is answered from memory. */
export async function refreshAll({ hard }: { hard: boolean }) {
  if (hard) clearCache();
  await Promise.all([...listeners].map((l) => l().catch(() => undefined)));
}
