export type Outcome = 'tai' | 'xiu';

export type DiceTuple = [number, number, number];

export type PredictionType = 'tai_xiu' | 'total';

export type RoundStatus = 'betting' | 'locked' | 'rolling' | 'completed' | 'cancelled';

export type BetStatus = 'pending' | 'settled' | 'cancelled';

export type BetResult = 'win' | 'lose' | null;

export type UserRole = 'user' | 'admin';

export type Prediction =
  | {
      kind: 'outcome';
      value: Outcome;
    }
  | {
      kind: 'total';
      value: number;
    };

export type UserProfile = {
  uid: string;
  account_name: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  vip_level: number;
  role: UserRole;
  points: number;
  locked_points: number;
  total_bets: number;
  total_wins: number;
  total_losses: number;
  total_points_won: number;
  total_points_lost: number;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  points_updated_at: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  last_demo_refill_at: string | null;
};

export type LeaderboardUser = {
  uid: string;
  account_name: string;
  display_name: string;
  avatar_url: string | null;
  vip_level: number;
  points: number;
  locked_points: number;
  updated_at: string;
};

export type DiceRound = {
  round_id: string;
  status: RoundStatus;
  dice: DiceTuple | null;
  total: number | null;
  result_type: Outcome | null;
  starts_at: string;
  ends_at: string;
  settled_at: string | null;
  completed_at: string | null;
  settled_by: string | null;
  is_cancelled: boolean;
  created_at: string;
  created_by: string | null;
};

export type Bet = {
  bet_id: string;
  user_id: string;
  round_id: string;
  prediction_type: PredictionType;
  prediction_value: string;
  bet_amount: number;
  payout_multiplier: number;
  status: BetStatus;
  result: BetResult;
  points_before: number | null;
  points_after: number | null;
  points_change: number;
  created_at: string;
  settled_at: string | null;
};

