import { supabase, TABLES } from '../lib/supabaseClient';
import type { AdminNotification, AdminNotificationKind } from '../types';

const NOTIFICATION_SELECT =
  'notification_id, admin_id, title, message, kind, starts_at, ends_at, is_active, created_at, updated_at';

export function normalizeAdminNotification(row: Partial<AdminNotification>): AdminNotification {
  return {
    notification_id: String(row.notification_id ?? ''),
    admin_id: row.admin_id ?? null,
    title: String(row.title ?? ''),
    message: String(row.message ?? ''),
    kind: row.kind ?? 'info',
    starts_at: String(row.starts_at ?? new Date().toISOString()),
    ends_at: String(row.ends_at ?? new Date(Date.now() + 15000).toISOString()),
    is_active: Boolean(row.is_active ?? true),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: row.updated_at ?? null,
  };
}

export const ADMIN_NOTIFICATION_CREATED_EVENT = 'dice-admin-notification-created';

export const adminNotificationService = {
  async listRecent() {
    if (!supabase) {
      return { data: [], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase
      .from(TABLES.adminNotifications)
      .select(NOTIFICATION_SELECT)
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      data: (data ?? []).map((row) => normalizeAdminNotification(row)),
      error: error ? new Error(error.message) : null,
    };
  },

  async create(
    sessionToken: string | null,
    input: {
      title: string;
      message: string;
      kind: AdminNotificationKind;
      startsAt: string | null;
      durationSeconds: number;
    },
  ) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_create_notification', {
        p_session_token: sessionToken,
        p_title: input.title,
        p_message: input.message,
        p_kind: input.kind,
        p_starts_at: input.startsAt,
        p_duration_seconds: input.durationSeconds,
      })
      .single<AdminNotification>();

    const normalizedData = data ? normalizeAdminNotification(data) : null;

    if (normalizedData && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<AdminNotification>(ADMIN_NOTIFICATION_CREATED_EVENT, { detail: normalizedData }));
    }

    return {
      data: normalizedData,
      error: error ? new Error(error.message) : null,
    };
  },

  async deactivate(sessionToken: string | null, notificationId: string) {
    if (!supabase || !sessionToken) {
      return { error: new Error('Admin session required.') };
    }

    const { error } = await supabase.rpc('admin_deactivate_notification', {
      p_session_token: sessionToken,
      p_notification_id: notificationId,
    });

    return { error: error ? new Error(error.message) : null };
  },
};
