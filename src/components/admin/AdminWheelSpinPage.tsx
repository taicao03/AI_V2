import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Save,
  Coins,
  Timer,
  Check,
  ShieldAlert,
  Plus,
  Trash2,
} from "lucide-react";
import { wheelSpinService } from "../../services/wheelSpinService";
import type {
  WheelHousePnlInfo,
  WheelSegment,
  WheelSettings,
  WheelSpin,
} from "../../types/wheel";
import { FormattedInput } from "../FormattedInput";
import { formatNumber } from "../../lib/formatHelpers";

type AdminWheelSpinPageProps = {
  sessionToken: string | null;
};

type EditableSegment = {
  id: string;
  label: string;
  multiplier: number;
  probability: number;
  color: string;
  enabled: boolean;
  sort_order: number;
};

function toEditable(segment: WheelSegment): EditableSegment {
  return {
    id: segment.segment_id,
    label: segment.label,
    multiplier: segment.multiplier,
    probability: segment.probability,
    color: segment.color,
    enabled: segment.enabled,
    sort_order: segment.sort_order,
  };
}

function buildDraftSignature(
  inputSettings: WheelSettings | null,
  inputSegments: EditableSegment[],
): string | null {
  if (!inputSettings) {
    return null;
  }

  const normalizedSegments = inputSegments
    .map((segment) => ({
      label: segment.label.trim(),
      multiplier: Number(segment.multiplier),
      probability: Number(segment.probability),
      color: segment.color,
      enabled: Boolean(segment.enabled),
      sort_order: Number(segment.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  return JSON.stringify({
    enabled: Boolean(inputSettings.enabled),
    min_bet: Number(inputSettings.min_bet),
    max_bet: Number(inputSettings.max_bet),
    cooldown_seconds: Number(inputSettings.cooldown_seconds),
    default_jackpot: Number(inputSettings.default_jackpot),
    segments: normalizedSegments,
  });
}

const CustomToggle = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center px-0.5 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked
          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
          : "bg-slate-900 border-white/10"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
          checked ? "translate-x-4 bg-emerald-50" : "translate-x-0 bg-slate-400"
        }`}
      />
    </button>
  );
};

export function AdminWheelSpinPage({ sessionToken }: AdminWheelSpinPageProps) {
  const [settings, setSettings] = useState<WheelSettings | null>(null);
  const [segments, setSegments] = useState<EditableSegment[]>([]);
  const [recentSpins, setRecentSpins] = useState<WheelSpin[]>([]);
  const [housePnlInfo, setHousePnlInfo] = useState<WheelHousePnlInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [syncedSignature, setSyncedSignature] = useState<string | null>(null);
  const [liveUpdatePending, setLiveUpdatePending] = useState(false);
  const dirtyRef = useRef(false);
  const draftSignatureRef = useRef<string | null>(null);

  const draftSignature = useMemo(
    () => buildDraftSignature(settings, segments),
    [settings, segments],
  );

  const isDirty = useMemo(() => {
    if (!syncedSignature || !draftSignature) {
      return false;
    }
    return syncedSignature !== draftSignature;
  }, [draftSignature, syncedSignature]);

  useEffect(() => {
    dirtyRef.current = isDirty;
    draftSignatureRef.current = draftSignature;
  }, [draftSignature, isDirty]);

  const loadState = useCallback(async (options?: { withLoader?: boolean; forceDraftReset?: boolean }) => {
    const withLoader = options?.withLoader ?? false;
    const forceDraftReset = options?.forceDraftReset ?? false;

    if (withLoader) {
      setLoading(true);
    }

    const [stateResult, spinsResult, housePnlResult] = await Promise.all([
      wheelSpinService.getPublicState(),
      wheelSpinService.getRecentSpins(50),
      wheelSpinService.adminGetHousePnl(sessionToken),
    ]);

    if (withLoader) {
      setLoading(false);
    }

    if (stateResult.error || !stateResult.data) {
      setError(stateResult.error?.message ?? "Khong the tai cai dat wheel.");
      return;
    }

    setError(null);
    const incomingSegments = stateResult.data.segments.map((segment) => toEditable(segment));
    const incomingSignature = buildDraftSignature(stateResult.data.settings, incomingSegments);

    if (forceDraftReset || !dirtyRef.current) {
      setSettings(stateResult.data.settings);
      setSegments(incomingSegments);
      setSyncedSignature(incomingSignature);
      setLiveUpdatePending(false);
    } else if (incomingSignature && draftSignatureRef.current && incomingSignature !== draftSignatureRef.current) {
      setLiveUpdatePending(true);
    }

    setRecentSpins(spinsResult.data);
    setHousePnlInfo(housePnlResult.data);
  }, [sessionToken]);

  useEffect(() => {
    void loadState({ withLoader: true, forceDraftReset: true });
  }, [loadState]);

  useEffect(() => {
    const channel = wheelSpinService.createWheelChannel(() => {
      void loadState({ withLoader: false, forceDraftReset: false });
    });

    return () => {
      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, [loadState]);

  const enabledProbability = useMemo(
    () =>
      segments
        .filter((segment) => segment.enabled)
        .reduce((sum, segment) => sum + segment.probability, 0),
    [segments],
  );

  const hasInvalidValues = useMemo(
    () =>
      segments.some(
        (segment) =>
          segment.label.trim() === "" ||
          segment.probability < 0 ||
          segment.multiplier < 0 ||
          !Number.isFinite(segment.multiplier) ||
          !Number.isFinite(segment.probability),
      ),
    [segments],
  );

  const hasInvalidSettings = useMemo(
    () =>
      !settings ||
      settings.min_bet < 1 ||
      settings.max_bet < settings.min_bet ||
      settings.cooldown_seconds < 0 ||
      settings.default_jackpot < 0,
    [settings],
  );

  const canSave =
    Boolean(settings) &&
    !saving &&
    !hasInvalidSettings &&
    !hasInvalidValues &&
    Math.abs(enabledProbability - 100) < 0.0001;

  const jackpotProb = useMemo(
    () =>
      segments
        .filter((segment) => segment.enabled && segment.multiplier >= 10)
        .reduce((sum, segment) => sum + segment.probability, 0),
    [segments],
  );

  async function handleSave() {
    if (!settings) {
      return;
    }

    setSaving(true);
    const result = await wheelSpinService.adminUpdateSettings(sessionToken, {
      enabled: settings.enabled,
      min_bet: settings.min_bet,
      max_bet: settings.max_bet,
      cooldown_seconds: settings.cooldown_seconds,
      default_jackpot: settings.default_jackpot,
      segments: segments
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((segment) => ({
          label: segment.label.trim(),
          multiplier: segment.multiplier,
          probability: segment.probability,
          color: segment.color,
          enabled: segment.enabled,
          sort_order: segment.sort_order,
        })),
      expected_version: settings.version,
    });
    setSaving(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Khong the luu cai dat.");
      return;
    }

    setError(null);
    setInfo("Wheel settings updated.");
    const nextSegments = result.data.segments.map((segment) => toEditable(segment));
    const nextSignature = buildDraftSignature(result.data.settings, nextSegments);
    setSettings(result.data.settings);
    setSegments(nextSegments);
    setSyncedSignature(nextSignature);
    setLiveUpdatePending(false);
  }

  async function handleResetDefaults() {
    if (!settings) {
      return;
    }

    if (!window.confirm("Reset wheel settings to default values?")) {
      return;
    }

    setSaving(true);
    const result = await wheelSpinService.adminResetSettings(
      sessionToken,
      settings.version,
    );
    setSaving(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Khong the reset cai dat mac dinh.");
      return;
    }

    setError(null);
    setInfo("Wheel settings reset to defaults.");
    const nextSegments = result.data.segments.map((segment) => toEditable(segment));
    const nextSignature = buildDraftSignature(result.data.settings, nextSegments);
    setSettings(result.data.settings);
    setSegments(nextSegments);
    setSyncedSignature(nextSignature);
    setLiveUpdatePending(false);
  }

  function updateSegment(
    id: string,
    updater: (current: EditableSegment) => EditableSegment,
  ) {
    setSegments((current) =>
      current.map((segment) =>
        segment.id === id ? updater(segment) : segment,
      ),
    );
  }

  function addSegment() {
    const last = segments.reduce(
      (max, segment) => Math.max(max, segment.sort_order),
      0,
    );
    setSegments((current) => [
      ...current,
      {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label: "New Segment",
        multiplier: 1,
        probability: 0,
        color: "#64748b",
        enabled: true,
        sort_order: last + 1,
      },
    ]);
  }

  function deleteSegment(id: string) {
    setSegments((current) => current.filter((segment) => segment.id !== id));
  }

  return (
    <section className="space-y-6">
      {/* Header Panel */}
      <header className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#060b1e] via-[#080e22] to-[#030612] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
              <Coins size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Admin Console v{settings?.version ?? 1}
                </span>
              </div>
              <h2 className="mt-1 font-display text-2xl font-black text-white sm:text-3xl">
                Realtime{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                  Wheel Settings
                </span>
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              className="choice-button px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-300 border-white/5 hover:border-cyan-500/30 hover:bg-cyan-950/20"
              onClick={() => void loadState({ withLoader: true, forceDraftReset: true })}
              type="button"
            >
              <RefreshCw size={12} className="inline mr-1.5" /> Refresh
            </button>
            <button
              className="choice-button px-4 py-2.5 text-xs font-black uppercase tracking-wider text-amber-300 border-amber-500/20 hover:border-amber-400/50 hover:bg-amber-950/20"
              onClick={() => void handleResetDefaults()}
              type="button"
            >
              <RotateCcw size={12} className="inline mr-1.5" /> Reset Defaults
            </button>
            <button
              className="choice-button px-5 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-300 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canSave || saving}
              onClick={() => void handleSave()}
              type="button"
            >
              <Save size={12} className="inline mr-1.5" />{" "}
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </header>

      {/* Notifications and Alerts */}
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/25 px-4 py-3 text-xs text-rose-300 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-shake">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-xs text-emerald-300 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          {info}
        </div>
      ) : null}
      {liveUpdatePending && isDirty ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-300 font-bold flex items-center gap-2 shadow-[0_0_12px_rgba(245,158,11,0.1)]">
          <ShieldAlert size={14} className="text-amber-400" />
          Co cap nhat moi tu realtime, nhung ban dang chinh sua nen form duoc giu nguyen. Bam Refresh de dong bo.
        </div>
      ) : null}

      {loading || !settings ? (
        <div className="rounded-3xl border border-white/5 bg-[#050b18]/40 p-12 text-center shadow-lg">
          <RefreshCw
            size={36}
            className="mx-auto animate-spin text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
          />
          <div className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Syncing with secure engine...
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Global Settings Panel */}
          <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b0f19]/70 to-[#04070e]/90 p-5 shadow-[0_15px_30px_rgba(0,0,0,0.35)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.02),transparent_60%)] pointer-events-none" />

            <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                Engine Parameters
              </h3>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">House Net P/L</div>
                <div
                  className={`mt-1 text-lg font-black font-mono ${Number(housePnlInfo?.house_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {Number(housePnlInfo?.house_pnl ?? 0) >= 0 ? "+" : ""}
                  {formatNumber(Number(housePnlInfo?.house_pnl ?? 0))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Bets</div>
                <div className="mt-1 text-lg font-black font-mono text-cyan-300">
                  {formatNumber(Number(housePnlInfo?.total_bet ?? 0))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Payout</div>
                <div className="mt-1 text-lg font-black font-mono text-fuchsia-300">
                  {formatNumber(Number(housePnlInfo?.total_payout ?? 0))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {/* Game Enabled switch toggle */}
              <div className="relative rounded-2xl border border-white/5 bg-black/45 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] hover:border-white/10 transition-colors flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${settings.enabled ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`}
                  />
                  Game Enabled
                </label>
                <div className="flex items-center justify-between mt-1 h-9">
                  <span
                    className={`text-xs font-black uppercase tracking-widest ${settings.enabled ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]" : "text-slate-500"}`}
                  >
                    {settings.enabled ? "ONLINE" : "OFFLINE"}
                  </span>
                  <CustomToggle
                    checked={settings.enabled}
                    onChange={(val) =>
                      setSettings((current) =>
                        current ? { ...current, enabled: val } : current,
                      )
                    }
                  />
                </div>
              </div>

              {/* Min Bet input */}
              <div className="relative rounded-2xl border border-white/5 bg-black/45 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] hover:border-white/10 transition-colors flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Coins size={11} className="text-cyan-400" />
                  Min Bet
                </label>
                <div className="relative mt-1">
                  <FormattedInput
                    className="form-input w-full bg-slate-950/60 border-white/10 focus:border-cyan-500 focus:shadow-[0_0_12px_rgba(34,211,238,0.15)] rounded-xl py-1.5 pr-3 pl-8 text-xs font-bold text-white transition-all font-mono h-9"
                    onChange={(val) =>
                      setSettings((current) =>
                        current
                          ? { ...current, min_bet: val }
                          : current,
                      )
                    }
                    value={settings.min_bet}
                  />
                </div>
              </div>

              {/* Max Bet input */}
              <div className="relative rounded-2xl border border-white/5 bg-black/45 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] hover:border-white/10 transition-colors flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Coins size={11} className="text-cyan-400" />
                  Max Bet
                </label>
                <div className="relative mt-1">
                  <FormattedInput
                    className="form-input w-full bg-slate-950/60 border-white/10 focus:border-cyan-500 focus:shadow-[0_0_12px_rgba(34,211,238,0.15)] rounded-xl py-1.5 pr-3 pl-8 text-xs font-bold text-white transition-all font-mono h-9"
                    onChange={(val) =>
                      setSettings((current) =>
                        current
                          ? { ...current, max_bet: val }
                          : current,
                      )
                    }
                    value={settings.max_bet}
                  />
                </div>
              </div>

              {/* Cooldown input */}
              <div className="relative rounded-2xl border border-white/5 bg-black/45 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] hover:border-white/10 transition-colors flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Timer size={11} className="text-fuchsia-400" />
                  Cooldown (sec)
                </label>
                <div className="relative mt-1">
                  <input
                    className="form-input w-full bg-slate-950/60 border-white/10 focus:border-fuchsia-500 focus:shadow-[0_0_12px_rgba(168,85,247,0.15)] rounded-xl py-1.5 pr-3 pl-8 text-xs font-bold text-white transition-all font-mono h-9"
                    onChange={(event) =>
                      setSettings((current) =>
                        current
                          ? {
                              ...current,
                              cooldown_seconds: Number(event.target.value),
                            }
                          : current,
                      )
                    }
                    type="number"
                    value={settings.cooldown_seconds}
                  />
                </div>
              </div>

              {/* Default Jackpot input */}
              <div className="relative rounded-2xl border border-white/5 bg-black/45 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] hover:border-white/10 transition-colors flex flex-col gap-2 sm:col-span-2 md:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Coins size={11} className="text-amber-400 animate-pulse" />
                  Base Jackpot
                </label>
                <div className="relative mt-1">
                  <FormattedInput
                    className="form-input w-full bg-slate-950/60 border-white/10 focus:border-amber-500 focus:shadow-[0_0_12px_rgba(245,158,11,0.15)] rounded-xl py-1.5 pr-3 pl-8 text-xs font-bold text-white transition-all font-mono h-9"
                    min={0}
                    onChange={(val) =>
                      setSettings((current) =>
                        current
                          ? {
                              ...current,
                              default_jackpot: val,
                            }
                          : current,
                      )
                    }
                    value={settings.default_jackpot}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Probability Balance Console */}
          {Math.abs(enabledProbability - 100) < 0.0001 ? (
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/20 p-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center justify-between gap-4 pulse-slow">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Check size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                    System Balance Status
                  </div>
                  <div className="mt-0.5 text-[11px] sm:text-xs font-black text-emerald-200">
                    SYSTEM BALANCED (100.00%) — READY TO SAVE
                  </div>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-emerald-300">
                  Ready
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-rose-500/35 bg-rose-950/25 p-4 shadow-[0_0_25px_rgba(239,68,68,0.2)] flex flex-col md:flex-row md:items-center justify-between gap-4 border-dashed pulse-fast">
              <div className="flex items-start sm:items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 bounce-slow">
                  <AlertTriangle size={18} className="animate-pulse" />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 animate-pulse">
                    Configuration Error
                  </div>
                  <div className="mt-0.5 text-xs font-black text-rose-200 leading-snug">
                    PROBABILITY MISMATCH ({enabledProbability.toFixed(2)}% /
                    100.00%)
                  </div>
                  <div className="text-[10px] font-medium text-rose-300/80">
                    Current discrepancy:{" "}
                    <span className="font-mono font-bold text-rose-400">
                      {(100 - enabledProbability).toFixed(2)}%
                    </span>
                    . Must equal exactly 100.00% to save.
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-rose-950/70 border border-rose-500/40 px-2.5 py-1 rounded-full text-rose-300 shadow-[0_0_8px_rgba(239,68,68,0.15)]">
                  Save Locked
                </span>
              </div>
            </div>
          )}

          {/* Segment Configuration Editor */}
          <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b0f19]/70 to-[#04070e]/90 p-5 shadow-[0_15px_30px_rgba(0,0,0,0.35)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.02),transparent_60%)] pointer-events-none" />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Coins size={14} className="text-cyan-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                  Segment Configuration Engine
                </h3>
              </div>
              <button
                className="choice-button px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-300 border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 flex items-center gap-1 shadow-[0_0_12px_rgba(34,211,238,0.12)] hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all"
                onClick={addSegment}
                type="button"
              >
                <Plus size={11} /> Add New Segment
              </button>
            </div>

            {jackpotProb > 3 ? (
              <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-950/20 px-3.5 py-2 text-[10px] font-bold text-amber-300 flex items-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                <AlertTriangle
                  size={12}
                  className="text-amber-400 animate-pulse"
                />
                High Risk Configuration: Cumulative Jackpot probability is high
                ({jackpotProb.toFixed(2)}%).
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
              <table className="w-full min-w-[780px] text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-white/5 bg-slate-950/45">
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Wedge Label
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Multiplier
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Probability %
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Visual Color
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                      Status
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Sort Order
                    </th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {segments
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((segment) => (
                      <tr
                        key={segment.id}
                        className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Label field */}
                        <td className="p-2.5">
                          <input
                            className="form-input w-full bg-slate-950/45 border-white/5 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(34,211,238,0.1)] text-white text-xs font-bold rounded-lg py-1.5 px-2.5 transition-all"
                            onChange={(event) =>
                              updateSegment(segment.id, (current) => ({
                                ...current,
                                label: event.target.value,
                              }))
                            }
                            value={segment.label}
                          />
                        </td>

                        {/* Multiplier field */}
                        <td className="p-2.5">
                          <div className="relative flex items-center">
                            <input
                              className="form-input w-24 bg-slate-950/45 border-white/5 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(34,211,238,0.1)] text-white text-xs font-bold font-mono rounded-lg py-1.5 pr-2.5 pl-6 transition-all h-8"
                              onChange={(event) =>
                                updateSegment(segment.id, (current) => ({
                                  ...current,
                                  multiplier: Number(event.target.value),
                                }))
                              }
                              type="number"
                              value={segment.multiplier}
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 select-none">
                              x
                            </span>
                          </div>
                        </td>

                        {/* Probability field */}
                        <td className="p-2.5">
                          <div className="relative flex items-center">
                            <input
                              className="form-input w-24 bg-slate-950/45 border-white/5 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(34,211,238,0.1)] text-white text-xs font-bold font-mono rounded-lg py-1.5 pl-2.5 pr-6 transition-all h-8"
                              onChange={(event) =>
                                updateSegment(segment.id, (current) => ({
                                  ...current,
                                  probability: Number(event.target.value),
                                }))
                              }
                              type="number"
                              value={segment.probability}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 font-mono select-none">
                              %
                            </span>
                          </div>
                        </td>

                        {/* Color indicator chip */}
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="relative flex items-center justify-center h-8 w-8 rounded-lg overflow-hidden border border-white/15 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] transition-transform hover:scale-105"
                              style={{
                                boxShadow: `0 0 10px ${segment.color}33`,
                              }}
                            >
                              <input
                                className="absolute inset-0 cursor-pointer h-12 w-12 border-none p-0 bg-transparent opacity-0"
                                onChange={(event) =>
                                  updateSegment(segment.id, (current) => ({
                                    ...current,
                                    color: event.target.value,
                                  }))
                                }
                                type="color"
                                value={segment.color}
                              />
                              <div
                                className="h-full w-full pointer-events-none"
                                style={{ backgroundColor: segment.color }}
                              />
                            </div>
                            <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wide">
                              {segment.color}
                            </span>
                          </div>
                        </td>

                        {/* Active / Enabled status */}
                        <td className="p-2.5">
                          <div className="flex justify-center items-center">
                            <CustomToggle
                              checked={segment.enabled}
                              onChange={(checked) =>
                                updateSegment(segment.id, (current) => ({
                                  ...current,
                                  enabled: checked,
                                }))
                              }
                            />
                          </div>
                        </td>

                        {/* Sort Order field */}
                        <td className="p-2.5">
                          <input
                            className="form-input w-16 bg-slate-950/45 border-white/5 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(34,211,238,0.1)] text-white text-xs font-bold font-mono rounded-lg py-1.5 px-2 text-center transition-all"
                            onChange={(event) =>
                              updateSegment(segment.id, (current) => ({
                                ...current,
                                sort_order: Number(event.target.value),
                              }))
                            }
                            type="number"
                            value={segment.sort_order}
                          />
                        </td>

                        {/* Delete Segment Action button */}
                        <td className="p-2.5">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => deleteSegment(segment.id)}
                              className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-all hover:scale-105 active:scale-95 shadow-[0_0_8px_rgba(239,68,68,0.06)] hover:shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                              title="Delete Segment"
                            >
                              <Trash2 size={12.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Cyberpunk Spin Logs Section */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0b0f19]/70 to-[#04070e]/90 p-5 shadow-[0_15px_30px_rgba(0,0,0,0.35)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.02),transparent_60%)] pointer-events-none" />

        <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
          <Coins size={14} className="text-fuchsia-400" />
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
            Spin Logs (Latest 50 Runs)
          </h3>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">
          <table className="w-full min-w-[860px] text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-white/5 bg-slate-950/45">
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Timestamp
                </th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Player
                </th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Wedge Outcome
                </th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Bet Placed
                </th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Multiplier
                </th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Payout Result
                </th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  House P/L
                </th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                  Outcome
                </th>
                <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Snapshot
                </th>
              </tr>
            </thead>
            <tbody>
              {recentSpins.map((spin) => {
                const housePnl = spin.bet_amount - spin.result_amount;
                const houseOutcome =
                  housePnl > 0 ? "WIN" : housePnl < 0 ? "LOSS" : "EVEN";

                return (
                  <tr
                    key={spin.spin_id}
                    className="border-t border-white/5 hover:bg-white/[0.015] transition-colors"
                  >
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {new Date(spin.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-white font-bold">
                      {spin.display_name}
                    </td>
                    <td className="p-3 font-bold text-white">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
                        {spin.label}
                      </span>
                    </td>
                    <td className="p-3 text-cyan-300 font-mono font-bold">
                      {spin.bet_amount.toLocaleString()}
                    </td>
                    <td className="p-3 text-fuchsia-300 font-mono font-bold">
                      x{spin.multiplier}
                    </td>
                    <td className="p-3 text-emerald-300 font-mono font-bold">
                      {spin.result_amount.toLocaleString()}
                    </td>
                    <td
                      className={`p-3 font-mono font-black ${housePnl > 0 ? "text-emerald-400" : housePnl < 0 ? "text-rose-400" : "text-slate-300"}`}
                    >
                      {housePnl > 0 ? "+" : ""}
                      {housePnl.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest border px-2 py-0.5 rounded-full ${
                            houseOutcome === "WIN"
                              ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                              : houseOutcome === "LOSS"
                                ? "bg-rose-500/10 border-rose-500/35 text-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                                : "bg-slate-900 border-white/10 text-slate-400"
                          }`}
                        >
                          {houseOutcome === "WIN"
                            ? "HOUSE WIN"
                            : houseOutcome === "LOSS"
                              ? "HOUSE LOSS"
                              : "EVEN"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[10px]">
                      v{spin.settings_version}
                    </td>
                  </tr>
                );
              })}
              {recentSpins.length === 0 ? (
                <tr>
                  <td
                    className="p-4 text-center text-slate-500 font-bold"
                    colSpan={9}
                  >
                    No spins have been run on this wheel version yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Embedded local animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.95; box-shadow: 0 0 15px rgba(16,185,129,0.1); }
          50% { opacity: 1; box-shadow: 0 0 25px rgba(16,185,129,0.25); }
        }
        @keyframes pulse-fast {
          0%, 100% { opacity: 0.9; box-shadow: 0 0 15px rgba(239,68,68,0.15); }
          50% { opacity: 1; box-shadow: 0 0 25px rgba(239,68,68,0.3); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
        .pulse-fast {
          animation: pulse-fast 1.5s infinite ease-in-out;
        }
        .bounce-slow {
          animation: bounce-slow 2s infinite ease-in-out;
        }
      `,
        }}
      />
    </section>
  );
}
