import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../api/client';

/**
 * Unread notification count (GET /notifications/unread-count), polled every 30s and refreshed on app foreground.
 * Powers the red badge on the "Settings" module card and the Settings > Notifications tab.
 */
export function useUnreadNotificationCount(enabled = true) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res: any = await api.get('/notifications/unread-count');
      const n = res?.data?.count ?? res?.data?.unreadCount ?? res?.count ?? res?.unreadCount ?? res?.data?.data?.count ?? 0;
      setCount(Number(n) || 0);
    } catch {
      /* keep last known value */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [enabled, refresh]);

  return { count, refresh, setCount };
}

export default useUnreadNotificationCount;