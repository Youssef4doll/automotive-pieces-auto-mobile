import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, type ApiFailure } from '@/api/client';

/**
 * A screen's three states, held honestly.
 *
 * Every screen that reads the shop is in exactly one of loading, failed, or
 * loaded — and the bug this shape prevents is the fourth one the naive
 * version has: `{ data, loading, error }` where all three are set at once
 * because a refresh failed after a success, and the screen renders stale data
 * under an error banner, or an empty list that looks like "no results" when
 * it means "the request failed".
 */
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'failed'; failure: ApiFailure; retry: () => void }
  | { status: 'loaded'; data: T; reload: () => void };

/**
 * Read something from the shop, and keep the screen honest about it.
 *
 * `load` must be stable — wrap it in `useCallback` at the call site, or pass
 * a module-level function. An inline arrow re-fetches on every render, which
 * on a list screen is a request per keystroke of the filter box.
 */
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>): Resource<T> {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'failed'; failure: ApiFailure } | { status: 'loaded'; data: T }
  >({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted && mounted.current) setState({ status: 'loaded', data });
      })
      .catch((err: unknown) => {
        // The screen went away mid-request. Not a failure, and setting state
        // here is how you get the "update on an unmounted component" warning
        // that everyone learns to ignore and then misses a real one behind.
        if (controller.signal.aborted || !mounted.current) return;
        if (err instanceof Error && err.name === 'AbortError') return;

        setState({
          status: 'failed',
          failure: err instanceof ApiError ? err.failure : { kind: 'offline' },
        });
      });

    return () => controller.abort();
  }, [load, attempt]);

  const again = useCallback(() => setAttempt((n) => n + 1), []);

  if (state.status === 'loaded') return { status: 'loaded', data: state.data, reload: again };
  if (state.status === 'failed') return { status: 'failed', failure: state.failure, retry: again };
  return { status: 'loading' };
}
