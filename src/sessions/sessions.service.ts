import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "src/database/database.module";

@Injectable()
export class SessionsService {

    constructor(
        @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient
    ) {}

    private generateCode(): string {
        return Math.random().toString(36).substring(2,8).toUpperCase();
    }

    async createSession(quizId: string, hostId: string) {
        const { data: quiz, error: quizError} = await this.supabase
            .from('quizzes')
            .select('id, creator_id')
            .eq('id', quizId)
            .single();
        if(quizError || !quiz) throw new NotFoundException('Quiz ko ton tai');
        if(quiz.creator_id !== hostId) throw new ForbiddenException('Ban ko phai host');

        const code = this.generateCode();

        const{ data: session, error } = await this.supabase
            .from('quiz_sessions')
            .insert({
                quiz_id: quizId,
                host_id: hostId,
                code,
                status: 'waiting',
            })
            .select('id, code, status, created_at')
            .single();

            if (error) {
                console.error('Supabase error:', error);
                throw new BadRequestException(error.message);
            }

        return session;
    }

    async joinByCode(code: string, userId: string, username: string) {
        const { data: session, error } = await this.supabase
            .from('quiz_sessions')
            .select('id, quiz_id, host_id, status, code')
            .eq('code', code.toUpperCase())
            .single();

        if(error || !session) throw new NotFoundException('Khong tim thay phong');
        if(session.status === 'finished') throw new BadRequestException('Phong da ket thuc');

        await this.supabase
            .from('leaderboard')
            .insert({
                session_id: session.id,
                user_id: userId,
                score: 0,
                username: username,
            })
        return session;
    }

    // async start(code: string) {
    //     const { data: session, error } = await this.supabase
    //         .from('quiz-sessions')
    //         .select('status, code')
    //         .eq('code', code.toUpperCase())
    //         .single()

        
    //     if(error || !session) throw new NotFoundException('Khong tim thay phong');
    //     return session;
    // }


    async getSessionByQuiz(quizId: string) {
        const { data: session, error } = await this.supabase
            .from('quiz_sessions')
            .select('id, quiz_id, host_id, code, status, created_at')
            .eq('quiz_id', quizId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw new BadRequestException(error.message);
        }

        if (!session) {
            return [];
        }
        return session;
    }

    async getStatus(sessionId: string) {
        const { data: session, error } = await this.supabase
            .from('quiz_sessions')
            .select('id, status')
            .eq('id', sessionId)
            .single();

        if (error) {
            throw new BadRequestException(error.message);
        }

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        return {
            status: session.status
        };
    }

    // Patch
    async updateStatus(sessionId: string, hostId: string, status: string) {
        const { data: session, error: sessionError } = await this.supabase
            .from('quiz_sessions')
            .select('id, host_id, status')
            .eq('id', sessionId)
            .single();
        if(sessionError || !session) throw new NotFoundException('Session ko ton tai');
        if(session.host_id !== hostId) throw new ForbiddenException('M eo phai host');

        const flow = {
            waiting: 0,
            playing: 1,
            finished:2,
        };

        if(flow[status] <= flow[session.status]) throw new BadRequestException('Eo duoc di nguoc trang thai');

        const { data: updated, error } = await this.supabase
            .from('quiz_sessions')
            .update({ status })
            .eq('id', sessionId)
            .select('id, status')
            .single();

        if(error) throw new BadRequestException('Khong the cap nhat trang thai');
        return updated;
    }
} 

