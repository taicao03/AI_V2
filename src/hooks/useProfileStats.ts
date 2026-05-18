import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Bet, ProfileStats } from '../types';
import { buildProfileStats } from '../lib/stats';
import { supabase, TABLES } from '../lib/supabaseClient';

const DEFAULT_STATS: ProfileStats = {
  totalPoints: 0,
  totalBets: 0,
  winRate: 0,
  biggestWin: 0,
  biggestLoss: 0,
};

export function useProfileStats(userId: string | null | undefined, points: number) {
  const [bets, setBets] = useState<Array<Pick<Bet, 'result' | 'points_change'>>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const client = supabase;

    if (!client || !userId) {
      setBets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await client
      .from(TABLES.bets)
      .select('result, points_change')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setBets((data ?? []) as Array<Pick<Bet, 'result' | 'points_change'>>);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const client = supabase;

    if (!client || !userId) {
      setBets([]);
      setLoading(false);
      return;
    }

    const channel = client
      .channel(`profile-stats-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.bets, filter: `user_id=eq.${userId}` },
        () => {
          void loadStats();
        },
      )
      .subscribe();

    void loadStats();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadStats, userId]);

  const stats = useMemo(() => {
    if (!userId) {
      return DEFAULT_STATS;
    }

    return buildProfileStats(points, bets);
  }, [bets, points, userId]);

  return {
    stats,
    loading,
    error,
  };
}
