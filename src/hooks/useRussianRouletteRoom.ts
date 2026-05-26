import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { russianRouletteService } from '../services/russianRouletteService';
import type { RRPerformActionInput, RRRoomLobbyItem, RRRoomState } from '../types/russianRoulette';

type UseRussianRouletteRoomProps = {
  sessionToken: string | null;
  userId: string | null;
};

export function useRussianRouletteRoom({ sessionToken, userId }: UseRussianRouletteRoomProps) {
  const [lobby, setLobby] = useState<RRRoomLobbyItem[]>([]);
  const [roomState, setRoomState] = useState<RRRoomState | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const roomRefreshInFlightRef = useRef(false);
  const roomRefreshQueuedRef = useRef(false);
  const roomRefreshTimerRef = useRef<number | null>(null);
  const lastRoomRefreshAtRef = useRef(0);

  const currentPlayer = useMemo(
    () => roomState?.players.find((player) => player.user_id === userId && !player.left_at) ?? null,
    [roomState?.players, userId],
  );

  const loadLobby = useCallback(async () => {
    const result = await russianRouletteService.listLobbyRooms(sessionToken);
    setLobby(result.data);
    if (result.error) {
      setError(result.error.message);
    }
  }, [sessionToken]);

  const loadRoomState = useCallback(async () => {
    if (!selectedRoomId || !sessionToken) {
      setRoomState(null);
      return;
    }
    if (roomRefreshInFlightRef.current) {
      roomRefreshQueuedRef.current = true;
      return;
    }

    roomRefreshInFlightRef.current = true;
    lastRoomRefreshAtRef.current = Date.now();

    try {
      const result = await russianRouletteService.getRoomState(sessionToken, selectedRoomId);
      if (result.error) {
        setError(result.error.message);
        return;
      }

      setRoomState(result.data);
    } finally {
      roomRefreshInFlightRef.current = false;
      if (roomRefreshQueuedRef.current) {
        roomRefreshQueuedRef.current = false;
        window.setTimeout(() => {
          void loadRoomState();
        }, 150);
      }
    }
  }, [selectedRoomId, sessionToken]);

  const scheduleRoomRefresh = useCallback(
    (immediate = false) => {
      if (roomRefreshTimerRef.current !== null) {
        return;
      }

      const minIntervalMs = 700;
      const elapsed = Date.now() - lastRoomRefreshAtRef.current;
      const delay = immediate ? 0 : Math.max(0, minIntervalMs - elapsed);

      roomRefreshTimerRef.current = window.setTimeout(() => {
        roomRefreshTimerRef.current = null;
        void loadRoomState();
      }, delay);
    },
    [loadRoomState],
  );

  const joinRoomById = useCallback(
    async (roomId: string, asSpectator = false) => {
      if (!sessionToken) {
        setError('Ban can dang nhap de vao phong.');
        return false;
      }

      setLoading(true);
      const result = await russianRouletteService.joinRoom(sessionToken, { roomId, asSpectator });
      setLoading(false);

      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Khong the vao phong.');
        return false;
      }

      setSelectedRoomId(roomId);
      setError(null);
      setInfo(asSpectator ? 'Da vao phong voi che do spectator.' : 'Da vao phong.');
      await Promise.all([loadLobby(), loadRoomState()]);
      return true;
    },
    [loadLobby, loadRoomState, sessionToken],
  );

  const joinRoomByCode = useCallback(
    async (roomCode: string, asSpectator = false) => {
      if (!sessionToken) {
        setError('Ban can dang nhap de vao phong.');
        return false;
      }

      setLoading(true);
      const result = await russianRouletteService.joinRoom(sessionToken, { roomCode, asSpectator });
      setLoading(false);

      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Khong the vao phong.');
        return false;
      }

      const roomId = result.data.room_id;
      setSelectedRoomId(roomId);
      setError(null);
      setInfo(asSpectator ? 'Da vao phong voi che do spectator.' : 'Da vao phong.');
      await Promise.all([loadLobby(), loadRoomState()]);
      return true;
    },
    [loadLobby, loadRoomState, sessionToken],
  );

  const createRoom = useCallback(
    async (payload: {
      name: string;
      isPrivate: boolean;
      buyInAmount: number;
      minBuyIn: number;
      maxBuyIn: number;
      maxPlayers: number;
      enableItems: boolean;
      allowSpectatorChat: boolean;
    }) => {
      if (!sessionToken) {
        setError('Ban can dang nhap de tao phong.');
        return false;
      }

      setLoading(true);
      const created = await russianRouletteService.createRoom(sessionToken, payload);
      setLoading(false);

      if (created.error || !created.data) {
        setError(created.error?.message ?? 'Khong the tao phong.');
        return false;
      }

      const joined = await russianRouletteService.joinRoom(sessionToken, {
        roomId: created.data.room_id,
        asSpectator: false,
      });

      if (joined.error || !joined.data) {
        setError(joined.error?.message ?? 'Phong da tao nhung khong the vao phong.');
        await loadLobby();
        return false;
      }

      setSelectedRoomId(created.data.room_id);
      setError(null);
      setInfo('Tao phong thanh cong.');
      await Promise.all([loadLobby(), loadRoomState()]);
      return true;
    },
    [loadLobby, loadRoomState, sessionToken],
  );

  const leaveRoom = useCallback(async () => {
    if (!selectedRoomId || !sessionToken) {
      setSelectedRoomId(null);
      setRoomState(null);
      return;
    }

    setActionLoading(true);
    const result = await russianRouletteService.leaveRoom(sessionToken, selectedRoomId);
    setActionLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSelectedRoomId(null);
    setRoomState(null);
    setInfo('Da roi phong.');
    await loadLobby();
  }, [loadLobby, selectedRoomId, sessionToken]);

  const setReady = useCallback(
    async (isReady: boolean) => {
      if (!selectedRoomId || !sessionToken) {
        return false;
      }

      setActionLoading(true);
      const result = await russianRouletteService.setReady(sessionToken, selectedRoomId, isReady);
      setActionLoading(false);

      if (result.error) {
        setError(result.error.message);
        return false;
      }

      setError(null);
      setInfo(isReady ? 'Da ready.' : 'Da unready.');
      await loadRoomState();
      return true;
    },
    [loadRoomState, selectedRoomId, sessionToken],
  );

  const performAction = useCallback(
    async (input: RRPerformActionInput) => {
      if (!sessionToken) {
        setError('Ban can dang nhap de hanh dong.');
        return false;
      }

      setActionLoading(true);
      const result = await russianRouletteService.performAction(sessionToken, input);
      setActionLoading(false);

      if (result.error) {
        setError(result.error.message);
        return false;
      }

      setError(null);
      await loadRoomState();
      return true;
    },
    [loadRoomState, sessionToken],
  );

  const sendChatMessage = useCallback(
    async (text: string) => {
      if (!selectedRoomId || !sessionToken) {
        setError('Ban can dang nhap de chat.');
        return false;
      }

      const result = await russianRouletteService.sendChatMessage(sessionToken, selectedRoomId, text);
      if (result.error) {
        setError(result.error.message);
        return false;
      }

      setError(null);
      await loadRoomState();
      return true;
    },
    [loadRoomState, selectedRoomId, sessionToken],
  );

  useEffect(() => {
    void loadLobby();
    const lobbyIntervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void loadLobby();
    }, 15000);
    return () => window.clearInterval(lobbyIntervalId);
  }, [loadLobby]);

  useEffect(() => {
    if (!selectedRoomId || !sessionToken) {
      return;
    }

    let active = true;
    scheduleRoomRefresh(true);

    const pullIntervalId = window.setInterval(() => {
      if (!active || document.visibilityState !== 'visible') {
        return;
      }

      scheduleRoomRefresh();
    }, 8000);

    const channel = russianRouletteService.createRoomChannel(selectedRoomId, () => {
      if (!active) {
        return;
      }

      scheduleRoomRefresh();
    });

    return () => {
      active = false;
      window.clearInterval(pullIntervalId);
      if (roomRefreshTimerRef.current !== null) {
        window.clearTimeout(roomRefreshTimerRef.current);
        roomRefreshTimerRef.current = null;
      }
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [scheduleRoomRefresh, selectedRoomId, sessionToken]);

  useEffect(() => {
    if (!info) {
      return;
    }

    const timeoutId = window.setTimeout(() => setInfo(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [info]);

  return {
    lobby,
    roomState,
    selectedRoomId,
    setSelectedRoomId,
    currentPlayer,
    loading,
    actionLoading,
    error,
    info,
    createRoom,
    joinRoomById,
    joinRoomByCode,
    leaveRoom,
    setReady,
    performAction,
    sendChatMessage,
    refreshLobby: loadLobby,
    refreshRoom: loadRoomState,
  };
}
