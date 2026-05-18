import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ChevronLeft, Loader2, Lock, UserCheck } from 'lucide-react';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminErrorBoundary } from '../components/admin/AdminErrorBoundary';
import { adminService, type AdminSessionDebug } from '../services/adminService';
import type { UserProfile } from '../types';

type AdminPageProps = {
  loading: boolean;
  onBack: () => void;
  profile: UserProfile | null;
  sessionToken: string | null;
};

export function AdminPage({ loading, onBack, profile, sessionToken }: AdminPageProps) {
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isAdminAllowed, setIsAdminAllowed] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [sessionDebug, setSessionDebug] = useState<AdminSessionDebug | null>(null);
  const frontendRoleAllowsAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!sessionToken || frontendRoleAllowsAdmin) {
      setCheckingAdmin(false);
      setIsAdminAllowed(Boolean(frontendRoleAllowsAdmin));
      setAdminError(null);
      return;
    }

    let mounted = true;
    setCheckingAdmin(true);
    setAdminError(null);

    adminService.getSessionDebug(sessionToken).then((debugResult) => {
      if (!mounted) {
        return;
      }

      const debugRpcMissing = debugResult.error?.message
        .toLowerCase()
        .includes('get_admin_session_debug');
      setSessionDebug(debugResult.data);
      setIsAdminAllowed(Boolean(debugResult.data?.role === 'admin' || (debugRpcMissing && frontendRoleAllowsAdmin)));
      setAdminError(
        debugRpcMissing && frontendRoleAllowsAdmin
          ? 'RPC get_admin_session_debug chua co trong schema cache. Dang cho vao bang profile.role=admin; hay chay SQL schema/hotfix de cac thao tac admin backend hoat dong day du.'
          : debugResult.error?.message ?? null,
      );
      setCheckingAdmin(false);
    });

    return () => {
      mounted = false;
    };
  }, [frontendRoleAllowsAdmin, sessionToken]);

  if (loading || checkingAdmin) {
    return (
      <main className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6">
        <div className="ambient-grid" />
        <section className="relative flex flex-col items-center gap-6 animate-pulse">
           <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Loader2 size={32} className="animate-spin" />
           </div>
           <div className="text-center space-y-2">
              <h2 className="font-display text-xl font-black uppercase tracking-widest text-white">Security Check</h2>
              <p className="text-sm text-slate-400">Verifying administrative credentials...</p>
           </div>
        </section>
      </main>
    );
  }

  if (!sessionToken || !profile) {
    return (
      <main className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6">
        <div className="ambient-grid" />
        <section className="panel relative max-w-md w-full p-10 flex flex-col items-center text-center gap-6">
          <div className="h-20 w-20 flex items-center justify-center rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
             <Lock size={40} />
          </div>
          <div className="space-y-2">
             <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white">Access Denied</h2>
             <p className="text-sm text-slate-400">You must be logged in as an administrator to access this terminal.</p>
          </div>
          <button 
            className="group flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10" 
            onClick={onBack}
          >
            <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            Return to Surface
          </button>
        </section>
      </main>
    );
  }

  if (!isAdminAllowed && !frontendRoleAllowsAdmin) {
    return (
      <main className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6">
        <div className="ambient-grid" />
        <section className="panel relative max-w-xl w-full p-8 space-y-8">
          <div className="flex items-center gap-6">
             <div className="h-16 w-16 shrink-0 flex items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <ShieldAlert size={32} />
             </div>
             <div className="space-y-1">
                <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white">Insufficient Clearance</h2>
                <p className="text-sm text-slate-400">Your account does not have administrative privileges.</p>
             </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
             <div className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                   <UserCheck size={12} />
                   Frontend Identity
                </div>
                <div className="space-y-1">
                   <div className="text-sm font-bold text-white">@{profile.account_name}</div>
                   <div className="text-[10px] font-mono text-slate-500 truncate">{profile.uid}</div>
                   <div className="inline-flex rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-500 border border-amber-500/20">
                      Role: {profile.role}
                   </div>
                </div>
             </div>

             {sessionDebug && (
                <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4 space-y-3">
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-500">
                      <ShieldCheck size={12} />
                      Backend Resolve
                   </div>
                   <div className="space-y-1">
                      <div className="text-sm font-bold text-white">@{sessionDebug.account_name}</div>
                      <div className="text-[10px] font-mono text-cyan-500/60 truncate">{sessionDebug.uid}</div>
                      <div className="flex items-center gap-2">
                         <div className="inline-flex rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-black uppercase text-rose-500 border border-rose-500/20">
                            Role: {sessionDebug.role}
                         </div>
                         {sessionDebug.is_banned && (
                            <div className="inline-flex rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">BANNED</div>
                         )}
                      </div>
                   </div>
                </div>
             )}
          </div>

          {adminError && (
             <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-medium text-rose-300 leading-relaxed">
                {adminError}
             </div>
          )}

          <div className="flex justify-center">
             <button 
               className="group flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-white/10" 
               onClick={onBack}
             >
               <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-1" />
               Eject Terminal
             </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <AdminErrorBoundary onBack={onBack}>
      <AdminDashboard onBack={onBack} profile={{ ...profile, role: 'admin' }} sessionToken={sessionToken} />
    </AdminErrorBoundary>
  );
}
