import { supabase } from '../lib/supabaseClient';
import type { PokerHand, PokerRound, PokerTable } from '../types';
import { normalizePokerHand, normalizePokerRound, normalizePokerTable } from './pokerMappers';

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

    return {
      data: ((data ?? []) as Partial<PokerTable>[])
        .map((row) => normalizePokerTable(row))
        .filter((row): row is PokerTable => Boolean(row)),
      error: null,
    };
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

    const normalized = normalizePokerTable(data);
    if (!normalized) {
      return { data: null as PokerTable | null, error: new Error('Khong tim thay ban poker.') };
    }
    return { data: normalized, error: null };
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

    const normalized = normalizePokerRound(data);
    if (!normalized) {
      return { data: null as PokerRound | null, error: new Error('Khong tim thay vong poker.') };
    }
    return { data: normalized, error: null };
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
      data: ((data ?? []) as Partial<PokerHand>[]).map((row) => normalizePokerHand(row)),
      error: null,
    };
  },
};
