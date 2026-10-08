import { Image } from 'expo-image';
import { useCallback } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { catalogueApi } from '@/api/catalogue';
import { vehiclesApi } from '@/api/vehicles';
import { API_BASE_URL } from '@/constants/config';
import { Brand, C, Elevation, familyFor } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { MAKE_MARKS, markKey, PARTS_BRAND_MARKS, type Mark } from '@/illustrations/marques';
import { Text } from './text';

/**
 * A maker's mark in a white disc — the car's make on a vehicle card, a
 * make in the picker, a parts maker in the brand strip.
 *
 * In order: the logo the shop uploaded in /admin; the real mark from
 * illustrations/marques; the initials, set in type, for a make nobody has a
 * mark for yet. Never an invented symbol.
 *
 * A caller that has the uploaded logo to hand passes it (the picker reads it
 * with the makes). Everywhere else — a car in the garage keeps only its
 * make's name and slug — the logo is looked up in the shop's list, so a make
 * added in /admin with its logo (Škoda) shows it on Home, in the garage and
 * on a part, not "SK".
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
  const uploaded = useUploadedLogo(kind, slug ?? name, name, logoUrl === undefined);
  const src = logoUrl ?? uploaded;
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
      {src ? (
        <Image
          source={{ uri: src.startsWith('http') ? src : `${API_BASE_URL}${src}` }}
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

type Listed = { slug: string; name: string; logoUrl: string | null };

/** The uploaded logo of this make (or parts maker) in the shop's list, or null. */
function useUploadedLogo(kind: 'make' | 'parts', slug: string, name: string, wanted: boolean): string | null {
  const load = useCallback(
    (signal: AbortSignal): Promise<Listed[]> =>
      !wanted ? Promise.resolve([]) : kind === 'make' ? vehiclesApi.makes(signal) : catalogueApi.brands(signal),
    [kind, wanted],
  );
  const list = useResource(load);
  if (list.status !== 'loaded') return null;
  const bySlug = slug.toLowerCase();
  const byName = name.trim().toLowerCase();
  return list.data.find((m) => m.slug === bySlug || m.name.toLowerCase() === byName)?.logoUrl ?? null;
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
