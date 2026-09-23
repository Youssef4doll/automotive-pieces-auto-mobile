import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, type ApiFailure } from '@/api/client';
import { searchApi, type SearchResult } from '@/api/search';
import { catalogueApi, type Family } from '@/api/catalogue';
import { PartImage } from '@/components/ui/part-image';
import { ProductCard } from '@/components/ui/product-card';
import { ProductListSkeleton } from '@/components/ui/skeleton';
import { Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { VehicleBar } from '@/components/ui/vehicle-bar';
import { Border, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { useRecentSearches } from '@/store/recent-searches';

/** Long enough that a steady typist does not fire a request per letter. */
const DEBOUNCE_MS = 250;

type Scope = 'all' | 'parts' | 'families' | 'brands';

type State =
  | { status: 'idle' }
  | { status: 'loading'; previous: SearchResult | null }
  | { status: 'loaded'; data: SearchResult }
  | { status: 'failed'; failure: ApiFailure };

/**
 * Recherche — the most important thing in a parts app.
 *
 * One screen for the box, the suggestions and the results, because on a
 * phone they are one continuous act: type, glance, tap. The website splits
 * them into a dropdown and a page because it has a page to put results on;
 * here the "suggestions" ARE the results, drawn from the same ranking as the
 * shop's search page, and pressing search only does two extra things: it
 * remembers the query, and it tells the shop's demand log when nothing was
 * found.
 *
 * With a car in the garage every part carries its verdict against it, and the
 * bar at the top says which car — a green badge means nothing unless the
 * customer can see what it is about.
 *
 * `mode=reference` is "J'ai la référence" from the home screen: same search,
 * a placeholder that says what to type and a keyboard that does not
 * auto-correct GDB1330 into a word.
 */
export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; mode?: 'reference' }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, rtl } = useI18n();

  const engineId = useGarage((s) => s.active?.engineId);
  const recents = useRecentSearches();
  const loadFamilies = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(loadFamilies);

  const [query, setQuery] = useState(params.q ?? '');
  const [state, setState] = useState<State>({ status: 'idle' });
  const [scope, setScope] = useState<Scope>('all');
  const [attempt, setAttempt] = useState(0);
  const submitted = useRef(false);
  const input = useRef<TextInput>(null);

  const trimmed = query.trim();
  const reference = params.mode === 'reference';

  // Live results, debounced. A pending request is aborted when the next
  // letter arrives, so a slow answer for "pla" can never overwrite the
  // answer for "plaquettes".
  useEffect(() => {
    if (trimmed.length < 2) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    const isSubmit = submitted.current;
    submitted.current = false;
    setState((s) => ({ status: 'loading', previous: s.status === 'loaded' ? s.data : s.status === 'loading' ? s.previous : null }));

    const timer = setTimeout(
      () => {
        searchApi
          .query(trimmed, { engineId, take: 30, submitted: isSubmit }, controller.signal)
          .then((data) => {
            if (!controller.signal.aborted) setState({ status: 'loaded', data });
          })
          .catch((err: unknown) => {
            if (controller.signal.aborted) return;
            if (err instanceof Error && err.name === 'AbortError') return;
            setState({ status: 'failed', failure: err instanceof ApiError ? err.failure : { kind: 'offline' } });
          });
      },
      isSubmit ? 0 : DEBOUNCE_MS,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, engineId, attempt]);

  // A new query starts on "Tout": a scope chosen for "bosch" makes no sense
  // for "filtre huile".
  useEffect(() => setScope('all'), [trimmed]);

  const submit = useCallback(
    (value = query) => {
      const q = value.trim();
      if (q.length < 2) return;
      recents.add(q);
      submitted.current = true;
      if (q === trimmed) setAttempt((n) => n + 1);
      else setQuery(q);
    },
    [query, trimmed, recents],
  );

  const result = state.status === 'loaded' ? state.data : state.status === 'loading' ? state.previous : null;

  const scopes = useMemo(() => {
    if (!result) return [] as Scope[];
    const out: Scope[] = ['all'];
    if (result.products.length) out.push('parts');
    if (result.families.length) out.push('families');
    if (result.brands.length) out.push('brands');
    // One kind of result only: a chip row with "Tout" and one other chip
    // that shows exactly the same thing is two controls for nothing.
    return out.length > 2 ? out : [];
  }, [result]);

  const showFamilies = !!result && (scope === 'all' || scope === 'families') && result.families.length > 0;
  const showBrands = !!result && (scope === 'all' || scope === 'brands') && result.brands.length > 0;
  const products = result && (scope === 'all' || scope === 'parts') ? result.products : [];
  const nothing = state.status === 'loaded' && result && !result.products.length && !result.families.length && !result.brands.length;

  const header = (
    <View style={styles.headerBlock}>
      {scopes.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.chipBar}
          contentContainerStyle={[styles.chips, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
        >
          {scopes.map((s) => (
            <ScopeChip
              key={s}
              label={t(
                s === 'all' ? 'search.scopeAll' : s === 'parts' ? 'search.scopeParts' : s === 'families' ? 'search.scopeFamilies' : 'search.scopeBrands',
              )}
              selected={scope === s}
              onPress={() => setScope(s)}
            />
          ))}
        </ScrollView>
      ) : null}

      {result?.didYouMean ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => submit(result.didYouMean ?? '')}
          style={({ pressed }) => [styles.dym, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.rowPressed]}
        >
          <Text variant="hint">{t('search.didYouMean')}</Text>
          <Text variant="rowTitle" style={styles.dymTerm}>
            {result.didYouMean}
          </Text>
          <Feather name="corner-down-left" size={IconSize.small} color={C.textMuted} />
        </Pressable>
      ) : null}

      {showFamilies ? (
        <View style={styles.group}>
          <Text variant="label">{t('look.suggestions')}</Text>
          {result.families.map((f) => (
            <Pressable
              key={f.slug}
              accessibilityRole="button"
              onPress={() => {
                recents.add(trimmed);
                router.push({
                  pathname: '/famille/[family]',
                  params: {
                    family: f.familySlug,
                    familyName: f.parentName ?? f.name,
                    ...(f.slug !== f.familySlug ? { subcategory: f.slug } : {}),
                  },
                });
              }}
              style={({ pressed }) => [styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.rowPressed]}
            >
              <View style={styles.thumb}>
                <PartImage slug={f.familySlug} size={30} />
              </View>
              <View style={styles.rowText}>
                <Text variant="rowTitle" numberOfLines={1}>
                  {f.name}
                </Text>
                {f.parentName ? (
                  <Text variant="hint" numberOfLines={1}>
                    {t('search.inFamily', { family: f.parentName })}
                  </Text>
                ) : null}
              </View>
              <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {showBrands ? (
        <View style={styles.group}>
          <Text variant="label">{t('search.scopeBrands')}</Text>
          {result.brands.map((b) => (
            <Pressable
              key={b.name}
              accessibilityRole="button"
              onPress={() => submit(b.name)}
              style={({ pressed }) => [styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.rowPressed]}
            >
              <View style={styles.monogram}>
                <Text style={{ fontFamily: familyFor('headingStrong', false), fontSize: 14, color: C.text }}>
                  {b.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text variant="rowTitle" numberOfLines={1}>
                  {b.name}
                </Text>
                <Text variant="hint">{t('catalog.partCount', { n: b.productCount })}</Text>
              </View>
              <Feather name="search" size={IconSize.medium} color={C.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {products.length ? (
        <Text variant="label" style={styles.partsTitle}>
          {t('search.results', { n: result?.products.length ?? 0, q: result?.query ?? trimmed })}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />

      {/* The box. A real input from the first frame, focused, so the
          keyboard is already up when the screen lands. */}
      <View style={styles.column}>
        <View style={[styles.bar, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('a11y.back')}
            onPress={() => router.back()}
            hitSlop={6}
            style={({ pressed }) => [styles.iconButton, pressed && styles.rowPressed]}
          >
            <Feather name={rtl ? 'arrow-right' : 'arrow-left'} size={IconSize.large} color={C.text} />
          </Pressable>

          <View style={[styles.field, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <Feather name="search" size={IconSize.medium} color={C.textMuted} />
            <TextInput
              ref={input}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => submit()}
              autoFocus
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize={reference ? 'characters' : 'none'}
              placeholder={t(reference ? 'search.referencePlaceholder' : 'search.placeholder')}
              placeholderTextColor={C.textFaint}
              accessibilityLabel={t(reference ? 'search.referencePlaceholder' : 'search.placeholder')}
              style={[
                styles.input,
                {
                  fontFamily: familyFor('body', rtl),
                  textAlign: rtl ? 'right' : 'left',
                  writingDirection: rtl ? 'rtl' : 'ltr',
                },
              ]}
            />
            {query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('search.clear')}
                onPress={() => {
                  setQuery('');
                  input.current?.focus();
                }}
                style={styles.clear}
              >
                <Feather name="x-circle" size={IconSize.medium} color={C.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.vehicle}>
          <VehicleBar />
        </View>
      </View>

      {state.status === 'idle' ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.column, styles.idle, { paddingBottom: insets.bottom + Spacing.five }]}
        >
          {recents.queries.length ? (
            <View style={styles.group}>
              <View style={[styles.groupHead, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                <Text variant="label">{t('look.recents')}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={recents.clear}
                  hitSlop={8}
                  style={({ pressed }) => [styles.textButton, pressed && styles.rowPressed]}
                >
                  <Text variant="hint" tone={C.text}>
                    {t('search.clearRecent')}
                  </Text>
                </Pressable>
              </View>
              <View style={[styles.chipWrap, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                {recents.queries.map((q) => (
                  <Pressable
                    key={q}
                    accessibilityRole="button"
                    accessibilityHint={t('search.removeRecent', { q })}
                    onPress={() => submit(q)}
                    onLongPress={() => recents.remove(q)}
                    style={({ pressed }) => [styles.idleChip, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.rowPressed]}
                  >
                    <Feather name="clock" size={14} color={C.textMuted} />
                    <Text variant="hint" tone={C.text} numberOfLines={1}>
                      {q}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {families.status === 'loaded' && families.data.length ? (
            <View style={styles.group}>
              <Text variant="label">{t('search.scopeFamilies')}</Text>
              <View style={[styles.chipWrap, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                {families.data.map((f: Family) => (
                  <Pressable
                    key={f.id}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/famille/[family]', params: { family: f.slug, familyName: f.name } })}
                    style={({ pressed }) => [styles.idleChip, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.rowPressed]}
                  >
                    <PartImage slug={f.slug} size={20} />
                    <Text variant="hint" tone={C.text} numberOfLines={1}>
                      {f.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={[styles.tip, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <Feather name={reference ? 'hash' : 'info'} size={IconSize.medium} color={C.textMuted} />
            <Text variant="hint" style={styles.rowText}>
              {t('search.tip')}
            </Text>
          </View>
        </ScrollView>
      ) : state.status === 'failed' ? (
        <Failed failure={state.failure} onRetry={() => setAttempt((n) => n + 1)} />
      ) : nothing ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.column, styles.idle]}>
          {header}
          <View style={styles.none}>
            <Text variant="sectionTitle">{t('search.none', { q: trimmed })}</Text>
            <Text variant="hint">{t('search.noneWhy')}</Text>
          </View>
        </ScrollView>
      ) : !result ? (
        <View style={[styles.column, styles.idle]}>
          <ProductListSkeleton rows={3} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.column, styles.list, { paddingBottom: insets.bottom + Spacing.five }]}
          ListHeaderComponent={header}
          ItemSeparatorComponent={Gap}
          renderItem={({ item }) => (
            <View>
              {item.match !== 'text' ? (
                <Text variant="hint" tone={item.match === 'reference' ? C.success : C.textMuted} style={styles.match}>
                  {t(item.match === 'reference' ? 'search.matchReference' : 'search.matchClose')}
                </Text>
              ) : null}
              <ProductCard product={item} />
            </View>
          )}
          // A result that is being replaced is dimmed, not blanked: the list
          // stays put while the next answer is on its way.
          style={state.status === 'loading' ? styles.stale : undefined}
        />
      )}
    </View>
  );
}

function Gap() {
  return <View style={{ height: Spacing.two }} />;
}

function ScopeChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { rtl } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && !selected && styles.rowPressed]}
    >
      <Text
        style={{
          ...Type.hint,
          fontFamily: familyFor('display', rtl),
          color: selected ? C.textInverse : C.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
  },
  bar: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  iconButton: {
    width: Tap.min,
    height: Tap.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  field: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: Border.selected,
    borderColor: C.text,
    backgroundColor: C.background,
  },
  input: {
    flex: 1,
    // Without this a web <input> keeps its intrinsic ~20-character width and
    // refuses to shrink, which pushed the row 3pt past a 320pt screen.
    minWidth: 0,
    minHeight: Tap.primary - 4,
    fontSize: 16,
    color: C.text,
    // The pill's own navy border is the focus signal. The browser's outline
    // drew a second, gold rectangle inside it in the web build.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  // A full 44pt target, not 32 plus hitSlop: hitSlop does not exist for a
  // mouse or a screen reader's focus ring, and the floor is the floor.
  clear: {
    width: Tap.min,
    height: Tap.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicle: {
    paddingVertical: Spacing.two,
  },
  idle: {
    paddingTop: Spacing.two,
    gap: Spacing.four,
  },
  list: {
    paddingTop: Spacing.one,
  },
  stale: {
    opacity: 0.55,
  },
  headerBlock: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  chipBar: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: Spacing.two },
  chip: {
    minHeight: Tap.min,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.chip,
    backgroundColor: C.surface,
  },
  chipSelected: {
    backgroundColor: C.surfaceBrand,
  },
  group: {
    gap: Spacing.one,
  },
  groupHead: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textButton: {
    minHeight: Tap.min,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.chip,
  },
  row: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 56,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.tile,
  },
  rowPressed: {
    backgroundColor: C.surface,
  },
  rowText: {
    flex: 1,
  },
  monogram: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWrap: { flexWrap: 'wrap', gap: Spacing.two },
  idleChip: {
    alignItems: 'center',
    gap: 6,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentRow: {
    alignItems: 'center',
  },
  recent: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.tile,
  },
  tip: {
    gap: Spacing.two,
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
  },
  dym: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: C.cautionSurface,
  },
  dymTerm: {
    flexShrink: 1,
  },
  partsTitle: {
    paddingTop: Spacing.one,
  },
  match: {
    paddingBottom: Spacing.one,
  },
  none: {
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
});
