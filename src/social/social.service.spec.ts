import { Test, TestingModule } from '@nestjs/testing';
import { SocialService } from './social.service';
import { SUPABASE_CLIENT } from '../database/database.module';
import { ActivityService } from 'src/users/activity.service';

describe('SocialService', () => {
  let service: SocialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: ActivityService, useValue: {} },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
