import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader2, Send, Trash2, MessageCircle, ShieldCheck } from 'lucide-react';
import { useChatMessages } from '../hooks/useChatMessages';
import { chatService } from '../services/chatService';
import type { UserProfile } from '../types';

type ChatBoxProps = {
  profile: UserProfile | null;
  sessionToken: string | null;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ChatBox({ profile, sessionToken }: ChatBoxProps) {
  const { messages, loading, error } = useChatMessages();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const canChat = Boolean(profile && sessionToken && !profile.is_banned);

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
    const cleanText = text.trim();
    if (!cleanText) return;

    setSending(true);
    setActionError(null);
    const { error: sendError } = await chatService.sendMessage(sessionToken, cleanText);

    if (sendError) setActionError(sendError.message);
    else setText('');
    setSending(false);
  }

  async function handleDelete(messageId: string) {
    const { error: deleteError } = await chatService.deleteMessage(sessionToken, messageId, profile?.role === 'admin');

    if (deleteError) {
      setActionError(deleteError.message);
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div 
        ref={listRef} 
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 custom-scrollbar"
      >
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Opening Link...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500 opacity-40">
            <MessageCircle size={32} className="mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">No transmissions recorded</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMe = profile?.uid === message.user_id;
            const canDelete = profile && (profile.uid === message.user_id || profile.role === 'admin');
            const isAdminMessage = message.role === 'admin';
            const isVip = message.vip_level > 0;
            const isHighVip = message.vip_level >= 8;

            return (
              <div 
                className={`group flex flex-col gap-1.5 ${isMe ? 'items-end' : 'items-start'} transition-opacity duration-300 ${message.is_deleted ? 'opacity-30' : ''}`} 
                key={message.message_id}
              >
                <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                      {message.display_name}
                   </span>
                   {isAdminMessage && (
                     <span className="inline-flex items-center gap-1 rounded-md border border-cyan-300/35 bg-cyan-300/15 px-1.5 py-0.5 text-[8px] font-black uppercase text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.16)]">
                       <ShieldCheck size={10} />
                       Admin
                     </span>
                   )}
                   {isVip && (
                     <span className={`rounded-md border px-1.5 py-0.5 text-[8px] font-black uppercase ${
                       isHighVip
                         ? 'border-amber-300/30 bg-amber-300/10 text-amber-200'
                         : 'border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-200'
                     }`}>
                       VIP {message.vip_level}
                     </span>
                   )}
                   <span className="text-[9px] font-bold text-slate-600">{formatTime(message.created_at)}</span>
                </div>
                
                <div className="relative group">
                  <div className={`max-w-[240px] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm border ${
                    isAdminMessage
                      ? 'border-cyan-200/45 bg-gradient-to-br from-cyan-300/18 via-sky-500/12 to-indigo-500/16 text-cyan-50 shadow-[0_0_32px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)]'
                      : isHighVip
                      ? 'border-amber-300/35 bg-amber-300/10 text-amber-50 shadow-[0_0_26px_rgba(251,191,36,0.1)]'
                      : isVip
                        ? 'border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-50 shadow-[0_0_22px_rgba(217,70,239,0.08)]'
                        : isMe 
                          ? 'bg-cyan-500/10 text-white border-cyan-500/20 rounded-tr-none' 
                          : 'bg-white/5 text-slate-300 border-white/5 rounded-tl-none'
                  }`}>
                    {message.is_deleted ? (
                      <span className="italic text-slate-500 text-xs uppercase font-bold tracking-tighter">Redacted</span>
                    ) : (
                      message.text
                    )}
                  </div>
                  
                  {canDelete && !message.is_deleted && (
                    <button 
                      className={`absolute top-0 ${isMe ? '-left-8' : '-right-8'} p-1.5 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all`} 
                      onClick={() => void handleDelete(message.message_id)} 
                      type="button"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 space-y-4 border-t border-white/5 bg-[#070914]/95 p-4 backdrop-blur-xl sm:p-6">
        {(error || actionError) && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-[9px] font-black uppercase text-rose-400 border border-rose-500/20 animate-in slide-in-from-bottom-1">
            <AlertCircle size={10} />
            {actionError ?? error}
          </div>
        )}

        <form className="relative flex items-center gap-2" onSubmit={handleSubmit}>
          <input
            className="form-input flex-1 h-12 bg-black/40 border-white/5 pr-12 text-sm focus:bg-white/[0.04] transition-all"
            disabled={!canChat || sending}
            maxLength={300}
            onChange={(event) => setText(event.target.value)}
            placeholder={canChat ? 'Protocol message...' : 'Auth required'}
            value={text}
          />
          <button 
            className="absolute right-1.5 h-9 w-9 flex items-center justify-center rounded-lg bg-white text-black transition-all hover:bg-cyan-400 active:scale-95 disabled:opacity-0" 
            disabled={!canChat || sending || !text.trim()} 
            type="submit"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}

function AlertCircle({ size }: { size: number }) {
   return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
         <circle cx="12" cy="12" r="10" />
         <line x1="12" y1="8" x2="12" y2="12" />
         <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
   );
}
