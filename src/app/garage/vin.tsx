import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { vehiclesApi } from '@/api/vehicles';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { Brand, C, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { CarteGrise } from '@/illustrations/carte-grise';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';

/** 17 characters; I, O and Q never appear in a VIN, so they are refused as typed. */
const VIN_LENGTH = 17;
const VIN_SHAPE = /^[A-HJ-NPR-Z0-9]{17}$/;

/**
 * Carte grise / VIN — the second way into the garage.
 *
 * What it does, stated on the screen as well as here: it reads the
 * manufacturer from the first three characters of the VIN and opens the
 * picker on that make, with a line saying so. It does not decode the model
 * or the engine, because that needs a paid VIN-data service the shop does
 * not have, and a screen that implied otherwise would be the app inventing a
 * vehicle specification — exactly what the brief forbids.
 *
 * So it saves one step of three, honestly, and the customer knows which one.
 *
 * Not "scanner": there is no on-device text recognition in this build, and a
 * camera button that opened a camera and then asked the customer to type the
 * number anyway would be a feature in name only.
 */
export default function VinScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const [vin, setVin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<DictKey | null>(null);
  // The maker the shop recognised: shown as a result, with the next step
  // named, instead of jumping to another screen the customer did not expect.
  const [found, setFound] = useState<{ slug: string; name: string; id: string } | null>(null);

  // A VIN never contains I, O or Q — precisely because they are mistaken for
  // 1 and 0 — so a typed O is a zero the customer read off a worn card, and
  // it is written as one rather than silently swallowed.
  const clean = (raw: string) =>
    raw
      .toUpperCase()
      .replace(/[OQ]/g, '0')
      .replace(/I/g, '1')
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, VIN_LENGTH);
  const valid = VIN_SHAPE.test(vin);

  const identify = async () => {
    if (!valid) {
      setMessage('vin.invalid');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { make } = await vehiclesApi.vinMake(vin);
      if (!make) {
        setMessage('vin.unknown');
        setBusy(false);
        return;
      }
      setFound(make);
      setBusy(false);
    } catch (err) {
      const kind = err instanceof ApiError ? err.failure.kind : 'offline';
      setMessage(kind === 'offline' || kind === 'timeout' ? 'state.offlineBody' : 'state.serverBody');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('vin.title') }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.art} accessible accessibilityRole="image" accessibilityLabel={t('vin.cardAlt')}>
            <CarteGrise width={264} />
          </View>

          <FormField
            label={t('vin.label')}
            placeholder={t('vin.placeholder')}
            value={vin}
            onChangeText={(v) => {
              setVin(clean(v));
              setMessage(null);
              setFound(null);
            }}
            counter={`${vin.length}/${VIN_LENGTH}`}
            hint={t('vin.where')}
            error={message === 'vin.invalid' ? t('vin.invalid') : null}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="go"
            onSubmitEditing={identify}
            maxLength={VIN_LENGTH + 4}
            style={styles.vinInput}
            ltr
          />

          {message && message !== 'vin.invalid' ? (
            <View style={styles.notice}>
              <Text variant="body" tone={C.text}>
                {t(message)}
              </Text>
              {message === 'vin.unknown' ? (
                <Button label={t('picker.allMakes')} variant="secondary" onPress={() => router.replace('/garage/ajouter')} />
              ) : null}
            </View>
          ) : null}

          {found ? (
            <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.success}>
              <View style={[styles.successHead, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                <View style={styles.successTick}>
                  <Feather name="check" size={18} color={Brand.white} />
                </View>
                <View style={styles.infoText}>
                  <Text variant="rowTitle" accessibilityLiveRegion="polite">
                    {t('look.vinOk', { make: found.name })}
                  </Text>
                  <Text variant="hint">{t('look.vinOkWhy')}</Text>
                </View>
              </View>
              <Button
                label={t('look.vinNext')}
                icon={rtl ? 'arrow-left' : 'arrow-right'}
                onPress={() =>
                  router.replace({
                    pathname: '/garage/ajouter/[make]',
                    params: { make: found.slug, makeName: found.name, makeId: found.id, notice: t('vin.recognised', { make: found.name }) },
                  })
                }
              />
            </Animated.View>
          ) : (
            <Button label={t('vin.submit')} onPress={identify} loading={busy} disabled={!valid} />
          )}

          {/* The reference's reassurance, under the button rather than above
              the field: the field is what the customer came to fill in. */}
          <View style={[styles.info, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <Feather name="info" size={18} color={C.text} />
            <View style={styles.infoText}>
              <Text variant="rowTitle">{t('vin.lead')}</Text>
              <Text variant="hint">{t('vin.lead2')}</Text>
            </View>
          </View>

          <Text variant="hint">{t('vin.scope')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  success: { gap: Spacing.three, padding: Spacing.three, borderRadius: 16, backgroundColor: C.successSurface },
  successHead: { alignItems: 'flex-start', gap: Spacing.three },
  successTick: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  info: { gap: Spacing.three, padding: Spacing.three, borderRadius: 16, backgroundColor: C.surface, alignItems: 'flex-start' },
  infoText: { flex: 1, gap: 2 },
  scroll: { paddingBottom: Spacing.six },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  art: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
  },
  lead: { gap: Spacing.one },
  vinInput: {
    letterSpacing: 2,
    fontSize: 18,
  },
  notice: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: C.cautionSurface,
  },
});
