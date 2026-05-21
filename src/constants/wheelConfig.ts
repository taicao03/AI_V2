export const WHEEL_ROUTE = '/games/wheel-spin';
export const WHEEL_ADMIN_ROUTE = '/admin/games/wheel-spin/settings';

export const WHEEL_DEFAULT_SEGMENTS = [
  { label: 'Mat Trang', multiplier: 0, probability: 40, color: '#ef4444', enabled: true, sort_order: 1 },
  { label: 'An Ui', multiplier: 0.5, probability: 20, color: '#f59e0b', enabled: true, sort_order: 2 },
  { label: 'Hoa Von', multiplier: 1, probability: 20, color: '#38bdf8', enabled: true, sort_order: 3 },
  { label: 'Gap Doi', multiplier: 2, probability: 10, color: '#22c55e', enabled: true, sort_order: 4 },
  { label: 'Sieu Loi', multiplier: 3, probability: 6, color: '#8b5cf6', enabled: true, sort_order: 5 },
  { label: 'Mega Win', multiplier: 5, probability: 3, color: '#ec4899', enabled: true, sort_order: 6 },
  { label: 'JACKPOT', multiplier: 10, probability: 1, color: '#facc15', enabled: true, sort_order: 7 },
] as const;

export const WHEEL_CHAT_MAX_LENGTH = 300;
export const WHEEL_QUICK_BETS = [10, 50, 100] as const;

