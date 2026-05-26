export type HorseRaceStatus = 'waiting' | 'betting' | 'locked' | 'racing' | 'completed' | 'cancelled';

export type Horse = {
  horse_id: string;
  name: string;
  avatar: string | null;
  speed_rating: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  odds_multiplier: number;
  win_probability: number;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type HorseRace = {
  race_id: string;
  race_number: number;
  status: HorseRaceStatus;
  winner_horse_id: string | null;
  horses_snapshot: Array<Record<string, unknown>>;
  settings_version: number;
  betting_started_at: string;
  betting_ends_at: string;
  locked_at: string | null;
  lock_ends_at: string | null;
  race_started_at: string | null;
  race_ends_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HorseBet = {
  bet_id: string;
  race_id: string;
  user_id: string;
  horse_id: string;
  bet_amount: number;
  odds_multiplier: number;
  status: 'pending' | 'settled' | 'cancelled';
  result: 'win' | 'lose' | null;
  payout: number;
  points_before: number | null;
  points_after: number | null;
  points_change: number;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HorseRaceSettings = {
  settings_id: number;
  enabled: boolean;
  min_bet: number;
  max_bet: number;
  betting_duration: number;
  race_duration: number;
  updated_by: string | null;
  updated_at: string;
  version: number;
};

export type HorseChatMessage = {
  message_id: string;
  user_id: string | null;
  display_name: string;
  avatar: string | null;
  role: 'user' | 'admin' | 'system';
  vip_level: number;
  text: string;
  is_system: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  is_deleted: boolean;
};

export type HorseLeaderboardEntry = {
  user_id: string;
  account_name: string;
  display_name: string;
  avatar_url: string | null;
  total_winnings: number;
  biggest_win: number;
  total_bets: number;
  win_count: number;
  best_streak: number;
  current_streak: number;
  updated_at: string;
};

export type HorseWinner = {
  race_id: string;
  race_number: number;
  winner_horse_id: string | null;
  winner_name: string | null;
  winner_avatar: string | null;
  ended_at: string | null;
};

export type HorseTopBettor = {
  user_id: string;
  account_name: string;
  display_name: string;
  avatar_url: string | null;
  total_amount: number;
};

export type HorsePublicState = {
  settings: HorseRaceSettings | null;
  horses: Horse[];
  active_race: HorseRace | null;
  recent_races: HorseRace[];
  recent_winners: HorseWinner[];
  top_bettors: HorseTopBettor[];
};

export type AdminHorseLiveStats = {
  active_users: number;
  betting_statistics: {
    total_bets_24h: number;
    total_amount_24h: number;
    settled_24h: number;
    wins_24h: number;
  };
  recent_admin_logs: Array<Record<string, unknown>>;
};
