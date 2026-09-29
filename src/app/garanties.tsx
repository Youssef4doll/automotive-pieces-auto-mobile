import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import type { ShopSettings } from '@/api/shop';
import { Button } from '@/components/ui/button';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { API_BASE_URL } from '@/constants/config';
import { Brand, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useI18n } from '@/i18n/provider';

/**
 * "Retours et garantie" — the shop's commitments, before anyone needs them.
 *
 * The same three rules as the website's "Livraison et retours" page, with
 * the shop's own figures from its settings: the 14-day return and its
 * conditions, the shop's errors at its charge (and the 48 hours to say so),
 * the 12-month warranty and what it does not cover. Then how to ask, which
 * is the order screen's "Retourner une pièce". Opened from the product page's
 * guarantee tiles and from every order.
 */
export default function GuaranteeScreen() {
  const { t } = useI18n();
  const settings = useShopSettings();
  return (
    <>
      <Stack.Screen options={{ title: t('guarantee.title') }} />
      {settings.status === 'loading' ? (
        <Loading />
      ) : settings.status === 'failed' ? (
        <Failed failure={settings.failure} onRetry={settings.retry} />
      ) : (
        <Guarantee settings={settings.data} />
      )}
    </>
  );
}

function Guarantee({ settings }: { settings: ShopSettings }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const hours = settings.shopErrorHours ?? null;

  const rules: { icon: React.ComponentProps<typeof Feather>['name']; title: string; body: string; ours?: boolean }[] = [
    { icon: 'rotate-ccw', title: t('guarantee.return.title', { n: settings.returnDays }), body: t('guarantee.return.body') },
    // The 48 hours come from the shop; an older shop that does not send them gets no card rather than a guessed figure.
    ...(hours ? [{ icon: 'shield' as const, title: t('guarantee.ours.title'), body: t('guarantee.ours.body', { h: hours }), ours: true }] : []),
    { icon: 'award', title: t('guarantee.warranty.title', { n: settings.warrantyMonths }), body: t('guarantee.warranty.body') },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.column}>
        <Text variant="body" style={align}>
          {t('guarantee.lead')}
        </Text>

        {rules.map((r) => (
          <View key={r.title} style={[styles.rule, row, r.ours && styles.ruleOurs]}>
            <View style={[styles.icon, r.ours && styles.iconOurs]}>
              <Feather name={r.icon} size={IconSize.medium} color={r.ours ? Brand.white : C.text} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.ruleTitle, { fontFamily: familyFor('heading', rtl) }, align]}>{r.title}</Text>
              <Text variant="body" style={align}>
                {r.body}
              </Text>
            </View>
          </View>
        ))}

        <Text style={[styles.how, { fontFamily: familyFor('heading', rtl) }, align]}>{t('guarantee.how')}</Text>
        {(['guarantee.how1', 'guarantee.how2', 'guarantee.how3'] as const).map((key, i) => (
          <View key={key} style={[row, styles.step]}>
            <View style={styles.num}>
              <Text style={[styles.numText, { fontFamily: familyFor('headingStrong', rtl) }]}>{i + 1}</Text>
            </View>
            <Text variant="body" tone={C.text} style={[styles.flex, align]}>
              {t(key)}
            </Text>
          </View>
        ))}
        <Button label={t('guarantee.orders')} icon="package" onPress={() => router.push('/compte/commandes')} />

        <View style={[row, styles.tip]}>
          <Feather name="info" size={18} color={C.text} />
          <Text variant="body" tone={C.text} style={[styles.flex, align]}>
            {t('guarantee.avoid')}
          </Text>
        </View>

        <Button
          label={t('guarantee.full')}
          icon="external-link"
          variant="secondary"
          onPress={() => void Linking.openURL(`${API_BASE_URL}/livraison-retours#retours`).catch(() => undefined)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.three },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  rule: { alignItems: 'flex-start', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: C.surface },
  ruleOurs: { backgroundColor: C.successSurface },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
  iconOurs: { backgroundColor: C.success },
  ruleTitle: { fontSize: 17, lineHeight: 22, color: C.text },
  how: { fontSize: 19, lineHeight: 24, color: C.text, marginTop: Spacing.two },
  step: { alignItems: 'flex-start', gap: Spacing.three },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.surfaceBrand, alignItems: 'center', justifyContent: 'center' },
  numText: { color: Brand.white, fontSize: 14, lineHeight: 18 },
  tip: { alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.tile, borderWidth: 1, borderColor: C.border },
});
