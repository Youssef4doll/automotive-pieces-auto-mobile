import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { catalogueApi, productsApi, type Family } from '@/api/catalogue';
import { ProductCard } from '@/components/ui/product-card';
import { Screen } from '@/components/ui/screen';
import { ProductListSkeleton } from '@/components/ui/skeleton';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, C, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * One family of parts, with its subcategories as a filter.
 *
 * Two reads rather than one: the subcategory chips come from the families
 * endpoint, which is cached from the moment the customer opened the
 * catalogue, so switching between "Tout" and "Disque de frein" only re-fetches
 * the products.
 *
 * Every card is judged against the car in the garage. If there is no car the
 * verdict is null and the badge says so — "sélectionnez votre véhicule" is a
 * different and more useful sentence than "compatibilité à vérifier", and
 * collapsing the two would tell a customer who never told us their car that
 * the whole catalogue is uncertain.
 */
export default function FamilyScreen() {
  const { t, rtl } = useI18n();
  const { family, familyName } = useLocalSearchParams<{
    family: string;
    familyName?: string;
  }>();

  const engineId = useGarage((s) => s.active?.engineId);
  const [subcategory, setSubcategory] = useState<string | null>(null);

  const loadFamilies = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(loadFamilies);

  const loadProducts = useCallback(
    (signal: AbortSignal) =>
      productsApi.inFamily(
        family,
        { engineId, subcategorySlug: subcategory ?? undefined },
        signal,
      ),
    [family, engineId, subcategory],
  );
  const products = useResource(loadProducts);

  const subcategories = useMemo(() => {
    if (families.status !== 'loaded') return [];
    return families.data.find((f: Family) => f.slug === family)?.subcategories ?? [];
  }, [families, family]);

  return (
    <>
      <Stack.Screen options={{ title: familyName || t('catalog.title') }} />
      <Screen edges={['left', 'right', 'bottom']}>
        {/* Refine, not navigate. The chips narrow what is already on screen,
            so the selected one is filled and "Tout" is always reachable —
            a filter the customer cannot undo is a trap. */}
        {subcategories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // A horizontal ScrollView is still a flex child of a column, and
            // next to a FlatList claiming flex:1 it gets squeezed until the
            // chips are sheared off along the bottom — which is what shipped
            // in the first pass. It must be told not to flex at all.
            style={styles.chipBar}
            contentContainerStyle={[
              styles.chips,
              { flexDirection: rtl ? 'row-reverse' : 'row' },
            ]}
          >
            <Chip
              label={t('catalog.allOf')}
              selected={subcategory === null}
              onPress={() => setSubcategory(null)}
            />
            {subcategories.map((sub) => (
              <Chip
                key={sub.id}
                label={sub.name}
                selected={subcategory === sub.slug}
                onPress={() => setSubcategory(sub.slug)}
              />
            ))}
          </ScrollView>
        ) : null}

        {products.status === 'loading' ? (
          <View style={styles.body}>
            <ProductListSkeleton />
          </View>
        ) : products.status === 'failed' ? (
          <Failed failure={products.failure} onRetry={products.retry} />
        ) : products.data.products.length === 0 ? (
          <Empty title={t('catalog.empty')} body={t('catalog.emptyWhy')} />
        ) : (
          <FlatList
            data={products.data.products}
            keyExtractor={(product) => product.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={Gap}
            ListHeaderComponent={
              <Text variant="hint" tone={C.textMuted} style={styles.count}>
                {t('catalog.resultCount', { n: products.data.total })}
              </Text>
            }
            renderItem={({ item }) => <ProductCard product={item} />}
          />
        )}
      </Screen>
    </>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && styles.chipPressed,
      ]}
    >
      <Text variant="hint" tone={selected ? C.onAccent : C.text} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  chipBar: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chips: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.three,
  },
  chip: {
    minHeight: Tap.min,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.chip,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  chipSelected: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  chipPressed: { backgroundColor: C.surface },
  body: { flex: 1, paddingTop: Spacing.two },
  list: { paddingBottom: Spacing.six },
  count: { paddingBottom: Spacing.two },
  gap: { height: Spacing.two },
});
