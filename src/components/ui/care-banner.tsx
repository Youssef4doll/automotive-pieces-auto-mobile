import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { Family } from '@/api/catalogue';
import { Brand, Elevation, familyFor, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { PartImage } from './part-image';
import { PressScale } from './press-scale';
import { Text } from './text';

/** The families a service visit is made of, in the order a mechanic reaches for them. */
const SERVICE = ['lubrifiant', 'filtres', 'allumage-prechauffage'];

/**
 * "Entretien auto" — the home screen's one editorial banner.
 *
 * Its pictures are the family pictures from the rail right above it, in the
 * same white discs, so the banner cannot fall out of step with whatever art
 * the shop uploads: change a family's picture in /admin and both change.
 * The eyebrow names only the families actually shown, and a family that
 * holds no part is not shown — the banner promises what the shop stocks.
 */
export function CareBanner({ families, onOpen }: { families: Family[]; onOpen: (f: Family) => void }) {
  const { t, rtl } = useI18n();
  const shown = SERVICE.map((slug) => families.find((f) => f.slug === slug)).filter((f): f is Family => Boolean(f));
  const lead = shown[0];
  if (!lead) return null;
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`${t('home.care')}. ${t('home.careWhy')}`}
      onPress={() => onOpen(lead)}
      style={styles.card}
      scaleTo={0.985}
    >
      {/* The backdrop: navy deepening to the corner, a gold arc sweeping
          behind the discs, and two fine speed lines — the road, quietly. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 340 176" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="care-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={Brand.navy800} />
            <Stop offset="1" stopColor={Brand.navy950} />
          </LinearGradient>
        </Defs>
        <Rect width={340} height={176} fill="url(#care-bg)" />
        <Circle cx={rtl ? 40 : 300} cy={96} r={112} fill={Brand.navy700} opacity={0.55} />
        <Circle cx={rtl ? 40 : 300} cy={96} r={112} fill="none" stroke={Brand.gold500} strokeWidth={3} strokeDasharray="120 600" strokeLinecap="round" />
        <Path d={rtl ? 'M340 150 L180 150' : 'M0 150 L160 150'} stroke={Brand.white} strokeOpacity={0.07} strokeWidth={2} />
        <Path d={rtl ? 'M340 160 L220 160' : 'M0 160 L120 160'} stroke={Brand.white} strokeOpacity={0.05} strokeWidth={2} />
      </Svg>

      <View style={[row, styles.inner]}>
        <View style={[styles.text, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
          <Text numberOfLines={1} style={[styles.eyebrow, align, { fontFamily: familyFor('bodySemi', rtl) }]}>
            {shown.slice(0, 2).map((f) => f.name).join(' · ')}
          </Text>
          <Text style={[styles.title, align, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('home.care')}</Text>
          <Text style={[styles.why, align, { fontFamily: familyFor('body', rtl) }]}>{t('home.careWhy')}</Text>
          <View style={[styles.cta, row]}>
            <Text style={[styles.ctaText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('home.careCta')}</Text>
            <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={Brand.navy900} />
          </View>
        </View>

        <View style={styles.discs} pointerEvents="none">
          {shown.map((f, i) => (
            <View key={f.id} style={[styles.disc, DISC_AT[shown.length - 1]![i]!, rtl && mirror(DISC_AT[shown.length - 1]![i]!)]}>
              <PartImage slug={f.slug} imageUrl={f.imageUrl} size={f.imageUrl ? DISC[i]! : DISC[i]! * 0.72} label={f.name} fit="cover" />
            </View>
          ))}
        </View>
      </View>
    </PressScale>
  );
}

/** Disc sizes: the lead family large, the others tucked beside it. */
const DISC = [96, 64, 58];
const at = (size: number, top: number, right: number) => ({ width: size, height: size, borderRadius: size / 2, top, right });
const DISC_AT = [
  [at(DISC[0]!, 26, 8)],
  [at(DISC[0]!, 18, 22), at(DISC[1]!, 86, 0)],
  [at(DISC[0]!, 14, 26), at(DISC[1]!, 88, 2), at(DISC[2]!, 96, 84)],
];
const mirror = (p: { right: number }) => ({ right: undefined, left: p.right });

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, overflow: 'hidden', minHeight: 176, backgroundColor: Brand.navy900, ...Elevation.lifted },
  inner: { flex: 1, padding: Spacing.four },
  text: { flex: 1, maxWidth: '56%', gap: 6, justifyContent: 'center' },
  eyebrow: { fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: Brand.gold400 },
  title: { fontSize: 22, lineHeight: 27, color: Brand.white },
  why: { fontSize: 14, lineHeight: 19, color: '#c7d1e3' },
  cta: {
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 36,
    borderRadius: Radius.pill,
    backgroundColor: Brand.gold500,
  },
  ctaText: { fontSize: 14, lineHeight: 18, color: Brand.navy900 },
  discs: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  disc: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: Brand.white,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.resting,
  },
});
