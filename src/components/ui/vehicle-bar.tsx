import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Border, C, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { Text } from './text';

/**
 * The car every result on this screen is being judged against.
 *
 * A list of parts with green and amber badges means nothing unless the
 * customer can see WHICH car those badges are about — and on a phone with
 * two cars in the garage, the wrong one is a real possibility. So every list
 * of parts carries this line at its top, and it is also the way to change
 * car without leaving the list.
 *
 * With no car chosen it says so and offers to choose one, because "à
 * vérifier" on every row is otherwise unexplained.
 */
export function VehicleBar() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const active = useGarage((s) => s.active);
  const hydrated = useGarage((s) => s.hydrated);

  if (!hydrated) return null;

  const label = active ? `${active.makeName} ${active.modelName} · ${active.engineName}` : t('fit.noVehicle');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? `${label}. ${t('home.change')}` : t('home.chooseCar')}
      onPress={() => router.push(active ? '/garage' : '/garage/ajouter')}
      style={({ pressed }) => [
        styles.bar,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        !active && styles.barEmpty,
        pressed && styles.pressed,
      ]}
    >
      <NavCar size={IconSize.large} color={active ? C.text : C.textMuted} />
      <Text variant="hint" tone={active ? C.text : C.textMuted} numberOfLines={1} style={styles.label}>
        {label}
      </Text>
      <View style={[styles.action, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Text variant="hint" tone={C.text}>
          {active ? t('home.change') : t('home.chooseCar')}
        </Text>
        <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.small} color={C.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
  },
  barEmpty: {
    backgroundColor: C.background,
    borderWidth: Border.thin,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  pressed: {
    backgroundColor: C.surfacePressed,
  },
  label: {
    flex: 1,
  },
  action: {
    alignItems: 'center',
    gap: 2,
  },
});
