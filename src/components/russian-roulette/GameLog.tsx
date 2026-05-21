import { Terminal, Shield, FastForward, Play, HelpCircle, HeartCrack, Award } from 'lucide-react';
import type { RRAction } from '../../types/russianRoulette';

type GameLogProps = {
  actions: RRAction[];
  playerNameById: Map<string, string>;
};

export function GameLog({ actions, playerNameById }: GameLogProps) {
  // Helpers for colorful action items and icons
  const getActionDetails = (actionType: string, result: string | null) => {
    switch (actionType) {
      case 'pull_trigger':
        if (result === 'danger') {
          return {
            colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
            icon: <HeartCrack size={11} className="text-rose-400 animate-pulse" />,
            textViet: 'rút cò nổ đạn!'
          };
        }

        return {
          colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          icon: <Play size={11} className="text-emerald-400 rotate-90" />,
          textViet: 'rút cò an toàn!'
        };
      case 'use_shield':
        return {
          colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          icon: <Shield size={11} className="text-cyan-400" />,
          textViet: 'đã kích hoạt lá chắn bảo vệ!'
        };
      case 'skip_turn':
        return {
          colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          icon: <FastForward size={11} className="text-amber-400" />,
          textViet: 'đã sử dụng thẻ bỏ qua lượt!'
        };
      case 'winner':
        return {
          colorClass: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)] font-black uppercase',
          icon: <Award size={11} className="text-yellow-400 animate-bounce" />,
          textViet: 'Trở thành Người Chiến Thắng!'
        };
      case 'eliminated':
        return {
          colorClass: 'text-rose-500 bg-black/40 border-rose-950/40 text-slate-500',
          icon: <Skull size={11} className="text-rose-500" />,
          textViet: 'đã bị loại khỏi bàn chơi!'
        };
      default:
        return {
          colorClass: 'text-slate-300 bg-white/5 border-white/5',
          icon: <HelpCircle size={11} className="text-slate-400" />,
          textViet: actionType.replaceAll('_', ' ')
        };
    }
  };

  return (
    <div className="flex flex-col h-full justify-between gap-3">
      {/* Scrollable hacker terminal logs list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5 max-h-[220px]">
        {actions.slice(-30).map((action) => {
          const name = playerNameById.get(action.user_id) ?? action.user_id.slice(0, 6);
          const details = getActionDetails(action.action_type, action.result);
          
          return (
            <div 
              key={action.action_id} 
              className={`rounded-xl border p-2.5 text-[11px] font-medium flex items-start gap-2.5 transition-all duration-200 hover:-translate-y-0.5 ${details.colorClass}`}
            >
              <div className="mt-0.5 flex-shrink-0">{details.icon}</div>
              <div className="min-w-0 flex-1 leading-relaxed">
                <span className="font-extrabold text-white font-display">{name}</span>{' '}
                <span className="font-semibold text-slate-300">{details.textViet}</span>
                {action.result && action.result !== 'safe' && action.result !== 'danger' && (
                  <span className="ml-1.5 px-1 py-0.5 rounded bg-black/45 text-[8px] font-black uppercase tracking-wider text-slate-400 border border-white/5">
                    [{action.result}]
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {actions.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-10 font-medium">
            Chưa có hành động nào được ghi nhận. Ván đấu đang chờ bắt đầu!
          </div>
        ) : null}
      </div>
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
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/>
      <path d="M9 16c.5-1.5 2-2.5 3-2.5s2.5 1 3 2.5"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/>
      <line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  );
}


