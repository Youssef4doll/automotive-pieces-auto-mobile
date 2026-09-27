import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

import { routeFor } from '@/services/notifications';

/**
 * A tapped notification opens what it is about: the order (`ref`), the part
 * back in stock (`slug`), the car whose date is due (`engine`) — whether the
 * tap woke the app or found it open. Rendered on phones only.
 */
export function NotificationRouter() {
  const router = useRouter();
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!last || last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const to = routeFor(last.notification.request.content.data);
    if (to) router.push(to as Href);
    void Notifications.clearLastNotificationResponseAsync();
  }, [last, router]);
  return null;
}
