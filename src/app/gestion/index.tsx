import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { staffApi, type Dashboard } from '@/api/staff';
import { Card, MenuRow, StatusPill, staffStyles } from '@/components/staff/kit';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, Spacing, Tap } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useI18n } from '@/i18n/provider';
import { formatDT } from '@/lib/format';
import { useStaff } from '@/store/staff';
import { useToast } from '@/store/toast';

/**
 * The morning glance. Three counted periods, what is waiting to be done —
 * each line a door to the list it counts — and the way into every other
 * staff screen. Nothing here is a trend line or a forecast: the shop has the
 * orders it has, and that is what is printed.
 */
export default function StaffHome() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const signOut = useStaff((s) => s.signOut);
  const toast = useToast((s) => s.show);
  const load = useCallback((signal: AbortSignal) => staffApi.dashboard(signal), []);
  const dash = useLive(load);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <>
      <Stack.Screen options={{ title: t('staff.entry') }} />
      {dash.status === 'loading' ? (
        <Loading />
      ) : dash.status === 'failed' ? (
        <Failed failure={dash.failure} onRetry={dash.retry} />
      ) : (
        <ScrollView
          style={staffStyles.root}
          contentContainerStyle={staffStyles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await dash.refresh();
                setRefreshing(false);
              }}
            />
          }
        >
          <Text variant="screenTitle">{t('staff.hello', { name: dash.data.admin.name })}</Text>
          <Periods data={dash.data} />

          <Card>
            <Text variant="label" tone={C.textMuted}>
              {t('staff.todo')}
            </Text>
            {dash.data.pendingCount + dash.data.outOfStock + dash.data.lowStockCount === 0 ? (
              <Text variant="body">{t('staff.allClear')}</Text>
            ) : null}
            {dash.data.pendingCount > 0 ? (
              <MenuRow
                icon="clock"
                label={t('staff.pendingN', { n: dash.data.pendingCount })}
                onPress={() => router.push({ pathname: '/gestion/commandes', params: { status: 'PENDING' } })}
              />
            ) : null}
            {dash.data.outOfStock > 0 ? (
              <MenuRow
                icon="alert-octagon"
                tone={C.danger}
                label={t('staff.outN', { n: dash.data.outOfStock })}
                onPress={() => router.push({ pathname: '/gestion/stock', params: { f: 'rupture' } })}
              />
            ) : null}
            {dash.data.lowStockCount > 0 ? (
              <MenuRow
                icon="alert-triangle"
                label={t('staff.lowN', { n: dash.data.lowStockCount })}
                onPress={() => router.push({ pathname: '/gestion/stock', params: { f: 'bas' } })}
              />
            ) : null}
          </Card>

          <Card>
            <MenuRow icon="file-text" label={t('staff.menu.orders')} onPress={() => router.push('/gestion/commandes')} />
            <MenuRow icon="package" label={t('staff.menu.stock')} onPress={() => router.push('/gestion/stock')} />
            <MenuRow icon="image" label={t('staff.menu.families')} onPress={() => router.push('/gestion/familles')} />
            <MenuRow icon="settings" label={t('staff.menu.settings')} onPress={() => router.push('/gestion/boutique')} />
          </Card>

          {dash.data.recentOrders.length ? (
            <Card>
              <Text variant="label" tone={C.textMuted}>
                {t('staff.recent')}
              </Text>
              {dash.data.recentOrders.map((o) => (
                <Pressable
                  key={o.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.ref}, ${o.customerName}, ${t(`status.${o.status}`)}`}
                  onPress={() => router.push({ pathname: '/gestion/commandes/[id]', params: { id: o.id } })}
                  style={({ pressed }) => [styles.order, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
                >
                  <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
                    <Text variant="rowTitle" style={styles.mono}>
                      {o.ref}
                    </Text>
                    <Text variant="hint" numberOfLines={1}>
                      {o.customerName}
                    </Text>
                  </View>
                  <View style={{ alignItems: rtl ? 'flex-start' : 'flex-end', gap: 4 }}>
                    <Text variant="rowTitle">{formatDT(o.total)}</Text>
                    <StatusPill status={o.status} />
                  </View>
                </Pressable>
              ))}
            </Card>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await signOut();
              toast({ message: t('staff.signedOut'), tone: 'neutral' });
              // Back to Mon compte, the door this area is reached from; if the
              // staff area was opened directly there is nothing to pop, and
              // dismissTo replaces instead.
              router.dismissTo('/compte');
            }}
            style={styles.signOut}
          >
            <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 15, color: C.danger, textAlign: 'center' }}>
              {t('staff.signOut')}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}

function Periods({ data }: { data: Dashboard }) {
  const { t, rtl } = useI18n();
  const rows = [
    { label: t('staff.today'), ...data.periods.today },
    { label: t('staff.week'), ...data.periods.week },
    { label: t('staff.month'), ...data.periods.month },
  ];
  // One row per period rather than three tiles side by side: a four-figure
  // amount in dinars does not fit a third of a 320pt screen, and a total that
  // ends in "…" is a number the owner cannot read.
  return (
    <View style={staffStyles.gap}>
      <View style={styles.periods}>
        {rows.map((p, i) => (
          <View key={p.label} style={[styles.period, { flexDirection: rtl ? 'row-reverse' : 'row' }, i > 0 && styles.periodRule]}>
            <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
              <Text variant="body" tone={Brand.white}>
                {p.label}
              </Text>
              <Text variant="hint" tone={Brand.gold400}>
                {t('staff.ordersN', { n: p.orders })}
              </Text>
            </View>
            <Text style={{ fontFamily: familyFor('headingStrong', false), fontSize: 22, lineHeight: 28, color: Brand.white }}>
              {formatDT(p.revenue)}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="hint" tone={C.textMuted}>
        {t('staff.periodsWhy')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  periods: { backgroundColor: Brand.navy900, borderRadius: 18, paddingHorizontal: Spacing.three },
  period: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  periodRule: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  order: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.primary + Spacing.two, paddingVertical: Spacing.one },
  mono: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.6 },
  signOut: { minHeight: Tap.min, justifyContent: 'center' },
});
