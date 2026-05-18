import { useEffect, useMemo, useRef, useState } from 'react';
import type { OnlineUser, OnlineUserJoinEvent, UserProfile } from '../types';
import { supabase } from '../lib/supabaseClient';

const PLAYER_COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#f0abfc', '#60a5fa', '#c084fc'];

function colorForId(value: string): string {
  const total = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PLAYER_COLORS[total % PLAYER_COLORS.length];
}

function normalizePresence(presence: unknown, currentUid: string): OnlineUser | null {
  if (!presence || typeof presence !== 'object') {
    return null;
  }

  const user = presence as Partial<OnlineUser>;

  if (!user.uid || !user.displayName || !user.onlineAt) {
    return null;
  }

  return {
    uid: user.uid,
    accountName: user.accountName ?? user.uid.slice(0, 8),
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    points: Number(user.points ?? 0),
    vipLevel: Math.max(0, Math.min(10, Number(user.vipLevel ?? 0))),
    onlineAt: user.onlineAt,
    color: user.color ?? colorForId(user.uid),
    isCurrent: user.uid === currentUid,
  };
}

function flattenPresenceState(state: Record<string, unknown[]>, currentUid: string): OnlineUser[] {
  const users = new Map<string, OnlineUser>();

  for (const presences of Object.values(state)) {
    for (const presence of presences) {
      const user = normalizePresence(presence, currentUid);

      if (!user) {
        continue;
      }

      users.set(user.uid, user);
    }
  }

  return [...users.values()].sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent));
}

function normalizeJoinedUsers(presences: unknown, currentUid: string): OnlineUser[] {
  if (!Array.isArray(presences)) {
    return [];
  }

  return presences
    .map((presence) => normalizePresence(presence, currentUid))
    .filter((user): user is OnlineUser => Boolean(user));
}

export function useOnlineUsers(profile: UserProfile | null) {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [joinEvents, setJoinEvents] = useState<OnlineUserJoinEvent[]>([]);
  const [status, setStatus] = useState('OFFLINE');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<{ track: (payload: Record<string, unknown>) => Promise<unknown> } | null>(null);
  const hasInitialSyncRef = useRef(false);

  const currentPresence = useMemo(() => {
    if (!profile) {
      return null;
    }

    return {
      uid: profile.uid,
      accountName: profile.account_name,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      points: profile.points,
      vipLevel: profile.vip_level,
      onlineAt: new Date().toISOString(),
      color: colorForId(profile.uid),
    };
  }, [
    profile?.account_name,
    profile?.avatar_url,
    profile?.display_name,
    profile?.uid,
    profile?.vip_level,
  ]);

  const currentPresenceRef = useRef(currentPresence);

  useEffect(() => {
    currentPresenceRef.current = currentPresence;
  }, [currentPresence]);

  useEffect(() => {
    const client = supabase;
    const currentUid = profile?.uid;

    if (!client || !currentUid) {
      setUsers([]);
      setJoinEvents([]);
      setStatus('OFFLINE');
      setReady(false);
      return;
    }

    hasInitialSyncRef.current = false;
    setReady(false);

    const channel = client.channel('dice-lobby', {
      config: {
        presence: {
          key: currentUid,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        setUsers(flattenPresenceState(channel.presenceState(), currentUid));
        hasInitialSyncRef.current = true;
        setReady(true);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        if (!hasInitialSyncRef.current) {
          return;
        }

        const joinedUsers = normalizeJoinedUsers(newPresences, currentUid).filter((user) => !user.isCurrent);

        if (joinedUsers.length === 0) {
          return;
        }

        const joinedAt = Date.now();
        setJoinEvents((currentEvents) => [
          ...currentEvents,
          ...joinedUsers.map((user, index) => ({
            id: `${user.uid}:${joinedAt}:${index}`,
            user,
          })),
        ].slice(-30));
      })
      .subscribe(async (nextStatus) => {
        setStatus(nextStatus);

        if (nextStatus === 'SUBSCRIBED') {
          setError(null);
        }

        if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
          setError('Khong the dong bo nguoi choi online.');
        }
      });

    return () => {
      channelRef.current = null;
      hasInitialSyncRef.current = false;
      setReady(false);
      void channel.untrack();
      void client.removeChannel(channel);
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (status !== 'SUBSCRIBED' || !currentPresence || !channelRef.current) {
      return;
    }

    void channelRef.current.track(currentPresence);
  }, [currentPresence, status]);

  return {
    users,
    joinEvents,
    status,
    ready,
    error,
  };
}
