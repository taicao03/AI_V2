import { Copy, Eye, LogIn, Users } from 'lucide-react';
import { useState } from 'react';
import type { RRRoomLobbyItem } from '../../types/russianRoulette';

type RoomListProps = {
  rooms: RRRoomLobbyItem[];
  loading: boolean;
  onJoin: (roomId: string, asSpectator?: boolean) => void;
};

export function RoomList({ rooms, loading, onJoin }: RoomListProps) {
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  function copyRoomCode(roomId: string, roomCode: string | null) {
    if (!roomCode) {
      return;
    }
    void navigator.clipboard.writeText(roomCode);
    setCopiedRoomId(roomId);
    window.setTimeout(() => setCopiedRoomId(null), 1200);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'playing':
        return (
          <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]">
            Đang đấu
          </span>
        );
      case 'countdown':
        return (
          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)] animate-pulse">
            Sắp bắt đầu
          </span>
        );
      case 'completed':
        return (
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
            Kết thúc
          </span>
        );
      default:
        return (
          <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-400 border border-cyan-500/20 shadow-[0_0_8px_rgba(34,211,238,0.15)]">
            Đang chờ
          </span>
        );
    }
  };

  const renderSeatDots = (playerCount: number, maxPlayers: number) => {
    return (
      <div className="flex gap-1 items-center" title={`${playerCount}/${maxPlayers} Ghế ngồi`}>
        {Array.from({ length: maxPlayers }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i < playerCount
                ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                : 'bg-slate-800 border border-slate-700'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#070b16]/60 p-4 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md relative overflow-hidden">
      {/* Visual blueprint line decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      <div className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-cyan-300 font-display flex items-center gap-2 relative z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
        Đấu trường hoạt động công khai
      </div>
      
      <div className="space-y-3 relative z-10">
        {rooms.map((room) => (
          <div 
            key={room.room_id} 
            className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.08)] transition-all duration-300 hover:bg-slate-950/70 group"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <div className="text-sm font-extrabold text-white font-display group-hover:text-cyan-300 transition-colors">
                  {room.name}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {getStatusBadge(room.status)}
                  <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Users size={10} />
                    {room.player_count}/{room.max_players} Đấu sĩ
                  </span>
                  {renderSeatDots(room.player_count, room.max_players)}
                  {room.ready_count > 0 && (
                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 border border-emerald-500/20 rounded">
                      {room.ready_count} SẴN SÀNG
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[8px] uppercase tracking-wider text-slate-500 block font-bold">Lệ phí (Buy-in)</span>
                <span className="text-sm font-black text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.25)]">
                  {room.buy_in_amount} xu
                </span>
              </div>
            </div>
            
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="choice-button px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/15 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                onClick={() => onJoin(room.room_id, false)}
                type="button"
              >
                <LogIn size={10} />
                Tham chiến
              </button>
              <button
                className="choice-button px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 border border-white/5 bg-slate-900/40 hover:bg-slate-900/60 hover:text-white"
                onClick={() => onJoin(room.room_id, true)}
                type="button"
              >
                <Eye size={10} />
                Xem đấu
              </button>
              {room.room_code ? (
                <button
                  className={`choice-button px-3.5 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all duration-300 ${
                    copiedRoomId === room.room_id
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-300 hover:bg-fuchsia-500/15 hover:border-fuchsia-400'
                  }`}
                  onClick={() => copyRoomCode(room.room_id, room.room_code)}
                  type="button"
                >
                  <Copy size={10} />
                  Mã: {copiedRoomId === room.room_id ? 'Đã sao chép!' : room.room_code}
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-xs text-slate-500 font-medium">
            {loading ? 'Đang giải mã danh sách phòng đấu...' : 'Không tìm thấy phòng đấu nào đang hoạt động.'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
