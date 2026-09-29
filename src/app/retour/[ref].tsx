import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { ordersApi, type Order, type ReturnReason, type ReturnWish } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { PartImage } from '@/components/ui/part-image';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useI18n } from '@/i18n/provider';
import { formatDate } from '@/lib/format';
import { appendPhoto, pickPhoto, type PickedPhoto } from '@/lib/photo';
import { coverCopy, MAX_RETURN_PHOTOS, returnErrorKey } from '@/lib/returns';
import { track } from '@/services/analytics';
import { useNotify } from '@/store/notify';
import { useOrders } from '@/store/orders';

const WISHES: ReturnWish[] = ['EXCHANGE', 'REFUND'];

/**
 * "Retourner une pièce" — the request, in the order a customer thinks it:
 * which part, what is wrong with it, then what the policy says about that
 * (deadline, who pays, the photo it asks for), what they would like, send.
 *
 * Every rule on this screen is the shop's answer for this order
 * (`returnOptions`), and the shop checks it all again when the request
 * arrives. What happens after is said plainly: nothing is refunded or
 * exchanged automatically; the shop answers on the order.
 */
export default function ReturnScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { t } = useI18n();
  const tokenFor = useOrders((s) => s.tokenFor);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const token = await tokenFor(ref);
      if (!token) throw new ApiError({ kind: 'unauthorized' }, 'no token on this phone');
      return ordersApi.get(ref, token, signal);
    },
    [ref, tokenFor],
  );
  const order = useResource(load);

  return (
    <>
      <Stack.Screen options={{ title: t('returns.form.title') }} />
      {order.status === 'loading' ? (
        <Loading />
      ) : order.status === 'failed' ? (
        <Failed failure={order.failure} onRetry={order.retry} />
      ) : (
        <ReturnForm order={order.data} />
      )}
    </>
  );
}

