import { FormEvent, useMemo, useState } from 'react';
import { 
  Loader2, 
  Megaphone, 
  PowerOff, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Clock,
  Send,
  History,
  Activity,
  ChevronRight
} from 'lucide-react';
import { useAdminNotifications } from '../../hooks/useAdminNotifications';
import { adminNotificationService } from '../../services/adminNotificationService';
import type { AdminNotificationKind } from '../../types';

type AdminNotificationsPageProps = {
  sessionToken: string | null;
};

function toIsoFromLocal(value: string) {
  if (!value.trim()) return null;
  return new Date(value).toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function AdminNotificationsPage({ sessionToken }: AdminNotificationsPageProps) {
  const { error: loadError, items, loading, reload } = useAdminNotifications();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<AdminNotificationKind>('info');
  const [startsAt, setStartsAt] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()),
    [items],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: createError } = await adminNotificationService.create(sessionToken, {
      title: title.trim(),
      message: message.trim(),
      kind,
      startsAt: toIsoFromLocal(startsAt),
      durationSeconds,
    });

    if (createError) {
      setError(createError.message);
    } else {
      setTitle('');
      setMessage('');
      setKind('info');
      setStartsAt('');
      setDurationSeconds(15);
      await reload();
    }
    setSubmitting(false);
  }

  async function handleDeactivate(notificationId: string) {
    const { error: deactivateError } = await adminNotificationService.deactivate(sessionToken, notificationId);
    if (deactivateError) setError(deactivateError.message);
    else await reload();
  }

  const KINDS: { id: AdminNotificationKind; label: string; color: string; bg: string; text: string; border: string }[] = [
    { id: 'info', label: 'Info', color: 'cyan', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    { id: 'success', label: 'Success', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    { id: 'warning', label: 'Warning', color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    { id: 'error', label: 'Critical', color: 'rose', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  ];

  return (
    <div className="grid gap-12 xl:grid-cols-[440px_1fr]">
      {/* Left: Minimalist Broadcast Form */}
      <div className="space-y-8">
        <div className="space-y-1">
           <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white">Broadcast</h2>
           <p className="text-sm text-slate-500">Global system alerts terminal.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Main Form Section */}
          <div className="space-y-4">
             <div className="group space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors group-focus-within:text-white">Alert Title</label>
                <input 
                  className="form-input w-full bg-white/[0.02] border-white/5 focus:bg-white/[0.04] transition-all" 
                  onChange={(event) => setTitle(event.target.value)} 
                  placeholder="Summary of the alert..." 
                  value={title} 
                />
             </div>
             
             <div className="group space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors group-focus-within:text-white">Detailed Message</label>
                <textarea
                  className="form-input w-full min-h-[120px] resize-none bg-white/[0.02] border-white/5 focus:bg-white/[0.04] transition-all"
                  maxLength={500}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Provide essential information for users..."
                  value={message}
                />
             </div>

             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Alert Priority</label>
                <div className="grid grid-cols-4 gap-2">
                   {KINDS.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setKind(k.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                          kind === k.id 
                            ? `${k.border} ${k.bg} ${k.text} shadow-lg shadow-${k.color}-500/5` 
                            : "border-white/5 bg-white/5 text-slate-500 hover:border-white/10 hover:bg-white/10"
                        }`}
                      >
                         <AlertIcon kind={k.id} size={16} />
                         <span className="text-[9px] font-black uppercase tracking-tighter">{k.label}</span>
                      </button>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="group space-y-1.5">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors group-focus-within:text-white">Schedule</label>
                   <input 
                     className="form-input w-full bg-white/[0.02] border-white/5 text-xs focus:bg-white/[0.04]" 
                     onChange={(event) => setStartsAt(event.target.value)} 
                     type="datetime-local" 
                     value={startsAt} 
                   />
                </div>
                <div className="group space-y-1.5">
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors group-focus-within:text-white">Duration (Sec)</label>
                   <input
                     className="form-input w-full bg-white/[0.02] border-white/5 text-xs focus:bg-white/[0.04]"
                     min={3}
                     max={3600}
                     onChange={(event) => setDurationSeconds(Math.trunc(Number(event.target.value)))}
                     type="number"
                     value={durationSeconds}
                   />
                </div>
             </div>
          </div>

          {(error || loadError) && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-[10px] font-black uppercase text-rose-400">
               <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error ?? loadError}
               </div>
            </div>
          )}

          <button 
            className="group w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-black p-5 text-[11px] font-black uppercase tracking-[0.3em] transition-all hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30" 
            disabled={submitting} 
            type="submit"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={16} />}
            {submitting ? 'Sending...' : 'Dispatch Alert'}
          </button>
        </form>
      </div>

      {/* Right: History View */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Archives</h2>
              <p className="text-sm text-slate-500">Historical broadcast logs.</p>
           </div>
           <div className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2">
              <Activity size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sync Active</span>
           </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Compiling Records...</span>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 p-12 text-center text-slate-500 opacity-30">
               <Megaphone size={40} className="mb-4" />
               <p className="text-xs font-bold uppercase tracking-widest">Archive Empty</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedItems.map((item) => (
                <div 
                  className={`group relative overflow-hidden rounded-2xl border transition-all ${
                    item.is_active ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]' : 'border-white/5 bg-transparent opacity-30 grayscale'
                  }`} 
                  key={item.notification_id}
                >
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                       <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          item.kind === 'info' ? 'bg-cyan-500/10 text-cyan-400' : 
                          item.kind === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                          item.kind === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                       }`}>
                          <AlertIcon kind={item.kind} size={18} />
                       </div>
                       <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                             <h4 className="font-black text-white uppercase tracking-tight truncate">{item.title}</h4>
                             {item.is_active && (
                                <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)]" />
                             )}
                          </div>
                          <p className="text-sm text-slate-400 truncate max-w-md">{item.message}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-6">
                       <div className="hidden sm:flex flex-col items-end text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                          <span>{formatDate(item.starts_at)}</span>
                          <span>{formatDate(item.ends_at)}</span>
                       </div>
                       
                       {item.is_active ? (
                          <button 
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all" 
                            onClick={() => void handleDeactivate(item.notification_id)} 
                            type="button"
                          >
                            <PowerOff size={16} />
                          </button>
                       ) : (
                          <div className="h-9 w-9 flex items-center justify-center text-slate-700">
                             <ChevronRight size={18} />
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertIcon({ kind, size }: { kind: AdminNotificationKind; size: number }) {
  switch (kind) {
    case 'info': return <Info size={size} />;
    case 'success': return <CheckCircle2 size={size} />;
    case 'warning': return <AlertTriangle size={size} />;
    case 'error': return <AlertCircle size={size} />;
  }
}
