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
  const [attempt, setAttempt] = useState(0);

  // What the shop is asked about, and nothing else: ids and quantities.
  const request = useMemo(
    () => ({ items: items.map((i) => ({ productId: i.productId, qty: i.qty })), engineId, deliveryMethod }),
    [items, engineId, deliveryMethod],
  );
  // One question per basket and attempt; the answer is filed under it, so a
  // changed basket reads "loading" from its first render with the previous
  // total kept beside it — derived here, not reset inside the effect.
  const question = `${JSON.stringify(request)}#${attempt}`;
  const [answer, setAnswer] = useState<{
    for: string;
    value: { status: 'loaded'; data: CartQuote } | { status: 'failed'; failure: ApiFailure };
  } | null>(null);
  const [last, setLast] = useState<CartQuote | null>(null);
  const empty = !hydrated || request.items.length === 0;

  useEffect(() => {
    if (empty) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      ordersApi
        .quote(request, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setAnswer({ for: question, value: { status: 'loaded', data } });
          setLast(data);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (err instanceof Error && err.name === 'AbortError') return;
          setAnswer({
            for: question,
            value: { status: 'failed', failure: err instanceof ApiError ? err.failure : { kind: 'offline' } },
          });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `question` stands in for `request`, whose identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, empty]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // The last total is only a fair stand-in for a basket that still shares a
  // part with it — not for one emptied and filled again with something else.
  const previous =
    last && last.lines.some((l) => request.items.some((i) => i.productId === l.productId)) ? last : null;
  let state: QuoteState;
  if (empty) state = { status: 'empty' };
  else if (answer?.for === question) {
    state = answer.value.status === 'loaded' ? answer.value : { status: 'failed', failure: answer.value.failure, previous };
  } else state = { status: 'loading', previous };
  return { state, retry, hydrated };
}

/** The last priced basket, current or being replaced. */
export function quoteOf(state: QuoteState): CartQuote | null {
  if (state.status === 'loaded') return state.data;
  if (state.status === 'loading' || state.status === 'failed') return state.previous;
  return null;
}
