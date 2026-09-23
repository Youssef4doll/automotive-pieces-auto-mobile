import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { ORDER_FLOW, staffApi, type OrderDetail, type OrderStatus } from '@/api/staff';
import { Card, Line, StatusPill, Tag, staffStyles } from '@/components/staff/kit';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, Spacing } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useI18n } from '@/i18n/provider';
import { formatDate, formatDT } from '@/lib/format';
import { useToast } from '@/store/toast';

/**
 * One order, as the website's /admin/commandes/[id] shows it to the shop —
 * including the fitment verdict per line, which is what decides whether the
 * order can be confirmed without ringing the customer first.
 *
 * The big button is the next step in the flow; any other status is one
 * sheet away, and cancelling asks first because the customer is told.
 */
export default function StaffOrder() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback((signal: AbortSignal) => staffApi.order(id, signal), [id]);
  const order = useLive(load);

  return (
    <>
      <Stack.Screen options={{ title: order.status === 'loaded' ? order.data.ref : t('staff.menu.orders') }} />
      {order.status === 'loading' ? (
        <Loading />
      ) : order.status === 'failed' ? (
        <Failed failure={order.failure} onRetry={order.retry} />
      ) : (
        <Detail order={order.data} onChange={order.set} />
      )}
    </>
  );
}

