import { QuizService } from './quiz.service';

describe('QuizService.deleteQuiz', () => {
  it('should delete related sessions and leaderboard rows before deleting the quiz', async () => {
    const callOrder: string[] = [];

    const quizBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'quiz-1', creator_id: 'user-1' },
        error: null,
      }),
      delete: jest.fn().mockReturnThis(),
    };

    const sessionBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [{ id: 'session-1' }], error: null }),
      delete: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ error: null }),
    };

    const leaderboardBuilder = {
      delete: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ error: null }),
    };

    const questionsBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [{ id: 'question-1' }], error: null }),
      delete: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ error: null }),
    };

    const answersBuilder = {
      delete: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ error: null }),
    };

    const supabase = {
      from: jest.fn((table: string) => {
        callOrder.push(table);
        if (table === 'quizzes') return quizBuilder;
        if (table === 'quiz_sessions') return sessionBuilder;
        if (table === 'leaderboard') return leaderboardBuilder;
        if (table === 'questions') return questionsBuilder;
        if (table === 'answers') return answersBuilder;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const service = new QuizService(supabase as any);

    await service.deleteQuiz('quiz-1', 'user-1');

    expect(callOrder.indexOf('quiz_sessions')).toBeGreaterThan(callOrder.indexOf('quizzes'));
    expect(callOrder.indexOf('leaderboard')).toBeGreaterThan(callOrder.indexOf('quiz_sessions'));
    expect(quizBuilder.delete).toHaveBeenCalled();
  });
});
