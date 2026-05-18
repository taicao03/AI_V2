import type { Prediction } from '../types';
import { placeBet } from '../lib/supabaseClient';

export const betService = {
  placeBet(prediction: Prediction, betAmount: number, sessionToken: string | null) {
    return placeBet(prediction, betAmount, sessionToken);
  },
};
