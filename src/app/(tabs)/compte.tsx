import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { ShopSettings } from '@/api/shop';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Border, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { NavCar } from '@/illustrations/vehicle';
import { formatDate, formatDT } from '@/lib/format';
import { localeMeta, locales } from '@/i18n/locales';
import { useI18n } from '@/i18n/provider';
import { useCheckout } from '@/store/checkout';
import { useGarage } from '@/store/garage';
import { useOrders } from '@/store/orders';
import { useToast } from '@/store/toast';

/**
 * Compte.
 *
 * There is no sign-in in the app yet, and this screen does not pretend there
 * is: no avatar, no "Bonjour Youssef", no "Se déconnecter" from an account
 * nobody opened. It says plainly that the customer is shopping without an
 * account and that their orders, basket and garage live on this phone — and
 * then it is useful anyway: the orders placed here, a way to recover one
 * placed elsewhere, the garage, the shop's contact details, the language.
 *
 * The contact rows are the shop's own and appear one by one as the owner
 * fills them in. Production has none of them yet — every one is a
 * placeholder — so today the section says the details are not published,
 * rather than printing "+216 00 000 000" or hiding the section so the
 * customer wonders where it went.
 *
 * The language switcher lives here now. It used to sit at the bottom of the
 * home screen, which is a discovery surface, and a setting there was one
 * more thing between the customer and the parts.
 */
export default function AccountScreen() {
  const { t, locale, setLocale, needsRestartForRTL, rtl } = useI18n();
  const router = useRouter();
  const orders = useOrders((s) => s.orders);
  const vehicles = useGarage((s) => s.vehicles);
  const details = useCheckout((s) => s.details);
  const forgetDetails = useCheckout((s) => s.forget);
  const toast = useToast((s) => s.show);
  const settings = useShopSettings();
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const hasSavedDetails = Boolean(details.customerName || details.phone || details.address);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.column}>
        <View style={[styles.guest, row]}>
          <View style={styles.avatar}>
            <Feather name="user" size={IconSize.feature} color={C.text} />
          </View>
          <View style={styles.flex}>
            <Text variant="rowTitle">{t('account.guest')}</Text>
            <Text variant="hint">{t('account.guestWhy')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('account.orders')} />
          {orders.length === 0 ? (
            <Text variant="hint" style={styles.pad}>
              {t('account.noOrders')}
            </Text>
          ) : (
            <View style={styles.group}>
              {orders.map((o) => (
                <Row
                  key={o.ref}
                  icon="package"
                  title={o.ref}
                  subtitle={`${formatDate(o.placedAt, locale)} · ${t('done.items', { n: o.itemCount })} · ${formatDT(o.total)}`}
                  onPress={() => router.push({ pathname: '/suivi/[ref]', params: { ref: o.ref } })}
                />
              ))}
            </View>
          )}
          <View style={styles.group}>
            <Row icon="search" title={t('account.find')} subtitle={t('account.findWhy')} onPress={() => router.push('/compte/retrouver')} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('account.vehicles')} />
          <View style={styles.group}>
            <Row
              icon="car"
              title={t('garage.title')}
              subtitle={vehicles.length ? t('garage.count', { n: vehicles.length }) : t('garage.empty')}
              onPress={() => router.navigate('/garage')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('account.help')} />
          {settings.status === 'loaded' ? <Help settings={settings.data} /> : null}
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('account.settings')} />
          <Text variant="label" style={styles.pad}>
            {t('lang.title')}
          </Text>
          <View style={[styles.langRow, row]}>
            {locales.map((code) => (
              <Pressable
                key={code}
                accessibilityRole="button"
                accessibilityState={{ selected: code === locale }}
                onPress={() => setLocale(code)}
                style={({ pressed }) => [styles.lang, code === locale && styles.langActive, pressed && code !== locale && styles.langPressed]}
              >
                <Text style={{ ...Type.hint, fontFamily: familyFor('display', rtl), color: code === locale ? C.onAccent : C.text }}>
                  {localeMeta[code].label}
                </Text>
              </Pressable>
            ))}
          </View>
          {needsRestartForRTL ? (
            <Text variant="hint" style={styles.pad}>
              {t('lang.rtlRestart')}
            </Text>
          ) : null}

          {hasSavedDetails ? (
            <View style={[styles.group, styles.spaced]}>
              <Row
                icon="trash-2"
                title={t('account.forgetDetails')}
                subtitle={t('account.forgetDetailsWhy')}
                onPress={() => {
                  forgetDetails();
                  toast({ message: t('account.forgetDetailsDone'), tone: 'neutral' });
                }}
              />
            </View>
          ) : null}
        </View>

        {settings.status === 'loaded' ? (
          <Text variant="hint" style={[styles.pad, styles.footer]}>
            {t('account.policies', { m: settings.data.warrantyMonths, d: settings.data.returnDays })}
          </Text>
        ) : null}
        <Text variant="hint" tone={C.textFaint} style={styles.pad}>
          {`${t('app.name')} · ${Constants.expoConfig?.version ?? ''}`}
        </Text>
      </View>
    </ScrollView>
  );
}

