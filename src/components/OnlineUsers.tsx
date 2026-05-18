import { Loader2, Users } from 'lucide-react';
import type { OnlineUser } from '../types';

type OnlineUsersProps = {
  users: OnlineUser[];
  status: string;
};

export function OnlineUsers({ users, status }: OnlineUsersProps) {
  const connected = status === 'SUBSCRIBED';

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
         {users.slice(0, 3).map((user) => (
            <div key={user.uid} className="h-6 w-6 rounded-full border-2 border-[#020617] bg-white/5 overflow-hidden">
               {user.avatarUrl ? (
                  <img src={user.avatarUrl} className="h-full w-full object-cover" />
               ) : (
                  <div className="h-full w-full" style={{ backgroundColor: user.color }} />
               )}
            </div>
         ))}
         {users.length > 3 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#020617] bg-white/10 text-[8px] font-black text-slate-400">
               +{users.length - 3}
            </div>
         )}
      </div>
      
      <div className="flex items-center gap-2">
         <div className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]' : 'bg-slate-700'}`} />
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {users.length} Active
         </span>
      </div>
    </div>
  );
}
