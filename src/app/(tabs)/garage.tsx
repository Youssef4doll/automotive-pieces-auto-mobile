import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VehicleCard } from '@/components/ui/vehicle-card';
import { Border, Brand, C, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { CarArt } from '@/illustrations/car-art';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * Mon garage — the reference's personal space, not a list editor.
 *
 * The principal car at the top; a small grid of the four things a customer
 * does with a car (its parts, what was ordered, its details and the next
 * car); then every car in the garage, one tap to make another the principal;
 * then the yellow button to add one. Editing, switching and removing live one
 * level down in "Mes véhicules", so this screen stays a place to arrive.
 */
export default function GarageScreen() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const tabBarSpace = useTabBarSpace();
  const vehicles = useGarage((s) => s.vehicles);
  const active = useGarage((s) => s.active);
  const hydrated = useGarage((s) => s.hydrated);
  const setActive = useGarage((s) => s.setActive);
  const isFull = useGarage((s) => s.isFull);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  if (!hydrated) return <View style={styles.root} />;

  if (!active) {
    return (
      <View style={[styles.root, styles.empty]}>
        <CarArt width={220} />
        <Text variant="screenTitle" style={styles.centred}>
          {t('garage.title')}
        </Text>
        <Text variant="body" tone={C.textMuted} style={styles.centred}>
          {t('look.garageEmptyWhy')}
        </Text>
        <Button label={t('home.chooseCar')} icon="plus" onPress={() => router.push('/garage/ajouter')} style={styles.wide} />
      </View>
    );
  }

  const bento: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean }[] = [
    { icon: 'check-circle', label: t('look.bento.parts'), onPress: () => router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } }) },
    { icon: 'clock', label: t('look.bento.history'), onPress: () => router.push('/compte/commandes') },
    { icon: 'info', label: t('look.bento.info'), onPress: () => router.push('/garage/vehicules') },
    { icon: 'plus', label: t('look.bento.add'), onPress: () => router.push('/garage/ajouter'), disabled: isFull() },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: t('garage.title') }} />
      <View style={styles.column}>
        <Text variant="hint" tone={C.textMuted} style={{ textAlign: rtl ? 'right' : 'left' }}>
          {t('look.garageCount', { n: vehicles.length })}
        </Text>

        <VehicleCard vehicle={active} label={t('look.principalVehicle')} principal onPress={() => router.push('/garage/vehicules')} />

        <View style={[styles.bento, row]}>
          {bento.map((b) => (
            <Pressable
              key={b.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: b.disabled }}
              disabled={b.disabled}
              onPress={b.onPress}
              style={({ pressed }) => [styles.tile, pressed && styles.pressed, b.disabled && styles.disabled, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}
            >
              <View style={styles.tileIcon}>
                <Feather name={b.icon} size={20} color={C.text} />
              </View>
              <Text style={[styles.tileLabel, { fontFamily: familyFor('bodySemi', rtl), textAlign: rtl ? 'right' : 'left' }]}>{b.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.head, row]}>
          <Text style={[styles.section, { fontFamily: familyFor('heading', rtl) }]}>{t('look.myVehicles', { n: vehicles.length })}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/garage/vehicules')} hitSlop={8} style={[styles.seeAll, row]}>
            <Text variant="hint" tone={C.text}>
              {t('catalog.seeAll')}
            </Text>
            <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
          </Pressable>
        </View>

        {vehicles.map((v) => (
          <VehicleCard
            key={v.engineId}
            vehicle={v}
            principal={v.engineId === active.engineId}
            compactArt
            onPress={() => (v.engineId === active.engineId ? router.push('/garage/vehicules') : setActive(v.engineId))}
          />
        ))}

        <Button label={t('garage.add')} icon="plus" onPress={() => router.push('/garage/ajouter')} disabled={isFull()} />
        {isFull() ? (
          <Text variant="hint" style={styles.centred}>
            {t('garage.full')}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { paddingTop: Spacing.one },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  empty: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four, backgroundColor: C.background },
  centred: { textAlign: 'center' },
  wide: { alignSelf: 'stretch' },
  bento: { flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 92,
    padding: Spacing.three,
    gap: Spacing.two,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: Brand.white,
  },
  pressed: { backgroundColor: C.surfacePressed },
  disabled: { opacity: 0.5 },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 14, lineHeight: 18, color: C.text },
  head: { alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.one },
  section: { fontSize: 18, lineHeight: 24, color: C.text },
  seeAll: { alignItems: 'center', gap: 4, minHeight: Tap.min },
});
