import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/database.module';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { UpdateAttemptDto } from './dto/update-attempt.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

enum AttemptStatus {
  Started = 'started',
  Completed = 'completed',
}

interface Question {
  id: string;
  correct_answer: string;
  points: number;
  explanation?: string;
}

interface UserAnswer {
  question_id: string;
  selected_option: string;
}

@Injectable()
export class AttemptsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) { }

  /**
   * Tạo một attempt mới (bắt đầu làm quiz)
   */
  async create(userId: string, createAttemptDto: CreateAttemptDto) {
    // Kiểm tra quiz tồn tại
    const { data: quiz, error: quizError } = await this.supabase
      .from('quizzes')
      .select('id, visibility')
      .eq('id', createAttemptDto.quiz_id)
      .eq('visibility', 'public')
      .single();

    if (quizError || !quiz) {
      throw new NotFoundException('Quiz không tồn tại hoặc chưa công khai');
    }

    // Tạo attempt mới với status = 'started'
    const { data: attempt, error: insertError } = await this.supabase
      .from('attempts')
      .insert({
        user_id: userId,
        quiz_id: createAttemptDto.quiz_id,
        status: AttemptStatus.Started,
        started_at: new Date().toISOString(),
        answers: {},
      })
      .select('id, user_id, quiz_id, status, started_at, answers')
      .single();

    if (insertError || !attempt) {
      throw new BadRequestException(insertError?.message || 'Tạo attempt thất bại');
    }

    return attempt;
  }

  /**
   * Nộp bài và chấm điểm
   * - So sánh answers của user với correct_answer từ bảng questions
   * - Tính score và total_points
   * - Cập nhật status = 'completed'
   * - Tăng play_count của quiz
   */
  async submit(attemptId: string, submitAttemptDto: SubmitAttemptDto, userId: string) {
    // Bước 1: Lấy thông tin attempt
    const { data: attempt, error: attemptError } = await this.supabase
      .from('attempts')
      .select('id, user_id, quiz_id, status')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      throw new NotFoundException('Attempt không tồn tại');
    }

    // Kiểm tra quyền sở hữu attempt
    if (attempt.user_id !== userId) {
      throw new BadRequestException('Bạn không có quyền truy cập attempt này');
    }

    // Kiểm tra status đang ở 'started'
    if (attempt.status !== AttemptStatus.Started) {
      throw new BadRequestException('Attempt đã hoàn thành rồi, không thể nộp lại');
    }

    // Bước 2: Lấy danh sách questions của quiz để kiểm tra đáp án
    const { data: questions, error: questionsError } = await this.supabase
      .from('questions')
      .select('id, correct_answer, points, explanation')
      .eq('quiz_id', attempt.quiz_id);

    if (questionsError || !questions || questions.length === 0) {
      throw new BadRequestException('Không thể tải danh sách câu hỏi');
    }

    // Bước 3: Tính điểm
    // Build map {question_id -> {correct_answer, points}}
    const questionMap: { [key: string]: Question } = {};
    let totalPoints = 0;

    questions.forEach((q) => {
      questionMap[q.id] = {
        id: q.id,
        correct_answer: q.correct_answer,
        points: q.points,
        explanation: q.explanation,
      };
      totalPoints += q.points;
    });

    // So sánh câu trả lời của user
    let score = 0;
    const answersMap: { [key: string]: UserAnswer & { is_correct: boolean } } = {};

    submitAttemptDto.answers.forEach((answer) => {
      const question = questionMap[answer.question_id];

      if (!question) {
        throw new BadRequestException(`Question ${answer.question_id} không tồn tại`);
      }

      const isCorrect = answer.selected_option === question.correct_answer;
      if (isCorrect) {
        score += question.points;
      }

      answersMap[answer.question_id] = {
        question_id: answer.question_id,
        selected_option: answer.selected_option,
        is_correct: isCorrect,
      };
    });

    // Bước 4: Cập nhật attempt với kết quả chấm điểm
    const { data: updatedAttempt, error: updateError } = await this.supabase
      .from('attempts')
      .update({
        status: AttemptStatus.Completed,
        answers: answersMap,
        score: score,
        total_points: totalPoints,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', attemptId)
      .select('id, user_id, quiz_id, status, score, total_points, submitted_at, answers')
      .single();

    if (updateError || !updatedAttempt) {
      throw new BadRequestException(updateError?.message || 'Cập nhật attempt thất bại');
    }

    // Bước 5: Tăng play_count của quiz
    // Lấy play_count hiện tại
    const { data: quizData } = await this.supabase
      .from('quizzes')
      .select('play_count')
      .eq('id', attempt.quiz_id)
      .single();

    if (quizData) {
      await this.supabase
        .from('quizzes')
        .update({ play_count: (quizData.play_count || 0) + 1 })
        .eq('id', attempt.quiz_id);
    }

    return {
      ...updatedAttempt,
      detail: {
        score,
        total_points: totalPoints,
        percentage: totalPoints > 0 ? ((score / totalPoints) * 100).toFixed(2) : '0.00',
      },
    };
  }

  /**
   * Lấy thông tin chi tiết của một attempt (kết quả làm bài)
   * Trả về attempt kèm thông tin chi tiết questions, answers, explanation
   */
  async findOne(attemptId: string, userId: string) {
    // Bước 1: Lấy thông tin attempt
    const { data: attempt, error: attemptError } = await this.supabase
      .from('attempts')
      .select('id, user_id, quiz_id, status, score, total_points, started_at, submitted_at, answers')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      throw new NotFoundException('Attempt không tồn tại');
    }

    // Kiểm tra quyền sở hữu attempt
    if (attempt.user_id !== userId) {
      throw new BadRequestException('Bạn không có quyền truy cập attempt này');
    }

    // Bước 2: Lấy danh sách questions và answers chi tiết
    const { data: questions, error: questionsError } = await this.supabase
      .from('questions')
      .select('id, content, correct_answer, points, explanation, options')
      .eq('quiz_id', attempt.quiz_id);

    if (questionsError || !questions) {
      throw new BadRequestException('Không thể tải danh sách câu hỏi');
    }

    // Bước 3: Ghép thông tin user answers với questions để trả về đầy đủ
    const answersDetail = questions.map((question) => {
      const userAnswer = attempt.answers[question.id];

      return {
        question_id: question.id,
        content: question.content,
        options: question.options,
        correct_answer: question.correct_answer,
        selected_option: userAnswer?.selected_option || null,
        is_correct: userAnswer?.is_correct || false,
        points: question.points,
        explanation: question.explanation,
      };
    });

    return {
      id: attempt.id,
      user_id: attempt.user_id,
      quiz_id: attempt.quiz_id,
      status: attempt.status,
      score: attempt.score,
      total_points: attempt.total_points,
      percentage: attempt.total_points > 0 ? ((attempt.score / attempt.total_points) * 100).toFixed(2) : '0.00',
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
      answers_detail: answersDetail,
    };
  }

  findAll() {
    return `This action returns all attempts`;
  }

  update(id: number, updateAttemptDto: UpdateAttemptDto) {
    return `This action updates a #${id} attempt`;
  }

  remove(id: number) {
    return `This action removes a #${id} attempt`;
  }
}

