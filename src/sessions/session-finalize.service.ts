import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/database/database.module';

const DEFAULT_PASSING_SCORE = 80;

@Injectable()
export class SessionFinalizeService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async finalizeSession(sessionId: string) {
    const { data: session, error: sessionError } = await this.supabase
      .from('quiz_sessions')
      .select('id, quiz_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new NotFoundException('Session không tồn tại');
    }

    if (session.status !== 'finished') {
      return;
    }

    const quizData = await this.loadQuizMetadata(session.quiz_id);
    if (!quizData || !quizData.is_nft_quiz || !quizData.reward_id) {
      return;
    }

    const totalPoints = await this.loadQuizTotalPoints(session.quiz_id);
    if (totalPoints <= 0) {
      return;
    }

    const { data: leaderboardItems, error: leaderboardError } = await this.supabase
      .from('leaderboard')
      .select('user_id, score')
      .eq('session_id', sessionId);

    if (leaderboardError || !leaderboardItems) {
      throw new BadRequestException('Không thể tải leaderboard để hoàn thành session');
    }

    const passingScore = Number(quizData.passing_score ?? DEFAULT_PASSING_SCORE);
    const threshold = Number.isFinite(passingScore) && passingScore >= 0 ? passingScore : DEFAULT_PASSING_SCORE;

    for (const entry of leaderboardItems) {
      const score = Number(entry.score || 0);
      const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
      if (percentage < threshold) {
        continue;
      }

      const existing = await this.supabase
        .from('achievement')
        .select('id')
        .eq('user_id', entry.user_id)
        .eq('quiz_id', session.quiz_id)
        .eq('reward_id', quizData.reward_id)
        .limit(1)
        .maybeSingle();

      if (existing.error) {
        throw new BadRequestException('Không thể kiểm tra achievement tồn tại');
      }

      if (existing.data) {
        continue;
      }

      const { error: insertError } = await this.supabase
        .from('achievement')
        .insert({
          user_id: entry.user_id,
          quiz_id: session.quiz_id,
          reward_id: quizData.reward_id,
          status: 'PENDING',
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        throw new BadRequestException('Không thể tạo achievement cho session đã kết thúc');
      }
    }
  }

  private async loadQuizMetadata(quizId: string) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('id, is_nft_quiz, reward_id')
      .eq('id', quizId)
      .single();

    if (error || !data) {
      throw new BadRequestException('Không thể tải thông tin quiz để hoàn thành session');
    }

    return { ...data, passing_score: DEFAULT_PASSING_SCORE };
  }

  private async loadQuizTotalPoints(quizId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('questions')
      .select('points', { count: 'exact', head: false })
      .eq('quiz_id', quizId);

    if (error || !data) {
      throw new BadRequestException('Không thể tải câu hỏi quiz để tính tổng điểm');
    }

    return data.reduce((sum: number, item: any) => sum + Number(item.points || 0), 0);
  }
}
