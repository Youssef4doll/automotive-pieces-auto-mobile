import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogueApi, type Family } from '@/api/catalogue';
import { Button } from '@/components/ui/button';
import { EntryCard } from '@/components/ui/entry-card';
import { PartBadge } from '@/components/ui/part-badge';
import { PromoBanner } from '@/components/ui/promo-banner';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import {
  Border, Breakpoint, C, Elevation, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap, Type,
} from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { ArtKnowCar, ArtKnowPart } from '@/illustrations/paths';
import { Logo } from '@/illustrations/logo';

import { localeMeta, locales } from '@/i18n/locales';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * Accueil — where the customer decides how to start.
 *
 * The order is the order of the job, not the order of the marketing:
 *
 *   a compact hero saying what this app is for;
 *   the vehicle, because every answer below depends on it;
 *   the ways in, so nobody has to already know the right one;
 *   the part families, so browsing is possible without knowing any of it.
 *
 * The hero is deliberately short. An earlier pass gave it 300pt and a 38pt
 * headline, which looked like a poster and pushed the first useful control
 * below the fold on a 320pt phone. A home screen's job is to get the customer
 * moving, and a hero that fills the viewport is the desktop habit that mobile
 * redesigns are supposed to remove.
 *
 * What is NOT here: a search field. Search is the most important thing this
 * app will have and it needs an endpoint that does not exist yet. A box that
 * focuses and then cannot answer is worse than no box — it teaches the
 * customer that search is broken, which is the one thing a parts search
 * cannot afford. It goes in the moment `/api/v1/search` does.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const { t, locale, setLocale, needsRestartForRTL, rtl } = useI18n();

  /**
   * The headline gives up two points on a narrow phone.
   *
   * "Trouvez la bonne pièce pour votre voiture." is two lines at 390pt and
   * three at 320, and the third line pushed the hero to 55% of an iPhone SE
   * before the customer reached anything they could tap. Responsive type
   * rather than shorter copy: the sentence is the shop's, and it is the same
   * sentence on every phone.
   */
  const { width } = useWindowDimensions();
  const heroSize = width < Breakpoint.standard ? 22 : Type.hero.fontSize;

  const active = useGarage((s) => s.active);
  const hydrated = useGarage((s) => s.hydrated);

  const load = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(load);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <View style={[styles.hero, { paddingTop: insets.top + Spacing.four }]}>
            {/* The logo itself, not the shop's name set as an eyebrow. This
                is the one place in the app it appears at full size. */}
            <Logo size={34} />
            <Text variant="hero" tone={C.heroText} style={{ fontSize: heroSize, lineHeight: heroSize + 5 }}>
              {t('home.heroTitle')}
            </Text>
            <Text variant="hero" tone={C.heroTextMuted} style={{ fontSize: heroSize, lineHeight: heroSize + 5 }}>
              {t('home.heroTitle2')}
            </Text>
          </View>

          {/* The vehicle, pulled up over the hero's edge. It is the app's
              running context: everything below it answers differently once
              this is set, so it sits above everything below it. */}
          <View style={[styles.sheet, Elevation.lifted]}>
            {hydrated && active ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('home.yourVehicle')}. ${active.makeName} ${active.modelName}, ${active.engineName}. ${t('garage.changeCar')}`}
                onPress={() => router.push('/garage')}
                style={({ pressed }) => [
                  styles.vehicle,
                  { flexDirection: rtl ? 'row-reverse' : 'row' },
                  pressed && styles.vehiclePressed,
                ]}
              >
                <View style={styles.vehicleArt}>
                  <ArtKnowCar size={26} />
                </View>
                <View style={styles.vehicleText}>
                  <Text variant="label" tone={C.textMuted}>
                    {t('home.yourVehicle')}
                  </Text>
                  <Text variant="rowTitle" numberOfLines={1}>
                    {active.makeName} {active.modelName}
                  </Text>
                  <Text variant="hint" numberOfLines={1}>
                    {active.engineName}
                  </Text>
                </View>
                <Feather
                  name={rtl ? 'chevron-left' : 'chevron-right'}
                  size={IconSize.large}
                  color={C.textFaint}
                />
              </Pressable>
            ) : hydrated ? (
              <View style={styles.pitch}>
                <Text variant="rowTitle">{t('home.noVehicle')}</Text>
                <Text variant="hint">{t('home.noVehicleWhy')}</Text>
                <Button
                  label={t('garage.add')}
                  onPress={() => router.push('/garage/ajouter')}
                  style={styles.pitchButton}
                />
              </View>
            ) : (
              <View style={styles.pitch}>
                <Skeleton style={{ width: '60%', height: 16 }} />
                <Skeleton style={{ width: '85%', height: 12 }} />
              </View>
            )}
          </View>

          {/* Que cherchez-vous ? Two routes, because two are built. The
              reference and the photo routes arrive with search and the expert
              flow; offering four cards where two open onto nothing would be
              the app advertising what it does not have. */}
          <View style={styles.section}>
            <SectionHeader title={t('home.whatLooking')} />
            <Text variant="hint" style={styles.sectionLead}>
              {t('home.whatLookingWhy')}
            </Text>
            <View style={[styles.entryGrid, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              <EntryCard
                artwork={<ArtKnowCar size={26} />}
                title={t('entry.knowCar')}
                hint={t('entry.knowCarHint')}
                onPress={() => router.push('/garage/ajouter')}
              />
              <EntryCard
                artwork={<ArtKnowPart size={26} />}
                title={t('entry.browse')}
                hint={t('entry.browseHint')}
                onPress={() => router.push('/catalogue')}
              />
            </View>
          </View>

          {/* The shop's banner space. It renders nothing at all when no
              campaign is running, which is most of the time — and it sits
              below the ways in, because merchandising never outranks the
              thing the customer opened the app to do. */}
          <PromoBanner />

          {/* The families, as a peeking horizontal rail. The peek is what
              says "this scrolls" without a row of dots under it. */}
          <View style={styles.section}>
            <SectionHeader
              title={t('catalog.families')}
              action={{ label: t('catalog.seeAll'), onPress: () => router.push('/catalogue') }}
            />
            {families.status === 'loaded' ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.rail,
                  { flexDirection: rtl ? 'row-reverse' : 'row' },
                ]}
              >
                {families.data.map((family) => (
                  <FamilyTile
                    key={family.id}
                    family={family}
                    onPress={() =>
                      router.push({
                        pathname: '/famille/[family]',
                        params: { family: family.slug, familyName: family.name },
                      })
                    }
                  />
                ))}
              </ScrollView>
            ) : families.status === 'loading' ? (
              <View style={[styles.rail, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} style={styles.tileSkeleton} />
                ))}
              </View>
            ) : (
              // A failed rail is not worth an error screen on the home page —
              // the rest of the screen still works. It says so quietly and
              // the Catalogue tab offers the real retry.
              <Text variant="hint" tone={C.textFaint}>
                {t('state.serverBody')}
              </Text>
            )}
          </View>

          <View style={styles.langBlock}>
            <Text variant="label">{t('lang.title')}</Text>
            <View style={[styles.langRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              {locales.map((code) => (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: code === locale }}
                  onPress={() => setLocale(code)}
                  style={({ pressed }) => [
                    styles.lang,
                    code === locale && styles.langActive,
                    pressed && code !== locale && styles.langPressed,
                  ]}
                >
                  <Text
                    style={{
                      ...Type.hint,
                      fontFamily: familyFor('display', rtl),
                      color: code === locale ? C.onAccent : C.text,
                    }}
                  >
                    {localeMeta[code].label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {needsRestartForRTL ? (
              <Text variant="hint" style={styles.restart}>
                {t('lang.rtlRestart')}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** A family on the home rail: its drawing, its name, how many parts. */
function FamilyTile({ family, onPress }: { family: Family; onPress: () => void }) {
  const { t } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${family.name}, ${t('catalog.partCount', { n: family.productCount })}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <PartBadge slug={family.slug} size={46} />
      <Text variant="hint" tone={C.text} numberOfLines={2} style={styles.tileName}>
        {family.name}
      </Text>
      <Text variant="hint" tone={C.textFaint} numberOfLines={1}>
        {t('catalog.partCount', { n: family.productCount })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: {},
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: {
    backgroundColor: C.surfaceBrand,
    borderBottomLeftRadius: Radius.hero,
    borderBottomRightRadius: Radius.hero,
    paddingHorizontal: Spacing.four,
    // Room for the sheet that overlaps it, and nothing more.
    paddingBottom: Spacing.four + 32,
    gap: Spacing.three,
  },
  sheet: {
    marginTop: -32,
    marginHorizontal: Spacing.three,
    backgroundColor: C.background,
    borderRadius: Radius.sheet,
    padding: Spacing.two,
  },
  vehicle: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
  },
  vehiclePressed: { backgroundColor: C.surface },
  vehicleArt: {
    width: Tap.min,
    height: Tap.min,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleText: { flex: 1, gap: 1 },
  pitch: { padding: Spacing.three, gap: Spacing.two },
  pitchButton: { marginTop: Spacing.two },

  section: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  sectionLead: { paddingBottom: Spacing.three },
  entryGrid: { gap: Spacing.two },

  rail: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    // The rail bleeds past the section's padding so a tile can peek at the
    // screen edge instead of stopping short of it.
    paddingRight: Spacing.four,
  },
  tile: {
    width: 104,
    padding: Spacing.three,
    // The disc, then air, then the name.
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  tilePressed: { backgroundColor: C.surface },
  tileName: { minHeight: 36 },
  tileSkeleton: { width: 104, height: 128, borderRadius: Radius.card },

  langBlock: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.two,
  },
  langRow: { gap: Spacing.two, flexWrap: 'wrap' },
  lang: {
    minHeight: Tap.min,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.chip,
    backgroundColor: C.surface,
  },
  langActive: { backgroundColor: C.accent },
  langPressed: { backgroundColor: C.surfacePressed },
  restart: { paddingTop: Spacing.one },
});
