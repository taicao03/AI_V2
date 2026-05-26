import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle2, Clock3, RefreshCw, Search, XCircle } from 'lucide-react';
import { formatNumber } from '../../lib/dice';
import { adminMillionaireService } from '../../services/adminMillionaireService';
import type {
  MillionaireAdminOverview,
  MillionaireQuestionAdminItem,
  MillionaireSessionAdminItem,
} from '../../types/millionaire';

type AdminMillionairePageProps = {
  sessionToken: string | null;
};

const TOPICS = ['mixed', 'science', 'history', 'geography', 'technology', 'sports'];

export function AdminMillionairePage({ sessionToken }: AdminMillionairePageProps) {
  const [overview, setOverview] = useState<MillionaireAdminOverview | null>(null);
  const [questions, setQuestions] = useState<MillionaireQuestionAdminItem[]>([]);
  const [sessions, setSessions] = useState<MillionaireSessionAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [questionForm, setQuestionForm] = useState({
    topic: 'mixed',
    difficulty: 1,
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctChoice: 0,
    confidenceScore: 0.9,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [overviewResult, questionsResult, sessionsResult] = await Promise.all([
      adminMillionaireService.getOverview(sessionToken),
      adminMillionaireService.listQuestions(sessionToken, { search, topic: topicFilter, limit: 120 }),
      adminMillionaireService.listSessions(sessionToken, 60),
    ]);

    setOverview(overviewResult.data);
    setQuestions(questionsResult.data);
    setSessions(sessionsResult.data);
    setError(overviewResult.error?.message ?? questionsResult.error?.message ?? sessionsResult.error?.message ?? null);
    setLoading(false);
  }, [search, sessionToken, topicFilter]);

  useEffect(() => {
    void loadAll();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      void loadAll();
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [loadAll]);

  async function handleCreateQuestion() {
    setSaving(true);
    const options = [questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD].map((item) =>
      item.trim(),
    );

    const result = await adminMillionaireService.upsertAiQuestion(sessionToken, {
      topic: questionForm.topic,
      difficulty: Math.max(1, Math.min(15, Math.trunc(questionForm.difficulty))),
      question_text: questionForm.questionText.trim(),
      options,
      correct_choice: Math.max(0, Math.min(3, Math.trunc(questionForm.correctChoice))),
      confidence_score: Math.max(0, Math.min(1, questionForm.confidenceScore)),
      verification_status: 'verified',
      source_provider: 'admin-manual',
    });
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setQuestionForm((current) => ({
      ...current,
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctChoice: 0,
    }));
    setError(null);
    await loadAll();
  }

  async function handleUpdateVerification(questionId: string, status: 'pending' | 'verified' | 'rejected') {
    const result = await adminMillionaireService.setQuestionVerification(sessionToken, questionId, status);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    await loadAll();
  }

  const topQuestions = useMemo(() => questions.slice(0, 40), [questions]);

  return (
    <section className="panel space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-fuchsia-300">Admin AI GameOps</div>
          <h2 className="mt-1 flex items-center gap-2 font-display text-xl font-black uppercase tracking-tight text-white">
            <Brain size={18} className="text-fuchsia-300" />
            Millionaire Control
          </h2>
        </div>
        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 hover:bg-white/10"
          onClick={() => void loadAll()}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-200">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Questions" value={overview?.total_questions ?? 0} tone="cyan" />
        <MetricCard label="Verified/Pending" value={`${overview?.verified_questions ?? 0}/${overview?.pending_questions ?? 0}`} tone="emerald" />
        <MetricCard label="24h Payout" value={formatNumber(overview?.payout_24h ?? 0)} tone="fuchsia" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Create AI Question</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={questionForm.topic}
              onChange={(event) => setQuestionForm((current) => ({ ...current, topic: event.target.value }))}
              className="form-input rounded-lg border-white/10 bg-slate-900/60 text-xs"
            >
              {TOPICS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={15}
              value={questionForm.difficulty}
              onChange={(event) => setQuestionForm((current) => ({ ...current, difficulty: Number(event.target.value || 1) }))}
              className="form-input rounded-lg border-white/10 bg-slate-900/60 text-xs"
              placeholder="Difficulty 1-15"
            />
          </div>
          <textarea
            value={questionForm.questionText}
            onChange={(event) => setQuestionForm((current) => ({ ...current, questionText: event.target.value }))}
            className="form-input min-h-20 rounded-lg border-white/10 bg-slate-900/60 text-xs"
            placeholder="Question text..."
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={questionForm.optionA}
              onChange={(event) => setQuestionForm((current) => ({ ...current, optionA: event.target.value }))}
              className="form-input rounded-lg border-white/10 bg-slate-900/60 text-xs"
              placeholder="Option A"
            />
            <input
              value={questionForm.optionB}
              onChange={(event) => setQuestionForm((current) => ({ ...current, optionB: event.target.value }))}
              className="form-input rounded-lg border-white/10 bg-slate-900/60 text-xs"
              placeholder="Option B"
            />
            <input
              value={questionForm.optionC}
              onChange={(event) => setQuestionForm((current) => ({ ...current, optionC: event.target.value }))}
              className="form-input rounded-lg border-white/10 bg-slate-900/60 text-xs"
              placeholder="Option C"
            />
            <input
              value={questionForm.optionD}
              onChange={(event) => setQuestionForm((current) => ({ ...current, optionD: event.target.value }))}
              className="form-input rounded-lg border-white/10 bg-slate-900/60 text-xs"
              placeholder="Option D"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="number"
              min={0}
              max={3}
              value={questionForm.correctChoice}
              onChange={(event) => setQuestionForm((current) => ({ ...current, correctChoice: Number(event.target.value || 0) }))}
              className="form-input rounded-lg border-white/10 bg-slate-900/60 text-xs"
              placeholder="Correct choice: 0..3"
            />
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={questionForm.confidenceScore}
              onChange={(event) =>
                setQuestionForm((current) => ({ ...current, confidenceScore: Number(event.target.value || 0.9) }))
              }
              className="form-input rounded-lg border-white/10 bg-slate-900/60 text-xs"
              placeholder="Confidence 0..1"
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleCreateQuestion()}
            className="w-full rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200 hover:bg-fuchsia-500/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Verified Question'}
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Question Bank</div>
            <div className="text-[10px] font-bold text-slate-500">{questions.length} rows</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="form-input w-full rounded-lg border-white/10 bg-slate-900/60 pl-8 text-xs"
                placeholder="Search question..."
              />
            </div>
            <select
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              className="form-input rounded-lg border-white/10 bg-slate-900/60 text-xs"
            >
              <option value="">all topics</option>
              {TOPICS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {topQuestions.map((item) => (
              <div key={item.question_id} className="rounded-xl border border-white/10 bg-black/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                    {item.topic} - D{item.difficulty} - {item.confidence_score.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1">
                    {item.verification_status === 'verified' ? (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    ) : item.verification_status === 'rejected' ? (
                      <XCircle size={14} className="text-rose-400" />
                    ) : (
                      <Clock3 size={14} className="text-amber-400" />
                    )}
                    <span className="text-[10px] font-black uppercase text-slate-300">{item.verification_status}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs font-bold text-white">{item.question_text}</div>
                <div className="mt-2 grid gap-1">
                  {item.options.map((option, index) => (
                    <div key={`${item.question_id}-${index}`} className="text-[11px] text-slate-300">
                      {String.fromCharCode(65 + index)}. {option} {item.correct_choice === index ? '(correct)' : ''}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-200"
                    onClick={() => void handleUpdateVerification(item.question_id, 'pending')}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-200"
                    onClick={() => void handleUpdateVerification(item.question_id, 'verified')}
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] font-black uppercase text-rose-200"
                    onClick={() => void handleUpdateVerification(item.question_id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {topQuestions.length === 0 ? <div className="text-xs text-slate-500">No questions found.</div> : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Recent Sessions</div>
        <div className="max-h-[320px] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-500">
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2">Topic</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Progress</th>
                <th className="px-2 py-2">Earned</th>
                <th className="px-2 py-2">Started</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((item) => (
                <tr key={item.session_id} className="border-b border-white/5 text-slate-300">
                  <td className="px-2 py-2 font-bold text-white">{item.display_name}</td>
                  <td className="px-2 py-2 uppercase">{item.topic}</td>
                  <td className="px-2 py-2 uppercase">{item.status}</td>
                  <td className="px-2 py-2">{item.current_question_index}/15</td>
                  <td className="px-2 py-2">{formatNumber(item.earned_points)}</td>
                  <td className="px-2 py-2">{new Date(item.started_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessions.length === 0 ? <div className="pt-2 text-xs text-slate-500">No sessions yet.</div> : null}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string | number; tone: 'cyan' | 'emerald' | 'fuchsia' }) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10'
      : tone === 'fuchsia'
        ? 'text-fuchsia-300 border-fuchsia-500/20 bg-fuchsia-500/10'
        : 'text-cyan-300 border-cyan-500/20 bg-cyan-500/10';

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.18em] opacity-80">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}
