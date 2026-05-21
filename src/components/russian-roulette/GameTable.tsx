import { useMemo } from 'react';
import { ActionPanel } from './ActionPanel';
import { GameLog } from './GameLog';
import { PlayerSeat } from './PlayerSeat';
import { RRChatBox } from './RRChatBox';
import { TurnTimer } from './TurnTimer';
import { RevolverCylinder } from './RevolverCylinder';
import { formatNumber } from '../../lib/formatHelpers';
import { 
  CustomizableLayoutContainer, 
  CustomizableWidget, 
  PresetLayout 
} from '../layout/CustomizableLayoutContainer';
import type { RRPlayer, RRRoomState } from '../../types/russianRoulette';

type GameTableProps = {
  roomState: RRRoomState;
  currentPlayer: RRPlayer | null;
  actionLoading: boolean;
  onLeave: () => void;
  onReadyToggle: (isReady: boolean) => void;
  onAction: (action: 'pull_trigger' | 'use_shield' | 'skip_turn') => void;
  onSendChat: (text: string) => Promise<boolean>;
};

// Define Customizable Layout presets for Game Board
const gameLayoutPresets: Record<string, PresetLayout> = {
  standard: {
    name: "Mặc định (Lưới)",
    description: "Bố cục cân đối chia đều các cột",
    settings: {
      room_header: { size: 'lg', visible: true, order: 0 },
      turn_timer: { size: 'sm', visible: true, order: 1 },
      revolver_cylinder: { size: 'sm', visible: true, order: 2 },
      player_seats: { size: 'lg', visible: true, order: 3 },
      game_log: { size: 'sm', visible: true, order: 4 },
      action_panel: { size: 'lg', visible: true, order: 5 },
      chat_box: { size: 'sm', visible: true, order: 6 },
      spectator_list: { size: 'xl', visible: true, order: 7 },
    }
  },
  chat_centric: {
    name: "Tập trung Chat & Log",
    description: "Cửa sổ trò chuyện và diễn biến hiển thị lớn hơn",
    settings: {
      room_header: { size: 'xl', visible: true, order: 0 },
      turn_timer: { size: 'sm', visible: true, order: 1 },
      revolver_cylinder: { size: 'sm', visible: true, order: 2 },
      player_seats: { size: 'md', visible: true, order: 3 },
      chat_box: { size: 'md', visible: true, order: 4 },
      action_panel: { size: 'lg', visible: true, order: 5 },
      game_log: { size: 'sm', visible: true, order: 6 },
      spectator_list: { size: 'xl', visible: true, order: 7 },
    }
  },
  action_focus: {
    name: "Tối giản (Bàn đấu)",
    description: "Ẩn chat và log, tập trung tối đa vào kéo cò & hồi hộp",
    settings: {
      room_header: { size: 'lg', visible: true, order: 0 },
      turn_timer: { size: 'sm', visible: true, order: 1 },
      revolver_cylinder: { size: 'sm', visible: true, order: 2 },
      player_seats: { size: 'xl', visible: true, order: 3 },
      action_panel: { size: 'xl', visible: true, order: 4 },
      game_log: { size: 'md', visible: false, order: 5 },
      chat_box: { size: 'md', visible: false, order: 6 },
      spectator_list: { size: 'xl', visible: false, order: 7 },
    }
  }
};

