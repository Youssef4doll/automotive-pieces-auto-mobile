import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { questionsApi } from '@/api/questions';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { MakeLogo } from '@/components/ui/make-logo';
import { whatsappUrl } from '@/components/ui/shop-contact';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useI18n } from '@/i18n/provider';
import { PhotoAdviceArt } from '@/illustrations/ways-art';
import { tunisianDigits } from '@/lib/checkout';
import { appendPhoto, pickPhoto, type PickedPhoto } from '@/lib/photo';
import { track } from '@/services/analytics';
import { pushAvailable, pushToken } from '@/services/notifications';
import { accountToken, useAccount } from '@/store/account';
import { useCheckout } from '@/store/checkout';
import { useGarage, vehicleLabel } from '@/store/garage';
import { useOrders } from '@/store/orders';
import { useQuestions } from '@/store/questions';

const MAX = 3;

/**
 * "Demander à la boutique" — the one way to reach the shop that never
 * depends on it having published a phone or WhatsApp number.
 *
 * A question, a photo, or both; the car from the garage, the part or the
 * order it is about; a name and a number to be called back on. It lands in
 * the shop's inbox (POST /api/v1/questions) and the shop answers in writing
 * — shown in "Mes questions", and on the order's page for an order — or
 * calls back. What the customer is told is exactly that, no response time
 * the shop never gave.
 *
 * `?order=` from an order's page: the order's own token goes with it, so
 * the shop sees the real order and the answer comes back to that page.
 * `?sku=` from a part; `?photo=1` from "Envoyer une photo" (the old photo
 * request, /demande-photo, now opens this).
 */
