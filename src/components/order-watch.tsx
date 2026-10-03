import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ordersApi, type OrderStatus } from '@/api/orders';
import { questionsApi } from '@/api/questions';
import { useI18n } from '@/i18n/provider';
import { mayNotify, pushAvailable } from '@/services/notifications';
import { useOrders } from '@/store/orders';
import { useQuestions } from '@/store/questions';
import { deviceStorage } from '@/store/storage';
import { useToast } from '@/store/toast';

/**
 * "Votre commande a bougé" and "la boutique vous a répondu", while the app is
 * open — the half of the notifications that needs nothing from the shop.
 *
 * Push (services/notifications) reaches a phone with the app closed, and
 * only works in a build with an EAS project, on a phone that allowed it.
 * Everywhere else — Expo Go, the web, a customer who said no — this is what
 * tells them: when the app comes to the foreground, and every minute and a
 * half while it stays there, it asks the shop for the state of the orders
 * still on their way and of the questions not answered yet, and says so in
 * a toast with the way to look. Where push already said it, it stays quiet.
 *
 * It remembers the last status it saw for each order (this file's store),
 * so it only speaks about a change — never about the first look.
 */
const EVERY_MS = 90_000;
const RECENT_MS = 90 * 24 * 60 * 60_000;
const DONE: OrderStatus[] = ['DELIVERED', 'CANCELLED'];

const useSeen = create<{ statuses: Record<string, OrderStatus>; see: (ref: string, s: OrderStatus) => void }>()(
  persist(
    (set, get) => ({
      statuses: {},
      see: (ref, s) => set({ statuses: { ...get().statuses, [ref]: s } }),
    }),
    { name: 'apa-order-watch', storage: createJSONStorage(() => deviceStorage) },
  ),
);

export function OrderWatch() {
  const { t } = useI18n();
  const router = useRouter();
  const running = useRef(false);
  // The latest t without restarting the timers on a language switch.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      if (running.current) return;
      running.current = true;
      try {
        // A phone that will get the push does not need telling twice.
        const pushed = pushAvailable && (await mayNotify({ ask: false }).catch(() => false));
        const say = (message: string, open: () => void) =>
          useToast.getState().show({ message, tone: 'neutral', action: { label: tRef.current('watch.open'), onPress: open } });

        const seen = useSeen.getState();
        const orders = useOrders
          .getState()
          .orders.filter((o) => Date.now() - Date.parse(o.placedAt) < RECENT_MS && !DONE.includes(seen.statuses[o.ref]))
          .slice(0, 10);
        for (const o of orders) {
          const key = await useOrders.getState().tokenFor(o.ref);
          if (!key) continue;
          const order = await ordersApi.get(o.ref, key).catch(() => null);
          if (!order) continue;
          const before = useSeen.getState().statuses[o.ref];
          useSeen.getState().see(o.ref, order.status);
          if (before && before !== order.status && !pushed) {
            say(tRef.current('watch.order', { ref: o.ref, status: tRef.current(`status.${order.status}`) }), () =>
              router.push({ pathname: '/suivi/[ref]', params: { ref: o.ref } }),
            );
          }
        }

        const store = useQuestions.getState();
        for (const q of store.questions.filter((x) => !x.latestReplyAt).slice(0, 10)) {
          const key = await store.tokenFor(q.id);
          if (!key) continue;
          const live = await questionsApi.get(q.id, key).catch(() => null);
          if (!live?.repliedAt) continue;
          useQuestions.getState().noteReply(q.id, live.repliedAt);
          if (!pushed) {
            say(tRef.current('watch.reply'), () =>
              q.orderRef ? router.push({ pathname: '/suivi/[ref]', params: { ref: q.orderRef } }) : router.push('/compte/questions'),
            );
          }
        }
      } finally {
        running.current = false;
      }
    };

    const start = () => {
      void tick();
      if (!timer) timer = setInterval(() => void tick(), EVERY_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    // A first look a few seconds after launch, once the launch screen and
    // the home screen's own requests are out of the way.
    const first = setTimeout(start, 4000);
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));
    return () => {
      clearTimeout(first);
      stop();
      sub.remove();
    };
  }, [router]);

  return null;
}
