import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * Storage that survives not having any.
 *
 * `@react-native-async-storage/async-storage` on web is `window.localStorage`
 * with a promise around it, and there are two places with no `window`: the
 * Node pass that pre-renders the web build, and a browser where site data is
 * blocked. The first one is not hypothetical — it crashed `expo start --web`
 * outright the first time the garage store existed, because zustand's persist
 * middleware reads storage the moment the store is created, at import time,
 * before any component has rendered and where there is no error boundary to
 * catch it. The app did not fail to show the garage; it failed to start.
 *
 * So storage is probed once and replaced with a no-op when it is not there.
 * A no-op means a store works for the length of the session and is not
 * remembered — which is the correct behaviour for a pre-render (nothing is
 * being remembered for anybody) and an honest degradation in a browser with
 * storage switched off.
 *
 * Shared by every persisted store: the garage, the basket, the list of
 * orders placed on this phone, recent searches.
 */
const hasStorage = Platform.OS !== 'web' || typeof window !== 'undefined';

export const deviceStorage: StateStorage = hasStorage
  ? AsyncStorage
  : {
      getItem: async () => null,
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };

/**
 * The Keychain on iOS, the Keystore on Android — for order tokens only.
 *
 * An order token opens a customer's name, phone number and delivery address.
 * AsyncStorage is a plain file on Android, readable on a rooted handset and
 * swept into unencrypted backups; SecureStore is the platform's own secret
 * store. ARCHITECTURE.md §10 made this decision before the checkout existed.
 *
 * On web there is no keychain. The web build is how this app is developed
 * and screenshotted, never how it ships, so there the token falls back to
 * the same storage as everything else — and that fallback is confined to
 * this one function, where it can be seen, rather than a `Platform.OS`
 * check scattered through the order screens.
 */
export const secrets = {
  get: (key: string): Promise<string | null> =>
    Platform.OS === 'web' ? Promise.resolve(deviceStorage.getItem(key) as string | null) : SecureStore.getItemAsync(key),
  set: (key: string, value: string): Promise<void> =>
    Platform.OS === 'web'
      ? Promise.resolve(deviceStorage.setItem(key, value)).then(() => undefined)
      : SecureStore.setItemAsync(key, value),
  remove: (key: string): Promise<void> =>
    Platform.OS === 'web'
      ? Promise.resolve(deviceStorage.removeItem(key)).then(() => undefined)
      : SecureStore.deleteItemAsync(key),
};
