import { AlertTriangle, Zap, Trophy, MessageSquare, Activity, LogIn } from 'lucide-react';
import { ChatBox } from '../components/ChatBox';
import { Leaderboard } from '../components/Leaderboard';
import { OnlineUsers } from '../components/OnlineUsers';
import { PredictionPanel, type RollFeedback } from '../components/PredictionPanel';
import { ProfileCard } from '../components/ProfileCard';
import { RoundTimer } from '../components/RoundTimer';
import type { DiceRound, DiceRoundBetTotals, LeaderboardUser, OnlineUser, Prediction, ProfileStats, UserProfile } from '../types';
import { DiceDisplay } from '../components/DiceDisplay';

type AuthActions = {
  actionLoading: boolean;
  error: string | null;
  loading: boolean;
  sessionToken: string | null;
  signIn: (accountName: string, password: string) => Promise<boolean>;
  signUp: (displayName: string, accountName: string, password: string) => Promise<boolean>;
};

type HomePageProps = {
  actionError: string | null;
  availablePoints: number;
  auth: AuthActions;
  betAmount: number;
  claimLoading: boolean;
  currentRound: DiceRound | null;
  currentRoundBetTotals: DiceRoundBetTotals;
  displayError: string | null;
  feedback: RollFeedback | null;
  isAuthenticated: boolean;
  isBettingDisabled: boolean;
  leaderboardLoading: boolean;
  leaders: LeaderboardUser[];
  onBetAmountChange: (value: number) => void;
  onClaimDemoPoints: () => void;
  onPredictionChange: (prediction: Prediction) => void;
  onRoll: () => void;
  onSignInClick: () => void;
  prediction: Prediction;
  profile: UserProfile | null;
  profileStats: ProfileStats;
  profileStatsLoading: boolean;
  rolling: boolean;
  secondsLeft: number;
  settling: boolean;
  users: OnlineUser[];
  presenceStatus: string;
};

export function HomePage({
  availablePoints,
  auth,
  betAmount,
  claimLoading,
  currentRound,
  currentRoundBetTotals,
  displayError,
  feedback,
  isAuthenticated,
  isBettingDisabled,
  leaderboardLoading,
  leaders,
  onBetAmountChange,
  onClaimDemoPoints,
  onPredictionChange,
  onRoll,
  onSignInClick,
  prediction,
  profile,
  profileStats,
  profileStatsLoading,
  rolling,
  secondsLeft,
  settling,
  users,
  presenceStatus,
}: HomePageProps) {
  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Top Telemetry Bar - Responsive Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
         <TelemetryCard 
           icon={<Zap size={14} className="text-cyan-400" />} 
           label="System status" 
           value="OPERATIONAL" 
           subValue="99.9% Uptime"
         />
         <TelemetryCard 
           icon={<Trophy size={14} className="text-purple-400" />} 
           label="Global wins" 
           value="12.4M PTS" 
           subValue="Last 24h"
         />
         <TelemetryCard 
           icon={<Activity size={14} className="text-emerald-400" />} 
           label="Active sessions" 
           value={users.length.toString()} 
           subValue={presenceStatus}
         />
         <TelemetryCard 
           icon={<MessageSquare size={14} className="text-blue-400" />} 
           label="Network load" 
           value="LOW" 
           subValue="12ms latency"
         />
      </div>

      {/* Error Display */}
      {displayError && (
        <section className="animate-in fade-in slide-in-from-top-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-6 py-4 text-xs font-medium text-rose-200 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
            {displayError}
          </div>
        </section>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr_320px] 2xl:grid-cols-[380px_1fr_380px]">
        
        {/* Left Wing: Intelligence & Stats (Hidden or bottom on Mobile, Sidebar on Desktop) */}
        <aside className="order-3 space-y-8 lg:order-1 xl:block">
          <ProfileCard
            claimLoading={claimLoading}
            loading={profileStatsLoading}
            onClaimDemoPoints={onClaimDemoPoints}
            profile={profile}
            stats={profileStats}
          />
          <div className="hidden lg:block">
            <Leaderboard leaders={leaders} loading={leaderboardLoading} />
          </div>
        </aside>

        {/* Center Wing: THE ARENA */}
        <div className="order-1 flex flex-col gap-6 sm:gap-10 lg:order-2">
          <div className="space-y-8 sm:space-y-12">
            <RoundTimer
              currentRound={currentRound}
              currentRoundBetTotals={currentRoundBetTotals}
              secondsLeft={secondsLeft}
              settling={settling}
            />
            <DiceDisplay 
              dice={currentRound?.dice ?? [1, 2, 3]} 
              rolling={settling} 
              outcome={currentRound?.result_type ?? 'tai'} 
            />
            <div className="relative">
              {/* Login Call to Action if not authenticated */}
              {!isAuthenticated && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[3rem] bg-[#020617]/40 backdrop-blur-[2px] transition-all group-hover:backdrop-blur-sm">
                   <button 
                     onClick={onSignInClick}
                     className="group flex items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-black shadow-[0_20px_50px_rgba(255,255,255,0.15)] transition-all hover:scale-105 active:scale-95"
                   >
                      <LogIn size={18} />
                      Enter the Arena
                   </button>
                </div>
              )}

              <PredictionPanel
                availablePoints={availablePoints}
                betAmount={betAmount}
                disabled={isBettingDisabled}
                feedback={feedback}
                isAuthenticated={isAuthenticated}
                onBetAmountChange={onBetAmountChange}
                onPredictionChange={onPredictionChange}
                onRoll={onRoll}
                prediction={prediction}
                rolling={rolling}
              />
            </div>
          </div>

          {/* Leaderboard on Mobile (Visible only on small screens) */}
          <div className="block lg:hidden order-last">
             <Leaderboard leaders={leaders} loading={leaderboardLoading} />
          </div>

          {/* Footer Disclaimer */}
          <section className="flex items-center justify-center gap-4 py-4 opacity-30">
            <AlertTriangle size={12} className="text-amber-500" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">
              Protocol: Simulation Only • Results Randomized
            </p>
          </section>
        </div>

        {/* Right Wing: Communication Hub */}
        <aside className="order-2 space-y-6 lg:order-3 xl:block">
          <div className="panel overflow-hidden p-0 h-[600px] lg:h-[calc(100vh-480px)] xl:h-[calc(100vh-420px)] min-h-[600px] flex flex-col">
             <div className="border-b border-white/5 px-6 py-4 bg-white/5 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-tight">
                  <MessageSquare size={14} className="text-cyan-400" />
                  Live Comms
                </h3>
                <OnlineUsers status={presenceStatus} users={users} />
             </div>
             <div className="flex-1 min-h-0">
                <ChatBox profile={profile} sessionToken={auth.sessionToken} />
             </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

function TelemetryCard({ icon, label, value, subValue }: { icon: React.ReactNode, label: string, value: string, subValue: string }) {
  return (
    <div className="panel p-3 sm:p-5 group">
       <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover:border-cyan-400/30 group-hover:bg-cyan-400/5 transition-all">
             {icon}
          </div>
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 truncate">{label}</span>
       </div>
       <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <span className="text-sm sm:text-xl font-display font-black text-white">{value}</span>
          <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase truncate">{subValue}</span>
       </div>
    </div>
  );
}