function Detail({ order, onChange }: { order: OrderDetail; onChange: (o: OrderDetail) => void }) {
  const { t, rtl, locale } = useI18n();
  const toast = useToast((s) => s.show);
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [picking, setPicking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const start = { alignItems: rtl ? ('flex-end' as const) : ('flex-start' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const at = ORDER_FLOW.indexOf(order.status);
  const next = at >= 0 && at < ORDER_FLOW.length - 1 ? ORDER_FLOW[at + 1] : null;

  const move = async (status: OrderStatus) => {
    setBusy(status);
    try {
      onChange(await staffApi.setStatus(order.id, status));
      toast({ message: t('staff.order.changed', { s: t(`status.${status}`) }), tone: 'success' });
    } catch (err) {
      if (!(err instanceof ApiError && err.failure.kind === 'unauthorized')) toast({ message: t('staff.err.save'), tone: 'neutral' });
    } finally {
      setBusy(null);
      setPicking(false);
      setCancelling(false);
    }
  };

  const digits = order.phone.replace(/\D/g, '');
  // A Tunisian number written locally (8 digits) is dialled with 216 for WhatsApp.
  const waNumber = digits.length === 8 ? `216${digits}` : digits;
  const open = (url: string) => Linking.openURL(url).catch(() => undefined);
  const t2 = order.totals;

  return (
    <ScrollView style={staffStyles.root} contentContainerStyle={staffStyles.scroll}>
      <Card>
        <View style={[row, styles.between]}>
          <View style={[styles.flex, start]}>
            <Text variant="screenTitle">{order.ref}</Text>
            <Text variant="hint">{formatDate(order.createdAt, locale, true)}</Text>
          </View>
          <StatusPill status={order.status} />
        </View>
        {next ? (
          <Button label={t('staff.order.next', { s: t(`status.${next}`) })} onPress={() => move(next)} loading={busy === next} icon="check" />
        ) : null}
        <Button label={t('staff.order.otherStatus')} variant="secondary" onPress={() => setPicking(true)} />
      </Card>

      <Card>
        <Text variant="label" tone={C.textMuted}>
          {t('staff.order.customer')}
        </Text>
        <Text variant="rowTitle">{order.customerName}</Text>
        <Text variant="body" style={styles.ltr}>
          {order.phone}
        </Text>
        {order.email ? <Text variant="body">{order.email}</Text> : null}
        {order.accountEmail ? <Text variant="hint">{t('staff.order.account', { email: order.accountEmail })}</Text> : null}
        <View style={[row, styles.actions]}>
          <Button label={t('staff.order.call')} variant="secondary" icon="phone" onPress={() => open(`tel:${order.phone.replace(/[^\d+]/g, '')}`)} style={styles.flex} />
          {digits ? (
            <Button label={t('staff.order.whatsapp')} variant="secondary" icon="message-circle" onPress={() => open(`https://wa.me/${waNumber}`)} style={styles.flex} />
          ) : null}
        </View>
      </Card>

      <Card>
        <Text variant="label" tone={C.textMuted}>
          {t('staff.order.delivery')}
        </Text>
        <Text variant="body">{order.deliveryMethod === 'PICKUP' ? t('staff.pickup') : t('staff.homeDelivery')}</Text>
        <Text variant="body">{order.governorate}</Text>
        {order.address ? <Text variant="body">{order.address}</Text> : null}
        <Text variant="hint">{order.paymentMethod === 'COD' ? t('staff.order.payCod') : t('staff.order.payCard')}</Text>
      </Card>

      <Card>
        <Text variant="label" tone={C.textMuted}>
          {t('staff.order.vehicle')}
        </Text>
        {order.vehicleLabel ? (
          <>
            <Text variant="rowTitle">{order.vehicleLabel}</Text>
            {order.items.map((i) => (
              <View key={`fit-${i.id}`} style={[row, styles.between, styles.centre]}>
                <Text variant="body" numberOfLines={1} style={styles.flex}>
                  {i.name}
                </Text>
                <Tag
                  label={t(`staff.fit.${i.fit ?? 'UNLISTED'}`)}
                  tone={i.fit === 'VERIFIED' ? 'muted' : i.fit === 'DERIVED' ? 'caution' : 'danger'}
                />
              </View>
            ))}
          </>
        ) : (
          <Text variant="body" tone={C.textMuted}>
            {t('staff.order.noVehicle')}
          </Text>
        )}
      </Card>

      {order.notes ? (
        <Card>
          <Text variant="label" tone={C.textMuted}>
            {t('staff.order.note')}
          </Text>
          <Text variant="body">{order.notes}</Text>
        </Card>
      ) : null}

      <Card>
        <Text variant="label" tone={C.textMuted}>
          {t('staff.order.items')}
        </Text>
        {order.items.map((i) => (
          <View key={i.id} style={[row, styles.between, styles.item]}>
            <View style={[styles.flex, start, { gap: 4 }]}>
              <Text variant="body">
                {i.qty} × {i.name}
              </Text>
              <Text variant="hint" style={styles.ltr}>
                {i.sku}
              </Text>
              {i.backorder ? <Tag label={t('staff.backorder')} /> : null}
            </View>
            <Text variant="rowTitle">{formatDT(i.lineTotal)}</Text>
          </View>
        ))}
        <View style={styles.rule} />
        <Line label={t2.taxed ? t('staff.order.subtotalHT') : t('staff.order.subtotal')} value={formatDT(t2.goods)} />
        <Line
          label={t2.taxed ? t('staff.order.shippingHT') : t('staff.order.shipping')}
          value={t2.shipping === 0 ? t('staff.order.free') : formatDT(t2.shipping)}
        />
        {t2.taxed ? <Line label={t('staff.order.vat', { r: t2.vatRate })} value={formatDT(t2.vat)} /> : null}
        {t2.stampDuty > 0 ? <Line label={t('staff.order.stamp')} value={formatDT(t2.stampDuty)} /> : null}
        <Line label={t2.taxed ? t('staff.order.totalTTC') : t('staff.order.total')} value={formatDT(t2.total)} strong />
      </Card>

      <Card>
        <Text variant="label" tone={C.textMuted}>
          {t('staff.order.history')}
        </Text>
        {order.history.map((h, i) => (
          <View key={`${h.status}-${i}`} style={[row, styles.centre, { gap: Spacing.two }]}>
            <View style={styles.dot} />
            <Text variant="body" style={styles.flex}>
              {t(`status.${h.status}`)}
            </Text>
            <Text variant="hint">{formatDate(h.at, locale, true)}</Text>
          </View>
        ))}
      </Card>

      <BottomSheet visible={picking} onClose={() => setPicking(false)} title={t('staff.order.otherStatus')}>
        <View style={styles.sheet}>
          {ORDER_FLOW.map((s) => (
            <Button
              key={s}
              label={t(`status.${s}`)}
              variant={s === order.status ? 'primary' : 'secondary'}
              disabled={s === order.status}
              loading={busy === s}
              onPress={() => move(s)}
            />
          ))}
          {order.status !== 'CANCELLED' ? (
            <Button
              label={t('staff.order.cancel')}
              variant="danger"
              onPress={() => {
                setPicking(false);
                setCancelling(true);
              }}
            />
          ) : null}
        </View>
      </BottomSheet>

      <BottomSheet visible={cancelling} onClose={() => setCancelling(false)} title={t('staff.order.cancel')}>
        <View style={styles.sheet}>
          <Text variant="body">{t('staff.order.cancelWhy')}</Text>
          <Button label={t('staff.order.cancel')} variant="danger" loading={busy === 'CANCELLED'} onPress={() => move('CANCELLED')} />
          <Button label={t('garage.cancel')} variant="secondary" onPress={() => setCancelling(false)} />
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  between: { gap: Spacing.three, alignItems: 'flex-start' },
  centre: { alignItems: 'center' },
  actions: { gap: Spacing.two, marginTop: Spacing.one },
  item: { paddingVertical: Spacing.one },
  rule: { height: 1, backgroundColor: C.border, marginVertical: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  ltr: { writingDirection: 'ltr' },
  sheet: { gap: Spacing.two, paddingBottom: Spacing.two },
});
