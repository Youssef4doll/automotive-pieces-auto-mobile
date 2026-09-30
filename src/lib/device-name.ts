import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * What this phone calls itself — "iPhone 15 · iOS 18.2", "SM-A546B ·
 * Android 14" — sent once at sign-in so the account's list of signed-in
 * devices can tell a customer which one is which. Nothing more precise than
 * the model and the system: no identifier, no name the owner gave the phone.
 * The shop stores it as free text and shows it back to the account only.
 */
export function deviceName(): string {
  const system = [Device.osName ?? (Platform.OS === 'web' ? 'Web' : Platform.OS), Device.osVersion].filter(Boolean).join(' ');
  const model = Device.modelName ?? (Platform.OS === 'web' ? 'Navigateur' : null);
  return [model, system].filter(Boolean).join(' · ').slice(0, 60);
}
