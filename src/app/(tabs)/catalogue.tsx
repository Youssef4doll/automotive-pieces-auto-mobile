import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { catalogueApi, type Family } from '@/api/catalogue';
import { BrandStrip } from '@/components/ui/brand-strip';
import { PartImage } from '@/components/ui/part-image';
import { PressScale } from '@/components/ui/press-scale';
import { SearchLauncher } from '@/components/ui/search-launcher';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { useI18n } from '@/i18n/provider';

/**
 * The catalogue's top level, as discovery rather than a directory: the
 * best-stocked families large and swipeable (by picture, for the customer
 * who does not know the words), then every family as one clean list —
 * picture, name, what is inside, how many parts — and the parts makers.
 * A small box filters by family or subfamily name as they type (the
 * families are already on the phone; no request). No four-column grid: at
 * 320pt its names were cut in half.
 *
 * The part search sits above both, because a customer who scrolls into
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

  const load = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(load);

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
  const open = (f: Family) => router.push({ pathname: '/famille/[family]', params: { family: f.slug, familyName: f.name } });
  const filtering = filter.trim().length > 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]} keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <SearchLauncher />
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
        </View>
      </View>

      {families.status === 'failed' ? (
        <Failed failure={families.failure} onRetry={families.retry} />
      ) : families.status === 'loaded' && families.data.length === 0 ? (
        <Empty title={t('catalog.noFamilies')} body={t('catalog.emptyWhy')} />
      ) : (
        <>
          {/* The best-stocked families, large and swipeable — where a
              customer who does not know the words starts, by picture. */}
          {!filtering ? (
            <>
              <Text style={[styles.title, styles.column, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>
                {t('look.mostStocked')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.rail, row]}>
                {families.status === 'loading'
                  ? [0, 1, 2, 3].map((i) => <Skeleton key={i} style={styles.bigSkeleton} />)
                  : byStock.slice(0, 6).map((f) => (
                      <PressScale
                        key={f.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${f.name}, ${t('catalog.partCount', { n: f.productCount })}`}
                        onPress={() => open(f)}
                        style={styles.big}
                        scaleTo={0.96}
                      >
                        <View style={styles.bigArt}>
                          <PartImage slug={f.slug} imageUrl={f.imageUrl} size={f.imageUrl ? 132 : 116} label={f.name} fit="cover" />
                        </View>
                        <Text variant="rowTitle" numberOfLines={1} style={{ textAlign: rtl ? 'right' : 'left' }}>
                          {f.name}
                        </Text>
                        <Text variant="hint" style={{ textAlign: rtl ? 'right' : 'left' }}>
                          {t('catalog.partCount', { n: f.productCount })}
                        </Text>
                      </PressScale>
                    ))}
              </ScrollView>
            </>
          ) : null}

          <View style={styles.column}>
            <Text style={[styles.title, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>
              {t('look.allFamilies')}
            </Text>
            {families.status === 'loading' ? (
              [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} style={styles.rowSkeleton} />)
            ) : shown.length === 0 ? (
              <Text variant="hint" style={styles.none}>
                {t('search.none', { q: filter.trim() })}
              </Text>
            ) : (
              shown.map((f, i) => (
                <PressScale
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.name}, ${t('catalog.partCount', { n: f.productCount })}`}
                  onPress={() => open(f)}
                  style={[styles.row, row, i < shown.length - 1 && styles.rule]}
                  pressedStyle={styles.pressed}
                  scaleTo={0.985}
                >
                  <View style={styles.disc}>
                    <PartImage slug={f.slug} imageUrl={f.imageUrl} size={f.imageUrl ? 48 : 34} label={f.name} fit="cover" />
                  </View>
                  <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
                    <Text variant="body" tone={C.text} numberOfLines={1}>
                      {f.name}
                    </Text>
                    {f.subcategories.length ? (
                      <Text variant="hint" numberOfLines={1}>
                        {f.subcategories.slice(0, 3).map((x) => x.name).join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="hint" tone={C.textFaint}>
                    {f.productCount}
                  </Text>
                  <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={18} color={C.textFaint} />
                </PressScale>
              ))
            )}
          </View>

          <View style={[styles.column, styles.brands]}>
            <BrandStrip />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingTop: Spacing.two, gap: Spacing.three },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  filter: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.min,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: C.surface,
  },
  filterInput: { flex: 1, minWidth: 0, fontSize: 16, color: C.text, paddingVertical: Spacing.two, outlineStyle: 'none' } as never,
  title: { fontSize: 19, lineHeight: 25, color: C.text, paddingBottom: Spacing.one },
  rail: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingBottom: Spacing.one },
  big: { width: 148, gap: 2 },
  bigArt: {
    width: 148,
    height: 132,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  bigSkeleton: { width: 148, height: 180, borderRadius: Radius.card },
  row: { alignItems: 'center', gap: Spacing.three, minHeight: 64, paddingVertical: Spacing.two },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  pressed: { backgroundColor: C.surface },
  disc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowSkeleton: { height: 56, borderRadius: Radius.tile, marginBottom: Spacing.two },
  none: { textAlign: 'center', paddingVertical: Spacing.three },
  brands: { paddingTop: Spacing.two },
});
