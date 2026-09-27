import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { productApi } from '@/api/product';
import { C, IconSize, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { mayNotify, pushAvailable, pushToken } from '@/services/notifications';
import { useNotify } from '@/store/notify';
import { Button } from './button';
import { Text } from './text';

/**
 * "Me prévenir quand elle est en stock" — for a part that is not on the
 * shelf. One push, the first time the shop's stock for it goes above zero
 * (the website's notifyBackInStock). Only where push can really work.
 */
export function StockAlert({ slug }: { slug: string }) {
  const { t, locale, rtl } = useI18n();
  const on = useNotify((s) => s.stock.includes(slug));
  const setStock = useNotify((s) => s.setStock);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'denied' | 'failed' | null>(null);
  if (!pushAvailable) return null;

  const turnOn = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const push = await pushToken({ ask: true });
      if (!push) return setProblem((await mayNotify({ ask: false })) ? 'failed' : 'denied');
      await productApi.alertWhenBack(slug, push, locale);
      setStock(slug, true);
    } catch {
      setProblem('failed');
    } finally {
      setBusy(false);
    }
  };
  const turnOff = async () => {
    setBusy(true);
    try {
      const push = await pushToken({ ask: false });
      if (push) await productApi.stopAlert(slug, push);
      setStock(slug, false);
    } catch {
      setProblem('failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {on ? (
        <View style={[styles.on, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <Feather name="bell" size={IconSize.medium} color={C.success} />
          <Text variant="hint" tone={C.success} style={[styles.flex, { textAlign: rtl ? 'right' : 'left' }]}>
            {t('notify.stock.active')}
          </Text>
        </View>
      ) : null}
      <Button
        label={on ? t('notify.stock.off') : t('notify.stock.ask')}
        variant="secondary"
        icon={on ? undefined : 'bell'}
        loading={busy}
        onPress={() => void (on ? turnOff() : turnOn())}
      />
      {problem ? (
        <Text variant="hint" tone={C.danger} accessibilityLiveRegion="polite">
          {t(problem === 'denied' ? 'notify.denied' : 'notify.failed')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  on: { alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
});
