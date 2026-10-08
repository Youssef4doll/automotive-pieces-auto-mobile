import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { catalogueApi } from '@/api/catalogue';
import { API_BASE_URL } from '@/constants/config';
import { Brand, familyFor } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { findMark, MarkGlyph } from './make-logo';
import { Text } from './text';

const HEIGHT = 30;

/**
 * A part's maker, as its logo — the product page's first line.
 *
 * The same order as "Nos marques" (brand-strip): the logo uploaded in
 * /admin/catalogue/marques; then the maker's real mark on record with its
 * name; otherwise the name set in the shop's red. Never a drawn stand-in.
 * The maker is found in the shop's list of makers (cached once Home has read
 * it); a maker on that list opens its own page.
 */
export function BrandLogo({ name }: { name: string }) {
  const { rtl } = useI18n();
  const router = useRouter();
  const load = useCallback((signal: AbortSignal) => catalogueApi.brands(signal), []);
  const brands = useResource(load);
  const key = name.trim().toLowerCase();
  const brand = brands.status === 'loaded' ? brands.data.find((b) => b.name.toLowerCase() === key || b.slug === key) : undefined;
  const mark = findMark('parts', brand?.slug ?? name);

  // The line keeps its height while the list loads, so nothing jumps.
  if (brands.status === 'loading') return <View style={styles.box} />;

  const content = brand?.logoUrl ? (
    <Image
      source={{ uri: brand.logoUrl.startsWith('http') ? brand.logoUrl : `${API_BASE_URL}${brand.logoUrl}` }}
      style={styles.logo}
      contentFit="contain"
      contentPosition={rtl ? 'right center' : 'left center'}
      accessibilityLabel={name}
    />
  ) : mark ? (
    <View style={[styles.markRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <MarkGlyph mark={mark} size={22} color={Brand.navy900} />
      <Text style={[styles.word, styles.markWord, { fontFamily: familyFor('headingStrong', rtl) }]}>{name}</Text>
    </View>
  ) : (
    <Text style={[styles.word, { fontFamily: familyFor('headingStrong', rtl) }]}>{name.toUpperCase()}</Text>
  );

  if (!brand) return <View style={[styles.box, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={name}
      onPress={() => router.push({ pathname: '/marque/[brand]', params: { brand: brand.slug, brandName: brand.name } })}
      hitSlop={8}
      style={({ pressed }) => [styles.box, { alignItems: rtl ? 'flex-end' : 'flex-start' }, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: HEIGHT, justifyContent: 'center', alignSelf: 'stretch' },
  pressed: { opacity: 0.6 },
  logo: { width: 132, height: HEIGHT },
  markRow: { alignItems: 'center', gap: 8 },
  word: { fontSize: 15, lineHeight: 20, letterSpacing: 0.6, color: Brand.red600 },
  markWord: { color: Brand.navy900, letterSpacing: 0 },
});
