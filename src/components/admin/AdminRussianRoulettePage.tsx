import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, RefreshCw, Shield } from 'lucide-react';
import { russianRouletteService } from '../../services/russianRouletteService';
import { 
  CustomizableLayoutContainer, 
  CustomizableWidget, 
  PresetLayout 
} from '../layout/CustomizableLayoutContainer';
import type { RRGameSettings, RRRoom, RRRoomState } from '../../types/russianRoulette';

type AdminRussianRoulettePageProps = {
  sessionToken: string | null;
};

// Define Customizable Layout presets for Admin Ops Board
const adminLayoutPresets: Record<string, PresetLayout> = {
  standard: {
    name: "Mặc định (Dashboard)",
    description: "Bố cục cân đối chia đều các cột quan sát",
    settings: {
      admin_header: { size: 'xl', visible: true, order: 0 },
      active_rooms: { size: 'sm', visible: true, order: 1 },
      room_controls: { size: 'lg', visible: true, order: 2 },
      live_state: { size: 'xl', visible: true, order: 3 },
    }
  },
  monitoring: {
    name: "Giám sát tối đa (Logs Focus)",
    description: "Mở rộng tối đa phần hiển thị trạng thái và logs thời gian thực",
    settings: {
      admin_header: { size: 'xl', visible: true, order: 0 },
      active_rooms: { size: 'sm', visible: true, order: 1 },
      live_state: { size: 'lg', visible: true, order: 2 },
      room_controls: { size: 'lg', visible: true, order: 3 },
    }
  },
  settings_focus: {
    name: "Cấu hình nhanh",
    description: "Tập trung vào phần điều khiển và cài đặt thông số phòng",
    settings: {
      admin_header: { size: 'xl', visible: true, order: 0 },
      room_controls: { size: 'xl', visible: true, order: 1 },
      active_rooms: { size: 'sm', visible: true, order: 2 },
      live_state: { size: 'lg', visible: false, order: 3 },
    }
  }
};

