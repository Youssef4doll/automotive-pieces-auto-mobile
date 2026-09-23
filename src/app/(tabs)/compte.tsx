import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, familyFor, IconSize, MaxContentWidth, Spacing, Tap } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { NavCar } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useCheckout } from '@/store/checkout';
import { useGarage } from '@/store/garage';
import { useOrders } from '@/store/orders';
import { useStaff } from '@/store/staff';
import { useToast } from '@/store/toast';

/**
 * Mon compte — the reference's list, row for row.
 *
 * The profile at the top is whoever the customer told the checkout they are,
 * remembered on this phone; with nothing remembered it says "Invité". There
 * is no sign-in in the app yet, so there is no password and no "Se
 * déconnecter" from an account nobody opened: the red line at the foot is
 * what a guest can actually do — forget the details this phone keeps.
 *
 * Every row opens something real: the orders placed or recovered here, the
 * active car, the garage, the saved delivery address, the shop's contact
 * details (as far as the owner has published them), and the settings.
 */
export default function AccountScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const orders = useOrders((s) => s.orders);
  const vehicles = useGarage((s) => s.vehicles);
  const active = useGarage((s) => s.active);
  const details = useCheckout((s) => s.details);
  const forget = useCheckout((s) => s.forget);
  const toast = useToast((s) => s.show);
  const settings = useShopSettings();
  const [confirming, setConfirming] = useState(false);
  const staffSignedIn = useStaff((s) => s.status === 'signedIn');
  const restoreStaff = useStaff((s) => s.restore);
  // Only asks the shop when a staff token is saved on this phone.
  useEffect(() => {
    restoreStaff();
  }, [restoreStaff]);

  const name = details.customerName.trim();
  const contactLine = details.email.trim() || details.phone.trim();
  const hasDetails = Boolean(name || details.phone || details.address);
  const initials = name
    ? name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
    : null;
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.column}>
        <View style={[styles.profile, row]}>
          <View style={styles.avatar}>
            {initials ? (
              <Text style={{ fontFamily: familyFor('headingStrong', false), fontSize: 20, color: Brand.white }}>{initials}</Text>
            ) : (
              <Feather name="user" size={26} color={Brand.white} />
            )}
          </View>
          <View style={styles.flex}>
            <Text style={[styles.name, { fontFamily: familyFor('heading', rtl) }]}>{name || t('account.guestName')}</Text>
            <Text variant="hint" numberOfLines={1}>
              {contactLine || t('account.guestWhy')}
            </Text>
          </View>
        </View>

        <View style={styles.list}>
          <Row icon="file-text" label={t('account.orders')} value={orders.length ? String(orders.length) : null} onPress={() => router.push('/compte/commandes')} />
          <Row
            icon="car"
            label={t('account.myVehicle')}
            value={active ? `${active.makeName} ${active.modelName}` : t('account.noVehicle')}
            onPress={() => router.navigate('/garage')}
          />
          <Row icon="layers" label={t('account.vehicles')} value={vehicles.length ? String(vehicles.length) : null} onPress={() => router.navigate('/garage')} />
          <Row icon="map-pin" label={t('account.addresses')} onPress={() => router.push('/compte/adresses')} />
          <Row icon="help-circle" label={t('account.helpContact')} onPress={() => router.push('/aide')} />
          <Row icon="settings" label={t('account.settings')} onPress={() => router.push('/compte/parametres')} last />
        </View>

        {/* The shop's own door, kept apart from the customer's rows and
            quiet: most people holding this app will never use it, and the
            ones who do know it is here. Behind it is a real sign-in, checked
            by the shop on every request — the row itself grants nothing. */}
        <View style={styles.staff}>
          <Row
            icon="briefcase"
            label={t('staff.entry')}
            value={staffSignedIn ? t('staff.connected') : t('staff.entryHint')}
            onPress={() => router.push('/gestion')}
            last
          />
        </View>

        {hasDetails ? (
          <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.danger}>
            <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 15, color: C.danger, textAlign: 'center' }}>
              {t('account.clearData')}
            </Text>
          </Pressable>
        ) : null}

        {settings.status === 'loaded' ? (
          <Text variant="hint" tone={C.textFaint} style={styles.policies}>
            {t('account.policies', { m: settings.data.warrantyMonths, d: settings.data.returnDays })}
          </Text>
        ) : null}
      </View>

      <BottomSheet visible={confirming} onClose={() => setConfirming(false)} title={t('account.clearData')}>
        <View style={styles.sheet}>
          <Text variant="body">{t('account.clearConfirm')}</Text>
          <Button
            label={t('account.clearData')}
            variant="danger"
            onPress={() => {
              forget();
              setConfirming(false);
              toast({ message: t('account.forgetDetailsDone'), tone: 'neutral' });
            }}
          />
          <Button label={t('garage.cancel')} variant="secondary" onPress={() => setConfirming(false)} />
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  last = false,
}: {
  icon: React.ComponentProps<typeof Feather>['name'] | 'car';
  label: string;
  value?: string | null;
  onPress: () => void;
  last?: boolean;
}) {
  const { rtl } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        !last && styles.rowRule,
        pressed && styles.pressed,
      ]}
    >
      {icon === 'car' ? <NavCar size={IconSize.large} color={C.text} /> : <Feather name={icon} size={IconSize.large} color={C.text} />}
      <Text variant="body" tone={C.text} style={styles.flex}>
        {label}
      </Text>
      {value ? (
        <Text variant="hint" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  flex: { flex: 1 },
  profile: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Brand.navy700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 19, lineHeight: 25, color: C.text },
  list: { marginTop: Spacing.two },
  staff: { marginTop: Spacing.four, borderTopWidth: Border.hairline, borderTopColor: C.border },
  row: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.primary + Spacing.two },
  rowRule: { borderBottomWidth: Border.hairline, borderBottomColor: C.border },
  pressed: { backgroundColor: C.surface },
  value: { maxWidth: '40%' },
  danger: { marginTop: Spacing.four, minHeight: Tap.min, justifyContent: 'center' },
  policies: { textAlign: 'center', paddingTop: Spacing.four },
  sheet: { gap: Spacing.three, paddingBottom: Spacing.two },
});
