import { useCallback, useEffect, useState } from 'react';
import { supabase, TABLES } from '../lib/supabaseClient';
import { chatService, normalizeChatMessage } from '../services/chatService';
import type { ChatMessage } from '../types';

function sortMessages(messages: ChatMessage[]) {
  return [...messages]
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .slice(-100);
}

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await chatService.listMessages();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setMessages(data);
      setError(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setLoading(false);
      setError('Chua cau hinh Supabase chat.');
      return;
    }

    const channel = client
      .channel('dice-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.chatMessages }, (payload) => {
        if (!payload.new) {
          return;
        }

        const nextMessage = normalizeChatMessage(payload.new as Partial<ChatMessage>);
        setMessages((current) => {
          const withoutDuplicate = current.filter((message) => message.message_id !== nextMessage.message_id);
          return sortMessages([...withoutDuplicate, nextMessage]);
        });
      })
      .subscribe();

    void loadMessages();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadMessages]);

  return { messages, loading, error, reload: loadMessages };
}
