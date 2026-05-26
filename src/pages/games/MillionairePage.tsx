import { useMemo, useState } from 'react';
import { Brain, LogIn, SkipForward, Sparkles, Users } from 'lucide-react';
import { formatNumber } from '../../lib/dice';
import { useMillionaireGame } from '../../hooks/useMillionaireGame';
import type { OnlineUser, UserProfile } from '../../types';

type MillionairePageProps = {
  profile: UserProfile | null;
  sessionToken: string | null;
  onSignInClick: () => void;
  users: OnlineUser[];
  presenceStatus: string;
};

const TOPIC_OPTIONS = ['mixed', 'science', 'history', 'geography', 'technology', 'sports'];

export function MillionairePage({ profile, sessionToken, onSignInClick, users, presenceStatus }: MillionairePageProps) {
  const [topic, setTopic] = useState('mixed');
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const {
    session,
    recentWinners,
    lastAnswer,
    loading,
    actionLoading,
    error,
    startSession,
    answerQuestion,
    useLifeline5050,
    useLifelineSkip,
  } = useMillionaireGame({ sessionToken });

  const availablePoints = profile ? Math.max(0, profile.points - profile.locked_points) : 0;
  const question = session?.question ?? null;
  const canAnswer = Boolean(session?.status === 'active' && question && selectedChoice !== null);
  const questionIndexLabel = `${session?.current_question_index ?? 0}/${session?.max_question_count ?? 15}`;

  const sortedWinners = useMemo(
    () => [...recentWinners].sort((left, right) => right.earned_points - left.earned_points).slice(0, 10),
    [recentWinners],
  );

  async function handleStartSession() {
    const ok = await startSession(topic);
    if (ok) {
      setSelectedChoice(null);
    }
  }

  async function handleAnswer() {
    if (selectedChoice === null) {
      return;
    }
    const ok = await answerQuestion(selectedChoice);
    if (ok) {
      setSelectedChoice(null);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-[#12072a] via-[#09051a] to-[#04030a] p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,70,239,0.14),transparent_45%),radial-gradient(circle_at_75%_75%,rgba(34,211,238,0.1),transparent_45%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-fuchsia-300">
              <Brain size={10} />
              AI-powered Question Bank
            </div>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              AI <span className="bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">Millionaire</span>
            </h2>
            <p className="mt-2 max-w-2xl text-xs text-slate-400">
              15 levels of questions, validated question bank, and guaranteed milestone rewards.
            </p>
          </div>
          {!profile ? (
            <button
              type="button"
              onClick={onSignInClick}
              className="flex items-center gap-2 rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200"
            >
              <LogIn size={14} />
              Sign In To Play
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300">{error}</div>
      ) : null}

      {lastAnswer ? (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-bold ${
            lastAnswer.is_correct
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
          }`}
        >
          {lastAnswer.is_correct
            ? `Correct! Earned ${formatNumber(lastAnswer.earned_points)} points.`
            : `Wrong answer. Guaranteed payout: ${formatNumber(lastAnswer.guaranteed_points)} points.`}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Question Progress</div>
            <div className="text-xs font-black text-white">{questionIndexLabel}</div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-center">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Earned</div>
              <div className="mt-1 text-xs font-black text-cyan-300">{formatNumber(session?.earned_points ?? 0)}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-center">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Guaranteed</div>
              <div className="mt-1 text-xs font-black text-emerald-300">{formatNumber(session?.guaranteed_points ?? 0)}</div>
            </div>
            <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-center">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Available</div>
              <div className="mt-1 text-xs font-black text-fuchsia-300">{formatNumber(availablePoints)}</div>
            </div>
          </div>

          {!session || session.status !== 'active' ? (
            <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/40 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Start New Session</div>
              <div className="flex flex-wrap gap-2">
                {TOPIC_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTopic(item)}
                    className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                      topic === item
                        ? 'border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-200'
                        : 'border-white/10 bg-white/5 text-slate-300'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void handleStartSession()}
                disabled={!profile || !sessionToken || actionLoading}
                className="w-full rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20 disabled:opacity-40"
              >
                {actionLoading ? 'Starting...' : 'Start Game'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-white/5 bg-slate-950/40 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                Level {session.current_question_index}: {question?.topic ?? 'mixed'}
              </div>
              <h3 className="text-sm font-black text-white">{question?.question_text}</h3>
              <div className="grid gap-2">
                {(question?.options ?? []).map((option, index) => {
                  const isVisible = (question?.available_choices ?? [0, 1, 2, 3]).includes(index);
                  if (!isVisible) {
                    return (
                      <div
                        key={`hidden-${index}`}
                        className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs font-bold text-slate-500 opacity-60"
                      >
                        Option hidden by 50:50
                      </div>
                    );
                  }

                  const isSelected = selectedChoice === index;
                  return (
                    <button
                      key={`${index}-${option}`}
                      type="button"
                      onClick={() => setSelectedChoice(index)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs font-bold transition-colors ${
                        isSelected
                          ? 'border-cyan-500/35 bg-cyan-500/15 text-cyan-100'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void useLifeline5050()}
                  disabled={session.lifeline_5050_used || actionLoading}
                  className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-200 disabled:opacity-45"
                >
                  50:50
                </button>
                <button
                  type="button"
                  onClick={() => void useLifelineSkip()}
                  disabled={session.lifeline_skip_used || actionLoading}
                  className="inline-flex items-center gap-1 rounded-lg border border-violet-500/35 bg-violet-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-violet-200 disabled:opacity-45"
                >
                  <SkipForward size={12} />
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => void handleAnswer()}
                  disabled={!canAnswer || actionLoading}
                  className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-200 disabled:opacity-45"
                >
                  Lock Answer
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Live Arena</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  <Users size={10} />
                  Online
                </div>
                <div className="mt-1 text-xs font-black text-fuchsia-300">{users.length}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-center">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">Presence</div>
                <div className="mt-1 text-[10px] font-black uppercase text-cyan-300">{presenceStatus}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Recent Winners</div>
            <div className="space-y-2">
              {sortedWinners.map((winner) => (
                <div key={winner.session_id} className="rounded-lg border border-white/5 bg-slate-900/45 px-2 py-1.5 text-xs">
                  <div className="font-black text-cyan-200">{winner.display_name}</div>
                  <div className="text-[11px] text-slate-300">
                    {winner.topic} - {formatNumber(winner.earned_points)}
                  </div>
                </div>
              ))}
              {sortedWinners.length === 0 ? <div className="text-xs text-slate-500">No winners yet.</div> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-slate-300">
            <div className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <Sparkles size={11} />
              AI Question Flow
            </div>
            <p>Question bank is designed for AI-generated + verified content before publishing to live sessions.</p>
          </div>
        </div>
      </section>

      {loading ? <div className="text-center text-xs font-bold text-slate-500">Loading millionaire game...</div> : null}
    </div>
  );
}
