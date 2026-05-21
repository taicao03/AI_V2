import { ShieldCheck, Home, MessageSquare, ShieldAlert, Crown, Target } from 'lucide-react';
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
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020617] text-slate-100">
      {/* Visual Foundation */}
      <div className="ambient-grid" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
      <div className="fixed inset-0 pointer-events-none z-[101] animate-scanline bg-[linear-gradient(to_bottom,transparent,rgba(34,211,238,0.05),transparent)] h-20 w-full" style={{ top: '-100px' }} />

      <NotificationCenter notifications={notifications} onClose={onCloseNotification} />
      <HeaderWinTicker alerts={headerWinAlerts} />

      <div className="relative mx-auto max-w-[1600px] px-4 pb-12 pt-28 sm:pt-36 sm:px-6 lg:px-8">
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
            <nav className="flex items-center gap-1 rounded-2xl border border-white/5 bg-white/5 p-1.5 backdrop-blur-xl w-full sm:w-auto">
              <NavButton icon={<Home size={18} />} label="Arena" onClick={() => onNavigate('/')} />
              <NavButton icon={<Crown size={18} />} label="Poker" onClick={() => onNavigate('/poker')} />
              <NavButton icon={<Target size={18} />} label="Roulette" onClick={() => onNavigate('/games/russian-roulette')} />
              <NavButton icon={<MessageSquare size={18} />} label="Comms" onClick={() => onNavigate('/chat')} />
              {profile?.role === 'admin' && (
                <NavButton icon={<ShieldAlert size={18} />} label="Control" onClick={() => onNavigate('/admin')} />
              )}
            </nav>
            <UserHeader connected={connected} onSignOut={onSignOut} onSignInClick={onSignInClick} profile={profile} />
          </div>
        </header>

        <div className="relative z-10">
          {children}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(110vh); }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
      `}} />
    </main>
  );
}

function NavButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 rounded-xl px-4 py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-white/10 hover:text-white"
    >
      {icon}
      <span className="inline">{label}</span>
    </button>
  );
}
