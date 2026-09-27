import { Linking, StyleSheet, View } from 'react-native';

import { useShopSettings } from '@/hooks/use-shop-settings';
import { useI18n } from '@/i18n/provider';
import { track } from '@/services/analytics';
import { Button } from './button';

/** "wa.me" wants the number with its country code and nothing else. */
export function whatsappUrl(number: string, text: string) {
  const d = number.replace(/\D/g, '');
  return `https://wa.me/${d.length === 8 ? `216${d}` : d}?text=${encodeURIComponent(text)}`;
}

/**
 * WhatsApp and call, with the context already written: the order's
 * reference, the part, the car. Each button appears only when the shop has
 * published that channel (placeholders are filtered by the website), so the
 * block is empty — and renders nothing — until it has.
 */
export function ShopContact({ message, from }: { message: string; from: string }) {
  const { t } = useI18n();
  const settings = useShopSettings();
  if (settings.status !== 'loaded') return null;
  const { whatsapp, phone } = settings.data.contact;
  if (!whatsapp && !phone) return null;
  return (
    <View style={styles.row}>
      {whatsapp ? (
        <Button
          label={t('help.whatsapp')}
          icon="message-circle"
          variant="secondary"
          onPress={() => {
            track('whatsapp_opened', { from });
            void Linking.openURL(whatsappUrl(whatsapp, message)).catch(() => undefined);
          }}
        />
      ) : null}
      {phone ? (
        <Button label={t('help.call')} icon="phone" variant="secondary" onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => undefined)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { gap: 8 } });
