import { Inject, Injectable } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "src/database/database.module";

@Injectable()
export class BadgeService {
    constructor(
        @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    ) {}
    async checkAndAwardBadges(userId: string) {
        const [userRes, badgeRes, userBadgeRes] = await Promise.all([
            this.supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single(),

            this.supabase
                .from('badges')
                .select('*')
                .eq('is_active', true),

            this.supabase
                .from('user-badges')
                .select('badge_id')
                .eq('user_id', userId),
        ]);    

        const user = userRes.data;
        const badges = badgeRes.data ?? [];

        const earnedBadgeIds = new Set(
            (userBadgeRes.data ?? []).map(b => b.badge_id)
        );

        const progressMap: Record<string, number> = {
            quizz_count: user.total_quizzes_played,
            streak: user.current_streak,
            xp: user.total_xp,
            perfect: user.perfect_scores,
        };

        const newBadges = badges.filter(
            badge => !earnedBadgeIds.has(badge.id) && 
            (progressMap[badge.condition_type] ?? 0) >= 
                badge.condition_value,
        );

        if (!newBadges.length) return;

        const totalBadgeXp = newBadges.reduce(
        (sum, badge) => sum + badge.xp_reward,
        0,
        );

        // insert user_badges
        await this.supabase.from('user_badges').insert(
        newBadges.map(badge => ({
            user_id: userId,
            badge_id: badge.id,
        })),
        );

        // insert xp logs
        await this.supabase.from('user_xp_logs').insert(
        newBadges.map(badge => ({
            user_id: userId,
            xp_amount: badge.xp_reward,
            source_type: 'badge',
            source_id: badge.id,
        })),
        );

        // insert activity logs
        await this.supabase.from('activity_logs').insert(
        newBadges.map(badge => ({
            user_id: userId,
            type: 'badge_unlocked',
            metadata: {
            badge_key: badge.key,
            badge_name: badge.name,
            rarity: badge.rarity,
            },
        })),
        );

        // update user
        await this.supabase
        .from('users')
        .update({
            total_xp: user.total_xp + totalBadgeXp,
            total_badges: user.total_badges + newBadges.length,
        })
        .eq('id', userId);
    }
}