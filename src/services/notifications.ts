import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notifications, the two kinds this app sends.
 *
 * Push (order moved, part back in stock) comes from the shop's server through
 * Expo's push service. It needs a real phone and a build made with an EAS
 * project id — until the owner has run `eas init`, `pushAvailable` is false
 * and no screen offers it, rather than offering a switch that does nothing.
 *
 * Local (the garage's inspection and insurance dates) is scheduled on the
 * phone itself and needs neither: just a phone, and the customer's yes.
 *
 * Permission is never asked on launch. It is asked at the moment it means
 * something — "tell me when this order moves", "remind me of this date" — so
 * the customer knows exactly what they are agreeing to.
 */

const native = Platform.OS !== 'web';

function projectId(): string | null {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromConfig ?? Constants.easConfig?.projectId ?? null;
}

/** Push can be offered: a real phone, in a build tied to an EAS project. */
export const pushAvailable = native && Device.isDevice && projectId() !== null;
/** Local reminders can be offered: any phone. */
export const remindersAvailable = native;

export const CHANNELS = { orders: 'orders', stock: 'stock', reminders: 'reminders' } as const;

let channelsReady = false;
async function ensureChannels() {
  if (channelsReady || Platform.OS !== 'android') return;
  channelsReady = true;
  await Promise.all([
    Notifications.setNotificationChannelAsync(CHANNELS.orders, { name: 'Commandes', importance: Notifications.AndroidImportance.HIGH }),
    Notifications.setNotificationChannelAsync(CHANNELS.stock, { name: 'Retours en stock', importance: Notifications.AndroidImportance.DEFAULT }),
    Notifications.setNotificationChannelAsync(CHANNELS.reminders, { name: 'Rappels véhicule', importance: Notifications.AndroidImportance.DEFAULT }),
  ]).catch(() => undefined);
}

/**
 * Whether we may notify. `ask: true` shows the system prompt if it has not
 * been answered yet; a customer who said no is not asked again by us — the
 * system would not show it anyway.
 */
export async function mayNotify({ ask }: { ask: boolean }): Promise<boolean> {
  if (!native) return false;
  await ensureChannels();
  const current = await Notifications.getPermissionsAsync().catch(() => null);
  if (current?.granted) return true;
  if (!ask || current?.canAskAgain === false) return false;
  const asked = await Notifications.requestPermissionsAsync().catch(() => null);
  return Boolean(asked?.granted);
}

let cachedToken: string | null = null;

/** This phone's Expo push token, or null when push cannot be had (see above). */
export async function pushToken({ ask }: { ask: boolean }): Promise<string | null> {
  if (!pushAvailable) return null;
  if (cachedToken) return cachedToken;
  if (!(await mayNotify({ ask }))) return null;
  try {
    cachedToken = (await Notifications.getExpoPushTokenAsync({ projectId: projectId()! })).data;
    return cachedToken;
  } catch {
    // Offline, or Expo unreachable: the caller says "not now" and the
    // customer can try again later.
    return null;
  }
}

/**
 * A notification that arrives while the app is open still shows — the
 * customer may be on another screen when their order ships.
 */
export function installNotificationHandler() {
  if (!native) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Where a tapped notification leads, from the data the server or the phone put in it. */
export function routeFor(data: unknown): string | null {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.ref === 'string' && /^[A-Z0-9-]{3,32}$/i.test(d.ref)) return `/suivi/${encodeURIComponent(d.ref)}`;
  if (typeof d.slug === 'string' && /^[a-z0-9-]{1,200}$/.test(d.slug)) return `/produit/${d.slug}`;
  if (typeof d.engine === 'string' && /^[a-z0-9]{10,40}$/i.test(d.engine)) return `/garage/vehicule/${d.engine}`;
  return null;
}

/** A date reminder on this phone; returns its id, or null when the moment has passed. */
export async function scheduleReminder(at: Date, title: string, body: string, data: Record<string, string>): Promise<string | null> {
  if (!native || at.getTime() <= Date.now() + 60_000) return null;
  await ensureChannels();
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNELS.reminders },
  }).catch(() => null);
}

export async function cancelReminders(ids: string[]) {
  if (!native) return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}
