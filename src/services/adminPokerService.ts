import { supabase } from '../lib/supabaseClient';
import type { PokerHand, PokerRound, PokerTable } from '../types';

function normalizePokerTable(row: Partial<PokerTable>): PokerTable {
  return {
    table_id: String(row.table_id ?? ''),
    name: String(row.name ?? ''),
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

function normalizeRound(row: Partial<PokerRound>): PokerRound {
  return {
    round_id: String(row.round_id ?? ''),
    table_id: String(row.table_id ?? ''),
    status: (row.status as PokerRound['status']) ?? 'playing',
    deck_hash: row.deck_hash ?? null,
    started_at: String(row.started_at ?? new Date().toISOString()),
    showdown_at: row.showdown_at ?? null,
    completed_at: row.completed_at ?? null,
    winner_ids: Array.isArray(row.winner_ids) ? row.winner_ids.map(String) : [],
    pot_amount: Number(row.pot_amount ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export const adminPokerService = {
  async listActiveTables(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: [] as PokerTable[], error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_poker_list_active_tables', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: [] as PokerTable[], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<PokerTable>[]).map((row) => normalizePokerTable(row)), error: null };
  },

  async forceCloseTable(sessionToken: string | null, tableId: string) {
    if (!supabase || !sessionToken) {
      return { data: null as PokerTable | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_poker_force_close_table', {
        p_session_token: sessionToken,
        p_table_id: tableId,
      })
      .single<PokerTable>();

    if (error) {
      return { data: null as PokerTable | null, error: new Error(error.message) };
    }

    return { data: normalizePokerTable(data), error: null };
  },

  async cancelRoundRefund(sessionToken: string | null, roundId: string, note?: string) {
    if (!supabase || !sessionToken) {
      return { data: null as PokerRound | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_poker_cancel_round_refund', {
        p_session_token: sessionToken,
        p_round_id: roundId,
        p_note: note ?? null,
      })
      .single<PokerRound>();

    if (error) {
      return { data: null as PokerRound | null, error: new Error(error.message) };
    }

    return { data: normalizeRound(data), error: null };
  },

  async debugRoundHands(sessionToken: string | null, roundId: string) {
    if (!supabase || !sessionToken) {
      return { data: [] as PokerHand[], error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_poker_round_debug_hands', {
      p_session_token: sessionToken,
      p_round_id: roundId,
    });

    if (error) {
      return { data: [] as PokerHand[], error: new Error(error.message) };
    }

    return {
      data: ((data ?? []) as Partial<PokerHand>[]).map((row) => ({
        user_id: String(row.user_id ?? ''),
        cards: Array.isArray(row.cards) ? row.cards.map(String) : [],
        hand_rank: (row.hand_rank as PokerHand['hand_rank']) ?? null,
        hand_name: row.hand_name ?? null,
        hand_score: row.hand_score === null || row.hand_score === undefined ? null : Number(row.hand_score),
        is_winner: Boolean(row.is_winner ?? false),
        revealed_at: row.revealed_at ?? null,
      })),
      error: null,
    };
  },
};
