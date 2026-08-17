import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from './quiz.service';
import { SUPABASE_CLIENT } from '../database/database.module';

describe('QuizService', () => {
  let service: QuizService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: SUPABASE_CLIENT, useValue: {} },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
