import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { catalogueApi, productsApi, type Family } from '@/api/catalogue';
import { AdviceCard } from '@/components/ui/advice-card';
import { BrandStrip } from '@/components/ui/brand-strip';
import { MakeLogo } from '@/components/ui/make-logo';
import { PartImage } from '@/components/ui/part-image';
import { PressScale } from '@/components/ui/press-scale';
import { ProductTile } from '@/components/ui/product-tile';
import { Rail } from '@/components/ui/rail';
import { SearchLauncher } from '@/components/ui/search-launcher';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, Elevation, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useResource } from '@/hooks/use-resource';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { useI18n } from '@/i18n/provider';
import { NavCar } from '@/illustrations/vehicle';
import { useGarage } from '@/store/garage';
import { ltr } from '@/lib/format';

/**
 * The catalogue's top level, laid out around the three ways a customer
 * arrives at a part, in the order they convert:
 *
 *   by their car — the card at the top names the car the app is answering
 *   for and opens the parts the shop has confirmed for it, or asks for the
 *   car when there is none (every list judges parts against it);
 *
 *   by a deal — the parts the shop has marked down, as a row of real tiles
 *   with the add button on them, shown only while there are some (a
 *   compare-at price the owner set; nothing here invents a promotion);
 *
 *   by family — every family as a two-column grid of pictures, best stocked
 *   first, with a small box that filters them as the customer types (the
 *   families are already on the phone; no request).
 *
 * Then the parts makers, and at the foot the way out for somebody who still
 * has not found it: a photo to the shop.
 *
 * The search box sits above everything, because a customer who scrolls into
 * "Freinage" looking for one pad can type it instead.
 *
 * Every family here holds at least one part — the API drops the empty
 * branches (reasoning on its route handler) and they reappear on their own
 * as stock arrives.
 */
