import { SessionsService } from './sessions.service';

describe('SessionsService.getSessionByQuiz', () => {
  it('should fetch the latest session for a quiz', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'session-1', quiz_id: 'quiz-1', status: 'waiting' },
        error: null,
      }),
    };

    const supabase = {
      from: jest.fn().mockReturnValue(query),
    };

    const service = new SessionsService(supabase as any);
    const result = await service.getSessionByQuiz('quiz-1');

    expect(result.id).toBe('session-1');
    expect(supabase.from).toHaveBeenCalledWith('quiz_sessions');
  });
});
