import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { Resource } from '@/hooks/use-resource';
import { Trail, type TrailStep } from '@/components/ui/chip';
import { FilterField, fold } from '@/components/ui/filter-field';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Empty, Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Tile } from '@/components/ui/tile';
import { C, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/**
 * One step of the garage picker: make, then model, then engine.
 *
 * All three screens are this component with a different loader and a
 * different row. Writing it once is not only less code — it is the only way
 * the three steps agree about the things that are easy to get subtly
 * different: when the filter box appears, what an empty list says, what a
 * failed request says, and how the breadcrumb reads.
 *
 * `layout` chooses between a list of cards and a grid of tiles. The first two
 * steps are lists because a make is picked from ten or forty and scanned down
 * a column; the motorisation is a grid because it is the last choice, there
 * are rarely more than four, and they are compared against each other rather
 * than searched for.
 */

export type PickerItem = {
  key: string;
  title: string;
  subtitle: string | null;
  note: string | null;
  /** What the filter box matches against — the name, plus anything else useful. */
  haystack: string;
  /** Grid only: draws the accent outline and a check. */
  marked?: boolean;
  /** List only: a mark before the title (a make's logo). */
  leading?: React.ReactNode;
  onPress: () => void;
};

/**
 * Above this many rows, the list gets a filter box.
 *
 * Twelve is about a screen and a half on a phone. Below it, scrolling is
 * faster than typing and the box is just a control in the way.
 */
const FILTER_THRESHOLD = 12;

export function PickerScreen<T>({
  trail,
  heading,
  layout = 'list',
  resource,
  toItems,
  emptyTitle,
  emptyBody,
  footer,
  header,
  notice,
  subtitle,
  filterPlaceholder,
  alwaysFilter = false,
}: {
  /** Marque → Modèle → Motorisation, with what has been chosen so far. */
  trail: TrailStep[];
  heading: string;
  layout?: 'list' | 'grid';
  resource: Resource<T[]>;
  toItems: (data: T[]) => PickerItem[];
  emptyTitle: string;
  emptyBody?: string | null;
  /**
   * Where the picker admits what it does not have.
   *
   * Pinned to the bottom of the screen rather than appended to the list. It
   * used to ride under the last row, which on the engine grid — two tiles and
   * then nothing — left it stranded in the middle of an empty screen looking
   * like a failed load. It is a standing caveat about the shop's data, not a
   * list item, so it sits where a standing caveat belongs.
   */
  footer?: string | null;
  /**
   * Shortcuts above the list — on the first step, the registration card,
   * the cars already in the garage and the makes with the most parts. Hidden
   * while the customer is filtering: they have said what they are looking
   * for, and the shortcuts would push it down.
   */
  header?: React.ReactNode;
  /** One line of context from where the customer came, e.g. "VIN reconnu : BMW". */
  notice?: string | null;
  /** One line under the heading, as the reference's "Trouvez les pièces compatibles…". */
  subtitle?: string | null;
  filterPlaceholder?: string;
  /** Show the search box however short the list — the makes screen leads with it. */
  alwaysFilter?: boolean;
}) {
  const { t, rtl } = useI18n();
  const [filter, setFilter] = useState('');

  const items = useMemo(
    () => (resource.status === 'loaded' ? toItems(resource.data) : []),
    [resource, toItems],
  );

  const needle = fold(filter);
  const shown = useMemo(
    () => (needle ? items.filter((item) => fold(item.haystack).includes(needle)) : items),
    [items, needle],
  );

  const grid = layout === 'grid';

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.head}>
        <StepProgress steps={trail} />
        <Trail steps={trail} />
        <Text variant="screenTitle" style={styles.heading}>
          {heading}
        </Text>
        {subtitle ? (
          <Text variant="hint" tone={C.textMuted} style={{ textAlign: rtl ? 'right' : 'left' }}>
            {subtitle}
          </Text>
        ) : null}
        {notice ? (
          <View style={styles.notice}>
            <Text variant="hint" tone={C.success}>
              {notice}
            </Text>
          </View>
        ) : null}
      </View>

      {resource.status === 'loading' ? <Loading /> : null}

      {resource.status === 'failed' ? (
        <Failed failure={resource.failure} onRetry={resource.retry} />
      ) : null}

      {resource.status === 'loaded' ? (
        items.length === 0 ? (
          // The shop has no rows for this step at all. A different sentence
          // from "your filter matched nothing", and it is not the customer's
          // fault, so the screen says what is missing rather than asking them
          // to try something.
          <Empty title={emptyTitle} body={emptyBody} />
        ) : (
          <>
            {alwaysFilter || items.length >= FILTER_THRESHOLD ? (
              <FilterField value={filter} onChange={setFilter} placeholder={filterPlaceholder ?? t('picker.filter')} />
            ) : null}

            {shown.length === 0 ? (
              <Empty title={t('picker.noMatch', { q: filter })} body={t('picker.noMatchHint')} />
            ) : (
              <FlatList
                data={shown}
                keyExtractor={(item) => item.key}
                // Remounting the list when the layout changes is deliberate:
                // FlatList caches item heights, and switching column count on
                // a live list leaves it measuring a grid with a list's
                // geometry.
                key={layout}
                numColumns={grid ? 2 : 1}
                columnWrapperStyle={grid ? styles.gridRow : undefined}
                renderItem={({ item }) =>
                  grid ? (
                    <Tile
                      title={item.title}
                      detail={item.subtitle}
                      note={item.note}
                      marked={item.marked}
                      onPress={item.onPress}
                    />
                  ) : (
                    <ListRow
                      leading={item.leading}
                      title={item.title}
                      subtitle={item.subtitle}
                      note={item.note}
                      onPress={item.onPress}
                    />
                  )
                }
                ItemSeparatorComponent={Gap}
                ListHeaderComponent={header && !needle ? <View style={styles.header}>{header}</View> : null}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )
      ) : null}

      {footer ? (
        <View style={styles.footerBar}>
          <Text variant="hint" tone={C.textFaint} style={{ textAlign: rtl ? 'right' : 'left' }}>
            {footer}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

/** Air between cards. Replaces the hairline the rows used to be split by. */
function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  head: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  heading: {
    paddingTop: Spacing.two,
  },
  notice: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    backgroundColor: C.successSurface,
  },
  header: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  list: {
    paddingBottom: Spacing.six,
  },
  gap: {
    height: Spacing.two,
  },
  gridRow: {
    gap: Spacing.two,
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
});

/**
 * A guided setup, not a form: three segments that fill as the customer goes
 * (make, model, engine) and the words "Étape 2 sur 3", so there is never a
 * question of how much is left. The chips under it still name what was
 * chosen and take the customer back to it.
 */
function StepProgress({ steps }: { steps: TrailStep[] }) {
  const { t, rtl } = useI18n();
  const at = Math.max(0, steps.findIndex((s) => s.state === 'current'));
  const shown = rtl ? [...steps].reverse() : steps;
  return (
    <View style={progress.wrap} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: steps.length, now: at + 1 }}>
      <View style={[progress.bar, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        {shown.map((s, i) => (
          <View key={i} style={[progress.seg, s.state !== 'upcoming' && progress.segOn]} />
        ))}
      </View>
      <Text variant="hint" tone={C.textMuted} style={{ textAlign: rtl ? 'right' : 'left' }}>
        {t('look.stepOf', { n: at + 1, total: steps.length })}
      </Text>
    </View>
  );
}

const progress = StyleSheet.create({
  wrap: { gap: Spacing.one, paddingBottom: Spacing.two },
  bar: { gap: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.border },
  segOn: { backgroundColor: C.accent },
});
