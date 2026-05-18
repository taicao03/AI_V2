import { ChatBox } from '../components/ChatBox';
import { OnlineUsers } from '../components/OnlineUsers';
import type { OnlineUser, UserProfile } from '../types';

type ChatPageProps = {
  auth: {
    actionLoading: boolean;
    error: string | null;
    loading: boolean;
    sessionToken: string | null;
    signIn: (accountName: string, password: string) => Promise<boolean>;
    signUp: (displayName: string, accountName: string, password: string) => Promise<boolean>;
  };
  presenceStatus: string;
  profile: UserProfile | null;
  users: OnlineUser[];
};

export function ChatPage({ auth, presenceStatus, profile, users }: ChatPageProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <ChatBox profile={profile} sessionToken={auth.sessionToken} />
      <div className="space-y-5">
        {!profile && (
          <section className="panel p-5 text-sm text-slate-400">
            Dang nhap bang nut tren header de chat realtime.
          </section>
        )}
        <OnlineUsers status={presenceStatus} users={users} />
      </div>
    </div>
  );
}
