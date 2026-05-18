import { ChatBox } from '../ChatBox';
import type { UserProfile } from '../../types';

type AdminChatPageProps = {
  profile: UserProfile | null;
  sessionToken: string | null;
};

export function AdminChatPage({ profile, sessionToken }: AdminChatPageProps) {
  return <ChatBox profile={profile} sessionToken={sessionToken} />;
}
