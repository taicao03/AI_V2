import { supabase, TABLES } from '../lib/supabaseClient';
import type {
  AdminWheelSettingsPayload,
  WheelChatMessage,
  WheelHousePnlInfo,
  WheelJackpotInfo,
  WheelLeaderboardEntry,
  WheelPendingBet,
  WheelPublicState,
  WheelSegment,
  WheelSettings,
  WheelSpin,
} from '../types/wheel';

function normalizeSettings(row: Partial<WheelSettings> | null): WheelSettings | null {
  if (!row) {
    return null;
  }

  return {
    settings_id: Number(row.settings_id ?? 1),
    enabled: Boolean(row.enabled ?? true),
    min_bet: Number(row.min_bet ?? 10),
    max_bet: Number(row.max_bet ?? 100000),
    cooldown_seconds: Number(row.cooldown_seconds ?? 3),
    default_jackpot: Number(row.default_jackpot ?? 100000),
    updated_by: row.updated_by ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    version: Number(row.version ?? 1),
  };
}

function normalizeSegment(row: Partial<WheelSegment>): WheelSegment {
  return {
    segment_id: String(row.segment_id ?? ''),
    label: String(row.label ?? 'Unknown'),
    multiplier: Number(row.multiplier ?? 0),
    probability: Number(row.probability ?? 0),
    color: String(row.color ?? '#334155'),
    enabled: Boolean(row.enabled ?? false),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeSpin(row: Partial<WheelSpin>): WheelSpin {
  return {
    spin_id: String(row.spin_id ?? ''),
    client_spin_id: row.client_spin_id ?? null,
    user_id: String(row.user_id ?? ''),
    display_name: String(row.display_name ?? 'Player'),
    avatar: row.avatar ?? null,
    bet_amount: Number(row.bet_amount ?? 0),
    selected_segment_id: row.selected_segment_id ?? null,
    label: String(row.label ?? 'Unknown'),
    multiplier: Number(row.multiplier ?? 0),
    result_amount: Number(row.result_amount ?? 0),
    settings_version: Number(row.settings_version ?? 1),
    settings_snapshot: (row.settings_snapshot as Record<string, unknown>) ?? {},
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function normalizeChat(row: Partial<WheelChatMessage>): WheelChatMessage {
  return {
    message_id: String(row.message_id ?? ''),
    user_id: row.user_id ?? null,
    display_name: String(row.display_name ?? 'Player'),
    avatar: row.avatar ?? null,
    role: row.role === 'admin' ? 'admin' : row.role === 'system' ? 'system' : 'user',
    vip_level: Number(row.vip_level ?? 0),
    text: String(row.text ?? ''),
    is_system: Boolean(row.is_system ?? false),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: row.updated_at ?? null,
    deleted_at: row.deleted_at ?? null,
    deleted_by: row.deleted_by ?? null,
    is_deleted: Boolean(row.is_deleted ?? false),
  };
}

function normalizeLeaderboard(row: Partial<WheelLeaderboardEntry>): WheelLeaderboardEntry {
  return {
    user_id: String(row.user_id ?? ''),
    account_name: String(row.account_name ?? 'player'),
    display_name: String(row.display_name ?? 'Player'),
    avatar_url: row.avatar_url ?? null,
    total_winnings: Number(row.total_winnings ?? 0),
    biggest_win: Number(row.biggest_win ?? 0),
    total_spins: Number(row.total_spins ?? 0),
    jackpot_hits: Number(row.jackpot_hits ?? 0),
    win_count: Number(row.win_count ?? 0),
    win_rate: Number(row.win_rate ?? 0),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizePublicState(payload: Partial<WheelPublicState> | null): WheelPublicState | null {
  if (!payload?.settings) {
    return null;
  }

  const settings = normalizeSettings(payload.settings);
  if (!settings) {
    return null;
  }

  return {
    settings,
    segments: Array.isArray(payload.segments) ? payload.segments.map((item) => normalizeSegment(item)) : [],
    last_spin_at: payload.last_spin_at ?? null,
    cooldown_remaining_seconds: Number(payload.cooldown_remaining_seconds ?? 0),
  };
}

function normalizeJackpotInfo(payload: Partial<WheelJackpotInfo> | null): WheelJackpotInfo | null {
  if (!payload) {
    return null;
  }

  return {
    base_jackpot: Number(payload.base_jackpot ?? 100000),
    total_contribution: Number(payload.total_contribution ?? 0),
    jackpot_amount: Number(payload.jackpot_amount ?? 100000),
  };
}

function normalizeHousePnlInfo(payload: Partial<WheelHousePnlInfo> | null): WheelHousePnlInfo | null {
  if (!payload) {
    return null;
  }

  return {
    total_bet: Number(payload.total_bet ?? 0),
    total_payout: Number(payload.total_payout ?? 0),
    total_spins: Number(payload.total_spins ?? 0),
    house_pnl: Number(payload.house_pnl ?? 0),
  };
}

function normalizePendingBet(payload: Partial<WheelPendingBet> | null): WheelPendingBet | null {
  if (!payload) {
    return null;
  }

  return {
    round_cycle: Number(payload.round_cycle ?? 0),
    bet_amount: Number(payload.bet_amount ?? 0),
    created_at: String(payload.created_at ?? new Date().toISOString()),
  };
}

export const wheelSpinService = {
  async getPublicState() {
    if (!supabase) {
      return { data: null as WheelPublicState | null, error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('wheel_get_public_state');

    if (error) {
      return { data: null as WheelPublicState | null, error: new Error(error.message) };
    }

    return {
      data: normalizePublicState((data ?? null) as Partial<WheelPublicState>),
      error: null,
    };
  },

  async createSpin(sessionToken: string | null, betAmount: number, clientSpinId: string) {
    if (!supabase || !sessionToken) {
      return { data: null as WheelSpin | null, error: new Error('Ban can dang nhap de spin.') };
    }

    const { data, error } = await supabase
      .rpc('wheel_create_spin', {
        p_session_token: sessionToken,
        p_bet_amount: betAmount,
        p_client_spin_id: clientSpinId,
      })
      .single<WheelSpin>();

    if (error) {
      return { data: null as WheelSpin | null, error: new Error(error.message) };
    }

    return { data: normalizeSpin(data), error: null };
  },

  async submitBet(sessionToken: string | null, betAmount: number, roundCycle?: number) {
    if (!supabase || !sessionToken) {
      return { ok: false, error: new Error('Ban can dang nhap de dat cuoc.') };
    }

    const { error } = await supabase.rpc('wheel_submit_bet', {
      p_session_token: sessionToken,
      p_bet_amount: betAmount,
      p_round_cycle: typeof roundCycle === 'number' ? roundCycle : null,
    });

    if (error) {
      return { ok: false, error: new Error(error.message) };
    }

    return { ok: true, error: null };
  },

  async getMyPendingBet(sessionToken: string | null, roundCycle?: number) {
    if (!supabase || !sessionToken) {
      return { data: null as WheelPendingBet | null, error: new Error('Ban can dang nhap de xem cuoc da dat.') };
    }

    const { data, error } = await supabase.rpc('wheel_get_my_pending_bet', {
      p_session_token: sessionToken,
      p_round_cycle: typeof roundCycle === 'number' ? roundCycle : null,
    });

    if (error) {
      return { data: null as WheelPendingBet | null, error: new Error(error.message) };
    }

    return {
      data: normalizePendingBet((data ?? null) as Partial<WheelPendingBet> | null),
      error: null,
    };
  },

  async createSpinFromPending(sessionToken: string | null, roundCycle?: number) {
    if (!supabase || !sessionToken) {
      return { data: null as WheelSpin | null, error: new Error('Ban can dang nhap de spin.') };
    }

    const { data, error } = await supabase
      .rpc('wheel_create_spin_from_pending', {
        p_session_token: sessionToken,
        p_round_cycle: typeof roundCycle === 'number' ? roundCycle : null,
      })
      .single<WheelSpin>();

    if (error) {
      return { data: null as WheelSpin | null, error: new Error(error.message) };
    }

    return { data: normalizeSpin(data), error: null };
  },

  async getRecentSpins(limit = 30) {
    if (!supabase) {
      return { data: [] as WheelSpin[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('wheel_get_recent_spins', {
      p_limit: Math.min(Math.max(limit, 1), 50),
    });

    if (error) {
      return { data: [] as WheelSpin[], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<WheelSpin>[]).map((row) => normalizeSpin(row)), error: null };
  },

  async getJackpotInfo() {
    if (!supabase) {
      return { data: null as WheelJackpotInfo | null, error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('wheel_get_jackpot_info');

    if (error) {
      return { data: null as WheelJackpotInfo | null, error: new Error(error.message) };
    }

    return {
      data: normalizeJackpotInfo((data ?? null) as Partial<WheelJackpotInfo>),
      error: null,
    };
  },

  async getRecentWinners(limit = 12) {
    if (!supabase) {
      return { data: [] as WheelSpin[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('wheel_get_recent_winners', {
      p_limit: limit,
    });

    if (error) {
      return { data: [] as WheelSpin[], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<WheelSpin>[]).map((row) => normalizeSpin(row)), error: null };
  },

  async getLeaderboard(limit = 20) {
    if (!supabase) {
      return { data: [] as WheelLeaderboardEntry[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('wheel_get_leaderboard', {
      p_limit: limit,
    });

    if (error) {
      return { data: [] as WheelLeaderboardEntry[], error: new Error(error.message) };
    }

    return {
      data: ((data ?? []) as Partial<WheelLeaderboardEntry>[]).map((row) => normalizeLeaderboard(row)),
      error: null,
    };
  },

  async listChatMessages(limit = 100) {
    if (!supabase) {
      return { data: [] as WheelChatMessage[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('wheel_get_recent_chat', {
      p_limit: limit,
    });

    if (error) {
      return { data: [] as WheelChatMessage[], error: new Error(error.message) };
    }

    return {
      data: ((data ?? []) as Partial<WheelChatMessage>[]).map((row) => normalizeChat(row)).reverse(),
      error: null,
    };
  },

  async sendChatMessage(sessionToken: string | null, text: string) {
    if (!supabase || !sessionToken) {
      return { data: null as WheelChatMessage | null, error: new Error('Ban can dang nhap de chat.') };
    }

    const { data, error } = await supabase
      .rpc('wheel_send_chat_message', {
        p_session_token: sessionToken,
        p_text: text,
      })
      .single<WheelChatMessage>();

    if (error) {
      return { data: null as WheelChatMessage | null, error: new Error(error.message) };
    }

    return {
      data: normalizeChat(data),
      error: null,
    };
  },

  async adminUpdateSettings(sessionToken: string | null, payload: AdminWheelSettingsPayload) {
    if (!supabase || !sessionToken) {
      return { data: null as WheelPublicState | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_wheel_update_settings', {
      p_session_token: sessionToken,
      p_enabled: payload.enabled,
      p_min_bet: payload.min_bet,
      p_max_bet: payload.max_bet,
      p_cooldown_seconds: payload.cooldown_seconds,
      p_default_jackpot: payload.default_jackpot,
      p_segments: payload.segments,
      p_expected_version: payload.expected_version,
    });

    if (error) {
      return { data: null as WheelPublicState | null, error: new Error(error.message) };
    }

    return {
      data: normalizePublicState((data ?? null) as Partial<WheelPublicState>),
      error: null,
    };
  },

  async adminResetSettings(sessionToken: string | null, expectedVersion: number | null) {
    if (!supabase || !sessionToken) {
      return { data: null as WheelPublicState | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_wheel_reset_default_settings', {
      p_session_token: sessionToken,
      p_expected_version: expectedVersion,
    });

    if (error) {
      return { data: null as WheelPublicState | null, error: new Error(error.message) };
    }

    return {
      data: normalizePublicState((data ?? null) as Partial<WheelPublicState>),
      error: null,
    };
  },

  async adminGetHousePnl(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: null as WheelHousePnlInfo | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_wheel_get_house_pnl', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null as WheelHousePnlInfo | null, error: new Error(error.message) };
    }

    return {
      data: normalizeHousePnlInfo((data ?? null) as Partial<WheelHousePnlInfo>),
      error: null,
    };
  },

  createWheelChannel(onChange: () => void) {
    if (!supabase) {
      return null;
    }

    return supabase
      .channel(`wheel-spin-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.wheelSettings }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.wheelSegments }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.wheelSpins }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.wheelPlayerStats }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.wheelChatMessages }, onChange)
      .subscribe();
  },
};

