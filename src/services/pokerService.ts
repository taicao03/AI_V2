import { supabase, TABLES } from '../lib/supabaseClient';
import type {
  PokerChatMessage,
  PokerLeaderboardEntry,
  PokerRound,
  PokerTable,
  PokerTableState,
} from '../types';
import {
  normalizePokerChat,
  normalizePokerHand,
  normalizePokerPlayer,
  normalizePokerResult,
  normalizePokerRound,
  normalizePokerTable,
} from './pokerMappers';

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

  createTableChannel(tableId: string, onChange: () => void, onStatus?: (status: string) => void) {
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
      .subscribe((status) => {
        onStatus?.(status);
      });

    return channel;
  },
};
