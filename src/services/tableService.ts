import { supabase } from '../lib/supabaseClient';
import type { PokerPlayer, PokerTable, PokerTableLobbyItem } from '../types';
import { normalizeLobbyItem, normalizePokerPlayer, normalizePokerTable } from './pokerMappers';

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

    const normalized = normalizePokerTable(data);
    if (!normalized) {
      return { data: null, error: new Error('Khong the tao ban poker.') };
    }
    return { data: normalized, error: null };
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
