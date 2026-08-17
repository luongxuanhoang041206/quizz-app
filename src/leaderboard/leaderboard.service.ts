import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "src/database/database.module";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";
import { QuizGradingService } from "src/quiz-grading/quiz-grading.service";
import { finished } from "stream";

@Injectable()
export class LeaderboardService {
    constructor(
        @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
        private readonly quizGradingService: QuizGradingService,
    ) { }

    async submitAnswer(sessionId: string, userId: string, dto: SubmitAnswerDto) {

        const { data: session, error: sessionError } = await this.supabase
            .from('quiz_sessions')
            .select('id, quiz_id, status')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) throw new NotFoundException('Session ko ton tai');
        if (session.status !== 'playing') throw new BadRequestException('Session chưa bắt đầu hoặc đã kết thúc');

        const { data: participant, error: participantError } = await this.supabase
            .from('leaderboard')
            .select('id, score')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .single();

        if (participantError || !participant) {
            throw new BadRequestException('Bạn chưa tham gia session này');
        }

        const { data: answered, error: answeredError } = await this.supabase
            .from('session_answers')
            .select('id')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .eq('question_id', dto.question_id)
            .maybeSingle();

        if (answeredError) {
            throw new BadRequestException('Không thể kiểm tra câu trả lời trước đó');
        }

        if (answered) {
            throw new BadRequestException('Bạn đã trả lời câu hỏi này rồi');
        }

        const { data: question, error: questionError } = await this.supabase
            .from('questions')
            .select('id, quiz_id, type, correct_answer, time_limit, options')
            .eq('id', dto.question_id)
            .single();

        if (questionError || !question) throw new NotFoundException('Cau hoi ko ton tai');
        if (question.quiz_id !== session.quiz_id) throw new BadRequestException('Câu hỏi không thuộc session này');

        const gradingResult = this.quizGradingService.gradeQuestion(question, dto.answer, dto.time_taken);
        const isCorrect = gradingResult.isCorrect;
        const score = gradingResult.score;

        const { data: dataSessAns ,error: insertAnswerError } = await this.supabase
            .from('session_answers')
            .insert({
                session_id: sessionId,
                user_id: userId,
                question_id: dto.question_id,
                answer: dto.answer,
                is_correct: isCorrect,
                score,
                created_at: new Date().toISOString(),
            })
            .select("*")
            .eq("session_id", sessionId)
            .eq("user_id", userId);
    
        const { data: dataQuesQuiz  } = await this.supabase
            .from('question')
            .select("*")
            .eq("quiz_id", question.quiz_id);

        let finished = (dataSessAns == dataQuesQuiz ? true : false);

        if (insertAnswerError) {
            throw new BadRequestException('Không thể lưu câu trả lời session');
        }

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
                onConflict: 'session_id,user_id',
            })
            .select('score')
            .single();

        if (upsertError) throw new BadRequestException('Không thể cập nhật điểm');



        return {
            is_correct: isCorrect,
            score_gained: score,
            total_score: leaderboard?.score,
            finished: finished,
        };
    }

    async finishQuiz(sessionId: string, userId: string) {
        // 1. Lấy quiz của session
        const { data: session } = await this.supabase
            .from('quiz_sessions')
            .select('quiz_id')
            .eq('id', sessionId)
            .single();

        if (!session) {
            throw new NotFoundException('Session không tồn tại');
        }

        // 2. Đếm tổng số câu hỏi
        const { count: totalQuestions } = await this.supabase
            .from('questions')
            .select('*', {
            count: 'exact',
            head: true,
            })
            .eq('quiz_id', session.quiz_id);

        // 3. Kiểm tra user đã trả lời đủ chưa
        const { data: answers } = await this.supabase
            .from('session_answers')
            .select('id')
            .eq('session_id', sessionId)
            .eq('user_id', userId);

        if ((answers?.length ?? 0) < (totalQuestions ?? 0)) {
            throw new BadRequestException('Bạn chưa hoàn thành tất cả câu hỏi');
        }

        // 4. Lấy điểm hiện tại
        const { data: leaderboard } = await this.supabase
            .from('leaderboard')
            .select('score')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .single();

        const userScore = leaderboard?.score ?? 0;
        const maxScore = (totalQuestions ?? 0) * 1000;
        const percentage = maxScore > 0 ? (userScore / maxScore) * 100 : 0;

        // 5. Lấy reward
        const { data: quiz } = await this.supabase
            .from('quizzes')
            .select('reward_id')
            .eq('id', session.quiz_id)
            .single();

        const nftEligible = percentage >= 80;

        let achievementId: string | null = null;

        if (nftEligible && quiz?.reward_id) {
            // Kiểm tra đã có achievement chưa
            const { data: existed } = await this.supabase
            .from('achievement')
            .select('id,status')
            .eq('user_id', userId)
            .eq('quiz_id', session.quiz_id)
            .maybeSingle();

            if (existed) {
            achievementId = existed.id;
            } else {
            const { data: achievement, error } = await this.supabase
                .from('achievement')
                .insert({
                user_id: userId,
                quiz_id: session.quiz_id,
                reward_id: quiz.reward_id,
                status: 'PENDING',
                created_at: new Date().toISOString(),
                })
                .select('id')
                .single();

            if (error) {
                throw new BadRequestException(error.message);
            }

            achievementId = achievement.id;
            }
        }

        return {
            finished: true,
            total_score: userScore,
            max_score: maxScore,
            percentage: Number(percentage.toFixed(2)),
            nft_eligible: nftEligible,
            achievement_id: achievementId,
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

        if (error) {
            console.log('SUPABASE ERROR:', error);
            throw new BadRequestException(error.message);
        }
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
    async countPlayer(sessionId: string) {
        const { count, error } = await this.supabase
            .from('leaderboard')
            .select('*', {
                count: 'exact',
                head: true,
            })
            .eq('session_id', sessionId);
        return {
            count
        };
    }
}