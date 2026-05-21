import { createClient } from '@supabase/supabase-js';
import type {
  BetHistoryItem,
  DiceRoundBetTotals,
  DiceTuple,
  DiceRound,
  LeaderboardUser,
  PlaceBetResult,
  Prediction,
  PredictionType,
  RoundStatus,
  RoundTickResult,
  UserProfile,
} from '../types';
import { normalizeOutcome, predictionToRpc, toDiceTuple } from './dice';

export const TABLES = {
  users: 'users',
  rounds: 'rounds',
  bets: 'bets',
  leaderboard: 'leaderboard',
  betHistory: 'bet_history',
  chatMessages: 'chat_messages',
  pointsTransactions: 'points_transactions',
  adminNotifications: 'admin_notifications',
  pokerTables: 'poker_tables',
  pokerPlayers: 'poker_players',
  pokerRounds: 'poker_rounds',
  pokerHands: 'poker_hands',
  pokerBets: 'poker_bets',
  pokerResults: 'poker_results',
  pokerChatMessages: 'poker_chat_messages',
  pokerPlayerStats: 'poker_player_stats',
  rrRooms: 'rr_rooms',
  rrPlayers: 'rr_players',
  rrRounds: 'rr_rounds',
  rrActions: 'rr_actions',
  rrChatMessages: 'rr_chat_messages',
  rrGameSettings: 'rr_game_settings',
  wheelSettings: 'wheel_settings',
  wheelSegments: 'wheel_segments',
  wheelSpins: 'wheel_spins',
  wheelChatMessages: 'wheel_chat_messages',
  wheelPlayerStats: 'wheel_player_stats',
} as const;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

type RpcPlaceBetRow = {
  bet_id: string;
  round_id: string;
  prediction_type: PredictionType;
  prediction_value: string;
  bet_amount: number;
  status: 'pending' | 'settled' | 'cancelled';
  result: 'win' | 'lose' | null;
  points_change: number;
  created_at: string;
  round_starts_at: string;
  round_ends_at: string;
  available_points: number;
};

type BetHistoryRow = {
  bet_id: string;
  user_id: string;
  round_id: string;
  prediction_type: PredictionType;
  prediction_value: string;
  bet_amount: number;
  payout_multiplier: number;
  status: 'pending' | 'settled' | 'cancelled';
  result: 'win' | 'lose' | null;
  points_before: number | null;
  points_after: number | null;
  points_change: number;
  created_at: string;
  settled_at: string | null;
  round_status: RoundStatus;
  dice: unknown;
  total: number | null;
  result_type: unknown;
  starts_at: string;
  ends_at: string;
  round_created_at: string;
  display_name: string | null;
  avatar_url: string | null;
};

type RoundRow = {
  round_id: string;
  status: RoundStatus;
  dice: unknown;
  total: number | null;
  result_type: unknown;
  starts_at: string;
  ends_at: string;
  settled_at: string | null;
  completed_at: string | null;
  settled_by: string | null;
  is_cancelled: boolean;
  created_at: string;
  created_by: string | null;
};

type RoundTickRow = {
  settled_round_id: string | null;
  active_round_id: string;
};

export function normalizeProfile(row: Partial<UserProfile>): UserProfile {
  return {
    uid: String(row.uid ?? ''),
    account_name: String(row.account_name ?? row.email?.split('@')[0] ?? 'player'),
    display_name: String(row.display_name ?? 'Demo player'),
    email: String(row.email ?? ''),
    avatar_url: row.avatar_url ?? null,
    vip_level: Math.max(0, Math.min(10, Number(row.vip_level ?? 0))),
    role: row.role === 'admin' ? 'admin' : 'user',
    points: Number(row.points ?? 0),
    locked_points: Number(row.locked_points ?? 0),
    total_bets: Number(row.total_bets ?? 0),
    total_wins: Number(row.total_wins ?? 0),
    total_losses: Number(row.total_losses ?? 0),
    total_points_won: Number(row.total_points_won ?? 0),
    total_points_lost: Number(row.total_points_lost ?? 0),
    is_banned: Boolean(row.is_banned ?? false),
    ban_reason: row.ban_reason ?? null,
    banned_at: row.banned_at ?? null,
    banned_by: row.banned_by ?? null,
    points_updated_at: row.points_updated_at ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    last_login_at: row.last_login_at ?? null,
    last_demo_refill_at: row.last_demo_refill_at ?? null,
  };
}

