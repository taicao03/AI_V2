export type RRRoomStatus = 'waiting' | 'countdown' | 'playing' | 'completed' | 'cancelled';
export type RRRoundStatus = 'countdown' | 'playing' | 'completed' | 'cancelled';
export type RRPlayerStatus = 'joined' | 'ready' | 'playing' | 'eliminated' | 'winner' | 'spectator';
export type RRActionType =
  | 'pull_trigger'
  | 'use_shield'
  | 'skip_turn'
  | 'auto_action'
  | 'eliminated'
  | 'winner';
export type RRActionResult = 'safe' | 'danger' | 'blocked' | 'skipped';

export type RRPointsTransactionType = 'buy_in_lock' | 'win_pot' | 'refund' | 'admin_adjust';

export type RRRoom = {
  room_id: string;
  room_code: string | null;
  name: string;
  is_private: boolean;
  max_players: number;
  min_buy_in: number;
  max_buy_in: number;
  buy_in_amount: number;
  status: RRRoomStatus;
  current_round_id: string | null;
  created_by: string | null;
  enable_items: boolean;
  allow_spectator_chat: boolean;
  is_enabled: boolean;
  countdown_ends_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

export type RRPlayer = {
  room_id: string;
  user_id: string;
  display_name: string;
  avatar: string | null;
  seat_index: number | null;
  status: RRPlayerStatus;
  buy_in_amount: number;
  locked_points: number;
  has_shield: boolean;
  has_skip: boolean;
  joined_at: string;
  last_action_at: string | null;
  is_ready: boolean;
  left_at: string | null;
};

export type RRRound = {
  round_id: string;
  room_id: string;
  status: RRRoundStatus;
  player_order: string[];
  current_player_id: string | null;
  current_turn_index: number;
  danger_index: number;
  trigger_count: number;
  pot_amount: number;
  winner_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  turn_started_at: string | null;
  turn_ends_at: string | null;
  created_at: string;
};

export type RRAction = {
  action_id: string;
  round_id: string;
  room_id: string;
  user_id: string;
  action_type: RRActionType;
  result: RRActionResult | null;
  trigger_count_before: number;
  trigger_count_after: number;
  created_at: string;
};

export type RRChatMessage = {
  message_id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  avatar: string | null;
  text: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type RRGameSettings = {
  is_enabled: boolean;
  min_buy_in: number;
  max_buy_in: number;
  max_players: number;
  enable_items: boolean;
};

export type RRRoomLobbyItem = RRRoom & {
  player_count: number;
  ready_count: number;
  spectator_count: number;
};

export type RRRoomState = {
  room: RRRoom;
  round: RRRound | null;
  players: RRPlayer[];
  actions: RRAction[];
  chat: RRChatMessage[];
  settings: RRGameSettings | null;
};

export type RRPerformActionInput = {
  roomId: string;
  action: 'pull_trigger' | 'use_shield' | 'skip_turn';
};