export function AdminRussianRoulettePage({ sessionToken }: AdminRussianRoulettePageProps) {
  const [rooms, setRooms] = useState<RRRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RRRoomState | null>(null);
  const [settings, setSettings] = useState<RRGameSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    const result = await russianRouletteService.adminListActiveRooms(sessionToken);
    setRooms(result.data);
    setError(result.error?.message ?? null);
  }, [sessionToken]);

  const loadRoomState = useCallback(async () => {
    if (!selectedRoomId) {
      setRoomState(null);
      return;
    }
    const result = await russianRouletteService.adminGetRoomState(sessionToken, selectedRoomId);
    setRoomState(result.data);
    setError(result.error?.message ?? null);
  }, [selectedRoomId, sessionToken]);

  useEffect(() => {
    void loadRooms();
    const intervalId = window.setInterval(() => void loadRooms(), 6000);
    return () => window.clearInterval(intervalId);
  }, [loadRooms]);

  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }
    void loadRoomState();
    const intervalId = window.setInterval(() => void loadRoomState(), 3000);
    return () => window.clearInterval(intervalId);
  }, [loadRoomState, selectedRoomId]);

  async function handleForceCancel(roomId: string) {
    if (!window.confirm('Hủy bỏ phòng chơi và hoàn trả điểm đã khóa cho người chơi?')) {
      return;
    }

    setLoading(true);
    const result = await russianRouletteService.adminForceCancelRoom(sessionToken, roomId, 'Admin force cancel');
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await Promise.all([loadRooms(), loadRoomState()]);
  }

  async function handleToggleEnabled() {
    if (!settings) {
      return;
    }
    setLoading(true);
    const result = await russianRouletteService.adminSetGameEnabled(sessionToken, !settings.is_enabled);
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Không thể cập nhật cài đặt.');
      return;
    }
    setSettings(result.data);
  }

  async function handleUpdateSettings(next: RRGameSettings) {
    setLoading(true);
    const result = await russianRouletteService.adminUpdateSettings(sessionToken, {
      minBuyIn: next.min_buy_in,
      maxBuyIn: next.max_buy_in,
      maxPlayers: next.max_players,
      enableItems: next.enable_items,
    });
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'Không thể cập nhật cài đặt.');
      return;
    }
    setSettings(result.data);
  }

  useEffect(() => {
    const first = rooms[0];
    if (!selectedRoomId && first) {
      setSelectedRoomId(first.room_id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    setSettings(roomState?.settings ?? null);
  }, [roomState?.settings]);

  const playerCount = useMemo(() => roomState?.players.filter((player) => !player.left_at).length ?? 0, [roomState?.players]);

  // Build the list of customizable widgets for Admin
  const widgets: CustomizableWidget[] = [
    {
      id: 'admin_header',
      title: 'Tiêu Đề & Thao Tác',
      description: 'Tiêu đề trang quản trị và nút làm mới danh sách phòng nhanh',
      defaultSize: 'xl',
      render: () => (
        <div className="rounded-2xl border border-cyan-500/20 bg-[#070b17]/80 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md h-full flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 font-display">BẢNG QUẢN LÝ TỐI CAO</div>
              <h2 className="text-xl font-black text-white tracking-wide mt-0.5 font-display">VẬN HÀNH CHIẾN TRƯỜNG Ổ SÚNG</h2>
            </div>
            <button 
              className="choice-button px-3.5 py-2 text-xs font-bold uppercase text-cyan-300 border-cyan-500/30 hover:border-cyan-400 transition-all duration-200" 
              onClick={() => void loadRooms()} 
              type="button"
            >
              <RefreshCw size={12} className="inline mr-1" />
              LÀM MỚI TÍN HIỆU
            </button>
          </div>
        </div>
      )
    },
    {
      id: 'active_rooms',
      title: 'Phòng Đang Hoạt Động',
      description: 'Danh sách các phòng game Russian Roulette đang mở kèm thông số nhanh',
      defaultSize: 'sm',
      render: () => (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md h-full flex flex-col">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 font-bold">PHÒNG ĐANG HOẠT ĐỘNG</div>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
            {rooms.map((room) => {
              const isSelected = room.room_id === selectedRoomId;
              const isPlaying = room.status === 'playing';
              return (
                <button
                  key={room.room_id}
                  className={`w-full rounded-xl border p-3 text-left transition-all duration-200 relative overflow-hidden ${
                    isSelected
                      ? 'border-cyan-400 bg-gradient-to-r from-cyan-950/40 via-cyan-950/10 to-transparent text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                      : 'border-white/5 bg-slate-900/30 hover:border-cyan-500/30 hover:bg-slate-900/50'
                  }`}
                  onClick={() => setSelectedRoomId(room.room_id)}
                  type="button"
                >
                  {isSelected && (
                    <div className="absolute left-0 inset-y-0 w-1 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" />
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-black text-white text-xs font-display">{room.name}</span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                      isPlaying 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    }`}>
                      {room.status === 'playing' ? 'Đang đấu' : room.status === 'countdown' ? 'Chuẩn bị' : 'Đang chờ'}
                    </span>
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-1.5 font-extrabold flex justify-between">
                    <span>BUY-IN: <span className="text-amber-400">{room.buy_in_amount} xu</span></span>
                    <span>SỨC CHỨA: <span className="text-slate-300">{room.room_id === selectedRoomId ? playerCount : '-'} / {room.max_players}</span></span>
                  </div>
                </button>
              );
            })}
            {rooms.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8 font-medium">Chưa có phòng nào hoạt động trên hệ thống.</div>
            ) : null}
          </div>
        </div>
      )
    },
    {
      id: 'room_controls',
      title: 'Điều Khiển & Cài Đặt',
      description: 'Hủy phòng khẩn cấp, bật/tắt game, điều chỉnh giới hạn buy-in và số người chơi',
      defaultSize: 'lg',
      render: () => (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md h-full flex flex-col justify-between">
          <div>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 font-bold">BẢNG ĐIỀU KHIỂN PHÒNG ĐẤU</div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="choice-button px-3 py-2 text-xs font-bold uppercase text-rose-300 border-rose-500/40 bg-rose-500/10 disabled:opacity-50 hover:bg-rose-500/20 transition-all duration-300"
                disabled={!selectedRoomId || loading}
                onClick={() => selectedRoomId && void handleForceCancel(selectedRoomId)}
                type="button"
              >
                <Ban size={12} className="inline mr-1" />
                Hủy Phòng Khẩn Cấp
              </button>
              <button
                className="choice-button px-3 py-2 text-xs font-bold uppercase text-cyan-300 border-cyan-500/40 bg-cyan-500/10 disabled:opacity-50 hover:bg-cyan-500/20 transition-all duration-300"
                disabled={!settings || loading}
                onClick={() => void handleToggleEnabled()}
                type="button"
              >
                <Shield size={12} className="inline mr-1" />
                {settings?.is_enabled ? 'Vô Hiệu Hóa Game' : 'Kích Hoạt Game'}
              </button>
            </div>

            {settings ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block">Buy-in Tối Thiểu</span>
                  <input
                    className="form-input w-full text-sm font-black text-cyan-300 border-none bg-slate-900/60 p-2 text-center rounded-lg focus:ring-1 focus:ring-cyan-500"
                    onChange={(event) =>
                      setSettings((current) => (current ? { ...current, min_buy_in: Number(event.target.value) } : current))
                    }
                    type="number"
                    value={settings.min_buy_in}
                  />
                </div>
                <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block">Buy-in Tối Đa</span>
                  <input
                    className="form-input w-full text-sm font-black text-cyan-300 border-none bg-slate-900/60 p-2 text-center rounded-lg focus:ring-1 focus:ring-cyan-500"
                    onChange={(event) =>
                      setSettings((current) => (current ? { ...current, max_buy_in: Number(event.target.value) } : current))
                    }
                    type="number"
                    value={settings.max_buy_in}
                  />
                </div>
                <div className="rounded-xl border border-white/5 bg-black/40 p-3 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block">Sức Chứa Tối Đa</span>
                  <input
                    className="form-input w-full text-sm font-black text-cyan-300 border-none bg-slate-900/60 p-2 text-center rounded-lg focus:ring-1 focus:ring-cyan-500"
                    max={6}
                    min={2}
                    onChange={(event) =>
                      setSettings((current) => (current ? { ...current, max_players: Number(event.target.value) } : current))
                    }
                    type="number"
                    value={settings.max_players}
                  />
                </div>
                <div className="rounded-xl border border-white/5 bg-black/40 p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-1">Vật Phẩm Hỗ Trợ</span>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                      {settings.enable_items ? "KÍCH HOẠT" : "VÔ HIỆU HÓA"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSettings(current => current ? { ...current, enable_items: !current.enable_items } : current)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.enable_items ? 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings.enable_items ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {settings ? (
            <button
              className="choice-button mt-4 px-4 py-2.5 text-xs font-bold uppercase text-emerald-300 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all duration-300"
              disabled={loading}
              onClick={() => void handleUpdateSettings(settings)}
              type="button"
            >
              Lưu Cấu Hình Cài Đặt
            </button>
          ) : null}
        </div>
      )
    },
    {
      id: 'live_state',
      title: 'Giám Sát Trực Tiếp',
      description: 'Theo dõi chi tiết số người, tổng cược, người đến lượt và logs hoạt động thời gian thực',
      defaultSize: 'xl',
      render: () => (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md h-full flex flex-col">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300 font-bold">GIÁM SÁT BÀN CHƠI TRỰC TIẾP</div>
          {roomState ? (
            <div className="space-y-4 text-xs text-slate-300 flex-1 flex flex-col">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-2">
                <div className="rounded-xl border border-white/5 bg-black/40 p-3 shadow-inner">
                  <span className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider block">Tên Phòng</span>
                  <strong className="text-white text-xs mt-0.5 block truncate font-display">{roomState.room.name}</strong>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/40 p-3 shadow-inner">
                  <span className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider block">Trạng Thái Bàn</span>
                  <strong className="text-cyan-400 text-xs mt-0.5 block uppercase tracking-widest font-display">
                    {roomState.room.status === 'playing' ? 'ĐANG CHƠI' : roomState.room.status === 'countdown' ? 'ĐẾM NGƯỢC' : 'ĐANG CHỜ'}
                  </strong>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/40 p-3 shadow-inner">
                  <span className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider block">Đấu Sĩ Hiện Tại</span>
                  <strong className="text-white text-xs mt-0.5 block">{playerCount} / {roomState.room.max_players}</strong>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/40 p-3 shadow-inner">
                  <span className="text-[8px] text-slate-500 uppercase font-extrabold tracking-wider block">Tổng Pot Tích Lũy</span>
                  <strong className="text-emerald-400 text-xs mt-0.5 block font-display font-black">{roomState.round?.pot_amount ?? 0} xu</strong>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-[180px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">NHẬT KÝ CHIẾN TRƯỜNG THỜI GIAN THỰC</span>
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/70 p-3.5 max-h-[220px] custom-scrollbar space-y-2 font-mono text-[11px] shadow-inner">
                  {roomState.actions.slice(-20).reverse().map((action) => {
                    const type = action.action_type;
                    const isKill = action.action_type === 'eliminated' || action.result === 'danger';
                    const actionResultLabel =
                      action.result === 'safe'
                        ? 'AN TOAN'
                        : action.action_type === 'eliminated' || action.result === 'danger'
                          ? 'TU TRAN'
                          : action.result === 'blocked'
                            ? 'CAN THANH CONG'
                            : action.result === 'skipped'
                              ? 'BO LUOT'
                              : (action.result ?? 'N/A');
                    return (
                      <div key={action.action_id} className="border-b border-white/5 pb-1.5 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                            type === 'pull_trigger' 
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                              : type === 'use_shield' 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {type === 'pull_trigger' ? 'BẮN' : type === 'use_shield' ? 'KHIÊN' : 'BỎ LƯỢT'}
                          </span>
                          <span className="text-slate-400">Đấu sĩ ID: <span className="text-slate-300 font-bold">{action.user_id.slice(0, 8)}</span></span>
                        </div>
                        <span className={`font-medium ${isKill ? 'text-rose-400 font-black animate-pulse' : 'text-slate-400'}`}>
                          {actionResultLabel}
                        </span>
                      </div>
                    );
                  })}
                  {roomState.actions.length === 0 ? (
                    <div className="text-xs text-slate-600 text-center py-6">Chưa có phát đạn hay hành động nào được khai hỏa.</div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-12 text-center flex flex-col items-center justify-center gap-3">
              <AlertTriangle size={24} className="text-amber-500/60 animate-bounce" />
              <div className="max-w-xs space-y-1">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">CHƯA CHỌN PHÒNG GIÁM SÁT</p>
                <p className="text-slate-500 text-[10px]">Vui lòng chọn phòng đấu bên cột danh sách để đồng bộ tín hiệu giám sát trực tiếp.</p>
              </div>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle size={14} />
          {error}
        </div>
      ) : null}

      <CustomizableLayoutContainer
        layoutKey="russian_roulette_admin_layout"
        widgets={widgets}
        presets={adminLayoutPresets}
        title="Tùy Chỉnh Dashboard Admin"
      />
    </div>
  );
}
