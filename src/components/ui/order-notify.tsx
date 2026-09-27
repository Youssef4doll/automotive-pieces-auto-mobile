import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ordersApi } from '@/api/orders';
import { C, IconSize, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { mayNotify, pushAvailable, pushToken } from '@/services/notifications';
import { useNotify } from '@/store/notify';
import { useOrders } from '@/store/orders';
import { Button } from './button';
import { Text } from './text';

/**
 * "Suivre sans ouvrir l'app": push notifications for one order.
 *
 * Only drawn where push can really work (a phone, a build with an EAS
 * project — see services/notifications); a switch that silently does nothing
 * would be worse than no switch. A customer who turned it on for an earlier
 * order, and still allows notifications, gets it for this one without being
 * asked again (`auto`, on the confirmation screen).
 */
export function OrderNotify({ orderRef, auto = false }: { orderRef: string; auto?: boolean }) {
  const { t, locale, rtl } = useI18n();
  const on = useNotify((s) => s.orders.includes(orderRef));
  const before = useNotify((s) => s.orders.length > 0);
  const setOrder = useNotify((s) => s.setOrder);
  const tokenFor = useOrders((s) => s.tokenFor);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'denied' | 'failed' | null>(null);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  const subscribe = async (ask: boolean) => {
    setBusy(true);
    setProblem(null);
    try {
      const push = await pushToken({ ask });
      if (!push) {
        if (ask) setProblem((await mayNotify({ ask: false })) ? 'failed' : 'denied');
        return;
      }
      const key = await tokenFor(orderRef);
      if (!key) return setProblem('failed');
      await ordersApi.subscribe(orderRef, key, push, locale);
      setOrder(orderRef, true);
    } catch {
      if (ask) setProblem('failed');
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    try {
      const push = await pushToken({ ask: false });
      const key = await tokenFor(orderRef);
      if (push && key) await ordersApi.unsubscribe(orderRef, key, push);
      setOrder(orderRef, false);
    } catch {
      setProblem('failed');
    } finally {
      setBusy(false);
    }
  };

  // Once said yes before: carry it to this order, quietly, if still allowed.
  useEffect(() => {
    if (!pushAvailable || !auto || on || !before) return;
    void (async () => {
      if (await mayNotify({ ask: false })) await subscribe(false);
    })();
    // Once per order screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderRef]);

  if (!pushAvailable) return null;

  return (
    <View style={[styles.card, on && styles.cardOn]}>
      <View style={[row, styles.head]}>
        <Feather name={on ? 'bell' : 'bell-off'} size={IconSize.medium} color={on ? C.success : C.text} />
        <View style={styles.flex}>
          <Text variant="rowTitle" style={align}>
            {t('notify.order.title')}
          </Text>
          <Text variant="hint" style={align}>
            {on ? t('notify.order.active') : t('notify.order.body')}
          </Text>
        </View>
      </View>
      {problem ? (
        <Text variant="hint" tone={C.danger} style={align} accessibilityLiveRegion="polite">
          {t(problem === 'denied' ? 'notify.denied' : 'notify.failed')}
        </Text>
      ) : null}
      <Button
        label={on ? t('notify.order.off') : t('notify.order.on')}
        variant={on ? 'secondary' : 'primary'}
        icon={on ? undefined : 'bell'}
        loading={busy}
        onPress={() => void (on ? unsubscribe() : subscribe(true))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: C.surface },
  cardOn: { backgroundColor: C.successSurface },
  head: { alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1, gap: 2 },
});
