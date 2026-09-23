import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PartImage } from '@/components/ui/part-image';
import { Empty } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { useFavourites } from '@/store/favourites';

/**
 * Mes favoris — the hearted parts. No prices on this list on purpose: they
 * are not remembered (store/favourites), and each row opens the part, which
 * reads its price and stock fresh from the shop.
 */
export default function FavouritesScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const items = useFavourites((s) => s.items);
  const remove = useFavourites((s) => s.remove);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: t('look.favourites') }} />
      {items.length === 0 ? (
        <Empty title={t('look.favEmpty')} body={t('look.favEmptyWhy')} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(f) => f.slug}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={[item.brand, item.name].filter(Boolean).join(', ')}
                onPress={() => router.push({ pathname: '/produit/[slug]', params: { slug: item.slug } })}
                style={({ pressed }) => [styles.main, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
              >
                <View style={styles.thumb}>
                  <PartImage slug={item.familySlug} imageUrl={item.imageUrl} size={48} />
                </View>
                <View style={[styles.text, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
                  {item.brand ? (
                    <Text style={[styles.brand, { fontFamily: familyFor('display', rtl) }]}>{item.brand.toUpperCase()}</Text>
                  ) : null}
                  <Text variant="body" tone={C.text} numberOfLines={2}>
                    {item.name}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('look.favRemove')}
                onPress={() => remove(item.slug)}
                style={styles.x}
              >
                <Feather name="x" size={18} color={C.textMuted} />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  list: { padding: Spacing.three, gap: Spacing.two, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  row: {
    alignItems: 'center',
    backgroundColor: Brand.white,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  main: { flex: 1, alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  pressed: { backgroundColor: C.surface },
  thumb: { width: 60, height: 60, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  text: { flex: 1, gap: 2 },
  brand: { fontSize: 12, color: Brand.red600, letterSpacing: 0.4 },
  x: { width: Tap.min, height: Tap.min, alignItems: 'center', justifyContent: 'center' },
});
