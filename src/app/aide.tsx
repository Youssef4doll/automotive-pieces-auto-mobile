import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { hasContactChannel, type ShopSettings } from '@/api/shop';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Failed, Loading } from '@/components/ui/states';
import { RENDERS } from '@/illustrations/renders';
import { Text } from '@/components/ui/text';
import { C, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { ArtPhoto } from '@/illustrations/paths';
import { useI18n } from '@/i18n/provider';
import { useGarage, vehicleLabel } from '@/store/garage';
import { whatsappUrl } from '@/components/ui/shop-contact';

/**
 * "Je ne sais pas comment ça s'appelle" — a photo, and a person at the shop.
 *
 * The shop already works this way: customers send a picture of the broken
 * part on WhatsApp and somebody at the counter recognises it. This screen is
 * the door to that conversation, opened with a first message already
 * written — including the car, when the garage knows it, which is the first
 * question the counter would otherwise ask. The photo is attached in
 * WhatsApp itself, which already does that well.
 *
 * The first action is always the photo request (/demande-photo), which lands
 * in the shop's own inbox, so there is always a real way to ask. WhatsApp,
 * the phone and e-mail follow only when the shop has published them — never
 * a placeholder number.
 */
export default function HelpScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const settings = useShopSettings();

  return (
    <>
      {/* The header names the section; the body asks the question. */}
      <Stack.Screen options={{ title: t('account.help') }} />
      {settings.status === 'loading' ? (
        <Loading />
      ) : settings.status === 'failed' ? (
        <Failed failure={settings.failure} onRetry={settings.retry} />
      ) : hasContactChannel(settings.data) ? (
        <Help settings={settings.data} />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: C.background }}>
          {/* No phone, WhatsApp or e-mail published yet — the photo request
              still reaches the shop, in its own inbox. */}
          <EmptyState
            art={<Image source={RENDERS.phone} style={{ width: 116, height: 116 }} contentFit="contain" />}
            title={t('help.title')}
            body={t('help.lead')}
          >
            <Button label={t('look.adviceCta')} icon="camera" onPress={() => router.push('/demande-photo')} />
          </EmptyState>
        </View>
      )}
    </>
  );
}

function Help({ settings }: { settings: ShopSettings }) {
  const { t } = useI18n();
  const router = useRouter();
  const active = useGarage((s) => s.active);
  const c = settings.contact;
  const vehicle = vehicleLabel(active);
  const message = vehicle ? t('help.messageVehicle', { vehicle }) : t('help.message');
  const open = (url: string) => Linking.openURL(url).catch(() => undefined);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.column}>
        <View style={styles.art}>
          <ArtPhoto size={88} />
        </View>
        <Text variant="screenTitle">{t('help.title')}</Text>
        <Text variant="body">{t('help.lead')}</Text>

        <View style={styles.actions}>
          <Button label={t('look.adviceCta')} icon="camera" onPress={() => router.push('/demande-photo')} />
          {c.whatsapp ? (
            <>
              <Button
                label={t('help.whatsapp')}
                icon="message-circle"
                variant="secondary"
                onPress={() => open(whatsappUrl(c.whatsapp!, message))}
              />
              <Text variant="hint">{t('help.whatsappWhy')}</Text>
            </>
          ) : null}
          {c.phone ? (
            <Button
              label={t('help.call')}
              icon="phone"
              variant="secondary"
              onPress={() => open(`tel:${c.phone?.replace(/[^\d+]/g, '')}`)}
            />
          ) : null}
          {c.email ? (
            <Button
              label={t('help.mail')}
              icon="mail"
              variant="secondary"
              onPress={() => open(`mailto:${c.email}?subject=${encodeURIComponent(t('help.title'))}&body=${encodeURIComponent(message)}`)}
            />
          ) : null}
        </View>

        {c.hours ? <Text variant="hint">{t('help.hours', { h: c.hours })}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  actions: { gap: Spacing.two, paddingTop: Spacing.two },
});
