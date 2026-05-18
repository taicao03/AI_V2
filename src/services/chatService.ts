import { supabase, TABLES } from '../lib/supabaseClient';
import type { ChatMessage, PokerChatMessage } from '../types';

const MESSAGE_SELECT =
  'message_id, user_id, display_name, avatar, role, vip_level, text, created_at, updated_at, deleted_at, deleted_by, is_deleted';
const LEGACY_MESSAGE_SELECT =
  'message_id, user_id, display_name, avatar, text, created_at, updated_at, deleted_at, deleted_by, is_deleted';

export function normalizeChatMessage(row: Partial<ChatMessage>): ChatMessage {
  return {
    message_id: String(row.message_id ?? ''),
    user_id: String(row.user_id ?? ''),
    display_name: String(row.display_name ?? 'Player'),
    avatar: row.avatar ?? null,
    role: row.role === 'admin' ? 'admin' : 'user',
    vip_level: Math.max(0, Math.min(10, Number(row.vip_level ?? 0))),
    text: String(row.text ?? ''),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: row.updated_at ?? null,
    deleted_at: row.deleted_at ?? null,
    deleted_by: row.deleted_by ?? null,
    is_deleted: Boolean(row.is_deleted ?? false),
  };
}

export const chatService = {
  async listMessages(): Promise<{ data: ChatMessage[]; error: Error | null }> {
    if (!supabase) {
      return { data: [], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase
      .from(TABLES.chatMessages)
      .select(MESSAGE_SELECT)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      const missingVipColumns = error.message.toLowerCase().includes('vip_level') || error.message.toLowerCase().includes('role');

      if (!missingVipColumns) {
        return { data: [], error: new Error(error.message) };
      }

      const fallback = await supabase
        .from(TABLES.chatMessages)
        .select(LEGACY_MESSAGE_SELECT)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fallback.error) {
        return { data: [], error: new Error(fallback.error.message) };
      }

      return {
        data: (fallback.data ?? []).map((row) => normalizeChatMessage(row)).reverse(),
        error: null,
      };
    }

    return {
      data: (data ?? []).map((row) => normalizeChatMessage(row)).reverse(),
      error: null,
    };
  },

  async sendMessage(sessionToken: string | null, text: string) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de chat.') };
    }

    const { data, error } = await supabase
      .rpc('send_chat_message', {
        p_session_token: sessionToken,
        p_text: text,
      })
      .single<ChatMessage>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizeChatMessage(data), error: null };
  },

  async deleteMessage(sessionToken: string | null, messageId: string, isAdmin = false) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de xoa tin nhan.') };
    }

    const { data, error } = await supabase
      .rpc(isAdmin ? 'admin_delete_chat_message' : 'delete_chat_message', {
        p_session_token: sessionToken,
        p_message_id: messageId,
      })
      .single<ChatMessage>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: normalizeChatMessage(data), error: null };
  },

  async listPokerMessages(tableId: string): Promise<{ data: PokerChatMessage[]; error: Error | null }> {
    if (!supabase) {
      return { data: [], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase
      .from(TABLES.pokerChatMessages)
      .select('message_id, table_id, user_id, display_name, avatar, role, vip_level, text, created_at, updated_at, deleted_at, deleted_by, is_deleted')
      .eq('table_id', tableId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return {
      data: (data ?? [])
        .map((row) => ({
          message_id: String(row.message_id),
          table_id: String(row.table_id),
          user_id: String(row.user_id),
          display_name: String(row.display_name ?? 'Player'),
          avatar: row.avatar ?? null,
          role: row.role === 'admin' ? ('admin' as const) : ('user' as const),
          vip_level: Number(row.vip_level ?? 0),
          text: String(row.text ?? ''),
          created_at: String(row.created_at ?? new Date().toISOString()),
          updated_at: row.updated_at ?? null,
          deleted_at: row.deleted_at ?? null,
          deleted_by: row.deleted_by ?? null,
          is_deleted: Boolean(row.is_deleted ?? false),
        }))
        .reverse(),
      error: null,
    };
  },

  async sendPokerMessage(sessionToken: string | null, tableId: string, text: string) {
    if (!supabase || !sessionToken) {
      return { data: null, error: new Error('Ban can dang nhap de chat poker.') };
    }

    const { data, error } = await supabase
      .rpc('poker_send_chat_message', {
        p_session_token: sessionToken,
        p_table_id: tableId,
        p_text: text,
      })
      .single<PokerChatMessage>();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  },
};
