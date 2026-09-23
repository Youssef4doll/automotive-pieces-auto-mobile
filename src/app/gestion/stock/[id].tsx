import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError, type ApiFailure } from '@/api/client';
import { staffApi, type ProductDetail, type Supply } from '@/api/staff';
import { Card, FilterChips, Tag, ToggleRow, staffStyles } from '@/components/staff/kit';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { API_BASE_URL } from '@/constants/config';
import { Brand, C, Radius, Spacing, Tap } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { formatDate, formatDT } from '@/lib/format';
import { photoForm, pickPhoto } from '@/lib/photo';
import { useToast } from '@/store/toast';

/**
 * One part, as it is handled at the shelf: its photos, its count, its price
 * and whether it is on sale. Everything that needs a keyboard and a long
 * look — references, fitments, description — stays on the website, and the
 * screen says so rather than half-offering it.
 */
export default function StaffProduct() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback((signal: AbortSignal) => staffApi.product(id, signal), [id]);
  const product = useLive(load);

  return (
    <>
      <Stack.Screen options={{ title: t('staff.menu.stock') }} />
      {product.status === 'loading' ? (
        <Loading />
      ) : product.status === 'failed' ? (
        <Failed failure={product.failure} onRetry={product.retry} />
      ) : (
        <Editor product={product.data} onChange={product.set} />
      )}
    </>
  );
}

/** "42,50", "42.5", "42" → 42.5; anything else → null. */
function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(s)) return null;
  return Number(s);
}
function parseCount(raw: string): number | null {
  const s = raw.trim();
  return /^\d{1,6}$/.test(s) ? Number(s) : null;
}
const amountText = (n: number) => n.toFixed(2).replace('.', ',');

