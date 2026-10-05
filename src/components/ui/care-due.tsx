import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { careDue, type CareDue } from '@/lib/care';
import { track } from '@/services/analytics';
import { useGarage } from '@/store/garage';
import { useVehicleCare } from '@/store/vehicle-care';
import { Text } from './text';

type T = ReturnType<typeof useI18n>['t'];

/** The sentence for one due item — the same on the home strip and the vehicle screen. */
export function dueText(t: T, due: CareDue): string {
  return due.kind === 'oil'
    ? t(due.overdue ? 'car.due.oilLate' : 'car.due.oil', { km: due.km.toLocaleString('fr-FR') })
    : due.kind === 'inspection'
      ? t(due.overdue ? 'car.due.inspectionLate' : 'car.due.inspection', { days: due.days })
      : t(due.overdue ? 'car.due.insuranceLate' : 'car.due.insurance', { days: due.days });
}

/** Close enough to say on the home screen: overdue, a date within a month, an oil change within 1 000 km. */
export function isSoon(due: CareDue): boolean {
  return due.overdue || (due.kind === 'oil' ? due.km <= 1000 : due.days <= 30);
}

/**
 * One line on the home screen when the main car has something coming up —
 * from the dates and mileage its owner entered, never a schedule the app
 * assumed. Nothing entered, or nothing close: nothing shown.
 */
export function CareDueStrip() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const active = useGarage((s) => s.active);
  const care = useVehicleCare((s) => (active ? s.byEngine[active.engineId] : undefined));
  const soon = careDue(care).filter(isSoon);
  const shown = active && soon.length ? `${active.engineId}|${soon[0].kind}|${soon[0].overdue ? 1 : 0}` : null;
  useEffect(() => {
    if (!shown) return;
    const [engineId, kind, overdue] = shown.split('|');
    track('reminder_shown', { engineId, kind, overdue: overdue === '1' });
  }, [shown]);
  if (!active || soon.length === 0) return null;
  const first = soon[0];
  return (
    <View style={styles.column}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          track('reminder_tapped', { engineId: active.engineId, kind: first.kind, overdue: Boolean(first.overdue) });
          router.push({ pathname: '/garage/vehicule/[engine]', params: { engine: active.engineId } });
        }}
        style={({ pressed }) => [
          styles.strip,
          { flexDirection: rtl ? 'row-reverse' : 'row', backgroundColor: first.overdue ? C.dangerSurface : C.cautionSurface },
          pressed && styles.pressed,
        ]}
      >
        <Feather name={first.kind === 'oil' ? 'droplet' : first.kind === 'inspection' ? 'clipboard' : 'shield'} size={18} color={first.overdue ? C.danger : C.text} />
        <View style={styles.flex}>
          <Text variant="hint">{`${active.makeName} ${active.modelName}`}</Text>
          <Text variant="body" tone={first.overdue ? C.danger : C.text} style={{ textAlign: rtl ? 'right' : 'left' }}>
            {soon.length > 1 ? `${dueText(t, first)} · +${soon.length - 1}` : dueText(t, first)}
          </Text>
        </View>
        <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={18} color={C.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  strip: { alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.tile },
  pressed: { opacity: 0.8 },
  flex: { flex: 1, gap: 2 },
});
