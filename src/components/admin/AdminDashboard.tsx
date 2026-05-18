import { useState } from 'react';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import type { UserProfile } from '../../types';
import { AdminChatPage } from './AdminChatPage';
import { AdminLayout } from './AdminLayout';
import { AdminPokerPage } from './AdminPokerPage';
import { AdminRoundsPage } from './AdminRoundsPage';
import { AdminStatsPage } from './AdminStatsPage';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminNotificationsPage } from './AdminNotificationsPage';

type AdminDashboardProps = {
  profile: UserProfile | null;
  sessionToken: string | null;
  onBack: () => void;
};

export function AdminDashboard({ profile, sessionToken, onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('stats');
  const { leaders } = useLeaderboard();

  return (
    <AdminLayout activeTab={activeTab} onBack={onBack} onTabChange={setActiveTab} profile={profile}>
      {activeTab === 'users' ? (
        <AdminUsersPage sessionToken={sessionToken} />
      ) : activeTab === 'poker' ? (
        <AdminPokerPage sessionToken={sessionToken} />
      ) : activeTab === 'rounds' ? (
        <AdminRoundsPage sessionToken={sessionToken} />
      ) : activeTab === 'chat' ? (
        <AdminChatPage profile={profile} sessionToken={sessionToken} />
      ) : activeTab === 'notifications' ? (
        <AdminNotificationsPage sessionToken={sessionToken} />
      ) : (
        <AdminStatsPage leaders={leaders} sessionToken={sessionToken} />
      )}
    </AdminLayout>
  );
}
