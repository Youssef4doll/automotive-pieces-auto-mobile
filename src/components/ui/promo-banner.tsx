import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { appRouteFor, promotionsApi, type Promo } from '@/api/promotions';
import { API_BASE_URL } from '@/constants/config';
import { Border, C, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import type { DictKey } from '@/i18n/dictionaries';
import { Text } from './text';

/**
 * The shop's banner space — the app's equivalent of the storefront's promo
 * band.
 *
 * Three rules it inherits from the website, and one deliberate difference.
 *
 * **Empty renders nothing.** Not a placeholder, not a house ad, not an
 * evergreen "bienvenue" slide. When the shop is not running a campaign this
 * component returns null and the space belongs to the catalogue. Inventing
 * something to fill it is the same habit as inventing stock.
 *
 * **The title is the alt text, not a headline.** The shop writes it as a
 * description of the artwork, so it becomes the accessible name and is never
 * drawn over the image. Whatever the banner is saying, it is already saying
 * it in the picture.
 *
 * **A banner nobody can route to is not tappable.** See `appRouteFor`.
 *
 * The difference: **it does not auto-advance.** The website's band does, on a
 * six-second timer. On a phone that fights the thumb — a banner that moves
 * while somebody is reading it, or shifts the tap target out from under them
 * mid-press, and it is the first thing under a scrolling finger. Swipe and
 * the dots are enough.
 */
const KIND_LABEL: Record<NonNullable<Promo['kind']>, DictKey> = {
  SEASONAL: 'promo.seasonal',
  NEW_ARRIVALS: 'promo.new',
  DEAL: 'promo.deal',
};

/** The storefront's own mobile aspect, so a banner is cropped identically. */
const ASPECT = 16 / 7;

export function PromoBanner() {
  const { width } = useWindowDimensions();
  const load = useCallback((signal: AbortSignal) => promotionsApi.all(signal), []);
  const promos = useResource(load);
  const [index, setIndex] = useState(0);

  // The scroll position is the source of truth for which slide is showing,
  // so a flick cannot leave the dots disagreeing with the image.
  const slideWidth = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = slideWidth.current;
    if (!w) return;
    setIndex(Math.round(Math.abs(e.nativeEvent.contentOffset.x) / w));
  }, []);

  // Nothing while it loads, and nothing when there is nothing. A skeleton
  // here would reserve space for something that is usually absent, and then
  // collapse — a worse shift than the banner simply appearing.
  if (promos.status !== 'loaded' || promos.data.length === 0) return null;

  // Each slide has to be exactly as wide as the scroll view, or paging snaps
  // to one width while the content steps by another and the carousel drifts
  // a little further out of register with every swipe. The gutter lives
  // INSIDE the slide, not around it.
  const page = Math.min(width, MaxContentWidth);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={(e) => {
          slideWidth.current = e.nativeEvent.layout.width;
        }}
        style={styles.track}
      >
        {promos.data.map((promo) => (
          <Slide key={promo.id} promo={promo} page={page} />
        ))}
      </ScrollView>

      {promos.data.length > 1 ? (
        <View style={styles.dots}>
          {promos.data.map((promo, i) => (
            <View key={promo.id} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Slide({ promo, page }: { promo: Promo; page: number }) {
  const router = useRouter();
  const { t } = useI18n();
  const route = appRouteFor(promo.href);

  const art = (
    <View style={[styles.slide, { width: page - Spacing.four * 2, height: (page - Spacing.four * 2) / ASPECT }]}>
      <Image
        source={{ uri: `${API_BASE_URL}${promo.imageUrl}` }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={160}
      />
      {promo.kind ? (
        <View style={styles.kind}>
          <Text variant="label" tone={C.onAccent}>
            {t(KIND_LABEL[promo.kind])}
          </Text>
        </View>
      ) : null}
    </View>
  );

  // The whole banner is the target when there is somewhere to go, and plain
  // content when there is not. No chevron, no "en savoir plus" on a slide
  // that cannot move.
  if (!route) {
    return (
      <View style={{ width: page }} accessible accessibilityLabel={promo.title}>
        {art}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={promo.title}
      onPress={() => router.push(route as never)}
      style={({ pressed }) => [{ width: page }, pressed && styles.pressed]}
    >
      {art}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: Spacing.five,
    gap: Spacing.two,
  },
  track: {
    flexGrow: 0,
  },
  slide: {
    marginHorizontal: Spacing.four,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: Border.hairline,
    borderColor: C.border,
  },
  pressed: { opacity: 0.85 },
  kind: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    backgroundColor: C.accent,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
  },
  dotOn: { backgroundColor: C.text },
});
