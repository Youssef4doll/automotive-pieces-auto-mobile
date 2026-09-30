import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { PRODUCT_SORTS, type ProductSort } from '@/api/catalogue';
import { Border, Brand, C, familyFor, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { BottomSheet } from './bottom-sheet';
import { Text } from './text';

/** What each order is called, and — where the name alone does not say — why it is that order. */
const WHY: Partial<Record<ProductSort, DictKey>> = {
  relevance: 'catalog.sort.relevanceWhy',
  newest: 'catalog.sort.newestWhy',
  popular: 'catalog.sort.popularWhy',
};

export function sortLabel(sort: ProductSort): DictKey {
  return `catalog.sort.${sort}` as DictKey;
}

/**
 * The chip that opens the sort: it names the order the list is in now
 * ("Trier : Prix croissant"), so a customer never has to guess why the
 * cheapest part is last. It replaced a chip that cycled through three
 * orders on each tap, which nobody discovered past the first.
 */
export function SortChip({ sort, onPress }: { sort: ProductSort; onPress: () => void }) {
  const { t, rtl } = useI18n();
  const changed = sort !== 'relevance';
  const label = changed ? t('catalog.sortChip', { label: t(sortLabel(sort)) }) : t('catalog.sortDefault');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('catalog.sortChip', { label: t(sortLabel(sort)) })}
      accessibilityHint={t('catalog.sortTitle')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        changed && styles.chipOn,
        pressed && !changed && styles.chipPressed,
      ]}
    >
      <Feather name="bar-chart-2" size={IconSize.small} color={changed ? Brand.white : C.text} style={styles.sortIcon} />
      <Text variant="hint" tone={changed ? Brand.white : C.text} numberOfLines={1}>
        {label}
      </Text>
      <Feather name="chevron-down" size={IconSize.small} color={changed ? Brand.white : C.textMuted} />
    </Pressable>
  );
}

/** The five orders the shop can give, as radio rows in a sheet. Choosing one closes it. */
export function SortSheet({
  visible,
  sort,
  onChoose,
  onClose,
}: {
  visible: boolean;
  sort: ProductSort;
  onChoose: (sort: ProductSort) => void;
  onClose: () => void;
}) {
  const { t, rtl } = useI18n();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('catalog.sortTitle')}>
      <View accessibilityRole="radiogroup">
        {PRODUCT_SORTS.map((option, i) => {
          const on = option === sort;
          const why = WHY[option];
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => {
                onChoose(option);
                onClose();
              }}
              style={({ pressed }) => [
                styles.option,
                { flexDirection: rtl ? 'row-reverse' : 'row' },
                i < PRODUCT_SORTS.length - 1 && styles.rule,
                pressed && styles.optionPressed,
              ]}
            >
              <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.optionLabel, { fontFamily: familyFor(on ? 'bodySemi' : 'body', rtl) }]}>{t(sortLabel(option))}</Text>
                {why ? <Text variant="hint">{t(why)}</Text> : null}
              </View>
              <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.dot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: Tap.min,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.chip,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  chipOn: { backgroundColor: Brand.navy900, borderColor: Brand.navy900 },
  chipPressed: { backgroundColor: C.surface },
  sortIcon: { transform: [{ rotate: '90deg' }] },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  option: { alignItems: 'center', gap: Spacing.three, minHeight: 56, paddingVertical: Spacing.two },
  optionPressed: { backgroundColor: C.surface },
  optionLabel: { fontSize: 16, lineHeight: 22, color: C.text },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: Brand.navy900 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Brand.navy900 },
});
