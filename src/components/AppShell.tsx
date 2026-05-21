import { ShieldCheck, Home, MessageSquare, ShieldAlert, Crown, Target, Sparkles } from 'lucide-react';
import { HeaderWinTicker, type HeaderWinAlert } from './HeaderWinTicker';
import { NotificationCenter, type NotificationItem } from './NotificationCenter';
import { UserHeader } from './UserHeader';
import type { UserProfile } from '../types';

type AppShellProps = {
  children: React.ReactNode;
  connected: boolean;
  headerWinAlerts: HeaderWinAlert[];
  notifications: NotificationItem[];
  onCloseNotification: (id: string) => void;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  onSignInClick?: () => void;
  profile: UserProfile | null;
};

export function AppShell({
  children,
  connected,
  headerWinAlerts,
  notifications,
  onCloseNotification,
  onNavigate,
  onSignOut,
  onSignInClick,
  profile,
}: AppShellProps) {
  const isActivePath = (path: string) => {
    const currentPath = window.location.pathname;
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020617] text-slate-100 pb-24 sm:pb-12">
      {/* Visual Foundation */}
      <div className="ambient-grid" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
      <div className="fixed inset-0 pointer-events-none z-[101] animate-scanline bg-[linear-gradient(to_bottom,transparent,rgba(34,211,238,0.05),transparent)] h-20 w-full" style={{ top: '-100px' }} />

      <NotificationCenter notifications={notifications} onClose={onCloseNotification} />
      <HeaderWinTicker alerts={headerWinAlerts} />

      <div className="relative mx-auto max-w-[1600px] px-4 pt-28 sm:pt-36 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="group flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase text-cyan-400 backdrop-blur-md transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10"
                onClick={() => onNavigate('/')}
                type="button"
              >
                <ShieldCheck className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                Dice Predictor • Protocol v2.0
              </button>
              
              <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase backdrop-blur-md transition-all ${
                connected 
                  ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-400' 
                  : 'border-rose-400/20 bg-rose-400/5 text-rose-400'
              }`}>
                <div className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-rose-500'}`} />
                {connected ? 'Link Active' : 'Interrupted'}
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Cyber <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Gambling</span> Arena
              </h1>
              <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-500 font-medium">
                High-fidelity dice simulation protocols. Synchronized temporal betting, 
                instant digital settlement, and global competitive intelligence.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-4">
            <nav className="hidden sm:flex items-center gap-1 rounded-2xl border border-white/5 bg-white/5 p-1.5 backdrop-blur-xl w-full sm:w-auto overflow-x-auto scrollbar-none flex-nowrap whitespace-nowrap">
              <NavButton icon={<Home size={18} />} label="Arena" onClick={() => onNavigate('/')} active={isActivePath('/')} />
              <NavButton icon={<Crown size={18} />} label="Poker" onClick={() => onNavigate('/poker')} active={isActivePath('/poker')} />
              <NavButton icon={<Target size={18} />} label="Roulette" onClick={() => onNavigate('/games/russian-roulette')} active={isActivePath('/games/russian-roulette')} />
              <NavButton icon={<Sparkles size={18} />} label="Wheel" onClick={() => onNavigate('/games/wheel-spin')} active={isActivePath('/games/wheel-spin')} />
              <NavButton icon={<MessageSquare size={18} />} label="Comms" onClick={() => onNavigate('/chat')} active={isActivePath('/chat')} />
              {profile?.role === 'admin' && (
                <NavButton icon={<ShieldAlert size={18} />} label="Control" onClick={() => onNavigate('/admin')} active={isActivePath('/admin')} />
              )}
            </nav>
            <UserHeader connected={connected} onSignOut={onSignOut} onSignInClick={onSignInClick} profile={profile} />
          </div>
        </header>

        <div className="relative z-10">
          {children}
        </div>
      </div>

      {/* MOBILE BOTTOM FLOATING NAVIGATION DOCK */}
      <div className="sm:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-[440px] rounded-2xl border border-white/10 bg-[#070b19]/85 p-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.65),_0_0_20px_rgba(34,211,238,0.1)] flex items-center justify-around">
        <MobileNavButton icon={<Home size={18} />} label="Arena" onClick={() => onNavigate('/')} active={isActivePath('/')} />
        <MobileNavButton icon={<Crown size={18} />} label="Poker" onClick={() => onNavigate('/poker')} active={isActivePath('/poker')} />
        <MobileNavButton icon={<Target size={18} />} label="Roulette" onClick={() => onNavigate('/games/russian-roulette')} active={isActivePath('/games/russian-roulette')} />
        <MobileNavButton icon={<Sparkles size={18} />} label="Wheel" onClick={() => onNavigate('/games/wheel-spin')} active={isActivePath('/games/wheel-spin')} />
        <MobileNavButton icon={<MessageSquare size={18} />} label="Comms" onClick={() => onNavigate('/chat')} active={isActivePath('/chat')} />
        {profile?.role === 'admin' && (
          <MobileNavButton icon={<ShieldAlert size={18} />} label="Control" onClick={() => onNavigate('/admin')} active={isActivePath('/admin')} />
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(110vh); }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
          touch-action: pan-x;
          -webkit-overflow-scrolling: touch;
        }
      `}} />
    </main>
  );
}

function NavButton({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick: () => void, active?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-shrink-0 flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-200 border ${
        active 
          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]' 
          : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span className="inline">{label}</span>
    </button>
  );
}

function MobileNavButton({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick: () => void, active?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-300 ${
        active 
          ? 'text-cyan-400 scale-105' 
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-cyan-400/10 shadow-[0_0_12px_rgba(34,211,238,0.2)]' : ''}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-widest mt-0.5 transition-all ${active ? 'text-cyan-300' : 'text-slate-500'}`}>
        {label}
      </span>
    </button>
  );
}
