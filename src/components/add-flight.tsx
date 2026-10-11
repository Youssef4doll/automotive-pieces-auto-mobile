import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { create } from 'zustand';

import { PartImage } from '@/components/ui/part-image';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, familyFor, Radius, Spacing, ZIndex } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

type Point = { x: number; y: number };

/**
 * A part on its way into the basket: from the button that added it, in an
 * arc, to the basket in the header — the motion that says "it went in" on
 * every phone. On iOS 26 the header's buttons are the system's own (the
 * product page's SystemIsland) and cannot open to "✓ Ajouté" as the drawn
 * island does; there the flight lands on a small "Ajouté au panier" under
 * the basket instead (`confirm`), a tap from it.
 *
 * Drawn once at the root, over the headers, in window coordinates.
 */
type Flight = { id: number; from: Point; to: Point; slug: string; imageUrl: string | null; confirm: boolean };

type FlightState = {
  flight: Flight | null;
  launch: (f: Omit<Flight, 'id'>) => void;
};

let next = 1;
export const useFlight = create<FlightState>()((set) => ({
  flight: null,
  launch: (f) => set({ flight: { ...f, id: next++ } }),
}));

const FLY_MS = 700;
const SAID_MS = 2200;
const TOKEN = 52;

export function AddFlightHost() {
  const flight = useFlight((s) => s.flight);
  const reduced = useReducedMotion();
  const [said, setSaid] = useState<Flight | null>(null);
  const [flying, setFlying] = useState<Flight | null>(null);
  const [seen, setSeen] = useState<Flight | null>(null);
  // A new flight: it takes off now (none with reduced motion), and says so when it lands.
  if (flight !== seen) {
    setSeen(flight);
    setFlying(flight && !reduced ? flight : null);
    if (flight && reduced && flight.confirm) setSaid(flight);
  }

  useEffect(() => {
    if (!flying) return;
    const landed = setTimeout(() => {
      setFlying(null);
      if (flying.confirm) setSaid(flying);
    }, FLY_MS);
    return () => clearTimeout(landed);
  }, [flying]);

  useEffect(() => {
    if (!said) return;
    const gone = setTimeout(() => setSaid(null), SAID_MS);
    return () => clearTimeout(gone);
  }, [said]);

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      {flying ? <Token key={flying.id} flight={flying} /> : null}
      {said ? <Said key={said.id} at={said.to} onDone={() => setSaid(null)} /> : null}
    </View>
  );
}

/** The part itself, shrinking along an arc into the basket. */
function Token({ flight }: { flight: Flight }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: FLY_MS, easing: Easing.bezier(0.3, 0.1, 0.25, 1), reduceMotion: ReduceMotion.System }));
  }, [progress]);
  const { from, to } = flight;
  const style = useAnimatedStyle(() => {
    const t = progress.get();
    // Up first, then down into the basket: a throw, not a slide.
    const lift = -140 * 4 * t * (1 - t);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t + lift;
    return {
      opacity: t > 0.85 ? (1 - t) / 0.15 : 1,
      transform: [{ translateX: x - TOKEN / 2 }, { translateY: y - TOKEN / 2 }, { scale: 1 - 0.6 * t }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.token, Elevation.lifted, style]}>
      <PartImage slug={flight.slug} imageUrl={flight.imageUrl} size={TOKEN - 12} />
    </Animated.View>
  );
}

/** "✓ Ajouté au panier", hanging under the basket it landed in — a tap opens the basket. */
function Said({ at, onDone }: { at: Point; onDone: () => void }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t('product.added'));
  }, [t]);
  return (
    <Animated.View
      entering={FadeInUp.duration(200).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
      style={[styles.said, rtl ? { left: Spacing.three } : { right: Spacing.three }, { top: at.y + 30 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('product.added')}, ${t('product.viewCart')}`}
        onPress={() => {
          onDone();
          router.navigate('/panier');
        }}
        style={({ pressed }) => [styles.saidPill, Elevation.lifted, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
        testID="added-said"
      >
        <Feather name="check-circle" size={16} color={Brand.gold400} />
        <Text style={[styles.saidText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('product.added')}</Text>
        <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={16} color={Brand.navy300} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: ZIndex.toast },
  token: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: TOKEN,
    height: TOKEN,
    borderRadius: TOKEN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.white,
    borderWidth: 2,
    borderColor: Brand.gold500,
  },
  said: { position: 'absolute' },
  saidPill: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: C.surfaceBrand,
  },
  saidText: { fontSize: 14, lineHeight: 19, color: C.textInverse },
  pressed: { opacity: 0.85 },
});