export default function AskScreen() {
  const { t, rtl, locale } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ sku?: string; order?: string; photo?: string; q?: string }>();
  const sku = params.sku?.trim() || undefined;
  const orderRef = params.order?.trim().toUpperCase() || undefined;
  const photoFirst = params.photo === '1';
  const active = useGarage((s) => s.active);
  const account = useAccount((s) => (s.status === 'signedIn' ? s.account : null));
  const saved = useCheckout((s) => s.details);
  const settings = useShopSettings();
  const whatsapp = settings.status === 'loaded' ? settings.data.contact.whatsapp : null;

  // From a search that found nothing: the words they typed, already written.
  const [body, setBody] = useState(() => (params.q?.trim() ? t('search.lookingFor', { q: params.q.trim().slice(0, 80) }) : ''));
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [name, setName] = useState(account?.name ?? saved.customerName);
  const [phone, setPhone] = useState(account?.phone ?? saved.phone);
  const [notify, setNotify] = useState(pushAvailable);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<{ order: string | null } | null>(null);

  const car = vehicleLabel(active);
  const nameBad = name.trim().length < 2;
  const phoneBad = !tunisianDigits(phone);
  const nothing = body.trim().length < 3 && photos.length === 0;
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  const whatsappText = [
    body.trim() || t('help.message'),
    car ? t('help.messageVehicle', { vehicle: car }) : null,
    sku ? t('expert.forPart', { sku }) : null,
    orderRef ? t('ask.aboutOrder', { ref: orderRef }) : null,
  ]
    .filter(Boolean)
    .join('\n');
  const openWhatsapp = () => {
    track('whatsapp_opened', { from: 'ask', vehicle: Boolean(car) });
    void Linking.openURL(whatsappUrl(whatsapp!, whatsappText)).catch(() => undefined);
  };

  async function add(from: 'camera' | 'library') {
    setError(null);
    try {
      const photo = await pickPhoto(from);
      if (photo) setPhotos((p) => [...p, photo].slice(0, MAX));
    } catch {
      setError(t('ask.photoFailed'));
    }
  }

  async function submit() {
    setTouched(true);
    setError(null);
    if (nothing) return setError(t('ask.needSomething'));
    if (nameBad || phoneBad) return;
    setBusy(true);
    try {
      const form = new FormData();
      for (const p of photos) await appendPhoto(form, 'photos', p);
      form.append('name', name.trim());
      form.append('phone', tunisianDigits(phone)!);
      if (body.trim()) form.append('body', body.trim());
      if (car) form.append('vehicle', car);
      if (sku) form.append('productSku', sku);
      if (orderRef) {
        form.append('orderRef', orderRef);
        const own = await useOrders.getState().ownToken(orderRef);
        if (own) form.append('orderToken', own);
      }
      // Asked here, where it means something: "tell me when they answer".
      const push = notify && pushAvailable ? await pushToken({ ask: true }).catch(() => null) : null;
      if (push) {
        form.append('pushToken', push);
        form.append('locale', locale);
      }
      const session = accountToken();
      const result = await questionsApi.ask(form, session);
      await useQuestions.getState().remember(
        {
          id: result.id,
          excerpt: body.trim().slice(0, 140) || t('questions.photos', { n: photos.length }),
          createdAt: new Date().toISOString(),
          orderRef: result.order,
          productSku: sku ?? null,
          answeredAt: null,
          fromAccount: Boolean(session),
        },
        result.token,
      );
      track('expert_request', { photos: photos.length, vehicle: Boolean(car), product: Boolean(sku), order: Boolean(result.order), text: Boolean(body.trim()) });
      // Remember who they are for next time, as the checkout does.
      useCheckout.getState().update({ customerName: name.trim(), phone: phone.trim() });
      setSent({ order: result.order });
    } catch {
      setError(t('ask.failed'));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.sentRoot}>
        <Stack.Screen options={{ title: t('ask.title') }} />
        <EmptyState
          art={<PhotoAdviceArt width={112} />}
          title={t('ask.sentTitle')}
          body={[t('ask.sentBody', { phone: phone.trim() }), sent.order ? t('ask.sentOrder', { ref: sent.order }) : null].filter(Boolean).join('\n')}
        >
          {sent.order ? (
            <Button label={t('ask.backToOrder')} onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/suivi/[ref]', params: { ref: sent.order! } }))} />
          ) : (
            <Button label={t('ask.seeQuestions')} onPress={() => router.replace('/compte/questions')} />
          )}
          <Button label={t('expert.done')} variant="secondary" onPress={() => router.dismissTo('/')} />
        </EmptyState>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('ask.title') }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text variant="body" style={align}>
            {photoFirst ? t('ask.leadPhoto') : t('ask.lead')}
          </Text>

          {/* What it is about: the order, the part, the car — attached on their own. */}
          <View style={styles.context}>
            {orderRef ? (
              <View style={[row, styles.contextRow]}>
                <Feather name="file-text" size={IconSize.medium} color={C.text} />
                <Text variant="body" tone={C.text} style={[styles.flex, align]}>
                  {t('ask.aboutOrder', { ref: orderRef })}
                </Text>
              </View>
            ) : null}
            {sku ? (
              <View style={[row, styles.contextRow]}>
                <Feather name="tag" size={IconSize.medium} color={C.text} />
                <Text variant="body" tone={C.text} style={[styles.flex, align]}>
                  {t('ask.aboutPart', { sku })}
                </Text>
              </View>
            ) : null}
            <View style={[row, styles.contextRow]}>
              {active ? <MakeLogo name={active.makeName} slug={active.makeSlug} size={36} lifted={false} /> : <Feather name="help-circle" size={IconSize.medium} color={C.textMuted} />}
              <Text variant="body" tone={C.text} style={[styles.flex, align]}>
                {car ?? t('expert.noCar')}
              </Text>
              {!active ? (
                <Pressable accessibilityRole="button" onPress={() => router.push('/garage/ajouter')} hitSlop={8} style={styles.inlineLink}>
                  <Text variant="hint" tone={C.text} style={styles.link}>
                    {t('expert.addCar')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {!photoFirst ? (
            <FormField
              label={t('ask.question')}
              value={body}
              onChangeText={setBody}
              multiline
              placeholder={t('ask.questionPlaceholder')}
              maxLength={1500}
              testID="ask-body"
            />
          ) : null}

          {/* The photos: optional for a question, the point of "Envoyer une photo". */}
          <Text style={[styles.section, align, { fontFamily: familyFor('heading', rtl) }]}>{t('ask.photos', { n: photos.length })}</Text>
          {photos.length ? (
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
          ) : null}
          {photos.length < MAX ? (
            <View style={[row, styles.pickers]}>
              {Platform.OS !== 'web' ? (
                <Button label={t('expert.camera')} icon="camera" variant={photoFirst ? 'primary' : 'secondary'} onPress={() => void add('camera')} style={styles.flex} />
              ) : null}
              <Button label={t('expert.library')} icon="image" variant="secondary" onPress={() => void add('library')} style={styles.flex} />
            </View>
          ) : null}

          {photoFirst ? (
            <FormField label={t('expert.note')} value={body} onChangeText={setBody} multiline placeholder={t('expert.notePlaceholder')} maxLength={1500} />
          ) : null}

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
            hint={t('ask.phoneHint')}
            error={touched && phoneBad ? t('checkout.err.phone') : null}
          />

          {pushAvailable ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: notify }}
              onPress={() => setNotify((v) => !v)}
              style={[row, styles.notify]}
            >
              <Feather name={notify ? 'check-square' : 'square'} size={IconSize.large} color={notify ? C.text : C.textMuted} />
              <Text variant="body" tone={C.text} style={[styles.flex, align]}>
                {t('ask.notify')}
              </Text>
            </Pressable>
          ) : null}

          {error ? (
            <Text variant="hint" tone={C.danger} accessibilityLiveRegion="polite" style={align}>
              {error}
            </Text>
          ) : null}
          <Button label={t('ask.send')} icon="send" loading={busy} onPress={() => void submit()} testID="ask-send" />

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
  flex: { flex: 1, minWidth: 0 },
  section: { fontSize: 17, lineHeight: 22, color: C.text, marginTop: Spacing.one },
  context: { borderRadius: Radius.tile, backgroundColor: C.surface, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  contextRow: { alignItems: 'center', gap: Spacing.three, minHeight: 52, paddingVertical: Spacing.one },
  inlineLink: { minHeight: Tap.min, justifyContent: 'center' },
  slots: { gap: Spacing.two, flexWrap: 'wrap' },
  slot: { width: 96, height: 96, borderRadius: Radius.tile, overflow: 'hidden', backgroundColor: C.surface },
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
  notify: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.min },
  link: { textDecorationLine: 'underline' },
  whatsapp: { gap: Spacing.one, marginTop: Spacing.one },
});
