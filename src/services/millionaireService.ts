import { supabase } from '../lib/supabaseClient';
import type {
  MillionaireAnswerResult,
  MillionaireRecentWinner,
  MillionaireSessionState,
} from '../types/millionaire';

function normalizeState(row: Partial<MillionaireSessionState> | null): MillionaireSessionState | null {
  if (!row) {
    return null;
  }

  return {
    session_id: String(row.session_id ?? ''),
    status: (row.status as MillionaireSessionState['status']) ?? 'active',
    topic: String(row.topic ?? 'mixed'),
    current_question_index: Number(row.current_question_index ?? 1),
    max_question_count: Number(row.max_question_count ?? 15),
    earned_points: Number(row.earned_points ?? 0),
    guaranteed_points: Number(row.guaranteed_points ?? 0),
    lifeline_5050_used: Boolean(row.lifeline_5050_used ?? false),
    lifeline_skip_used: Boolean(row.lifeline_skip_used ?? false),
    lifeline_audience_used: Boolean(row.lifeline_audience_used ?? false),
    created_at: String(row.created_at ?? new Date().toISOString()),
    started_at: String(row.started_at ?? new Date().toISOString()),
    ended_at: row.ended_at ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    question: row.question
      ? {
          question_id: String(row.question.question_id ?? ''),
          topic: String(row.question.topic ?? 'mixed'),
          difficulty: Number(row.question.difficulty ?? 1),
          question_text: String(row.question.question_text ?? ''),
          options: Array.isArray(row.question.options) ? row.question.options.map(String) : [],
          available_choices: Array.isArray(row.question.available_choices)
            ? row.question.available_choices.map((item) => Number(item))
            : [0, 1, 2, 3],
        }
      : null,
  };
}

function normalizeAnswerResult(row: Partial<MillionaireAnswerResult>): MillionaireAnswerResult {
  return {
    session_id: String(row.session_id ?? ''),
    is_correct: Boolean(row.is_correct ?? false),
    selected_choice: Number(row.selected_choice ?? -1),
    correct_choice: Number(row.correct_choice ?? -1),
    earned_points: Number(row.earned_points ?? 0),
    guaranteed_points: Number(row.guaranteed_points ?? 0),
    game_over: Boolean(row.game_over ?? false),
    status: (row.status as MillionaireAnswerResult['status']) ?? 'lost',
    next_question_index:
      row.next_question_index === null || row.next_question_index === undefined ? null : Number(row.next_question_index),
  };
}

function normalizeWinner(row: Partial<MillionaireRecentWinner>): MillionaireRecentWinner {
  return {
    session_id: String(row.session_id ?? ''),
    user_id: String(row.user_id ?? ''),
    display_name: String(row.display_name ?? 'Player'),
    avatar_url: row.avatar_url ?? null,
    earned_points: Number(row.earned_points ?? 0),
    topic: String(row.topic ?? 'mixed'),
    ended_at: String(row.ended_at ?? new Date().toISOString()),
  };
}

export const millionaireService = {
  async getCurrentSession(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: null as MillionaireSessionState | null, error: new Error('Ban can dang nhap de choi game.') };
    }

    const { data, error } = await supabase.rpc('millionaire_get_current_session_state', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null as MillionaireSessionState | null, error: new Error(error.message) };
    }

    return { data: normalizeState((data ?? null) as Partial<MillionaireSessionState> | null), error: null };
  },

  async startSession(sessionToken: string | null, topic: string) {
    if (!supabase || !sessionToken) {
      return { data: null as MillionaireSessionState | null, error: new Error('Ban can dang nhap de bat dau.') };
    }

    const { data, error } = await supabase.rpc('millionaire_start_session', {
      p_session_token: sessionToken,
      p_topic: topic,
    });

    if (error) {
      return { data: null as MillionaireSessionState | null, error: new Error(error.message) };
    }

    return { data: normalizeState((data ?? null) as Partial<MillionaireSessionState> | null), error: null };
  },

  async answerCurrentQuestion(sessionToken: string | null, choiceIndex: number) {
    if (!supabase || !sessionToken) {
      return { data: null as MillionaireAnswerResult | null, error: new Error('Ban can dang nhap de tra loi.') };
    }

    const { data, error } = await supabase.rpc('millionaire_answer_current_question', {
      p_session_token: sessionToken,
      p_choice_index: Math.trunc(choiceIndex),
    });

    if (error) {
      return { data: null as MillionaireAnswerResult | null, error: new Error(error.message) };
    }

    return { data: normalizeAnswerResult((data ?? {}) as Partial<MillionaireAnswerResult>), error: null };
  },

  async useLifeline5050(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: null as MillionaireSessionState | null, error: new Error('Ban can dang nhap de dung tro giup.') };
    }

    const { data, error } = await supabase.rpc('millionaire_use_lifeline_5050', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null as MillionaireSessionState | null, error: new Error(error.message) };
    }

    return { data: normalizeState((data ?? null) as Partial<MillionaireSessionState> | null), error: null };
  },

  async useLifelineSkip(sessionToken: string | null) {
    if (!supabase || !sessionToken) {
      return { data: null as MillionaireSessionState | null, error: new Error('Ban can dang nhap de dung tro giup.') };
    }

    const { data, error } = await supabase.rpc('millionaire_use_lifeline_skip', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null as MillionaireSessionState | null, error: new Error(error.message) };
    }

    return { data: normalizeState((data ?? null) as Partial<MillionaireSessionState> | null), error: null };
  },

  async getRecentWinners(limit = 20) {
    if (!supabase) {
      return { data: [] as MillionaireRecentWinner[], error: new Error('Chua cau hinh Supabase.') };
    }

    const { data, error } = await supabase.rpc('millionaire_get_recent_winners', {
      p_limit: Math.max(1, Math.min(100, Math.trunc(limit))),
    });

    if (error) {
      return { data: [] as MillionaireRecentWinner[], error: new Error(error.message) };
    }

    return {
      data: ((data ?? []) as Partial<MillionaireRecentWinner>[]).map((row) => normalizeWinner(row)),
      error: null,
    };
  },
};