function Editor({ product, onChange }: { product: ProductDetail; onChange: (p: ProductDetail) => void }) {
  const { t, rtl, locale } = useI18n();
  const toast = useToast((s) => s.show);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const start = { alignItems: rtl ? ('flex-end' as const) : ('flex-start' as const) };

  const fail = (err: unknown, fallback: DictKey = 'staff.err.save') => {
    if (err instanceof ApiError && err.failure.kind === 'unauthorized') return;
    toast({ message: t(photoMessage(err instanceof ApiError ? err.failure : null) ?? fallback), tone: 'neutral' });
  };

  // ---- photos
  const [photo, setPhoto] = useState<{ id: string; primary: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const add = async (from: 'camera' | 'library') => {
    try {
      const picked = await pickPhoto(from);
      if (!picked) return;
      setUploading(true);
      onChange(await staffApi.addPhoto(product.id, await photoForm('files', picked)));
      toast({ message: t('staff.p.photoAdded'), tone: 'success' });
    } catch (err) {
      fail(err, 'staff.p.photoBad');
    } finally {
      setUploading(false);
    }
  };
  const photoAction = async (kind: 'primary' | 'delete') => {
    if (!photo) return;
    try {
      if (kind === 'primary') await staffApi.primaryPhoto(photo.id);
      else await staffApi.deletePhoto(photo.id);
      onChange(await staffApi.product(product.id));
      toast({ message: t(kind === 'primary' ? 'staff.p.primarySet' : 'staff.p.photoDeleted'), tone: 'success' });
    } catch (err) {
      fail(err);
    } finally {
      setPhoto(null);
    }
  };

  // ---- stock count
  const [counted, setCounted] = useState(String(Math.max(0, product.stockQty)));
  const [countError, setCountError] = useState(false);
  const [savingCount, setSavingCount] = useState(false);
  useEffect(() => setCounted(String(Math.max(0, product.stockQty))), [product.stockQty]);
  const step = (d: number) => {
    const n = parseCount(counted) ?? 0;
    setCounted(String(Math.max(0, n + d)));
    setCountError(false);
  };
  const saveCount = async () => {
    const n = parseCount(counted);
    if (n === null) return setCountError(true);
    setSavingCount(true);
    try {
      const next = await staffApi.stock(product.id, { set: n });
      onChange(next);
      toast({ message: t('staff.p.stockSaved', { n: next.stockQty }), tone: 'success' });
    } catch (err) {
      fail(err);
    } finally {
      setSavingCount(false);
    }
  };

  // ---- sale details
  const [price, setPrice] = useState(amountText(product.price));
  const [priceBuy, setPriceBuy] = useState(amountText(product.priceBuy));
  const [threshold, setThreshold] = useState(String(product.lowStockThreshold));
  const [active, setActive] = useState(product.active);
  const [supply, setSupply] = useState<Supply>(product.supply);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const p = parseAmount(price);
    const b = parseAmount(priceBuy);
    const th = parseCount(threshold);
    const bad = { price: p === null, priceBuy: b === null, threshold: th === null };
    setErrors(bad);
    if (bad.price || bad.priceBuy || bad.threshold) return;
    const patch: Parameters<typeof staffApi.updateProduct>[1] = {};
    if (p !== product.price) patch.priceSell = p!;
    if (b !== product.priceBuy) patch.priceBuy = b!;
    if (th !== product.lowStockThreshold) patch.lowStockThreshold = th!;
    if (active !== product.active) patch.active = active;
    if (supply !== product.supply) patch.supply = supply;
    if (Object.keys(patch).length === 0) return toast({ message: t('staff.p.saved'), tone: 'neutral' });
    setSaving(true);
    try {
      const next = await staffApi.updateProduct(product.id, patch);
      onChange(next);
      setPrice(amountText(next.price));
      setPriceBuy(amountText(next.priceBuy));
      toast({ message: t('staff.p.saved'), tone: 'success' });
    } catch (err) {
      fail(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={staffStyles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={staffStyles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[start, { gap: 4 }]}>
          <Text variant="screenTitle">{product.name}</Text>
          <Text variant="hint" style={styles.ltr}>
            {[product.brand, product.sku].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="hint">{product.category}</Text>
        </View>

        <Card>
          <View style={[row, styles.between]}>
            <Text variant="label" tone={C.textMuted}>
              {t('staff.p.photos')}
            </Text>
            <Text variant="hint">{product.images.length}/8</Text>
          </View>
          {product.images.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.photos, row]}>
              {product.images.map((img, i) => (
                <Pressable
                  key={img.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('staff.p.photos')} ${i + 1}${i === 0 ? `, ${t('staff.p.primary')}` : ''}`}
                  onPress={() => setPhoto({ id: img.id, primary: i === 0 })}
                  style={[styles.photo, i === 0 && styles.photoPrimary]}
                >
                  <Image source={{ uri: `${API_BASE_URL}${img.url}` }} style={styles.photoImg} contentFit="cover" />
                  {i === 0 ? (
                    <View style={styles.primaryBadge}>
                      <Text variant="hint" tone={Brand.navy900}>
                        {t('staff.p.primary')}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text variant="body" tone={C.textMuted}>
              {t('staff.p.noPhoto')}
            </Text>
          )}
          {uploading ? (
            <Text variant="hint">{t('staff.p.sending')}</Text>
          ) : product.images.length >= 8 ? (
            <Text variant="hint">{t('staff.p.photoFull')}</Text>
          ) : (
            <View style={[row, styles.gap]}>
              <Button label={t('staff.p.camera')} icon="camera" variant="secondary" onPress={() => add('camera')} style={styles.flex} />
              <Button label={t('staff.p.library')} icon="image" variant="secondary" onPress={() => add('library')} style={styles.flex} />
            </View>
          )}
        </Card>

        <Card>
          <View style={[row, styles.between]}>
            <Text variant="label" tone={C.textMuted}>
              {t('staff.p.stock')}
            </Text>
            <Tag
              label={t('staff.qtyN', { n: product.stockQty })}
              tone={product.stockQty <= 0 ? 'danger' : product.stockQty <= product.lowStockThreshold ? 'caution' : 'muted'}
            />
          </View>
          <View style={[row, styles.gap, { alignItems: 'flex-end' }]}>
            <StepButton icon="minus" label="−1" onPress={() => step(-1)} />
            <View style={styles.flex}>
              <FormField
                label={t('staff.p.counted')}
                value={counted}
                onChangeText={(v) => {
                  setCounted(v);
                  setCountError(false);
                }}
                keyboardType="number-pad"
                error={countError ? t('staff.p.errQty') : null}
                ltr
                style={styles.centreText}
              />
            </View>
            <StepButton icon="plus" label="+1" onPress={() => step(1)} />
          </View>
          <Button
            label={t('staff.p.saveCount')}
            onPress={saveCount}
            loading={savingCount}
            disabled={parseCount(counted) === product.stockQty}
          />
          {product.movements.length ? (
            <View style={styles.moves}>
              <Text variant="hint" tone={C.textMuted}>
                {t('staff.p.movements')}
              </Text>
              {product.movements.slice(0, 5).map((m, i) => (
                <View key={i} style={[row, styles.between]}>
                  <Text variant="hint" style={styles.flex} numberOfLines={1}>
                    {moveLabel(m.reason, t)}
                    {m.note ? ` · ${m.note}` : ''} · {formatDate(m.at, locale)}
                  </Text>
                  <Text variant="hint" tone={m.change > 0 ? C.success : C.danger} style={styles.ltr}>
                    {m.change > 0 ? `+${m.change}` : String(m.change)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        <Card>
          <ToggleRow label={t('staff.p.online')} hint={t('staff.p.onlineHint')} value={active} onChange={setActive} />
          <FormField
            label={t('staff.p.price')}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            error={errors.price ? t('staff.p.errPrice') : null}
            ltr
          />
          {product.compareAtPrice ? <Text variant="hint">{t('staff.p.compareAt', { p: formatDT(product.compareAtPrice) })}</Text> : null}
          <FormField
            label={t('staff.p.priceBuy')}
            value={priceBuy}
            onChangeText={setPriceBuy}
            keyboardType="decimal-pad"
            error={errors.priceBuy ? t('staff.p.errPrice') : null}
            ltr
          />
          <FormField
            label={t('staff.p.threshold')}
            value={threshold}
            onChangeText={setThreshold}
            keyboardType="number-pad"
            error={errors.threshold ? t('staff.p.errQty') : null}
            ltr
          />
          <Text variant="hint" tone={C.text}>
            {t('staff.p.supply')}
          </Text>
          <FilterChips
            options={[
              { key: 'ON_ORDER' as Supply, label: t('staff.p.supplyOnOrder') },
              { key: 'UNAVAILABLE' as Supply, label: t('staff.p.supplyUnavailable') },
            ]}
            value={supply}
            onChange={setSupply}
          />
          <Button label={t('staff.p.save')} onPress={save} loading={saving} icon="save" />
        </Card>

        <Text variant="hint" tone={C.textMuted} style={styles.centreText}>
          {t('staff.p.onWeb')}
        </Text>

        <BottomSheet visible={photo !== null} onClose={() => setPhoto(null)} title={t('staff.p.photos')}>
          <View style={styles.sheet}>
            {photo && !photo.primary ? (
              <Button label={t('staff.p.makePrimary')} variant="secondary" icon="star" onPress={() => photoAction('primary')} />
            ) : null}
            <Text variant="hint">{t('staff.p.deleteWhy')}</Text>
            <Button label={t('staff.p.deletePhoto')} variant="danger" icon="trash-2" onPress={() => photoAction('delete')} />
            <Button label={t('garage.cancel')} variant="secondary" onPress={() => setPhoto(null)} />
          </View>
        </BottomSheet>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function photoMessage(failure: ApiFailure | null): DictKey | null {
  if (failure?.kind !== 'invalid' || failure.field !== 'files') return null;
  return failure.reason === 'full' || failure.reason === 'too_many' ? 'staff.p.photoFull' : 'staff.p.photoBad';
}

function moveLabel(reason: string, t: (k: DictKey) => string) {
  return reason === 'order' ? t('staff.move.order') : reason === 'restock' ? t('staff.move.restock') : t('staff.move.adjustment');
}

function StepButton({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: C.surfacePressed }]}
    >
      <Feather name={icon} size={20} color={C.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  between: { justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  gap: { gap: Spacing.two },
  photos: { gap: Spacing.two },
  photo: { width: 96, height: 96, borderRadius: 14, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  photoPrimary: { borderWidth: 2, borderColor: C.accent },
  photoImg: { width: '100%', height: '100%' },
  primaryBadge: { position: 'absolute', left: 4, bottom: 4, backgroundColor: C.accent, borderRadius: Radius.pill, paddingHorizontal: 6 },
  step: {
    width: Tap.primary,
    height: Tap.primary,
    borderRadius: Tap.primary / 2,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  centreText: { textAlign: 'center' },
  moves: { gap: 4, marginTop: Spacing.one },
  ltr: { writingDirection: 'ltr' },
  sheet: { gap: Spacing.two, paddingBottom: Spacing.two },
});
