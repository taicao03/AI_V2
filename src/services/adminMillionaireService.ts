import { supabase } from '../lib/supabaseClient';
import type {
  MillionaireAdminOverview,
  MillionaireQuestionAdminItem,
  MillionaireSessionAdminItem,
} from '../types/millionaire';

function normalizeQuestion(row: Partial<MillionaireQuestionAdminItem>): MillionaireQuestionAdminItem {
  return {
    question_id: String(row.question_id ?? ''),
    topic: String(row.topic ?? 'mixed'),
    difficulty: Number(row.difficulty ?? 1),
    question_text: String(row.question_text ?? ''),
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    correct_choice: Number(row.correct_choice ?? 0),
    confidence_score: Number(row.confidence_score ?? 0),
    verification_status: (row.verification_status as MillionaireQuestionAdminItem['verification_status']) ?? 'pending',
    source_provider: String(row.source_provider ?? 'ai'),
    source_model: row.source_model ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function normalizeSession(row: Partial<MillionaireSessionAdminItem>): MillionaireSessionAdminItem {
  return {
    session_id: String(row.session_id ?? ''),
    user_id: String(row.user_id ?? ''),
    display_name: String(row.display_name ?? 'Player'),
    topic: String(row.topic ?? 'mixed'),
    status: (row.status as MillionaireSessionAdminItem['status']) ?? 'active',
    current_question_index: Number(row.current_question_index ?? 1),
    earned_points: Number(row.earned_points ?? 0),
    guaranteed_points: Number(row.guaranteed_points ?? 0),
    started_at: String(row.started_at ?? new Date().toISOString()),
    ended_at: row.ended_at ?? null,
  };
}

function normalizeOverview(row: Partial<MillionaireAdminOverview> | null): MillionaireAdminOverview {
  return {
    total_questions: Number(row?.total_questions ?? 0),
    verified_questions: Number(row?.verified_questions ?? 0),
    pending_questions: Number(row?.pending_questions ?? 0),
    rejected_questions: Number(row?.rejected_questions ?? 0),
    active_sessions: Number(row?.active_sessions ?? 0),
    total_sessions: Number(row?.total_sessions ?? 0),
    payout_24h: Number(row?.payout_24h ?? 0),
  };
}

export const adminMillionaireService = {
  async getOverview(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: null as MillionaireAdminOverview | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase
      .rpc('millionaire_admin_get_overview', {
        p_session_token: sessionToken,
      })
      .single<MillionaireAdminOverview>();

    if (error) {
      return { data: null as MillionaireAdminOverview | null, error: new Error(error.message) };
    }

    return { data: normalizeOverview(data), error: null };
  },

  async listQuestions(sessionToken: string | null, payload?: { search?: string; topic?: string; limit?: number }) {
    if (!supabase || !sessionToken) {
      return { data: [] as MillionaireQuestionAdminItem[], error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('millionaire_admin_list_questions', {
      p_session_token: sessionToken,
      p_search: payload?.search ?? '',
      p_topic: payload?.topic ?? '',
      p_limit: Math.max(1, Math.min(200, Math.trunc(payload?.limit ?? 80))),
    });

    if (error) {
      return { data: [] as MillionaireQuestionAdminItem[], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<MillionaireQuestionAdminItem>[]).map(normalizeQuestion), error: null };
  },

  async listSessions(sessionToken: string | null, limit = 60) {
    if (!supabase || !sessionToken) {
      return { data: [] as MillionaireSessionAdminItem[], error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('millionaire_admin_list_sessions', {
      p_session_token: sessionToken,
      p_limit: Math.max(1, Math.min(200, Math.trunc(limit))),
    });

    if (error) {
      return { data: [] as MillionaireSessionAdminItem[], error: new Error(error.message) };
    }

    return { data: ((data ?? []) as Partial<MillionaireSessionAdminItem>[]).map(normalizeSession), error: null };
  },

  async upsertAiQuestion(
    sessionToken: string | null,
    payload: {
      topic: string;
      difficulty: number;
      question_text: string;
      options: string[];
      correct_choice: number;
      explanation?: string;
      source_provider?: string;
      source_model?: string;
      source_prompt_version?: string;
      confidence_score?: number;
      verification_status?: 'pending' | 'verified' | 'rejected';
      citation_urls?: string[];
    },
  ) {
    if (!supabase || !sessionToken) {
      return { data: null as MillionaireQuestionAdminItem | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('millionaire_admin_upsert_ai_question', {
      p_session_token: sessionToken,
      p_payload: payload,
    });

    if (error) {
      return { data: null as MillionaireQuestionAdminItem | null, error: new Error(error.message) };
    }

    return { data: normalizeQuestion((data ?? {}) as Partial<MillionaireQuestionAdminItem>), error: null };
  },

  async setQuestionVerification(
    sessionToken: string | null,
    questionId: string,
    status: 'pending' | 'verified' | 'rejected',
  ) {
    if (!supabase || !sessionToken) {
      return { data: null as MillionaireQuestionAdminItem | null, error: new Error('Admin session required.') };
    }

    const { data, error } = await supabase.rpc('millionaire_admin_set_question_verification', {
      p_session_token: sessionToken,
      p_question_id: questionId,
      p_status: status,
    });

    if (error) {
      return { data: null as MillionaireQuestionAdminItem | null, error: new Error(error.message) };
    }

    return { data: normalizeQuestion((data ?? {}) as Partial<MillionaireQuestionAdminItem>), error: null };
  },
};

