import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ApiError } from '@/api/client';
import { staffApi, type ReturnDetail, type ReturnMove } from '@/api/staff';
import { Card, Line, staffStyles } from '@/components/staff/kit';
import { PrivatePhoto } from '@/components/staff/private-photo';
import { ReturnPill } from '@/components/staff/return-pill';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, Radius, Spacing, Tap } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { coverCopy } from '@/lib/returns';
import { useI18n } from '@/i18n/provider';
import { formatDate, formatDT } from '@/lib/format';
import { useToast } from '@/store/toast';

/**
 * One return request, with what the shop needs to decide it: the policy's
 * line for this case, what the customer says and shows, what the order says
 * (the car, the fitment verdict of each line), and the steps still open.
 * Every answer reaches the customer — on their order, by push, by e-mail —
 * so "message au client" is written to them.
 */
export default function StaffReturn() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback((signal: AbortSignal) => staffApi.returnDetail(id, signal), [id]);
  const detail = useLive(load);
  return (
    <>
      <Stack.Screen options={{ title: detail.status === 'loaded' ? detail.data.ref : t('staff.returns') }} />
      {detail.status === 'loading' ? (
        <Loading />
      ) : detail.status === 'failed' ? (
        <Failed failure={detail.failure} onRetry={detail.retry} />
      ) : (
        <Detail r={detail.data} onChange={detail.set} onStale={detail.refresh} />
      )}
    </>
  );
}

const FIT_KEY = { VERIFIED: 'fit.fits', DERIVED: 'fit.likely', UNLISTED: 'fit.unknown' } as const;

