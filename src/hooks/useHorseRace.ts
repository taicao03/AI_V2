import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { horseRaceService } from '../services/horseRaceService';
import { createTaskScheduler, type TaskScheduler } from '../core/scheduler';
import type {
  HorseBet,
  HorseChatMessage,
  HorseLeaderboardEntry,
  HorsePublicState,
  HorseRace,
  HorseRaceStatus,
  HorseWinner,
} from '../types/horse-racing';

type UseHorseRaceProps = {
  sessionToken: string | null;
  userId: string | null;
};

function secondsUntil(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 1000));
}

function getCountdownTarget(race: HorseRace | null): string | null {
  if (!race) {
    return null;
  }
  if (race.status === 'betting') {
    return race.betting_ends_at;
  }
  if (race.status === 'locked') {
    return race.lock_ends_at ?? race.locked_at;
  }
  if (race.status === 'racing') {
    return race.race_ends_at;
  }
  return null;
}

export function useHorseRace({ sessionToken, userId }: UseHorseRaceProps) {
  const [publicState, setPublicState] = useState<HorsePublicState | null>(null);
  const [recentRaces, setRecentRaces] = useState<HorseRace[]>([]);
  const [recentWinners, setRecentWinners] = useState<HorseWinner[]>([]);
  const [leaderboard, setLeaderboard] = useState<HorseLeaderboardEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<HorseChatMessage[]>([]);
  const [myBets, setMyBets] = useState<HorseBet[]>([]);
  const [countdownSecondsLeft, setCountdownSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const reloadSchedulerRef = useRef<TaskScheduler | null>(null);

  const activeRace = publicState?.active_race ?? null;
  const status: HorseRaceStatus = activeRace?.status ?? 'waiting';

  const loadAll = useCallback(async () => {
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }

    inFlightRef.current = true;
    try {
      const [stateResult, racesResult, winnersResult, leaderboardResult, chatResult, betsResult] =
        await Promise.all([
          horseRaceService.getPublicState(),
          horseRaceService.getRecentRaces(30),
          horseRaceService.getRecentWinners(20),
          horseRaceService.getLeaderboard(20),
          horseRaceService.getRecentChat(100),
          sessionToken
            ? horseRaceService.getMyBets(sessionToken, 50)
            : Promise.resolve({ data: [] as HorseBet[], error: null }),
        ]);

      setPublicState(stateResult.data);
      setRecentRaces(racesResult.data);
      setRecentWinners(winnersResult.data);
      setLeaderboard(leaderboardResult.data);
      setChatMessages(chatResult.data);
      setMyBets(betsResult.data);
      setError(
        stateResult.error?.message ??
          racesResult.error?.message ??
          winnersResult.error?.message ??
          leaderboardResult.error?.message ??
          chatResult.error?.message ??
          betsResult.error?.message ??
          null,
      );
      setLoading(false);
    } finally {
      inFlightRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        void loadAll();
      }
    }
  }, [sessionToken]);

  const scheduleReload = useCallback((immediate = false) => {
    reloadSchedulerRef.current?.schedule(immediate);
  }, []);

  useEffect(() => {
    reloadSchedulerRef.current = createTaskScheduler(loadAll, { minIntervalMs: 650 });
    void loadAll();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      scheduleReload();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
      reloadSchedulerRef.current?.dispose();
      reloadSchedulerRef.current = null;
    };
  }, [loadAll, scheduleReload]);

  useEffect(() => {
    const channel = horseRaceService.createHorseChannel(() => {
      scheduleReload();
    });

    return () => {
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [scheduleReload]);

  useEffect(() => {
    const tick = () => {
      const target = getCountdownTarget(activeRace);
      setCountdownSecondsLeft(secondsUntil(target));
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [activeRace]);

  const placeBet = useCallback(
    async (horseId: string, betAmount: number) => {
      const result = await horseRaceService.placeBet(sessionToken, horseId, betAmount);
      if (result.error) {
        setError(result.error.message);
        return { ok: false, bet: null as HorseBet | null, message: result.error.message };
      }

      setError(null);
      await loadAll();
      return { ok: true, bet: result.data, message: null as string | null };
    },
    [loadAll, sessionToken],
  );

  const sendChatMessage = useCallback(
    async (text: string) => {
      const result = await horseRaceService.sendChatMessage(sessionToken, text);
      if (result.error) {
        setError(result.error.message);
        return false;
      }

      const chatResult = await horseRaceService.getRecentChat(100);
      if (!chatResult.error) {
        setChatMessages(chatResult.data);
      } else {
        void loadAll();
      }

      return true;
    },
    [loadAll, sessionToken],
  );

  const myRoundBets = useMemo(() => {
    if (!activeRace) {
      return [];
    }
    return myBets.filter((bet) => bet.race_id === activeRace.race_id);
  }, [activeRace, myBets]);

  const totalMyRoundBet = useMemo(
    () => myRoundBets.reduce((sum, bet) => sum + Number(bet.bet_amount ?? 0), 0),
    [myRoundBets],
  );

  const myLeaderboardRow = useMemo(() => {
    if (!userId) {
      return null;
    }
    return leaderboard.find((item) => item.user_id === userId) ?? null;
  }, [leaderboard, userId]);

  return {
    publicState,
    activeRace,
    status,
    recentRaces,
    recentWinners,
    leaderboard,
    chatMessages,
    myBets,
    myRoundBets,
    totalMyRoundBet,
    myLeaderboardRow,
    countdownSecondsLeft,
    loading,
    error,
    placeBet,
    sendChatMessage,
    reload: loadAll,
  };
}
