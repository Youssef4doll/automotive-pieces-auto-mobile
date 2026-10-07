import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { catalogueApi, productsApi, type BrandFamily, type ProductSort } from '@/api/catalogue';
import { Button } from '@/components/ui/button';
import { findMark, MarkGlyph } from '@/components/ui/make-logo';
import { PartImage } from '@/components/ui/part-image';
import { PressScale } from '@/components/ui/press-scale';
import { ProductGrid } from '@/components/ui/product-grid';
import { ProductListSkeleton, Skeleton } from '@/components/ui/skeleton';
import { SortChip, SortSheet } from '@/components/ui/sort-sheet';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { API_BASE_URL } from '@/constants/config';
import { Border, Brand, C, Elevation, familyFor, Fonts, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useMoreProducts } from '@/hooks/use-more-products';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * One parts maker, from a "Nos marques" tile.
 *
 * The maker first, as the shop shows it: the mark uploaded in
 * /admin/catalogue/marques, else the maker's real mark where one is on
 * record (illustrations/marques), else its name in type — never a logo drawn
 * for it. Then the families it has parts in, as the catalogue draws them,
 * each with how many of this maker's parts it holds; a family is a filter
 * on this page — tap it and the list below keeps only that family, tap it
 * again (or "Tout afficher") and it lets go. Then every one of its parts, judged against the
 * car in the garage, in the order the customer picks, the next page arriving
 * as the end of the grid comes into view.
 */
