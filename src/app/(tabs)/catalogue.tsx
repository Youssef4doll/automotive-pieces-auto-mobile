import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { catalogueApi, type Family } from '@/api/catalogue';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, C, IconSize, Radius, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { PartBadge } from '@/components/ui/part-badge';
import { useI18n } from '@/i18n/provider';

/**
 * The catalogue's top level — every family the shop actually stocks.
 *
 * A directory, read the way a service list is read: the drawing identifies
 * the family faster than its name does, especially for a customer who knows
 * what a brake disc looks like but has never used the word "freinage".
 *
 * Every family here holds at least one part. The API filters the empty
 * branches out and the reasoning is on the route handler: the taxonomy
 * describes the whole trade and the catalogue is younger than that, so
 * showing every branch sent most taps to an empty page. Families reappear on
 * their own as stock arrives.
 */
export default function CatalogueScreen() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const tabBarSpace = useTabBarSpace();

  const load = useCallback((signal: AbortSignal) => catalogueApi.families(signal), []);
  const families = useResource(load);

  if (families.status === 'loading') {
    return (
      <Screen edges={['left', 'right']}>
        <View style={styles.list}>
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} style={styles.rowSkeleton} />
          ))}
        </View>
      </Screen>
    );
  }

  if (families.status === 'failed') {
    return (
      <Screen edges={['left', 'right']}>
        <Failed failure={families.failure} onRetry={families.retry} />
      </Screen>
    );
  }

  if (families.data.length === 0) {
    return (
      <Screen edges={['left', 'right']}>
        <Empty title={t('catalog.noFamilies')} body={t('catalog.emptyWhy')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right']}>
      <FlatList
        data={families.data}
        keyExtractor={(family) => family.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarSpace }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <FamilyRow
            family={item}
            rtl={rtl}
            partCount={t('catalog.partCount', { n: item.productCount })}
            onPress={() =>
              router.push({
                pathname: '/famille/[family]',
                params: { family: item.slug, familyName: item.name },
              })
            }
          />
        )}
      />
    </Screen>
  );
}

function FamilyRow({
  family,
  partCount,
  rtl,
  onPress,
}: {
  family: Family;
  partCount: string;
  rtl: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${family.name}, ${partCount}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        pressed && styles.pressed,
      ]}
    >
      <PartBadge slug={family.slug} size={48} />

      <View style={styles.text}>
        <Text variant="rowTitle" numberOfLines={2}>
          {family.name}
        </Text>
        <Text variant="hint" numberOfLines={1}>
          {partCount}
        </Text>
      </View>

      <Feather
        name={rtl ? 'chevron-left' : 'chevron-right'}
        size={IconSize.large}
        color={C.textFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    minHeight: 68,
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
  },
  pressed: { backgroundColor: C.surface },
  text: { flex: 1, gap: 1 },
  rowSkeleton: { height: 68, borderRadius: Radius.card },
});
