import { useCallback, useState } from 'react';

import { reportError } from '@/lib/useBusy';
import { useStore } from '@/store/useStore';

/** Pull-to-refresh: downloads the latest data from the server (e.g. payments made on another phone). */
export function useRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await useStore.getState().sync({ force: true });
    } catch (e) {
      reportError(e);
    } finally {
      setRefreshing(false);
    }
  }, []);
  return { refreshing, onRefresh };
}
