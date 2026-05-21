import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { AdminBroadcastNotifications } from './components/AdminBroadcastNotifications';
import { BannedAccountModal } from './components/BannedAccountModal';
import { AuthPanel } from './components/AuthPanel';
import type { HeaderWinAlert } from './components/HeaderWinTicker';
import { type NotificationItem } from './components/NotificationCenter';
import { PrivateResultPopups, type PrivateResultPopupItem } from './components/PrivateResultPopups';
import { type RollFeedback } from './components/PredictionPanel';
import { useAuth } from './hooks/useAuth';
import { useAdminNotifications } from './hooks/useAdminNotifications';
import { useBetHistory } from './hooks/useBetHistory';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useOnlineUsers } from './hooks/useOnlineUsers';
import { useProfileStats } from './hooks/useProfileStats';
import { validateBetAmount } from './lib/dice';
import { claimDemoPoints, isSupabaseConfigured, placeBet } from './lib/supabaseClient';
import { AdminPage } from './pages/AdminPage';
import { ChatPage } from './pages/ChatPage';
import { HomePage } from './pages/HomePage';
import { PokerPage } from './pages/PokerPage';
import { RussianRoulettePage } from './pages/games/RussianRoulettePage';
import { WheelSpinPage } from './pages/games/WheelSpinPage';
import { npcService } from './services/npcService';
import type { Prediction } from './types';
import './index.css';

