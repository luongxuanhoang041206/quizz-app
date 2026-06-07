import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/database.module';

interface DashboardStats {
  counts: {
    totalUsers: number;
    totalQuizzes: number;
    totalCompletedAttempts: number;
  };
  topPlayedQuizzes: any[];
  topLikedQuizzes: any[];
  topAttempts: any[];
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  /**
   * GET /api/dashboard
   * Lấy dữ liệu dashboard với thống kê tổng hợp:
   * 1. Counts: Tổng số user, quiz, completed attempts
   * 2. Top 10 Quiz hot nhất (theo play_count)
   * 3. Top 10 Quiz được thích nhất (theo like_count)
   * 4. Top 10 Lượt làm bài điểm cao nhất (kèm username)
   *
   * Sử dụng Promise.all() để optimize và gọi queries song song
   */
  async getDashboard(): Promise<DashboardStats> {
    try {
      const [
        usersCountResult,
        quizzesCountResult,
        attemptsCountResult,
        topPlayedQuizzesResult,
        topLikedQuizzesResult,
        topAttemptsResult,
      ] = await Promise.all([
        // Query 1: Đếm tổng số user
        this.supabase.from('users').select('id', { count: 'exact', head: true }),
        // Query 2: Đếm tổng số quiz
        this.supabase.from('quizzes').select('id', { count: 'exact', head: true }),
        // Query 3: Đếm tổng số attempts hoàn thành (status = 'completed')
        this.supabase
          .from('attempts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed'),
        // Query 4: Top 10 quiz hot nhất (theo play_count)
        this.supabase
          .from('quizzes')
          .select('id, title, play_count, like_count')
          .order('play_count', { ascending: false })
          .limit(10),
        // Query 5: Top 10 quiz được thích nhất (theo like_count)
        this.supabase
          .from('quizzes')
          .select('id, title, play_count, like_count')
          .order('like_count', { ascending: false })
          .limit(10),
        // Query 6: Top 10 attempts điểm cao nhất (kèm username)
        this.supabase
          .from('attempts')
          .select('id, score, total_points, status, users(username)')
          .eq('status', 'completed')
          .order('score', { ascending: false })
          .limit(10),
      ]);

      if (usersCountResult.error) {
        throw new BadRequestException('Lỗi khi đếm số user');
      }
      if (quizzesCountResult.error) {
        throw new BadRequestException('Lỗi khi đếm số quiz');
      }
      if (attemptsCountResult.error) {
        throw new BadRequestException('Lỗi khi đếm số lượt làm bài hoàn thành');
      }
      if (topPlayedQuizzesResult.error) {
        throw new BadRequestException('Lỗi khi lấy top quiz hot nhất');
      }
      if (topLikedQuizzesResult.error) {
        throw new BadRequestException('Lỗi khi lấy top quiz được thích nhất');
      }
      if (topAttemptsResult.error) {
        throw new BadRequestException('Lỗi khi lấy top lượt làm bài điểm cao nhất');
      }

      const totalUsers = usersCountResult.count || 0;
      const totalQuizzes = quizzesCountResult.count || 0;
      const totalCompletedAttempts = attemptsCountResult.count || 0;

      // Xử lý data từ top attempts: reshape để user_info dễ đọc hơn
      const topAttemptsFormatted = (topAttemptsResult.data || []).map((attempt: any) => ({
        id: attempt.id,
        score: attempt.score,
        total_points: attempt.total_points,
        percentage:
          attempt.total_points > 0
            ? ((attempt.score / attempt.total_points) * 100).toFixed(2)
            : '0.00',
        username: attempt.users?.username,
      }));

      // Return dashboard object
      return {
        counts: {
          totalUsers,
          totalQuizzes,
          totalCompletedAttempts,
        },
        topPlayedQuizzes: topPlayedQuizzesResult.data || [],
        topLikedQuizzes: topLikedQuizzesResult.data || [],
        topAttempts: topAttemptsFormatted,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Lỗi khi lấy dữ liệu dashboard',
      );
    }
  }

  // Legacy methods (keep for backward compatibility)
  create(createDashboardDto: any) {
    return 'This action adds a new dashboard';
  }

  findAll() {
    return `This action returns all dashboard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dashboard`;
  }

  update(id: number, updateDashboardDto: any) {
    return `This action updates a #${id} dashboard`;
  }

  remove(id: number) {
    return `This action removes a #${id} dashboard`;
  }
}
