import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { staffApi, type MessageRow } from '@/api/staff';
import { FilterChips, staffStyles, Tag } from '@/components/staff/kit';
import { Empty, Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, IconSize, Radius, Spacing } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useI18n } from '@/i18n/provider';
import { formatDate } from '@/lib/format';

const FILTERS = ['new', 'all'] as const;
type Tab = (typeof FILTERS)[number];

/**
 * The shop's inbox on a phone — the website's /admin/messages: questions
 * asked from the app ("Demander à la boutique"), photos of parts to
 * identify, and the website's contact form. Waiting ones first.
 */
export default function StaffMessages() {
  const { t } = useI18n();
  const router = useRouter();
  const [filter, setFilter] = useState<Tab>('new');
  const load = useCallback((signal: AbortSignal) => staffApi.messages(filter, signal), [filter]);
  const list = useLive(load);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <View style={staffStyles.root}>
      <Stack.Screen options={{ title: t('staff.menu.messages') }} />
      <View style={styles.head}>
        <FilterChips options={FILTERS.map((f) => ({ key: f, label: t(f === 'new' ? 'staff.msg.new' : 'staff.msg.all') }))} value={filter} onChange={setFilter} />
      </View>
      {list.status === 'loading' ? (
        <Loading />
      ) : list.status === 'failed' ? (
        <Failed failure={list.failure} onRetry={list.retry} />
      ) : list.data.messages.length === 0 ? (
        <Empty title={t(filter === 'new' ? 'staff.msg.empty' : 'staff.msg.emptyAll')} />
      ) : (
        <FlatList
          data={list.data.messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await list.refresh();
                setRefreshing(false);
              }}
            />
          }
          renderItem={({ item }) => <MessageCard item={item} onPress={() => router.push({ pathname: '/gestion/messages/[id]', params: { id: item.id } })} />}
        />
      )}
    </View>
  );
}

function MessageCard({ item, onPress }: { item: MessageRow; onPress: () => void }) {
  const { t, rtl, locale } = useI18n();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const waiting = item.status === 'NEW';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.subject}, ${item.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, waiting && styles.waiting, pressed && styles.pressed]}
      testID="staff-message"
    >
      <View style={[row, styles.top]}>
        <Text variant="rowTitle" numberOfLines={1} style={[styles.flex, align]}>
          {item.subject}
        </Text>
        {item.replied ? <Tag label={t('staff.msg.replied')} tone="muted" /> : waiting ? <Tag label={t('staff.msg.new')} /> : null}
      </View>
      <Text variant="body" tone={C.text} numberOfLines={2} style={align}>
        {item.excerpt}
      </Text>
      <View style={[row, styles.meta]}>
        <Feather name={item.inApp ? 'smartphone' : 'globe'} size={IconSize.small} color={C.textMuted} />
        <Text variant="hint" numberOfLines={1} style={[styles.flex, align]}>
          {[item.name, item.phone, formatDate(item.createdAt, locale, true), item.photoCount ? t('staff.msg.photos', { n: item.photoCount }) : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  list: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { gap: 6, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: C.background, borderWidth: Border.hairline, borderColor: C.border },
  waiting: { borderColor: Brand.gold500, borderWidth: 1.5 },
  pressed: { backgroundColor: C.surfacePressed },
  top: { alignItems: 'center', gap: Spacing.two },
  meta: { alignItems: 'center', gap: Spacing.one },
  flex: { flex: 1, minWidth: 0 },
});
