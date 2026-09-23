import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiError, type ApiFailure } from '@/api/client';
import { ordersApi, type CartQuote, type DeliveryMethod } from '@/api/orders';
import { useCart } from '@/store/cart';
import { useGarage } from '@/store/garage';

/** A stepper tapped four times is one quote, not four. */
const DEBOUNCE_MS = 300;

export type QuoteState =
  | { status: 'empty' }
  | { status: 'loading'; previous: CartQuote | null }
  | { status: 'loaded'; data: CartQuote }
  | { status: 'failed'; failure: ApiFailure; previous: CartQuote | null };

/**
 * The basket, priced by the shop, kept in step with the basket on the phone.
 *
 * Every change — a quantity, a line removed, the car switched in the garage,
 * the delivery method in checkout — asks again. The previous answer is kept
 * while the next one is on its way, so a total does not blink to a skeleton
 * on every tap; the screen dims it instead, and never lets the customer act
 * on a figure that is being replaced.
 */
export function useCartQuote(deliveryMethod?: DeliveryMethod) {
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const engineId = useGarage((s) => s.active?.engineId);
  const [state, setState] = useState<QuoteState>({ status: 'empty' });
  const [attempt, setAttempt] = useState(0);

  // What the shop is asked about, and nothing else: ids and quantities.
  const request = useMemo(
    () => ({ items: items.map((i) => ({ productId: i.productId, qty: i.qty })), engineId, deliveryMethod }),
    [items, engineId, deliveryMethod],
  );
  const key = JSON.stringify(request);

  useEffect(() => {
    if (!hydrated) return;
    if (request.items.length === 0) {
      setState({ status: 'empty' });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({
      status: 'loading',
      previous: s.status === 'loaded' ? s.data : s.status === 'loading' || s.status === 'failed' ? s.previous : null,
    }));
    const timer = setTimeout(() => {
      ordersApi
        .quote(request, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setState({ status: 'loaded', data });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (err instanceof Error && err.name === 'AbortError') return;
          setState((s) => ({
            status: 'failed',
            failure: err instanceof ApiError ? err.failure : { kind: 'offline' },
            previous: s.status === 'loading' ? s.previous : null,
          }));
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `key` stands in for `request`, whose identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry, hydrated };
}

/** The last priced basket, current or being replaced. */
export function quoteOf(state: QuoteState): CartQuote | null {
  if (state.status === 'loaded') return state.data;
  if (state.status === 'loading' || state.status === 'failed') return state.previous;
  return null;
}
