/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { QueryQuizDto } from './dto/query-quiz.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { toggleQuestionDto } from './dto/toggleQuestion.dto';


@Injectable()
export class QuizService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getPublicQuizzes(query: QueryQuizDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 10;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      oldest: { column: 'created_at', ascending: true  },
      title:  { column: 'title',      ascending: true  },
      newest: { column: 'created_at', ascending: false },
    };
    const sort = sortMap[query.sort ?? 'newest'] ?? sortMap.newest;

    let request = this.supabase
      .from('quizzes')
      .select(
        'id, title, description, category, difficulty, tags, creator_id, visibility, created_at, users!creator_id(id, username, avatar_url)',
        { count: 'exact' },
      )
      .eq('visibility', 'public');

    if (query.search) {
      request = request.or(
        `title.ilike.%${query.search}%,description.ilike.%${query.search}%`,
      );
    }

    if (query.category) {
      request = request.ilike('category', `%${query.category}%`);
    }

    if (query.difficulty) {
      request = request.eq('difficulty', query.difficulty);
    }

    const { data, error, count } = await request
      .order(sort.column, { ascending: sort.ascending })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);

    const total      = count ?? 0;
    const totalPages = Math.ceil(total / limit);
    return {
      items: data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async searchQuizzes(keyword?: string) {
    return this.getPublicQuizzes({ search: keyword });
  }

  async createQuiz(userId: string, dto: CreateQuizDto) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .insert({
        title: dto.title,
        description: dto.description,
        visibility: dto.visibility ?? 'private',
        creator_id: userId,
        category: dto.category,
        difficulty: dto.difficulty,
        tags: dto.tags ?? [],
        total_time: dto.total_time ?? dto.total_time,
        time_per_question: dto.time_per_question,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    if (dto.questions && Array.isArray(dto.questions) && dto.questions.length > 0) {
      const questionsPayload = dto.questions.map((q, idx) => ({
        question_text: q.question_text,
        type: q.type,
        points: q.points,
        explanation: q.explanation,
        options: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer ?? null,
        order_index: typeof q.order_index === 'number' ? q.order_index : idx,
        quiz_id: data.id,
      }));

      const { data: createdQuestions, error: qError } = await this.supabase
        .from('questions')
        .insert(questionsPayload)
        .select();

      if (qError || !createdQuestions) {
        // attempt cleanup: delete the created quiz to avoid dangling records
        await this.supabase.from('quizzes').delete().eq('id', data.id);
        throw new BadRequestException(qError?.message ?? 'Failed to create questions');
      }

      // Build answers payloads for insertion into `answers` table
      const answersPayload: any[] = [];

      for (let i = 0; i < createdQuestions.length; i++) {
        const created = createdQuestions[i];
        const src = dto.questions[i];
        const options = Array.isArray(src.options) ? src.options : [];

        // Determine correct indices/values from src.correct_answer
        const correct = src.correct_answer;

        const correctIndices: number[] = [];
        if (correct) {
          if (Array.isArray((correct as any).indices)) {
            (correct as any).indices.forEach((n: number) => correctIndices.push(n));
          } else if (typeof (correct as any).index === 'number') {
            correctIndices.push((correct as any).index);
          } else if (Array.isArray((correct as any).values)) {
            (correct as any).values.forEach((val: any) => {
              const idx = options.indexOf(val);
              if (idx >= 0) correctIndices.push(idx);
            });
          } else if (typeof (correct as any).value === 'string') {
            const idx = options.indexOf((correct as any).value);
            if (idx >= 0) correctIndices.push(idx);
          } else if (typeof correct === 'string') {
            const idx = options.indexOf(correct as any);
            if (idx >= 0) correctIndices.push(idx);
          }
        }

        for (let j = 0; j < options.length; j++) {
          answersPayload.push({
            question_id: created.id,
            text: options[j],
            is_correct: correctIndices.includes(j),
          });
        }
      }

      if (answersPayload.length > 0) {
        const { error: aError } = await this.supabase.from('answers').insert(answersPayload);
        if (aError) {
          // cleanup created questions and quiz
          await this.supabase.from('questions').delete().eq('quiz_id', data.id);
          await this.supabase.from('quizzes').delete().eq('id', data.id);
          throw new BadRequestException(aError.message);
        }
      }
    }

    return data;
  }

  async getQuiz(quizId: string) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select(
        `
          *,
          users(id, username, avatar_url),
          questions(*)
        `,
      )
      .eq('id', quizId)
      .single();

    if (error || !data) throw new NotFoundException('Quiz not found');

    if (Array.isArray(data.questions)) {
      data.questions.sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
      );
    }

    return data;
  }

  async updateQuiz(quizId: string, userId: string, dto: UpdateQuizDto) {
    await this.ensureQuizOwner(quizId, userId);

    const { data, error } = await this.supabase
      .from('quizzes')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quizId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async deleteQuiz(quizId: string, userId: string) {
    await this.ensureQuizOwner(quizId, userId);

    const { error } = await this.supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Quiz deleted successfully' };
  }

  async createQuestion(quizId: string, userId: string, dto: CreateQuestionDto) {
    await this.ensureQuizOwner(quizId, userId);
    // insert question (without embedding options/correct_answer)
    const { data: createdQuestion, error: qError } = await this.supabase
      .from('questions')
      .insert({
        question_text: dto.question_text,
        type: dto.type,
        points: dto.points,
        explanation: dto.explanation,
        options: Array.isArray(dto.options) ? dto.options : [],
        correct_answer: dto.correct_answer ?? null,
        order_index: dto.order_index,
        quiz_id: quizId,
      })
      .select()
      .single();

    if (qError || !createdQuestion) throw new BadRequestException(qError?.message);

    // insert answers if provided
    const options = Array.isArray(dto.options) ? dto.options : [];
    const answersPayload: any[] = [];

    // determine correct indices/values
    const correct = dto.correct_answer;
    const correctIndices: number[] = [];
    if (correct) {
      if (Array.isArray((correct as any).indices)) {
        (correct as any).indices.forEach((n: number) => correctIndices.push(n));
      } else if (typeof (correct as any).index === 'number') {
        correctIndices.push((correct as any).index);
      } else if (Array.isArray((correct as any).values)) {
        (correct as any).values.forEach((val: any) => {
          const idx = options.indexOf(val);
          if (idx >= 0) correctIndices.push(idx);
        });
      } else if (typeof (correct as any).value === 'string') {
        const idx = options.indexOf((correct as any).value);
        if (idx >= 0) correctIndices.push(idx);
      } else if (typeof correct === 'string') {
        const idx = options.indexOf(correct as any);
        if (idx >= 0) correctIndices.push(idx);
      }
    }

    for (let j = 0; j < options.length; j++) {
      answersPayload.push({ question_id: createdQuestion.id, text: options[j], is_correct: correctIndices.includes(j) });
    }

    if (answersPayload.length > 0) {
      const { error: aError } = await this.supabase.from('answers').insert(answersPayload);
      if (aError) {
        // cleanup created question
        await this.supabase.from('questions').delete().eq('id', createdQuestion.id);
        throw new BadRequestException(aError.message);
      }
    }

    return createdQuestion;
  }

  async updateQuestion(
    questionId: string,
    userId: string,
    dto: UpdateQuestionDto,
  ) {
    const question = await this.getQuestion(questionId);
    await this.ensureQuizOwner(question.quiz_id, userId);
    const { data, error } = await this.supabase
      .from('questions')
      .update({
        question_text: dto.question_text,
        type: dto.type,
        points: dto.points,
        explanation: dto.explanation,
        order_index: dto.order_index,
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error || !data) throw new BadRequestException(error?.message);

    // If options are provided, replace answers for this question
    if (Array.isArray((dto as any).options)) {
      // delete old answers
      await this.supabase.from('answers').delete().eq('question_id', questionId);

      const options = (dto as any).options as any[];
      const correct = (dto as any).correct_answer;
      const correctIndices: number[] = [];
      if (correct) {
        if (Array.isArray((correct as any).indices)) {
          (correct as any).indices.forEach((n: number) => correctIndices.push(n));
        } else if (typeof (correct as any).index === 'number') {
          correctIndices.push((correct as any).index);
        } else if (Array.isArray((correct as any).values)) {
          (correct as any).values.forEach((val: any) => {
            const idx = options.indexOf(val);
            if (idx >= 0) correctIndices.push(idx);
          });
        } else if (typeof (correct as any).value === 'string') {
          const idx = options.indexOf((correct as any).value);
          if (idx >= 0) correctIndices.push(idx);
        } else if (typeof correct === 'string') {
          const idx = options.indexOf(correct as any);
          if (idx >= 0) correctIndices.push(idx);
        }
      }

      const answersPayload: any[] = [];
      for (let j = 0; j < options.length; j++) {
        answersPayload.push({ question_id: questionId, text: options[j], is_correct: correctIndices.includes(j) });
      }

      if (answersPayload.length > 0) {
        const { error: aError } = await this.supabase.from('answers').insert(answersPayload);
        if (aError) throw new BadRequestException(aError.message);
      }
    }

    return data;
  }

  async deleteQuestion(questionId: string, userId: string) {
    const question = await this.getQuestion(questionId);
    await this.ensureQuizOwner(question.quiz_id, userId);
    // delete answers first
    await this.supabase.from('answers').delete().eq('question_id', questionId);

    const { error } = await this.supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Question deleted successfully' };
  }

  async reorderQuestions(
    quizId: string,
    userId: string,
    dto: ReorderQuestionsDto,
  ) {
    await this.ensureQuizOwner(quizId, userId);

    const updates = dto.questions.map((question) =>
      this.supabase
        .from('questions')
        .update({ order_index: question.order_index })
        .eq('id', question.id)
        .eq('quiz_id', quizId),
    );

    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;

    if (error) throw new BadRequestException(error.message);

    return { message: 'Questions reordered successfully' };
  }

  private async ensureQuizOwner(quizId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('id, creator_id')
      .eq('id', quizId)
      .single();

    if (error || !data) throw new NotFoundException('Quiz not found');

    this.assertOwner(data.creator_id, userId);

    return data;
  }

  private async getQuestion(questionId: string) {
    const { data, error } = await this.supabase
      .from('questions')
      .select('id, quiz_id')
      .eq('id', questionId)
      .single();

    if (error || !data) throw new NotFoundException('Question not found');

    return data;
  }

  private assertOwner(creatorId: string | undefined, userId: string) {
    if (creatorId !== userId) {
      throw new ForbiddenException('Only quiz creator can do this action');
    }
  }

  async updateAnswer(answerId: string, userId: string, dto: UpdateAnswerDto) {
    // Resolve ownership: answer -> question -> quiz
    const { data: answer, error: aFetchErr } = await this.supabase
      .from('answers')
      .select('id, question_id')
      .eq('id', answerId)
      .single();

    if (aFetchErr || !answer) throw new NotFoundException('Answer not found');

    const question = await this.getQuestion(answer.question_id);
    await this.ensureQuizOwner(question.quiz_id, userId);

    const payload: Record<string, unknown> = {};
    if (dto.text !== undefined) payload.text = dto.text;
    if (dto.is_correct !== undefined) payload.is_correct = dto.is_correct;

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    const { data, error } = await this.supabase
      .from('answers')
      .update(payload)
      .eq('id', answerId)
      .select()
      .single();

    if (error || !data) throw new BadRequestException(error?.message ?? 'Failed to update answer');

    return data;
  }

  async deleteAnswer(answerId: string, userId: string) {
    const { data: answer, error: aFetchErr } = await this.supabase
      .from('answers')
      .select('id, question_id')
      .eq('id', answerId)
      .single();

    if (aFetchErr || !answer) throw new NotFoundException('Answer not found');

    const question = await this.getQuestion(answer.question_id);
    await this.ensureQuizOwner(question.quiz_id, userId);

    const { error } = await this.supabase
      .from('answers')
      .delete()
      .eq('id', answerId);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Answer deleted successfully' };
  }

  async toggle(quizId: string, userId: string, dto: toggleQuestionDto) {
    await this.ensureQuizOwner(quizId, userId);

    const { data: current, error: fetchError } = await this.supabase
      .from('quizzes')
      .select('visibility')
      .eq('id', quizId)
      .single();

    if (fetchError || !current) throw new NotFoundException('Quiz not found');

    const currentVisibility: 'private' | 'public' = current.visibility ?? 'private';
    const newVisibility: 'private' | 'public' = dto.visibility
      ? dto.visibility
      : currentVisibility === 'public'
      ? 'private'
      : 'public';

    const { data, error } = await this.supabase
      .from('quizzes')
      .update({ visibility: newVisibility, updated_at: new Date().toISOString() })
      .eq('id', quizId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }
}
