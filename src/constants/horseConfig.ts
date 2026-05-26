export const HORSE_RACING_ROUTE = '/games/horse-racing';
export const HORSE_RACING_ADMIN_ROUTE = '/admin/games/horse-racing';

export const HORSE_CHAT_MAX_LENGTH = 300;
export const HORSE_EMOJI_QUICK_REACTIONS = ['🔥', '🐎', '💨', '🎯', '💰'] as const;
export const HORSE_QUICK_BETS = [10, 50, 100, 500] as const;

export const HORSE_STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  betting: 'Betting',
  locked: 'Locked',
  racing: 'Racing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
