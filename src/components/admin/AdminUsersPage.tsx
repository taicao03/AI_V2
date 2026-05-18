import { FormEvent, useCallback, useEffect, useState } from 'react';
import { 
  Ban, 
  Gift, 
  Loader2, 
  X, 
  Search, 
  Users,
  UserPlus, 
  Shield, 
  History, 
  User, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { PointsTransaction, UserProfile } from '../../types';
import { formatNumber } from '../../lib/dice';

type AdminUsersPageProps = {
  sessionToken: string | null;
};

export function AdminUsersPage({ sessionToken }: AdminUsersPageProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [amount, setAmount] = useState('');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<UserProfile | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banLoading, setBanLoading] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error: usersError } = await adminService.listUsers(sessionToken, search);
    setUsers(data);
    setError(usersError?.message ?? null);
    setLoading(false);
  }, [search, sessionToken]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function loadTransactions(user: UserProfile) {
    setSelectedUser(user);
    const { data, error: transactionError } = await adminService.getTransactions(sessionToken, user.uid);
    setTransactions(data);
    setError(transactionError?.message ?? null);
  }

  async function handleAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isInteger(numericAmount) || numericAmount === 0) {
      setError('Amount must be a non-zero integer.');
      return;
    }

    const { error: adjustError } = await adminService.adjustPoints(sessionToken, selectedUser.uid, numericAmount, 'Manual admin adjustment');
    setError(adjustError?.message ?? null);
    setAmount('');
    await loadUsers();
    await loadTransactions(selectedUser);
  }

  async function handleBulkAdjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(bulkAmount);
    if (!Number.isInteger(numericAmount) || numericAmount === 0) {
      setError('Amount must be a non-zero integer.');
      return;
    }

    setBulkLoading(true);
    setBulkResult(null);
    setError(null);

    const { data, error: bulkError } = await adminService.adjustPointsForAll(
      sessionToken,
      numericAmount,
      bulkNote.trim() || 'Bulk admin adjustment',
    );

    if (bulkError) {
      setError(bulkError.message);
    } else if (data) {
      setBulkResult(`Updated ${formatNumber(data.affectedUsers)} users. Total change: ${formatNumber(data.totalAmount)} pts.`);
      setBulkAmount('');
      setBulkNote('');
      await loadUsers();
      if (selectedUser) {
        await loadTransactions(selectedUser);
      }
    }

    setBulkLoading(false);
  }

  function openBanDialog(user: UserProfile) {
    setBanTarget(user);
    setBanReason(user.ban_reason ?? '');
    setError(null);
    setBanError(null);
  }

  function closeBanDialog() {
    if (banLoading) return;
    setBanTarget(null);
    setBanReason('');
    setBanError(null);
  }

  async function handleBanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!banTarget) return;

    const reason = banReason.trim();
    if (!reason) {
      setBanError('Ban reason is required.');
      return;
    }

    setBanLoading(true);
    setBanError(null);

    const { data: updatedUser, error: submitError } = await adminService.setUserBan(sessionToken, banTarget.uid, true, reason);
    setError(submitError?.message ?? null);

    if (submitError) {
      setBanError(submitError.message);
    } else {
      if (updatedUser) {
        setUsers((curr) => curr.map((u) => (u.uid === updatedUser.uid ? updatedUser : u)));
        if (selectedUser?.uid === updatedUser.uid) setSelectedUser(updatedUser);
      }
      setBanTarget(null);
      setBanReason('');
    }

    await loadUsers();
    setBanLoading(false);
  }

  async function unbanUser(user: UserProfile) {
    const { data: updatedUser, error: submitError } = await adminService.setUserBan(sessionToken, user.uid, false, null);
    setError(submitError?.message ?? null);
    if (updatedUser) {
      setUsers((curr) => curr.map((u) => (u.uid === updatedUser.uid ? updatedUser : u)));
      if (selectedUser?.uid === updatedUser.uid) setSelectedUser(updatedUser);
    }
    await loadUsers();
  }

  async function toggleRole(user: UserProfile) {
    const { error: roleError } = await adminService.setUserRole(sessionToken, user.uid, user.role === 'admin' ? 'user' : 'admin');
    setError(roleError?.message ?? null);
    await loadUsers();
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
      {/* Left: User Management */}
      <div className="space-y-8">
        <section className="panel overflow-hidden p-0">
          <div className="border-b border-white/5 bg-white/5 px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                <Users size={14} />
                Directory Services
              </div>
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">Personnel Control</h2>
            </div>
            
            <div className="flex h-11 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 transition-all focus-within:border-cyan-400/50 sm:w-64">
              <Search className="text-slate-500 shrink-0" size={16} />
              <input 
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600" 
                onChange={(event) => setSearch(event.target.value)} 
                placeholder="Search account/ID..." 
                value={search} 
              />
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Bulk Actions */}
            <form className="group relative overflow-hidden rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-6" onSubmit={handleBulkAdjust}>
              <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift size={16} className="text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Global Point Dispersion</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Adjustment Amount</label>
                      <input
                        className="form-input bg-black/40 border-white/5"
                        onChange={(event) => setBulkAmount(event.target.value)}
                        placeholder="e.g. +5000 or -200"
                        value={bulkAmount}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Operation Note</label>
                      <input
                        className="form-input bg-black/40 border-white/5"
                        onChange={(event) => setBulkNote(event.target.value)}
                        placeholder="Reason for bulk change..."
                        value={bulkNote}
                      />
                    </div>
                  </div>
                </div>
                <button 
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all hover:scale-[1.02] disabled:opacity-30 lg:w-32" 
                  disabled={bulkLoading} 
                  type="submit"
                >
                  {bulkLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Execute'}
                </button>
              </div>
              
              {bulkResult && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-[10px] font-bold uppercase text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={12} />
                  {bulkResult}
                </div>
              )}
            </form>

            {/* User List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Subject Database</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{users.length} Records Found</span>
              </div>

              {loading ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Accessing Data Nodes...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div 
                      key={user.uid}
                      className={`group flex flex-col gap-4 rounded-2xl border p-4 transition-all hover:border-white/20 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between ${
                        selectedUser?.uid === user.uid ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-white/5 bg-white/5'
                      }`}
                    >
                      <button className="flex min-w-0 flex-1 items-center gap-4 text-left" onClick={() => void loadTransactions(user)} type="button">
                        <div className="relative shrink-0">
                           {user.avatar_url ? (
                             <img alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10" src={user.avatar_url} />
                           ) : (
                             <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-slate-400 ring-1 ring-white/10 uppercase">
                                {user.display_name.slice(0, 2)}
                             </div>
                           )}
                           {user.is_banned && (
                             <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white ring-2 ring-[#020617]">
                                <Ban size={10} />
                             </div>
                           )}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                             <span className="truncate text-sm font-black text-white tracking-tight">{user.display_name}</span>
                             <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ${
                               user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-slate-500'
                             }`}>
                                {user.role}
                             </span>
                          </div>
                          <div className="truncate text-[10px] font-bold text-slate-500 tracking-wider">@{user.account_name} • {user.email}</div>
                          {user.is_banned && (
                            <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold text-rose-400/70 uppercase">
                               <AlertCircle size={10} />
                               REASON: {user.ban_reason || 'NO RECORD'}
                            </div>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="text-right">
                          <div className="font-display text-sm font-black text-white">{formatNumber(user.points)}</div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase">PTS</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                              user.is_banned 
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                                : 'border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                            }`}
                            onClick={() => (user.is_banned ? void unbanUser(user) : openBanDialog(user))}
                            title={user.is_banned ? 'Unrestrict' : 'Restrict Account'}
                            type="button"
                          >
                            <Ban size={16} />
                          </button>
                          <button 
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white" 
                            onClick={() => void toggleRole(user)} 
                            title="Elevation / Demotion"
                            type="button"
                          >
                            <Shield size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Right: Detailed Analysis */}
      <aside className="space-y-8">
        <section className="panel overflow-hidden p-0 sticky top-10">
          <div className="border-b border-white/5 bg-white/5 px-6 py-4">
             <div className="space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                   <History size={14} />
                   Temporal Logs
                </div>
                <h2 className="font-display text-lg font-black uppercase tracking-tight text-white">Subject Analysis</h2>
             </div>
          </div>
          
          {!selectedUser ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 opacity-50">
               <User size={48} className="mb-4 text-slate-700" />
               <p className="text-sm font-bold">No Subject Selected</p>
               <p className="text-[10px] uppercase">Select a node from the database</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* User Identity Info */}
              <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 border border-white/5">
                 <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 p-[1px]">
                    <div className="h-full w-full rounded-xl bg-[#020617] flex items-center justify-center overflow-hidden">
                       {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="h-full w-full object-cover" /> : <span className="font-black text-white">{selectedUser.display_name.slice(0,1)}</span>}
                    </div>
                 </div>
                 <div className="min-w-0">
                    <div className="font-black text-white truncate">@{selectedUser.account_name}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase truncate">{selectedUser.uid}</div>
                 </div>
              </div>

              {/* Point Adjustment */}
              <div className="space-y-3">
                 <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Adjust Balance</div>
                 <form className="flex gap-2" onSubmit={handleAdjust}>
                    <input 
                      className="form-input flex-1 bg-black/40 border-white/5" 
                      onChange={(event) => setAmount(event.target.value)} 
                      placeholder="+/- Points" 
                      value={amount} 
                    />
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-cyan-500 hover:text-black transition-all" type="submit">
                       <ArrowRightLeft size={18} />
                    </button>
                 </form>
              </div>

              {/* Transaction List */}
              <div className="space-y-4">
                 <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transaction Ledger</div>
                 <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {transactions.length === 0 ? (
                      <div className="text-center py-8 text-[10px] font-bold uppercase text-slate-600">No activity recorded</div>
                   ) : (
                     transactions.map((transaction) => (
                       <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-2" key={transaction.transaction_id}>
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black uppercase text-white tracking-tighter">{transaction.type}</span>
                           <span className={`font-display text-sm font-black ${transaction.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {transaction.amount > 0 ? '+' : ''}{formatNumber(transaction.amount)}
                           </span>
                         </div>
                         <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase">
                            <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                            <span>{new Date(transaction.created_at).toLocaleTimeString()}</span>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
              </div>
            </div>
          )}
        </section>
      </aside>

      {/* Ban Dialog Overlay */}
      {banTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <form className="panel w-full max-w-lg p-0 overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.15)]" onSubmit={handleBanSubmit}>
            <div className="border-b border-rose-500/20 bg-rose-500/5 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">
                    <Ban size={14} />
                    Restricted Access
                  </div>
                  <h3 className="font-display text-2xl font-black uppercase tracking-tight text-white">@{banTarget.account_name}</h3>
                </div>
                <button className="text-slate-500 hover:text-white transition-colors" disabled={banLoading} onClick={closeBanDialog} type="button">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Official Ban Mandate</label>
                <textarea
                  autoFocus
                  className="form-input min-h-32 resize-none bg-black/40 border-rose-500/20 focus:border-rose-500/50"
                  maxLength={300}
                  onChange={(event) => setBanReason(event.target.value)}
                  placeholder="State the reason for account restriction..."
                  value={banReason}
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-600 uppercase">
                  <span>Maximum 300 characters permissible</span>
                  <span className={banReason.length > 250 ? 'text-rose-400' : ''}>{banReason.length}/300</span>
                </div>
              </div>

              {banError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-bold text-rose-400 uppercase tracking-tight">
                  <div className="flex items-center gap-2">
                     <AlertCircle size={14} />
                     {banError}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 py-4 text-xs font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-white/10 hover:text-white" 
                  disabled={banLoading} 
                  onClick={closeBanDialog} 
                  type="button"
                >
                  Abort
                </button>
                <button 
                  className="flex-[2] rounded-xl bg-rose-600 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(225,29,72,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30" 
                  disabled={banLoading} 
                  type="submit"
                >
                  {banLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Restriction'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
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
    </div>
  );
}
