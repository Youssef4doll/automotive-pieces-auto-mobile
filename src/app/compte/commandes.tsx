import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Border, C, IconSize, MaxContentWidth, Spacing, Tap } from '@/constants/theme';
import { formatDate, formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useOrders } from '@/store/orders';

/** Mes commandes — the orders placed on, or recovered to, this phone. */
export default function OrdersScreen() {
  const { t, locale, rtl } = useI18n();
  const router = useRouter();
  const orders = useOrders((s) => s.orders);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: t('account.orders') }} />
      <View style={styles.column}>
        {orders.length === 0 ? <Text variant="hint">{t('account.noOrders')}</Text> : null}
        {orders.map((o) => (
          <Pressable
            key={o.ref}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/suivi/[ref]', params: { ref: o.ref } })}
            style={({ pressed }) => [styles.row, row, pressed && styles.pressed]}
          >
            <Feather name="package" size={IconSize.large} color={C.text} />
            <View style={styles.flex}>
              <Text variant="rowTitle">{o.ref}</Text>
              <Text variant="hint">{`${formatDate(o.placedAt, locale)} · ${t('done.items', { n: o.itemCount })}`}</Text>
            </View>
            <Text variant="body" tone={C.text}>
              {formatDT(o.total)}
            </Text>
            <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/compte/retrouver')}
          style={({ pressed }) => [styles.row, row, pressed && styles.pressed]}
        >
          <Feather name="search" size={IconSize.large} color={C.text} />
          <View style={styles.flex}>
            <Text variant="body" tone={C.text}>
              {t('account.find')}
            </Text>
            <Text variant="hint">{t('account.findWhy')}</Text>
          </View>
          <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  flex: { flex: 1, gap: 2 },
  row: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.primary + Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: Border.hairline,
    borderBottomColor: C.border,
  },
  pressed: { backgroundColor: C.surface },
});
