import { Feather, FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { whatsappUrl } from '@/components/ui/shop-contact';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, Elevation, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useSvgId } from '@/hooks/use-svg-id';
import { PhotoAdviceArt } from '@/illustrations/ways-art';
import { useI18n } from '@/i18n/provider';
import { ltr } from '@/lib/format';
import { track } from '@/services/analytics';
import { useGarage, vehicleLabel } from '@/store/garage';
import { useQuestions } from '@/store/questions';

/**
 * Aide & contact — every way to reach the shop, the one that always works
 * first.
 *
 * A navy band asks the question and holds the answer that always works:
 * "Poser une question" goes to the shop's own inbox from the app (/demande)
 * and comes back answered there. Under it, grouped rows as a settings page
 * draws them: what the app does (a photo of the part, the questions already
 * asked), then the shop's own channels — WhatsApp, the phone, e-mail — each
 * with the number or address it dials, and each only once the shop has
 * filled it in (Espace boutique → Paramètres), never a placeholder that
 * rings nobody. Last, the hours and the address, when the shop gave them.
 * The WhatsApp message is written in advance, with the car from the garage:
 * the first thing the counter would ask.
 */
export default function HelpScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const settings = useShopSettings();
  const active = useGarage((s) => s.active);
  const asked = useQuestions((s) => s.questions.length);
  const gradient = useSvgId('help');
  const c = settings.status === 'loaded' ? settings.data.contact : null;
  const address = c?.address ?? (settings.status === 'loaded' ? (settings.data.pickup?.address ?? null) : null);
  const vehicle = vehicleLabel(active);
  const message = vehicle ? t('help.messageVehicle', { vehicle }) : t('help.message');
  const open = (url: string) => Linking.openURL(url).catch(() => undefined);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const channels = Boolean(c && (c.whatsapp || c.phone || c.email));
  // A narrow phone gives the question the band's whole width.
  const roomForArt = useWindowDimensions().width >= 380;

  return (
    <>
      <Stack.Screen options={{ title: t('account.help') }} />
      <ScrollView contentContainerStyle={styles.scroll} style={styles.root}>
        <View style={styles.column}>
          <View style={styles.hero}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 340 220" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id={gradient} x1={rtl ? '1' : '0'} y1="0" x2={rtl ? '0' : '1'} y2="1">
                  <Stop offset="0" stopColor={Brand.navy700} />
                  <Stop offset="1" stopColor={Brand.navy950} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={340} height={220} fill={`url(#${gradient})`} />
            </Svg>
            <View style={[row, styles.heroTop]}>
              <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.heroTitle, align, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('help.heroTitle')}</Text>
                <Text style={[styles.heroLead, align, { fontFamily: familyFor('body', rtl) }]}>{t('help.heroLead')}</Text>
              </View>
              {roomForArt ? (
                <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <PhotoAdviceArt width={84} />
                </View>
              ) : null}
            </View>
            <Button label={t('help.ask')} icon="message-square" onPress={() => router.push('/demande')} testID="help-ask" />
          </View>

          <Section title={t('help.inApp')}>
            <HelpRow
              icon={<Feather name="camera" size={19} color={Brand.navy900} />}
              title={t('help.photo')}
              detail={t('help.lead')}
              onPress={() => router.push({ pathname: '/demande', params: { photo: '1' } })}
              last={!asked}
            />
            {asked ? (
              <HelpRow
                icon={<Feather name="inbox" size={19} color={Brand.navy900} />}
                title={t('help.myQuestions')}
                detail={String(asked)}
                onPress={() => router.push('/compte/questions')}
                last
              />
            ) : null}
          </Section>

          {channels && c ? (
            <Section title={t('help.reachShop')}>
              {c.whatsapp ? (
                <HelpRow
                  icon={<FontAwesome name="whatsapp" size={21} color={Brand.white} />}
                  iconStyle={styles.iconWhatsapp}
                  title={t('help.whatsapp')}
                  detail={t('help.whatsappWhy')}
                  onPress={() => {
                    track('whatsapp_opened', { from: 'help', vehicle: Boolean(vehicle) });
                    void open(whatsappUrl(c.whatsapp!, message));
                  }}
                  last={!c.phone && !c.email}
                />
              ) : null}
              {c.phone ? (
                <HelpRow
                  icon={<Feather name="phone" size={19} color={Brand.navy900} />}
                  title={t('help.call')}
                  detail={ltr(c.phone)}
                  onPress={() => void open(`tel:${c.phone?.replace(/[^\d+]/g, '')}`)}
                  last={!c.email}
                />
              ) : null}
              {c.email ? (
                <HelpRow
                  icon={<Feather name="mail" size={19} color={Brand.navy900} />}
                  title={t('help.mail')}
                  detail={c.email}
                  onPress={() => void open(`mailto:${c.email}?subject=${encodeURIComponent(t('help.title'))}&body=${encodeURIComponent(message)}`)}
                  last
                />
              ) : null}
            </Section>
          ) : null}

          {c?.hours || address ? (
            <Section title={t('help.practical')}>
              {c?.hours ? (
                <InfoRow icon="clock" label={t('help.hoursLabel')} value={c.hours} last={!address} />
              ) : null}
              {address ? <InfoRow icon="map-pin" label={t('help.addressLabel')} value={address} last /> : null}
            </Section>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { rtl } = useI18n();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign: rtl ? 'right' : 'left', fontFamily: familyFor('heading', rtl) }]}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function HelpRow({
  icon,
  iconStyle,
  title,
  detail,
  onPress,
  last = false,
}: {
  icon: React.ReactNode;
  iconStyle?: object;
  title: string;
  detail?: string | null;
  onPress: () => void;
  last?: boolean;
}) {
  const { rtl } = useI18n();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }, !last && styles.rule, pressed && styles.pressed]}
    >
      <View style={[styles.icon, iconStyle]}>{icon}</View>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, align, { fontFamily: familyFor('bodySemi', rtl) }]}>{title}</Text>
        {detail ? (
          <Text variant="hint" tone={C.textMuted} numberOfLines={2} style={align}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.medium} color={C.textMuted} />
    </Pressable>
  );
}

function InfoRow({ icon, label, value, last = false }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string; last?: boolean }) {
  const { rtl } = useI18n();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <View style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }, !last && styles.rule]}>
      <View style={styles.icon}>
        <Feather name={icon} size={19} color={Brand.navy900} />
      </View>
      <View style={styles.flex}>
        <Text variant="hint" tone={C.textMuted} style={align}>
          {label}
        </Text>
        <Text style={[styles.rowTitle, align, { fontFamily: familyFor('body', rtl) }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  // Navy under the gradient too: never a white band with white words on it.
  hero: { gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.card, overflow: 'hidden', backgroundColor: Brand.navy900, ...Elevation.resting },
  heroTop: { alignItems: 'center', gap: Spacing.three },
  heroTitle: { fontSize: 22, lineHeight: 28, color: Brand.white },
  heroLead: { fontSize: 14, lineHeight: 20, color: C.heroTextMuted },
  heroArt: { padding: 6, borderRadius: Radius.tile, backgroundColor: Brand.white },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 17, lineHeight: 23, color: C.text },
  card: { borderRadius: Radius.card, borderWidth: Border.thin, borderColor: C.border, backgroundColor: Brand.white, overflow: 'hidden' },
  row: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.min + 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  pressed: { backgroundColor: C.surface },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  iconWhatsapp: { backgroundColor: Brand.green700 },
  rowTitle: { fontSize: 15, lineHeight: 20, color: C.text },
});
