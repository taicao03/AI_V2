import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { wheelSpinService } from '../services/wheelSpinService';
import type { WheelChatMessage, WheelJackpotInfo, WheelLeaderboardEntry, WheelPublicState, WheelSpin } from '../types/wheel';

type UseWheelSpinProps = {
  sessionToken: string | null;
  userId: string | null;
};

function spinListSignature(items: WheelSpin[]) {
  const head = items[0];
  return `${items.length}:${head?.spin_id ?? ''}:${head?.created_at ?? ''}:${head?.result_amount ?? ''}`;
}

function leaderboardSignature(items: WheelLeaderboardEntry[]) {
  const head = items[0];
  return `${items.length}:${head?.user_id ?? ''}:${head?.total_winnings ?? 0}:${head?.updated_at ?? ''}`;
}

function chatSignature(items: WheelChatMessage[]) {
  const head = items[0];
  const tail = items[items.length - 1];
  return `${items.length}:${head?.message_id ?? ''}:${tail?.message_id ?? ''}`;
}

function publicStateSignature(state: WheelPublicState | null) {
  if (!state) {
    return 'null';
  }
  const segmentSig = state.segments
    .map((segment) => `${segment.segment_id}:${segment.enabled ? 1 : 0}:${segment.probability}:${segment.multiplier}`)
    .join('|');
  return `${state.settings.version}:${state.settings.updated_at}:${state.cooldown_remaining_seconds}:${segmentSig}`;
}

function jackpotSignature(jackpot: WheelJackpotInfo | null) {
  if (!jackpot) {
    return 'null';
  }
  return `${jackpot.base_jackpot}:${jackpot.total_contribution}:${jackpot.jackpot_amount}`;
}

