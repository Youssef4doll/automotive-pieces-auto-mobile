import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { vehiclesApi } from '@/api/vehicles';
import { Button } from '@/components/ui/button';
import { dueText, isSoon } from '@/components/ui/care-due';
import { FormField } from '@/components/ui/form-field';
import { MakeLogo } from '@/components/ui/make-logo';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { careDue, parseDate, reminderMoments, showDate, type CareDue, type VehicleCare } from '@/lib/care';
import { cancelReminders, mayNotify, remindersAvailable, scheduleReminder } from '@/services/notifications';
import { useGarage } from '@/store/garage';
import { useToast } from '@/store/toast';
import { useVehicleCare } from '@/store/vehicle-care';
import { ltr } from '@/lib/format';

/**
 * One car: what the shop knows about its engine, and what its owner knows
 * about its upkeep.
 *
 * The facts (fuel, power, engine code, years) are the shop's rows for the
 * engine, shown only where filled. The upkeep is the owner's own numbers —
 * mileage, last oil change and their interval, inspection and insurance
 * dates — and the reminders above them are arithmetic on those numbers,
 * never a service schedule the app assumed.
 */
export default function VehicleScreen() {
  const { engine } = useLocalSearchParams<{ engine: string }>();
  const { t, rtl } = useI18n();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const vehicle = useGarage((s) => s.vehicles.find((v) => v.engineId === engine) ?? null);
  const isMain = useGarage((s) => s.active?.engineId === engine);
  const setActive = useGarage((s) => s.setActive);
  const remove = useGarage((s) => s.remove);
  const stored = useVehicleCare((s) => (engine ? s.byEngine[engine] : undefined));
  const saveCare = useVehicleCare((s) => s.set);
  const forgetCare = useVehicleCare((s) => s.forget);

  const load = useCallback(
    (signal: AbortSignal) =>
      vehicle ? vehiclesApi.engines(vehicle.makeSlug, vehicle.modelSlug, signal).then((list) => list.find((e) => e.id === vehicle.engineId) ?? null) : Promise.resolve(null),
    [vehicle],
  );
  const facts = useResource(load);

  const num = (v?: number) => (v == null ? '' : String(v));
  const [mileage, setMileage] = useState(num(stored?.mileageKm));
  const [oilKm, setOilKm] = useState(num(stored?.oilChangeKm));
  const [interval, setInterval] = useState(num(stored?.oilIntervalKm));
  const [inspection, setInspection] = useState(showDate(stored?.inspectionDue));
  const [insurance, setInsurance] = useState(showDate(stored?.insuranceDue));
  const [touched, setTouched] = useState(false);
  const [remind, setRemind] = useState(Boolean(stored?.remind));

  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  if (!vehicle || !engine) {
    return (
      <View style={[styles.root, styles.gone]}>
        <Stack.Screen options={{ title: t('car.title') }} />
        <Text variant="body">{t('car.gone')}</Text>
        <Button label={t('garage.title')} onPress={() => router.navigate('/garage')} />
      </View>
    );
  }

  const km = (s: string) => {
    const d = s.replace(/\D/g, '');
    return d ? Number(d) : undefined;
  };
  const inspectionBad = inspection.trim() !== '' && !parseDate(inspection);
  const insuranceBad = insurance.trim() !== '' && !parseDate(insurance);

  const save = async () => {
    setTouched(true);
    if (inspectionBad || insuranceBad) return;
    const mileageKm = km(mileage);
    const next: VehicleCare = {
      mileageKm,
      mileageAt: mileageKm !== stored?.mileageKm ? new Date().toISOString() : stored?.mileageAt,
      oilChangeKm: km(oilKm),
      oilIntervalKm: km(interval),
      inspectionDue: parseDate(inspection) ?? undefined,
      insuranceDue: parseDate(insurance) ?? undefined,
      remind,
    };
    // The phone's own reminders: the old ones out, the new dates in. Asked
    // for permission here, when the owner has just said yes to reminders.
    await cancelReminders(stored?.reminderIds ?? []);
    let reminderIds: string[] = [];
    let denied = false;
    if (remind && remindersAvailable && reminderMoments(next).length) {
      if (await mayNotify({ ask: true })) {
        const car = `${vehicle.makeName} ${vehicle.modelName}`;
        const ids = await Promise.all(
          reminderMoments(next).map((m) =>
            scheduleReminder(m.at, t(`car.remind.${m.kind}.${m.when}`), t(`car.remind.body.${m.kind}`, { car, date: showDate(m.date) }), { engine }),
          ),
        );
        reminderIds = ids.filter((id): id is string => id !== null);
      } else denied = true;
    }
    saveCare(engine, { ...next, reminderIds });
    toast({ message: denied ? t('notify.denied') : reminderIds.length ? `${t('car.saved')} · ${t('car.remind.set')}` : t('car.saved'), tone: denied ? 'neutral' : 'success' });
  };

  const due = careDue(stored);
  const f = facts.status === 'loaded' ? facts.data : null;
  const factRows = f
    ? ([
        f.fuel ? [t('car.fuel'), f.fuel] : null,
        f.powerHp ? [t('car.power'), t('car.hp', { n: f.powerHp })] : null,
        f.engineCode ? [t('car.code'), f.engineCode] : null,
        f.yearFrom ? [t('car.years'), f.yearTo ? `${f.yearFrom}–${f.yearTo}` : `${f.yearFrom}–`] : null,
      ].filter(Boolean) as [string, string][])
    : [];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('car.title') }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <View style={[row, styles.hero]}>
            <MakeLogo name={vehicle.makeName} slug={vehicle.makeSlug} size={72} />
            <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.name, align, { fontFamily: familyFor('headingStrong', rtl) }]}>{`${vehicle.makeName} ${vehicle.modelName}`}</Text>
              <Text variant="body" tone="#c7d1e3" style={align}>
                {ltr(vehicle.engineName)}
              </Text>
              {isMain ? (
                <View style={[row, styles.mainPill]}>
                  <Feather name="check-circle" size={12} color={C.success} />
                  <Text variant="hint" tone={C.success}>
                    {t('car.isMain')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {due.length > 0 ? (
            <View style={styles.dueList}>
              {due.map((d) => (
                <DueRow key={d.kind} due={d} />
              ))}
              {due.some((d) => d.kind === 'oil') ? (
                <Button
                  label={t('car.oilParts')}
                  variant="secondary"
                  icon="droplet"
                  onPress={() => router.push({ pathname: '/famille/[family]', params: { family: 'lubrifiant' } })}
                />
              ) : null}
            </View>
          ) : null}

          <Button label={t('car.parts')} icon="check-circle" onPress={() => router.push({ pathname: '/pieces-compatibles', params: { engine } })} />

          <Text style={[styles.section, align, { fontFamily: familyFor('heading', rtl) }]}>{t('car.facts')}</Text>
          {factRows.length ? (
            <View style={styles.facts}>
              {factRows.map(([k, v], i) => (
                <View key={k} style={[row, styles.fact, i === factRows.length - 1 && styles.factLast]}>
                  <Text variant="hint" style={styles.flex}>
                    {k}
                  </Text>
                  <Text variant="body" tone={C.text}>
                    {v}
                  </Text>
                </View>
              ))}
            </View>
          ) : facts.status === 'loaded' ? (
            <Text variant="hint" style={align}>
              {t('car.noFacts')}
            </Text>
          ) : null}

          <Text style={[styles.section, align, { fontFamily: familyFor('heading', rtl) }]}>{t('car.upkeep')}</Text>
          <Text variant="hint" style={align}>
            {t('car.upkeepWhy')}
          </Text>
          <FormField label={t('car.mileage')} value={mileage} onChangeText={setMileage} keyboardType="number-pad" ltr placeholder="120000" />
          <View style={[row, styles.pair]}>
            <View style={styles.flex}>
              <FormField label={t('car.oilKm')} value={oilKm} onChangeText={setOilKm} keyboardType="number-pad" ltr placeholder="110000" />
            </View>
            <View style={styles.flex}>
              <FormField label={t('car.oilInterval')} value={interval} onChangeText={setInterval} keyboardType="number-pad" ltr placeholder="10000" />
            </View>
          </View>
          <Text variant="hint" style={align}>
            {t('car.oilIntervalHint')}
          </Text>
          <FormField
            label={t('car.inspection')}
            value={inspection}
            onChangeText={setInspection}
            placeholder={t('car.datePlaceholder')}
            keyboardType="numbers-and-punctuation"
            ltr
            error={touched && inspectionBad ? t('car.badDate') : null}
          />
          <FormField
            label={t('car.insurance')}
            value={insurance}
            onChangeText={setInsurance}
            placeholder={t('car.datePlaceholder')}
            keyboardType="numbers-and-punctuation"
            ltr
            error={touched && insuranceBad ? t('car.badDate') : null}
          />
          {remindersAvailable ? (
            <View style={[row, styles.remind]}>
              <View style={styles.flex}>
                <Text variant="body" tone={C.text} style={align}>
                  {t('car.remind.label')}
                </Text>
                <Text variant="hint" style={align}>
                  {t('car.remind.hint')}
                </Text>
              </View>
              <Switch value={remind} onValueChange={setRemind} accessibilityLabel={t('car.remind.label')} />
            </View>
          ) : null}
          <Button label={t('car.save')} onPress={() => void save()} />

          <View style={styles.actions}>
            {!isMain ? <Button label={t('car.makeMain')} variant="secondary" onPress={() => setActive(engine)} /> : null}
            <Button
              label={t('car.remove')}
              variant="danger"
              onPress={() => {
                void cancelReminders(stored?.reminderIds ?? []);
                remove(engine);
                forgetCare(engine);
                router.back();
              }}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DueRow({ due }: { due: CareDue }) {
  const { t, rtl } = useI18n();
  const text = dueText(t, due);
  const soon = isSoon(due);
  return (
    <View style={[styles.due, { flexDirection: rtl ? 'row-reverse' : 'row', backgroundColor: due.overdue ? C.dangerSurface : soon ? C.cautionSurface : C.surface }]}>
      <Feather name={due.kind === 'oil' ? 'droplet' : due.kind === 'inspection' ? 'clipboard' : 'shield'} size={18} color={due.overdue ? C.danger : C.text} />
      <Text variant="body" tone={due.overdue ? C.danger : C.text} style={[styles.flex, { textAlign: rtl ? 'right' : 'left' }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  gone: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.card, backgroundColor: Brand.navy900 },
  name: { fontSize: 22, lineHeight: 28, color: Brand.white },
  mainPill: { alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, backgroundColor: C.successSurface },
  dueList: { gap: Spacing.two },
  due: { alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.tile },
  section: { fontSize: 17, lineHeight: 22, color: C.text, marginTop: Spacing.two },
  facts: { borderRadius: Radius.tile, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: Spacing.three },
  fact: { alignItems: 'center', minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  factLast: { borderBottomWidth: 0 },
  pair: { gap: Spacing.two },
  remind: { alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.tile, backgroundColor: C.surface },
  actions: { gap: Spacing.two, marginTop: Spacing.three },
});