export default function BrandScreen() {
  const { t, rtl } = useI18n();
  const { width } = useWindowDimensions();
  const { brand, brandName } = useLocalSearchParams<{ brand: string; brandName?: string }>();
  const engineId = useGarage((s) => s.active?.engineId);
  const [sort, setSort] = useState<ProductSort>('relevance');
  const [sorting, setSorting] = useState(false);
  const [family, setFamily] = useState<BrandFamily | null>(null);

  const loadPageInfo = useCallback((signal: AbortSignal) => catalogueApi.brand(brand, signal), [brand]);
  const info = useResource(loadPageInfo);
  const loadPage = useCallback(
    (page: number, signal: AbortSignal) => productsApi.ofBrand(brand, { engineId, sort, page, family: family?.slug }, signal),
    [brand, engineId, sort, family],
  );
  const load = useCallback((signal: AbortSignal) => loadPage(1, signal), [loadPage]);
  const products = useResource(load);
  const more = useMoreProducts(products, [brand, engineId, sort, family?.slug ?? ''].join('|'), loadPage);

  const maker = info.status === 'loaded' ? info.data.brand : null;
  const title = maker?.name || brandName || (products.status === 'loaded' && products.data.products[0]?.brand) || brand;
  const columns = Math.min(width, MaxContentWidth) >= 600 ? 6 : 4;
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  // A filter, not a door: the same family again lets go.
  const pickFamily = (f: BrandFamily) => setFamily((cur) => (cur?.slug === f.slug ? null : f));

  const header = (
    <View style={styles.header}>
      <View style={styles.hero}>
        <Mark name={String(title)} slug={brand} logoUrl={maker?.logoUrl ?? null} />
        <Text style={[styles.name, { fontFamily: familyFor('headingStrong', rtl) }]} accessibilityRole="header">
          {String(title)}
        </Text>
        {maker ? (
          <Text variant="hint" tone={C.textMuted}>
            {t('look.brandParts', { n: maker.productCount })}
          </Text>
        ) : null}
      </View>

      {info.status === 'failed' ? null : (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>
            {t('look.brandFamilies')}
          </Text>
          <View style={[styles.grid, row]} testID="brand-families">
            {info.status === 'loading'
              ? Array.from({ length: 4 }, (_, i) => (
                  <View key={i} style={[styles.cell, { width: `${100 / columns}%` }]}>
                    <Skeleton style={styles.discSkeleton} />
                  </View>
                ))
              : info.data.families.map((f) => {
                  const on = family?.slug === f.slug;
                  return (
                  <PressScale
                    key={f.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${f.name}, ${t('catalog.partCount', { n: f.productCount })}`}
                    onPress={() => pickFamily(f)}
                    style={[styles.cell, { width: `${100 / columns}%` }, family && !on && styles.cellDim]}
                    scaleTo={0.94}
                  >
                    <View style={[styles.disc, on && styles.discOn]}>
                      <PartImage slug={f.slug} imageUrl={f.imageUrl} size={f.imageUrl ? 64 : 44} label={f.name} fit="cover" drawn />
                      {on ? (
                        <View style={styles.discCheck}>
                          <Feather name="check" size={12} color={Brand.white} />
                        </View>
                      ) : null}
                    </View>
                    <Text variant="hint" tone={C.text} numberOfLines={2} style={[styles.familyName, on && { fontFamily: familyFor('bodySemi', rtl) }]}>
                      {f.name}
                    </Text>
                    <Text variant="hint" tone={C.textFaint} style={styles.count}>
                      {f.productCount}
                    </Text>
                  </PressScale>
                  );
                })}
          </View>
        </View>
      )}

      <View style={[styles.head, row]}>
        <Text style={[styles.sectionTitle, styles.flex, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>
          {family ? `${family.name} · ${String(title)}` : t('look.brandAll', { brand: String(title) })}
        </Text>
        {family ? (
          <Pressable accessibilityRole="button" onPress={() => setFamily(null)} hitSlop={8} style={[styles.clear, row]}>
            <Feather name="x" size={14} color={C.text} />
            <Text variant="hint" tone={C.text}>
              {t('brand.showAll')}
            </Text>
          </Pressable>
        ) : null}
        <SortChip sort={sort} onPress={() => setSorting(true)} />
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: String(title) }} />
      <SortSheet visible={sorting} sort={sort} onChoose={setSort} onClose={() => setSorting(false)} />
      {products.status === 'loading' ? (
        <View style={styles.pad}>
          {header}
          <ProductListSkeleton />
        </View>
      ) : products.status === 'failed' ? (
        <Failed failure={products.failure} onRetry={products.retry} />
      ) : products.data.products.length === 0 ? (
        <Empty title={t('catalog.empty')} body={t('catalog.emptyWhy')} />
      ) : (
        <ProductGrid
          products={more.products}
          onEndReached={more.loadMore}
          header={header}
          footer={
            more.loadingMore ? (
              <View style={styles.more}>
                <ActivityIndicator color={C.textMuted} />
              </View>
            ) : more.failedMore ? (
              <View style={styles.more}>
                <Text variant="hint">{t('catalog.moreFailed')}</Text>
                <Button label={t('catalog.moreRetry')} variant="secondary" onPress={more.loadMore} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

/** The maker's mark, large: uploaded, on record, or its name set in type. */
function Mark({ name, slug, logoUrl }: { name: string; slug: string; logoUrl: string | null }) {
  const mark = findMark('parts', slug) ?? findMark('parts', name);
  return (
    <View style={styles.markCard} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl.startsWith('http') ? logoUrl : `${API_BASE_URL}${logoUrl}` }}
          style={styles.logo}
          contentFit="contain"
        />
      ) : mark ? (
        <MarkGlyph mark={mark} size={56} color={Brand.navy900} />
      ) : (
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.word}>
          {name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cellDim: { opacity: 0.55 },
  discOn: { borderWidth: 2, borderColor: Brand.navy900 },
  discCheck: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: Brand.navy900, alignItems: 'center', justifyContent: 'center' },
  clear: { alignItems: 'center', gap: 4, minHeight: Tap.min, paddingHorizontal: Spacing.two, borderRadius: Radius.pill, backgroundColor: C.surface },
  root: { flex: 1, backgroundColor: C.background },
  pad: { padding: Spacing.three },
  header: { gap: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.one },
  hero: { alignItems: 'center', gap: Spacing.two },
  markCard: {
    width: 160,
    height: 96,
    borderRadius: Radius.card,
    backgroundColor: Brand.white,
    borderWidth: Border.thin,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    ...Elevation.resting,
  },
  logo: { width: 128, height: 64 },
  // A maker's name standing in for a mark: the shop's heavy italic, as on the "Nos marques" tiles.
  word: { fontFamily: Fonts.headingStrong, fontSize: 26, color: Brand.navy900, fontStyle: 'italic' },
  name: { fontSize: 24, lineHeight: 30, color: C.text, textAlign: 'center' },
  section: { gap: Spacing.three },
  sectionTitle: { fontSize: 19, lineHeight: 25, color: C.text },
  flex: { flex: 1 },
  grid: { flexWrap: 'wrap', rowGap: Spacing.three },
  cell: { alignItems: 'center', gap: 4, paddingHorizontal: 2, paddingVertical: Spacing.one, borderRadius: Radius.tile },
  disc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Elevation.resting,
  },
  discSkeleton: { width: 64, height: 64, borderRadius: 32 },
  familyName: { textAlign: 'center', fontSize: 12, lineHeight: 15, minHeight: 30 },
  count: { fontSize: 11, lineHeight: 13 },
  head: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  more: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
});
