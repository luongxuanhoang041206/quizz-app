export class ProfileStatsDto {
  total_questions_answered?: number;
  correct_answers?: number;
  accuracy?: number;           // Computed: correct/total * 100, rounded 1 decimal
  perfect_scores?: number;
  total_play_time_seconds?: number;
  xp_to_next_level?: number;
}

export class UserProfileDto {
  id!: string;
  username!: string;
  avatar_url?: string | null;
  rank_title?: string;
  level?: number;
  total_xp?: number;
  current_level_xp?: number;
  next_level_xp?: number;
  current_streak?: number;
  best_streak?: number;
  total_quizzes_played?: number;
  total_quizzes_created?: number;
  total_badges?: number;
  stats?: ProfileStatsDto;
}