function ReturnForm({ order }: { order: Order }) {
  const { t, locale, rtl } = useI18n();
  const router = useRouter();
  const settings = useShopSettings();
  const tokenFor = useOrders((s) => s.tokenFor);
  const notified = useNotify((s) => s.orders.includes(order.ref));
  const options = order.returnOptions ?? null;
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  // The lines that can still go back, with how many of each.
  const lines = useMemo(
    () =>
      order.items
        .filter((i) => i.id)
        .map((i) => ({ ...i, id: i.id!, returnable: options?.items.find((x) => x.orderItemId === i.id)?.returnable ?? 0 })),
    [order.items, options],
  );
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const free = lines.filter((l) => l.returnable > 0);
    return free.length === 1 ? { [free[0].id]: 1 } : {};
  });
  const [reason, setReason] = useState<ReturnReason | null>(null);
  const [wish, setWish] = useState<ReturnWish>('EXCHANGE');
  const [note, setNote] = useState('');
  const [unmounted, setUnmounted] = useState(false);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    track('return_opened', { ref: order.ref });
  }, [order.ref]);

  if (!options) {
    return (
      <View style={styles.centre}>
        <EmptyState art={<Feather name="package" size={48} color={C.textMuted} />} title={t('returns.form.title')} body={t('returns.notDelivered')}>
          <Button label={t('returns.sent.back')} variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </View>
    );
  }

  const rule = options.reasons.find((r) => r.reason === reason) ?? null;
  const figures = settings.status === 'loaded' ? settings.data : null;
  const chosen = Object.values(qty).some((n) => n > 0);

  async function add(from: 'camera' | 'library') {
    const photo = await pickPhoto(from).catch(() => null);
    if (photo) {
      setPhotos((p) => [...p, photo].slice(0, MAX_RETURN_PHOTOS));
      setError(null);
    }
  }

  async function send() {
    setError(null);
    if (!chosen) return setError(t('returns.err.items'));
    if (!rule) return setError(t('returns.err.reason'));
    if (rule.photo === 'required' && photos.length === 0) return setError(t('returns.err.photo'));
    if (rule.unmounted && !unmounted) return setError(t('returns.err.unmounted'));
    setBusy(true);
    try {
      const token = await tokenFor(order.ref);
      if (!token) throw new ApiError({ kind: 'unauthorized' }, 'no token');
      const form = new FormData();
      form.append(
        'request',
        JSON.stringify({
          reason,
          wish,
          note: note.trim() || undefined,
          unmounted: rule.unmounted ? unmounted : false,
          items: Object.entries(qty)
            .filter(([, n]) => n > 0)
            .map(([orderItemId, n]) => ({ orderItemId, qty: n })),
        }),
      );
      for (const p of photos) await appendPhoto(form, 'photos', p);
      const result = await ordersApi.fileReturn(order.ref, token, form);
      track('return_requested', { reason: rule.reason, cover: rule.cover, photos: photos.length, wish });
      setSent(result.returnRef);
    } catch (err) {
      const failure = err instanceof ApiError ? err.failure : null;
      track('return_failed', { reason: failure?.kind === 'invalid' ? (failure.reason ?? failure.field) : (failure?.kind ?? 'unknown') });
      setError(
        failure?.kind === 'rateLimited'
          ? t('returns.err.rateLimited')
          : t(returnErrorKey(failure?.kind === 'invalid' ? failure.reason : undefined)),
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.centre}>
        <EmptyState
          art={
            <View style={styles.sentBadge}>
              <Feather name="check" size={36} color={Brand.white} />
            </View>
          }
          title={t('returns.sent.title')}
          body={[t('returns.sent.body', { ref: sent }), notified ? t('returns.sent.push') : null].filter(Boolean).join('\n')}
        >
          <Button label={t('returns.sent.back')} onPress={() => router.back()} />
        </EmptyState>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text variant="hint" style={align}>
            {t('returns.form.order', { ref: order.ref })}
            {order.vehicleLabel ? ` · ${order.vehicleLabel}` : ''}
          </Text>

          {/* 1 — which part */}
          <Section n={1} title={t('returns.form.which')} />
          <View style={styles.list}>
            {lines.map((l) => (
              <View key={l.id} style={[row, styles.line]}>
                <View style={styles.art}>
                  {l.familySlug ? <PartImage slug={l.familySlug} size={34} /> : <Feather name="package" size={IconSize.large} color={C.textMuted} />}
                </View>
                <View style={styles.flex}>
                  <Text variant="body" tone={C.text} numberOfLines={2} style={align}>
                    {l.name}
                  </Text>
                  <Text variant="hint" style={align}>
                    {l.returnable < l.qty ? `${l.sku} · ${t('returns.form.alreadyIn', { n: l.qty - l.returnable })}` : l.sku}
                  </Text>
                </View>
                {l.returnable > 0 ? (
                  <QuantityStepper value={qty[l.id] ?? 0} min={0} max={l.returnable} size="compact" onChange={(n) => {
                      setQty((q) => ({ ...q, [l.id]: n }));
                      setError(null);
                    }} />
                ) : (
                  <Text variant="hint">{t('returns.form.none')}</Text>
                )}
              </View>
            ))}
          </View>

          {/* 2 — what is wrong, each with its deadline and what the policy says */}
          <Section n={2} title={t('returns.form.what')} />
          <View style={styles.list} accessibilityRole="radiogroup">
            {options.reasons.map((r) => {
              const selected = reason === r.reason;
              const shop = r.open && r.cover === 'shop' ? coverCopy(r.cover, r.reason, order.vehicleLabel, figures) : null;
              return (
                <Pressable
                  key={r.reason}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: !r.open }}
                  disabled={!r.open}
                  onPress={() => {
                    setReason(r.reason);
                    setError(null);
                  }}
                  style={({ pressed }) => [styles.reason, row, selected && styles.reasonOn, !r.open && styles.reasonClosed, pressed && styles.pressed]}
                >
                  <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  <View style={styles.flex}>
                    <Text variant="body" tone={r.open ? C.text : C.textFaint} style={[styles.strong, align]}>
                      {t(`returns.reason.${r.reason}`)}
                    </Text>
                    <Text variant="hint" style={align}>
                      {r.open ? t('returns.until', { date: formatDate(r.until, locale, true) }) : t('returns.closed')}
                      {r.open && r.photo === 'required' ? ` · ${t('returns.photoNeeded')}` : ''}
                    </Text>
                    {shop ? (
                      <View style={[row, styles.ours]}>
                        <Feather name="shield" size={14} color={C.success} />
                        <Text variant="hint" tone={C.success} style={[styles.flex, styles.strong, align]}>
                          {t(shop.key, shop.vars)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* 3 — the details that reason asks for */}
          {rule ? (
            <>
              <Section n={3} title={t('returns.form.details')} />
              {(() => {
                const cover = coverCopy(rule.cover, rule.reason, order.vehicleLabel, figures);
                return cover ? (
                  <View style={[row, styles.policyBox, rule.cover === 'shop' && styles.policyOurs]}>
                    <Feather name={rule.cover === 'warranty' ? 'shield' : 'info'} size={18} color={rule.cover === 'shop' ? C.success : C.text} />
                    <Text variant="body" tone={rule.cover === 'shop' ? C.success : C.text} style={[styles.flex, align]}>
                      {t(cover.key, cover.vars)}
                    </Text>
                  </View>
                ) : null;
              })()}

              <Text style={[styles.sub, { fontFamily: familyFor('heading', rtl) }, align]}>{t('returns.form.photos', { n: photos.length })}</Text>
              <Text variant="hint" tone={rule.photo === 'required' ? C.text : C.textMuted} style={align}>
                {t(rule.photo === 'required' ? 'returns.form.photosRequired' : 'returns.form.photosOptional')}
              </Text>
              <View style={[row, styles.slots]}>
                {photos.map((p, i) => (
                  <View key={p.uri} style={styles.slot}>
                    <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('expert.remove')}
                      hitSlop={8}
                      onPress={() => setPhotos((all) => all.filter((_, j) => j !== i))}
                      style={styles.removeBtn}
                    >
                      <Feather name="x" size={16} color={Brand.white} />
                    </Pressable>
                  </View>
                ))}
              </View>
              {photos.length < MAX_RETURN_PHOTOS ? (
                <View style={[row, styles.pickers]}>
                  {Platform.OS !== 'web' ? <Button label={t('expert.camera')} icon="camera" onPress={() => void add('camera')} style={styles.flex} /> : null}
                  <Button
                    label={t('expert.library')}
                    icon="image"
                    variant={Platform.OS !== 'web' ? 'secondary' : 'primary'}
                    onPress={() => void add('library')}
                    style={styles.flex}
                  />
                </View>
              ) : null}

              <FormField
                label={t('returns.form.note')}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={1000}
                placeholder={t('returns.form.notePlaceholder')}
              />

              <Text style={[styles.sub, { fontFamily: familyFor('heading', rtl) }, align]}>{t('returns.form.wish')}</Text>
              <View style={[row, styles.wishes]} accessibilityRole="radiogroup">
                {WISHES.map((w) => (
                  <Pressable
                    key={w}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: wish === w }}
                    onPress={() => setWish(w)}
                    style={({ pressed }) => [styles.wish, wish === w && styles.wishOn, pressed && styles.pressed]}
                  >
                    <Text variant="body" tone={wish === w ? Brand.white : C.text} style={styles.strong}>
                      {t(`returns.wish.${w}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text variant="hint" style={align}>
                {t('returns.form.wishHint')}
              </Text>

              {rule.unmounted ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: unmounted }}
                  onPress={() => {
                    setUnmounted((v) => !v);
                    setError(null);
                  }}
                  style={({ pressed }) => [styles.check, row, unmounted && styles.checkOn, pressed && styles.pressed]}
                >
                  <View style={[styles.box, unmounted && styles.boxOn]}>{unmounted ? <Feather name="check" size={16} color={Brand.white} /> : null}</View>
                  <Text variant="body" tone={C.text} style={[styles.flex, align]}>
                    {t('returns.form.unmounted')}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}

          {error ? (
            <Text variant="body" tone={C.danger} accessibilityLiveRegion="polite" style={align}>
              {error}
            </Text>
          ) : null}
          <Button label={t('returns.form.send')} icon="send" loading={busy} onPress={() => void send()} />
          <Text variant="hint" style={[styles.centred]}>
            {t('returns.form.honest')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ n, title }: { n: number; title: string }) {
  const { t, rtl } = useI18n();
  return (
    <View style={[styles.section, { flexDirection: rtl ? 'row-reverse' : 'row' }]} accessibilityRole="header" accessibilityLabel={`${t('returns.form.step', { n })}, ${title}`}>
      <View style={styles.sectionNum}>
        <Text style={[styles.sectionNumText, { fontFamily: familyFor('headingStrong', rtl) }]}>{n}</Text>
      </View>
      <Text style={[styles.sectionTitle, { fontFamily: familyFor('heading', rtl) }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  centre: { flex: 1, justifyContent: 'center', backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1, minWidth: 0 },
  strong: { fontWeight: '600' },
  centred: { textAlign: 'center' },
  section: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  sectionNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.surfaceBrand, alignItems: 'center', justifyContent: 'center' },
  sectionNumText: { color: Brand.white, fontSize: 14, lineHeight: 18 },
  sectionTitle: { fontSize: 19, lineHeight: 24, color: C.text },
  sub: { fontSize: 16, lineHeight: 21, color: C.text, marginTop: Spacing.one },
  list: { gap: Spacing.two },
  line: { alignItems: 'center', gap: Spacing.three, padding: Spacing.two, borderRadius: Radius.tile, backgroundColor: C.surface },
  art: { width: 44, height: 44, borderRadius: Radius.tile, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
  reason: {
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    minHeight: Tap.primary,
    borderRadius: Radius.tile,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  reasonOn: { borderColor: C.surfaceBrand, backgroundColor: C.surface },
  reasonClosed: { backgroundColor: C.background, borderStyle: 'dashed' },
  pressed: { backgroundColor: C.surfacePressed },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.textFaint, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radioOn: { borderColor: C.surfaceBrand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.surfaceBrand },
  ours: { alignItems: 'flex-start', gap: 6, paddingTop: 4 },
  policyBox: { alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.tile, backgroundColor: C.surface },
  policyOurs: { backgroundColor: C.successSurface },
  slots: { gap: Spacing.two, flexWrap: 'wrap' },
  slot: { width: 84, height: 84, borderRadius: Radius.tile, overflow: 'hidden', backgroundColor: C.surface },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(8,22,51,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickers: { gap: Spacing.two },
  wishes: { gap: Spacing.two },
  wish: {
    flex: 1,
    minHeight: Tap.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  wishOn: { backgroundColor: C.surfaceBrand, borderColor: C.surfaceBrand },
  check: { alignItems: 'flex-start', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.tile, borderWidth: 1.5, borderColor: C.border },
  checkOn: { borderColor: C.surfaceBrand, backgroundColor: C.surface },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.textFaint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.surfaceBrand, borderColor: C.surfaceBrand },
  sentBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
});
