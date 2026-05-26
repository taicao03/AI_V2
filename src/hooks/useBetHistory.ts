import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BetHistoryItem, DiceRound, DiceRoundBetTotals } from '../types';
import {
  getRoundBetTotals,
  getCurrentRound,
  normalizeBetHistory,
  normalizeRound,
  settleDueRounds,
  supabase,
  TABLES,
  type BetHistoryRow,
  type RoundRow,
} from '../lib/supabaseClient';

const MAX_HISTORY = 60;
const MAX_ROUNDS = 30;

function sortHistory(items: BetHistoryItem[]): BetHistoryItem[] {
  return [...items]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, MAX_HISTORY);
}

function sortRounds(rounds: DiceRound[]): DiceRound[] {
  return [...rounds]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, MAX_ROUNDS);
}

function secondsUntil(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));
}

export function useBetHistory() {
  const [items, setItems] = useState<BetHistoryItem[]>([]);
  const [roundHistory, setRoundHistory] = useState<DiceRound[]>([]);
  const [currentRound, setCurrentRound] = useState<DiceRound | null>(null);
  const [latestSettledRound, setLatestSettledRound] = useState<DiceRound | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentRoundBetTotals, setCurrentRoundBetTotals] = useState<DiceRoundBetTotals>({
    tai: 0,
    xiu: 0,
    total: 0,
  });
  const [settling, setSettling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const settlingRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const refreshTimeoutRef = useRef<number | null>(null);
  const lastRefreshAtRef = useRef(0);
  const liteRefreshInFlightRef = useRef(false);
  const liteRefreshQueuedRef = useRef(false);
  const liteRefreshTimeoutRef = useRef<number | null>(null);
  const lastLiteRefreshAtRef = useRef(0);
  const lastPeriodicSyncAtRef = useRef(0);
  const connectedRef = useRef(false);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  const loadCurrentRound = useCallback(async () => {
    const { data, error: roundError } = await getCurrentRound();

    if (roundError) {
      setError(roundError.message);
      return null;
    }

    setCurrentRound(data);
    setSecondsLeft(secondsUntil(data?.ends_at));
    return data;
  }, []);

  const loadCurrentRoundBetTotals = useCallback(async (roundId: string | null) => {
    const { data, error: totalsError } = await getRoundBetTotals(roundId);
    if (totalsError) {
      setError(totalsError.message);
      return;
    }

    setCurrentRoundBetTotals(data);
  }, []);

  const loadHistory = useCallback(async (silent = false) => {
    const client = supabase;

    if (!client) {
      setLoading(false);
      setConnected(false);
      setError('Chua cau hinh Supabase. Hay tao .env.local de bat realtime.');
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await client
      .from(TABLES.betHistory)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY);

    if (fetchError) {
      setError(fetchError.message);
      if (!silent) {
        setLoading(false);
      }
      return;
    }

    setItems(sortHistory(((data ?? []) as BetHistoryRow[]).map((row) => normalizeBetHistory(row))));
    if (!silent) {
      setLoading(false);
    }
  }, []);

  const loadRoundHistory = useCallback(async () => {
    const client = supabase;

    if (!client) {
      setError('Chua cau hinh Supabase. Hay tao .env.local de bat realtime.');
      return;
    }

    const { data, error: fetchError } = await client
      .from(TABLES.rounds)
      .select('round_id, status, dice, total, result_type, starts_at, ends_at, settled_at, completed_at, settled_by, is_cancelled, created_at, created_by')
      .order('created_at', { ascending: false })
      .limit(MAX_ROUNDS);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setRoundHistory(sortRounds(((data ?? []) as RoundRow[]).map((row) => normalizeRound(row))));
  }, []);

  const refreshRoom = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = Boolean(options?.silent);
      const round = await loadCurrentRound();
      await Promise.all([loadCurrentRoundBetTotals(round?.round_id ?? null), loadHistory(silent), loadRoundHistory()]);
    },
    [loadCurrentRound, loadCurrentRoundBetTotals, loadHistory, loadRoundHistory],
  );

  const refreshLite = useCallback(async () => {
    const round = await loadCurrentRound();
    await loadCurrentRoundBetTotals(round?.round_id ?? null);
  }, [loadCurrentRound, loadCurrentRoundBetTotals]);

  const scheduleRefresh = useCallback(
    (immediate = false) => {
      if (refreshTimeoutRef.current !== null) {
        return;
      }

      const minIntervalMs = 1200;
      const elapsed = Date.now() - lastRefreshAtRef.current;
      const delay = immediate ? 0 : Math.max(0, minIntervalMs - elapsed);

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;

        if (refreshInFlightRef.current) {
          refreshQueuedRef.current = true;
          return;
        }

        refreshInFlightRef.current = true;
        lastRefreshAtRef.current = Date.now();

        void refreshRoom({ silent: true }).finally(() => {
          refreshInFlightRef.current = false;

          if (refreshQueuedRef.current) {
            refreshQueuedRef.current = false;
            scheduleRefresh();
          }
        });
      }, delay);
    },
    [refreshRoom],
  );

  const scheduleLiteRefresh = useCallback(
    (immediate = false) => {
      if (liteRefreshTimeoutRef.current !== null) {
        return;
      }

      const minIntervalMs = 900;
      const elapsed = Date.now() - lastLiteRefreshAtRef.current;
      const delay = immediate ? 0 : Math.max(0, minIntervalMs - elapsed);

      liteRefreshTimeoutRef.current = window.setTimeout(() => {
        liteRefreshTimeoutRef.current = null;

        if (liteRefreshInFlightRef.current) {
          liteRefreshQueuedRef.current = true;
          return;
        }

        liteRefreshInFlightRef.current = true;
        lastLiteRefreshAtRef.current = Date.now();

        void refreshLite().finally(() => {
          liteRefreshInFlightRef.current = false;

          if (liteRefreshQueuedRef.current) {
            liteRefreshQueuedRef.current = false;
            scheduleLiteRefresh();
          }
        });
      }, delay);
    },
    [refreshLite],
  );

  const settleNow = useCallback(async () => {
    if (settlingRef.current) {
      return;
    }

    settlingRef.current = true;
    setSettling(true);

    const { error: settleError } = await settleDueRounds();

    if (settleError) {
      setError(settleError.message);
    }

    await refreshRoom();
    setSettling(false);
    settlingRef.current = false;
  }, [refreshRoom]);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setLoading(false);
      setConnected(false);
      setError('Chua cau hinh Supabase. Hay tao .env.local de bat realtime.');
      return;
    }

    let mounted = true;

    const channel = client
      .channel('dice-round-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.bets }, () => {
        if (mounted) {
          scheduleLiteRefresh();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.rounds }, (payload) => {
        if (payload.new) {
          const nextRound = normalizeRound(payload.new as RoundRow);

          setRoundHistory((currentRounds) => {
            const withoutDuplicate = currentRounds.filter((round) => round.round_id !== nextRound.round_id);
            return sortRounds([nextRound, ...withoutDuplicate]);
          });

          if (nextRound.status === 'completed' || nextRound.status === 'cancelled') {
            setLatestSettledRound(nextRound);
          } else if (nextRound.status === 'betting') {
            setCurrentRound(nextRound);
          }
        }

        if (mounted) {
          scheduleRefresh();
        }
      })
      .subscribe((status) => {
        if (!mounted) {
          return;
        }

        setConnected(status === 'SUBSCRIBED');

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Mat ket noi realtime voi lich su bet. Dang cho thu lai...');
        }
      });

    void refreshRoom({ silent: false });
    const heavySyncIntervalId = window.setInterval(() => {
      if (!mounted || document.visibilityState !== 'visible') {
        return;
      }

      if (connectedRef.current && Date.now() - lastPeriodicSyncAtRef.current < 60000) {
        return;
      }

      lastPeriodicSyncAtRef.current = Date.now();
      scheduleRefresh();
    }, 12000);

    return () => {
      mounted = false;
      setConnected(false);
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (liteRefreshTimeoutRef.current !== null) {
        window.clearTimeout(liteRefreshTimeoutRef.current);
        liteRefreshTimeoutRef.current = null;
      }
      window.clearInterval(heavySyncIntervalId);
      void client.removeChannel(channel);
    };
  }, [refreshRoom, scheduleLiteRefresh, scheduleRefresh]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSecondsLeft(secondsUntil(currentRound?.ends_at));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [currentRound?.ends_at]);

  useEffect(() => {
    if (!currentRound || currentRound.status !== 'betting' || secondsLeft > 0) {
      return;
    }

    void settleNow();
  }, [currentRound, secondsLeft, settleNow]);

  const rounds = useMemo<DiceRound[]>(
    () =>
      items
        .filter((item) => item.round_status === 'completed' && item.dice && item.total !== null && item.result_type)
        .map((item) => ({
          round_id: item.round_id,
          status: item.round_status,
          dice: item.dice,
          total: item.total,
          result_type: item.result_type,
          starts_at: item.starts_at,
          ends_at: item.ends_at,
          settled_at: item.settled_at,
          completed_at: item.settled_at,
          settled_by: null,
          is_cancelled: item.round_status === 'cancelled',
          created_at: item.round_created_at,
          created_by: item.user_id,
        })),
    [items],
  );

  return {
    history: items.slice(0, 20),
    allHistory: items,
    roundHistory: roundHistory.slice(0, 20),
    rounds,
    currentRound,
    latestRound: latestSettledRound ?? roundHistory.find((round) => round.status === 'completed') ?? rounds[0] ?? null,
    currentRoundBetTotals,
    secondsLeft,
    settling,
    loading,
    error,
    connected,
    refresh: refreshRoom,
    settleNow,
  };
}
