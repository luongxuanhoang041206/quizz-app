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
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

type PublicQuizQuery = {
  page?: string;
  limit?: string;
  sort?: string;
  keyword?: string;
};

@Injectable()
export class QuizService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getPublicQuizzes(query: PublicQuizQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const sortMap = {
      oldest: { column: 'created_at', ascending: true },
      title: { column: 'title', ascending: true },
      newest: { column: 'created_at', ascending: false },
    };
    const sort = sortMap[query.sort || 'newest'] ?? sortMap.newest;

    let request = this.supabase
      .from('quizzes')
      .select(
        'id, title, description, creator_id, is_public, created_at, users(id, username, avatar_url)',
        {
          count: 'exact',
        },
      )
      .eq('is_public', true);

    if (query.keyword) {
      request = request.or(
        `title.ilike.%${query.keyword}%,description.ilike.%${query.keyword}%`,
      );
    }

    const { data, error, count } = await request
      .order(sort.column, { ascending: sort.ascending })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);

    return {
      data,
      meta: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  async searchQuizzes(keyword?: string) {
    return this.getPublicQuizzes({ keyword, limit: '20' });
  }

  async createQuiz(userId: string, dto: CreateQuizDto) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .insert({
        title: dto.title,
        description: dto.description,
        is_public: dto.is_public ?? false,
        creator_id: userId,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

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

    if (error) throw new NotFoundException(error.message);

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

    const { data, error } = await this.supabase
      .from('questions')
      .insert({
        ...dto,
        quiz_id: quizId,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
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
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async deleteQuestion(questionId: string, userId: string) {
    const question = await this.getQuestion(questionId);
    await this.ensureQuizOwner(question.quiz_id, userId);

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
}
