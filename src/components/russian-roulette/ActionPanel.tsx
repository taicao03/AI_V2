import { Shield, FastForward, Play, Crosshair, AlertOctagon } from 'lucide-react';
import type { RRPlayer, RRRoomState } from '../../types/russianRoulette';

type ActionPanelProps = {
  roomState: RRRoomState;
  currentPlayer: RRPlayer | null;
  actionLoading: boolean;
  onAction: (action: 'pull_trigger' | 'use_shield' | 'skip_turn') => void;
};

export function ActionPanel({ roomState, currentPlayer, actionLoading, onAction }: ActionPanelProps) {
  const round = roomState.round;
  const isPlaying = roomState.room.status === 'playing' && round?.status === 'playing';
  const isMyTurn = Boolean(currentPlayer && round?.current_player_id === currentPlayer.user_id);
  const disabled = actionLoading || !isPlaying || !isMyTurn || !currentPlayer || currentPlayer.status === 'eliminated';

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5 relative overflow-hidden">
      {/* Visual neon hazard stripes on top for active turn */}
      {isMyTurn && isPlaying && (
        <div className="absolute top-0 inset-x-0 h-1 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_10px,#000_10px,#000_20px)] animate-pulse" />
      )}

      {/* Header telemetry strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300 font-display">
            Bảng Điều Khiển Đấu Sĩ
          </span>
        </div>
        {isMyTurn && isPlaying ? (
          <span className="animate-pulse rounded-md bg-amber-500/10 px-2.5 py-0.5 text-[9px] font-black text-amber-300 border border-amber-500/30 font-display tracking-widest shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            LƯỢT CỦA BẠN!
          </span>
        ) : isPlaying ? (
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-600 animate-ping" />
            Đang đợi lượt...
          </span>
        ) : (
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Trận đấu chưa bắt đầu
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Pull Trigger button (Rút cò) */}
        <button
          className={`choice-button flex flex-col items-center justify-center gap-2 py-5 text-xs font-black uppercase transition-all duration-300 border relative overflow-hidden group min-h-[90px] ${
            disabled 
              ? 'opacity-30 cursor-not-allowed border-white/5 bg-slate-950/40 text-slate-600' 
              : 'border-rose-500/40 bg-gradient-to-br from-rose-950 via-rose-700 to-red-950 hover:from-rose-900 hover:via-rose-600 hover:to-red-900 text-rose-100 hover:text-white shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:shadow-[0_0_35px_rgba(239,68,68,0.45)] hover:-translate-y-0.5 active:scale-95 animate-cyber-pulse'
          }`}
          disabled={disabled}
          onClick={() => onAction('pull_trigger')}
          type="button"
        >
          {/* Subtle weapon crosshair decoration inside button */}
          {!disabled && (
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_center,_#fff_10%,_transparent_100%)] group-hover:scale-125 transition-transform duration-500" />
          )}
          <Crosshair size={18} className={`text-rose-300 group-hover:rotate-90 group-hover:scale-110 transition-all duration-500 ${isMyTurn ? 'animate-pulse' : ''}`} />
          <span className="tracking-widest font-display text-[10px]">KHAI HỎA (KÉO CÒ)</span>
        </button>

        {/* Use Shield button (Lá chắn) */}
        <button
          className={`choice-button flex flex-col items-center justify-center gap-2 py-5 text-xs font-black uppercase transition-all duration-300 border group min-h-[90px] ${
            disabled || !currentPlayer?.has_shield || !roomState.room.enable_items
              ? 'opacity-30 cursor-not-allowed border-white/5 bg-slate-950/40 text-slate-600'
              : 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/80 via-emerald-800/40 to-slate-950 text-emerald-200 hover:text-white hover:border-emerald-400 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 active:scale-95'
          }`}
          disabled={disabled || !currentPlayer?.has_shield || !roomState.room.enable_items}
          onClick={() => onAction('use_shield')}
          type="button"
        >
          <Shield size={18} className="text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
          <span className="tracking-widest font-display text-[10px]">KÍCH HOẠT KHIÊN</span>
        </button>

        {/* Skip Turn button (Bỏ lượt) */}
        <button
          className={`choice-button flex flex-col items-center justify-center gap-2 py-5 text-xs font-black uppercase transition-all duration-300 border group min-h-[90px] ${
            disabled || !currentPlayer?.has_skip || !roomState.room.enable_items
              ? 'opacity-30 cursor-not-allowed border-white/5 bg-slate-950/40 text-slate-600'
              : 'border-amber-500/40 bg-gradient-to-br from-amber-950/80 via-amber-800/40 to-slate-950 text-amber-200 hover:text-white hover:border-amber-400 hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 active:scale-95'
          }`}
          disabled={disabled || !currentPlayer?.has_skip || !roomState.room.enable_items}
          onClick={() => onAction('skip_turn')}
          type="button"
        >
          <FastForward size={18} className="text-amber-400 group-hover:translate-x-0.5 transition-transform duration-300" />
          <span className="tracking-widest font-display text-[10px]">BỎ QUA LƯỢT</span>
        </button>
      </div>

      {!isMyTurn && isPlaying && (
        <div className="flex items-center gap-2 justify-center rounded-xl bg-slate-950/40 border border-white/5 py-2 px-3 text-[10px] text-slate-400">
          <AlertOctagon size={11} className="text-slate-500 animate-pulse" />
          Vui lòng chờ đấu sĩ đối diện hoàn thành lượt kéo cò súng...
        </div>
      )}
    </div>
  );
}
