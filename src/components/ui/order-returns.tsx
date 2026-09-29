import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { ordersApi, type Order, type ReturnRequest, type ReturnStatus } from '@/api/orders';
import { Brand, C, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useI18n } from '@/i18n/provider';
import { formatDT } from '@/lib/format';
import { canStartReturn, coverCopy, RETURN_STEPS, returnStep } from '@/lib/returns';
import { track } from '@/services/analytics';
import { useOrders } from '@/store/orders';
import { useToast } from '@/store/toast';
import { BottomSheet } from './bottom-sheet';
import { Button } from './button';
import { Text } from './text';

const TONE: Record<ReturnStatus, { bg: string; fg: string }> = {
  REQUESTED: { bg: C.cautionSurface, fg: '#92400e' },
  APPROVED: { bg: Brand.navy50, fg: Brand.navy700 },
  RECEIVED: { bg: Brand.navy50, fg: Brand.navy700 },
  RESOLVED: { bg: C.successSurface, fg: C.success },
  REFUSED: { bg: C.dangerSurface, fg: C.danger },
  CANCELLED: { bg: C.surface, fg: C.textMuted },
};

/**
 * "Retours et garantie" on an order.
 *
 * Each request the customer made, with where it stands and everything the
 * shop answered — how to bring the part back, the settlement, the shop's own
 * message — and, while the order is inside a window, the way to start one.
 * The windows and conditions are the shop's answer for this order; this only
 * draws them. Nothing shows before delivery unless a request exists.
 */
export function OrderReturns({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const requests = order.returns ?? [];
  if (!requests.length && !order.returnOptions) return null;
  const canStart = canStartReturn(order);
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <View style={styles.card} testID="order-returns">
      <View style={[row, styles.head]}>
        <View style={styles.headIcon}>
          <Feather name="rotate-ccw" size={IconSize.medium} color={C.text} />
        </View>
        <Text variant="rowTitle" style={[styles.flex, align]}>
          {t('returns.title')}
        </Text>
      </View>

      {requests.map((r) => (
        <RequestCard key={r.ref} request={r} order={order} onChanged={onChanged} />
      ))}

      {order.returnOptions ? (
        canStart ? (
          <View style={styles.start}>
            <Text variant="body" style={align}>
              {t('returns.lead')}
            </Text>
            <Button
              label={t('returns.start')}
              icon="rotate-ccw"
              variant={requests.length ? 'secondary' : 'primary'}
              onPress={() => router.push({ pathname: '/retour/[ref]', params: { ref: order.ref } })}
            />
          </View>
        ) : (
          <Text variant="hint" style={align}>
            {t('returns.closedAll')}
          </Text>
        )
      ) : null}

      <Pressable accessibilityRole="link" onPress={() => router.push('/garanties')} style={[row, styles.policy]} hitSlop={4}>
        <Feather name="shield" size={16} color={C.textMuted} />
        <Text variant="hint" tone={C.text} style={styles.underline}>
          {t('returns.policy')}
        </Text>
      </Pressable>
    </View>
  );
}

