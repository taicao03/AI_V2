import { supabase, TABLES } from '../lib/supabaseClient';
import type {
  AdminHorseLiveStats,
  Horse,
  HorseBet,
  HorseChatMessage,
  HorseLeaderboardEntry,
  HorsePublicState,
  HorseRace,
  HorseRaceSettings,
  HorseTopBettor,
  HorseWinner,
} from '../types/horse-racing';

function normalizeAssetPath(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) {
    return null;
  }

  const normalizedSlashes = raw.replace(/\\/g, '/');
  const lower = normalizedSlashes.toLowerCase();
  const publicIdx = lower.indexOf('/public/');

  if (publicIdx >= 0) {
    return normalizedSlashes.slice(publicIdx + '/public'.length);
  }

  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:') || lower.startsWith('blob:')) {
    return normalizedSlashes;
  }

  if (lower.startsWith('public/')) {
    return `/${normalizedSlashes.slice('public/'.length)}`;
  }

  if (lower.startsWith('./public/')) {
    return `/${normalizedSlashes.slice('./public/'.length)}`;
  }

  if (lower.startsWith('assets/')) {
    return `/${normalizedSlashes}`;
  }

  return normalizedSlashes.startsWith('/') ? normalizedSlashes : `/${normalizedSlashes}`;
}

