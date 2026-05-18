import { normalizeProfile, normalizeRound, supabase, TABLES, type RoundRow } from '../lib/supabaseClient';
import { normalizeChatMessage } from './chatService';
import type { AdminStats, ChatMessage, PointsTransaction, UserProfile } from '../types';

export type AdminSessionDebug = {
  uid: string;
  account_name: string;
  display_name: string;
  role: string;
  is_banned: boolean;
  session_exists: boolean;
};

export const adminService = {
  async getSessionDebug(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('get_admin_session_debug', {
        p_session_token: sessionToken,
      })
      .single<AdminSessionDebug>();

    return {
      data: data ?? null,
      error: error ? new Error(error.message) : null,
    };
  },

  async listUsers(sessionToken: string | null, search = '') {
    if (!supabase || !sessionToken) {
      return { data: [], error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_get_users', {
      p_session_token: sessionToken,
      p_search: search,
    });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<UserProfile>[]).map((row) => normalizeProfile(row)), error: null };
  },

  async adjustPoints(sessionToken: string | null, userId: string, amount: number, note: string) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_adjust_points', {
        p_session_token: sessionToken,
        p_user_id: userId,
        p_amount: amount,
        p_note: note || null,
      })
      .single<UserProfile>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizeProfile(data), error: null };
  },

  async adjustPointsForAll(sessionToken: string | null, amount: number, note: string) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_adjust_points_all', {
        p_session_token: sessionToken,
        p_amount: amount,
        p_note: note || null,
      })
      .single<{ affected_users: number; total_amount: number }>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return {
      data: {
        affectedUsers: Number(data?.affected_users ?? 0),
        totalAmount: Number(data?.total_amount ?? 0),
      },
      error: null,
    };
  },

  async setUserBan(sessionToken: string | null, userId: string, isBanned: boolean, reason: string | null = null) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_set_user_ban', {
        p_session_token: sessionToken,
        p_user_id: userId,
        p_is_banned: isBanned,
        p_reason: reason,
      })
      .single<UserProfile>();

    if (!error) {
      return { data: data ? normalizeProfile(data) : null, error: null };
    }

    const schemaCacheMiss = error.message.toLowerCase().includes('schema cache') || error.message.toLowerCase().includes('p_reason');

    if (!schemaCacheMiss) {
      return { data: null, error: new Error(error.message) };
    }

    // Backward-compatible fallback for databases that still have the old
    // 3-argument RPC cached. It still applies the ban while the SQL patch is rerun.
    const fallback = await supabase
      .rpc('admin_set_user_ban', {
        p_session_token: sessionToken,
        p_user_id: userId,
        p_is_banned: isBanned,
      })
      .single<UserProfile>();

    return {
      data: fallback.data ? normalizeProfile(fallback.data) : null,
      error: fallback.error ? new Error(fallback.error.message) : null,
    };
  },

  async setUserRole(sessionToken: string | null, userId: string, role: 'user' | 'admin') {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Admin session required.') };
    }

    const { error } = await supabase.rpc('admin_set_user_role', {
      p_session_token: sessionToken,
      p_user_id: userId,
      p_role: role,
    });

    return { error: error ? new Error(error.message) : null };
  },

  async getTransactions(sessionToken: string | null, userId: string) {
    if (!supabase || !sessionToken) {
      return { data: [], error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_get_points_transactions', {
      p_session_token: sessionToken,
      p_user_id: userId,
    });

    return {
      data: (data ?? []) as PointsTransaction[],
      error: error ? new Error(error.message) : null,
    };
  },

  async listRounds() {
    if (!supabase) {
      return { data: [], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase
      .from(TABLES.rounds)
      .select('round_id, status, dice, total, result_type, starts_at, ends_at, settled_at, completed_at, settled_by, is_cancelled, created_at, created_by')
      .order('created_at', { ascending: false })
      .limit(30);

    return {
      data: ((data ?? []) as RoundRow[]).map((row) => normalizeRound(row)),
      error: error ? new Error(error.message) : null,
    };
  },

  async forceSettleRound(sessionToken: string | null, roundId: string) {
    if (!supabase || !sessionToken) {
      return { error: new Error('Admin session required.') };
    }

    const { error } = await supabase.rpc('admin_force_settle_round', {
      p_session_token: sessionToken,
      p_round_id: roundId,
    });

    return { error: error ? new Error(error.message) : null };
  },

  async cancelRound(sessionToken: string | null, roundId: string) {
    if (!supabase || !sessionToken) {
      return { error: new Error('Admin session required.') };
    }

    const { error } = await supabase.rpc('admin_cancel_round', {
      p_session_token: sessionToken,
      p_round_id: roundId,
      p_note: 'Cancelled from admin dashboard',
    });

    return { error: error ? new Error(error.message) : null };
  },

  async deleteChatMessage(sessionToken: string | null, messageId: string) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_delete_chat_message', {
        p_session_token: sessionToken,
        p_message_id: messageId,
      })
      .single<ChatMessage>();

    return {
      data: data ? normalizeChatMessage(data) : null,
      error: error ? new Error(error.message) : null,
    };
  },

  async getStats(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_get_stats', {
      p_session_token: sessionToken,
    }).single<AdminStats>();

    return {
      data: data
        ? {
            total_users: Number(data.total_users ?? 0),
            online_users: Number(data.online_users ?? 0),
            total_bets: Number(data.total_bets ?? 0),
            total_rounds: Number(data.total_rounds ?? 0),
            total_points: Number(data.total_points ?? 0),
            total_locked_points: Number(data.total_locked_points ?? 0),
            total_wins: Number(data.total_wins ?? 0),
            total_losses: Number(data.total_losses ?? 0),
          }
        : null,
      error: error ? new Error(error.message) : null,
    };
  },
};
