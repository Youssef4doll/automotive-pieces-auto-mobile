import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { catalogueApi, type PartsBrand } from '@/api/catalogue';
import { API_BASE_URL } from '@/constants/config';
import { Brand, C, familyFor, Fonts, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * "Nos marques" — the parts makers the shop actually carries, most parts
 * first, each a door to that maker's parts.
 *
 * The mark is the one uploaded in /admin/catalogue/marques; without one the
 * name is set in type. Never a drawn stand-in: that would be an invented
 * trademark. Renders nothing until the list is in, and nothing at all when
 * the shop carries no branded parts — an empty strip is worse than none.
 */
export function BrandStrip() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const load = useCallback((signal: AbortSignal) => catalogueApi.brands(signal), []);
  const brands = useResource(load);
  if (brands.status !== 'loaded' || brands.data.length === 0) return null;
  const list = rtl ? [...brands.data].reverse() : brands.data;

  return (
    <View style={styles.wrap}>
      <View style={[styles.head, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.title, { fontFamily: familyFor('heading', rtl) }]}>{t('look.brands')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {list.map((b) => (
          <BrandTile key={b.id} brand={b} onPress={() => router.push({ pathname: '/marque/[brand]', params: { brand: b.slug, brandName: b.name } })} />
        ))}
      </ScrollView>
    </View>
  );
}

function BrandTile({ brand, onPress }: { brand: PartsBrand; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={brand.name}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      {brand.logoUrl ? (
        <Image
          source={{ uri: brand.logoUrl.startsWith('http') ? brand.logoUrl : `${API_BASE_URL}${brand.logoUrl}` }}
          style={styles.logo}
          contentFit="contain"
        />
      ) : (
        <Text numberOfLines={1} style={styles.word}>
          {brand.name}
        </Text>
      )}
    </Pressable>
  );
}

/** A row that ends in "see all"-style arrow, for the reference's section heads. */
export function SeeAll({ label, onPress }: { label: string; onPress: () => void }) {
  const { rtl } = useI18n();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={[styles.seeAll, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <Text variant="hint" tone={C.text}>
        {label}
      </Text>
      <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  head: { alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, lineHeight: 26, color: C.text },
  row: { gap: Spacing.two, paddingVertical: Spacing.one },
  tile: {
    minWidth: 104,
    height: 56,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: C.surface },
  logo: { width: 84, height: 32 },
  // A maker's name as a wordmark stand-in would be invented; plain heavy
  // type, the shop's navy, says the name and nothing more.
  word: { fontFamily: Fonts.headingStrong, fontSize: 16, color: Brand.navy900, fontStyle: 'italic' },
  seeAll: { alignItems: 'center', gap: 4, minHeight: Tap.min },
});