function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function useBrowserPath() {
  const [path, setPath] = useState(window.location.pathname);

  const navigate = useCallback((nextPath: string) => {
    window.history.pushState(null, '', nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return { navigate, path };
}

export default function App() {
  const auth = useAuth();
  const adminNotifications = useAdminNotifications();
  const { navigate, path } = useBrowserPath();
  const {
    currentRound,
    currentRoundBetTotals,
    allHistory,
    secondsLeft,
    settling,
    error: historyError,
    connected,
  } = useBetHistory();
  const {
    leaders,
    loading: leaderboardLoading,
    error: leaderboardError,
  } = useLeaderboard();
  const {
    stats: profileStats,
    loading: profileStatsLoading,
    error: profileStatsError,
  } = useProfileStats(auth.profile?.uid, auth.profile?.points ?? 0);
  const {
    joinEvents,
    users,
    ready: presenceReady,
    status: presenceStatus,
    error: usersError,
  } = useOnlineUsers(auth.profile);

  const [prediction, setPrediction] = useState<Prediction>({
    kind: 'outcome',
    value: 'tai',
  });
  const [betAmount, setBetAmount] = useState(10);
  const [rolling, setRolling] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adminRefreshLoading, setAdminRefreshLoading] = useState(false);
  const [feedback, setFeedback] = useState<RollFeedback | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [privateResultPopups, setPrivateResultPopups] = useState<PrivateResultPopupItem[]>([]);
  const [wheelHeaderWinAlerts, setWheelHeaderWinAlerts] = useState<Array<HeaderWinAlert & { expiresAt: number }>>([]);
  const [dismissedAdminNotificationIds, setDismissedAdminNotificationIds] = useState<Set<string>>(new Set());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const dismissedNotificationIdsRef = useRef(new Set<string>());
  const processedJoinEventIdsRef = useRef(new Set<string>());
  const processedPrivateResultIdsRef = useRef(new Set<string>());
  const hasHydratedPrivateResultsRef = useRef(false);
  const hasHydratedVipPresenceRef = useRef(false);
  const knownVipOnlineAtRef = useRef(new Map<string, string>());

  const availablePoints = auth.profile
    ? Math.max(0, auth.profile.points - auth.profile.locked_points)
    : 0;
  const isAuthenticated = Boolean(auth.sessionToken && auth.profile);
  const displayError =
    actionError ??
    auth.error ??
    historyError ??
    usersError ??
    leaderboardError ??
    profileStatsError ??
    null;

  // Auto-close modal on successful login
  useEffect(() => {
    if (isAuthenticated && isAuthModalOpen) {
      setIsAuthModalOpen(false);
    }
  }, [isAuthenticated, isAuthModalOpen]);

  const latestSettledRoundId = allHistory
    .filter((item) => item.status === 'settled')
    .sort((left, right) => {
      const leftTime = new Date(left.settled_at ?? left.created_at).getTime();
      const rightTime = new Date(right.settled_at ?? right.created_at).getTime();
      return rightTime - leftTime;
    })[0]?.round_id;
  const headerWinAlerts = Array.from(
    allHistory
      .filter(
        (item) =>
          latestSettledRoundId &&
          item.round_id === latestSettledRoundId &&
          item.status === 'settled' &&
          item.result === 'win' &&
          item.points_change > 0,
      )
      .reduce((alertsByUser, item) => {
        const userKey = item.user_id || item.display_name || item.bet_id;
        const currentAlert = alertsByUser.get(userKey);
        const settledAt = item.settled_at ?? item.created_at;

        alertsByUser.set(userKey, {
          id: currentAlert?.id ?? `${item.round_id}:${userKey}`,
          displayName: item.display_name ?? currentAlert?.displayName ?? 'Demo player',
          pointsChange: (currentAlert?.pointsChange ?? 0) + item.points_change,
          createdAt:
            currentAlert && new Date(currentAlert.createdAt).getTime() > new Date(settledAt).getTime()
              ? currentAlert.createdAt
              : settledAt,
        });

        return alertsByUser;
      }, new Map<string, HeaderWinAlert>())
      .values(),
  )
    .filter((alert) => alert.pointsChange >= 50000)
    .sort((left, right) => right.pointsChange - left.pointsChange)
    .slice(0, 6);

  const mergedHeaderWinAlerts = [...wheelHeaderWinAlerts, ...headerWinAlerts]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 12);

  const handleWheelHugeWinHeaderAlert = useCallback(
    (payload: { displayName: string; pointsChange: number; createdAt: string; id: string }) => {
      const expiresAt = Date.now() + 2 * 60 * 1000;
      setWheelHeaderWinAlerts((current) => {
        const withoutExpired = current.filter((item) => item.expiresAt > Date.now());
        if (withoutExpired.some((item) => item.id === payload.id)) {
          return withoutExpired;
        }
        return [
          {
            id: payload.id,
            displayName: payload.displayName,
            pointsChange: payload.pointsChange,
            createdAt: payload.createdAt,
            expiresAt,
          },
          ...withoutExpired,
        ].slice(0, 12);
      });
    },
    [],
  );

  useEffect(() => {
    const cleanupId = window.setInterval(() => {
      setWheelHeaderWinAlerts((current) => current.filter((item) => item.expiresAt > Date.now()));
    }, 10000);

    return () => window.clearInterval(cleanupId);
  }, []);

  useEffect(() => {
    if ((path !== '/admin' && path !== '/admin/games/russian-roulette' && path !== '/admin/games/wheel-spin/settings') || !auth.sessionToken) {
      return;
    }

    let mounted = true;
    setAdminRefreshLoading(true);

    Promise.resolve(auth.reloadProfile()).finally(() => {
      if (mounted) {
        setAdminRefreshLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [auth.sessionToken, path]);

  useEffect(() => {
    if (!auth.sessionToken) {
      return;
    }

    let mounted = true;
    let intervalId: number | null = null;

    const runNpcTick = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      void npcService.tickSystem(auth.sessionToken).then((result) => {
        if (!mounted || !result.error) {
          return;
        }
        console.warn('[NPC] tick error:', result.error.message);
      });
    };

    runNpcTick();
    const jitterMs = Math.floor(Math.random() * 5000);
    intervalId = window.setInterval(runNpcTick, 20000 + jitterMs);

    return () => {
      mounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [auth.sessionToken]);

  const notifyVipReturn = useCallback(
    (uid: string, displayName: string) => {
      if (uid === auth.profile?.uid) {
        return;
      }

      const notificationId = `vip-return:${uid}`;

      setNotifications((currentNotifications) => {
        const isDismissed = dismissedNotificationIdsRef.current.has(notificationId);
        const isVisible = currentNotifications.some((notification) => notification.id === notificationId);

        if (isDismissed || isVisible) {
          return currentNotifications;
        }

        return [
          {
            id: notificationId,
            kind: 'vip' as const,
            title: 'VIP 10 da tro lai',
            message: `${displayName} da tro lai phong Dice Predictor.`,
          },
          ...currentNotifications,
        ].slice(0, 4);
      });
    },
    [auth.profile?.uid],
  );

  useEffect(() => {
    processedJoinEventIdsRef.current.clear();
    hasHydratedVipPresenceRef.current = false;
    knownVipOnlineAtRef.current = new Map();
    dismissedNotificationIdsRef.current.clear();
    setNotifications((currentNotifications) =>
      currentNotifications.filter((notification) => !notification.id.startsWith('vip-return:')),
    );
  }, [auth.profile?.uid]);

  useEffect(() => {
    processedPrivateResultIdsRef.current.clear();
    hasHydratedPrivateResultsRef.current = false;
    setPrivateResultPopups([]);
  }, [auth.profile?.uid]);

  useEffect(() => {
    const currentUid = auth.profile?.uid;

    if (!currentUid) {
      return;
    }

    const settledUserBets = allHistory.filter(
      (item) =>
        item.user_id === currentUid &&
        item.status === 'settled' &&
        (item.result === 'win' || item.result === 'lose'),
    );

    if (!hasHydratedPrivateResultsRef.current) {
      for (const item of settledUserBets) {
        processedPrivateResultIdsRef.current.add(`round:${item.round_id}`);
      }

      hasHydratedPrivateResultsRef.current = true;
      return;
    }

    if (settledUserBets.length === 0) {
      return;
    }

    const betsByRound = settledUserBets.reduce((roundMap, item) => {
      const currentItems = roundMap.get(item.round_id) ?? [];
      currentItems.push(item);
      roundMap.set(item.round_id, currentItems);
      return roundMap;
    }, new Map<string, typeof settledUserBets>());

    const latestUnprocessedRound = Array.from(betsByRound.entries())
      .filter(([roundId]) => !processedPrivateResultIdsRef.current.has(`round:${roundId}`))
      .sort(([, leftBets], [, rightBets]) => {
        const leftTime = Math.max(...leftBets.map((item) => new Date(item.settled_at ?? item.created_at).getTime()));
        const rightTime = Math.max(...rightBets.map((item) => new Date(item.settled_at ?? item.created_at).getTime()));
        return rightTime - leftTime;
      })[0];

    if (!latestUnprocessedRound) {
      return;
    }

    const [latestRoundId, latestRoundUserBets] = latestUnprocessedRound;
    const processedRoundId = `round:${latestRoundId}`;

    if (processedPrivateResultIdsRef.current.has(processedRoundId)) {
      return;
    }

    processedPrivateResultIdsRef.current.add(processedRoundId);

    const pointsChange = latestRoundUserBets.reduce((total, item) => total + item.points_change, 0);

    if (pointsChange === 0) {
      return;
    }

    const result: PrivateResultPopupItem['result'] = pointsChange > 0 ? 'win' : 'lose';

    setPrivateResultPopups((currentPopups) =>
      [
        {
          id: processedRoundId,
          result,
          pointsChange,
        },
        ...currentPopups,
      ].slice(0, 4),
    );
  }, [allHistory, auth.profile?.uid]);

  useEffect(() => {
    if (privateResultPopups.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPrivateResultPopups((currentPopups) => currentPopups.slice(0, -1));
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [privateResultPopups]);

  useEffect(() => {
    const onlineUserIds = new Set(users.map((user) => user.uid));

    for (const notificationId of Array.from(dismissedNotificationIdsRef.current)) {
      if (!notificationId.startsWith('vip-return:')) {
        continue;
      }

      const vipUid = notificationId.replace('vip-return:', '');

      if (!onlineUserIds.has(vipUid)) {
        dismissedNotificationIdsRef.current.delete(notificationId);
      }
    }

    setNotifications((currentNotifications) =>
      currentNotifications.filter((notification) => {
        if (!notification.id.startsWith('vip-return:')) {
          return true;
        }

        const vipUid = notification.id.replace('vip-return:', '');
        return onlineUserIds.has(vipUid);
      }),
    );
  }, [users]);

  useEffect(() => {
    if (!presenceReady) {
      return;
    }

    const currentUid = auth.profile?.uid;
    const onlineVipUsers = users.filter((user) => user.vipLevel === 10 && user.uid !== currentUid);
    const nextKnownVipOnlineAt = new Map<string, string>();

    for (const vipUser of onlineVipUsers) {
      nextKnownVipOnlineAt.set(vipUser.uid, vipUser.onlineAt);
    }

    if (!hasHydratedVipPresenceRef.current) {
      knownVipOnlineAtRef.current = nextKnownVipOnlineAt;
      hasHydratedVipPresenceRef.current = true;
      return;
    }

    for (const vipUser of onlineVipUsers) {
      const previousOnlineAt = knownVipOnlineAtRef.current.get(vipUser.uid);

      if (!previousOnlineAt || previousOnlineAt !== vipUser.onlineAt) {
        notifyVipReturn(vipUser.uid, vipUser.displayName);
      }
    }

    knownVipOnlineAtRef.current = nextKnownVipOnlineAt;
  }, [auth.profile?.uid, notifyVipReturn, presenceReady, users]);

  useEffect(() => {
    const currentUid = auth.profile?.uid;

    for (const joinEvent of joinEvents) {
      if (processedJoinEventIdsRef.current.has(joinEvent.id)) {
        continue;
      }

      processedJoinEventIdsRef.current.add(joinEvent.id);

      const joinedUser = joinEvent.user;

      if (joinedUser.uid === currentUid || joinedUser.vipLevel !== 10) {
        continue;
      }

      notifyVipReturn(joinedUser.uid, joinedUser.displayName);
    }
  }, [auth.profile?.uid, joinEvents, notifyVipReturn]);

  const handleCloseNotification = useCallback((id: string) => {
    dismissedNotificationIdsRef.current.add(id);
    setNotifications((currentNotifications) => currentNotifications.filter((notification) => notification.id !== id));
  }, []);

  const handleClosePrivateResult = useCallback((id: string) => {
    setPrivateResultPopups((currentPopups) => currentPopups.filter((popup) => popup.id !== id));
  }, []);

  const handleDismissAdminNotification = useCallback((id: string) => {
    setDismissedAdminNotificationIds((currentIds) => new Set([...currentIds, id]));
  }, []);

  async function handleRoll() {
    if (rolling || !auth.profile || !auth.sessionToken || !isSupabaseConfigured) {
      return;
    }

    const validationError = validateBetAmount(betAmount, availablePoints);

    if (validationError) {
      setActionError(validationError);
      return;
    }

    setActionError(null);
    setRolling(true);

    try {
      const [betResponse] = await Promise.all([
        placeBet(prediction, betAmount, auth.sessionToken),
        sleep(350),
      ]);

      if (betResponse.error || !betResponse.data) {
        setActionError(betResponse.error?.message ?? 'Khong the xu ly bet.');
        return;
      }

      setFeedback({
        result: 'pending',
        pointsChange: 0,
        roundEndsAt: betResponse.data.round_ends_at,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Da co loi khi xu ly bet.');
    } finally {
      setRolling(false);
    }
  }

  async function handleClaimDemoPoints() {
    setClaimLoading(true);
    setActionError(null);

    const { error } = await claimDemoPoints(auth.sessionToken);

    if (error) {
      setActionError(error.message);
    }

    setClaimLoading(false);
  }

  if (path === '/admin' || path === '/admin/games/russian-roulette' || path === '/admin/games/wheel-spin/settings') {
    return (
      <>
        <AdminBroadcastNotifications
          dismissedIds={dismissedAdminNotificationIds}
          items={adminNotifications.visibleItems}
          onDismiss={handleDismissAdminNotification}
        />
        <BannedAccountModal profile={auth.profile} />
        <AdminPage
          initialTab={
            path === '/admin/games/russian-roulette'
              ? 'russian-roulette'
              : path === '/admin/games/wheel-spin/settings'
                ? 'wheel-spin'
                : 'stats'
          }
          loading={auth.loading || adminRefreshLoading}
          onBack={() => navigate('/')}
          profile={auth.profile}
          sessionToken={auth.sessionToken}
        />
      </>
    );
  }

  return (
    <AppShell
      connected={connected}
      headerWinAlerts={mergedHeaderWinAlerts}
      notifications={notifications}
      onCloseNotification={handleCloseNotification}
      onNavigate={navigate}
      onSignOut={auth.signOut}
      onSignInClick={() => setIsAuthModalOpen(true)}
      profile={auth.profile}
    >
      <AuthPanel
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={auth.signIn}
        onSignUp={auth.signUp}
        loading={auth.loading || auth.actionLoading}
        error={auth.error}
      />
      <AdminBroadcastNotifications
        dismissedIds={dismissedAdminNotificationIds}
        items={adminNotifications.visibleItems}
        onDismiss={handleDismissAdminNotification}
      />
      <PrivateResultPopups items={privateResultPopups} onClose={handleClosePrivateResult} />
      <BannedAccountModal profile={auth.profile} />
      {path === '/chat' ? (
        <ChatPage auth={auth} presenceStatus={presenceStatus} profile={auth.profile} users={users} />
      ) : path === '/poker' ? (
        <PokerPage
          onSignInClick={() => setIsAuthModalOpen(true)}
          profile={auth.profile}
          sessionToken={auth.sessionToken}
        />
      ) : path === '/games/russian-roulette' ? (
        <RussianRoulettePage
          onSignInClick={() => setIsAuthModalOpen(true)}
          profile={auth.profile}
          sessionToken={auth.sessionToken}
        />
      ) : path === '/games/wheel-spin' ? (
        <WheelSpinPage
          onHugeWinHeaderAlert={handleWheelHugeWinHeaderAlert}
          onSignInClick={() => setIsAuthModalOpen(true)}
          presenceStatus={presenceStatus}
          profile={auth.profile}
          sessionToken={auth.sessionToken}
          users={users}
        />
      ) : (
        <HomePage
          actionError={actionError}
          auth={auth}
          availablePoints={availablePoints}
          betAmount={betAmount}
          claimLoading={claimLoading}
          currentRound={currentRound}
          currentRoundBetTotals={currentRoundBetTotals}
          displayError={displayError}
          feedback={feedback}
          isAuthenticated={isAuthenticated}
          isBettingDisabled={!isSupabaseConfigured || auth.loading || !isAuthenticated}
          leaderboardLoading={leaderboardLoading}
          leaders={leaders}
          onBetAmountChange={(value) => setBetAmount(Number.isFinite(value) ? Math.trunc(value) : 0)}
          onClaimDemoPoints={handleClaimDemoPoints}
          onPredictionChange={setPrediction}
          onRoll={handleRoll}
          onSignInClick={() => setIsAuthModalOpen(true)}
          prediction={prediction}
          profile={auth.profile}
          profileStats={profileStats}
          profileStatsLoading={profileStatsLoading}
          rolling={rolling}
          secondsLeft={secondsLeft}
          settling={settling}
          presenceStatus={presenceStatus}
          users={users}
        />
      )}
    </AppShell>
  );
}