function normalizeHorse(row: Partial<Horse>): Horse {
  return {
    horse_id: String(row.horse_id ?? ''),
    name: String(row.name ?? 'Unknown horse'),
    avatar: normalizeAssetPath(row.avatar ?? null),
    speed_rating: Number(row.speed_rating ?? 50),
    rarity: (row.rarity as Horse['rarity']) ?? 'common',
    odds_multiplier: Number(row.odds_multiplier ?? 1),
    win_probability: Number(row.win_probability ?? 0),
    enabled: Boolean(row.enabled ?? true),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeRace(row: Partial<HorseRace>): HorseRace {
  return {
    race_id: String(row.race_id ?? ''),
    race_number: Number(row.race_number ?? 0),
    status: (row.status as HorseRace['status']) ?? 'waiting',
    winner_horse_id: row.winner_horse_id ?? null,
    horses_snapshot: Array.isArray(row.horses_snapshot) ? row.horses_snapshot : [],
    settings_version: Number(row.settings_version ?? 1),
    betting_started_at: String(row.betting_started_at ?? new Date().toISOString()),
    betting_ends_at: String(row.betting_ends_at ?? new Date().toISOString()),
    locked_at: row.locked_at ?? null,
    lock_ends_at: row.lock_ends_at ?? null,
    race_started_at: row.race_started_at ?? null,
    race_ends_at: row.race_ends_at ?? null,
    started_at: row.started_at ?? null,
    ended_at: row.ended_at ?? null,
    created_by: row.created_by ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeSettings(row: Partial<HorseRaceSettings> | null): HorseRaceSettings | null {
  if (!row) {
    return null;
  }
  return {
    settings_id: Number(row.settings_id ?? 1),
    enabled: Boolean(row.enabled ?? true),
    min_bet: Number(row.min_bet ?? 10),
    max_bet: Number(row.max_bet ?? 100000),
    betting_duration: Number(row.betting_duration ?? 30),
    race_duration: Number(row.race_duration ?? 30),
    updated_by: row.updated_by ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    version: Number(row.version ?? 1),
  };
}

function normalizeBet(row: Partial<HorseBet>): HorseBet {
  return {
    bet_id: String(row.bet_id ?? ''),
    race_id: String(row.race_id ?? ''),
    user_id: String(row.user_id ?? ''),
    horse_id: String(row.horse_id ?? ''),
    bet_amount: Number(row.bet_amount ?? 0),
    odds_multiplier: Number(row.odds_multiplier ?? 0),
    status: (row.status as HorseBet['status']) ?? 'pending',
    result: (row.result as HorseBet['result']) ?? null,
    payout: Number(row.payout ?? 0),
    points_before: row.points_before === null || row.points_before === undefined ? null : Number(row.points_before),
    points_after: row.points_after === null || row.points_after === undefined ? null : Number(row.points_after),
    points_change: Number(row.points_change ?? 0),
    settled_at: row.settled_at ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeChat(row: Partial<HorseChatMessage>): HorseChatMessage {
  return {
    message_id: String(row.message_id ?? ''),
    user_id: row.user_id ?? null,
    display_name: String(row.display_name ?? 'Player'),
    avatar: normalizeAssetPath(row.avatar ?? null),
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

function normalizeLeaderboard(row: Partial<HorseLeaderboardEntry>): HorseLeaderboardEntry {
  return {
    user_id: String(row.user_id ?? ''),
    account_name: String(row.account_name ?? 'player'),
    display_name: String(row.display_name ?? 'Player'),
    avatar_url: row.avatar_url ?? null,
    total_winnings: Number(row.total_winnings ?? 0),
    biggest_win: Number(row.biggest_win ?? 0),
    total_bets: Number(row.total_bets ?? 0),
    win_count: Number(row.win_count ?? 0),
    best_streak: Number(row.best_streak ?? 0),
    current_streak: Number(row.current_streak ?? 0),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeWinner(row: Partial<HorseWinner>): HorseWinner {
  return {
    race_id: String(row.race_id ?? ''),
    race_number: Number(row.race_number ?? 0),
    winner_horse_id: row.winner_horse_id ?? null,
    winner_name: row.winner_name ?? null,
    winner_avatar: normalizeAssetPath(row.winner_avatar ?? null),
    ended_at: row.ended_at ?? null,
  };
}

function normalizeTopBettor(row: Partial<HorseTopBettor>): HorseTopBettor {
  return {
    user_id: String(row.user_id ?? ''),
    account_name: String(row.account_name ?? 'player'),
    display_name: String(row.display_name ?? 'Player'),
    avatar_url: row.avatar_url ?? null,
    total_amount: Number(row.total_amount ?? 0),
  };
}

function normalizePublicState(payload: Partial<HorsePublicState> | null): HorsePublicState | null {
  if (!payload) {
    return null;
  }

  return {
    settings: normalizeSettings(payload.settings ?? null),
    horses: Array.isArray(payload.horses) ? payload.horses.map((row) => normalizeHorse(row)) : [],
    active_race: payload.active_race ? normalizeRace(payload.active_race) : null,
    recent_races: Array.isArray(payload.recent_races) ? payload.recent_races.map((row) => normalizeRace(row)) : [],
    recent_winners: Array.isArray(payload.recent_winners) ? payload.recent_winners.map((row) => normalizeWinner(row)) : [],
    top_bettors: Array.isArray(payload.top_bettors) ? payload.top_bettors.map((row) => normalizeTopBettor(row)) : [],
  };
}

export const horseRaceService = {
  async tickRounds() {
    if (!supabase) {
      return { data: null as HorseRace | null, error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('horse_tick_rounds');
    if (error) {
      return { data: null as HorseRace | null, error: new Error(error.message) };
    }

    return { data: data ? normalizeRace(data as Partial<HorseRace>) : null, error: null };
  },

  async getPublicState() {
    if (!supabase) {
      return { data: null as HorsePublicState | null, error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('horse_get_public_state');
    if (error) {
      return { data: null as HorsePublicState | null, error: new Error(error.message) };
    }

    return { data: normalizePublicState((data ?? null) as Partial<HorsePublicState> | null), error: null };
  },

  async placeBet(sessionToken: string | null, horseId: string, betAmount: number) {
    if (!supabase || !sessionToken) {
      return { data: null as HorseBet | null, error: new Error('Ban can dang nhap de dat cuoc.') };
    }

    const { data, error } = await supabase
      .rpc('horse_place_bet', {
        p_session_token: sessionToken,
        p_horse_id: horseId,
        p_bet_amount: betAmount,
      })
      .single<HorseBet>();

    if (error) {
      return { data: null as HorseBet | null, error: new Error(error.message) };
    }

    return { data: normalizeBet(data), error: null };
  },

  async getMyBets(sessionToken: string | null, limit = 50) {
    if (!supabase || !sessionToken) {
      return { data: [] as HorseBet[], error: new Error('Ban can dang nhap de xem lich su cuoc.') };
    }

    const { data, error } = await supabase.rpc('horse_get_my_bets', {
      p_session_token: sessionToken,
      p_limit: Math.max(1, Math.min(200, limit)),
    });

    if (error) {
      return { data: [] as HorseBet[], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<HorseBet>[]).map((row) => normalizeBet(row)), error: null };
  },

  async getRecentRaces(limit = 30) {
    if (!supabase) {
      return { data: [] as HorseRace[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('horse_get_recent_races', {
      p_limit: Math.max(1, Math.min(100, limit)),
    });

    if (error) {
      return { data: [] as HorseRace[], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<HorseRace>[]).map((row) => normalizeRace(row)), error: null };
  },

  async getRecentWinners(limit = 20) {
    if (!supabase) {
      return { data: [] as HorseWinner[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('horse_get_recent_winners', {
      p_limit: Math.max(1, Math.min(100, limit)),
    });

    if (error) {
      return { data: [] as HorseWinner[], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<HorseWinner>[]).map((row) => normalizeWinner(row)), error: null };
  },

  async getLeaderboard(limit = 20) {
    if (!supabase) {
      return { data: [] as HorseLeaderboardEntry[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('horse_get_leaderboard', {
      p_limit: Math.max(1, Math.min(100, limit)),
    });

    if (error) {
      return { data: [] as HorseLeaderboardEntry[], error: new Error(error.message) };
    }

    return {
      data: ((data ?? []) as Partial<HorseLeaderboardEntry>[]).map((row) => normalizeLeaderboard(row)),
      error: null,
    };
  },

  async getRecentChat(limit = 100) {
    if (!supabase) {
      return { data: [] as HorseChatMessage[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('horse_get_recent_chat', {
      p_limit: Math.max(1, Math.min(200, limit)),
    });

    if (error) {
      return { data: [] as HorseChatMessage[], error: new Error(error.message) };
    }

    return {
      data: ((data ?? []) as Partial<HorseChatMessage>[]).map((row) => normalizeChat(row)).reverse(),
      error: null,
    };
  },

  async sendChatMessage(sessionToken: string | null, text: string) {
    if (!supabase || !sessionToken) {
      return { data: null as HorseChatMessage | null, error: new Error('Ban can dang nhap de chat.') };
    }

    const { data, error } = await supabase
      .rpc('horse_send_chat_message', {
        p_session_token: sessionToken,
        p_text: text,
      })
      .single<HorseChatMessage>();

    if (error) {
      return { data: null as HorseChatMessage | null, error: new Error(error.message) };
    }

    return { data: normalizeChat(data), error: null };
  },

  async adminGetState(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: null as HorsePublicState | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_horse_get_state', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null as HorsePublicState | null, error: new Error(error.message) };
    }

    return { data: normalizePublicState((data ?? null) as Partial<HorsePublicState> | null), error: null };
  },

  async adminUpdateSettings(
    sessionToken: string | null,
    payload: {
      enabled: boolean;
      min_bet: number;
      max_bet: number;
      betting_duration: number;
      race_duration: number;
      expected_version: number | null;
    },
  ) {
    if (!supabase || !sessionToken) {
      return { data: null as HorseRaceSettings | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_horse_update_settings', {
        p_session_token: sessionToken,
        p_enabled: payload.enabled,
        p_min_bet: Math.max(1, Math.min(2147483647, Math.trunc(payload.min_bet))),
        p_max_bet: Math.max(1, Math.min(2147483647, Math.trunc(payload.max_bet))),
        p_betting_duration: payload.betting_duration,
        p_race_duration: payload.race_duration,
        p_expected_version: payload.expected_version,
      })
      .single<HorseRaceSettings>();

    if (error) {
      return { data: null as HorseRaceSettings | null, error: new Error(error.message) };
    }

    return { data: normalizeSettings(data), error: null };
  },

  async adminUpsertHorse(
    sessionToken: string | null,
    payload: {
      horse_id: string | null;
      name: string;
      avatar: string | null;
      speed_rating: number;
      rarity: string;
      odds_multiplier: number;
      win_probability: number;
      enabled: boolean;
      sort_order: number;
    },
  ) {
    if (!supabase || !sessionToken) {
      return { data: null as Horse | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_horse_upsert_horse', {
        p_session_token: sessionToken,
        p_horse_id: payload.horse_id,
        p_name: payload.name,
        p_avatar: payload.avatar,
        p_speed_rating: payload.speed_rating,
        p_rarity: payload.rarity,
        p_odds_multiplier: payload.odds_multiplier,
        p_win_probability: payload.win_probability,
        p_enabled: payload.enabled,
        p_sort_order: payload.sort_order,
      })
      .single<Horse>();

    if (error) {
      return { data: null as Horse | null, error: new Error(error.message) };
    }

    return { data: normalizeHorse(data), error: null };
  },

  async adminDeleteHorse(sessionToken: string | null, horseId: string) {
    if (!supabase || !sessionToken) {
      return { data: null as Horse | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_horse_delete_horse', {
        p_session_token: sessionToken,
        p_horse_id: horseId,
      })
      .single<Horse>();

    if (error) {
      return { data: null as Horse | null, error: new Error(error.message) };
    }

    return { data: normalizeHorse(data), error: null };
  },

  async adminForceEndRace(sessionToken: string | null, raceId: string, note?: string) {
    if (!supabase || !sessionToken) {
      return { data: null as HorseRace | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_horse_force_end_race', {
        p_session_token: sessionToken,
        p_race_id: raceId,
        p_note: note ?? null,
      })
      .single<HorseRace>();

    if (error) {
      return { data: null as HorseRace | null, error: new Error(error.message) };
    }

    return { data: normalizeRace(data), error: null };
  },

  async adminGetLiveStats(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: null as AdminHorseLiveStats | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_horse_get_live_stats', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null as AdminHorseLiveStats | null, error: new Error(error.message) };
    }

    return { data: (data ?? null) as AdminHorseLiveStats | null, error: null };
  },

  createHorseChannel(onChange: () => void) {
    if (!supabase) {
      return null;
    }

    return supabase
      .channel(`horse-racing-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.horseRaceSettings }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.horses }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.horseRaces }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.horseBets }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.horseChatMessages }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.horsePlayerStats }, onChange)
      .subscribe();
  },
};
