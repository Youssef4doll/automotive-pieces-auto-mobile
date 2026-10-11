import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PinMap } from '@/components/ui/pin-map';
import { Text } from '@/components/ui/text';
import { C, Spacing, Tap } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { describe, locate, type Place } from '@/lib/locate';
import { GOVERNORATE_CENTRES, inTunisia, type LatLng } from '@/lib/map-tiles';

/**
 * "Placez le repère sur votre porte": the map with its pin, the phone's
 * position on a tap, and the button that keeps the point (the owner,
 * October 2026: "GPS + map pin" at checkout and in the address book).
 *
 * The map opens on the pin already placed, else on the capital of the
 * governorate chosen, else on Tunis. "Utiliser ma position" moves it to the
 * phone's position — only inside Tunisia, where the shop delivers — and
 * hands back the region the phone names, so an empty governorate can be
 * filled in. On keeping the point, the phone's geocoder says what is there
 * — the governorate and the street — so an empty form can start from it.
 */
export function PinPicker({
  initial,
  governorate,
  onConfirm,
  onRemove,
}: {
  initial: LatLng | null;
  governorate?: string;
  onConfirm: (pin: LatLng, place: Place | null) => void;
  onRemove?: () => void;
}) {
  const { t, rtl } = useI18n();
  const [center, setCenter] = useState<LatLng>(initial ?? (governorate ? GOVERNORATE_CENTRES[governorate] : undefined) ?? GOVERNORATE_CENTRES.Tunis);
  const [region, setRegion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const [note, setNote] = useState<DictKey | null>(null);
  const start = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  const useMine = async () => {
    setBusy(true);
    setNote(null);
    const found = await locate();
    setBusy(false);
    if (found.ok && inTunisia(found.point)) {
      setCenter({ lat: Math.round(found.point.lat * 1e5) / 1e5, lng: Math.round(found.point.lng * 1e5) / 1e5 });
      setRegion(found.region);
    } else {
      setNote(found.ok || found.reason === 'unavailable' ? 'addr.unavailable' : 'addr.denied');
    }
  };

  return (
    <View style={styles.root} testID="pin-picker">
      <Text variant="hint" tone={C.text} style={start}>
        {t('addr.pinHint')}
      </Text>
      <PinMap center={center} onMove={setCenter} />
      <Button label={busy ? t('addr.locating') : t('addr.locate')} icon="navigation" variant="secondary" onPress={useMine} loading={busy} testID="pin-locate" />
      {note ? (
        <Text variant="hint" tone={C.caution} style={start} accessibilityLiveRegion="polite">
          {t(note)}
        </Text>
      ) : null}
      <Button
        label={t('addr.pinConfirm')}
        icon="check"
        loading={keeping}
        onPress={async () => {
          setKeeping(true);
          const place = (await describe(center)) ?? (region ? { region, street: null } : null);
          setKeeping(false);
          onConfirm(center, place);
        }}
        testID="pin-confirm"
      />
      {initial && onRemove ? (
        <Pressable accessibilityRole="button" onPress={onRemove} style={styles.remove}>
          <Text variant="hint" tone={C.danger} style={styles.underline}>
            {t('addr.pinRemove')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three, paddingBottom: Spacing.three },
  remove: { minHeight: Tap.min, alignItems: 'center', justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
