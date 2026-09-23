import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogueApi, type Family } from '@/api/catalogue';
import { hasContactChannel } from '@/api/shop';
import { DiscoveryArc, type DiscoveryItem } from '@/components/ui/discovery-arc';
import { PartBadge } from '@/components/ui/part-badge';
import { PromoBanner } from '@/components/ui/promo-banner';
import { SearchLauncher } from '@/components/ui/search-launcher';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { VehicleContextCard } from '@/components/ui/vehicle-context-card';
import { Border, Breakpoint, C, MaxContentWidth, Radius, Spacing, Type } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { Logo } from '@/illustrations/logo';
import { ArtKnowCar, ArtKnowPart, ArtPhoto, ArtReference } from '@/illustrations/paths';
import { CarProfile } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * Accueil — where the customer decides how to start.
 *
 * The order is the order of the job, not the order of the marketing:
 *
 *   the logo, so they know whose shop this is;
 *   a compact promise, so they know what it is for;
 *   the vehicle, because every answer below depends on it;
 *   the ways in, along an arc, so nobody has to already know the right one;
 *   the part families, so browsing is possible without knowing any of it;
 *   the shop's banner, if and only if the shop is running one.
 *
 * The hero is deliberately short. An earlier pass gave it 300pt and a 38pt
 * headline, which looked like a poster and pushed the first useful control
 * below the fold on a 320pt phone. A home screen's job is to get the customer
 * moving, and a hero that fills the viewport is the desktop habit that mobile
 * redesigns are supposed to remove.
 *
 * The search box sits in the hero, directly under the promise, because it
 * is the fastest way in for anybody who can name the part or read the number
 * off the old one. It arrived with `/api/v1/search`; before that endpoint
 * existed the hero deliberately had no box, because one that focused and
 * then could not answer would have taught the customer that search was
 * broken.
 *
 * What is NOT here any more: the language switcher. It lives in Compte,
 * with the other settings; at the foot of a discovery screen it was one
 * more thing between the customer and the parts.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();
  const { t, rtl } = useI18n();

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

  const load = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(load);

  // Whether the shop has published any way to reach a person — which decides
  // whether "je ne sais pas son nom" is offered at all.
  const settings = useShopSettings();
  const canAskShop = settings.status === 'loaded' && hasContactChannel(settings.data);

  /**
   * The ways in, in the order they are useful — and only the ones that lead
   * somewhere.
   *
   * The design this screen was drawn from lists six: the car, the part, the
   * reference stamped on the old one, a photograph for when the customer
   * cannot name it, the compatible list, and a symptom ("j'entends un
   * bruit"). Five of those are real now:
   *
   *   the compatible list, once the garage knows the car;
   *   the car, to tell the garage;
   *   the part, through the catalogue;
   *   the reference, which opens search ready for a part number;
   *   the photograph — only when the shop has published a way to reach a
   *   person. Production's WhatsApp, phone and e-mail are all still
   *   placeholders, so today that card is absent, and it appears on its own
   *   the day the owner fills one in.
   *
   * The symptom route is not here: it needs a symptom→family mapping that
   * does not exist in the database, and it must never read as a diagnosis
   * when it does. A front door with a handle painted on is how an app
   * teaches its customer to stop trusting it.
   *
   * The order changes with the garage. Once the app knows the car, the
   * shop's confirmed list for that car is the most valuable thing on the
   * screen and leads; before then it does not exist as a question.
   */
  const entries = useMemo<DiscoveryItem[]>(() => {
    const browse: DiscoveryItem = {
      key: 'browse',
      artwork: <ArtKnowPart size={30} />,
      title: t('entry.browse'),
      hint: t('entry.browseHint'),
      onPress: () => router.push('/catalogue'),
    };
    const reference: DiscoveryItem = {
      key: 'reference',
      artwork: <ArtReference size={30} />,
      title: t('entry.reference'),
      hint: t('entry.referenceHint'),
      onPress: () => router.push({ pathname: '/recherche', params: { mode: 'reference' } }),
    };
    const expert: DiscoveryItem[] = canAskShop
      ? [
          {
            key: 'expert',
            artwork: <ArtPhoto size={30} />,
            title: t('entry.expert'),
            hint: t('entry.expertHint'),
            onPress: () => router.push('/aide'),
          },
        ]
      : [];

    if (!active) {
      return [
        {
          key: 'car',
          artwork: <ArtKnowCar size={30} />,
          title: t('entry.knowCar'),
          hint: t('entry.knowCarHint'),
          onPress: () => router.push('/garage/ajouter'),
        },
        browse,
        reference,
        ...expert,
      ];
    }

    return [
      {
        key: 'mine',
        artwork: <CarProfile width={44} />,
        title: t('entry.forMyCar'),
        hint: t('entry.forMyCarHint'),
        onPress: () =>
          router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } }),
      },
      browse,
      reference,
      ...expert,
      {
        key: 'change',
        artwork: <ArtKnowCar size={30} />,
        title: t('entry.changeCar'),
        hint: t('entry.changeCarHint'),
        onPress: () => router.push('/garage/ajouter'),
      },
    ];
  }, [active, router, t, canAskShop]);

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
            {/* Aligned explicitly, because a column does not mirror itself.
                `flexDirection: row-reverse` handles a row under RTL, but this
                is a column and the logo is the only child in it narrower than
                the container — so it stayed pinned to the left of a
                right-aligned Arabic hero until this was added. Anything in a
                column that is not full width needs the same treatment. */}
            <View style={{ alignSelf: rtl ? 'flex-end' : 'flex-start' }}>
              <Logo size={34} />
            </View>
            {/* The two lines are one sentence, so they are one block with no
                gap between them. They were siblings of the logo under a 16pt
                gap once, which set them a line and a half apart and made the
                headline read as two unrelated statements. */}
            <View style={styles.heroLines}>
              <Text variant="hero" tone={C.heroText} style={{ fontSize: heroSize, lineHeight: heroSize + 5 }}>
                {t('home.heroTitle')}
              </Text>
              <Text variant="hero" tone={C.heroTextMuted} style={{ fontSize: heroSize, lineHeight: heroSize + 5 }}>
                {t('home.heroTitle2')}
              </Text>
            </View>
            <SearchLauncher tone="brand" />
          </View>

          {/* The vehicle, pulled up over the hero's edge. It is the app's
              running context: everything below it answers differently once
              this is set, so it sits above everything below it. */}
          <View style={styles.sheet}>
            <VehicleContextCard />
          </View>

          {/* Que cherchez-vous ? — the signature interaction. See
              components/ui/discovery-arc.tsx for why it is an arc. */}
          <View style={styles.sectionHead}>
            <SectionHeader title={t('home.whatLooking')} />
            <Text variant="hint">{t('home.whatLookingWhy')}</Text>
          </View>
          <DiscoveryArc items={entries} />

          {/* The families, as a peeking horizontal rail. The peek is what
              says "this scrolls" without a row of dots under it.

              A tighter top than the other sections: the arc already reserves
              30pt under itself for the cards that fall away from centre, and
              stacking a full section gap on top of that left 80pt of white
              between the arc and this title — enough that they read as two
              screens rather than two sections. */}
          <View style={styles.sectionAfterArc}>
            <SectionHeader
              title={t('catalog.families')}
              action={{ label: t('catalog.seeAll'), onPress: () => router.push('/catalogue') }}
            />
          </View>
          {families.status === 'loaded' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              // A horizontal ScrollView is still a flex child of a column and
              // gets squeezed by any sibling claiming flex; it must be told
              // not to flex at all.
              style={styles.railBar}
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
            <View style={styles.section}>
              <Text variant="hint" tone={C.textFaint}>
                {t('state.serverBody')}
              </Text>
            </View>
          )}

          {/* The shop's banner space. It renders nothing at all when no
              campaign is running, which is most of the time — and it sits
              below the ways in, because merchandising never outranks the
              thing the customer opened the app to do. */}
          <PromoBanner />

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
      <PartBadge slug={family.slug} size={48} />
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
    // Room for the card that overlaps it, and nothing more.
    paddingBottom: Spacing.four + 32,
    gap: Spacing.three,
  },
  heroLines: {},
  sheet: {
    marginTop: -32,
    marginHorizontal: Spacing.three,
  },

  sectionHead: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
  },
  section: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
  },
  sectionAfterArc: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },

  railBar: { flexGrow: 0, flexShrink: 0 },
  rail: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    // The rail bleeds past the section's padding so a tile can peek at the
    // screen edge instead of stopping short of it.
    paddingHorizontal: Spacing.four,
  },
  tile: {
    width: 112,
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
  tileSkeleton: { width: 112, height: 132, borderRadius: Radius.card },

});
