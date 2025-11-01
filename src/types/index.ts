export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  profile?: Profile | null;
}

export interface Profile {
  id: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
  date_of_birth?: Date | null;
  profil_url?: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface Module {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  duration_label?: string | null;
  duration_minutes?: number | null;
  lessons?: number | null;
  category?: string | null;
  published: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string | null;
}

export interface SubMateri {
  id: string;
  module_id: string;
  title: string;
  content?: string | null;
  order_index: number;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PoinDetail {
  id: string;
  sub_materi_id: string;
  title: string;
  content_html?: string | null;
  duration_label?: string | null;
  duration_minutes?: number | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface Quiz {
  id: string;
  module_id: string;
  sub_materi_id: string;
  quiz_type: string;
  title?: string | null;
  description?: string | null;
  time_limit_seconds: number;
  passing_score: number;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: any; // JSONB
  correct_answer_index: number;
  explanation?: string | null;
  order_index: number;
  created_at: Date;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  passed: boolean;
  answers?: any; // JSONB
  started_at: Date;
  completed_at?: Date | null;
  created_at: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
