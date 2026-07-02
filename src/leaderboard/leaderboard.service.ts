import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "src/database/database.module";
import { SubmitAnswerDto } from "./dto/submit-answer.dto";

@Injectable()
export class LeaderboardService {
    constructor(
        @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient
    ) { }

    private calScore(isCorrect: boolean, timeTaken: number, timeLimit: number): number {
        if (!isCorrect) return 0;

        const ratio = 1 - timeTaken / timeLimit;
        return Math.round(500 + 500 * ratio);
    }

    private isAnswerCorrect(question: any, submittedAnswer: unknown): boolean {
        if (!question || !question.correct_answer) return false;

        const correct = question.correct_answer;
        const options: string[] = Array.isArray(question.options) ? question.options : [];
        const qType = String(question.type).toUpperCase();

        const findOptionIndex = (value: unknown) =>
            options.findIndex((option) => String(option) === String(value));

        // 1. Resolve correct indices
        const correctIndices: number[] = [];
        const pushIndex = (value: unknown) => {
            const n = Number(value);
            if (!isNaN(n) && Number.isInteger(n) && n >= 0 && n < options.length) {
                if (!correctIndices.includes(n)) {
                    correctIndices.push(n);
                }
            }
        };

        if (typeof correct === 'object' && correct !== null) {
            const correctRecord = correct as Record<string, unknown>;
            if (Array.isArray(correctRecord.indices)) {
                correctRecord.indices.forEach((val) => pushIndex(val));
            } else if (typeof correctRecord.index === 'number') {
                pushIndex(correctRecord.index);
            } else if (typeof correctRecord.index === 'string') {
                pushIndex(correctRecord.index);
            }

            if (Array.isArray(correctRecord.values)) {
                correctRecord.values.forEach((val) => {
                    const idx = findOptionIndex(val);
                    if (idx >= 0) pushIndex(idx);
                });
            } else if (typeof correctRecord.value === 'string') {
                const idx = findOptionIndex(correctRecord.value);
                if (idx >= 0) pushIndex(idx);
            }
        }

        // 2. Standardize submittedAnswer to an index
        let submittedIndex: number | null = null;
        if (typeof submittedAnswer === 'number') {
            submittedIndex = submittedAnswer;
        } else if (typeof submittedAnswer === 'string') {
            const num = Number(submittedAnswer);
            if (!isNaN(num) && Number.isInteger(num) && num >= 0 && num < options.length) {
                submittedIndex = num;
            } else {
                const idx = findOptionIndex(submittedAnswer);
                if (idx >= 0) submittedIndex = idx;
            }
        } else if (typeof submittedAnswer === 'object' && submittedAnswer !== null) {
            const record = submittedAnswer as Record<string, unknown>;

            if (record.index !== undefined && record.index !== null) {
                const num = Number(record.index);
                if (!isNaN(num) && Number.isInteger(num) && num >= 0 && num < options.length) {
                    submittedIndex = num;
                }
            }

            if (submittedIndex === null && typeof record.value === 'string') {
                const idx = findOptionIndex(record.value);
                if (idx >= 0) submittedIndex = idx;
            }
        }

        // 3. Perform comparison depending on question type
        if (qType === 'SINGLE_CHOICE' || qType === 'MULTIPLE_CHOICE') {
            if (submittedIndex === null) return false;
            return correctIndices.includes(submittedIndex);
        }

        if (qType === 'TRUE_FALSE') {
            let correctBool = false;
            if (typeof correct === 'object' && correct !== null) {
                const c = correct as any;
                if ('value' in c) {
                    correctBool = !!c.value;
                } else if ('answer' in c) {
                    correctBool = !!c.answer;
                }
            } else if (correctIndices.length > 0) {
                const index = correctIndices[0];
                const optStr = String(options[index] ?? '').toLowerCase();
                correctBool = optStr === 'true';
            }

            let submittedBool: boolean | null = null;
            if (typeof submittedAnswer === 'boolean') {
                submittedBool = submittedAnswer;
            } else if (typeof submittedAnswer === 'string') {
                const s = submittedAnswer.toLowerCase();
                if (s === 'true') submittedBool = true;
                if (s === 'false') submittedBool = false;
            } else if (typeof submittedAnswer === 'object' && submittedAnswer !== null && 'value' in (submittedAnswer as any)) {
                // xử lý case { value: boolean }
                submittedBool = !!(submittedAnswer as any).value;
            } else if (submittedIndex !== null) {
                const optStr = String(options[submittedIndex] ?? '').toLowerCase();
                if (optStr === 'true') submittedBool = true;
                if (optStr === 'false') submittedBool = false;
            }

            return correctBool === submittedBool;
        }
        if (qType === 'FILL_BLANK' || qType === 'SHORT_TEXT') {
            let correctText = '';
            if (typeof correct === 'object' && correct !== null) {
                const c = correct as any;
                if ('value' in c) {
                    correctText = String(c.value);
                } else if ('answer' in c) {
                    correctText = String(c.answer);
                }
            } else if (typeof correct === 'string') {
                correctText = correct;
            }

            let submittedText = '';
            if (typeof submittedAnswer === 'object' && submittedAnswer !== null) {
                const s = submittedAnswer as any;
                if ('value' in s) {
                    submittedText = String(s.value);
                } else if ('answer' in s) {
                    submittedText = String(s.answer);
                }
            } else {
                submittedText = String(submittedAnswer ?? '');
            }

            return correctText.trim().toLowerCase() === submittedText.trim().toLowerCase();
        }
        return JSON.stringify(correct) === JSON.stringify(submittedAnswer);
    }

    async submitAnswer(sessionId: string, userId: string, dto: SubmitAnswerDto) {

        const { data: session, error: sessionError } = await this.supabase
            .from('quiz_sessions')
            .select('id, status')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) throw new NotFoundException('Session ko ton tai');
        if (session.status !== 'playing') throw new BadRequestException('Session chưa bắt đầu hoặc đã kết thúc');

        const { data: question, error: questionError } = await this.supabase
            .from('questions')
            .select('id, type, correct_answer, time_limit, options')
            .eq('id', dto.question_id)
            .single();

        if (questionError || !question) throw new NotFoundException('Cau hoi ko ton tai');

        const isCorrect = this.isAnswerCorrect(question, dto.answer);
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
                onConflict: 'session_id,user_id',
            })
            .select('score')
            .single();
        console.log(leaderboard);
        if (upsertError) throw new BadRequestException('Không thể cập nhật điểm');

        return {
            is_correct: isCorrect,
            score_gained: score,
            total_score: leaderboard?.score,
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