import { Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/database/database.module';

@Injectable()
export class ActivityService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async logQuizCompleted(params: {
    userId: string;
    attemptId: string;
    quizId: string;
    score: number;
    totalPoints: number;
    percentage: number;
    correctAnswers: number;
    isPerfect: boolean;
    xpEarned: number;
    durationSeconds?: number;
  }) {
    const { userId, attemptId, quizId, score, totalPoints, percentage, correctAnswers, isPerfect, xpEarned, durationSeconds } = params;

    await this.supabase.from('activity_logs').insert({
      user_id: userId,
      type: 'quiz_completed',
      metadata: {
        quiz_id: quizId,
        attempt_id: attemptId,
        score,
        total_points: totalPoints,
        percentage,
        correct_answers: correctAnswers,
        is_perfect: isPerfect,
        xp_earned: xpEarned,
        duration_seconds: durationSeconds ?? null,
      },
      created_at: new Date().toISOString(),
    });
  }

  async logGeneric(userId: string, type: string, metadata: any) {
    await this.supabase.from('activity_logs').insert({
      user_id: userId,
      type,
      metadata,
      created_at: new Date().toISOString(),
    });
  }
}
