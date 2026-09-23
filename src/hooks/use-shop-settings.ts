import { useCallback } from 'react';

import { shopApi } from '@/api/shop';
import { useResource } from './use-resource';

/**
 * The shop's public settings — delivery, tax, contact — for any screen.
 *
 * Cached for the session by the API client, so the basket, checkout, the
 * product page and the account tab share one request.
 */
export function useShopSettings() {
  const load = useCallback((signal: AbortSignal) => shopApi.settings(signal), []);
  return useResource(load);
}
