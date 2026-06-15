export class RecentAttemptDto {
  attempt_id?: string;
  quiz_id?: string;
  quiz_title?: string;
  quiz_thumbnail?: string | null;
  category?: { name: string; color_hex: string } | null;
  score?: number;
  xp_earned?: number;
  total_questions?: number;
  correct_answers?: number;
  time_taken_seconds?: number;
  submitted_at?: Date;
}

export class PaginatedResponseDto<T> {
  data?: T[];
  next_cursor?: string | null;
  has_more?: boolean;
}