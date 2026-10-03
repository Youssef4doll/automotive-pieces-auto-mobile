import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { whatsappUrl } from '@/components/ui/shop-contact';
import { Text } from '@/components/ui/text';
import { C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { ArtPhoto } from '@/illustrations/paths';
import { useI18n } from '@/i18n/provider';
import { track } from '@/services/analytics';
import { useGarage, vehicleLabel } from '@/store/garage';
import { useQuestions } from '@/store/questions';

/**
 * Aide & contact — every way to reach the shop, the one that always works
 * first.
 *
 * "Poser une question" and "Envoyer une photo" go to the shop's own inbox
 * from the app (/demande) and come back answered there, so they are always
 * here, whatever the shop has published. WhatsApp, the phone and e-mail
 * follow as soon as the shop has filled them in (Espace boutique →
 * Paramètres) — and never as a placeholder number that rings nobody. The
 * WhatsApp message is written in advance, with the car from the garage:
 * the first thing the counter would ask.
 */
export default function HelpScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const settings = useShopSettings();
  const active = useGarage((s) => s.active);
  const asked = useQuestions((s) => s.questions.length);
  const c = settings.status === 'loaded' ? settings.data.contact : null;
  const vehicle = vehicleLabel(active);
  const message = vehicle ? t('help.messageVehicle', { vehicle }) : t('help.message');
  const open = (url: string) => Linking.openURL(url).catch(() => undefined);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  return (
    <>
      {/* The header names the section; the body asks the question. */}
      <Stack.Screen options={{ title: t('account.help') }} />
      <ScrollView contentContainerStyle={styles.scroll} style={styles.root}>
        <View style={styles.column}>
          <View style={styles.art}>
            <ArtPhoto size={88} />
          </View>
          <Text variant="screenTitle" style={align}>
            {t('help.title')}
          </Text>
          <Text variant="body" style={align}>
            {t('help.alwaysLead')}
          </Text>

          <View style={styles.actions}>
            <Button label={t('help.ask')} icon="message-square" onPress={() => router.push('/demande')} testID="help-ask" />
            <Button label={t('help.photo')} icon="camera" variant="secondary" onPress={() => router.push({ pathname: '/demande', params: { photo: '1' } })} />
            {asked ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/compte/questions')}
                style={({ pressed }) => [row, styles.mine, pressed && styles.pressed]}
              >
                <Feather name="inbox" size={IconSize.medium} color={C.text} />
                <Text style={[styles.mineText, align, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('help.myQuestions')}</Text>
                <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.medium} color={C.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {c && (c.whatsapp || c.phone || c.email) ? (
            <View style={styles.actions}>
              {c.whatsapp ? (
                <>
                  <Button
                    label={t('help.whatsapp')}
                    icon="message-circle"
                    variant="secondary"
                    onPress={() => {
                      track('whatsapp_opened', { from: 'help', vehicle: Boolean(vehicle) });
                      void open(whatsappUrl(c.whatsapp!, message));
                    }}
                  />
                  <Text variant="hint" style={align}>
                    {t('help.whatsappWhy')}
                  </Text>
                </>
              ) : null}
              {c.phone ? (
                <Button label={t('help.call')} icon="phone" variant="secondary" onPress={() => void open(`tel:${c.phone?.replace(/[^\d+]/g, '')}`)} />
              ) : null}
              {c.email ? (
                <Button
                  label={t('help.mail')}
                  icon="mail"
                  variant="secondary"
                  onPress={() => void open(`mailto:${c.email}?subject=${encodeURIComponent(t('help.title'))}&body=${encodeURIComponent(message)}`)}
                />
              ) : null}
            </View>
          ) : null}

          {c?.hours ? (
            <Text variant="hint" style={align}>
              {t('help.hours', { h: c.hours })}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </>
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
    gap: Spacing.three,
  },
  art: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 168,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
  },
  actions: { gap: Spacing.two, paddingTop: Spacing.one },
  mine: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.min + 8,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
  },
  mineText: { flex: 1, minWidth: 0, fontSize: 16, color: C.text },
  pressed: { opacity: 0.85 },
});