export function useWheelSpin({ sessionToken, userId }: UseWheelSpinProps) {
  const [publicState, setPublicState] = useState<WheelPublicState | null>(null);
  const [recentSpins, setRecentSpins] = useState<WheelSpin[]>([]);
  const [recentWinners, setRecentWinners] = useState<WheelSpin[]>([]);
  const [leaderboard, setLeaderboard] = useState<WheelLeaderboardEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<WheelChatMessage[]>([]);
  const [jackpotInfo, setJackpotInfo] = useState<WheelJackpotInfo | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const queuedReloadRef = useRef(false);
  const realtimeReloadTimerRef = useRef<number | null>(null);
  const signaturesRef = useRef({
    publicState: '',
    recentSpins: '',
    recentWinners: '',
    leaderboard: '',
    chatMessages: '',
    jackpotInfo: '',
  });

  const loadAll = useCallback(async () => {
    if (inFlightRef.current) {
      queuedReloadRef.current = true;
      return;
    }

    inFlightRef.current = true;
    try {
      const [stateResult, spinsResult, winnersResult, leaderboardResult, chatResult, jackpotResult] = await Promise.all([
        wheelSpinService.getPublicState(),
        wheelSpinService.getRecentSpins(30),
        wheelSpinService.getRecentWinners(12),
        wheelSpinService.getLeaderboard(20),
        wheelSpinService.listChatMessages(100),
        wheelSpinService.getJackpotInfo(),
      ]);

      const nextPublicStateSig = publicStateSignature(stateResult.data);
      if (nextPublicStateSig !== signaturesRef.current.publicState) {
        signaturesRef.current.publicState = nextPublicStateSig;
        setPublicState(stateResult.data);
      }

      const nextSpinsSig = spinListSignature(spinsResult.data);
      if (nextSpinsSig !== signaturesRef.current.recentSpins) {
        signaturesRef.current.recentSpins = nextSpinsSig;
        setRecentSpins(spinsResult.data);
      }

      const nextWinnersSig = spinListSignature(winnersResult.data);
      if (nextWinnersSig !== signaturesRef.current.recentWinners) {
        signaturesRef.current.recentWinners = nextWinnersSig;
        setRecentWinners(winnersResult.data);
      }

      const nextLeaderboardSig = leaderboardSignature(leaderboardResult.data);
      if (nextLeaderboardSig !== signaturesRef.current.leaderboard) {
        signaturesRef.current.leaderboard = nextLeaderboardSig;
        setLeaderboard(leaderboardResult.data);
      }

      const nextChatSig = chatSignature(chatResult.data);
      if (nextChatSig !== signaturesRef.current.chatMessages) {
        signaturesRef.current.chatMessages = nextChatSig;
        setChatMessages(chatResult.data);
      }

      const nextJackpotSig = jackpotSignature(jackpotResult.data);
      if (nextJackpotSig !== signaturesRef.current.jackpotInfo) {
        signaturesRef.current.jackpotInfo = nextJackpotSig;
        setJackpotInfo(jackpotResult.data);
      }

      const nextError =
        stateResult.error?.message ??
        spinsResult.error?.message ??
        winnersResult.error?.message ??
        leaderboardResult.error?.message ??
        chatResult.error?.message ??
        jackpotResult.error?.message ??
        null;

      setError(nextError);
      setLoading(false);
    } finally {
      inFlightRef.current = false;

      if (queuedReloadRef.current) {
        queuedReloadRef.current = false;
        void loadAll();
      }
    }
  }, []);

  const submitBet = useCallback(
    async (betAmount: number, roundCycle?: number) => {
      const result = await wheelSpinService.submitBet(sessionToken, betAmount, roundCycle);
      if (!result.ok) {
        setError(result.error?.message ?? 'Khong the xac nhan cuoc.');
        return false;
      }
      setError(null);
      return true;
    },
    [sessionToken],
  );

  const spinSubmittedBet = useCallback(
    async (roundCycle?: number) => {
      if (!sessionToken) {
        setError('Ban can dang nhap de spin.');
        return null;
      }

      setSpinning(true);
      setError(null);

      const result = await wheelSpinService.createSpinFromPending(sessionToken, roundCycle);
      setSpinning(false);

      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Khong the thuc hien spin.');
        return null;
      }

      return result.data;
    },
    [sessionToken],
  );

  const sendChatMessage = useCallback(
    async (text: string) => {
      const result = await wheelSpinService.sendChatMessage(sessionToken, text);
      if (result.error) {
        setError(result.error.message);
        return false;
      }
      const chatResult = await wheelSpinService.listChatMessages(100);
      if (!chatResult.error) {
        const nextChatSig = chatSignature(chatResult.data);
        if (nextChatSig !== signaturesRef.current.chatMessages) {
          signaturesRef.current.chatMessages = nextChatSig;
          setChatMessages(chatResult.data);
        }
      } else {
        void loadAll();
      }
      return true;
    },
    [loadAll, sessionToken],
  );

  const scheduleReload = useCallback(() => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    if (realtimeReloadTimerRef.current !== null) {
      window.clearTimeout(realtimeReloadTimerRef.current);
    }

    realtimeReloadTimerRef.current = window.setTimeout(() => {
      realtimeReloadTimerRef.current = null;
      void loadAll();
    }, 700);
  }, [loadAll]);

  useEffect(() => {
    void loadAll();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void loadAll();
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
      if (realtimeReloadTimerRef.current !== null) {
        window.clearTimeout(realtimeReloadTimerRef.current);
      }
    };
  }, [loadAll]);

  useEffect(() => {
    const channel = wheelSpinService.createWheelChannel(() => {
      scheduleReload();
    });

    return () => {
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [scheduleReload]);

  const myStats = useMemo(() => {
    if (!userId) {
      return null;
    }
    return leaderboard.find((entry) => entry.user_id === userId) ?? null;
  }, [leaderboard, userId]);

  return {
    publicState,
    recentSpins,
    recentWinners,
    leaderboard,
    chatMessages,
    jackpotInfo,
    myStats,
    spinning,
    loading,
    error,
    submitBet,
    spinSubmittedBet,
    sendChatMessage,
    reload: loadAll,
  };
}