export function GameTable({
  roomState,
  currentPlayer,
  actionLoading,
  onLeave,
  onReadyToggle,
  onAction,
  onSendChat,
}: GameTableProps) {
  const round = roomState.round;
  const room = roomState.room;
  const players = roomState.players.filter((player) => !player.left_at);
  const seatedPlayers = players.filter((player) => player.status !== 'spectator');
  const spectators = players.filter((player) => player.status === 'spectator');
  const playerNameById = useMemo(
    () => new Map(players.map((player) => [player.user_id, player.display_name])),
    [players],
  );
  const isReady = Boolean(currentPlayer?.is_ready);
  const timerTargetAt =
    room.status === 'playing'
      ? (round?.turn_ends_at ?? null)
      : room.status === 'countdown' || room.status === 'completed'
        ? room.countdown_ends_at
        : null;
  const timerLabel =
    room.status === 'countdown'
      ? 'Bắt đầu sau'
      : room.status === 'completed'
        ? 'Lượt tiếp theo'
        : room.status === 'playing'
          ? 'Thời gian chờ'
          : 'Chờ người chơi';
  const timerDuration = room.status === 'countdown' ? 8 : 15;

  // Build the list of customizable widgets
  const widgets: CustomizableWidget[] = [
    {
      id: 'room_header',
      title: 'Thông Tin & Trạng Thái',
      description: 'Hiển thị tên phòng, buy-in, và các nút thao tác nhanh Sẵn sàng/Rời phòng',
      defaultSize: 'lg',
      render: () => (
        <div className="rounded-3xl border border-cyan-500/20 bg-[#060a14]/80 p-4 sm:p-6 h-full flex flex-col justify-between gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black text-white tracking-wide">{roomState.room.name}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400 font-bold mt-0.5">
                {roomState.room.status} · pot {formatNumber(round?.pot_amount ?? 0)} · buy-in {formatNumber(roomState.room.buy_in_amount)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className={`choice-button px-3.5 py-1.5 text-xs font-bold uppercase transition-all duration-200 ${
                  isReady 
                    ? 'text-rose-300 border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
                    : 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                }`}
                onClick={() => onReadyToggle(!isReady)}
                type="button"
              >
                {isReady ? 'Hủy Sẵn Sàng' : 'Sẵn Sàng'}
              </button>
              <button 
                className="choice-button px-3.5 py-1.5 text-xs font-bold uppercase text-slate-300 hover:text-white transition-all duration-200" 
                onClick={onLeave} 
                type="button"
              >
                Rời Phòng
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'turn_timer',
      title: 'Đồng Hồ Thời Gian',
      description: 'Theo dõi đếm ngược thời gian chờ lượt đi hoặc đếm ngược bắt đầu ván',
      defaultSize: 'sm',
      render: () => (
        <div className="rounded-3xl border border-cyan-500/20 bg-[#060a14]/80 p-4 sm:p-6 h-full flex flex-col justify-center shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <TurnTimer label={timerLabel} targetAt={timerTargetAt} totalSeconds={timerDuration} />
        </div>
      )
    },
    {
      id: 'revolver_cylinder',
      title: 'Ổ Đạn Ổ Xoay',
      description: 'Mô phỏng ổ đạn 6 viên quay, hiển thị tỉ lệ nổ đạn thực tế',
      defaultSize: 'sm',
      render: () => (
        <RevolverCylinder round={round} status={room.status} />
      )
    },
    {
      id: 'player_seats',
      title: 'Bàn Đấu Sĩ',
      description: 'Lưới hiển thị vị trí ghế ngồi, điểm số và mạng sống của các đấu sĩ',
      defaultSize: 'lg',
      render: () => (
        <div className="rounded-3xl border border-white/10 bg-[#070b16]/60 p-4 sm:p-6 h-full shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">Đấu Sĩ Tham Chiến</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {seatedPlayers.map((player) => (
              <PlayerSeat
                key={`${player.room_id}:${player.user_id}`}
                isCurrentTurn={round?.current_player_id === player.user_id}
                isMe={player.user_id === currentPlayer?.user_id}
                player={player}
              />
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'game_log',
      title: 'Nhật Ký Trận Đấu',
      description: 'Hiển thị chi tiết từng phát bắn, lá chắn được kích hoạt hay lượt bỏ qua',
      defaultSize: 'sm',
      render: () => (
        <div className="rounded-3xl border border-white/10 bg-[#070b16]/60 p-4 sm:p-5 h-full flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-purple-400">Diễn Biến Trận Đấu</h3>
          <div className="flex-1 overflow-hidden">
            <GameLog actions={roomState.actions} playerNameById={playerNameById} />
          </div>
        </div>
      )
    },
    {
      id: 'action_panel',
      title: 'Hành Động Đấu Sĩ',
      description: 'Bảng nút bấm rút cò súng, kích hoạt khiên chắn và bỏ qua lượt bắn',
      defaultSize: 'lg',
      render: () => (
        <ActionPanel
          actionLoading={actionLoading}
          currentPlayer={currentPlayer}
          onAction={onAction}
          roomState={roomState}
        />
      )
    },
    {
      id: 'chat_box',
      title: 'Hòm Trò Chuyện',
      description: 'Kênh giao lưu chém gió và trao đổi chiến thuật trực tiếp trong bàn chơi',
      defaultSize: 'sm',
      render: () => (
        <div className="rounded-3xl border border-white/10 bg-[#070b16]/60 p-4 sm:p-5 h-full flex flex-col shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 font-bold">Kênh Trò Chuyện</h3>
          <div className="flex-1 overflow-hidden">
            <RRChatBox
              disabled={currentPlayer?.status === 'spectator' && !roomState.room.allow_spectator_chat}
              messages={roomState.chat}
              onSend={onSendChat}
            />
          </div>
        </div>
      )
    },
    {
      id: 'spectator_list',
      title: 'Khán Giả Theo Dõi',
      description: 'Danh sách những người chơi khác đang quan sát và cổ vũ',
      defaultSize: 'xl',
      render: () => {
        if (spectators.length === 0) return null;
        return (
          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-md">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
              Khán giả cổ vũ ({spectators.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {spectators.map((player) => (
                <span 
                  key={player.user_id} 
                  className="rounded-lg border border-white/5 bg-slate-900/60 px-2 py-0.5 text-xs text-slate-400"
                >
                  👁️ {player.display_name}
                </span>
              ))}
            </div>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <CustomizableLayoutContainer
        layoutKey="russian_roulette_game_layout"
        widgets={widgets}
        presets={gameLayoutPresets}
        title="Tùy Chỉnh Bàn Chơi"
      />
    </div>
  );
}

