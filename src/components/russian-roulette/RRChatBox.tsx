import { useState } from 'react';
import type { RRChatMessage } from '../../types/russianRoulette';

type RRChatBoxProps = {
  messages: RRChatMessage[];
  onSend: (text: string) => Promise<boolean>;
  disabled?: boolean;
};

export function RRChatBox({ messages, onSend, disabled = false }: RRChatBoxProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const normalized = text.trim();
    if (!normalized || disabled || sending) {
      return;
    }

    setSending(true);
    const ok = await onSend(normalized);
    setSending(false);

    if (ok) {
      setText('');
    }
  }

  return (
    <div className="flex flex-col h-full justify-between gap-3">
      {/* Scrollable message window */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5 max-h-[220px]">
        {messages.slice(-30).map((message) => (
          <div 
            key={message.message_id} 
            className="rounded-xl border border-white/5 bg-slate-950/30 p-2.5 text-xs transition-all duration-200 hover:border-cyan-500/10 hover:bg-slate-950/50"
          >
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="font-extrabold text-cyan-400 tracking-wide font-display drop-shadow-[0_0_2px_rgba(34,211,238,0.2)]">
                {message.display_name}
              </span>
              <span className="text-[8px] text-slate-500 font-mono">
                {new Date(message.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="break-words text-slate-300 leading-relaxed">{message.text}</div>
          </div>
        ))}
        {messages.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-10 font-medium">
            Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
          </div>
        ) : null}
      </div>

      {/* Input container */}
      <div className="flex gap-2 pt-2 border-t border-white/5">
        <input
          className="form-input flex-1 text-xs py-2 bg-slate-950/60 border-white/10 text-white rounded-xl focus:border-cyan-500/50 transition-all placeholder:text-slate-600 font-semibold"
          disabled={disabled || sending}
          maxLength={300}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleSend();
            }
          }}
          placeholder="Nhập nội dung trò chuyện..."
          value={text}
        />
        <button
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
            disabled || sending || text.trim().length === 0
              ? 'opacity-35 cursor-not-allowed border border-white/5 bg-slate-950/40 text-slate-500'
              : 'border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] hover:-translate-y-0.5'
          }`}
          disabled={disabled || sending || text.trim().length === 0}
          onClick={() => void handleSend()}
          type="button"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}


