import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/database.module';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { UpdateAttemptDto } from './dto/update-attempt.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { XpService } from 'src/users/xp.service';
import { BadgeService } from 'src/users/badge.service';
import { ActivityService } from 'src/users/activity.service';
import { XpCalcParams } from 'src/users/types';

enum AttemptStatus {
  In_progres = 'in_progress',
  Submitted = 'submitted',
}

interface UserAnswer {
  question_id: string;
  selected_option: string;
}

@Injectable()
export class AttemptsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly xpService: XpService,
    private readonly badgeService: BadgeService,
    private readonly activityService: ActivityService,
  ) {}

  async create(userId: string, createAttemptDto: CreateAttemptDto) {
    const { data: quiz, error: quizError } = await this.supabase
      .from('quizzes')
      .select('id, title, description, visibility, total_time, time_per_question')
      .eq('id', createAttemptDto.quiz_id)
      .eq('visibility', 'public')
      .single();

    if (quizError || !quiz) {
      throw new NotFoundException(quizError?.message ?? 'Quiz không tồn tại hoặc chưa công khai');
    }

    const { data: attempt, error: insertError } = await this.supabase
      .from('attempts')
      .insert({
        user_id: userId,
        quiz_id: createAttemptDto.quiz_id,
        status: AttemptStatus.In_progres,
        started_at: new Date().toISOString(),
        answers: {},
      })
      .select('id, user_id, quiz_id, status, started_at, answers')
      .single();

    if (insertError || !attempt) {
      throw new BadRequestException(insertError?.message || 'Tạo attempt thất bại');
    }

    const { data: questions, error: questionsError } = await this.supabase
      .from('questions')
      .select('id, question_text, points, order_index, options')
      .eq('quiz_id', createAttemptDto.quiz_id)
      .order('order_index', { ascending: true });

    if (questionsError || !questions) {
      throw new BadRequestException('Không thể tải danh sách câu hỏi');
    }

    const questionsWithOptions = questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      points: q.points,
      order_index: q.order_index,
      options: Array.isArray(q.options)
        ? q.options.map((text: string, index: number) => ({ index, text }))
        : [],
    }));

    return {
      ...attempt,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        total_time: quiz.total_time,
        time_per_question: quiz.time_per_question,
        total_questions: questions.length,
      },
      questions: questionsWithOptions,
    };
  }

  async submit(attemptId: string, submitAttemptDto: SubmitAttemptDto, userId: string) {
    // Bước 1: Lấy thông tin attempt
    const { data: attempt, error: attemptError } = await this.supabase
      .from('attempts')
      .select('id, user_id, quiz_id, status, started_at')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      throw new NotFoundException('Attempt không tồn tại');
    }

    if (attempt.user_id !== userId) {
      throw new BadRequestException('Bạn không có quyền truy cập attempt này');
    }

    if (attempt.status !== AttemptStatus.In_progres) {
      throw new BadRequestException('Attempt đã hoàn thành rồi, không thể nộp lại');
    }

    // Bước 2: Lấy questions kèm correct_answer
    const { data: questions, error: questionsError } = await this.supabase
      .from('questions')
      .select('id, points, explanation, options, correct_answer')
      .eq('quiz_id', attempt.quiz_id);

    if (questionsError || !questions || questions.length === 0) {
      throw new BadRequestException('Không thể tải danh sách câu hỏi');
    }

    // Build questionMap với correctIndices
    const questionMap: {
      [key: string]: {
        id: string;
        points: number;
        explanation?: string;
        options: string[];
        correctIndices: number[];
      };
    } = {};
    let totalPoints = 0;

    questions.forEach((q) => {
      const options: string[] = Array.isArray(q.options) ? q.options : [];
      const correct = q.correct_answer ?? {};
      const correctIndices: number[] = [];

      // Support tất cả các format correct_answer từ DB:
      // { indices: [0, 1] }  — multi correct (seed data)
      // { index: 0 }         — single correct (FE tạo quiz)
      // { values: ['text'] } — text-based multi
      // { value: 'text' }    — text-based single
      // { answer: 'text' }   — free text (bỏ qua, không chấm được)
      if (Array.isArray(correct.indices)) {
        correct.indices.forEach((i: unknown) => {
          const n = Number(i);
          if (!isNaN(n)) correctIndices.push(n);
        });
      } else if (typeof correct.index === 'number') {
        correctIndices.push(correct.index);
      } else if (typeof correct.index === 'string') {
        // Phòng trường hợp index lưu dạng string "0"
        const n = Number(correct.index);
        if (!isNaN(n)) correctIndices.push(n);
      } else if (Array.isArray(correct.values)) {
        correct.values.forEach((val: unknown) => {
          const idx = options.indexOf(String(val));
          if (idx >= 0) correctIndices.push(idx);
        });
      } else if (typeof correct.value === 'string') {
        const idx = options.indexOf(correct.value);
        if (idx >= 0) correctIndices.push(idx);
      }

      // Log để debug
      console.log(`[submit] question ${q.id}:`, {
        correct_answer_raw: JSON.stringify(correct),
        correctIndices,
        options_count: options.length,
      });

      questionMap[q.id] = { id: q.id, points: q.points, explanation: q.explanation, options, correctIndices };
      totalPoints += q.points;
    });

    // Chấm điểm
    let score = 0;
    const answersMap: { [key: string]: { question_id: string; selected_answer_id: number; is_correct: boolean } } = {};

    submitAttemptDto.answers.forEach((answer) => {
      const question = questionMap[answer.question_id];

      if (!question) {
        throw new BadRequestException(`Question ${answer.question_id} không tồn tại trong quiz này`);
      }

      const selectedIndex = Number((answer as any).selected_answer_id);

      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= question.options.length) {
        throw new BadRequestException(
          `selected_answer_id "${(answer as any).selected_answer_id}" không hợp lệ — phải là index 0-based của options (0 đến ${question.options.length - 1})`,
        );
      }

      const isCorrect = question.correctIndices.includes(selectedIndex);

      // Log để debug
      console.log(`[submit] answer for ${answer.question_id}:`, {
        selectedIndex,
        correctIndices: question.correctIndices,
        isCorrect,
      });

      if (isCorrect) score += question.points;

      answersMap[answer.question_id] = {
        question_id: answer.question_id,
        selected_answer_id: selectedIndex,
        is_correct: isCorrect,
      };
    });

    // Cập nhật attempt
    const { data: updatedAttempt, error: updateError } = await this.supabase
      .from('attempts')
      .update({
        status: AttemptStatus.Submitted,
        answers: answersMap,
        score,
        total_points: totalPoints,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', attemptId)
      .select('id, user_id, quiz_id, status, score, total_points, submitted_at, answers')
      .single();

    if (updateError || !updatedAttempt) {
      throw new BadRequestException(updateError?.message || 'Cập nhật attempt thất bại');
    }

    // Tăng play_count
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

    // Progression
    const totalQuestions = questions.length;
    const correctAnswersCount = Object.values(answersMap).filter((a) => a.is_correct).length;
    const isPerfect = score === totalPoints;

    const { data: userRes, error: userErr } = await this.supabase
      .from('users')
      .select('id, total_xp, level, current_level_xp, next_level_xp, current_streak, best_streak, total_quizzes_played, total_questions_answered, correct_answers, perfect_scores, total_play_time')
      .eq('id', userId)
      .single();

    const user = userRes;
    if (!user || userErr) {
      return {
        ...updatedAttempt,
        detail: {
          score,
          total_points: totalPoints,
          percentage: totalPoints > 0 ? ((score / totalPoints) * 100).toFixed(2) : '0.00',
        },
      };
    }

    const startedAt = attempt.started_at ? new Date(attempt.started_at) : null;
    const submittedAt = updatedAttempt.submitted_at ? new Date(updatedAttempt.submitted_at) : new Date();
    const durationSeconds = startedAt
      ? Math.max(0, Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000))
      : undefined;

    const xpParams: XpCalcParams = {
      score,
      totalQuestions,
      isPerfect,
      currentStreak: user.current_streak ?? 0,
    };

    const xpEarned = this.xpService.calculate(xpParams as any);
    const newTotalXp = (user.total_xp || 0) + xpEarned;
    const levelResult = this.xpService.computeLevel(newTotalXp, user.level || 1);

    const newCurrentStreak = isPerfect ? (user.current_streak || 0) + 1 : 0;
    const newBestStreak = Math.max(user.best_streak || 0, newCurrentStreak);

    await this.supabase.from('users').update({
      total_xp: newTotalXp,
      level: levelResult.newLevel,
      current_level_xp: levelResult.newCurrentXp,
      next_level_xp: levelResult.newNextXp,
      current_streak: newCurrentStreak,
      best_streak: newBestStreak,
      total_quizzes_played: (user.total_quizzes_played || 0) + 1,
      total_questions_answered: (user.total_questions_answered || 0) + totalQuestions,
      correct_answers: (user.correct_answers || 0) + correctAnswersCount,
      perfect_scores: (user.perfect_scores || 0) + (isPerfect ? 1 : 0),
      total_play_time: (user.total_play_time || 0) + (durationSeconds || 0),
      last_activity_date: submittedAt.toISOString(),
    }).eq('id', userId);

    await this.supabase.from('user_xp_logs').insert({
      user_id: userId,
      xp_amount: xpEarned,
      source_type: 'attempt',
      source_id: attemptId,
      created_at: new Date().toISOString(),
    });

    await this.activityService.logQuizCompleted({
      userId,
      attemptId,
      quizId: attempt.quiz_id,
      score,
      totalPoints,
      percentage: totalPoints > 0 ? Number(((score / totalPoints) * 100).toFixed(2)) : 0,
      correctAnswers: correctAnswersCount,
      isPerfect,
      xpEarned,
      durationSeconds,
    });

    await this.badgeService.checkAndAwardBadges(userId);

    return {
      ...updatedAttempt,
      detail: {
        score,
        total_points: totalPoints,
        percentage: totalPoints > 0 ? ((score / totalPoints) * 100).toFixed(2) : '0.00',
        xp_earned: xpEarned,
        is_perfect: isPerfect,
        correct_answers: correctAnswersCount,
        duration_seconds: durationSeconds,
      },
    };
  }

  async findOne(attemptId: string, userId: string) {
    const { data: attempt, error: attemptError } = await this.supabase
      .from('attempts')
      .select('id, user_id, quiz_id, status, score, total_points, started_at, submitted_at, answers')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      throw new NotFoundException('Attempt không tồn tại');
    }

    if (attempt.user_id !== userId) {
      throw new BadRequestException('Bạn không có quyền truy cập attempt này');
    }

    const { data: questions, error: questionsError } = await this.supabase
      .from('questions')
      .select('id, question_text, points, explanation, options, correct_answer')
      .eq('quiz_id', attempt.quiz_id);

    if (questionsError || !questions) {
      throw new BadRequestException('Không thể tải danh sách câu hỏi');
    }

    // Build answers_detail dùng questions.options jsonb (không dùng bảng answers nữa)
    const answersDetail = questions.map((question) => {
      const options: string[] = Array.isArray(question.options) ? question.options : [];
      const correct = question.correct_answer ?? {};
      const userAnswer = attempt.answers?.[question.id];

      // Parse correct index
      let correctIndex: number | null = null;
      if (Array.isArray(correct.indices) && correct.indices.length > 0) {
        correctIndex = Number(correct.indices[0]);
      } else if (typeof correct.index === 'number') {
        correctIndex = correct.index;
      } else if (typeof correct.index === 'string') {
        correctIndex = Number(correct.index);
      } else if (typeof correct.value === 'string') {
        correctIndex = options.indexOf(correct.value);
      } else if (Array.isArray(correct.values) && correct.values.length > 0) {
        correctIndex = options.indexOf(String(correct.values[0]));
      }

      const correctAnswerText = correctIndex !== null && correctIndex >= 0 ? options[correctIndex] : null;
      const selectedIndex: number | null = userAnswer?.selected_answer_id ?? null;
      const selectedAnswerText = selectedIndex !== null && selectedIndex >= 0 ? options[selectedIndex] : null;

      return {
        question_id: question.id,
        question_text: question.question_text,
        options: options.map((text, i) => ({ index: i, text })),
        correct_answer: correctAnswerText !== null ? { index: correctIndex, text: correctAnswerText } : null,
        selected_answer: selectedAnswerText !== null ? { index: selectedIndex, text: selectedAnswerText } : null,
        is_correct: userAnswer?.is_correct ?? false,
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