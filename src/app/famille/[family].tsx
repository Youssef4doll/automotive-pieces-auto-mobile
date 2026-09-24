import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { catalogueApi, productsApi, type Family } from '@/api/catalogue';
import { PartImage } from '@/components/ui/part-image';
import { ProductGrid } from '@/components/ui/product-grid';
import { ProductListSkeleton } from '@/components/ui/skeleton';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, familyFor, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { track } from '@/services/analytics';

/**
 * One family of parts — the reference's "Freinage" screen.
 *
 * A dark head with the family's picture (the one uploaded in /admin, else
 * the website's illustration), its name and a line of the shop's voice;
 * then a white sheet with the subcategories as chips and the parts two to a
 * row. Every tile is judged against the car in the garage.
 *
 * The title comes from the catalogue itself, so a link that arrives with
 * only the slug still says "Freinage" rather than "Catalogue".
 */
const TAGLINES: Record<string, DictKey> = {
  freinage: 'look.tag.freinage',
  filtres: 'look.tag.filtres',
  suspension: 'look.tag.suspension',
  moteur: 'look.tag.moteur',
  eclairage: 'look.tag.eclairage',
};

export default function FamilyScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { family, familyName, subcategory: initialSubcategory } = useLocalSearchParams<{
    family: string;
    familyName?: string;
    subcategory?: string;
  }>();

  const engineId = useGarage((s) => s.active?.engineId);
  const [subcategory, setSubcategory] = useState<string | null>(initialSubcategory ?? null);

  const loadFamilies = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(loadFamilies);
  const loadProducts = useCallback(
    (signal: AbortSignal) => productsApi.inFamily(family, { engineId, subcategorySlug: subcategory ?? undefined }, signal),
    [family, engineId, subcategory],
  );
  const products = useResource(loadProducts);
  useEffect(() => {
    track('category_viewed', { family, subcategory, vehicle: Boolean(engineId) });
  }, [family, subcategory, engineId]);

  const current = useMemo<Family | undefined>(
    () => (families.status === 'loaded' ? families.data.find((f) => f.slug === family) : undefined),
    [families, family],
  );
  const subcategories = current?.subcategories ?? [];
  const name = current?.name ?? familyName ?? '';
  const tagline = TAGLINES[family] ? t(TAGLINES[family]) : current ? t('look.tag.default', { n: current.productCount }) : '';
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/catalogue'));

  const head = (
    <View>
      <View style={[styles.hero, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.glow} pointerEvents="none" />
        <View style={[row, styles.bar]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('a11y.back')} onPress={back} style={styles.iconBtn}>
            <Feather name={rtl ? 'arrow-right' : 'arrow-left'} size={22} color={Brand.white} />
          </Pressable>
          <Text numberOfLines={1} style={[styles.title, { fontFamily: familyFor('headingStrong', rtl), textAlign: rtl ? 'right' : 'left' }]}>
            {name}
          </Text>
        </View>
        <View style={[styles.art, rtl ? { left: Spacing.three } : { right: Spacing.three }]} pointerEvents="none">
          <PartImage slug={family} imageUrl={current?.imageUrl} size={150} label={name} fit={current?.imageUrl ? 'cover' : 'contain'} />
        </View>
        <Text style={[styles.tagline, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}>{tagline}</Text>
      </View>

      <View style={styles.sheet}>
        {subcategories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipBar}
            contentContainerStyle={[styles.chips, row]}
          >
            <Chip label={t('catalog.allOf')} selected={subcategory === null} onPress={() => setSubcategory(null)} />
            {subcategories.map((sub) => (
              <Chip key={sub.id} label={sub.name} selected={subcategory === sub.slug} onPress={() => setSubcategory(sub.slug)} />
            ))}
          </ScrollView>
        ) : null}
        <View style={[row, styles.sectionHead]}>
          <Text style={[styles.section, { fontFamily: familyFor('heading', rtl) }]}>{t('look.ourProducts')}</Text>
          {products.status === 'loaded' ? (
            <Text variant="hint" tone={C.textMuted}>
              {t('catalog.resultCount', { n: products.data.total })}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, title: name }} />
      <StatusBar style="light" />
      {products.status === 'loaded' && products.data.products.length > 0 ? (
        <ProductGrid products={products.data.products} header={<View style={styles.bleed}>{head}</View>} />
      ) : (
        <ScrollView contentContainerStyle={styles.fill}>
          {head}
          <View style={styles.pad}>
            {products.status === 'loading' ? (
              <ProductListSkeleton />
            ) : products.status === 'failed' ? (
              <Failed failure={products.failure} onRetry={products.retry} />
            ) : (
              <Empty title={t('catalog.empty')} body={t('catalog.emptyWhy')} />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && !selected && styles.chipPressed]}
    >
      <Text variant="hint" tone={selected ? Brand.white : C.text} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  fill: { flexGrow: 1 },
  // The grid pads its content by 16; the head runs edge to edge.
  bleed: { marginHorizontal: -Spacing.three },
  hero: {
    backgroundColor: Brand.navy950,
    minHeight: 250,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five + Spacing.two,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    right: -90,
    top: 10,
    backgroundColor: Brand.navy700,
    opacity: 0.55,
  },
  bar: { alignItems: 'center', gap: Spacing.one, minHeight: Tap.min },
  iconBtn: { width: Tap.min, height: Tap.min, alignItems: 'center', justifyContent: 'center', marginHorizontal: -Spacing.two },
  title: { flex: 1, fontSize: 26, lineHeight: 32, color: Brand.white, paddingHorizontal: Spacing.two },
  art: { position: 'absolute', top: 64, width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  tagline: { marginTop: 128, fontSize: 15, lineHeight: 20, color: '#d4dcea', maxWidth: '58%' },
  sheet: {
    marginTop: -Spacing.four,
    backgroundColor: C.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  chipBar: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: Spacing.two, paddingBottom: Spacing.three },
  chip: {
    minHeight: Tap.min,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.chip,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  chipSelected: { backgroundColor: Brand.navy900, borderColor: Brand.navy900 },
  chipPressed: { backgroundColor: C.surface },
  sectionHead: { alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: Spacing.two },
  section: { fontSize: 19, lineHeight: 25, color: C.text },
  pad: { padding: Spacing.three },
});
