import { Platform } from 'react-native';

import type { LatLng } from './map-tiles';

/** What the phone's geocoder says is at a point: its governorate, and the street with its number. */
export type Place = { region: string | null; street: string | null };

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
    return { ok: true, point, region: (await describe(point))?.region ?? null };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/**
 * The phone's own reverse geocoder on the pin the customer settled on
 * (iOS and Android; the web has none without a paid key), so an empty
 * address can start from the street the map says is there. Null when the
 * phone cannot say — Android asks for the location permission first, and
 * this never asks for it.
 */
export async function describe(point: LatLng): Promise<Place | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Location = await import('expo-location');
    const [place] = await Location.reverseGeocodeAsync({ latitude: point.lat, longitude: point.lng });
    if (!place) return null;
    const street = place.street ? [place.streetNumber, place.street].filter(Boolean).join(' ') : null;
    return { region: place.region ?? place.subregion ?? null, street };
  } catch {
    return null;
  }
}
