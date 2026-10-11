import { Platform } from 'react-native';

import type { LatLng } from './map-tiles';

export type Located = { ok: true; point: LatLng; region: string | null } | { ok: false; reason: 'denied' | 'unavailable' };

/**
 * The phone's position, for the delivery pin — asked only when the customer
 * taps "Utiliser ma position", never in the background.
 *
 * expo-location is loaded here, at the tap, not when the app starts: an
 * update reaching a phone whose installed app predates the module must not
 * crash it. Without the module, or without permission, the answer says so
 * and the customer drags the map instead. The region the phone names (its
 * governorate, on iOS and Android) comes back too, so the form can fill it
 * in when it is still empty — it is shown, and the customer can change it.
 */
export async function locate(): Promise<Located> {
  let Location: typeof import('expo-location');
  try {
    Location = await import('expo-location');
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return { ok: false, reason: 'denied' };
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const point = { lat: position.coords.latitude, lng: position.coords.longitude };
    let region: string | null = null;
    // The web has no reverse geocoder without a paid key; the customer picks the governorate there.
    if (Platform.OS !== 'web') {
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
        region = place?.region ?? place?.subregion ?? null;
      } catch {
        region = null;
      }
    }
    return { ok: true, point, region };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