export function normalizeLeaderboardUser(row: Partial<LeaderboardUser>): LeaderboardUser {
  return {
    uid: String(row.uid ?? ''),
    account_name: String(row.account_name ?? 'player'),
    display_name: String(row.display_name ?? 'Demo player'),
    avatar_url: row.avatar_url ?? null,
    vip_level: Math.max(0, Math.min(10, Number(row.vip_level ?? 0))),
    points: Number(row.points ?? 0),
    locked_points: Number(row.locked_points ?? 0),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

export function normalizePlaceBetResult(row: RpcPlaceBetRow): PlaceBetResult {
  return {
    bet_id: row.bet_id,
    round_id: row.round_id,
    prediction_type: row.prediction_type,
    prediction_value: String(row.prediction_value),
    bet_amount: Number(row.bet_amount),
    status: row.status,
    result: row.result,
    points_change: Number(row.points_change),
    created_at: row.created_at,
    round_starts_at: row.round_starts_at,
    round_ends_at: row.round_ends_at,
    available_points: Number(row.available_points),
  };
}

export function normalizeBetHistory(row: BetHistoryRow): BetHistoryItem {
  const dice = Array.isArray(row.dice) ? toDiceTuple(row.dice) : null;
  const total = typeof row.total === 'number' ? Number(row.total) : null;

  return {
    bet_id: row.bet_id,
    user_id: row.user_id,
    round_id: row.round_id,
    prediction_type: row.prediction_type,
    prediction_value: String(row.prediction_value),
    bet_amount: Number(row.bet_amount),
    result: row.result,
    payout_multiplier: Number(row.payout_multiplier ?? 1),
    status: row.status,
    points_before: row.points_before ?? null,
    points_after: row.points_after ?? null,
    points_change: Number(row.points_change),
    created_at: row.created_at,
    settled_at: row.settled_at,
    round_status: row.round_status,
    dice,
    total,
    result_type: total === null ? null : normalizeOutcome(row.result_type, total),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    round_created_at: row.round_created_at,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
  };
}

export function normalizeRound(row: RoundRow): DiceRound {
  const dice = Array.isArray(row.dice) ? toDiceTuple(row.dice) : null;
  const total = typeof row.total === 'number' ? Number(row.total) : null;

  return {
    round_id: row.round_id,
    status: row.status,
    dice,
    total,
    result_type: total === null ? null : normalizeOutcome(row.result_type, total),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    settled_at: row.settled_at,
    completed_at: row.completed_at ?? row.settled_at,
    settled_by: row.settled_by ?? null,
    is_cancelled: Boolean(row.is_cancelled ?? row.status === 'cancelled'),
    created_at: row.created_at,
    created_by: row.created_by,
  };
}

export async function placeBet(
  prediction: Prediction,
  betAmount: number,
  sessionToken: string | null,
): Promise<{ data: PlaceBetResult | null; error: Error | null }> {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Chua cau hinh Supabase. Vui long tao file .env.local.'),
    };
  }

  if (!sessionToken) {
    return {
      data: null,
      error: new Error('Ban can dang nhap de dat demo points.'),
    };
  }

  const { predictionType, predictionValue } = predictionToRpc(prediction);
  const { data, error } = await supabase
    .rpc('place_bet', {
      p_session_token: sessionToken,
      p_prediction_type: predictionType,
      p_prediction_value: predictionValue,
      p_bet_amount: betAmount,
    })
    .single<RpcPlaceBetRow>();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: normalizePlaceBetResult(data), error: null };
}

export async function getCurrentRound(): Promise<{ data: DiceRound | null; error: Error | null }> {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Chua cau hinh Supabase.'),
    };
  }

  const { data, error } = await supabase.rpc('get_current_round').single<RoundRow>();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: normalizeRound(data), error: null };
}

export async function getRoundBetTotals(roundId: string | null): Promise<{ data: DiceRoundBetTotals; error: Error | null }> {
  if (!supabase) {
    return {
      data: { tai: 0, xiu: 0, total: 0 },
      error: new Error('Chua cau hinh Supabase.'),
    };
  }

  if (!roundId) {
    return { data: { tai: 0, xiu: 0, total: 0 }, error: null };
  }

  const { data, error } = await supabase
    .from(TABLES.bets)
    .select('prediction_type, prediction_value, bet_amount')
    .eq('round_id', roundId)
    .in('status', ['pending', 'settled']);

  if (error) {
    return { data: { tai: 0, xiu: 0, total: 0 }, error: new Error(error.message) };
  }

  let tai = 0;
  let xiu = 0;

  for (const row of data ?? []) {
    const predictionType = String(row.prediction_type ?? '');
    const predictionValue = String(row.prediction_value ?? '').toLowerCase();
    const betAmount = Number(row.bet_amount ?? 0);

    if (predictionType !== 'tai_xiu' || !Number.isFinite(betAmount) || betAmount <= 0) {
      continue;
    }

    if (predictionValue === 'tai') {
      tai += betAmount;
    } else if (predictionValue === 'xiu') {
      xiu += betAmount;
    }
  }

  return { data: { tai, xiu, total: tai + xiu }, error: null };
}

export async function settleDueRounds(): Promise<{ data: RoundTickResult[]; error: Error | null }> {
  if (!supabase) {
    return {
      data: [],
      error: new Error('Chua cau hinh Supabase.'),
    };
  }

  const { data, error } = await supabase.rpc('settle_due_rounds');

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  return {
    data: ((data ?? []) as RoundTickRow[]).map((row) => ({
      settled_round_id: row.settled_round_id,
      active_round_id: row.active_round_id,
    })),
    error: null,
  };
}

export async function claimDemoPoints(sessionToken: string | null): Promise<{ points: number | null; error: Error | null }> {
  if (!supabase) {
    return {
      points: null,
      error: new Error('Chua cau hinh Supabase.'),
    };
  }

  if (!sessionToken) {
    return {
      points: null,
      error: new Error('Ban can dang nhap de nhan diem demo.'),
    };
  }

  const { data, error } = await supabase
    .rpc('claim_demo_points', {
      p_session_token: sessionToken,
    })
    .single<{ points: number }>();

  if (error) {
    return { points: null, error: new Error(error.message) };
  }

  return { points: Number(data.points), error: null };
}

export type { BetHistoryRow, RoundRow, RpcPlaceBetRow };
