import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "src/database/database.module";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";

@Injectable()
export class LeaderboardService {
    constructor(
        @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient
    ) {}

    private calScore(isCorrect: boolean, timeTaken: number, timeLimit: number): number {
        if(!isCorrect) return 0;

        const ratio = 1 - timeTaken / timeLimit;
        return Math.round(500 + 500 * ratio);
    }

    async submitAnswer(sessionId: string, userId: string, dto: SubmitAnswerDto) {

        const { data: session, error: sessionError } = await this.supabase
            .from('quiz_sessions')
            .select('id, status')
            .eq('id', sessionId)
            .single();

        if(sessionError || !session) throw new NotFoundException('Session ko ton tai');
        if (session.status !== 'playing') throw new BadRequestException('Session chưa bắt đầu hoặc đã kết thúc');

        const { data: question, error: questionError } = await this.supabase
            .from('questions')
            .select('id, type, correct_answer, time_limit')
            .eq('id', dto.question_id)
            .single();
        
        if(questionError || !question) throw new NotFoundException('Cau hoi ko ton tai');

        const isCorrect = question.correct_answer === dto.answer;
        const score = this.calScore(isCorrect, dto.time_taken, question.time_limit);

        const { data: current } = await this.supabase
            .from('leaderboard')
            .select('id, score')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .single();

            const newScore = (current?.score || 0) + score;

            const { data: leaderboard, error: upsertError } = await this.supabase
            .from('leaderboard')
            .upsert({
                session_id: sessionId,
                user_id: userId,
                score: newScore,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'session_id, user_id', // unique constraint
            })
            .select('score')
            .single();

            if (upsertError) throw new BadRequestException('Không thể cập nhật điểm');

            return {
                is_correct: isCorrect,
                score_gained: score,
                total_score: leaderboard.score,
        };
    }
    // GET /sessions/:id/leaderboard
        async getLeaderboard(sessionId: string) {
            const { data, error } = await this.supabase
            .from('leaderboard')
            .select(`
                score,
                updated_at,
                users(id, username)
            `)
            .eq('session_id', sessionId)
            .order('score', { ascending: false });

            if (error) throw new BadRequestException('Không thể tải leaderboard');
            // Thêm rank vào kết quả
            return (data || []).map((item: any, index: number) => ({
            rank: index + 1,
            score: item.score,
            user: {
                id: item.users?.id,
                username: item.users?.username,
               // avatar_url: item.users?.avatar_url,
            },
            }));
        }
}