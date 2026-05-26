import { useMemo, useState } from 'react';
import { LogIn, Send, Timer, Users, Wifi, Sparkles } from 'lucide-react';
import { BetPanel } from '../../components/horse-racing/BetPanel';
import { HorseCard } from '../../components/horse-racing/HorseCard';
import { RaceHistory } from '../../components/horse-racing/RaceHistory';
import { RaceLeaderboard } from '../../components/horse-racing/RaceLeaderboard';
import { RaceTrack } from '../../components/horse-racing/RaceTrack';
import { HORSE_CHAT_MAX_LENGTH, HORSE_EMOJI_QUICK_REACTIONS } from '../../constants/horseConfig';
import { useHorseRace } from '../../hooks/useHorseRace';
import type { OnlineUser, UserProfile } from '../../types';

type HorseRacingPageProps = {
  profile: UserProfile | null;
  sessionToken: string | null;
  onSignInClick: () => void;
  onProfileRefresh?: () => void | Promise<void>;
  users: OnlineUser[];
  presenceStatus: string;
};

export function HorseRacingPage({ profile, sessionToken, onSignInClick, onProfileRefresh, users, presenceStatus }: HorseRacingPageProps) {
  const [selectedHorseIds, setSelectedHorseIds] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [betNotice, setBetNotice] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const {
    publicState,
    activeRace,
    status,
    recentRaces,
    recentWinners,
    leaderboard,
    chatMessages,
    totalMyRoundBet,
    myLeaderboardRow,
    countdownSecondsLeft,
    loading,
    error,
    placeBet,
    sendChatMessage,
    reload,
  } = useHorseRace({
    sessionToken,
    userId: profile?.uid ?? null,
  });

  const horses = publicState?.horses ?? [];
  const settings = publicState?.settings;
  const availablePoints = profile ? Math.max(0, profile.points - profile.locked_points) : 0;
  const estimatedTotalBet = useMemo(() => selectedHorseIds.length * betAmount, [selectedHorseIds.length, betAmount]);
  const canBet =
    Boolean(profile && sessionToken && settings?.enabled) &&
    status === 'betting' &&
    betAmount >= (settings?.min_bet ?? 0) &&
    betAmount <= (settings?.max_bet ?? Number.MAX_SAFE_INTEGER) &&
    selectedHorseIds.length > 0 &&
    estimatedTotalBet <= availablePoints;

  const selectedHorses = useMemo(
    () => horses.filter((horse) => selectedHorseIds.includes(horse.horse_id)),
    [horses, selectedHorseIds],
  );
  const betDisabledReason = useMemo(() => {
    if (!profile || !sessionToken) {
      return 'Sign in to place bet.';
    }
    if (!settings?.enabled) {
      return 'Game is disabled by admin.';
    }
    if (status !== 'betting') {
      return `Betting is closed (${status}).`;
    }
    if (selectedHorseIds.length === 0) {
      return 'Select at least 1 horse.';
    }
    if (betAmount < (settings?.min_bet ?? 0)) {
      return `Min bet is ${(settings?.min_bet ?? 0).toLocaleString()}.`;
    }
    if (betAmount > (settings?.max_bet ?? Number.MAX_SAFE_INTEGER)) {
      return `Max bet is ${(settings?.max_bet ?? 0).toLocaleString()}.`;
    }
    if (estimatedTotalBet > availablePoints) {
      return 'Not enough available points for total multi-bet.';
    }
    return null;
  }, [availablePoints, betAmount, estimatedTotalBet, profile, selectedHorseIds.length, sessionToken, settings?.enabled, settings?.max_bet, settings?.min_bet, status]);

  async function handlePlaceBet() {
    if (!canBet || !sessionToken) {
      return;
    }

    setSubmitting(true);
    setBetNotice(null);
    let successCount = 0;
    let failedMessage: string | null = null;

    for (const horseId of selectedHorseIds) {
      const result = await placeBet(horseId, betAmount);
      if (!result.ok) {
        failedMessage = result.message ?? 'Bet failed. Please check race status.';
        break;
      }
      successCount += 1;
    }
    setSubmitting(false);
    await reload();
    if (onProfileRefresh) {
      await Promise.resolve(onProfileRefresh());
    }

    if (failedMessage) {
      if (successCount > 0) {
        setBetNotice(
          `Partial success: ${successCount} horse(s) locked ${(
            successCount * betAmount
          ).toLocaleString()} points. Last error: ${failedMessage}`,
        );
      } else {
        setBetNotice(`Bet failed: ${failedMessage}`);
      }
      return;
    }

    if (successCount > 0) {
      setBetNotice(`Bet placed: ${successCount} horse(s), locked ${(
        successCount * betAmount
      ).toLocaleString()} points.`);
    }
  }

  function toggleHorse(horseId: string) {
    setSelectedHorseIds((current) =>
      current.includes(horseId) ? current.filter((id) => id !== horseId) : [...current, horseId],
    );
  }

  async function handleChatSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > HORSE_CHAT_MAX_LENGTH) {
      return;
    }
    const ok = await sendChatMessage(trimmed);
    if (ok) {
      setChatInput('');
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#071324] via-[#040b17] to-[#02050b] p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.1),transparent_45%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
              <Sparkles size={10} />
              Backend Authoritative
            </div>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Horse Racing <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">Prediction</span>
            </h2>
            <p className="mt-2 max-w-2xl text-xs text-slate-400">
              Realtime multiplayer arena. Backend decides winner at lock phase, frontend only animates race.
            </p>
          </div>
          {!profile ? (
            <button
              type="button"
              onClick={onSignInClick}
              className="flex items-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200"
            >
              <LogIn size={14} />
              Sign In To Bet
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300">{error}</div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <RaceTrack horses={horses} race={activeRace} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Phase</div>
              <div className="mt-1 text-sm font-black uppercase text-cyan-200">{status}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <Timer size={10} />
                Countdown
              </div>
              <div className="mt-1 text-sm font-black text-cyan-200">{countdownSecondsLeft}s</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-center">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">My Round Bet</div>
              <div className="mt-1 text-sm font-black text-fuchsia-200">{totalMyRoundBet.toLocaleString()}</div>
            </div>
          </div>
          <RaceHistory races={recentRaces} winners={recentWinners} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Live Arena</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  <Users size={10} />
                  Online
                </div>
                <div className="mt-1 text-xs font-black text-fuchsia-300">{users.length}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-center">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Available</div>
                <div className="mt-1 text-xs font-black text-emerald-300">{availablePoints.toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  <Wifi size={10} />
                  Connection
                </div>
                <div className="mt-1 text-[10px] font-black uppercase text-cyan-300">{presenceStatus}</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/5 bg-slate-900/50 px-2 py-1 text-[10px]">
                Locked: <span className="font-black text-rose-300">{(profile?.locked_points ?? 0).toLocaleString()}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/50 px-2 py-1 text-[10px]">
                Total: <span className="font-black text-cyan-300">{(profile?.points ?? 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200">
              Biggest Win: {(myLeaderboardRow?.biggest_win ?? 0).toLocaleString()}
            </div>
          </div>

          <BetPanel
            minBet={settings?.min_bet ?? 10}
            maxBet={settings?.max_bet ?? 100000}
            availablePoints={availablePoints}
            value={betAmount}
            disabled={!settings?.enabled}
            onChange={(value) => setBetAmount(Math.max(0, Math.trunc(value)))}
          />

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Select Horses (Multi Bet)</div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {horses.map((horse) => (
                <HorseCard
                  key={horse.horse_id}
                  horse={horse}
                  selected={selectedHorseIds.includes(horse.horse_id)}
                  disabled={!profile}
                  onSelect={toggleHorse}
                />
              ))}
            </div>
            <div className="mt-2 text-[10px] font-bold text-slate-500">
              Selected: {selectedHorses.length} horse(s), Estimated total: {estimatedTotalBet.toLocaleString()}
            </div>
            {betNotice ? (
              <div className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200">
                {betNotice}
              </div>
            ) : null}
            {betDisabledReason ? (
              <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200">
                {betDisabledReason}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void handlePlaceBet()}
              disabled={!canBet || submitting}
              className="mt-3 w-full rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200 transition-colors hover:bg-cyan-500/20 disabled:opacity-45"
            >
              {submitting ? 'Submitting...' : 'Place Bets'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <RaceLeaderboard items={leaderboard} />
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4 lg:col-span-2">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Horse Chat</div>
          <div className="mb-2 flex flex-wrap gap-1">
            {HORSE_EMOJI_QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm hover:bg-white/10"
                onClick={() => void handleChatSend(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/50 p-2">
            {chatMessages.map((message) => (
              <div key={message.message_id} className="rounded-lg border border-white/5 bg-black/25 px-2 py-1 text-xs">
                <span className="font-black text-cyan-200">{message.display_name}</span>
                <span className="ml-2 text-slate-300">{message.text}</span>
              </div>
            ))}
            {chatMessages.length === 0 ? <div className="text-xs text-slate-500">No messages yet.</div> : null}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              maxLength={HORSE_CHAT_MAX_LENGTH}
              className="form-input flex-1 rounded-xl border-white/10 bg-slate-950/60 text-xs text-white"
              placeholder="Type a message..."
            />
            <button
              type="button"
              onClick={() => void handleChatSend(chatInput)}
              disabled={!profile || !sessionToken || !chatInput.trim()}
              className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-cyan-200 disabled:opacity-45"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </section>

      {loading ? <div className="text-center text-xs font-bold text-slate-500">Loading horse racing arena...</div> : null}
    </div>
  );
}
