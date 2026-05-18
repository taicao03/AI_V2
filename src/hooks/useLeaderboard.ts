import { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderboardUser } from '../types';
import { normalizeLeaderboardUser, supabase, TABLES } from '../lib/supabaseClient';

const LIMIT = 10;

function sortLeaderboard(users: LeaderboardUser[]): LeaderboardUser[] {
  return [...users]
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      return new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime();
    })
    .slice(0, LIMIT);
}

export function useLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelNameRef = useRef(
    `dice-users-leaderboard-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
  );

  const loadLeaderboard = useCallback(async () => {
    const client = supabase;

    if (!client) {
      setLoading(false);
      setError('Chua cau hinh Supabase leaderboard.');
      return;
    }

    const { data, error: fetchError } = await client
      .from(TABLES.leaderboard)
      .select('uid, account_name, display_name, avatar_url, vip_level, points, locked_points, updated_at')
      .order('points', { ascending: false })
      .order('updated_at', { ascending: true, nullsFirst: false })
      .limit(LIMIT);

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setLeaders(sortLeaderboard((data ?? []).map((row) => normalizeLeaderboardUser(row))));
    setLoading(false);
  }, []);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setLoading(false);
      setError('Chua cau hinh Supabase leaderboard.');
      return;
    }

    const channel = client
      .channel(channelNameRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.leaderboard }, () => {
        void loadLeaderboard();
      })
      .subscribe();

    void loadLeaderboard();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadLeaderboard]);

  return {
    leaders,
    loading,
    error,
  };
}
