import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Flag, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { horseRaceService } from '../../services/horseRaceService';
import type { Horse, HorseRaceSettings } from '../../types/horse-racing';
import { FormattedInput } from '../FormattedInput';

type AdminHorseRacingPageProps = {
  sessionToken: string | null;
};

const PG_INT_MAX = 2147483647;
const DEFAULT_HORSE_AVATAR = '/assets/horses/neon-horse.svg';

const EMPTY_HORSE: Omit<Horse, 'horse_id' | 'created_at' | 'updated_at'> = {
  name: 'New Horse',
  avatar: DEFAULT_HORSE_AVATAR,
  speed_rating: 60,
  rarity: 'common',
  odds_multiplier: 2,
  win_probability: 0,
  enabled: true,
  sort_order: 0,
};

function normalizeHorseAvatarInput(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) {
    return null;
  }

  const normalizedSlashes = raw.replace(/\\/g, '/');
  const lower = normalizedSlashes.toLowerCase();
  const publicIdx = lower.indexOf('/public/');

  if (publicIdx >= 0) {
    return normalizedSlashes.slice(publicIdx + '/public'.length);
  }

  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:') || lower.startsWith('blob:')) {
    return normalizedSlashes;
  }

  if (lower.startsWith('public/')) {
    return `/${normalizedSlashes.slice('public/'.length)}`;
  }

  if (lower.startsWith('./public/')) {
    return `/${normalizedSlashes.slice('./public/'.length)}`;
  }

  if (lower.startsWith('assets/')) {
    return `/${normalizedSlashes}`;
  }

  return normalizedSlashes.startsWith('/') ? normalizedSlashes : `/${normalizedSlashes}`;
}

