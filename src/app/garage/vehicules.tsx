import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VehicleCard } from '@/components/ui/vehicle-card';
import { Border, Brand, C, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { CarArt } from '@/illustrations/car-art';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * Mes véhicules — the reference's management screen. Tap a car to select it
 * (navy outline), then act on it: see its parts, make it the principal, or
 * remove it after a confirmation. The principal car is selected on arrival.
 *
 * There is no "modifier": a saved car is a make, a model and an engine the
 * shop lists, and changing any of them is choosing a different car — which
 * is "Ajouter", then removing the old one.
 */
export default function VehiclesScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const vehicles = useGarage((s) => s.vehicles);
  const active = useGarage((s) => s.active);
  const setActive = useGarage((s) => s.setActive);
  const remove = useGarage((s) => s.remove);
  const isFull = useGarage((s) => s.isFull);
  const [selectedId, setSelectedId] = useState<string | null>(active?.engineId ?? null);
  const [confirming, setConfirming] = useState(false);
  const selected = vehicles.find((v) => v.engineId === selectedId) ?? active ?? vehicles[0] ?? null;
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const add = () => router.push('/garage/ajouter');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Stack.Screen
        options={{
          title: t('look.myVehiclesTitle'),
          headerRight: () =>
            isFull() ? null : (
              <Pressable accessibilityRole="button" onPress={add} style={({ pressed }) => [styles.addPill, row, pressed && styles.pressed]}>
                <Feather name="plus" size={16} color={C.text} />
                <Text style={[styles.addText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.add')}</Text>
              </Pressable>
            ),
        }}
      />
      <View style={styles.column}>
        {vehicles.map((v) => (
          <VehicleCard
            key={v.engineId}
            vehicle={v}
            principal={v.engineId === active?.engineId}
            selected={v.engineId === selected?.engineId}
            onPress={() => setSelectedId(v.engineId)}
          />
        ))}

        {selected ? (
          <>
            <Text style={[styles.section, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('look.actions')}</Text>
            <View style={styles.actions}>
              <Action
                icon="check-circle"
                label={t('look.bento.parts')}
                onPress={() => router.push({ pathname: '/pieces-compatibles', params: { engine: selected.engineId } })}
              />
              <Action
                icon="star"
                label={t('look.act.principal')}
                disabled={selected.engineId === active?.engineId}
                onPress={() => setActive(selected.engineId)}
              />
              <Action icon="trash-2" label={t('look.act.delete')} danger last onPress={() => setConfirming(true)} />
            </View>
          </>
        ) : null}

        <View style={styles.more}>
          <CarArt width={150} body={Brand.navy400} />
          <Text variant="rowTitle" style={styles.centred}>
            {t('look.addAnother')}
          </Text>
          <Text variant="hint" style={styles.centred}>
            {t('look.addAnotherWhy')}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isFull()}
            onPress={add}
            style={({ pressed }) => [styles.outline, row, pressed && styles.pressed, isFull() && { opacity: 0.5 }]}
          >
            <Feather name="plus" size={18} color={C.text} />
            <Text style={[styles.outlineText, { fontFamily: familyFor('display', rtl) }]}>{t('garage.add')}</Text>
          </Pressable>
          {isFull() ? <Text variant="hint">{t('garage.full')}</Text> : null}
        </View>
      </View>

      <BottomSheet visible={confirming} onClose={() => setConfirming(false)} title={t('garage.removeConfirmTitle')}>
        <View style={styles.sheet}>
          <Text variant="body">{t('garage.removeConfirmBody')}</Text>
          <Button
            label={t('garage.remove')}
            variant="danger"
            onPress={() => {
              if (selected) remove(selected.engineId);
              setConfirming(false);
              setSelectedId(null);
              if (vehicles.length <= 1) router.back();
            }}
          />
          <Button label={t('garage.cancel')} variant="secondary" onPress={() => setConfirming(false)} />
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

function Action({
  icon,
  label,
  onPress,
  danger = false,
  disabled = false,
  last = false,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  last?: boolean;
}) {
  const { rtl } = useI18n();
  const tone = danger ? C.danger : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { flexDirection: rtl ? 'row-reverse' : 'row' }, !last && styles.rule, pressed && styles.pressed, disabled && { opacity: 0.45 }]}
    >
      <Feather name={icon} size={20} color={tone} />
      <Text variant="body" tone={tone} style={styles.flex}>
        {label}
      </Text>
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={C.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { paddingVertical: Spacing.three },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  flex: { flex: 1 },
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
  pressed: { opacity: 0.6 },
  section: { fontSize: 18, lineHeight: 24, color: C.text, paddingTop: Spacing.two },
  actions: {
    backgroundColor: Brand.white,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    paddingHorizontal: Spacing.three,
  },
  action: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.primary + Spacing.one },
  rule: { borderBottomWidth: Border.hairline, borderBottomColor: C.border },
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
