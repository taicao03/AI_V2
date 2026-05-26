import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from '../lib/supabaseClient';
import { chatService, normalizeChatMessage } from '../services/chatService';
import type { ChatMessage } from '../types';

const QUERY_KEY = ['chat', 'messages'] as const;

function sortMessages(messages: ChatMessage[]) {
  return [...messages]
    .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())
    .slice(-100);
}

async function fetchMessages() {
  const { data, error } = await chatService.listMessages();
  if (error) {
    throw error;
  }
  return data;
}

export function useChatMessages() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchMessages,
    staleTime: 10_000,
  });

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      return;
    }

    const channel = client
      .channel('dice-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.chatMessages }, (payload) => {
        if (!payload.new) {
          return;
        }

        const nextMessage = normalizeChatMessage(payload.new as Partial<ChatMessage>);
        queryClient.setQueryData<ChatMessage[]>(QUERY_KEY, (current) => {
          const source = current ?? [];
          const withoutDuplicate = source.filter((message) => message.message_id !== nextMessage.message_id);
          return sortMessages([...withoutDuplicate, nextMessage]);
        });
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    messages: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload,
  };
}