/**
 * The shop's channels, one row per channel it has actually published.
 *
 * `wa.me` with the digits only, `tel:` and `mailto:` — the platform's own
 * handlers, so a tap opens WhatsApp or the dialler the customer already
 * uses. Nothing is shown for a channel the owner has not filled in.
 */
function Help({ settings }: { settings: ShopSettings }) {
  const { t } = useI18n();
  const c = settings.contact;
  const channels = [
    c.whatsapp && { icon: 'message-circle' as const, title: t('account.whatsapp'), subtitle: c.whatsapp, url: `https://wa.me/${c.whatsapp.replace(/\D/g, '')}` },
    c.phone && { icon: 'phone' as const, title: t('account.call'), subtitle: c.phone, url: `tel:${c.phone.replace(/[^\d+]/g, '')}` },
    c.email && { icon: 'mail' as const, title: t('account.mail'), subtitle: c.email, url: `mailto:${c.email}` },
  ].filter(Boolean) as { icon: React.ComponentProps<typeof Feather>['name']; title: string; subtitle: string; url: string }[];

  return (
    <View style={styles.group}>
      {channels.map((ch) => (
        <Row key={ch.url} icon={ch.icon} title={ch.title} subtitle={ch.subtitle} onPress={() => Linking.openURL(ch.url).catch(() => undefined)} />
      ))}
      {c.address ? <Row icon="map-pin" title={t('account.shopAddress')} subtitle={c.address} /> : null}
      {c.hours ? <Row icon="clock" title={t('account.hours')} subtitle={c.hours} /> : null}
      {channels.length === 0 ? (
        <Text variant="hint" style={styles.note}>
          {t('account.noContact')}
        </Text>
      ) : null}
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onPress,
}: {
  /** A Feather glyph, or "car" for the app's own car — Feather has none. */
  icon: React.ComponentProps<typeof Feather>['name'] | 'car';
  title: string;
  subtitle?: string | null;
  onPress?: () => void;
}) {
  const { rtl } = useI18n();
  const content = (
    <>
      <View style={styles.rowIcon}>
        {icon === 'car' ? <NavCar size={IconSize.medium} color={C.text} /> : <Feather name={icon} size={IconSize.medium} color={C.text} />}
      </View>
      <View style={styles.flex}>
        <Text variant="body" tone={C.text}>
          {title}
        </Text>
        {subtitle ? <Text variant="hint">{subtitle}</Text> : null}
      </View>
      {onPress ? <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} /> : null}
    </>
  );
  const style = [styles.row, { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) }];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [...style, pressed && styles.pressed]}>
      {content}
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
    padding: Spacing.three,
    gap: Spacing.two,
  },
  flex: { flex: 1, gap: 2 },
  pad: { paddingHorizontal: Spacing.one },
  guest: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  group: {
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    overflow: 'hidden',
  },
  spaced: { marginTop: Spacing.three },
  row: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.primary + Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: Border.hairline,
    borderBottomColor: C.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: C.surface },
  langRow: { gap: Spacing.two, flexWrap: 'wrap' },
  lang: {
    minHeight: Tap.min,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.chip,
    backgroundColor: C.surface,
  },
  langActive: { backgroundColor: C.accent },
  langPressed: { backgroundColor: C.surfacePressed },
  footer: { paddingTop: Spacing.four },
  note: { padding: Spacing.three },
});
