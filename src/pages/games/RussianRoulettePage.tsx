import { useMemo, useState } from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { CreateRoomModal } from '../../components/russian-roulette/CreateRoomModal';
import { GameTable } from '../../components/russian-roulette/GameTable';
import { RoomList } from '../../components/russian-roulette/RoomList';
import { useRussianRouletteRoom } from '../../hooks/useRussianRouletteRoom';
import type { UserProfile } from '../../types';

type RussianRoulettePageProps = {
  profile: UserProfile | null;
  sessionToken: string | null;
  onSignInClick: () => void;
};

export function RussianRoulettePage({ profile, sessionToken, onSignInClick }: RussianRoulettePageProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const {
    lobby,
    roomState,
    currentPlayer,
    loading,
    actionLoading,
    error,
    info,
    createRoom,
    joinRoomById,
    joinRoomByCode,
    leaveRoom,
    setReady,
    performAction,
    sendChatMessage,
    refreshLobby,
  } = useRussianRouletteRoom({
    sessionToken,
    userId: profile?.uid ?? null,
  });

  const sortedLobby = useMemo(
    () =>
      [...lobby].sort((a, b) => {
        if (a.status !== b.status) {
          return a.status.localeCompare(b.status);
        }
        return b.player_count - a.player_count;
      }),
    [lobby],
  );

  const showAuthHint = !profile || !sessionToken;

  async function handleJoinByCode(asSpectator: boolean) {
    if (!sessionToken) {
      onSignInClick();
      return;
    }
    if (!roomCode.trim()) {
      return;
    }
    await joinRoomByCode(roomCode.trim(), asSpectator);
  }

  async function handleJoinRoom(roomId: string, asSpectator?: boolean) {
    if (!sessionToken) {
      onSignInClick();
      return;
    }
    await joinRoomById(roomId, asSpectator ?? false);
  }

  return (
    <div className="space-y-6">
      <CreateRoomModal
        isOpen={createModalOpen}
        loading={loading}
        onClose={() => setCreateModalOpen(false)}
        onCreate={createRoom}
      />

      <section className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#060a15] via-[#0a1020] to-[#070b19] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">
        {/* Blueprint line decorations */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-400 font-black font-display">MÔ PHỎNG ĐIỆN TỬ</div>
            <h2 className="text-xl font-black text-white sm:text-3xl tracking-wide font-display drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
              Russian Roulette Đấu Trường
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Chế độ điểm ảo thử nghiệm. Giao diện Ổ Xoay Bí Ẩn. Trò chơi ảo không cổ súy hành vi nguy hiểm thực tế.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="choice-button px-4 py-2.5 text-xs font-black uppercase tracking-wider text-cyan-300 border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)] bg-cyan-500/5 hover:bg-cyan-500/10 flex items-center gap-1.5 transition-all duration-300"
              onClick={() => void refreshLobby()}
              type="button"
            >
              <RefreshCw size={12} className="animate-spin-slow" />
              Làm mới
            </button>
            <button
              className="choice-button px-4 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-300 border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-emerald-500/5 hover:bg-emerald-500/10 flex items-center gap-1.5 transition-all duration-300"
              onClick={() => (showAuthHint ? onSignInClick() : setCreateModalOpen(true))}
              type="button"
            >
              <PlusCircle size={12} />
              Tạo phòng đấu
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 font-medium">{error}</div>
      ) : null}
      {info ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 font-medium">{info}</div>
      ) : null}

      {!roomState ? (
        <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <RoomList loading={loading} onJoin={handleJoinRoom} rooms={sortedLobby} />
          <div className="rounded-3xl border border-white/10 bg-[#070b16]/60 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md h-full flex flex-col justify-between gap-4">
            <div>
              <div className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-cyan-300 font-display flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Vào phòng riêng tư
              </div>
              <div className="space-y-3">
                <input
                  className="form-input w-full text-xs uppercase bg-slate-950/60 border-white/10 text-white rounded-xl focus:border-cyan-500/50 font-bold placeholder:text-slate-600 tracking-wider text-center"
                  onChange={(event) => setRoomCode(event.target.value)}
                  placeholder="Nhập mã phòng chơi..."
                  value={roomCode}
                />
                <div className="flex gap-2">
                  <button
                    className="choice-button flex-1 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-cyan-300 border border-cyan-500/20 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                    onClick={() => void handleJoinByCode(false)}
                    type="button"
                  >
                    Tham chiến
                  </button>
                  <button
                    className="choice-button flex-1 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-400 border border-white/5 bg-slate-900/40 hover:bg-slate-900/60 hover:text-white"
                    onClick={() => void handleJoinByCode(true)}
                    type="button"
                  >
                    Xem đấu sĩ
                  </button>
                </div>
                {showAuthHint ? (
                  <button
                    className="choice-button mt-3 w-full px-3 py-2.5 text-xs font-black uppercase tracking-wider text-amber-300 border border-amber-500/20 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/15"
                    onClick={onSignInClick}
                    type="button"
                  >
                    Đăng nhập để chơi game
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <GameTable
          actionLoading={actionLoading}
          currentPlayer={currentPlayer}
          onAction={(action) => void performAction({ roomId: roomState.room.room_id, action })}
          onLeave={() => void leaveRoom()}
          onReadyToggle={(isReady) => void setReady(isReady)}
          onSendChat={sendChatMessage}
          roomState={roomState}
        />
      )}
    </div>
  );
}

