import { getCurrentRound, settleDueRounds } from '../lib/supabaseClient';

export const roundService = {
  getCurrentRound,
  settleDueRounds,
};
