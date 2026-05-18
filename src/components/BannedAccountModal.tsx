import { Ban, ShieldAlert, AlertTriangle, ExternalLink, Mail } from 'lucide-react';
import type { UserProfile } from '../types';

type BannedAccountModalProps = {
  profile: UserProfile | null;
};

export function BannedAccountModal({ profile }: BannedAccountModalProps) {
  if (!profile?.is_banned) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
      {/* Heavy Backdrop */}
      <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-2xl" />
      
      {/* Modal Container */}
      <section className="relative w-full max-w-lg overflow-hidden rounded-[3rem] border border-rose-500/30 bg-[#4c0519]/20 shadow-[0_0_80px_rgba(244,63,94,0.15)] animate-in fade-in zoom-in duration-500">
        {/* Top Hazard Bar */}
        <div className="flex h-1.5 w-full bg-[repeating-linear-gradient(45deg,#f43f5e,#f43f5e_10px,#000_10px,#000_20px)] opacity-50" />

        <div className="relative p-10 sm:p-12">
          {/* Background Glow */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-[100px]" />
          
          <div className="relative flex flex-col items-center text-center">
            {/* Primary Warning Icon */}
            <div className="relative mb-8">
               <div className="absolute inset-0 animate-ping rounded-full bg-rose-500/20" />
               <div className="relative flex h-24 w-24 items-center justify-center rounded-[2.5rem] border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.2)]">
                  <ShieldAlert size={48} className="animate-pulse" />
               </div>
               <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/40 bg-[#4c0519] text-rose-500">
                  <Ban size={20} />
               </div>
            </div>

            {/* Heading */}
            <div className="space-y-2">
               <div className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-500/70">Access Terminated</div>
               <h2 className="font-display text-4xl font-black uppercase tracking-tight text-white lg:text-5xl" id="banned-account-title">
                  Neural Link <span className="text-rose-500">Severed</span>
               </h2>
            </div>

            {/* Description / Reason */}
            <div className="mt-8 w-full rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 backdrop-blur-md">
               <div className="flex items-center gap-2 mb-3 justify-center">
                  <AlertTriangle size={14} className="text-rose-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500/80">Violation Detected</span>
               </div>
               <p className="text-lg font-medium leading-relaxed text-slate-200 italic">
                 "{profile.ban_reason || 'Unauthorized activity detected within the arena infrastructure.'}"
               </p>
               {profile.banned_at && (
                 <div className="mt-4 border-t border-rose-500/10 pt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Restriction applied: {new Date(profile.banned_at).toLocaleString()}
                 </div>
               )}
            </div>

            {/* Footer / Actions */}
            <div className="mt-10 w-full space-y-4">
               <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  This decision is final based on arena protocols.
               </p>
               <div className="flex flex-col gap-3 sm:flex-row">
                  <a 
                    href="mailto:support@cyberarena.com"
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-white/10"
                  >
                     <Mail size={14} />
                     Appeal Case
                  </a>
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-500 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-[0_0_30px_rgba(244,63,94,0.3)] transition-all hover:scale-105 active:scale-95"
                  >
                     <ExternalLink size={14} />
                     System Status
                  </button>
               </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Hazard Bar */}
        <div className="flex h-1.5 w-full bg-[repeating-linear-gradient(45deg,#f43f5e,#f43f5e_10px,#000_10px,#000_20px)] opacity-50" />
      </section>
    </div>
  );
}