function normal(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export default function CatalogueScreen() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const tabBarSpace = useTabBarSpace();
  const [filter, setFilter] = useState('');
  const { width } = useWindowDimensions();
  // Four across on a phone, six on a tablet.
  const columns = Math.min(width, MaxContentWidth) >= 600 ? 6 : 4;
  const engineId = useGarage((s) => s.active?.engineId);

  const load = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(load);
  const loadDeals = useCallback((signal: AbortSignal) => productsApi.onSale(engineId, signal), [engineId]);
  const deals = useResource(loadDeals);
  const refreshControl = usePullRefresh();

  const byStock = useMemo<Family[]>(
    () => (families.status === 'loaded' ? [...families.data].sort((a, b) => b.productCount - a.productCount) : []),
    [families],
  );
  const shown = useMemo<Family[]>(() => {
    const q = normal(filter.trim());
    if (!q) return byStock;
    return byStock.filter((f) => normal(f.name).includes(q) || f.subcategories.some((s) => normal(s.name).includes(q)));
  }, [byStock, filter]);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const open = (f: Family) => router.push({ pathname: '/famille/[family]', params: { family: f.slug, familyName: f.name } });
  const filtering = filter.trim().length > 0;
  const onSale = deals.status === 'loaded' ? deals.data.products : [];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      <View style={[styles.column, styles.top]}>
        <SearchLauncher />
      </View>

      {families.status === 'failed' ? (
        <Failed failure={families.failure} onRetry={families.retry} />
      ) : families.status === 'loaded' && families.data.length === 0 ? (
        <Empty title={t('catalog.noFamilies')} body={t('catalog.emptyWhy')} />
      ) : (
        <>
          {/* Every family, four across as round drawings in one white card —
              the version customers knew, back by request; the picture grid
              was bigger but showed four families a screen instead of sixteen. */}
          <View style={styles.column}>
            <View style={styles.familyCard}>
              <Text style={[styles.title, align, { fontFamily: familyFor('heading', rtl) }]}>{t('look.families')}</Text>
              <View style={[styles.filter, row]}>
                <Feather name="filter" size={16} color={C.textMuted} />
                <TextInput
                  value={filter}
                  onChangeText={setFilter}
                  placeholder={t('look.familySearch')}
                  placeholderTextColor={C.textFaint}
                  accessibilityLabel={t('look.familySearch')}
                  style={[styles.filterInput, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}
                />
                {filtering ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={t('catalog.clearFilters')} onPress={() => setFilter('')} hitSlop={10}>
                    <Feather name="x" size={16} color={C.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {families.status === 'loading' ? (
                <View style={[styles.grid, row]}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <View key={i} style={[styles.cell, { width: `${100 / columns}%` }]}>
                      <Skeleton style={styles.discSkeleton} />
                    </View>
                  ))}
                </View>
              ) : shown.length === 0 ? (
                <Text variant="hint" style={styles.none}>
                  {t('search.none', { q: filter.trim() })}
                </Text>
              ) : (
                <View style={[styles.grid, row]} testID="family-grid">
                  {shown.map((f) => (
                    <PressScale
                      key={f.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${f.name}, ${t('catalog.partCount', { n: f.productCount })}`}
                      onPress={() => open(f)}
                      style={[styles.cell, { width: `${100 / columns}%` }]}
                      scaleTo={0.94}
                    >
                      <View style={styles.disc}>
                        <PartImage slug={f.slug} imageUrl={f.imageUrl} size={f.imageUrl ? 64 : 44} label={f.name} fit="cover" drawn />
                      </View>
                      <Text variant="hint" tone={C.text} numberOfLines={2} style={styles.name}>
                        {f.name}
                      </Text>
                      <Text variant="hint" tone={C.textFaint} style={styles.count}>
                        {f.productCount}
                      </Text>
                    </PressScale>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* The shop's own markdowns, while there are any. */}
          {onSale.length > 0 && !filtering ? (
            <View style={styles.section} testID="catalogue-deals">
              <View style={[styles.column, styles.sectionHead, row]}>
                <View style={[styles.dealMark, row]}>
                  <Feather name="tag" size={IconSize.small} color={Brand.navy900} />
                </View>
                <Text style={[styles.title, styles.flex, align, { fontFamily: familyFor('heading', rtl) }]}>{t('catalog.onSaleTitle')}</Text>
                <Text variant="hint">{t('catalog.partCount', { n: deals.status === 'loaded' ? deals.data.total : onSale.length })}</Text>
              </View>
              <Rail contentContainerStyle={[styles.rail, row]}>
                {onSale.map((p) => (
                  <View key={p.id} style={styles.dealTile}>
                    <ProductTile product={p} />
                  </View>
                ))}
              </Rail>
            </View>
          ) : null}

          <View style={[styles.column, styles.section]}>
            <ForMyCar />
          </View>

          <View style={[styles.column, styles.section]}>
            <BrandStrip />
          </View>

          <View style={[styles.column, styles.section]}>
            <AdviceCard title="look.cantFind" />
          </View>
        </>
      )}
    </ScrollView>
  );
}

/**
 * The car the lists are judged against — and the shortest way to what fits
 * it. With a car: its make's mark, its name, and "Pièces compatibles". With
 * none: why it is worth saying which car, and the picker.
 */
function ForMyCar() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const active = useGarage((s) => s.active);
  const hydrated = useGarage((s) => s.hydrated);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  if (!hydrated) return null;

  if (!active) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('catalog.addCar')}. ${t('catalog.addCarWhy')}`}
        onPress={() => router.push('/garage/ajouter')}
        style={({ pressed }) => [styles.car, styles.carEmpty, row, pressed && styles.carPressed]}
        testID="catalogue-car"
      >
        <View style={styles.carIcon}>
          <NavCar size={IconSize.feature} color={Brand.navy900} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.carName, align, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('catalog.addCar')}</Text>
          <Text variant="hint" style={align}>
            {t('catalog.addCarWhy')}
          </Text>
        </View>
        <Feather name="plus-circle" size={IconSize.large} color={C.text} />
      </Pressable>
    );
  }

  return (
    <View style={styles.car} testID="catalogue-car">
      <View style={[styles.carTop, row]}>
        <MakeLogo name={active.makeName} slug={active.makeSlug} size={44} lifted={false} />
        <View style={styles.flex}>
          <Text variant="hint" tone={Brand.navy300} style={align}>
            {t('catalog.forCar')}
          </Text>
          <Text style={[styles.carName, styles.carNameOnNavy, align, { fontFamily: familyFor('bodySemi', rtl) }]} numberOfLines={1}>
            {`${active.makeName} ${active.modelName}`}
          </Text>
          <Text variant="hint" tone={Brand.navy300} numberOfLines={1} style={align}>
            {ltr(active.engineName)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('home.change')}, ${active.makeName} ${active.modelName}`}
          onPress={() => router.push('/garage')}
          hitSlop={8}
          style={styles.changeBtn}
        >
          <Text variant="hint" tone={Brand.white} style={styles.change}>
            {t('home.change')}
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } })}
        style={({ pressed }) => [styles.carCta, row, pressed && styles.carCtaPressed]}
      >
        <Feather name="check-circle" size={IconSize.medium} color={Brand.navy950} />
        <Text style={[styles.carCtaText, { fontFamily: familyFor('display', rtl) }]}>{t('catalog.fitsCta')}</Text>
        <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={IconSize.medium} color={Brand.navy950} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingTop: Spacing.two, gap: Spacing.four },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three },
  top: { gap: Spacing.three },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  section: { gap: Spacing.two },
  sectionHead: { alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 19, lineHeight: 25, color: C.text },
  dealMark: { width: 28, height: 28, borderRadius: 14, backgroundColor: Brand.gold500, alignItems: 'center', justifyContent: 'center' },
  rail: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.one },
  dealTile: { width: 172 },
  filter: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: C.surface,
  },
  filterInput: { flex: 1, minWidth: 0, fontSize: 16, color: C.text, paddingVertical: Spacing.two, outlineStyle: 'none' } as never,
  familyCard: {
    backgroundColor: Brand.white,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    padding: Spacing.three,
    gap: Spacing.three,
    ...Elevation.resting,
  },
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
  name: { textAlign: 'center', fontSize: 12, lineHeight: 15, minHeight: 30 },
  count: { fontSize: 11, lineHeight: 13 },
  none: { textAlign: 'center', paddingVertical: Spacing.three },
  car: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: Brand.navy950,
  },
  carTop: { alignItems: 'center', gap: Spacing.three },
  carEmpty: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.background, borderWidth: Border.thin, borderColor: C.border, borderStyle: 'dashed' },
  carPressed: { backgroundColor: C.surface },
  carIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  carName: { fontSize: 16, lineHeight: 21, color: C.text },
  carNameOnNavy: { color: Brand.white },
  carCta: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.gold500,
  },
  carCtaPressed: { backgroundColor: Brand.gold600 },
  carCtaText: { fontSize: 16, lineHeight: 20, color: Brand.navy950 },
  // A full tap target even when the word is short (« تغيير » is 23pt wide).
  changeBtn: { minHeight: Tap.min, minWidth: Tap.min, paddingHorizontal: Spacing.one, alignItems: 'center', justifyContent: 'center' },
  change: { textDecorationLine: 'underline' },
});
