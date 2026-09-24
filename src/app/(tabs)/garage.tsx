import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { Image } from 'expo-image';

import { MakeLogo } from '@/components/ui/make-logo';
import { RENDERS } from '@/illustrations/renders';
import { useI18n } from '@/i18n/provider';
import { yearSpan } from '@/lib/format';
import { useGarage, type SavedVehicle } from '@/store/garage';

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
  const [cardWidth, setCardWidth] = useState(0);
  const [page, setPage] = useState(0);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  if (!hydrated) return <View style={styles.root} />;

  if (!active) {
    return (
      <View style={[styles.root, styles.empty]}>
        <Image source={RENDERS.key} style={{ width: 180, height: 180 }} contentFit="contain" />
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

  // The principal first, then the others as they were added.
  const ordered = [active, ...vehicles.filter((v) => v.engineId !== active.engineId)];
  const small: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean }[] = [
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

        {/* The car, as the space's centrepiece — and with several, a
            carousel of them, the principal first. */}
        {ordered.length > 1 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onLayout={(e) => setCardWidth(Math.round(e.nativeEvent.layout.width))}
              onMomentumScrollEnd={(e) => cardWidth && setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth))}
              onScroll={Platform.OS === 'web' ? (e) => cardWidth && setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth)) : undefined}
              scrollEventThrottle={64}
              style={styles.carousel}
            >
              {ordered.map((v) => (
                <View key={v.engineId} style={{ width: cardWidth || undefined, paddingHorizontal: 2 }}>
                  <HeroCard vehicle={v} principal={v.engineId === active.engineId} onMakePrincipal={() => setActive(v.engineId)} />
                </View>
              ))}
            </ScrollView>
            <View style={[row, styles.dots]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {ordered.map((v, i) => (
                <View key={v.engineId} style={[styles.dot, i === page && styles.dotOn]} />
              ))}
            </View>
          </View>
        ) : (
          <HeroCard vehicle={active} principal onMakePrincipal={() => undefined} />
        )}

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

        <PressScale accessibilityRole="button" onPress={() => router.push('/garage/vehicules')} style={[row, styles.manage]} pressedStyle={styles.pressed}>
          <Text variant="body" tone={C.text} style={styles.flex}>
            {t('look.myVehicles', { n: vehicles.length })}
          </Text>
          <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={18} color={C.textMuted} />
        </PressScale>

        {isFull() ? (
          <Text variant="hint" style={styles.centred}>
            {t('garage.full')}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function HeroCard({ vehicle, principal, onMakePrincipal }: { vehicle: SavedVehicle; principal: boolean; onMakePrincipal: () => void }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const line = [vehicle.engineName, yearSpan(vehicle.yearFrom ?? null, vehicle.yearTo ?? null, t)].filter(Boolean).join(' · ');
  return (
    <View style={styles.hero}>
      <View style={styles.heroGlow} pointerEvents="none" />
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={`${principal ? t('look.principalVehicle') : ''} ${vehicle.makeName} ${vehicle.modelName}, ${line}`}
        onPress={() => router.push('/garage/vehicules')}
        scaleTo={0.985}
        style={styles.heroMain}
      >
        <View style={[row, styles.heroTop]}>
          <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start', gap: 4 }]}>
            {principal ? (
              <Text variant="hint" tone={Brand.navy300}>
                {t('look.principalVehicle')}
              </Text>
            ) : null}
            <Text style={[styles.heroName, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]} numberOfLines={2}>
              {vehicle.makeName} {vehicle.modelName}
            </Text>
            <Text variant="hint" tone="#c7d1e3">
              {line}
            </Text>
            {principal ? (
              <View style={[styles.pill, row]}>
                <Feather name="check-circle" size={12} color={Brand.green600} />
                <Text style={[styles.pillText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.principal')}</Text>
              </View>
            ) : null}
          </View>
          <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={Brand.navy300} />
        </View>
        {/* The car's own make, large: the card is about this car, and a
            picture of some other car standing in for it would say otherwise. */}
        <View style={styles.heroArt} pointerEvents="none">
          <View style={styles.heroHalo}>
            <MakeLogo name={vehicle.makeName} slug={vehicle.makeSlug} size={96} />
          </View>
        </View>
      </PressScale>
      <PressScale
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/pieces-compatibles', params: { engine: vehicle.engineId } })}
        style={[styles.heroCta, row]}
        pressedStyle={{ backgroundColor: Brand.gold600 }}
      >
        <Feather name="check-circle" size={18} color={C.onAccent} />
        <Text style={[styles.heroCtaText, { fontFamily: familyFor('display', rtl) }]}>{t('home.seeCompatible')}</Text>
      </PressScale>
      {!principal ? (
        <PressScale accessibilityRole="button" onPress={onMakePrincipal} style={[styles.makePrincipal, row]} pressedStyle={{ opacity: 0.7 }}>
          <Feather name="star" size={15} color={Brand.white} />
          <Text style={[styles.makePrincipalText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.setPrincipal')}</Text>
        </PressScale>
      ) : null}
    </View>
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
  heroArt: { alignItems: 'center', paddingVertical: Spacing.three },
  heroHalo: {
    padding: 10,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(251,192,0,0.35)',
  },
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
  carousel: { marginHorizontal: -2 },
  dots: { justifyContent: 'center', gap: 6, paddingTop: Spacing.two },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
  dotOn: { width: 18, backgroundColor: C.text },
  makePrincipal: { alignSelf: 'center', alignItems: 'center', gap: 6, minHeight: Tap.min, paddingHorizontal: Spacing.three },
  makePrincipalText: { fontSize: 14, color: Brand.white },
  manage: {
    alignItems: 'center',
    minHeight: Tap.primary + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: Brand.white,
  },
});
