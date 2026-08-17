import { Test, TestingModule } from '@nestjs/testing';
import { AttemptsService } from './attempts.service';
import { SUPABASE_CLIENT } from '../database/database.module';
import { XpService } from 'src/users/xp.service';
import { ActivityService } from 'src/users/activity.service';
import { QuizGradingService } from 'src/quiz-grading/quiz-grading.service';

describe('AttemptsService', () => {
  let service: AttemptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttemptsService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: XpService, useValue: {} },
        { provide: ActivityService, useValue: {} },
        { provide: QuizGradingService, useValue: {} },
      ],
    }).compile();

    service = module.get<AttemptsService>(AttemptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