function RequestCard({ request: r, order, onChanged }: { request: ReturnRequest; order: Order; onChanged: () => void }) {
  const { t, rtl } = useI18n();
  const settings = useShopSettings();
  const tokenFor = useOrders((s) => s.tokenFor);
  const toast = useToast((s) => s.show);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const step = returnStep(r);
  const tone = TONE[r.status];
  const figures = settings.status === 'loaded' ? settings.data : null;
  const cover = coverCopy(r.cover, r.reason, order.vehicleLabel, figures);
  const address = figures?.pickup?.address ?? null;
  const next = r.status === 'REQUESTED' || r.status === 'APPROVED' || r.status === 'RECEIVED' ? t(`returns.next.${r.status}`) : null;

  const withdraw = async () => {
    setBusy(true);
    try {
      const token = await tokenFor(order.ref);
      if (token) await ordersApi.withdrawReturn(order.ref, token, r.ref);
      track('return_withdrawn', { reason: r.reason });
      toast({ message: t('returns.withdrawn'), tone: 'neutral' });
    } catch (err) {
      const answered = err instanceof ApiError && err.failure.kind === 'server' && err.failure.status === 409;
      toast({ message: t(answered ? 'returns.withdrawTooLate' : 'returns.withdrawFailed'), tone: 'neutral' });
    } finally {
      setBusy(false);
      setConfirm(false);
      onChanged();
    }
  };

  return (
    <View style={styles.request}>
      <View style={[row, styles.requestHead]}>
        <View style={styles.flex}>
          <Text variant="body" tone={C.text} style={[styles.strong, align]}>
            {t('returns.request', { ref: r.ref })}
          </Text>
          <Text variant="hint" style={align}>
            {t(`returns.reason.${r.reason}`)}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text variant="hint" tone={tone.fg} style={styles.strong}>
            {t(`returns.status.${r.status}`)}
          </Text>
        </View>
      </View>

      <Text variant="hint" tone={C.text} style={align}>
        {r.items.map((i) => (i.qty > 1 ? `${i.qty} × ${i.name}` : i.name)).join(' · ')}
      </Text>

      {step >= 0 ? (
        <View style={[row, styles.steps]} accessibilityLabel={t(`returns.status.${r.status}`)}>
          {RETURN_STEPS.map((s, i) => (
            <View key={s} style={styles.stepCol}>
              <View style={[styles.stepBar, i <= step && styles.stepBarDone]} />
              <Text style={[styles.stepLabel, i <= step && styles.stepLabelDone, align]} numberOfLines={2}>
                {t(`returns.status.${s}`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {next ? (
        <Text variant="body" style={align}>
          {next}
        </Text>
      ) : null}

      {r.status === 'APPROVED' && r.method ? (
        <View style={[row, styles.fact]}>
          <Feather name={r.method === 'DROP_OFF' ? 'map-pin' : 'truck'} size={16} color={C.text} />
          <Text variant="body" tone={C.text} style={[styles.flex, align]}>
            {r.method === 'DROP_OFF' && address ? t('returns.dropOffAt', { address }) : t(`returns.method.${r.method}`)}
          </Text>
        </View>
      ) : null}

      {r.status === 'RESOLVED' && r.outcome ? (
        <View style={[row, styles.fact]}>
          <Feather name="check-circle" size={16} color={C.success} />
          <Text variant="body" tone={C.success} style={[styles.flex, styles.strong, align]}>
            {r.outcome === 'REFUNDED' && r.refundAmount !== null ? t('returns.refunded', { amount: formatDT(r.refundAmount) }) : t(`returns.outcome.${r.outcome}`)}
          </Text>
        </View>
      ) : null}

      {r.shopNote ? (
        <View style={styles.note}>
          <Text variant="label" style={align}>
            {t('returns.shopNote')}
          </Text>
          <Text variant="body" tone={C.text} style={align}>
            {`« ${r.shopNote} »`}
          </Text>
        </View>
      ) : null}

      <Text variant="hint" style={align}>
        {t('returns.youWished', { wish: t(`returns.wish.${r.wish}`) })}
        {cover ? ` · ${t(cover.key, cover.vars)}` : ''}
      </Text>

      {r.status === 'REQUESTED' ? <Button label={t('returns.withdraw')} variant="secondary" onPress={() => setConfirm(true)} /> : null}

      <BottomSheet visible={confirm} onClose={() => setConfirm(false)} title={t('returns.withdrawTitle')}>
        <View style={styles.sheet}>
          <Text variant="body">{t('returns.withdrawBody', { ref: r.ref })}</Text>
          <Button label={t('returns.withdrawConfirm')} variant="danger" loading={busy} onPress={() => void withdraw()} />
          <Button label={t('returns.withdrawKeep')} variant="secondary" onPress={() => setConfirm(false)} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1, borderColor: C.border, backgroundColor: C.background },
  head: { alignItems: 'center', gap: Spacing.two },
  headIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  strong: { fontWeight: '600' },
  request: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.tile, backgroundColor: C.surface },
  requestHead: { alignItems: 'flex-start', gap: Spacing.two },
  pill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  steps: { gap: 4, paddingTop: Spacing.one },
  stepCol: { flex: 1, gap: 4 },
  stepBar: { height: 4, borderRadius: 2, backgroundColor: C.border },
  stepBarDone: { backgroundColor: C.success },
  stepLabel: { fontSize: 11, lineHeight: 14, color: C.textFaint },
  stepLabelDone: { color: C.text },
  fact: { alignItems: 'center', gap: Spacing.two },
  note: { gap: 2, padding: Spacing.two, borderRadius: Radius.tile, backgroundColor: C.background },
  start: { gap: Spacing.two },
  policy: { alignItems: 'center', gap: 6, minHeight: Tap.min, alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
  sheet: { gap: Spacing.three, padding: Spacing.three },
});
