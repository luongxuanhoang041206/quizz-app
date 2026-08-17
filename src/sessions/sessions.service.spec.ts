import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { SUPABASE_CLIENT } from '../database/database.module';

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: SUPABASE_CLIENT, useValue: {} },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