export type BetHistoryItem = Bet & {
  round_status: RoundStatus;
  dice: DiceTuple | null;
  total: number | null;
  result_type: Outcome | null;
  starts_at: string;
  ends_at: string;
  settled_at: string | null;
  round_created_at: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type PlaceBetResult = {
  bet_id: string;
  round_id: string;
  prediction_type: PredictionType;
  prediction_value: string;
  bet_amount: number;
  status: BetStatus;
  result: BetResult;
  points_change: number;
  created_at: string;
  round_starts_at: string;
  round_ends_at: string;
  available_points: number;
};

export type PointsTransaction = {
  transaction_id: string;
  user_id: string;
  type: 'bet_lock' | 'bet_win' | 'bet_loss' | 'admin_adjust' | 'daily_claim' | 'round_cancel';
  amount: number;
  points_before: number;
  points_after: number;
  locked_before: number;
  locked_after: number;
  bet_id: string | null;
  round_id: string | null;
  admin_id: string | null;
  note: string | null;
  created_at: string;
};

export type ChatMessage = {
  message_id: string;
  user_id: string;
  display_name: string;
  avatar: string | null;
  role: UserRole;
  vip_level: number;
  text: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  is_deleted: boolean;
};

export type AdminStats = {
  total_users: number;
  online_users: number;
  total_bets: number;
  total_rounds: number;
  total_points: number;
  total_locked_points: number;
  total_wins: number;
  total_losses: number;
};

export type AdminNotificationKind = 'info' | 'success' | 'warning' | 'error';

export type AdminNotification = {
  notification_id: string;
  admin_id: string | null;
  title: string;
  message: string;
  kind: AdminNotificationKind;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

export type RoundTickResult = {
  settled_round_id: string | null;
  active_round_id: string;
};

export type ProfileStats = {
  totalPoints: number;
  totalBets: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
};

export type OnlineUser = {
  uid: string;
  accountName: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  vipLevel: number;
  onlineAt: string;
  color: string;
  isCurrent?: boolean;
};

export type OnlineUserJoinEvent = {
  id: string;
  user: OnlineUser;
};

export type PokerTableStatus = 'waiting' | 'countdown' | 'playing' | 'showdown' | 'completed' | 'closed';

export type PokerRoundStatus = 'playing' | 'showdown' | 'completed' | 'cancelled';
export type PokerRoundPhase = 'round1' | 'round2' | 'round3' | 'showdown' | 'completed' | 'cancelled';

export type PokerHandRank =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9;

export type PokerCard = `${'2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'}${'S' | 'H' | 'D' | 'C'}`;

export type PokerTable = {
  table_id: string;
  name: string;
  room_code: string | null;
  is_private: boolean;
  max_players: number;
  min_bet: number;
  max_bet: number;
  status: PokerTableStatus;
  created_by: string | null;
  active_round_id: string | null;
  countdown_ends_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

export type PokerPlayer = {
  table_player_id?: string;
  table_id: string;
  user_id: string;
  seat_order: number | null;
  is_bot?: boolean;
  npc_personality?: 'conservative' | 'aggressive' | 'random' | 'smart' | null;
  is_ready: boolean;
  is_spectator: boolean;
  current_bet: number;
  points?: number;
  locked_points?: number;
  available_points?: number;
  in_round?: boolean;
  joined_at?: string;
  left_at: string | null;
  last_heartbeat_at: string;
  updated_at?: string;
  display_name?: string;
  avatar_url?: string | null;
  is_host?: boolean;
  is_me?: boolean;
  has_folded?: boolean;
  is_all_in?: boolean;
  total_bet?: number;
  round_bet?: number;
  last_action?: string | null;
  acted_in_phase?: boolean;
  player_status?: 'folded' | 'all-in' | 'thinking' | 'ready' | 'waiting';
};

export type PokerRound = {
  round_id: string;
  table_id: string;
  status: PokerRoundStatus;
  round_phase?: PokerRoundPhase;
  phase_ends_at?: string | null;
  community_cards?: string[];
  community_revealed?: number;
  deck_hash: string | null;
  started_at: string;
  showdown_at: string | null;
  completed_at: string | null;
  winner_ids: string[];
  pot_amount: number;
  current_bet?: number;
  created_at: string;
};

export type PokerHand = {
  user_id: string;
  cards: string[];
  hand_rank: PokerHandRank | null;
  hand_name: string | null;
  hand_score: number | null;
  is_winner: boolean;
  revealed_at: string | null;
};

export type PokerResult = {
  result_id?: string;
  round_id: string;
  table_id: string;
  user_id: string;
  is_winner: boolean;
  rank_position: number;
  payout_amount: number;
  hand_name: string | null;
  hand_rank: PokerHandRank | null;
  hand_score: number | null;
  created_at?: string;
};

export type PokerChatMessage = {
  message_id: string;
  table_id: string;
  user_id: string;
  display_name: string;
  avatar: string | null;
  role: UserRole;
  vip_level: number;
  text: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  is_deleted: boolean;
};

export type PokerTableLobbyItem = {
  table_id: string;
  name: string;
  room_code: string | null;
  is_private: boolean;
  max_players: number;
  min_bet: number;
  max_bet: number;
  status: PokerTableStatus;
  player_count: number;
  ready_count: number;
  spectator_count: number;
  created_by: string | null;
  updated_at: string;
};

export type PokerTableState = {
  table: PokerTable;
  round: PokerRound | null;
  players: PokerPlayer[];
  hands: PokerHand[];
  recent_results: PokerResult[];
  chat: PokerChatMessage[];
};

export type PokerLeaderboardEntry = {
  user_id: string;
  account_name: string;
  display_name: string;
  avatar_url: string | null;
  rounds_played: number;
  rounds_won: number;
  win_rate: number;
  points_won: number;
  points_lost: number;
  net_points: number;
  updated_at: string;
};
