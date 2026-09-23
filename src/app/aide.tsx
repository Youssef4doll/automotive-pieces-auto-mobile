import { Stack } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { hasContactChannel, type ShopSettings } from '@/api/shop';
import { Button } from '@/components/ui/button';
import { Empty, Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { ArtPhoto } from '@/illustrations/paths';
import { useI18n } from '@/i18n/provider';
import { useGarage, vehicleLabel } from '@/store/garage';

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
 * It exists only when the shop has published a way to reach a person. The
 * home screen does not offer this route otherwise, and a customer who lands
 * here by a stale link is told the details are not published — never shown
 * a placeholder number. In production today every channel is a placeholder,
 * so today this screen is unreachable from the app, which is correct.
 */
export default function HelpScreen() {
  const { t } = useI18n();
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
        <Empty
          title={t('account.noContact')}
          body={settings.data.contact.hours ? t('help.hours', { h: settings.data.contact.hours }) : null}
        />
      )}
    </>
  );
}

function Help({ settings }: { settings: ShopSettings }) {
  const { t } = useI18n();
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
          {c.whatsapp ? (
            <>
              <Button
                label={t('help.whatsapp')}
                icon="message-circle"
                onPress={() => open(`https://wa.me/${c.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`)}
              />
              <Text variant="hint">{t('help.whatsappWhy')}</Text>
            </>
          ) : null}
          {c.phone ? (
            <Button
              label={t('help.call')}
              icon="phone"
              variant={c.whatsapp ? 'secondary' : 'primary'}
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
