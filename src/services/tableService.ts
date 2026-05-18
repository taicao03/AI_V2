import { supabase } from '../lib/supabaseClient';
import type { PokerPlayer, PokerTable, PokerTableLobbyItem } from '../types';

function normalizePokerTable(row: Partial<PokerTable>): PokerTable {
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

function normalizeLobbyItem(row: Partial<PokerTableLobbyItem>): PokerTableLobbyItem {
  return {
    table_id: String(row.table_id ?? ''),
    name: String(row.name ?? 'Poker Table'),
    room_code: row.room_code ?? null,
    is_private: Boolean(row.is_private ?? false),
    max_players: Number(row.max_players ?? 6),
    min_bet: Number(row.min_bet ?? 10),
    max_bet: Number(row.max_bet ?? 1000),
    status: (row.status as PokerTableLobbyItem['status']) ?? 'waiting',
    player_count: Number(row.player_count ?? 0),
    ready_count: Number(row.ready_count ?? 0),
    spectator_count: Number(row.spectator_count ?? 0),
    created_by: row.created_by ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

export const tableService = {
  async listLobbyTables(sessionToken: string | null) {
    if (!supabase) {
      return { data: [] as PokerTableLobbyItem[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('poker_list_lobby_tables', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: [] as PokerTableLobbyItem[], error: new Error(error.message) };
    }

    return {
      data: ((data ?? []) as Partial<PokerTableLobbyItem>[]).map((row) => normalizeLobbyItem(row)),
      error: null,
    };
  },

  async createTable(
    sessionToken: string | null,
    payload: { name: string; maxPlayers: number; minBet: number; maxBet: number; isPrivate: boolean },
  ) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de tao ban poker.') };
    }

    const { data, error } = await supabase
      .rpc('poker_create_table', {
        p_session_token: sessionToken,
        p_name: payload.name,
        p_max_players: payload.maxPlayers,
        p_min_bet: payload.minBet,
        p_max_bet: payload.maxBet,
        p_is_private: payload.isPrivate,
      })
      .single<PokerTable>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizePokerTable(data), error: null };
  },

  async joinTable(
    sessionToken: string | null,
    payload: { tableId?: string; roomCode?: string; asSpectator?: boolean },
  ) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de vao ban poker.') };
    }

    const { data, error } = await supabase
      .rpc('poker_join_table', {
        p_session_token: sessionToken,
        p_table_id: payload.tableId ?? null,
        p_room_code: payload.roomCode ?? null,
        p_as_spectator: Boolean(payload.asSpectator),
      })
      .single<PokerPlayer>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizePokerPlayer(data), error: null };
  },

  async leaveTable(sessionToken: string | null, tableId: string) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de roi ban poker.') };
    }

    const { data, error } = await supabase
      .rpc('poker_leave_table', {
        p_session_token: sessionToken,
        p_table_id: tableId,
      })
      .single<PokerPlayer>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizePokerPlayer(data), error: null };
  },

  async setBet(sessionToken: string | null, tableId: string, betAmount: number) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de dat diem poker.') };
    }

    const { data, error } = await supabase
      .rpc('poker_set_bet', {
        p_session_token: sessionToken,
        p_table_id: tableId,
        p_bet_amount: betAmount,
      })
      .single<PokerPlayer>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizePokerPlayer(data), error: null };
  },

  async setReady(sessionToken: string | null, tableId: string, isReady: boolean) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de ready poker.') };
    }

    const rpcName = isReady ? 'poker_set_ready' : 'poker_set_unready';
    const payload = isReady
      ? { p_session_token: sessionToken, p_table_id: tableId, p_is_ready: true }
      : { p_session_token: sessionToken, p_table_id: tableId };

    const { data, error } = await supabase.rpc(rpcName, payload).single<PokerPlayer>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizePokerPlayer(data), error: null };
  },

  async heartbeat(sessionToken: string | null, tableId: string) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de giu ket noi poker.') };
    }

    const { data, error } = await supabase
      .rpc('poker_heartbeat', {
        p_session_token: sessionToken,
        p_table_id: tableId,
      })
      .single<PokerPlayer>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizePokerPlayer(data), error: null };
  },

  async takeAction(
    sessionToken: string | null,
    tableId: string,
    action: 'fold' | 'check' | 'call' | 'raise' | 'all-in',
    raiseTo?: number,
  ) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de hanh dong.') };
    }

    const { data, error } = await supabase
      .rpc('poker_take_action', {
        p_session_token: sessionToken,
        p_table_id: tableId,
        p_action: action,
        p_raise_to: raiseTo ?? null,
      })
      .single<PokerPlayer>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizePokerPlayer(data), error: null };
  },

  async addNPCs(sessionToken: string | null, tableId: string, count = 1) {
    if (!supabase || !sessionToken) {
      return { data: 0, error: new Error('Ban can dang nhap de them NPC.') };
    }

    const { data, error } = await supabase.rpc('poker_add_npcs', {
      p_session_token: sessionToken,
      p_table_id: tableId,
      p_count: Math.max(1, Math.trunc(count)),
    });

    if (error) {
      return { data: 0, error: new Error(error.message) };
    }

    return { data: Number(data ?? 0), error: null };
  },

  async hostKickPlayer(sessionToken: string | null, tableId: string, targetUserId: string) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de kick player.') };
    }

    const { data, error } = await supabase
      .rpc('poker_host_kick_player', {
        p_session_token: sessionToken,
        p_table_id: tableId,
        p_target_user_id: targetUserId,
      })
      .single<PokerPlayer>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizePokerPlayer(data), error: null };
  },
};

export { normalizePokerTable, normalizePokerPlayer, normalizeLobbyItem };
