import { claimDemoPoints, supabase, TABLES, normalizeProfile } from '../lib/supabaseClient';
import type { PokerLeaderboardEntry, UserProfile } from '../types';

export const pointsService = {
  claimDaily(sessionToken: string | null) {
    return claimDemoPoints(sessionToken);
  },

  async getUserPoints(uid: string): Promise<{ data: UserProfile | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase
      .from(TABLES.users)
      .select('uid, account_name, display_name, email, avatar_url, vip_level, role, points, locked_points, total_bets, total_wins, total_losses, total_points_won, total_points_lost, is_banned, ban_reason, banned_at, banned_by, points_updated_at, created_at, updated_at, last_login_at, last_demo_refill_at')
      .eq('uid', uid)
      .single<Partial<UserProfile>>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizeProfile(data), error: null };
  },

  async getPokerLeaderboard(): Promise<{ data: PokerLeaderboardEntry[]; error: Error | null }> {
    if (!supabase) {
      return { data: [], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('poker_get_leaderboard');

    if (error) {
      return { data: [], error: new Error(error.message) };
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
};
