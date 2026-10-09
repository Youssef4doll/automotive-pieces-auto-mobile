import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { engineDetail, vehiclesApi, type Engine, type Model, type VinAnswer } from '@/api/vehicles';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { MakeLogo } from '@/components/ui/make-logo';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useSaveVehicle } from '@/hooks/use-save-vehicle';
import { CarteGrise } from '@/illustrations/carte-grise';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { track } from '@/services/analytics';

/** 17 characters; I, O and Q never appear in a VIN, so they are refused as typed. */
const VIN_LENGTH = 17;
const VIN_SHAPE = /^[A-HJ-NPR-Z0-9]{17}$/;

/**
 * Carte grise / VIN — the second way into the garage.
 *
 * The shop reads the VIN (website `lib/data/vin`) and answers with its own
 * catalogue: the make always; the model year where the maker writes it;
 * the model when the VIN carries it (Volkswagen, Škoda, Seat, Audi) or the
 * public decoder knows the car. With the model known, its engines are listed
 * here and one tap saves the car — the engine is not in a European VIN, so
 * that tap stays the customer's. With the make only, the picker opens on it.
 * Nothing on this screen is a guess: every model and engine shown is one the
 * shop lists, and "Ce n'est pas ma voiture" is always one tap away.
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
  // What the shop recognised: shown as a result, with the next step named,
  // instead of jumping to another screen the customer did not expect.
  const [found, setFound] = useState<VinAnswer | null>(null);
  const save = useSaveVehicle();

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
    track('vin_started');
    try {
      const answer = await vehiclesApi.vin(vin);
      track('vin_completed', { identified: Boolean(answer.make), model: Boolean(answer.models?.length) });
      if (!answer.make) {
        setMessage('vin.unknown');
        setBusy(false);
        return;
      }
      setFound(answer);
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
                <Button label={t('picker.allMakes')} variant="secondary" onPress={() => router.dismissTo('/garage/ajouter')} />
              ) : null}
            </View>
          ) : null}

          {found?.make ? (
            <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}>
              <VinResult
                answer={found}
                onEngine={(model, engine) =>
                  save(
                    { make: found.make!.slug, makeId: found.make!.id, makeName: found.make!.name, model: model.slug, modelId: model.id, modelName: model.name },
                    engine,
                  )
                }
                onModel={(model) =>
                  router.replace({
                    pathname: '/garage/ajouter/[make]/[model]',
                    params: { make: found.make!.slug, makeName: found.make!.name, makeId: found.make!.id, model: model.slug, modelName: model.name, modelId: model.id },
                  })
                }
                onMake={() =>
                  router.replace({
                    pathname: '/garage/ajouter/[make]',
                    params: { make: found.make!.slug, makeName: found.make!.name, makeId: found.make!.id, notice: t('vin.recognised', { make: found.make!.name }) },
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

/**
 * The answer: the car as far as the VIN names it, then the one choice left.
 * Three shapes — one model with its engines, several models to choose from,
 * or the make alone — each with the way out to the picker.
 */
function VinResult({
  answer,
  onEngine,
  onModel,
  onMake,
}: {
  answer: VinAnswer;
  onEngine: (model: Model, engine: Engine) => void;
  onModel: (model: Model) => void;
  onMake: () => void;
}) {
  const { t, rtl } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const make = answer.make!;
  const models = answer.models ?? [];
  const engines = answer.engines ?? [];
  const model = models.length === 1 ? models[0]! : null;

  // The make alone: as before, the picker opens on it.
  if (!models.length) {
    return (
      <View style={styles.success}>
        <View style={[styles.successHead, row]}>
          <View style={styles.successTick}>
            <Feather name="check" size={18} color={Brand.white} />
          </View>
          <View style={styles.infoText}>
            <Text variant="rowTitle" accessibilityLiveRegion="polite" style={align}>
              {t('look.vinOk', { make: make.name })}
            </Text>
            <Text variant="hint" style={align}>
              {answer.year ? `${t('vin.modelYear', { year: answer.year })} · ${t('look.vinOkWhy')}` : t('look.vinOkWhy')}
            </Text>
          </View>
        </View>
        <Button label={t('look.vinNext')} icon={rtl ? 'arrow-left' : 'arrow-right'} onPress={onMake} />
      </View>
    );
  }

  return (
    <View style={styles.result}>
      {/* The car, as far as the VIN names it. */}
      <View style={[styles.carHead, row]}>
        <MakeLogo name={make.name} slug={make.slug} size={52} lifted={false} />
        <View style={styles.infoText}>
          <View style={[row, styles.foundLine]}>
            <Feather name="check-circle" size={14} color={C.success} />
            <Text variant="hint" tone={C.success} style={{ fontFamily: familyFor('bodySemi', rtl) }}>
              {t('vin.found')}
            </Text>
          </View>
          <Text accessibilityLiveRegion="polite" style={[styles.carName, align, { fontFamily: familyFor('headingStrong', rtl) }]}>
            {model ? `${make.name} ${model.name}` : make.name}
          </Text>
          {answer.year ? (
            <Text variant="hint" style={align}>
              {t('vin.modelYear', { year: answer.year })}
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={[styles.pickTitle, align, { fontFamily: familyFor('heading', rtl) }]}>
        {model && engines.length ? t('vin.pickEngine') : t('vin.pickModel')}
      </Text>
      {model && engines.length ? (
        <Text variant="hint" style={align}>
          {t('vin.pickEngineWhy')}
        </Text>
      ) : null}

      <View style={styles.choices}>
        {model && engines.length
          ? engines.map((e) => (
              <Choice key={e.id} title={e.name} sub={engineDetail(e)} onPress={() => onEngine(model, e)} />
            ))
          : models.map((m) => <Choice key={m.id} title={m.name} sub={null} onPress={() => onModel(m)} />)}
      </View>

      <Pressable accessibilityRole="button" onPress={onMake} style={({ pressed }) => [styles.notMine, pressed && { opacity: 0.6 }]}>
        <Text variant="hint" tone={C.text} style={styles.underline}>
          {t('vin.notMine')}
        </Text>
      </Pressable>
    </View>
  );
}

function Choice({ title, sub, onPress }: { title: string; sub: string | null; onPress: () => void }) {
  const { rtl } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, sub].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, row, pressed && styles.choicePressed]}
    >
      <View style={styles.infoText}>
        <Text variant="rowTitle" style={{ textAlign: rtl ? 'right' : 'left' }}>
          {title}
        </Text>
        {sub ? (
          <Text variant="hint" style={{ textAlign: rtl ? 'right' : 'left' }}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={C.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  result: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1, borderColor: C.border, backgroundColor: C.background },
  carHead: { alignItems: 'center', gap: Spacing.three },
  foundLine: { alignItems: 'center', gap: 6 },
  carName: { fontSize: 22, lineHeight: 28, color: C.text },
  pickTitle: { fontSize: 17, lineHeight: 22, color: C.text, marginTop: Spacing.one },
  choices: { gap: Spacing.two },
  choice: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.primary + 8, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.tile, backgroundColor: C.surface },
  choicePressed: { backgroundColor: C.surfacePressed },
  notMine: { alignSelf: 'center', minHeight: Tap.min, justifyContent: 'center', paddingHorizontal: Spacing.two },
  underline: { textDecorationLine: 'underline' },
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
