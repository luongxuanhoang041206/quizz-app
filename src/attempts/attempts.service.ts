import { BadRequestException, Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/database/database.module';

type AnswerDto = { question_id: string; answer: any };

@Injectable()
export class AttemptsService {
	constructor(
		@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
	) {}

	async startAttempt(userId: string, quizId: string) {
		const { data, error } = await this.supabase
			.from('attempts')
			.insert({
				user_id: userId,
				quiz_id: quizId,
				answers: [],
				score: 0,
				total_points: 0,
				status: 'started',
				started_at: new Date().toISOString(),
			})
			.select()
			.single();

		if (error) throw new BadRequestException(error.message);
		return data;
	}

	async submitAttempt(userId: string, attemptId: string, answers: AnswerDto[]) {
		// load attempt
		const { data: attempt, error: attemptError } = await this.supabase
			.from('attempts')
			.select('*')
			.eq('id', attemptId)
			.single();

		if (attemptError) throw new NotFoundException(attemptError.message);
		if (attempt.user_id !== userId) throw new ForbiddenException('Not allowed');
		if (attempt.status === 'submitted' || attempt.status === 'completed') {
			throw new BadRequestException('Attempt already submitted');
		}

		// fetch questions for quiz
		const { data: questions, error: qError } = await this.supabase
			.from('questions')
			.select('*')
			.eq('quiz_id', attempt.quiz_id);

		if (qError) throw new BadRequestException(qError.message);

		// build map of correct answers
		const qMap = new Map<string, any>();
		let totalPoints = 0;
		for (const q of questions || []) {
			qMap.set(q.id, q);
			totalPoints += Number(q.points || 0);
		}

		// compute score
		let score = 0;
		for (const a of answers || []) {
			const q = qMap.get(a.question_id);
			if (!q) continue;
			const correct = q.correct_answer;
			// simple equality check — supports string/number/boolean
			if (JSON.stringify(a.answer) === JSON.stringify(correct)) {
				score += Number(q.points || 0);
			}
		}

		const { data: updated, error: updateError } = await this.supabase
			.from('attempts')
			.update({
				answers,
				score,
				total_points: totalPoints,
				status: 'submitted',
				submitted_at: new Date().toISOString(),
			})
			.eq('id', attemptId)
			.select()
			.single();

		if (updateError) throw new BadRequestException(updateError.message);
		return { ...updated, calculated_score: score, total_points: totalPoints };
	}

	async getAttempt(userId: string, attemptId: string) {
		const { data, error } = await this.supabase
			.from('attempts')
			.select(`*, quizzes(id, title, description)`)
			.eq('id', attemptId)
			.single();

		if (error) throw new NotFoundException(error.message);
		if (data.user_id !== userId) throw new ForbiddenException('Not allowed');
		return data;
	}
}
