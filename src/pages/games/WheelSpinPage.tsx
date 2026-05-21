import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Trophy, LogIn, Timer, Users, Wifi, Coins } from 'lucide-react';
import { BetPanel } from '../../components/wheel/BetPanel';
import { Wheel } from '../../components/wheel/Wheel';
import { WheelChat } from '../../components/wheel/WheelChat';
import { WheelHistory } from '../../components/wheel/WheelHistory';
import { WheelLeaderboard } from '../../components/wheel/WheelLeaderboard';
import { useWheelSpin } from '../../hooks/useWheelSpin';
import { formatNumber } from '../../lib/dice';
import { wheelSpinService } from '../../services/wheelSpinService';
import type { OnlineUser, UserProfile } from '../../types';
import type { WheelSpin } from '../../types/wheel';

type WheelSpinPageProps = {
  profile: UserProfile | null;
  sessionToken: string | null;
  onSignInClick: () => void;
  users: OnlineUser[];
  presenceStatus: string;
  onHugeWinHeaderAlert?: (payload: { displayName: string; pointsChange: number; createdAt: string; id: string }) => void;
};

type ConfettiDot = {
  id: string;
  left: string;
  delay: string;
  duration: string;
  color: string;
};

type RoundPhase = 'betting' | 'spinning';

const BETTING_SECONDS = 60;
const SPINNING_SECONDS = 10;
const ROUND_SECONDS = BETTING_SECONDS + SPINNING_SECONDS;
const PENDING_BET_STORAGE_PREFIX = 'wheel-pending-bet:';
const PENDING_BET_TTL_MS = 2 * ROUND_SECONDS * 1000;

