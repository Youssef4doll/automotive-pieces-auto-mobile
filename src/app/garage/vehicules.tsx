import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet, SheetAction } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { PressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { VehicleCard } from '@/components/ui/vehicle-card';
import { Border, Brand, C, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { Image } from 'expo-image';

import { RENDERS } from '@/illustrations/renders';
import { useI18n } from '@/i18n/provider';
import { useGarage, vehicleLabel, type SavedVehicle } from '@/store/garage';

/**
 * Mes véhicules — each car one compact row; tapping it makes it the car the
 * app answers for, and its "…" opens what else can be done with it (see its
 * parts, make it principal, remove it) in a sheet, so the list itself stays
 * a list. Removing asks first.
 *
 * There is no "modifier": a saved car is a make, a model and an engine the
 * shop lists, and changing any of them is choosing a different car.
 */
export default function VehiclesScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const vehicles = useGarage((s) => s.vehicles);
  const active = useGarage((s) => s.active);
  const setActive = useGarage((s) => s.setActive);
  const remove = useGarage((s) => s.remove);
  const isFull = useGarage((s) => s.isFull);
  const [sheet, setSheet] = useState<SavedVehicle | null>(null);
  const [confirming, setConfirming] = useState(false);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const add = () => router.push('/garage/ajouter');
  const close = () => {
    setSheet(null);
    setConfirming(false);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Stack.Screen
        options={{
          title: t('look.myVehiclesTitle'),
          headerRight: () =>
            isFull() ? null : (
              <PressScale accessibilityRole="button" onPress={add} style={[styles.addPill, row]} pressedStyle={{ backgroundColor: C.surface }}>
                <Feather name="plus" size={16} color={C.text} />
                <Text style={[styles.addText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.add')}</Text>
              </PressScale>
            ),
        }}
      />
      <View style={styles.column}>
        {vehicles.map((v) => (
          <VehicleCard
            key={v.engineId}
            vehicle={v}
            principal={v.engineId === active?.engineId}
            selected={v.engineId === active?.engineId}
            onPress={() => setActive(v.engineId)}
            onMore={() => setSheet(v)}
            compactArt
          />
        ))}

        <View style={styles.more}>
          <Image source={RENDERS.key} style={{ width: 120, height: 120 }} contentFit="contain" />
          <Text variant="rowTitle" style={styles.centred}>
            {t('look.addAnother')}
          </Text>
          <Text variant="hint" style={styles.centred}>
            {t('look.addAnotherWhy')}
          </Text>
          <PressScale
            accessibilityRole="button"
            disabled={isFull()}
            onPress={add}
            style={[styles.outline, row, isFull() && { opacity: 0.5 }]}
            pressedStyle={{ backgroundColor: C.surface }}
          >
            <Feather name="plus" size={18} color={C.text} />
            <Text style={[styles.outlineText, { fontFamily: familyFor('display', rtl) }]}>{t('garage.add')}</Text>
          </PressScale>
          {isFull() ? <Text variant="hint">{t('garage.full')}</Text> : null}
        </View>
      </View>

      <BottomSheet visible={sheet !== null} onClose={close} title={vehicleLabel(sheet) ?? t('garage.options')}>
        {confirming ? (
          <View style={styles.sheet}>
            <Text variant="rowTitle">{t('garage.removeConfirmTitle')}</Text>
            <Text variant="body">{t('garage.removeConfirmBody')}</Text>
            <Button
              label={t('garage.remove')}
              variant="danger"
              onPress={() => {
                if (sheet) remove(sheet.engineId);
                const last = vehicles.length <= 1;
                close();
                if (last) router.back();
              }}
            />
            <Button label={t('garage.cancel')} variant="secondary" onPress={close} />
          </View>
        ) : (
          <>
            <SheetAction
              icon="check-circle"
              label={t('look.bento.parts')}
              onPress={() => {
                const engine = sheet?.engineId;
                close();
                if (engine) router.push({ pathname: '/pieces-compatibles', params: { engine } });
              }}
            />
            {sheet && sheet.engineId !== active?.engineId ? (
              <SheetAction
                icon="star"
                label={t('look.act.principal')}
                onPress={() => {
                  if (sheet) setActive(sheet.engineId);
                  close();
                }}
              />
            ) : null}
            <SheetAction icon="trash-2" tone="danger" separated label={t('look.act.delete')} onPress={() => setConfirming(true)} />
          </>
        )}
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { paddingVertical: Spacing.three },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.two },
  addPill: {
    alignItems: 'center',
    gap: 4,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    marginHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: Brand.white,
  },
  addText: { fontSize: 14, color: C.text },
  more: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  centred: { textAlign: 'center' },
  outline: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: C.accent,
    backgroundColor: Brand.white,
    marginTop: Spacing.two,
  },
  outlineText: { fontSize: 16, color: C.text },
  sheet: { gap: Spacing.three, paddingBottom: Spacing.two },
});
