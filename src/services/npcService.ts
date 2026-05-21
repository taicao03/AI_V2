import { supabase } from '../lib/supabaseClient';

type NpcTickResult = {
  created_npcs: number;
  dice_bets: number;
  poker_chats: number;
  rr_chats: number;
  tick_at: string;
};

export const npcService = {
  async tickSystem(sessionToken: string | null) {
    if (!supabase) {
      return { data: null as NpcTickResult | null, error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('npc_tick_system', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null as NpcTickResult | null, error: new Error(error.message) };
    }

    return { data: (data ?? null) as NpcTickResult | null, error: null };
  },
};