function createConfetti(): ConfettiDot[] {
  return Array.from({ length: 26 }).map((_, index) => ({
    id: `dot-${index}-${Math.random().toString(36).slice(2)}`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${2 + Math.random() * 1.4}s`,
    color: ['#facc15', '#22d3ee', '#f472b6', '#4ade80', '#a78bfa'][index % 5],
  }));
}

function getRoundState(nowMs: number): { cycle: number; phase: RoundPhase; secondsLeft: number } {
  const roundMs = ROUND_SECONDS * 1000;
  const bettingMs = BETTING_SECONDS * 1000;
  const cycle = Math.floor(nowMs / roundMs);
  const elapsed = nowMs % roundMs;

  if (elapsed < bettingMs) {
    return {
      cycle,
      phase: 'betting',
      secondsLeft: Math.max(0, Math.ceil((bettingMs - elapsed) / 1000)),
    };
  }

  return {
    cycle,
    phase: 'spinning',
    secondsLeft: Math.max(0, Math.ceil((roundMs - elapsed) / 1000)),
  };
}


export function WheelSpinPage({ profile, sessionToken, onSignInClick, users, presenceStatus, onHugeWinHeaderAlert }: WheelSpinPageProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [confirmedBetAmount, setConfirmedBetAmount] = useState<number | null>(null);
  const [isBetConfirmed, setIsBetConfirmed] = useState(false);
  const [activeSpin, setActiveSpin] = useState<WheelSpin | null>(null);
  const [isWheelAnimating, setIsWheelAnimating] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiDot[]>([]);
  const [submittingBet, setSubmittingBet] = useState(false);
  const [phase, setPhase] = useState<RoundPhase>(() => getRoundState(Date.now()).phase);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(() => getRoundState(Date.now()).secondsLeft);
  const [currentCycle, setCurrentCycle] = useState(() => getRoundState(Date.now()).cycle);
  const [displayedRecentSpins, setDisplayedRecentSpins] = useState<WheelSpin[]>([]);
  const [displayedRecentWinners, setDisplayedRecentWinners] = useState<WheelSpin[]>([]);
  const [isRevealLocked, setIsRevealLocked] = useState(false);
  const [availablePointsDisplayOverride, setAvailablePointsDisplayOverride] = useState<number | null>(null);
  const [resultModal, setResultModal] = useState<{
    spin: WheelSpin;
    net: number;
  } | null>(null);

  const lastHandledCycleRef = useRef<number>(-1);
  const latestRoundStateRef = useRef(getRoundState(Date.now()));
  const syncedPendingCycleRef = useRef<number | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const modalAutoCloseRef = useRef<number | null>(null);

  const {
    publicState,
    recentSpins,
    recentWinners,
    leaderboard,
    chatMessages,
    jackpotInfo,
    myStats,
    spinning,
    loading,
    error,
    submitBet,
    spinSubmittedBet,
    sendChatMessage,
    reload,
  } = useWheelSpin({
    sessionToken,
    userId: profile?.uid ?? null,
  });

  const settings = publicState?.settings;
  const segments = publicState?.segments ?? [];
  const availablePoints = profile ? Math.max(0, profile.points - profile.locked_points) : 0;
  const displayAvailablePoints = availablePointsDisplayOverride ?? availablePoints;
  const pendingBetStorageKey = profile ? `${PENDING_BET_STORAGE_PREFIX}${profile.uid}` : null;

  const persistPendingBet = useCallback(
    (value: { betAmount: number; roundCycle: number }) => {
      if (!pendingBetStorageKey) {
        return;
      }

      try {
        window.sessionStorage.setItem(
          pendingBetStorageKey,
          JSON.stringify({
            betAmount: value.betAmount,
            roundCycle: value.roundCycle,
            savedAt: Date.now(),
          }),
        );
      } catch {
        // ignore storage failures
      }
    },
    [pendingBetStorageKey],
  );

  const clearPendingBetPersist = useCallback(() => {
    if (!pendingBetStorageKey) {
      return;
    }
    try {
      window.sessionStorage.removeItem(pendingBetStorageKey);
    } catch {
      // ignore storage failures
    }
  }, [pendingBetStorageKey]);

  useEffect(() => {
    if (isRevealLocked) {
      return;
    }
    setDisplayedRecentSpins(recentSpins);
  }, [isRevealLocked, recentSpins]);

  useEffect(() => {
    if (isRevealLocked) {
      return;
    }
    setDisplayedRecentWinners(recentWinners);
  }, [isRevealLocked, recentWinners]);

  const normalizedBet = useMemo(() => {
    if (!settings) {
      return betAmount;
    }

    const maxAllowed = Math.max(settings.min_bet, Math.min(settings.max_bet, availablePoints || settings.max_bet));
    return Math.max(settings.min_bet, Math.min(betAmount, maxAllowed));
  }, [availablePoints, betAmount, settings]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setBetAmount((current) => {
      const maxAllowed = Math.max(settings.min_bet, Math.min(settings.max_bet, availablePoints || settings.max_bet));
      return Math.max(settings.min_bet, Math.min(current, maxAllowed));
    });
  }, [availablePoints, settings]);

  const canConfirmBet =
    Boolean(profile && settings && settings.enabled) &&
    normalizedBet >= (settings?.min_bet ?? 0) &&
    normalizedBet <= (settings?.max_bet ?? Number.MAX_SAFE_INTEGER) &&
    normalizedBet <= availablePoints;

  useEffect(() => {
    if (isBetConfirmed && confirmedBetAmount !== null && normalizedBet !== confirmedBetAmount) {
      setIsBetConfirmed(false);
    }
  }, [confirmedBetAmount, isBetConfirmed, normalizedBet]);

  useEffect(() => {
    if (!pendingBetStorageKey || !settings || !profile) {
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(pendingBetStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as { betAmount?: number; roundCycle?: number; savedAt?: number };
      const persistedBet = Number(parsed.betAmount ?? 0);
      const savedAt = Number(parsed.savedAt ?? 0);
      if (!Number.isFinite(persistedBet) || persistedBet <= 0) {
        return;
      }

      // Keep persisted pending bet only for a short window to avoid stale round state.
      if (!Number.isFinite(savedAt) || savedAt <= 0 || Date.now() - savedAt > PENDING_BET_TTL_MS) {
        clearPendingBetPersist();
        return;
      }

      const restoredBet = Math.max(settings.min_bet, Math.min(persistedBet, settings.max_bet, availablePoints || settings.max_bet));
      setBetAmount(restoredBet);
      setConfirmedBetAmount(restoredBet);
      setIsBetConfirmed(true);
    } catch {
      // ignore malformed storage
    }
  }, [availablePoints, clearPendingBetPersist, pendingBetStorageKey, profile, settings]);

  useEffect(() => {
    if (!sessionToken || !profile) {
      syncedPendingCycleRef.current = null;
      setConfirmedBetAmount(null);
      setIsBetConfirmed(false);
      setAvailablePointsDisplayOverride(null);
      clearPendingBetPersist();
      return;
    }

    if (!settings || !settings.enabled) {
      return;
    }

    if (syncedPendingCycleRef.current === currentCycle) {
      return;
    }

    let cancelled = false;
    syncedPendingCycleRef.current = currentCycle;

    void wheelSpinService.getMyPendingBet(sessionToken).then((result) => {
      if (cancelled || result.error) {
        return;
      }

      if (result.data) {
        const restoredBet = Math.max(
          settings.min_bet,
          Math.min(result.data.bet_amount, settings.max_bet, availablePoints || settings.max_bet),
        );
        setBetAmount(restoredBet);
        setConfirmedBetAmount(restoredBet);
        setIsBetConfirmed(true);
        persistPendingBet({ betAmount: restoredBet, roundCycle: result.data.round_cycle });
        return;
      }

      setConfirmedBetAmount(null);
      setIsBetConfirmed(false);
      clearPendingBetPersist();
    });

    return () => {
      cancelled = true;
    };
  }, [availablePoints, clearPendingBetPersist, currentCycle, persistPendingBet, profile, sessionToken, settings]);

  const runRoundSpin = useCallback(
    async (cycle: number) => {
      lastHandledCycleRef.current = cycle;

      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }

      setIsWheelAnimating(true);
      animationTimerRef.current = window.setTimeout(() => {
        setIsWheelAnimating(false);
        animationTimerRef.current = null;
      }, SPINNING_SECONDS * 1000);

      const roundBetAmount = isBetConfirmed && confirmedBetAmount !== null ? confirmedBetAmount : null;

      if (!profile || !settings || !settings.enabled || roundBetAmount === null) {
        return;
      }

      // One confirmation is valid for one round only.
      setIsBetConfirmed(false);
      setConfirmedBetAmount(null);
      clearPendingBetPersist();

      if (roundBetAmount > availablePoints) {
        return;
      }

      setAvailablePointsDisplayOverride(availablePoints);

      const nextSpin = await spinSubmittedBet();
      if (!nextSpin) {
        setAvailablePointsDisplayOverride(null);
        return;
      }

      setActiveSpin(nextSpin);
      setIsRevealLocked(true);

      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }

      revealTimerRef.current = window.setTimeout(() => {
        const net = nextSpin.result_amount - nextSpin.bet_amount;

        if (nextSpin.multiplier >= 5) {
          setConfetti(createConfetti());
        }

        if (net > 0) {
          setResultModal({ spin: nextSpin, net });

          if (modalAutoCloseRef.current !== null) {
            window.clearTimeout(modalAutoCloseRef.current);
          }
          modalAutoCloseRef.current = window.setTimeout(() => {
            setResultModal(null);
            modalAutoCloseRef.current = null;
          }, 5000);

          if (net >= 50000000 && onHugeWinHeaderAlert) {
            onHugeWinHeaderAlert({
              id: `wheel-huge-${nextSpin.spin_id}`,
              displayName: nextSpin.display_name,
              pointsChange: net,
              createdAt: nextSpin.created_at,
            });
          }
        }

        void reload().finally(() => {
          setIsRevealLocked(false);
          setAvailablePointsDisplayOverride(null);
        });
        revealTimerRef.current = null;
      }, SPINNING_SECONDS * 1000);
    },
    [availablePoints, confirmedBetAmount, isBetConfirmed, onHugeWinHeaderAlert, profile, reload, settings, spinSubmittedBet],
  );

  useEffect(() => {
    const tick = () => {
      const state = getRoundState(Date.now());
      const prev = latestRoundStateRef.current;

      if (state.phase !== prev.phase) {
        setPhase(state.phase);
      }
      if (state.secondsLeft !== prev.secondsLeft) {
        setPhaseSecondsLeft(state.secondsLeft);
      }
      if (state.cycle !== prev.cycle) {
        setCurrentCycle(state.cycle);
      }

      latestRoundStateRef.current = state;

      if (state.phase === 'spinning' && state.cycle !== lastHandledCycleRef.current) {
        void runRoundSpin(state.cycle);
      }
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [runRoundSpin]);

  useEffect(() => {
    if (confetti.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => setConfetti([]), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [confetti]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
      }
      if (revealTimerRef.current !== null) {
        window.clearTimeout(revealTimerRef.current);
      }
      if (modalAutoCloseRef.current !== null) {
        window.clearTimeout(modalAutoCloseRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#060b1e] via-[#080e22] to-[#030612] p-6 sm:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_15px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.15),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                <Sparkles size={10} className="animate-spin-slow" />
                Auto Round Engine
              </span>
            </div>
            <h2 className="mt-2.5 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
              Neon Fortune <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">Wheel</span>
            </h2>
            <p className="mt-2 max-w-2xl text-xs text-slate-400 font-medium leading-relaxed">
              60s betting phase + 10s spin result phase. You must submit a bet to join automatic spins.
            </p>
          </div>
          {!profile ? (
            <button
              className="relative group overflow-hidden flex items-center gap-2 px-5 py-3 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 text-xs font-black uppercase tracking-wider text-cyan-300 transition-all hover:bg-cyan-500/20 hover:border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:shadow-[0_0_25px_rgba(34,211,238,0.3)]"
              onClick={onSignInClick}
              type="button"
            >
              <LogIn size={14} className="group-hover:translate-x-0.5 transition-transform" />
              Sign In To Join
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-xs text-rose-300 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
          {error}
        </div>
      ) : null}

      {resultModal ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl border border-emerald-400/35 bg-gradient-to-br from-[#0a1a14] via-[#09120e] to-[#040807] p-6 shadow-[0_0_45px_rgba(16,185,129,0.25)]">
            <div className="text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Winning Result</div>
              <div className="mt-2 text-3xl font-black text-emerald-300 font-mono">+{formatNumber(resultModal.net)}</div>
              <div className="mt-2 text-xs text-slate-300 font-bold">
                {resultModal.spin.display_name} hit <span className="text-white">{resultModal.spin.label}</span> (x{resultModal.spin.multiplier})
              </div>
              <button
                className="mt-5 choice-button rounded-xl border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200"
                onClick={() => setResultModal(null)}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b0f19]/70 to-[#04070e]/90 p-5 sm:p-6 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.04),transparent_50%)] pointer-events-none" />

          {confetti.length > 0 && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
              {confetti.map((dot) => (
                <span
                  key={dot.id}
                  className="absolute top-0 h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]"
                  style={{
                    left: dot.left,
                    color: dot.color,
                    backgroundColor: dot.color,
                    animation: `wheel-confetti ${dot.duration} ease-in forwards`,
                    animationDelay: dot.delay,
                  }}
                />
              ))}
            </div>
          )}

          <Wheel segments={segments} spin={activeSpin} spinning={isWheelAnimating} />

          <div className="mt-6 space-y-4">
            <BetPanel
              maxAvailable={displayAvailablePoints}
              maxBet={settings?.max_bet ?? 100000}
              minBet={settings?.min_bet ?? 10}
              onChange={setBetAmount}
              value={normalizedBet}
            />

            <button
              className="choice-button w-full rounded-2xl border-cyan-500/40 bg-cyan-500/10 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.2)] transition-all hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canConfirmBet || phase !== 'betting' || spinning || submittingBet}
              onClick={async () => {
                setSubmittingBet(true);
                const ok = await submitBet(normalizedBet);
                setSubmittingBet(false);

                if (!ok) {
                  setIsBetConfirmed(false);
                  setConfirmedBetAmount(null);
                  setAvailablePointsDisplayOverride(null);
                  clearPendingBetPersist();
                  return;
                }

                setConfirmedBetAmount(normalizedBet);
                setIsBetConfirmed(true);
                persistPendingBet({ betAmount: normalizedBet, roundCycle: getRoundState(Date.now()).cycle });
              }}
              type="button"
            >
              {submittingBet ? 'Submitting...' : isBetConfirmed && confirmedBetAmount === normalizedBet ? 'Bet Confirmed' : 'Submit Bet'}
            </button>

            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-center shadow-[0_0_20px_rgba(34,211,238,0.12)]">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                {phase === 'betting' ? 'Betting Phase' : 'Spinning Phase'}
              </div>
              <div className="mt-1 text-3xl font-black text-cyan-200 font-mono">{phaseSecondsLeft}s</div>
              <div className="mt-2 text-[10px] font-bold text-slate-400">
                {phase === 'betting'
                  ? 'Submit your bet before countdown reaches 0.'
                  : 'Wheel is spinning for 10 seconds to reveal result.'}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-slate-400">
              Confirmed Bet:{' '}
              <span className={`font-black ${isBetConfirmed ? 'text-emerald-300' : 'text-slate-500'}`}>
                {isBetConfirmed && confirmedBetAmount !== null ? formatNumber(confirmedBetAmount) : 'Not confirmed'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1.5">
              <div className="rounded-xl border border-white/5 bg-black/25 p-2 flex flex-col items-center justify-center gap-0.5 transition-colors hover:border-white/10">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                  <Timer size={10} className="text-cyan-400" />
                  Phase
                </div>
                <span className="text-xs font-black text-cyan-300 font-mono">{phaseSecondsLeft}s</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/25 p-2 flex flex-col items-center justify-center gap-0.5 transition-colors hover:border-white/10">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                  <Users size={10} className="text-fuchsia-400" />
                  Online
                </div>
                <span className="text-xs font-black text-fuchsia-300 font-mono">{users.length}</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/25 p-2 flex flex-col items-center justify-center gap-0.5 transition-colors hover:border-white/10">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                  <Wifi size={10} className="text-emerald-400 animate-pulse" />
                  Connection
                </div>
                <span className="text-xs font-black text-emerald-300 uppercase tracking-widest text-center text-[10px]">{presenceStatus}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 flex flex-col justify-between">
          <div className="grid grid-cols-1 gap-3.5">
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#1a1305] to-[#090602] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.35)]">
              <div className="absolute top-[-20px] right-[-20px] w-16 h-16 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
              <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">
                <Coins size={11} className="text-amber-300" />
                Live Jackpot
              </div>
              <div className="mt-2 text-2xl font-black text-amber-200 font-mono tracking-tight">
                {formatNumber(jackpotInfo?.jackpot_amount ?? 100000)}
              </div>
              <div className="mt-1 text-[10px] font-bold text-slate-400">
                Base {formatNumber(jackpotInfo?.base_jackpot ?? 100000)} + 50% total contributions
              </div>
              <div className="mt-1 text-[10px] text-slate-500">Total poured: {formatNumber(jackpotInfo?.total_contribution ?? 0)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-[#091512] to-[#040807] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all hover:border-emerald-500/20">
                <div className="absolute top-[-20px] right-[-20px] w-16 h-16 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
              <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <Coins size={11} className="text-emerald-400 animate-pulse" />
                  Available Points
                </div>
                <div className="mt-2 text-xl font-black text-emerald-300 font-mono tracking-tight">{formatNumber(displayAvailablePoints)}</div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/10 bg-gradient-to-br from-[#15091c] to-[#08040b] p-4 shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all hover:border-fuchsia-500/20">
                <div className="absolute top-[-20px] right-[-20px] w-16 h-16 rounded-full bg-fuchsia-500/5 blur-xl pointer-events-none" />
                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <Trophy size={11} className="text-fuchsia-400 animate-bounce" />
                  Your Winnings
                </div>
                <div className="mt-2 text-xl font-black text-fuchsia-300 font-mono tracking-tight">
                  {formatNumber(myStats?.total_winnings ?? 0)}
                </div>
              </div>
            </div>

          </div>

          <div className="flex-1 mt-1 flex flex-col justify-end">
            <WheelHistory spins={displayedRecentWinners} title="Recent Winners" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 grid-cols-1 lg:grid-cols-3 items-stretch">
        <div className="flex flex-col h-[380px] justify-between">
          <WheelHistory spins={displayedRecentSpins} title="Recent Spins" />
        </div>
        <div className="flex flex-col h-[380px] justify-between">
          <WheelLeaderboard items={leaderboard} />
        </div>
        <div className="flex flex-col h-[380px]">
          <WheelChat canChat={Boolean(profile && sessionToken && !profile.is_banned)} messages={chatMessages} onSend={sendChatMessage} />
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes wheel-confetti {
          0% { transform: translateY(-15px) rotate(0deg) scale(1.1); opacity: 1; }
          40% { transform: translateY(180px) rotate(180deg) scale(1); opacity: 0.9; }
          100% { transform: translateY(390px) rotate(360deg) scale(0.6); opacity: 0; }
        }
      ` }} />
    </div>
  );
}
