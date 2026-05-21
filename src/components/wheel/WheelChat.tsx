import { FormEvent, memo, useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ShieldAlert, Cpu } from 'lucide-react';
import type { WheelChatMessage } from '../../types/wheel';

type WheelChatProps = {
  canChat: boolean;
  messages: WheelChatMessage[];
  onSend: (text: string) => Promise<boolean>;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const WheelChatImpl = ({ canChat, messages, onSend }: WheelChatProps) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Keep scroll pinned inside chat container only (never scroll whole page).
  useEffect(() => {
    const container = listRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const shouldStickToBottom = distanceFromBottom < 120;

    if (!shouldStickToBottom) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'auto',
    });
  }, [messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = text.trim();
    if (!clean || sending) {
      return;
    }

    setSending(true);
    const ok = await onSend(clean);
    setSending(false);
    if (ok) {
      setText('');
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'system':
        return (
          <span className="flex items-center gap-0.5 text-[8px] bg-amber-500/10 text-amber-300 font-extrabold uppercase px-1 py-0.2 rounded border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]">
            <Cpu size={8} />
            SYS
          </span>
        );
      case 'admin':
        return (
          <span className="flex items-center gap-0.5 text-[8px] bg-rose-500/10 text-rose-300 font-extrabold uppercase px-1 py-0.2 rounded border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]">
            <ShieldAlert size={8} />
            MOD
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#060a16] to-[#03050c] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_10px_35px_rgba(0,0,0,0.5)] flex flex-col h-[380px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
          <MessageSquare size={12} className="text-cyan-400" />
          Wheel Chat
        </div>
        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Chat Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 mb-3">
        {messages.slice(-40).map((message) => {
          const isSys = message.role === 'system';
          const isMod = message.role === 'admin';
          return (
            <div 
              key={message.message_id} 
              className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                isSys 
                  ? 'bg-amber-950/10 border-amber-500/10' 
                  : isMod
                  ? 'bg-rose-950/10 border-rose-500/10'
                  : 'bg-black/35 border-white/5 hover:bg-black/45 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[9px] mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`font-black tracking-wide ${
                    isSys 
                      ? 'text-amber-300' 
                      : isMod 
                      ? 'text-rose-300' 
                      : 'text-slate-200'
                  }`}>
                    {message.display_name}
                  </span>
                  {getRoleBadge(message.role)}
                </div>
                <span className="text-slate-500 font-medium">{formatTime(message.created_at)}</span>
              </div>
              <div className={`mt-0.5 leading-relaxed font-medium ${
                isSys ? 'text-amber-200/90' : isMod ? 'text-rose-200/90' : 'text-slate-300'
              }`}>
                {message.text}
              </div>
            </div>
          );
        })}
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-600 font-medium py-16">
            Welcome to the chat! Send a message.
          </div>
        ) : null}
      </div>

      {/* Chat Input form */}
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          className="form-input flex-1 text-xs bg-black/40 border-white/10 hover:border-white/20 focus:border-cyan-400/80 focus:shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-xl py-2.5 px-3.5 transition-all text-slate-200 placeholder:text-slate-600"
          disabled={!canChat || sending}
          maxLength={300}
          onChange={(event) => setText(event.target.value)}
          placeholder={canChat ? 'Send a message...' : 'Sign in to chat'}
          value={text}
        />
        <button
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-black shadow-[0_0_15px_rgba(34,211,238,0.25)] transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 disabled:active:scale-100 disabled:cursor-not-allowed"
          disabled={!canChat || sending || !text.trim()}
          type="submit"
        >
          <Send size={14} className="fill-current text-slate-950" />
        </button>
      </form>
    </section>
  );
};

export const WheelChat = memo(WheelChatImpl);
WheelChat.displayName = 'WheelChat';


