import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeaderboardUser } from '../types';
import { normalizeLeaderboardUser, supabase, TABLES } from '../lib/supabaseClient';
import { createTaskScheduler } from '../core/scheduler';

const LIMIT = 10;
const QUERY_KEY = ['leaderboard', LIMIT] as const;

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

async function fetchLeaderboard(): Promise<LeaderboardUser[]> {
  const client = supabase;

  if (!client) {
    throw new Error('Chua cau hinh Supabase leaderboard.');
  }

  const { data, error } = await client
    .from(TABLES.leaderboard)
    .select('uid, account_name, display_name, avatar_url, vip_level, points, locked_points, updated_at')
    .order('points', { ascending: false })
    .order('updated_at', { ascending: true, nullsFirst: false })
    .limit(LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  return sortLeaderboard((data ?? []).map((row) => normalizeLeaderboardUser(row)));
}

export function useLeaderboard() {
  const queryClient = useQueryClient();
  const channelNameRef = useRef(
    `dice-users-leaderboard-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
  );
  const schedulerRef = useRef<ReturnType<typeof createTaskScheduler> | null>(null);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLeaderboard,
    staleTime: 10_000,
  });

  useEffect(() => {
    const client = supabase;

    if (!client) {
      return;
    }

    schedulerRef.current = createTaskScheduler(
      async () => {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      },
      { minIntervalMs: 900 },
    );

    const channel = client
      .channel(channelNameRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.leaderboard }, () => {
        schedulerRef.current?.schedule();
      })
      .subscribe();

    return () => {
      schedulerRef.current?.dispose();
      schedulerRef.current = null;
      void client.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    leaders: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}

