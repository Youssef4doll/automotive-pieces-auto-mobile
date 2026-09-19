import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { Resource } from '@/hooks/use-resource';
import { FilterField, fold } from '@/components/ui/filter-field';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Empty, Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/**
 * One step of the garage picker: make, then model, then engine.
 *
 * All three screens are this component with a different loader and a
 * different row. Writing it once is not only less code — it is the only way
 * the three steps agree about the things that are easy to get subtly
 * different: when the filter box appears, what an empty list says, what a
 * failed request says, and where the step counter sits.
 */

export type PickerItem = {
  key: string;
  title: string;
  subtitle: string | null;
  note: string | null;
  /** What the filter box matches against — the name, plus anything else useful. */
  haystack: string;
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
  step,
  heading,
  resource,
  toItems,
  emptyTitle,
  emptyBody,
  footer,
}: {
  /** 1, 2 or 3. Shown as "Étape n sur 3". */
  step: 1 | 2 | 3;
  heading: string;
  resource: Resource<T[]>;
  toItems: (data: T[]) => PickerItem[];
  emptyTitle: string;
  emptyBody?: string | null;
  /** A line under the list — where the picker admits what it does not have. */
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

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.head}>
        <Text variant="label">{t('picker.step', { n: step })}</Text>
        <Text variant="screenTitle">{heading}</Text>
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
                renderItem={({ item }) => (
                  <ListRow
                    title={item.title}
                    subtitle={item.subtitle}
                    note={item.note}
                    onPress={item.onPress}
                  />
                )}
                ItemSeparatorComponent={Separator}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.list}
                ListFooterComponent={
                  footer ? (
                    <Text
                      variant="hint"
                      style={[styles.footer, { textAlign: rtl ? 'right' : 'left' }]}
                    >
                      {footer}
                    </Text>
                  ) : null
                }
              />
            )}
          </>
        )
      ) : null}
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  head: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  list: {
    paddingBottom: Spacing.six,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
});
