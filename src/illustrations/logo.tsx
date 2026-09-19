import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Brand, C, familyFor, Spacing } from '@/constants/theme';
import { HEX_PATH, LETTER_PATH, LOGO_VIEWBOX } from './logo-paths';
import { useI18n } from '@/i18n/provider';
import { Text } from '@/components/ui/text';

/**
 * The shop's logo.
 *
 * Rebuilt as vector from the raster the owner supplied, so it is crisp at
 * 20pt in a header and at 200 on a splash screen, takes the colours it is
 * given, and adds nothing to the bundle. **If the shop has the original
 * vector file, that is the one that should be here** — this is an accurate
 * reconstruction of the mark, not the artwork that came out of whoever drew
 * it, and the wordmark in particular is set in the app's own display face
 * rather than in the logo's lettering.
 *
 * Three brand colours, all of them already in `theme.ts`: the gold hexagon,
 * the navy A, the red underline. Red appears nowhere else in this app, which
 * is what makes it read as a signature rather than as an alert.
 */

/**
 * The hexagon and its A, on their own.
 *
 * Used wherever the full lockup would be too wide to read — a compact
 * header, a small tile, an app icon. The mark carries the brand by itself;
 * the wordmark is what makes it a logo.
 */
export function LogoMark({
  size = 32,
  hex = Brand.gold500,
  letter = Brand.navy900,
}: {
  size?: number;
  hex?: string;
  letter?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox={LOGO_VIEWBOX} fill="none">
      {/*
        Flat top and bottom, points left and right, and every corner rounded.
        Drawn as one path with quadratic corners rather than a <Polygon> with
        a round linejoin: a join only rounds a stroke, and this shape is a
        fill.
      */}
      <Path d={HEX_PATH} fill={hex} />
      {/*
        The A, as one path with an even-odd hole for its counter. Drawing the
        counter as a second subpath rather than as a navy triangle over a gold
        one means the letter stays correct on any hexagon colour.
      */}
      <Path d={LETTER_PATH} fill={letter} fillRule="evenodd" />
    </Svg>
  );
}

/**
 * The red underline beneath the wordmark.
 *
 * A tapered lens — blunt at the left, drawn out to a point at the right —
 * rather than a stroked line, because a stroke of even weight loses the
 * sweep entirely at the sizes this is used at.
 */
function Swoosh({ width, color = Brand.red600 }: { width: number; color?: string }) {
  return (
    <Svg width={width} height={width * 0.09} viewBox="0 0 200 18" fill="none">
      <Path
        d="M3.4 14.8 Q4.6 10.4 9.8 9.4 Q80 -1.4 197.2 9.2 Q80 6.6 11.2 16.4 Q4.2 17.4 3.4 14.8 Z"
        fill={color}
      />
    </Svg>
  );
}

/**
 * The full logo: mark, wordmark, underline, and the line beneath it.
 *
 * `tone` picks the wordmark's colour for the surface it sits on — white on
 * the navy hero, navy on a white screen. The hexagon and the underline never
 * change; they are the brand and they work on both.
 *
 * The wordmark is Archivo ExtraBold, tracked out, which is the app's own
 * display face and close to the logo's lettering without being it. Under
 * Arabic the whole stack swaps to Cairo like everything else, so the shop's
 * name keeps its shape rather than falling back to the system face.
 */
export function Logo({
  size = 40,
  tone = 'onNavy',
}: {
  /** Height of the hexagon; everything else is proportional to it. */
  size?: number;
  tone?: 'onNavy' | 'onLight';
}) {
  const { rtl } = useI18n();
  const wordColour = tone === 'onNavy' ? C.heroText : C.text;
  const subColour = tone === 'onNavy' ? C.heroTextMuted : C.textMuted;
  /**
   * Measured off the supplied artwork rather than guessed: there, the
   * hexagon stands about 2.7 times the cap height of AUTOMOTIVE. Archivo
   * ExtraBold's cap height is roughly 0.72 of its point size, which puts the
   * wordmark at 0.40 of the mark. The first pass used 0.62 and the lockup
   * read as a wordmark with a small badge stuck to it instead of a mark with
   * its name beside it.
   */
  const wordSize = size * 0.4;
  const wordWidth = wordSize * 7.1;

  return (
    <View style={[styles.lockup, { flexDirection: rtl ? 'row-reverse' : 'row', gap: size * 0.3 }]}>
      <LogoMark size={size} />

      {/* The wordmark stays left-to-right even under RTL: it is the shop's
          name as it is printed on the shopfront, not a translated string. */}
      <View style={styles.words}>
        <Text
          style={{
            fontFamily: familyFor('headingStrong', rtl),
            fontSize: wordSize,
            lineHeight: wordSize * 1.08,
            letterSpacing: wordSize * 0.02,
            color: wordColour,
            writingDirection: 'ltr',
            textAlign: 'left',
          }}
        >
          AUTOMOTIVE
        </Text>

        <Swoosh width={wordWidth} />

        <Text
          style={{
            fontFamily: familyFor('display', rtl),
            fontSize: wordSize * 0.36,
            lineHeight: wordSize * 0.5,
            letterSpacing: wordSize * 0.22,
            color: subColour,
            writingDirection: 'ltr',
            textAlign: 'left',
          }}
        >
          PIÈCES AUTO
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    alignItems: 'center',
  },
  words: {
    // The underline sits tight under the wordmark and the strapline tight
    // under that; the lockup is one object, not three stacked ones.
    gap: Spacing.half,
  },
});
