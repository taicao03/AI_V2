import { Crown, Shield, FastForward, Eye, Target } from 'lucide-react';
import type { RRPlayer } from '../../types/russianRoulette';

type PlayerSeatProps = {
  player: RRPlayer;
  isCurrentTurn: boolean;
  isMe: boolean;
};

export function PlayerSeat({ player, isCurrentTurn, isMe }: PlayerSeatProps) {
  const isWinner = player.status === 'winner';
  const isEliminated = player.status === 'eliminated';
  const isSpectator = player.status === 'spectator';

  // Cyber styling classes based on player status
  const cardBorderClass = isCurrentTurn
    ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_25px_rgba(34,211,238,0.3)]'
    : isWinner
      ? 'border-amber-400/40 bg-amber-950/15 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
      : isEliminated
        ? 'border-rose-900/40 bg-[#1a080c]/80 opacity-55 shadow-[inset_0_0_12px_rgba(244,63,94,0.1)]'
        : 'border-white/5 bg-[#0a0f1d]/75 hover:border-cyan-500/10 hover:bg-[#0c1224]';

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-full ${cardBorderClass} ${isCurrentTurn ? 'animate-laser-scanner animate-border-pulse' : ''}`}
    >
      {/* Visual neon subtle stripe on top for active turn */}
      {isCurrentTurn && (
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 animate-shimmer" />
      )}

      {/* Eliminated cracked visual overlay */}
      {isEliminated && (
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_#f43f5e_100%)]" />
      )}

      {/* Header section */}
      <div className="flex items-start justify-between gap-2 relative z-10">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {isCurrentTurn && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
            )}
            <h4 className="text-xs font-black text-white truncate flex items-center gap-1.5">
              <span className={isEliminated ? 'line-through text-slate-500' : 'text-white'}>
                {player.display_name}
              </span>
              {isMe && (
                <span className="text-[8px] font-black text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 border border-cyan-500/30 rounded tracking-widest shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                  BẢN THÂN
                </span>
              )}
            </h4>
          </div>
          <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500 block mt-0.5">
            Ghế {player.seat_index !== null ? player.seat_index + 1 : '-'}
          </span>
        </div>

        {/* Status chip */}
        <span
          className={`rounded-lg border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm ${
            isWinner
              ? 'bg-amber-500/15 text-amber-300 border-amber-400/40'
              : isEliminated
                ? 'bg-rose-950/20 text-rose-400 border-rose-900/40'
                : isSpectator
                  ? 'bg-slate-500/10 text-slate-400 border-slate-400/20'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30'
          }`}
        >
          {isWinner ? (
            <Crown size={10} className="text-amber-400 animate-bounce" />
          ) : isEliminated ? (
            <Skull size={10} className="text-rose-500" />
          ) : isSpectator ? (
            <Eye size={10} className="text-slate-400" />
          ) : (
            <Target size={10} className="text-cyan-400 animate-spin-slow" />
          )}
          {player.status === 'playing' ? 'Đấu sĩ' : player.status === 'joined' ? 'Đã vào' : player.status === 'eliminated' ? 'Tử trận' : player.status === 'winner' ? 'Vô địch' : player.status}
        </span>
      </div>

      {/* Cyber metric pills */}
      <div className="mt-3.5 grid grid-cols-2 gap-1.5 text-[9px] font-bold text-slate-400 relative z-10">
        <div className="rounded-lg bg-black/40 border border-white/5 px-2 py-1 flex flex-col">
          <span className="text-[7px] uppercase tracking-widest text-slate-500 font-extrabold">Đăng ký (Buy-in)</span>
          <strong className="text-white mt-0.5 text-[11px] truncate font-display">{player.buy_in_amount} xu</strong>
        </div>
        <div className="rounded-lg bg-black/40 border border-white/5 px-2 py-1 flex flex-col">
          <span className="text-[7px] uppercase tracking-widest text-slate-500 font-extrabold">Điểm đã khóa</span>
          <strong className="text-amber-400 mt-0.5 text-[11px] truncate font-display">{player.locked_points} xu</strong>
        </div>
      </div>

      {/* Items indicators footer */}
      {player.status !== 'spectator' && (
        <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-white/5 relative z-10">
          <div className="flex gap-2 w-full">
            {/* Shield Indicator */}
            <div 
              className={`flex-1 rounded-lg px-2 py-1 flex items-center justify-center gap-1 border transition-all duration-200 ${
                player.has_shield 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[inset_0_0_4px_rgba(16,185,129,0.1),0_0_8px_rgba(16,185,129,0.15)]' 
                  : 'bg-slate-950/20 border-white/5 text-slate-700'
              }`}
            >
              <Shield size={9} className={player.has_shield ? 'animate-pulse' : ''} />
              <span className="text-[8px] uppercase tracking-widest font-extrabold">Khiên</span>
            </div>

            {/* Skip Indicator */}
            <div 
              className={`flex-1 rounded-lg px-2 py-1 flex items-center justify-center gap-1 border transition-all duration-200 ${
                player.has_skip 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[inset_0_0_4px_rgba(245,158,11,0.1),0_0_8px_rgba(245,158,11,0.15)]' 
                  : 'bg-slate-950/20 border-white/5 text-slate-700'
              }`}
            >
              <FastForward size={9} />
              <span className="text-[8px] uppercase tracking-widest font-extrabold">Bỏ lượt</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Skull component placeholder in case not imported
function Skull({ size, className }: { size: number; className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M9 10h.01"/>
      <path d="M15 10h.01"/>
      <path d="M12 2a8 8 0 0 0-8 8v1a4 4 0 0 0 3 3.87v3.13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.13A4 4 0 0 0 20 11v-1a8 8 0 0 0-8-8z"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  );
}
