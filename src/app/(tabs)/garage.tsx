import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { VehicleCard } from '@/components/ui/vehicle-card';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { CarArt } from '@/illustrations/car-art';
import { useI18n } from '@/i18n/provider';
import { yearSpan } from '@/lib/format';
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

  const others = vehicles.filter((v) => v.engineId !== active.engineId);
  const small: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean }[] = [
    { icon: 'clock', label: t('look.bento.history'), onPress: () => router.push('/compte/commandes') },
    { icon: 'info', label: t('look.bento.info'), onPress: () => router.push('/garage/vehicules') },
    { icon: 'plus', label: t('look.bento.add'), onPress: () => router.push('/garage/ajouter'), disabled: isFull() },
  ];
  const line = [active.engineName, yearSpan(active.yearFrom ?? null, active.yearTo ?? null, t)].filter(Boolean).join(' · ');

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: t('garage.title') }} />
      <View style={styles.column}>
        <Text variant="hint" tone={C.textMuted} style={{ textAlign: rtl ? 'right' : 'left' }}>
          {t('look.garageCount', { n: vehicles.length })}
        </Text>

        {/* The car, as the space's centrepiece: navy, the drawing large, the
            one action it exists for in gold. */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} pointerEvents="none" />
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={`${t('look.principalVehicle')}, ${active.makeName} ${active.modelName}, ${line}`}
            onPress={() => router.push('/garage/vehicules')}
            scaleTo={0.985}
            style={styles.heroMain}
          >
            <View style={[row, styles.heroTop]}>
              <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start', gap: 4 }]}>
                <Text variant="hint" tone={Brand.navy300}>
                  {t('look.principalVehicle')}
                </Text>
                <Text style={[styles.heroName, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}>
                  {active.makeName} {active.modelName}
                </Text>
                <Text variant="hint" tone="#c7d1e3">
                  {line}
                </Text>
                <View style={[styles.pill, row]}>
                  <Feather name="check-circle" size={12} color={Brand.green600} />
                  <Text style={[styles.pillText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.principal')}</Text>
                </View>
              </View>
              <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={Brand.navy300} />
            </View>
            <View style={[styles.heroArt, rtl && { transform: [{ scaleX: -1 }] }]} pointerEvents="none">
              <CarArt width={250} body={Brand.navy600} />
            </View>
          </PressScale>
          <PressScale
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } })}
            style={[styles.heroCta, row]}
            pressedStyle={{ backgroundColor: Brand.gold600 }}
          >
            <Feather name="check-circle" size={18} color={C.onAccent} />
            <Text style={[styles.heroCtaText, { fontFamily: familyFor('display', rtl) }]}>{t('home.seeCompatible')}</Text>
          </PressScale>
        </View>

        {/* Three quieter doors: icon and word, no card each. */}
        <View style={[styles.quick, row]}>
          {small.map((b) => (
            <PressScale
              key={b.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: b.disabled }}
              disabled={b.disabled}
              onPress={b.onPress}
              style={[styles.quickItem, b.disabled && styles.disabled]}
              pressedStyle={styles.pressed}
            >
              <View style={styles.quickIcon}>
                <Feather name={b.icon} size={20} color={C.text} />
              </View>
              <Text style={[styles.quickLabel, { fontFamily: familyFor('bodySemi', rtl) }]} numberOfLines={2}>
                {b.label}
              </Text>
            </PressScale>
          ))}
        </View>

        {others.length ? (
          <>
            <View style={[styles.head, row]}>
              <Text style={[styles.section, { fontFamily: familyFor('heading', rtl) }]}>{t('look.myVehicles', { n: vehicles.length })}</Text>
              <PressScale accessibilityRole="button" onPress={() => router.push('/garage/vehicules')} hitSlop={8} style={[styles.seeAll, row]}>
                <Text variant="hint" tone={C.text}>
                  {t('catalog.seeAll')}
                </Text>
                <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
              </PressScale>
            </View>
            <View style={styles.list}>
              {others.map((v) => (
                <VehicleCard key={v.engineId} vehicle={v} compactArt flat action={t('garage.use')} onPress={() => setActive(v.engineId)} />
              ))}
            </View>
          </>
        ) : null}

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
  flex: { flex: 1, minWidth: 0 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four, backgroundColor: C.background },
  centred: { textAlign: 'center' },
  wide: { alignSelf: 'stretch' },
  hero: {
    borderRadius: Radius.card,
    backgroundColor: Brand.navy900,
    padding: Spacing.four,
    paddingBottom: Spacing.three,
    overflow: 'hidden',
    gap: Spacing.three,
  },
  heroGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, right: -80, top: 40, backgroundColor: Brand.navy700, opacity: 0.6 },
  heroMain: { gap: Spacing.two },
  heroTop: { alignItems: 'flex-start', gap: Spacing.two },
  heroName: { fontSize: 24, lineHeight: 30, color: Brand.white },
  pill: {
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(22,163,74,0.16)',
  },
  pillText: { fontSize: 12, lineHeight: 16, color: '#86efac' },
  heroArt: { alignItems: 'center', paddingVertical: Spacing.one },
  heroCta: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary,
    borderRadius: Radius.pill,
    backgroundColor: Brand.gold500,
  },
  heroCtaText: { fontSize: 16, color: C.onAccent },
  quick: {
    backgroundColor: Brand.white,
    borderRadius: Radius.card,
    paddingVertical: Spacing.three,
    ...Elevation.resting,
  },
  quickItem: { flex: 1, alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.one, borderRadius: Radius.tile, paddingVertical: Spacing.one },
  quickIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, lineHeight: 17, color: C.text, textAlign: 'center' },
  pressed: { backgroundColor: C.surface },
  disabled: { opacity: 0.45 },
  head: { alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.one },
  section: { fontSize: 18, lineHeight: 24, color: C.text },
  seeAll: { alignItems: 'center', gap: 4, minHeight: Tap.min },
  list: { gap: Spacing.two },
});
