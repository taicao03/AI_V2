import { LogOut, UserCircle, LogIn, ChevronRight } from 'lucide-react';
import type { UserProfile } from '../types';
import { PointsDisplay } from './PointsDisplay';

type UserHeaderProps = {
  profile: UserProfile | null;
  connected: boolean;
  onSignOut: () => void;
  onSignInClick?: () => void;
};

export function UserHeader({ profile, connected, onSignOut, onSignInClick }: UserHeaderProps) {
  if (!profile) {
    return (
      <button 
        onClick={onSignInClick}
        className="group flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-6 py-3 transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)] group-hover:scale-110 transition-transform">
           <LogIn size={16} />
        </div>
        <div className="text-left">
           <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Guest Access</div>
           <div className="flex items-center gap-1 text-sm font-black text-white uppercase tracking-tight">
              Authorize Login
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
           </div>
        </div>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-2 pr-4 backdrop-blur-xl">
      <div className="relative">
        {profile.avatar_url ? (
          <img alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10" src={profile.avatar_url} />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 text-xs font-black text-white ring-1 ring-white/10">
            {profile.display_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className={`absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-[#020617] ${connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-rose-500'}`} />
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-black text-white tracking-tight uppercase">{profile.display_name}</span>
          {profile.vip_level > 0 && (
            <span className="rounded bg-purple-500/20 px-1 py-0.5 text-[8px] font-black uppercase text-purple-400 border border-purple-500/20">VIP {profile.vip_level}</span>
          )}
        </div>
        <div className="truncate text-[10px] font-bold text-slate-500 tracking-wider">@{profile.account_name}</div>
      </div>

      <div className="hidden sm:block h-8 w-px bg-white/5 mx-2" />
      
      <PointsDisplay compact profile={profile} />
      
      <button 
        aria-label="Dang xuat" 
        className="ml-2 h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all" 
        onClick={onSignOut} 
        type="button"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