function Detail({ r, onChange, onStale }: { r: ReturnDetail; onChange: (d: ReturnDetail) => void; onStale: () => Promise<void> }) {
  const { t, rtl, locale } = useI18n();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const [busy, setBusy] = useState<ReturnMove['to'] | null>(null);
  const [method, setMethod] = useState<'DROP_OFF' | 'PICKUP'>('DROP_OFF');
  const [note, setNote] = useState('');
  const [refuseNote, setRefuseNote] = useState('');
  const [restock, setRestock] = useState(false);
  const [outcome, setOutcome] = useState<'EXCHANGED' | 'REFUNDED'>(r.wish === 'REFUND' ? 'REFUNDED' : 'EXCHANGED');
  const [amount, setAmount] = useState(r.value.toFixed(2));
  const [error, setError] = useState<string | null>(null);

  // The policy's sentence, with the shop's own figures (never typed in here).
  const settings = useShopSettings();
  const copy = coverCopy(r.cover, r.reason, r.order.vehicleLabel, settings.status === 'loaded' ? settings.data : null);
  const cover = copy ? t(copy.key, copy.vars) : null;

  const move = async (m: ReturnMove) => {
    setBusy(m.to);
    setError(null);
    try {
      onChange(await staffApi.moveReturn(r.id, m));
      setNote('');
      setRefuseNote('');
      toast({ message: t('staff.returns.moved') });
    } catch (err) {
      const stale = err instanceof ApiError && err.failure.kind === 'server' && err.failure.status === 409;
      const amountMissing = err instanceof ApiError && err.failure.kind === 'invalid' && err.failure.field === 'refundAmount';
      setError(t(stale ? 'staff.returns.changed' : amountMissing ? 'staff.returns.amountNeeded' : 'staff.returns.failed'));
      if (stale) await onStale();
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={staffStyles.root} contentContainerStyle={staffStyles.scroll}>
      <View style={[row, styles.head]}>
        <View style={styles.flex}>
          <Text variant="sectionTitle" style={align}>
            {t(`returns.reason.${r.reason}`)}
          </Text>
          <Text variant="hint" style={align}>
            {t('staff.returns.wishes', { wish: t(`returns.wish.${r.wish}`).toLowerCase() })}
          </Text>
        </View>
        <ReturnPill status={r.status} />
      </View>

      <Card style={r.cover === 'shop' ? styles.ours : undefined}>
        <Text variant="label" tone={C.textMuted}>
          {t('staff.returns.policy')}
        </Text>
        {cover ? (
          <Text variant="body" tone={C.text} style={[styles.strong, align]}>
            {cover}
          </Text>
        ) : null}
        {r.unmounted ? (
          <Text variant="hint" style={align}>
            {t('staff.returns.declared')}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text variant="label" tone={C.textMuted}>
          {t('staff.returns.customer')}
        </Text>
        <Text variant="rowTitle" style={align}>
          {r.order.customerName}
        </Text>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`tel:${r.order.phone.replace(/\s/g, '')}`)} style={styles.tel}>
          <Text variant="body" tone={C.text} style={[styles.underline, align]}>
            {r.order.phone}
          </Text>
        </Pressable>
        <Text variant="body" style={align}>
          {r.note ? `« ${r.note} »` : t('staff.returns.noNote')}
        </Text>
      </Card>

      <Card>
        <Text variant="label" tone={C.textMuted}>
          {t('staff.returns.order')}
        </Text>
        <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/gestion/commandes/[id]', params: { id: r.order.id } })} style={styles.tel}>
          <Text variant="rowTitle" style={[styles.underline, align]}>
            {r.order.ref}
          </Text>
        </Pressable>
        {r.deliveredAt ? (
          <Text variant="hint" style={align}>
            {t('staff.returns.delivered', { date: formatDate(r.deliveredAt, locale, true) })}
          </Text>
        ) : null}
        <Text variant="hint" style={align}>
          {r.order.vehicleLabel ? t('staff.returns.vehicle', { vehicle: r.order.vehicleLabel }) : t('staff.returns.noVehicle')}
        </Text>
      </Card>

      <Card>
        <Text variant="label" tone={C.textMuted}>
          {t('staff.returns.parts')}
        </Text>
        {r.lines.map((l) => (
          <View key={l.orderItemId} style={[row, styles.line]}>
            <View style={styles.flex}>
              <Text variant="body" tone={C.text} style={align}>
                {l.name}
              </Text>
              <Text variant="hint" style={align}>
                {l.sku}
                {l.fit && r.order.vehicleLabel ? ` · ${t(FIT_KEY[l.fit])}` : ''}
              </Text>
            </View>
            <Text variant="body" tone={C.text}>{`${l.qty}/${l.ordered} × ${formatDT(l.unitPrice)}`}</Text>
          </View>
        ))}
        <Text variant="hint" tone={C.text} style={align}>
          {t('staff.returns.value', { v: formatDT(r.value) })}
        </Text>
      </Card>

      {r.photoIds.length ? (
        <Card>
          <Text variant="label" tone={C.textMuted}>
            {t('staff.returns.photos')}
          </Text>
          <View style={[row, styles.photos]}>
            {r.photoIds.map((pid) => (
              <PrivatePhoto key={pid} path={staffApi.returnPhotoUrl(pid)} style={styles.photo} label={t('staff.returns.photos')} />
            ))}
          </View>
        </Card>
      ) : null}

      {r.shopNote || r.outcome || r.method ? (
        <Card>
          {r.method ? (
            <Text variant="body" tone={C.text} style={align}>
              {t(`returns.method.${r.method}`)}
            </Text>
          ) : null}
          {r.outcome ? (
            <Line
              label={t('staff.returns.settle')}
              value={r.outcome === 'REFUNDED' && r.refundAmount !== null ? t('returns.refunded', { amount: formatDT(r.refundAmount) }) : t(`returns.outcome.${r.outcome}`)}
            />
          ) : null}
          {r.shopNote ? (
            <Text variant="body" style={align}>
              {`${t('returns.shopNote')} : « ${r.shopNote} »`}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {r.next.some((n) => n !== 'CANCELLED') ? (
        <Card style={styles.answer}>
          <Text style={[styles.answerTitle, { fontFamily: familyFor('heading', rtl) }, align]}>{t('staff.returns.answer')}</Text>

          {r.next.includes('APPROVED') ? (
            <View style={styles.block}>
              <Text variant="body" tone={C.text} style={[styles.strong, align]}>
                {t('staff.returns.method')}
              </Text>
              <Choice on={method === 'DROP_OFF'} label={t('staff.returns.dropOff')} onPress={() => setMethod('DROP_OFF')} />
              <Choice on={method === 'PICKUP'} label={t('staff.returns.pickup')} onPress={() => setMethod('PICKUP')} />
              <FormField label={t('staff.returns.note')} value={note} onChangeText={setNote} multiline maxLength={1000} />
              <Button label={t('staff.returns.approve')} icon="check" loading={busy === 'APPROVED'} onPress={() => void move({ to: 'APPROVED', method, shopNote: note.trim() || undefined })} />
            </View>
          ) : null}

          {r.next.includes('RECEIVED') ? (
            <View style={styles.block}>
              <Text variant="body" tone={C.text} style={[styles.strong, align]}>
                {t('staff.returns.receivedTitle')}
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: restock }}
                onPress={() => setRestock((v) => !v)}
                style={({ pressed }) => [styles.choice, row, restock && styles.choiceOn, pressed && styles.pressed]}
              >
                <View style={[styles.box, restock && styles.boxOn]}>{restock ? <Feather name="check" size={16} color={Brand.white} /> : null}</View>
                <Text variant="body" tone={C.text} style={[styles.flex, align]}>
                  {t('staff.returns.restock')}
                </Text>
              </Pressable>
              <Button label={t('staff.returns.receive')} icon="package" loading={busy === 'RECEIVED'} onPress={() => void move({ to: 'RECEIVED', restock })} />
            </View>
          ) : null}

          {r.next.includes('RESOLVED') ? (
            <View style={styles.block}>
              <Text variant="body" tone={C.text} style={[styles.strong, align]}>
                {t('staff.returns.settle')}
              </Text>
              <Choice on={outcome === 'EXCHANGED'} label={t('returns.outcome.EXCHANGED')} onPress={() => setOutcome('EXCHANGED')} />
              <Choice on={outcome === 'REFUNDED'} label={t('returns.outcome.REFUNDED')} onPress={() => setOutcome('REFUNDED')} />
              {outcome === 'REFUNDED' ? (
                <View style={styles.amount}>
                  <Text variant="hint" style={align}>
                    {t('staff.returns.amount')}
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    accessibilityLabel={t('staff.returns.amount')}
                    style={[styles.input, { fontFamily: familyFor('bodySemi', rtl) }]}
                  />
                  <Text variant="hint" style={align}>
                    {t('staff.returns.value', { v: formatDT(r.value) })}
                  </Text>
                </View>
              ) : null}
              <FormField label={t('staff.returns.note')} value={note} onChangeText={setNote} multiline maxLength={1000} />
              <Button
                label={t('staff.returns.resolve')}
                icon="check-circle"
                loading={busy === 'RESOLVED'}
                onPress={() => {
                  const refund = Number(amount.replace(',', '.'));
                  if (outcome === 'REFUNDED' && !(refund >= 0)) return setError(t('staff.returns.amountNeeded'));
                  void move({ to: 'RESOLVED', outcome, refundAmount: outcome === 'REFUNDED' ? refund : undefined, shopNote: note.trim() || undefined });
                }}
              />
            </View>
          ) : null}

          {r.next.includes('REFUSED') ? (
            <View style={[styles.block, styles.refuse]}>
              <FormField label={t('staff.returns.refuseWhy')} value={refuseNote} onChangeText={setRefuseNote} multiline maxLength={1000} />
              <Button
                label={t('staff.returns.refuse')}
                variant="danger"
                disabled={refuseNote.trim().length < 3}
                loading={busy === 'REFUSED'}
                onPress={() => void move({ to: 'REFUSED', shopNote: refuseNote.trim() })}
              />
            </View>
          ) : null}

          {error ? (
            <Text variant="body" tone={C.danger} accessibilityLiveRegion="polite" style={align}>
              {error}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  strong: { fontWeight: '600' },
  underline: { textDecorationLine: 'underline' },
  ours: { backgroundColor: C.dangerSurface },
  tel: { minHeight: Tap.min, justifyContent: 'center', alignSelf: 'flex-start' },
  line: { alignItems: 'center', gap: Spacing.two, paddingVertical: 4 },
  photos: { gap: Spacing.two, flexWrap: 'wrap' },
  photo: { width: 120, height: 120, borderRadius: Radius.tile },
  answer: { borderWidth: 2, borderColor: C.surfaceBrand },
  answerTitle: { fontSize: 19, lineHeight: 24, color: C.text },
  block: { gap: Spacing.two },
  refuse: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: Spacing.three },
  choice: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.min, paddingHorizontal: Spacing.three, borderRadius: Radius.tile, borderWidth: 1.5, borderColor: C.border },
  choiceOn: { borderColor: C.surfaceBrand, backgroundColor: C.surface },
  pressed: { backgroundColor: C.surfacePressed },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.textFaint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.surfaceBrand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.surfaceBrand },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.textFaint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.surfaceBrand, borderColor: C.surfaceBrand },
  amount: { gap: 4 },
  input: { minHeight: Tap.min, borderRadius: Radius.tile, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: Spacing.three, fontSize: 17, color: C.text, backgroundColor: Brand.white },
});

function Choice({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const { rtl } = useI18n();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, { flexDirection: rtl ? 'row-reverse' : 'row' }, on && styles.choiceOn, pressed && styles.pressed]}
    >
      <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
      <Text variant="body" tone={C.text} style={[styles.flex, { textAlign: rtl ? 'right' : 'left' }]}>
        {label}
      </Text>
    </Pressable>
  );
}
