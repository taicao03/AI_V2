const ACCOUNT_SESSION_KEY = 'dice_predictor_account_session';

export const authService = {
  getSessionToken() {
    return window.localStorage.getItem(ACCOUNT_SESSION_KEY);
  },

  setSessionToken(token: string) {
    window.localStorage.setItem(ACCOUNT_SESSION_KEY, token);
  },

  clearSessionToken() {
    window.localStorage.removeItem(ACCOUNT_SESSION_KEY);
  },
};
