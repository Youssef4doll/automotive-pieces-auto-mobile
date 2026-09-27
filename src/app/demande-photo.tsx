import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { expertApi } from '@/api/expert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { MakeLogo } from '@/components/ui/make-logo';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useI18n } from '@/i18n/provider';
import { RENDERS } from '@/illustrations/renders';
import { tunisianDigits } from '@/lib/checkout';
import { appendPhoto, pickPhoto, type PickedPhoto } from '@/lib/photo';
import { track } from '@/services/analytics';
import { accountToken, useAccount } from '@/store/account';
import { useCheckout } from '@/store/checkout';
import { useGarage, vehicleLabel } from '@/store/garage';

const MAX = 3;

/**
 * "I have the part in my hand but not its name."
 *
 * Photos (up to three), the car from the garage, a name and a phone — into
 * the shop's inbox with the photos attached (POST /api/v1/expert-requests).
 * What the customer is promised is exactly what happens: a person at the shop
 * looks and calls back. No "our AI identified…", no response time the shop
 * never gave. When the shop has published a WhatsApp number, that is offered
 * too, with the car already written into the message.
 *
 * `?sku=` when opened from a part the customer is unsure about ("Demander à
 * la boutique" on a "to check" product), so the shop knows which one.
 */
export default function PhotoRequestScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const { sku } = useLocalSearchParams<{ sku?: string }>();
  const active = useGarage((s) => s.active);
  const account = useAccount((s) => (s.status === 'signedIn' ? s.account : null));
  const saved = useCheckout((s) => s.details);
  const settings = useShopSettings();
  const whatsapp = settings.status === 'loaded' ? settings.data.contact.whatsapp : null;
  const hours = settings.status === 'loaded' ? settings.data.contact.hours : null;

  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [name, setName] = useState(account?.name ?? saved.customerName);
  const [phone, setPhone] = useState(account?.phone ?? saved.phone);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [touched, setTouched] = useState(false);

  const car = vehicleLabel(active);
  const nameBad = name.trim().length < 2;
  const phoneBad = !tunisianDigits(phone);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const whatsappText = [t('help.message'), car ? t('help.messageVehicle', { vehicle: car }) : null, sku ? t('expert.forPart', { sku }) : null]
    .filter(Boolean)
    .join('\n');
  const openWhatsapp = () => {
    track('whatsapp_opened', { from: 'photo_request', vehicle: Boolean(car) });
    void Linking.openURL(`https://wa.me/${whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappText)}`).catch(() => undefined);
  };

  async function add(from: 'camera' | 'library') {
    const photo = await pickPhoto(from).catch(() => null);
    if (photo) setPhotos((p) => [...p, photo].slice(0, MAX));
  }

  async function submit() {
    setTouched(true);
    setError(null);
    if (photos.length === 0) return setError(t('expert.needPhoto'));
    if (nameBad || phoneBad) return;
    setBusy(true);
    try {
      const form = new FormData();
      for (const p of photos) await appendPhoto(form, 'photos', p);
      form.append('name', name.trim());
      form.append('phone', tunisianDigits(phone)!);
      if (note.trim()) form.append('note', note.trim());
      if (car) form.append('vehicle', car);
      if (sku) form.append('productSku', sku);
      await expertApi.send(form, accountToken());
      track('expert_request', { photos: photos.length, vehicle: Boolean(car), product: Boolean(sku) });
      // Remember who they are for next time, as the checkout does.
      useCheckout.getState().update({ customerName: name.trim(), phone: phone.trim() });
      setSent(true);
    } catch {
      setError(t('expert.failed'));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.sentRoot}>
        <Stack.Screen options={{ title: t('expert.title') }} />
        <EmptyState
          art={<Image source={RENDERS.phone} style={{ width: 112, height: 112 }} contentFit="contain" />}
          title={t('expert.sentTitle')}
          body={[t('expert.sentBody', { phone: phone.trim() }), hours ? t('expert.sentHours', { h: hours }) : null].filter(Boolean).join('\n')}
        >
          <Button label={t('expert.done')} onPress={() => router.dismissTo('/')} />
          {whatsapp ? <Button label={t('expert.whatsappToo')} icon="message-circle" variant="secondary" onPress={openWhatsapp} /> : null}
        </EmptyState>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('expert.title') }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text variant="body" style={{ textAlign: rtl ? 'right' : 'left' }}>
            {t('expert.lead')}
          </Text>
          {sku ? (
            <Text variant="hint" style={{ textAlign: rtl ? 'right' : 'left' }}>
              {t('expert.forPart', { sku })}
            </Text>
          ) : null}

          {/* The photos: what is there, then the ways to add one. */}
          <Text style={[styles.section, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>
            {t('expert.photos', { n: photos.length })}
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
            {photos.length < MAX ? (
              <View style={[styles.slot, styles.slotEmpty]}>
                <Feather name="camera" size={26} color={C.textMuted} />
              </View>
            ) : null}
          </View>
          {photos.length < MAX ? (
            <View style={[row, styles.pickers]}>
              {Platform.OS !== 'web' ? (
                <Button label={t('expert.camera')} icon="camera" onPress={() => void add('camera')} style={styles.flex} />
              ) : null}
              <Button
                label={t('expert.library')}
                icon="image"
                variant={Platform.OS !== 'web' ? 'secondary' : 'primary'}
                onPress={() => void add('library')}
                style={styles.flex}
              />
            </View>
          ) : null}

          {/* The car, attached on its own: the one thing the shop always needs. */}
          <Text style={[styles.section, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>
            {t('expert.car')}
          </Text>
          <View style={[row, styles.car]}>
            {active ? <MakeLogo name={active.makeName} slug={active.makeSlug} size={44} lifted={false} /> : <Feather name="help-circle" size={24} color={C.textMuted} />}
            <Text variant="body" tone={C.text} style={[styles.flex, { textAlign: rtl ? 'right' : 'left' }]}>
              {car ?? t('expert.noCar')}
            </Text>
            {!active ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/garage/ajouter')} hitSlop={8}>
                <Text variant="hint" tone={C.text} style={styles.link}>
                  {t('expert.addCar')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <FormField
            label={t('expert.name')}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            error={touched && nameBad ? t('checkout.err.customerName') : null}
          />
          <FormField
            label={t('expert.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            prefix="+216"
            ltr
            placeholder="22 334 455"
            hint={t('expert.phoneHint')}
            error={touched && phoneBad ? t('checkout.err.phone') : null}
          />
          <FormField label={t('expert.note')} value={note} onChangeText={setNote} multiline placeholder={t('expert.notePlaceholder')} maxLength={1000} />

          {error ? (
            <Text variant="hint" tone={C.danger} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button label={t('expert.send')} icon="send" loading={busy} onPress={() => void submit()} />

          {whatsapp ? (
            <View style={styles.whatsapp}>
              <Button label={t('expert.whatsappToo')} icon="message-circle" variant="secondary" onPress={openWhatsapp} />
              <Text variant="hint" style={{ textAlign: 'center' }}>
                {t('expert.whatsappWhy')}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  sentRoot: { flex: 1, justifyContent: 'center', backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1 },
  section: { fontSize: 17, lineHeight: 22, color: C.text, marginTop: Spacing.two },
  slots: { gap: Spacing.two, flexWrap: 'wrap' },
  slot: { width: 96, height: 96, borderRadius: Radius.tile, overflow: 'hidden', backgroundColor: C.surface },
  slotEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(8,22,51,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickers: { gap: Spacing.two },
  car: { alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.tile, backgroundColor: C.surface },
  link: { textDecorationLine: 'underline' },
  whatsapp: { gap: Spacing.one, marginTop: Spacing.one },
});
