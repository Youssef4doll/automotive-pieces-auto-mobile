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
        <Trail steps={trail} />
        <Text variant="screenTitle" style={styles.heading}>
          {heading}
        </Text>
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
            {items.length >= FILTER_THRESHOLD ? (
              <FilterField value={filter} onChange={setFilter} placeholder={t('picker.filter')} />
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
                      title={item.title}
                      subtitle={item.subtitle}
                      note={item.note}
                      onPress={item.onPress}
                    />
                  )
                }
                ItemSeparatorComponent={Gap}
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
