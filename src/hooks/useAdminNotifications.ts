import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, TABLES } from '../lib/supabaseClient';
import {
  ADMIN_NOTIFICATION_CREATED_EVENT,
  adminNotificationService,
  normalizeAdminNotification,
} from '../services/adminNotificationService';
import type { AdminNotification } from '../types';

function sortNotifications(items: AdminNotification[]) {
  return [...items]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 50);
}

export function useAdminNotifications() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const hasLoadedRef = useRef(false);
  const channelNameRef = useRef(
    `admin-notifications-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
  );

  const loadNotifications = useCallback(async (silent = false) => {
    if (!silent || !hasLoadedRef.current) {
      setLoading(true);
    }

    const { data, error: fetchError } = await adminNotificationService.listRecent();
    setItems(sortNotifications(data));
    setError(fetchError?.message ?? null);

    if (!silent || !hasLoadedRef.current) {
      setLoading(false);
    }

    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 2000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadNotifications(true);
    }, 8000);

    const handleCreated = (event: Event) => {
      const nextItem = (event as CustomEvent<AdminNotification>).detail;

      if (!nextItem?.notification_id) {
        void loadNotifications(true);
        return;
      }

      setItems((currentItems) => {
        const withoutDuplicate = currentItems.filter((item) => item.notification_id !== nextItem.notification_id);
        return sortNotifications([nextItem, ...withoutDuplicate]);
      });
      setNow(Date.now());
    };

    window.addEventListener(ADMIN_NOTIFICATION_CREATED_EVENT, handleCreated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(ADMIN_NOTIFICATION_CREATED_EVENT, handleCreated);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setLoading(false);
      setError('Chua cau hinh Supabase notifications.');
      return;
    }

    const channel = client
      .channel(channelNameRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.adminNotifications }, (payload) => {
        if (!payload.new) {
          return;
        }

        const nextItem = normalizeAdminNotification(payload.new as Partial<AdminNotification>);
        setItems((currentItems) => {
          const withoutDuplicate = currentItems.filter((item) => item.notification_id !== nextItem.notification_id);
          return sortNotifications([nextItem, ...withoutDuplicate]);
        });
      })
      .subscribe();

    void loadNotifications(false);

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadNotifications]);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (!item.is_active) {
          return false;
        }

        const startsAt = new Date(item.starts_at).getTime();
        const endsAt = new Date(item.ends_at).getTime();
        return startsAt <= now && now < endsAt;
      }),
    [items, now],
  );

  return {
    error,
    items,
    loading,
    reload: loadNotifications,
    visibleItems,
  };
}