export function AdminHorseRacingPage({ sessionToken }: AdminHorseRacingPageProps) {
  const [settings, setSettings] = useState<HorseRaceSettings | null>(null);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<{ active_users: number; total_amount_24h: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [syncedSignature, setSyncedSignature] = useState<string | null>(null);
  const [liveUpdatePending, setLiveUpdatePending] = useState(false);
  const dirtyRef = useRef(false);
  const draftSignatureRef = useRef<string | null>(null);
  const savingRef = useRef(false);

  const buildDraftSignature = useCallback(
    (inputSettings: HorseRaceSettings | null, inputHorses: Horse[]): string | null => {
      if (!inputSettings) {
        return null;
      }

      const normalizedHorses = inputHorses
        .map((horse) => ({
          horse_id: horse.horse_id,
          name: horse.name.trim(),
          avatar: (horse.avatar ?? '').trim(),
          speed_rating: Number(horse.speed_rating),
          rarity: horse.rarity,
          odds_multiplier: Number(horse.odds_multiplier),
          win_probability: Number(horse.win_probability),
          enabled: Boolean(horse.enabled),
          sort_order: Number(horse.sort_order),
        }))
        .sort((a, b) => a.sort_order - b.sort_order);

      return JSON.stringify({
        settings: {
          enabled: Boolean(inputSettings.enabled),
          min_bet: Number(inputSettings.min_bet),
          max_bet: Number(inputSettings.max_bet),
          betting_duration: Number(inputSettings.betting_duration),
          race_duration: Number(inputSettings.race_duration),
          version: Number(inputSettings.version),
        },
        horses: normalizedHorses,
      });
    },
    [],
  );

  const draftSignature = useMemo(() => buildDraftSignature(settings, horses), [buildDraftSignature, horses, settings]);
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

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  const loadState = useCallback(async (options?: { withLoader?: boolean; forceDraftReset?: boolean }) => {
    const withLoader = options?.withLoader ?? false;
    const forceDraftReset = options?.forceDraftReset ?? false;
    if (withLoader) {
      setLoading(true);
    }
    const [stateResult, liveResult] = await Promise.all([
      horseRaceService.adminGetState(sessionToken),
      horseRaceService.adminGetLiveStats(sessionToken),
    ]);
    if (withLoader) {
      setLoading(false);
    }

    if (stateResult.error || !stateResult.data) {
      setError(stateResult.error?.message ?? 'Khong the tai horse state.');
      return;
    }

    setError(null);
    setActiveRaceId(stateResult.data.active_race?.race_id ?? null);
    setLiveStats(
      liveResult.data
        ? {
            active_users: Number(liveResult.data.active_users ?? 0),
            total_amount_24h: Number(liveResult.data.betting_statistics?.total_amount_24h ?? 0),
          }
        : null,
    );

    const incomingSettings = stateResult.data.settings;
    const incomingHorses = stateResult.data.horses;
    const incomingSignature = buildDraftSignature(incomingSettings, incomingHorses);

    if (forceDraftReset || !dirtyRef.current) {
      setSettings(incomingSettings);
      setHorses(incomingHorses);
      setSyncedSignature(incomingSignature);
      setLiveUpdatePending(false);
    } else if (incomingSignature && draftSignatureRef.current && incomingSignature !== draftSignatureRef.current) {
      setLiveUpdatePending(true);
    }
  }, [buildDraftSignature, sessionToken]);

  useEffect(() => {
    void loadState({ withLoader: true, forceDraftReset: true });
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || savingRef.current) {
        return;
      }
      void loadState({ withLoader: false, forceDraftReset: false });
    }, 6000);
    return () => window.clearInterval(intervalId);
  }, [loadState]);

  useEffect(() => {
    if (!info) {
      return;
    }
    const timer = window.setTimeout(() => setInfo(null), 2600);
    return () => window.clearTimeout(timer);
  }, [info]);

  const enabledProbability = useMemo(
    () => horses.filter((horse) => horse.enabled).reduce((sum, horse) => sum + Number(horse.win_probability), 0),
    [horses],
  );

  async function handleSaveSettings() {
    if (!settings) {
      return;
    }
    if (settings.min_bet > PG_INT_MAX || settings.max_bet > PG_INT_MAX) {
      setError(`Min/Max bet must be <= ${PG_INT_MAX.toLocaleString()} (Postgres integer limit).`);
      return;
    }
    setSaving(true);
    const result = await horseRaceService.adminUpdateSettings(sessionToken, {
      enabled: settings.enabled,
      min_bet: settings.min_bet,
      max_bet: settings.max_bet,
      betting_duration: settings.betting_duration,
      race_duration: settings.race_duration,
      expected_version: settings.version,
    });
    setSaving(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Khong the luu settings.');
      return;
    }

    setError(null);
    setSettings(result.data);
    setSyncedSignature(buildDraftSignature(result.data, horses));
    setLiveUpdatePending(false);
    setInfo('Horse racing settings updated.');
  }

  async function handleSaveHorse(horse: Horse) {
    if (horse.odds_multiplier < 1) {
      setError('Odds multiplier must be >= 1.');
      return;
    }
    const normalizedAvatar = normalizeHorseAvatarInput(horse.avatar);
    setSaving(true);
    const result = await horseRaceService.adminUpsertHorse(sessionToken, {
      horse_id: horse.horse_id,
      name: horse.name,
      avatar: normalizedAvatar,
      speed_rating: horse.speed_rating,
      rarity: horse.rarity,
      odds_multiplier: horse.odds_multiplier,
      win_probability: horse.win_probability,
      enabled: horse.enabled,
      sort_order: horse.sort_order,
    });
    setSaving(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Khong the cap nhat horse.');
      return;
    }

    setError(null);
    setInfo(`Saved horse: ${result.data.name}`);
    await loadState({ forceDraftReset: true });
  }

  function handleHorseAvatarFileChange(horseId: string, file: File | null) {
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!dataUrl) {
        setError('Could not read image file.');
        return;
      }
      setError(null);
      setHorses((current) =>
        current.map((item) => (item.horse_id === horseId ? { ...item, avatar: dataUrl } : item)),
      );
    };
    reader.onerror = () => {
      setError('Could not read image file.');
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateHorse() {
    setSaving(true);
    const result = await horseRaceService.adminUpsertHorse(sessionToken, {
      horse_id: null,
      ...EMPTY_HORSE,
    });
    setSaving(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Khong the tao horse.');
      return;
    }

    setError(null);
    setInfo('New horse created.');
    await loadState({ forceDraftReset: true });
  }

  async function handleDeleteHorse(horseId: string) {
    if (!window.confirm('Delete this horse configuration?')) {
      return;
    }
    setSaving(true);
    const result = await horseRaceService.adminDeleteHorse(sessionToken, horseId);
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setInfo('Horse deleted.');
    await loadState({ forceDraftReset: true });
  }

  async function handleForceEndRace() {
    if (!activeRaceId) {
      return;
    }
    if (!window.confirm('Force end active horse race now?')) {
      return;
    }
    setSaving(true);
    const result = await horseRaceService.adminForceEndRace(sessionToken, activeRaceId, 'Force ended from admin panel');
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setInfo('Race force-ended.');
    await loadState({ forceDraftReset: true });
  }

  if (loading || !settings) {
    return (
      <section className="rounded-2xl border border-white/10 bg-black/25 p-8 text-center text-sm text-slate-400">
        Loading horse racing admin state...
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-300">{error}</div>
      ) : null}
      {info ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300">{info}</div>
      ) : null}

      <header className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#050d1b] to-[#02060d] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Admin Console</div>
            <h2 className="mt-1 text-2xl font-black text-white">Horse Racing Settings</h2>
            <div className="mt-1 text-[10px] font-bold text-slate-500">
              Enabled probability sum: <span className="text-cyan-300">{enabledProbability.toFixed(2)}%</span>
            </div>
            <div className="mt-1 text-[10px] font-bold text-slate-600">Rarity is auto-calculated from horse wins.</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="choice-button border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-300"
              onClick={() => void loadState({ withLoader: true, forceDraftReset: true })}
            >
              <RefreshCw size={12} className="inline mr-1" />
              Refresh
            </button>
            <button
              type="button"
              className="choice-button border-amber-500/35 bg-amber-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-amber-300 disabled:opacity-45"
              onClick={() => void handleForceEndRace()}
              disabled={!activeRaceId || saving}
            >
              <Flag size={12} className="inline mr-1" />
              Force End Race
            </button>
            <button
              type="button"
              className="choice-button border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-300 disabled:opacity-45"
              onClick={() => void handleSaveSettings()}
              disabled={saving}
            >
              <Save size={12} className="inline mr-1" />
              Save Settings
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Game Enabled</div>
          <button
            type="button"
            className={`mt-2 rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
              settings.enabled
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/35 bg-rose-500/10 text-rose-300'
            }`}
            onClick={() => setSettings((current) => (current ? { ...current, enabled: !current.enabled } : current))}
          >
            {settings.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Min Bet</div>
          <FormattedInput
            className="form-input mt-2 w-full bg-slate-950/60 text-xs text-cyan-200"
            value={settings.min_bet}
            onChange={(value) =>
              setSettings((current) =>
                current ? { ...current, min_bet: Math.max(1, Math.min(PG_INT_MAX, value)) } : current,
              )
            }
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Max Bet</div>
          <FormattedInput
            className="form-input mt-2 w-full bg-slate-950/60 text-xs text-cyan-200"
            value={settings.max_bet}
            onChange={(value) =>
              setSettings((current) =>
                current ? { ...current, max_bet: Math.max(1, Math.min(PG_INT_MAX, value)) } : current,
              )
            }
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Bet/Race Duration</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <FormattedInput
              className="form-input w-full bg-slate-950/60 text-xs text-cyan-200"
              value={settings.betting_duration}
              onChange={(value) =>
                setSettings((current) =>
                  current ? { ...current, betting_duration: Math.max(10, Math.min(180, value)) } : current,
                )
              }
            />
            <FormattedInput
              className="form-input w-full bg-slate-950/60 text-xs text-cyan-200"
              value={settings.race_duration}
              onChange={(value) =>
                setSettings((current) =>
                  current ? { ...current, race_duration: Math.max(10, Math.min(180, value)) } : current,
                )
              }
            />
          </div>
        </div>
      </section>

      {Math.abs(enabledProbability - 100) > 0.0001 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-200">
          <AlertTriangle size={14} className="inline mr-1" />
          Enabled horse probabilities must total 100%. Current: {enabledProbability.toFixed(2)}%
        </div>
      ) : null}
      {liveUpdatePending && isDirty ? (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs font-bold text-cyan-200">
          Co cap nhat moi tu realtime. Form dang duoc giu de tranh mat noi dung ban dang nhap. Bam Refresh de dong bo.
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">Horse Configurations</div>
          <button
            type="button"
            className="choice-button border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-200"
            onClick={() => void handleCreateHorse()}
            disabled={saving}
          >
            Add Horse
          </button>
        </div>

        <div className="space-y-2">
          {horses
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((horse) => (
              <div key={horse.horse_id} className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                <div className="grid gap-2 md:grid-cols-[120px_2fr_1fr_1fr_1fr_1fr_1fr_auto_auto]">
                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Preview</div>
                    <img
                      src={normalizeHorseAvatarInput(horse.avatar) ?? DEFAULT_HORSE_AVATAR}
                      alt={horse.name}
                      className="h-[86px] w-full rounded-lg border border-white/10 bg-black/35 object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Name</div>
                    <input
                      className="form-input w-full bg-black/35 text-xs text-white"
                      value={horse.name}
                      onChange={(event) =>
                        setHorses((current) =>
                          current.map((item) =>
                            item.horse_id === horse.horse_id ? { ...item, name: event.target.value } : item,
                          ),
                        )
                      }
                    />
                    <div className="mb-1 mt-2 text-[9px] font-black uppercase tracking-wider text-slate-500">Image URL / Path</div>
                    <div className="flex gap-1.5">
                      <input
                        className="form-input w-full bg-black/35 text-xs text-cyan-200"
                        value={horse.avatar ?? ''}
                        placeholder="/assets/horses/neon-horse.svg or https://..."
                        onChange={(event) =>
                          setHorses((current) =>
                            current.map((item) =>
                              item.horse_id === horse.horse_id ? { ...item, avatar: event.target.value } : item,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="rounded-lg border border-white/10 bg-white/5 px-2 text-[9px] font-black uppercase tracking-wider text-slate-300"
                        onClick={() =>
                          setHorses((current) =>
                            current.map((item) =>
                              item.horse_id === horse.horse_id ? { ...item, avatar: DEFAULT_HORSE_AVATAR } : item,
                            ),
                          )
                        }
                      >
                        Default
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-200">
                        <Upload size={10} />
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            handleHorseAvatarFileChange(horse.horse_id, event.target.files?.[0] ?? null);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                      <span className="text-[9px] text-slate-500">Select file then click row Save.</span>
                    </div>
                    <div className="mt-1 text-[9px] text-slate-500">Tip: after changing image, click the row Save button.</div>
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Speed</div>
                    <FormattedInput
                      className="form-input w-full bg-black/35 text-xs text-cyan-200"
                      value={horse.speed_rating}
                      onChange={(value) =>
                        setHorses((current) =>
                          current.map((item) =>
                            item.horse_id === horse.horse_id ? { ...item, speed_rating: Math.max(1, Math.min(100, value)) } : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Odds</div>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="form-input w-full bg-black/35 text-xs text-cyan-200"
                      value={horse.odds_multiplier}
                      onChange={(event) =>
                        setHorses((current) =>
                          current.map((item) =>
                            item.horse_id === horse.horse_id
                              ? { ...item, odds_multiplier: Math.max(1, Number(event.target.value) || 1) }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Win %</div>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input w-full bg-black/35 text-xs text-cyan-200"
                      value={horse.win_probability}
                      onChange={(event) =>
                        setHorses((current) =>
                          current.map((item) =>
                            item.horse_id === horse.horse_id
                              ? { ...item, win_probability: Math.max(0, Number(event.target.value) || 0) }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Rarity (Auto)</div>
                    <div className="form-input flex h-[38px] items-center justify-center bg-black/35 text-xs font-black uppercase tracking-wider text-amber-300">
                      {horse.rarity}
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      className={`mt-[18px] h-[38px] w-full rounded-lg border px-2 text-[10px] font-black uppercase ${
                        horse.enabled
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-500/30 bg-slate-900/50 text-slate-300'
                      }`}
                      onClick={() =>
                        setHorses((current) =>
                          current.map((item) => (item.horse_id === horse.horse_id ? { ...item, enabled: !item.enabled } : item)),
                        )
                      }
                    >
                      {horse.enabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="mt-[18px] h-[38px] w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 text-[10px] font-black uppercase text-cyan-200"
                      onClick={() => void handleSaveHorse(horse)}
                      disabled={saving}
                    >
                      Save
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="mt-[18px] h-[38px] w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 text-rose-300"
                      onClick={() => void handleDeleteHorse(horse.horse_id)}
                      disabled={saving}
                    >
                      <Trash2 size={12} className="mx-auto" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Live Stats</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-[10px]">
            Active Users: <span className="font-black text-cyan-300">{liveStats?.active_users ?? 0}</span>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-[10px]">
            24h Bet Volume: <span className="font-black text-emerald-300">{(liveStats?.total_amount_24h ?? 0).toLocaleString()}</span>
          </div>
          <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2 text-[10px]">
            Active Race: <span className="font-black text-fuchsia-300">{activeRaceId ? 'YES' : 'NO'}</span>
          </div>
        </div>
      </section>
    </section>
  );
}
