import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';

import { refreshAll } from '@/api/refresh';
import { C } from '@/constants/theme';

/**
 * Pull a screen down to read the shop again — every resource on it, and the
 * ones in the other tabs too, straight from the shop rather than the cache.
 *
 * Returns the `refreshControl` element for a ScrollView or FlatList.
 */
export function usePullRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAll({ hard: true });
    } finally {
      setRefreshing(false);
    }
  }, []);
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} colors={[C.accent]} />;
}
