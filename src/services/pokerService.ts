import { supabase, TABLES } from '../lib/supabaseClient';
import type {
  PokerChatMessage,
  PokerHand,
  PokerPlayer,
  PokerLeaderboardEntry,
  PokerResult,
  PokerRound,
  PokerTable,
  PokerTableState,
} from '../types';

function normalizePokerTable(row: Partial<PokerTable> | null): PokerTable | null {
  if (!row) {
    return null;
  }

  return {
    table_id: String(row.table_id ?? ''),
    name: String(row.name ?? 'Poker Table'),
    room_code: row.room_code ?? null,
    is_private: Boolean(row.is_private ?? false),
    max_players: Number(row.max_players ?? 6),
    min_bet: Number(row.min_bet ?? 10),
    max_bet: Number(row.max_bet ?? 1000),
    status: (row.status as PokerTable['status']) ?? 'waiting',
    created_by: row.created_by ?? null,
    active_round_id: row.active_round_id ?? null,
    countdown_ends_at: row.countdown_ends_at ?? null,
    last_activity_at: String(row.last_activity_at ?? new Date().toISOString()),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizePokerRound(row: Partial<PokerRound> | null): PokerRound | null {
  if (!row) {
    return null;
  }

  return {
    round_id: String(row.round_id ?? ''),
    table_id: String(row.table_id ?? ''),
    status: (row.status as PokerRound['status']) ?? 'playing',
    deck_hash: row.deck_hash ?? null,
    started_at: String(row.started_at ?? new Date().toISOString()),
    round_phase: (row.round_phase as PokerRound['round_phase']) ?? 'round1',
    phase_ends_at: row.phase_ends_at ?? null,
    community_cards: Array.isArray(row.community_cards) ? row.community_cards.map(String) : [],
    community_revealed: Number(row.community_revealed ?? 0),
    showdown_at: row.showdown_at ?? null,
    completed_at: row.completed_at ?? null,
    winner_ids: Array.isArray(row.winner_ids) ? row.winner_ids.map(String) : [],
    pot_amount: Number(row.pot_amount ?? 0),
    current_bet: Number(row.current_bet ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function normalizePokerPlayer(row: Partial<PokerPlayer>): PokerPlayer {
  return {
    table_player_id: row.table_player_id,
    table_id: String(row.table_id ?? ''),
    user_id: String(row.user_id ?? ''),
    seat_order: row.seat_order ?? null,
    is_bot: Boolean(row.is_bot ?? false),
    npc_personality: (row.npc_personality as PokerPlayer['npc_personality']) ?? null,
    is_ready: Boolean(row.is_ready ?? false),
    is_spectator: Boolean(row.is_spectator ?? false),
    current_bet: Number(row.current_bet ?? 0),
    points: Number(row.points ?? 0),
    locked_points: Number(row.locked_points ?? 0),
    available_points: Number(row.available_points ?? 0),
    in_round: Boolean(row.in_round ?? false),
    joined_at: row.joined_at,
    left_at: row.left_at ?? null,
    last_heartbeat_at: String(row.last_heartbeat_at ?? new Date().toISOString()),
    updated_at: row.updated_at,
    display_name: row.display_name,
    avatar_url: row.avatar_url ?? null,
    is_host: Boolean(row.is_host ?? false),
    is_me: row.is_me,
    has_folded: Boolean(row.has_folded ?? false),
    is_all_in: Boolean(row.is_all_in ?? false),
    total_bet: Number(row.total_bet ?? 0),
    round_bet: Number(row.round_bet ?? 0),
    last_action: row.last_action ?? null,
    acted_in_phase: Boolean(row.acted_in_phase ?? false),
    player_status: (row.player_status as PokerPlayer['player_status']) ?? 'ready',
  };
}

function normalizePokerHand(row: Partial<PokerHand>): PokerHand {
  return {
    user_id: String(row.user_id ?? ''),
    cards: Array.isArray(row.cards) ? row.cards.map(String) : [],
    hand_rank: (row.hand_rank as PokerHand['hand_rank']) ?? null,
    hand_name: row.hand_name ?? null,
    hand_score: row.hand_score === null || row.hand_score === undefined ? null : Number(row.hand_score),
    is_winner: Boolean(row.is_winner ?? false),
    revealed_at: row.revealed_at ?? null,
  };
}

function normalizePokerResult(row: Partial<PokerResult>): PokerResult {
  return {
    result_id: row.result_id,
    round_id: String(row.round_id ?? ''),
    table_id: String(row.table_id ?? ''),
    user_id: String(row.user_id ?? ''),
    is_winner: Boolean(row.is_winner ?? false),
    rank_position: Number(row.rank_position ?? 0),
    payout_amount: Number(row.payout_amount ?? 0),
    hand_name: row.hand_name ?? null,
    hand_rank: (row.hand_rank as PokerResult['hand_rank']) ?? null,
    hand_score: row.hand_score === null || row.hand_score === undefined ? null : Number(row.hand_score),
    created_at: row.created_at,
  };
}

function normalizePokerChat(row: Partial<PokerChatMessage>): PokerChatMessage {
  return {
    message_id: String(row.message_id ?? ''),
    table_id: String(row.table_id ?? ''),
    user_id: String(row.user_id ?? ''),
    display_name: String(row.display_name ?? 'Player'),
    avatar: row.avatar ?? null,
    role: row.role === 'admin' ? 'admin' : 'user',
    vip_level: Number(row.vip_level ?? 0),
    text: String(row.text ?? ''),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: row.updated_at ?? null,
    deleted_at: row.deleted_at ?? null,
    deleted_by: row.deleted_by ?? null,
    is_deleted: Boolean(row.is_deleted ?? false),
  };
}

export const pokerService = {
  async getTableState(sessionToken: string | null, tableId: string) {
    if (!supabase || !sessionToken) {
      return { data: null as PokerTableState | null, error: new Error('Ban can dang nhap de vao ban poker.') };
    }

    const { data, error } = await supabase.rpc('poker_get_table_state', {
      p_session_token: sessionToken,
      p_table_id: tableId,
    });

    if (error) {
      return { data: null as PokerTableState | null, error: new Error(error.message) };
    }

    const payload = (data ?? {}) as Partial<PokerTableState>;
    const table = normalizePokerTable((payload.table as Partial<PokerTable> | null) ?? null);

    if (!table) {
      return { data: null as PokerTableState | null, error: new Error('Ban poker khong ton tai.') };
    }

    return {
      data: {
        table,
        round: normalizePokerRound((payload.round as Partial<PokerRound> | null) ?? null),
        players: Array.isArray(payload.players) ? payload.players.map((item) => normalizePokerPlayer(item)) : [],
        hands: Array.isArray(payload.hands) ? payload.hands.map((item) => normalizePokerHand(item)) : [],
        recent_results: Array.isArray(payload.recent_results)
          ? payload.recent_results.map((item) => normalizePokerResult(item))
          : [],
        chat: Array.isArray(payload.chat) ? payload.chat.map((item) => normalizePokerChat(item)) : [],
      },
      error: null,
    };
  },

  async sendTableChat(sessionToken: string | null, tableId: string, text: string) {
    if (!supabase || !sessionToken) {
      return { data: null as PokerChatMessage | null, error: new Error('Ban can dang nhap de chat.') };
    }

    const { data, error } = await supabase
      .rpc('poker_send_chat_message', {
        p_session_token: sessionToken,
        p_table_id: tableId,
        p_text: text,
      })
      .single<PokerChatMessage>();

    if (error) {
      return { data: null as PokerChatMessage | null, error: new Error(error.message) };
    }

    return { data: normalizePokerChat(data), error: null };
  },

  async tickTables(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase.rpc('poker_tick_tables', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data ?? []) as { table_id: string; status: string; active_round_id: string | null }[], error: null };
  },

  async getLeaderboard() {
    if (!supabase) {
      return { data: [] as PokerLeaderboardEntry[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('poker_get_leaderboard');

    if (error) {
      return { data: [] as PokerLeaderboardEntry[], error: new Error(error.message) };
    }

    return {
      data: ((data ?? []) as Partial<PokerLeaderboardEntry>[]).map((row) => ({
        user_id: String(row.user_id ?? ''),
        account_name: String(row.account_name ?? 'player'),
        display_name: String(row.display_name ?? 'Demo player'),
        avatar_url: row.avatar_url ?? null,
        rounds_played: Number(row.rounds_played ?? 0),
        rounds_won: Number(row.rounds_won ?? 0),
        win_rate: Number(row.win_rate ?? 0),
        points_won: Number(row.points_won ?? 0),
        points_lost: Number(row.points_lost ?? 0),
        net_points: Number(row.net_points ?? 0),
        updated_at: String(row.updated_at ?? new Date().toISOString()),
      })),
      error: null,
    };
  },

  createTableChannel(tableId: string, onChange: () => void) {
    if (!supabase) {
      return null;
    }

    const channel = supabase
      .channel(`poker-table-${tableId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.pokerTables, filter: `table_id=eq.${tableId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.pokerPlayers, filter: `table_id=eq.${tableId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.pokerRounds, filter: `table_id=eq.${tableId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.pokerHands, filter: `table_id=eq.${tableId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.pokerResults, filter: `table_id=eq.${tableId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.pokerChatMessages, filter: `table_id=eq.${tableId}` }, onChange)
      .subscribe();

    return channel;
  },
};
