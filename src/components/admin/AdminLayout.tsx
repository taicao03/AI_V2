import { ReactNode } from "react";
import { 
  BarChart3, 
  Users, 
  History, 
  MessageSquare, 
  Bell, 
  Crown,
  ChevronLeft, 
  ShieldCheck,
  LayoutDashboard
} from "lucide-react";
import type { UserProfile } from "../../types";

type AdminLayoutProps = {
  profile: UserProfile | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBack: () => void;
  children: ReactNode;
};

const TABS = [
  { id: "stats", label: "Phân Tích Hệ Thống", icon: <BarChart3 size={18} /> },
  { id: "users", label: "Quản Trị Đấu Sĩ", icon: <Users size={18} /> },
  { id: "rounds", label: "Nhật Ký Ván Đấu", icon: <History size={18} /> },
  { id: "poker", label: "Vận Hành Poker", icon: <Crown size={18} /> },
  { id: "russian-roulette", label: "Vận Hành Ổ Xoay", icon: <ShieldCheck size={18} /> },
  { id: "chat", label: "Giám Sát Bộ Đàm", icon: <MessageSquare size={18} /> },
  { id: "notifications", label: "Phát Sóng Khẩn Cấp", icon: <Bell size={18} /> },
] as const;

export function AdminLayout({
  profile,
  activeTab,
  onTabChange,
  onBack,
  children,
}: AdminLayoutProps) {
  if (!profile) {
    return (
      <main className="min-h-screen bg-[#020617] p-6 text-slate-100 flex items-center justify-center">
        <section className="panel max-w-md w-full p-8 text-center space-y-4">
          <p className="text-slate-400">Yêu cầu xác thực tối cao để truy cập Trung tâm Chỉ huy.</p>
          <button className="choice-button w-full text-xs font-black uppercase tracking-wider text-cyan-300 border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10" onClick={onBack}>Trở lại Trang Chủ</button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#020617] text-slate-100">
      <div className="ambient-grid" />
      
      {/* Sidebar Navigation */}
      <aside className="relative z-20 hidden w-72 flex-col border-r border-white/5 bg-[#020617]/80 backdrop-blur-3xl lg:flex">
        <div className="flex h-24 items-center gap-3 border-b border-white/5 px-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h1 className="font-display text-base font-black uppercase tracking-tight text-white leading-none">Trung Tâm Chỉ Huy</h1>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400/60">Tổng Quản Trị</span>
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
                    ? "bg-gradient-to-r from-cyan-500/15 via-cyan-500/5 to-transparent text-cyan-400 border-l-2 border-cyan-400 shadow-[inset_4px_0_12px_rgba(34,211,238,0.15)] bg-slate-900/60" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
                }`}
              >
                {/* Active glow backing effect */}
                {isActive && (
                  <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-cyan-500/5 via-cyan-500/0 to-transparent pointer-events-none" />
                )}
                <div className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                  {tab.icon}
                </div>
                <span className="font-display tracking-wide">{tab.label}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)] animate-pulse" />
                )}
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
                     QUYỀN TỐI CAO
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
            Thoát Chỉ Huy
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Header (Visible on Mobile) */}
        <header className="relative z-10 flex h-20 shrink-0 items-center justify-between border-b border-white/5 bg-[#020617]/50 px-6 backdrop-blur-xl lg:px-10">
          <div className="flex items-center gap-4 lg:hidden">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
               <LayoutDashboard size={18} />
            </div>
            <h1 className="font-display text-sm font-black uppercase tracking-tight text-white">CHỈ HUY</h1>
          </div>

          <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 lg:flex">
             Trạng thái: <span className="text-emerald-400 flex items-center gap-1.5 ml-1">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,1)]" />
                HỆ THỐNG AN TOÀN
             </span>
             <span className="mx-4 h-4 w-px bg-white/5" />
             Phiên Hoạt Động: <span className="text-white ml-1 font-mono">SEC_ADMIN_PROX_{profile.uid.slice(0, 6)}</span>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Đồng bộ nút</span>
                <span className="text-[10px] font-bold text-cyan-400 uppercase">Thời Gian Thực</span>
             </div>
             <div className="h-8 w-8 rounded-full border border-white/5 bg-white/5 p-1 flex items-center justify-center">
                <div className="h-full w-full rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </div>
             </div>
          </div>
        </header>

        {/* Mobile Navigation (Bottom Bar) */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-white/5 bg-[#020617]/80 px-2 backdrop-blur-2xl lg:hidden">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 ${
                activeTab === tab.id ? "text-cyan-400" : "text-slate-500"
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label.slice(0, 5)}</span>
            </button>
          ))}
          <button onClick={onBack} className="flex flex-col items-center gap-1 p-2 text-slate-500">
             <ChevronLeft size={18} />
             <span className="text-[9px] font-black uppercase tracking-tighter">Thoát</span>
          </button>
        </nav>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 pb-24 lg:pb-10">
          <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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
      `}} />
    </main>
  );
}
