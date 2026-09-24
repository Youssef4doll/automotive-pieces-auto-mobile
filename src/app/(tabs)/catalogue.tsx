import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { catalogueApi, type Family } from '@/api/catalogue';
import { BrandStrip } from '@/components/ui/brand-strip';
import { PartImage } from '@/components/ui/part-image';
import { PressScale } from '@/components/ui/press-scale';
import { SearchLauncher } from '@/components/ui/search-launcher';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { useI18n } from '@/i18n/provider';

/**
 * The catalogue's top level — the reference's "Toutes les familles de
 * pièces": a grid of illustrated families, four to a row on a phone, that a
 * customer scans by picture before they read a word. A small box filters
 * the grid by name as they type (the families are already on the phone; no
 * request). Then the parts makers the shop carries.
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
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState('');

  const load = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(load);

  // Four across on a phone, six on a tablet — the reference's density.
  const columns = Math.min(width, MaxContentWidth) >= 600 ? 6 : 4;
  const shown = useMemo<Family[]>(() => {
    if (families.status !== 'loaded') return [];
    const q = normal(filter.trim());
    if (!q) return families.data;
    return families.data.filter((f) => normal(f.name).includes(q) || f.subcategories.some((s) => normal(s.name).includes(q)));
  }, [families, filter]);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]} keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <SearchLauncher />

        <View style={styles.card}>
          <Text style={[styles.title, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>{t('look.families')}</Text>
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

          {families.status === 'loading' ? (
            <View style={[styles.grid, row]}>
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} style={[styles.cell, { width: `${100 / columns}%` }]}>
                  <Skeleton style={styles.discSkeleton} />
                </View>
              ))}
            </View>
          ) : families.status === 'failed' ? (
            <Failed failure={families.failure} onRetry={families.retry} />
          ) : families.data.length === 0 ? (
            <Empty title={t('catalog.noFamilies')} body={t('catalog.emptyWhy')} />
          ) : shown.length === 0 ? (
            <Text variant="hint" style={styles.none}>
              {t('search.none', { q: filter.trim() })}
            </Text>
          ) : (
            <View style={[styles.grid, row]}>
              {shown.map((f) => (
                <PressScale
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.name}, ${t('catalog.partCount', { n: f.productCount })}`}
                  onPress={() => router.push({ pathname: '/famille/[family]', params: { family: f.slug, familyName: f.name } })}
                  style={[styles.cell, { width: `${100 / columns}%` }]}
                  scaleTo={0.94}
                >
                  <View style={styles.disc}>
                    <PartImage slug={f.slug} imageUrl={f.imageUrl} size={f.imageUrl ? 64 : 44} label={f.name} fit="cover" />
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

        <View style={styles.card}>
          <BrandStrip />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { paddingTop: Spacing.two },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  card: {
    backgroundColor: Brand.white,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
    ...Elevation.resting,
  },
  title: { fontSize: 19, lineHeight: 25, color: C.text },
  filter: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: C.surface,
  },
  filterInput: { flex: 1, minWidth: 0, fontSize: 15, color: C.text, paddingVertical: Spacing.two, outlineStyle: 'none' } as never,
  grid: { flexWrap: 'wrap', rowGap: Spacing.three },
  cell: { alignItems: 'center', gap: 4, paddingHorizontal: 2, paddingVertical: Spacing.one, borderRadius: Radius.tile },
  pressed: { backgroundColor: C.surface },
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
});
