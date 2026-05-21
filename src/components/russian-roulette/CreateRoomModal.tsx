import { useState } from 'react';
import { X, Shield, Users, Coins, Lock, MessageSquare, PlusCircle } from 'lucide-react';
import {
  RR_DEFAULT_BUY_IN,
  RR_DEFAULT_MAX_BUY_IN,
  RR_DEFAULT_MAX_PLAYERS,
  RR_DEFAULT_MIN_BUY_IN,
} from '../../constants/russianRoulette';
import { FormattedInput } from '../FormattedInput';

type CreateRoomModalProps = {
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    isPrivate: boolean;
    buyInAmount: number;
    minBuyIn: number;
    maxBuyIn: number;
    maxPlayers: number;
    enableItems: boolean;
    allowSpectatorChat: boolean;
  }) => Promise<boolean>;
};

export function CreateRoomModal({ isOpen, loading, onClose, onCreate }: CreateRoomModalProps) {
  const [name, setName] = useState('Mật Thất Bí Ẩn');
  const [isPrivate, setIsPrivate] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState(RR_DEFAULT_BUY_IN);
  const [minBuyIn, setMinBuyIn] = useState(RR_DEFAULT_MIN_BUY_IN);
  const [maxBuyIn, setMaxBuyIn] = useState(RR_DEFAULT_MAX_BUY_IN);
  const [maxPlayers, setMaxPlayers] = useState(RR_DEFAULT_MAX_PLAYERS);
  const [enableItems, setEnableItems] = useState(true);
  const [allowSpectatorChat, setAllowSpectatorChat] = useState(true);

  if (!isOpen) {
    return null;
  }

  async function handleCreate() {
    const ok = await onCreate({
      name,
      isPrivate,
      buyInAmount,
      minBuyIn,
      maxBuyIn,
      maxPlayers,
      enableItems,
      allowSpectatorChat,
    });
    if (ok) {
      onClose();
    }
  }

  return (
    <div className="modal-overlay">
      <div className="panel w-full max-w-xl p-6 sm:p-8 bg-[#0c1020]/90 backdrop-blur-2xl border-cyan-500/30 shadow-[0_0_80px_rgba(34,211,238,0.2)] relative overflow-hidden">
        {/* Blueprint line decorations */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        
        {/* Top close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-all"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="mb-6 relative z-10">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400">KHỞI TẠO BÀN ĐẤU</div>
          <h3 className="text-xl font-black text-white uppercase tracking-wide mt-1 flex items-center gap-2">
            <PlusCircle size={20} className="text-cyan-400 animate-pulse" />
            Tạo Phòng Đấu Sĩ Mới
          </h3>
        </div>

        {/* Modal Body Form */}
        <div className="grid gap-4 sm:grid-cols-2 relative z-10">
          <label className="text-xs font-bold text-slate-400 block sm:col-span-2">
            Tên phòng chơi
            <input 
              className="form-input mt-1.5 w-full text-xs font-semibold bg-slate-950/60 border-white/10 text-white rounded-xl focus:border-cyan-500/50" 
              onChange={(event) => setName(event.target.value)} 
              placeholder="Nhập tên phòng..."
              value={name} 
            />
          </label>

          <label className="text-xs font-bold text-slate-400 block">
            Phí tham chiến (Buy-in)
            <div className="relative mt-1.5">
              <FormattedInput
                className="form-input w-full text-xs font-bold pl-8 bg-slate-950/60 border-white/10 text-white rounded-xl focus:border-cyan-500/50"
                value={buyInAmount}
                onChange={setBuyInAmount}
              />
              <Coins size={12} className="absolute left-3 top-3 text-cyan-400" />
            </div>
          </label>

          <label className="text-xs font-bold text-slate-400 block">
            Số lượng đấu sĩ tối đa
            <div className="relative mt-1.5">
              <input
                className="form-input w-full text-xs font-bold pl-8 bg-slate-950/60 border-white/10 text-white rounded-xl focus:border-cyan-500/50"
                max={6}
                min={2}
                onChange={(event) => setMaxPlayers(Number(event.target.value))}
                type="number"
                value={maxPlayers}
              />
              <Users size={12} className="absolute left-3 top-3 text-cyan-400" />
            </div>
          </label>

          <label className="text-xs font-bold text-slate-400 block">
            Mức cược tối thiểu (Min Buy-in)
            <FormattedInput
              className="form-input mt-1.5 w-full text-xs font-bold bg-slate-950/60 border-white/10 text-white rounded-xl focus:border-cyan-500/50 animate-none"
              value={minBuyIn}
              onChange={setMinBuyIn}
            />
          </label>

          <label className="text-xs font-bold text-slate-400 block">
            Mức cược tối đa (Max Buy-in)
            <FormattedInput
              className="form-input mt-1.5 w-full text-xs font-bold bg-slate-950/60 border-white/10 text-white rounded-xl focus:border-cyan-500/50 animate-none"
              value={maxBuyIn}
              onChange={setMaxBuyIn}
            />
          </label>

          {/* Toggle Controls */}
          <div className="sm:col-span-2 grid gap-3.5 pt-2 border-t border-white/5 mt-2">
            <label className="flex items-center justify-between rounded-xl bg-slate-950/40 border border-white/5 px-4 py-2.5 cursor-pointer hover:bg-slate-950/60 transition-all select-none">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Lock size={14} className="text-fuchsia-400" />
                Phòng đấu riêng tư (Chỉ vào bằng mã)
              </span>
              <input 
                checked={isPrivate} 
                onChange={(event) => setIsPrivate(event.target.checked)} 
                type="checkbox" 
                className="accent-fuchsia-500 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl bg-slate-950/40 border border-white/5 px-4 py-2.5 cursor-pointer hover:bg-slate-950/60 transition-all select-none">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Shield size={14} className="text-emerald-400" />
                Kích hoạt sử dụng Vật phẩm (Khiên, Bỏ lượt)
              </span>
              <input 
                checked={enableItems} 
                onChange={(event) => setEnableItems(event.target.checked)} 
                type="checkbox" 
                className="accent-emerald-500 h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl bg-slate-950/40 border border-white/5 px-4 py-2.5 cursor-pointer hover:bg-slate-950/60 transition-all select-none">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <MessageSquare size={14} className="text-cyan-400" />
                Cho phép khán giả trò chuyện trực tiếp
              </span>
              <input 
                checked={allowSpectatorChat} 
                onChange={(event) => setAllowSpectatorChat(event.target.checked)} 
                type="checkbox" 
                className="accent-cyan-500 h-4 w-4"
              />
            </label>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex justify-end gap-2.5 relative z-10">
          <button 
            className="choice-button px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-400 border border-white/5 bg-slate-900/40 hover:bg-slate-900/60 hover:text-white" 
            onClick={onClose} 
            type="button"
          >
            Hủy bỏ
          </button>
          <button 
            className="choice-button px-5 py-2.5 text-xs font-black uppercase tracking-wider text-cyan-300 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/15 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]" 
            disabled={loading} 
            onClick={() => void handleCreate()} 
            type="button"
          >
            {loading ? 'Đang khởi tạo...' : 'Khởi tạo phòng đấu'}
          </button>
        </div>
      </div>
    </div>
  );
}
