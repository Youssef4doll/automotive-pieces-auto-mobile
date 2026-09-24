import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { API_BASE_URL } from '@/constants/config';
import { Brand, C, Elevation, familyFor } from '@/constants/theme';
import { MAKE_MARKS, markKey, PARTS_BRAND_MARKS, type Mark } from '@/illustrations/marques';
import { Text } from './text';

/**
 * A maker's mark in a white disc — the car's make on a vehicle card, a
 * make in the picker, a parts maker in the brand strip.
 *
 * In order: the logo the shop uploaded in /admin; the real mark from
 * illustrations/marques; the initials, set in type, for a make nobody has a
 * mark for yet. Never an invented symbol.
 */
export function MakeLogo({
  name,
  slug,
  logoUrl,
  size = 56,
  kind = 'make',
  lifted = true,
  style,
}: {
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  size?: number;
  kind?: 'make' | 'parts';
  /** A soft shadow under the disc; off inside rows that have their own surface. */
  lifted?: boolean;
  style?: ViewStyle;
}) {
  const mark = findMark(kind, slug ?? name) ?? findMark(kind, name);
  const inner = Math.round(size * 0.56);
  return (
    <View
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2 },
        lifted && Elevation.resting,
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl.startsWith('http') ? logoUrl : `${API_BASE_URL}${logoUrl}` }}
          style={{ width: inner, height: inner }}
          contentFit="contain"
        />
      ) : mark ? (
        <Svg width={inner} height={inner} viewBox="0 0 24 24">
          <Path d={mark.path} fill={Brand.navy950} />
        </Svg>
      ) : (
        <Text style={{ fontFamily: familyFor('headingStrong', false), fontSize: Math.round(size * 0.3), color: C.text }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

/** Whether a real mark is on record, for layouts that change around one. */
export function hasMark(kind: 'make' | 'parts', nameOrSlug: string) {
  return Boolean(findMark(kind, nameOrSlug));
}

/** The bare mark, for a wordmark row that draws its own frame. */
export function MarkGlyph({ mark, size, color = Brand.navy950 }: { mark: Mark; size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={mark.path} fill={color} />
    </Svg>
  );
}

export function findMark(kind: 'make' | 'parts', nameOrSlug: string): Mark | null {
  const table = kind === 'make' ? MAKE_MARKS : PARTS_BRAND_MARKS;
  return table[markKey(nameOrSlug)] ?? null;
}

/** "BMW" stays "BMW"; "Land Rover" becomes "LR"; "Citroën" becomes "CI". */
function initials(name: string) {
  const words = name.trim().split(/[\s-]+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  const w = words[0] ?? '';
  return w.length <= 3 ? w.toUpperCase() : w.slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  disc: {
    backgroundColor: Brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
