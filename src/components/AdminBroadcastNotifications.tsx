import { AlertTriangle, CheckCircle2, Info, X, XCircle, Radio } from 'lucide-react';
import type { AdminNotification, AdminNotificationKind } from '../types';

type AdminBroadcastNotificationsProps = {
  items: AdminNotification[];
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
};

function getIcon(kind: AdminNotificationKind) {
  switch (kind) {
    case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case 'error': return <XCircle className="h-4 w-4 text-rose-400" />;
    default: return <Info className="h-4 w-4 text-cyan-400" />;
  }
}

export function AdminBroadcastNotifications({ dismissedIds, items, onDismiss }: AdminBroadcastNotificationsProps) {
  const visibleItems = items.filter((item) => !dismissedIds.has(item.notification_id));

  if (visibleItems.length === 0) {
    return null;
  }

  // We take the first active notification to define the theme, but show all in marquee
  const primaryItem = visibleItems[0];
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[150] px-4 pt-4 pointer-events-none">
      <div className="mx-auto max-w-5xl pointer-events-auto">
        <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-2xl shadow-2xl transition-all duration-500 ${
          primaryItem.kind === 'error' ? 'border-rose-500/50 bg-[#0f172a]' :
          primaryItem.kind === 'warning' ? 'border-amber-500/50 bg-[#0f172a]' :
          primaryItem.kind === 'success' ? 'border-emerald-500/50 bg-[#0f172a]' :
          'border-cyan-500/50 bg-[#0f172a]'
        }`}>
          {/* Animated Background Pulse */}
          <div className={`absolute inset-0 opacity-10 animate-pulse ${
            primaryItem.kind === 'error' ? 'bg-rose-500' :
            primaryItem.kind === 'warning' ? 'bg-amber-500' :
            primaryItem.kind === 'success' ? 'bg-emerald-500' :
            'bg-cyan-500'
          }`} />

          <div className="relative flex items-center h-10 px-4">
            {/* Marquee Container */}
            <div className="flex-1 overflow-hidden relative h-full flex items-center">
               <div className="marquee-track flex items-center gap-12 whitespace-nowrap px-6">
                  {/* Render items twice for seamless loop */}
                  {[...visibleItems, ...visibleItems].map((item, idx) => (
                    <div key={`${item.notification_id}-${idx}`} className="flex items-center gap-3 h-full">
                       {getIcon(item.kind)}
                       <span className="text-[11px] font-bold tracking-tight text-white/90 uppercase translate-y-[0.5px]">
                          {item.message}
                       </span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Actions */}
            <div className="pl-4 border-l border-white/10 shrink-0">
               <button 
                 onClick={() => onDismiss(primaryItem.notification_id)}
                 className="group h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                 title="Clear Transmission"
               >
                  <X size={14} className="group-hover:rotate-90 transition-transform duration-300" />
               </button>
            </div>
          </div>

          {/* Progress Indicator (Subtle bottom line) */}
          <div className="absolute bottom-0 left-0 h-[1px] w-full bg-white/5 overflow-hidden">
             <div className={`h-full animate-progress-linear ${
               primaryItem.kind === 'error' ? 'bg-rose-500' :
               primaryItem.kind === 'warning' ? 'bg-amber-500' :
               primaryItem.kind === 'success' ? 'bg-emerald-500' :
               'bg-cyan-500'
             }`} />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 30s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes progress-linear {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-linear {
          animation: progress-linear 5s linear infinite;
        }
      `}} />
    </div>
  );
}
