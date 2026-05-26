export type MillionaireSessionStatus = 'active' | 'won' | 'lost' | 'cancelled';

export type MillionaireQuestionPublic = {
  question_id: string;
  topic: string;
  difficulty: number;
  question_text: string;
  options: string[];
  available_choices: number[];
};

export type MillionaireSessionState = {
  session_id: string;
  status: MillionaireSessionStatus;
  topic: string;
  current_question_index: number;
  max_question_count: number;
  earned_points: number;
  guaranteed_points: number;
  lifeline_5050_used: boolean;
  lifeline_skip_used: boolean;
  lifeline_audience_used: boolean;
  created_at: string;
  started_at: string;
  ended_at: string | null;
  updated_at: string;
  question: MillionaireQuestionPublic | null;
};

export type MillionaireAnswerResult = {
  session_id: string;
  is_correct: boolean;
  selected_choice: number;
  correct_choice: number;
  earned_points: number;
  guaranteed_points: number;
  game_over: boolean;
  status: MillionaireSessionStatus;
  next_question_index: number | null;
};

export type MillionaireRecentWinner = {
  session_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  earned_points: number;
  topic: string;
  ended_at: string;
};

export type MillionaireQuestionAdminItem = {
  question_id: string;
  topic: string;
  difficulty: number;
  question_text: string;
  options: string[];
  correct_choice: number;
  confidence_score: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  source_provider: string;
  source_model: string | null;
  created_at: string;
};

export type MillionaireSessionAdminItem = {
  session_id: string;
  user_id: string;
  display_name: string;
  topic: string;
  status: MillionaireSessionStatus;
  current_question_index: number;
  earned_points: number;
  guaranteed_points: number;
  started_at: string;
  ended_at: string | null;
};

export type MillionaireAdminOverview = {
  total_questions: number;
  verified_questions: number;
  pending_questions: number;
  rejected_questions: number;
  active_sessions: number;
  total_sessions: number;
  payout_24h: number;
};
