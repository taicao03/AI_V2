import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '../types';
import { normalizeProfile, supabase, TABLES } from '../lib/supabaseClient';
import { authService } from '../services/authService';

type AccountAuthRow = UserProfile & {
  session_token: string;
};

function normalizeAccountName(value: string): string {
  return value.trim().toLowerCase();
}

function validateAccountName(value: string): string | null {
  if (!/^[a-z0-9_]{3,24}$/.test(value)) {
    return 'Ten tai khoan chi gom a-z, 0-9, dau gach duoi va dai 3-24 ky tu.';
  }

  return null;
}

function getStoredSessionToken(): string | null {
  return authService.getSessionToken();
}

function storeSessionToken(token: string): void {
  authService.setSessionToken(token);
}

function clearSessionToken(): void {
  authService.clearSessionToken();
}

function getFriendlyError(message: string): string {
  if (message.toLowerCase().includes('rate limit')) {
    return 'He thong da tat signup email. Hay chay SQL schema/patch moi de dung account auth khong email.';
  }

  return message;
}

export function useAuth() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (token: string) => {
    const client = supabase;

    if (!client) {
      setError('Chua cau hinh Supabase.');
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setError(null);

    const { data, error: profileError } = await client
      .rpc('get_account_profile', {
        p_session_token: token,
      })
      .single<UserProfile>();

    if (profileError) {
      clearSessionToken();
      setSessionToken(null);
      setProfile(null);
      setError(getFriendlyError(profileError.message));
      setProfileLoading(false);
      return;
    }

    setSessionToken(token);
    setProfile(normalizeProfile(data));
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    const token = getStoredSessionToken();

    if (!supabase || !token) {
      setAuthLoading(false);
      return;
    }

    void loadProfile(token).finally(() => setAuthLoading(false));
  }, [loadProfile]);

  useEffect(() => {
    const client = supabase;

    if (!client || !profile) {
      return;
    }

    let mounted = true;
    const channel = client
      .channel(`profile-${profile.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.users, filter: `uid=eq.${profile.uid}` },
        (payload) => {
          if (!mounted || !payload.new) {
            return;
          }

          const nextProfile = payload.new as Partial<UserProfile>;
          setProfile((currentProfile) =>
            currentProfile
              ? normalizeProfile({
                  ...currentProfile,
                  ...nextProfile,
                })
              : null,
          );
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void client.removeChannel(channel);
    };
  }, [profile?.uid]);

  useEffect(() => {
    const client = supabase;

    if (!client || !sessionToken || !profile) {
      return;
    }

    let mounted = true;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      client
        .rpc('get_account_profile', {
          p_session_token: sessionToken,
        })
        .single<UserProfile>()
        .then(({ data, error: refreshError }) => {
          if (!mounted || refreshError || !data) {
            return;
          }

          setProfile(normalizeProfile(data));
        });
    }, 15000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [profile?.uid, sessionToken]);

  const signIn = useCallback(async (accountName: string, password: string) => {
    const client = supabase;

    if (!client) {
      setError('Chua cau hinh Supabase.');
      return false;
    }

    setActionLoading(true);
    setError(null);

    const normalizedAccountName = normalizeAccountName(accountName);
    const validationError = validateAccountName(normalizedAccountName);

    if (validationError) {
      setError(validationError);
      setActionLoading(false);
      return false;
    }

    const { data, error: signInError } = await client
      .rpc('login_account', {
        p_account_name: normalizedAccountName,
        p_password: password,
      })
      .single<AccountAuthRow>();

    if (signInError || !data) {
      setError(getFriendlyError(signInError?.message ?? 'Khong the dang nhap.'));
      setActionLoading(false);
      return false;
    }

    storeSessionToken(data.session_token);
    await loadProfile(data.session_token);
    setActionLoading(false);
    return true;
  }, [loadProfile]);

  const signUp = useCallback(async (displayName: string, accountName: string, password: string) => {
    const client = supabase;

    if (!client) {
      setError('Chua cau hinh Supabase.');
      return false;
    }

    setActionLoading(true);
    setError(null);

    const normalizedAccountName = normalizeAccountName(accountName);
    const validationError = validateAccountName(normalizedAccountName);

    if (validationError) {
      setError(validationError);
      setActionLoading(false);
      return false;
    }

    const { data, error: signUpError } = await client
      .rpc('register_account', {
        p_account_name: normalizedAccountName,
        p_display_name: displayName.trim() || normalizedAccountName,
        p_password: password,
      })
      .single<AccountAuthRow>();

    if (signUpError || !data) {
      setError(getFriendlyError(signUpError?.message ?? 'Khong the tao tai khoan.'));
      setActionLoading(false);
      return false;
    }

    storeSessionToken(data.session_token);
    await loadProfile(data.session_token);
    setActionLoading(false);
    return true;
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const client = supabase;
    const token = sessionToken;

    setActionLoading(true);

    if (client && token) {
      await client.rpc('logout_account', {
        p_session_token: token,
      });
    }

    clearSessionToken();
    setSessionToken(null);
    setProfile(null);
    setActionLoading(false);
  }, [sessionToken]);

  const updateProfile = useCallback(async (displayName: string, avatarUrl: string | null) => {
    const client = supabase;

    if (!client || !sessionToken) {
      setError('Ban can dang nhap de cap nhat profile.');
      return false;
    }

    setActionLoading(true);
    setError(null);

    const { data, error: updateError } = await client
      .rpc('update_account_profile', {
        p_session_token: sessionToken,
        p_display_name: displayName.trim() || profile?.display_name || 'Demo player',
        p_avatar_url: avatarUrl?.trim() || null,
      })
      .single<UserProfile>();

    if (updateError || !data) {
      setError(getFriendlyError(updateError?.message ?? 'Khong the cap nhat profile.'));
      setActionLoading(false);
      return false;
    }

    setProfile(normalizeProfile(data));
    setActionLoading(false);
    return true;
  }, [profile?.display_name, sessionToken]);

  return {
    sessionToken,
    session: sessionToken ? { access_token: sessionToken } : null,
    user: profile ? { id: profile.uid } : null,
    profile,
    loading: authLoading || profileLoading,
    actionLoading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    reloadProfile: () => (sessionToken ? loadProfile(sessionToken) : undefined),
  };
}
