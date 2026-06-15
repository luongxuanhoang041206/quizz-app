/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { UpdateUserDto } from './dto/UpdateUserDto';
@Injectable()
export class UserService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getUser(userId: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, email, username, avatar_url, bio, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        username: dto.username,
        avatar_url: dto.avatar_url,
        bio: dto.bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async userQuizz(userId: string) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async userQuizzAttemps(userId: string) {
    const { data, error } = await this.supabase
      .from('attempts')
      .select(
        `
                id,
                score,
                submitted_at,
                quizzes(
                    id,
                    title,
                    description
                    )
                `,
      )
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getCategoryStats(userId: string) {
    const { data, error } = await this.supabase
      .from('user_category_stats')
      .select('user_id, category_id, total_attempts, correct_answers, total_questions, total_xp_earned, last_played_at, categories(id, name, slug, color_hex, icon_url)')
      .eq('user_id', userId)
      .order('last_played_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return (data || []).map((r: any) => ({
      category_id: r.category_id,
      name: r.categories?.name,
      slug: r.categories?.slug,
      color_hex: r.categories?.color_hex,
      icon_url: r.categories?.icon_url,
      total_attempts: r.total_attempts,
      correct_answers: r.correct_answers,
      total_questions: r.total_questions,
      accuracy: r.total_questions ? (r.correct_answers / r.total_questions) : 0,
      total_xp_earned: r.total_xp_earned,
      last_played_at: r.last_played_at,
    }));
  }

  async getXpHistory(userId: string, period: 'day' | 'week' | 'month' = 'week') {
    const { data, error } = await this.supabase
      .from('user_xp_logs')
      .select('id, xp_amount, earned_at')
      .eq('user_id', userId)
      .order('earned_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);

    const rows = data || [];
    const map = new Map<string, number>();
    for (const r of rows) {
      const dt = new Date(r.earned_at);
      const key = dt.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + (r.xp_amount || 0));
    }

    const points = Array.from(map.entries()).map(([date, xp]) => ({ date, xp }));
    const total = points.reduce((s, p) => s + p.xp, 0);
    return { period, data: points, total_xp_period: total };
  }

  async getRecentAttempts(userId: string, limit = 10, cursor?: string) {
    let q = this.supabase
      .from('attempts')
      .select('id, score, submitted_at, quizzes(id, title, thumbnail_url)')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (cursor) q = q.lt('submitted_at', cursor);

    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getUserBadges(userId: string) {
    const [unlockedRes, lockedRes] = await Promise.all([
      this.supabase
        .from('user_badges')
        .select('id, badge_id, earned_at, badges(id, key, name, description, icon_url, rarity, xp_reward)')
        .eq('user_id', userId),
      this.supabase
        .from('badges')
        .select('id, key, name, description, icon_url, rarity, xp_reward')
        .eq('is_active', true),
    ]);

    if (unlockedRes.error) throw new BadRequestException(unlockedRes.error.message);
    if (lockedRes.error) throw new BadRequestException(lockedRes.error.message);

    const unlocked = (unlockedRes.data || []).map((r: any) => ({
      id: r.badges?.id || r.badge_id,
      key: r.badges?.key,
      name: r.badges?.name,
      description: r.badges?.description,
      icon_url: r.badges?.icon_url,
      rarity: r.badges?.rarity,
      xp_reward: r.badges?.xp_reward,
      earned_at: r.earned_at,
    }));

    const unlockedIds = new Set(unlocked.map((b) => b.id));
    const locked = (lockedRes.data || []).filter((b: any) => !unlockedIds.has(b.id));

    return { unlocked, locked };
  }

  async getActivityFeed(userId: string, limit = 20, cursor?: string) {
    let q = this.supabase
      .from('activity_logs')
      .select('id, type, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) q = q.lt('created_at', cursor);

    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getMilestones(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, total_xp, total_badges, user_level')
      .eq('id', userId)
      .single();

    if (error || !data) throw new NotFoundException('User not found');
    return {
      total_xp: data.total_xp || 0,
      total_badges: data.total_badges || 0,
      user_level: data.user_level || 1,
    };
  }

  async getFullProfile(userId: string) {
    const [profile, categories, badges, recentAttempts, activity] = await Promise.all([
      this.getUser(userId),
      this.getCategoryStats(userId),
      this.getUserBadges(userId),
      this.getRecentAttempts(userId, 5),
      this.getActivityFeed(userId, 10),
    ]);

    return {
      profile,
      categories,
      badges,
      recentAttempts,
      activity,
    };
  }
}
