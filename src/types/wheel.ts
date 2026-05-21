export type WheelSettings = {
  settings_id: number;
  enabled: boolean;
  min_bet: number;
  max_bet: number;
  cooldown_seconds: number;
  default_jackpot: number;
  updated_by: string | null;
  updated_at: string;
  version: number;
};

export type WheelSegment = {
  segment_id: string;
  label: string;
  multiplier: number;
  probability: number;
  color: string;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type WheelSpin = {
  spin_id: string;
  client_spin_id: string | null;
  user_id: string;
  display_name: string;
  avatar: string | null;
  bet_amount: number;
  selected_segment_id: string | null;
  label: string;
  multiplier: number;
  result_amount: number;
  settings_version: number;
  settings_snapshot: Record<string, unknown>;
  created_at: string;
};

export type WheelChatMessage = {
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

export type WheelLeaderboardEntry = {
  user_id: string;
  account_name: string;
  display_name: string;
  avatar_url: string | null;
  total_winnings: number;
  biggest_win: number;
  total_spins: number;
  jackpot_hits: number;
  win_count: number;
  win_rate: number;
  updated_at: string;
};

export type WheelPublicState = {
  settings: WheelSettings;
  segments: WheelSegment[];
  last_spin_at: string | null;
  cooldown_remaining_seconds: number;
};

export type WheelJackpotInfo = {
  base_jackpot: number;
  total_contribution: number;
  jackpot_amount: number;
};

export type WheelHousePnlInfo = {
  total_bet: number;
  total_payout: number;
  total_spins: number;
  house_pnl: number;
};

export type WheelPendingBet = {
  round_cycle: number;
  bet_amount: number;
  created_at: string;
};

export type AdminWheelSettingsPayload = {
  enabled: boolean;
  min_bet: number;
  max_bet: number;
  cooldown_seconds: number;
  default_jackpot: number;
  segments: Array<{
    label: string;
    multiplier: number;
    probability: number;
    color: string;
    enabled: boolean;
    sort_order: number;
  }>;
  expected_version: number | null;
};


