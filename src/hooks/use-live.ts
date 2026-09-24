import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, type ApiFailure } from '@/api/client';
import { onRefresh } from '@/api/refresh';

/**
 * `useResource` for the staff screens, which differ in one way: what they
 * show changes underneath them. An order moved on the website, a count
 * saved on another phone — so the data is re-read every time the screen
 * comes back into view, quietly, keeping what is on screen until the new
 * answer arrives rather than flashing a spinner on every back gesture.
 *
 * `set` lets a screen show the answer of its own save straight away (the
 * API returns the updated record), without a second round trip.
 */
export type Live<T> =
  | { status: 'loading' }
  | { status: 'failed'; failure: ApiFailure; retry: () => void }
  | { status: 'loaded'; data: T; refresh: () => Promise<void>; set: (next: T) => void };

export function useLive<T>(load: (signal: AbortSignal) => Promise<T>): Live<T> {
  // Answers are filed under the `load` that produced them, as in
  // useResource: a screen that asks for something else reads "loading" at
  // once, without the effect having to reset anything.
  type Answer = { status: 'failed'; failure: ApiFailure } | { status: 'loaded'; data: T } | { status: 'loading' };
  const [answer, setAnswer] = useState<{ for: typeof load; value: Answer } | null>(null);
  const controller = useRef<AbortController | null>(null);

  const fetchNow = useCallback(
    async (quiet: boolean) => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      try {
        const data = await load(c.signal);
        if (!c.signal.aborted) setAnswer({ for: load, value: { status: 'loaded', data } });
      } catch (err) {
        if (c.signal.aborted || (err instanceof Error && err.name === 'AbortError')) return;
        const failure: ApiFailure = err instanceof ApiError ? err.failure : { kind: 'offline' };
        // A quiet refresh that fails keeps the last good answer on screen.
        setAnswer((a) => (quiet && a?.for === load && a.value.status === 'loaded' ? a : { for: load, value: { status: 'failed', failure } }));
      }
    },
    [load],
  );

  useEffect(() => {
    // fetchNow sets state only after its request settles, never synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNow(false);
    return () => controller.current?.abort();
  }, [fetchNow]);

  // Back from the background, or a pull on another screen: re-read quietly.
  useEffect(() => onRefresh(() => fetchNow(true)), [fetchNow]);

  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void fetchNow(true);
    }, [fetchNow]),
  );

  const refresh = useCallback(() => fetchNow(true), [fetchNow]);
  const retry = useCallback(() => {
    setAnswer({ for: load, value: { status: 'loading' } });
    void fetchNow(false);
  }, [fetchNow, load]);
  const set = useCallback((data: T) => setAnswer({ for: load, value: { status: 'loaded', data } }), [load]);

  const state: Answer = answer && answer.for === load ? answer.value : { status: 'loading' };
  if (state.status === 'loaded') return { status: 'loaded', data: state.data, refresh, set };
  if (state.status === 'failed') return { status: 'failed', failure: state.failure, retry };
  return { status: 'loading' };
}
