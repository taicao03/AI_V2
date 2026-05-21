import { supabase, TABLES } from '../lib/supabaseClient';
import type {
  RRAction,
  RRChatMessage,
  RRGameSettings,
  RRPerformActionInput,
  RRPlayer,
  RRRoom,
  RRRoomLobbyItem,
  RRRoomState,
  RRRound,
} from '../types/russianRoulette';

function normalizeRoom(row: Partial<RRRoom>): RRRoom {
  return {
    room_id: String(row.room_id ?? ''),
    room_code: row.room_code ?? null,
    name: String(row.name ?? 'Mystery Chamber'),
    is_private: Boolean(row.is_private ?? false),
    max_players: Number(row.max_players ?? 6),
    min_buy_in: Number(row.min_buy_in ?? 10),
    max_buy_in: Number(row.max_buy_in ?? 100000),
    buy_in_amount: Number(row.buy_in_amount ?? 100),
    status: (row.status as RRRoom['status']) ?? 'waiting',
    current_round_id: row.current_round_id ?? null,
    created_by: row.created_by ?? null,
    enable_items: Boolean(row.enable_items ?? true),
    allow_spectator_chat: Boolean(row.allow_spectator_chat ?? true),
    is_enabled: Boolean(row.is_enabled ?? true),
    countdown_ends_at: row.countdown_ends_at ?? null,
    last_activity_at: String(row.last_activity_at ?? new Date().toISOString()),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizePlayer(row: Partial<RRPlayer>): RRPlayer {
  return {
    room_id: String(row.room_id ?? ''),
    user_id: String(row.user_id ?? ''),
    display_name: String(row.display_name ?? 'Player'),
    avatar: row.avatar ?? null,
    seat_index: row.seat_index === null || row.seat_index === undefined ? null : Number(row.seat_index),
    status: (row.status as RRPlayer['status']) ?? 'joined',
    buy_in_amount: Number(row.buy_in_amount ?? 0),
    locked_points: Number(row.locked_points ?? 0),
    has_shield: Boolean(row.has_shield ?? false),
    has_skip: Boolean(row.has_skip ?? false),
    joined_at: String(row.joined_at ?? new Date().toISOString()),
    last_action_at: row.last_action_at ?? null,
    is_ready: Boolean(row.is_ready ?? false),
    left_at: row.left_at ?? null,
  };
}

function normalizeRound(row: Partial<RRRound> | null): RRRound | null {
  if (!row) {
    return null;
  }

  return {
    round_id: String(row.round_id ?? ''),
    room_id: String(row.room_id ?? ''),
    status: (row.status as RRRound['status']) ?? 'countdown',
    player_order: Array.isArray(row.player_order) ? row.player_order.map(String) : [],
    current_player_id: row.current_player_id ?? null,
    current_turn_index: Number(row.current_turn_index ?? 0),
    danger_index: Number(row.danger_index ?? 1),
    trigger_count: Number(row.trigger_count ?? 0),
    pot_amount: Number(row.pot_amount ?? 0),
    winner_id: row.winner_id ?? null,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
    cancelled_at: row.cancelled_at ?? null,
    turn_started_at: row.turn_started_at ?? null,
    turn_ends_at: row.turn_ends_at ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function normalizeAction(row: Partial<RRAction>): RRAction {
  return {
    action_id: String(row.action_id ?? ''),
    round_id: String(row.round_id ?? ''),
    room_id: String(row.room_id ?? ''),
    user_id: String(row.user_id ?? ''),
    action_type: (row.action_type as RRAction['action_type']) ?? 'auto_action',
    result: (row.result as RRAction['result']) ?? null,
    trigger_count_before: Number(row.trigger_count_before ?? 0),
    trigger_count_after: Number(row.trigger_count_after ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function normalizeChat(row: Partial<RRChatMessage>): RRChatMessage {
  return {
    message_id: String(row.message_id ?? ''),
    room_id: String(row.room_id ?? ''),
    user_id: String(row.user_id ?? ''),
    display_name: String(row.display_name ?? 'Player'),
    avatar: row.avatar ?? null,
    text: String(row.text ?? ''),
    created_at: String(row.created_at ?? new Date().toISOString()),
    is_deleted: Boolean(row.is_deleted ?? false),
    deleted_at: row.deleted_at ?? null,
    deleted_by: row.deleted_by ?? null,
  };
}

function normalizeSettings(row: Partial<RRGameSettings> | null): RRGameSettings | null {
  if (!row) {
    return null;
  }

  return {
    is_enabled: Boolean(row.is_enabled ?? true),
    min_buy_in: Number(row.min_buy_in ?? 10),
    max_buy_in: Number(row.max_buy_in ?? 100000),
    max_players: Number(row.max_players ?? 6),
    enable_items: Boolean(row.enable_items ?? true),
  };
}

function normalizeRoomState(payload: Partial<RRRoomState> | null): RRRoomState | null {
  if (!payload?.room) {
    return null;
  }

  return {
    room: normalizeRoom(payload.room),
    round: normalizeRound(payload.round ?? null),
    players: Array.isArray(payload.players) ? payload.players.map((item) => normalizePlayer(item)) : [],
    actions: Array.isArray(payload.actions) ? payload.actions.map((item) => normalizeAction(item)) : [],
    chat: Array.isArray(payload.chat) ? payload.chat.map((item) => normalizeChat(item)) : [],
    settings: normalizeSettings(payload.settings ?? null),
  };
}

export const russianRouletteService = {
  async listLobbyRooms(sessionToken: string | null) {
    if (!supabase) {
      return { data: [] as RRRoomLobbyItem[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('rr_list_lobby_rooms', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: [] as RRRoomLobbyItem[], error: new Error(error.message) };
    }

    return {
      data: ((data ?? []) as Partial<RRRoomLobbyItem>[]).map((row) => ({
        ...normalizeRoom(row),
        player_count: Number(row.player_count ?? 0),
        ready_count: Number(row.ready_count ?? 0),
        spectator_count: Number(row.spectator_count ?? 0),
      })),
      error: null,
    };
  },

  async createRoom(
    sessionToken: string | null,
    payload: {
      name: string;
      isPrivate: boolean;
      buyInAmount: number;
      minBuyIn: number;
      maxBuyIn: number;
      maxPlayers: number;
      enableItems: boolean;
      allowSpectatorChat: boolean;
    },
  ) {
    if (!supabase || !sessionToken) {
      return { data: null as RRRoom | null, error: new Error('Ban can dang nhap de tao phong.') };
    }

    const { data, error } = await supabase
      .rpc('rr_create_room', {
        p_session_token: sessionToken,
        p_name: payload.name,
        p_is_private: payload.isPrivate,
        p_buy_in_amount: payload.buyInAmount,
        p_min_buy_in: payload.minBuyIn,
        p_max_buy_in: payload.maxBuyIn,
        p_max_players: payload.maxPlayers,
        p_enable_items: payload.enableItems,
        p_allow_spectator_chat: payload.allowSpectatorChat,
      })
      .single<RRRoom>();

    if (error) {
      return { data: null as RRRoom | null, error: new Error(error.message) };
    }

    return { data: normalizeRoom(data), error: null };
  },

  async joinRoom(
    sessionToken: string | null,
    payload: { roomId?: string; roomCode?: string; asSpectator?: boolean },
  ) {
    if (!supabase || !sessionToken) {
      return { data: null as RRPlayer | null, error: new Error('Ban can dang nhap de vao phong.') };
    }

    const { data, error } = await supabase
      .rpc('rr_join_room', {
        p_session_token: sessionToken,
        p_room_id: payload.roomId ?? null,
        p_room_code: payload.roomCode ?? null,
        p_as_spectator: Boolean(payload.asSpectator),
      })
      .single<RRPlayer>();

    if (error) {
      return { data: null as RRPlayer | null, error: new Error(error.message) };
    }

    return { data: normalizePlayer(data), error: null };
  },

  async leaveRoom(sessionToken: string | null, roomId: string) {
    if (!supabase || !sessionToken) {
      return { data: null as RRPlayer | null, error: new Error('Ban can dang nhap de roi phong.') };
    }

    const { data, error } = await supabase
      .rpc('rr_leave_room', {
        p_session_token: sessionToken,
        p_room_id: roomId,
      })
      .single<RRPlayer>();

    if (error) {
      return { data: null as RRPlayer | null, error: new Error(error.message) };
    }

    return { data: normalizePlayer(data), error: null };
  },

  async setReady(sessionToken: string | null, roomId: string, isReady: boolean) {
    if (!supabase || !sessionToken) {
      return { data: null as RRPlayer | null, error: new Error('Ban can dang nhap de ready.') };
    }

    const { data, error } = await supabase
      .rpc('rr_set_ready', {
        p_session_token: sessionToken,
        p_room_id: roomId,
        p_is_ready: isReady,
      })
      .single<RRPlayer>();

    if (error) {
      return { data: null as RRPlayer | null, error: new Error(error.message) };
    }

    return { data: normalizePlayer(data), error: null };
  },

  async performAction(sessionToken: string | null, input: RRPerformActionInput) {
    if (!supabase || !sessionToken) {
      return { data: null as RRAction | null, error: new Error('Ban can dang nhap de hanh dong.') };
    }

    const { data, error } = await supabase
      .rpc('rr_perform_action', {
        p_session_token: sessionToken,
        p_room_id: input.roomId,
        p_action: input.action,
      })
      .single<RRAction>();

    if (error) {
      return { data: null as RRAction | null, error: new Error(error.message) };
    }

    return { data: normalizeAction(data), error: null };
  },

  async sendChatMessage(sessionToken: string | null, roomId: string, text: string) {
    if (!supabase || !sessionToken) {
      return { data: null as RRChatMessage | null, error: new Error('Ban can dang nhap de chat.') };
    }

    const { data, error } = await supabase
      .rpc('rr_send_chat_message', {
        p_session_token: sessionToken,
        p_room_id: roomId,
        p_text: text,
      })
      .single<RRChatMessage>();

    if (error) {
      return { data: null as RRChatMessage | null, error: new Error(error.message) };
    }

    return { data: normalizeChat(data), error: null };
  },

  async getRoomState(sessionToken: string | null, roomId: string) {
    if (!supabase || !sessionToken) {
      return { data: null as RRRoomState | null, error: new Error('Ban can dang nhap de tai phong.') };
    }

    const { data, error } = await supabase.rpc('rr_get_room_state', {
      p_session_token: sessionToken,
      p_room_id: roomId,
    });

    if (error) {
      return { data: null as RRRoomState | null, error: new Error(error.message) };
    }

    return { data: normalizeRoomState((data ?? null) as Partial<RRRoomState>), error: null };
  },

  async tickRooms(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase.rpc('rr_tick_rooms', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data ?? []) as { room_id: string; status: string; current_round_id: string | null }[], error: null };
  },

  async cleanupInactiveRooms(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: 0, error: null };
    }

    const { data, error } = await supabase.rpc('rr_cleanup_inactive_rooms', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: 0, error: new Error(error.message) };
    }

    return { data: Number(data ?? 0), error: null };
  },

  async adminListActiveRooms(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: [] as RRRoom[], error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_rr_list_active_rooms', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: [] as RRRoom[], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<RRRoom>[]).map((row) => normalizeRoom(row)), error: null };
  },

  async adminGetRoomState(sessionToken: string | null, roomId: string) {
    if (!supabase || !sessionToken) {
      return { data: null as RRRoomState | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('admin_rr_get_room_state', {
      p_session_token: sessionToken,
      p_room_id: roomId,
    });

    if (error) {
      return { data: null as RRRoomState | null, error: new Error(error.message) };
    }

    return { data: normalizeRoomState((data ?? null) as Partial<RRRoomState>), error: null };
  },

  async adminForceCancelRoom(sessionToken: string | null, roomId: string, note?: string) {
    if (!supabase || !sessionToken) {
      return { data: null as RRRound | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_rr_force_cancel_room', {
        p_session_token: sessionToken,
        p_room_id: roomId,
        p_note: note ?? null,
      })
      .single<RRRound>();

    if (error) {
      return { data: null as RRRound | null, error: new Error(error.message) };
    }

    return { data: normalizeRound(data), error: null };
  },

  async adminSetGameEnabled(sessionToken: string | null, isEnabled: boolean) {
    if (!supabase || !sessionToken) {
      return { data: null as RRGameSettings | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_rr_set_game_enabled', {
        p_session_token: sessionToken,
        p_is_enabled: isEnabled,
      })
      .single<RRGameSettings>();

    if (error) {
      return { data: null as RRGameSettings | null, error: new Error(error.message) };
    }

    return { data: normalizeSettings(data), error: null };
  },

  async adminUpdateSettings(
    sessionToken: string | null,
    payload: { minBuyIn: number; maxBuyIn: number; maxPlayers: number; enableItems: boolean },
  ) {
    if (!supabase || !sessionToken) {
      return { data: null as RRGameSettings | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('admin_rr_update_settings', {
        p_session_token: sessionToken,
        p_min_buy_in: payload.minBuyIn,
        p_max_buy_in: payload.maxBuyIn,
        p_max_players: payload.maxPlayers,
        p_enable_items: payload.enableItems,
      })
      .single<RRGameSettings>();

    if (error) {
      return { data: null as RRGameSettings | null, error: new Error(error.message) };
    }

    return { data: normalizeSettings(data), error: null };
  },

  createRoomChannel(roomId: string, onChange: () => void) {
    if (!supabase) {
      return null;
    }

    return supabase
      .channel(`rr-room-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.rrRooms, filter: `room_id=eq.${roomId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.rrPlayers, filter: `room_id=eq.${roomId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.rrRounds, filter: `room_id=eq.${roomId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.rrActions, filter: `room_id=eq.${roomId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.rrChatMessages, filter: `room_id=eq.${roomId}` }, onChange)
      .subscribe();
  },
};

