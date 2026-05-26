import { ReactNode, useState } from 'react';
import {
  BarChart3,
  Users,
  History,
  MessageSquare,
  Bell,
  Crown,
  ChevronLeft,
  ChevronDown,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  Flag,
  Brain,
} from 'lucide-react';
import type { UserProfile } from '../../types';

type AdminLayoutProps = {
  profile: UserProfile | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBack: () => void;
  children: ReactNode;
};

const TABS = [
  { id: 'stats', label: 'System Stats', icon: <BarChart3 size={18} /> },
  { id: 'users', label: 'Users', icon: <Users size={18} /> },
  { id: 'rounds', label: 'Rounds', icon: <History size={18} /> },
  { id: 'poker', label: 'Poker', icon: <Crown size={18} /> },
  { id: 'russian-roulette', label: 'Russian Roulette', icon: <ShieldCheck size={18} /> },
  { id: 'wheel-spin', label: 'Wheel Spin', icon: <Sparkles size={18} /> },
  { id: 'horse-racing', label: 'Horse Racing', icon: <Flag size={18} /> },
  { id: 'millionaire', label: 'Millionaire', icon: <Brain size={18} /> },
  { id: 'chat', label: 'Chat Moderation', icon: <MessageSquare size={18} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
] as const;

export function AdminLayout({ profile, activeTab, onTabChange, onBack, children }: AdminLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#020617] p-6 text-slate-100 flex items-center justify-center">
        <section className="panel max-w-md w-full p-8 text-center space-y-4">
          <p className="text-slate-400">Admin authentication required.</p>
          <button
            className="choice-button w-full text-xs font-black uppercase tracking-wider text-cyan-300 border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10"
            onClick={onBack}
          >
            Back to Home
          </button>
        </section>
      </main>
    );
  }

  const activeTabDetails = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <main className="flex min-h-screen bg-[#020617] text-slate-100">
      <div className="ambient-grid" />

      <aside className="relative z-20 hidden w-72 flex-col border-r border-white/5 bg-[#020617]/80 backdrop-blur-3xl lg:flex">
        <div className="flex h-24 items-center gap-3 border-b border-white/5 px-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h1 className="font-display text-base font-black uppercase tracking-tight text-white leading-none">Control Center</h1>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400/60">Admin</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-8">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent text-cyan-400 border-l-2 border-cyan-400 shadow-[inset_4px_0_12px_rgba(34,211,238,0.15)] bg-slate-900/60'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-cyan-500/5 via-cyan-500/0 to-transparent pointer-events-none" />
                )}
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {tab.icon}
                </div>
                <span className="font-display tracking-wide">{tab.label}</span>
                {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)] animate-pulse" />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-6">
          <div className="mb-4 rounded-2xl bg-white/5 p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-black text-white">
                {profile.account_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-white">@{profile.account_name}</div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase">
                  <ShieldCheck size={10} />
                  ADMIN
                </div>
              </div>
            </div>
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-bold text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
            onClick={onBack}
            type="button"
          >
            <ChevronLeft size={16} />
            Exit
          </button>
        </div>
      </aside>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <header className="relative z-10 flex h-20 shrink-0 items-center justify-between border-b border-white/5 bg-[#020617]/50 px-6 backdrop-blur-xl lg:px-10">
          <div className="flex items-center gap-4 lg:hidden">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <LayoutDashboard size={18} />
            </div>
            <h1 className="font-display text-sm font-black uppercase tracking-tight text-white">ADMIN</h1>
          </div>

          {/* Mobile Admin Nav Dropdown */}
          <div className="relative lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-400 backdrop-blur-md transition-all active:scale-95 shadow-[0_0_12px_rgba(34,211,238,0.05)]"
            >
              <div className="text-cyan-400">
                {activeTabDetails.icon}
              </div>
              <span className="font-display truncate max-w-[120px]">{activeTabDetails.label}</span>
              <ChevronDown size={12} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Glassmorphic Dropdown Panel */}
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/35" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 mt-2.5 z-50 w-56 rounded-2xl border border-white/10 bg-[#070b19]/95 p-2 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.85),_0_0_20px_rgba(34,211,238,0.08)] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 mb-1.5">
                    Cockpit Modules
                  </div>
                  <div className="space-y-0.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                    {TABS.map((tab) => {
                      const isTabActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            onTabChange(tab.id);
                            setIsMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-150 ${
                            isTabActive
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15'
                              : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className={`transition-colors ${isTabActive ? 'text-cyan-400' : 'text-slate-400'}`}>
                            {tab.icon}
                          </div>
                          <span className="font-display tracking-wide truncate">{tab.label}</span>
                          {isTabActive && (
                            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)] animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-white/5 pt-1.5 mt-1.5">
                    <button
                      onClick={() => {
                        onBack();
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                    >
                      <ChevronLeft size={16} />
                      <span className="font-display tracking-wide">Exit Panel</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 lg:flex">
            Status:
            <span className="text-emerald-400 flex items-center gap-1.5 ml-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)]" />
              HEALTHY
            </span>
            <span className="mx-4 h-4 w-px bg-white/5" />
            Session: <span className="text-white ml-1 font-mono">SEC_ADMIN_{profile.uid.slice(0, 6)}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 pb-24 lg:pb-10">
          <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.2);
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `,
        }}
      />
    </main>
  );
}

