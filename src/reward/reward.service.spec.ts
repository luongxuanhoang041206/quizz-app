import { Test, TestingModule } from '@nestjs/testing';
import { RewardService } from './reward.service';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { PinataService } from 'blockchain/src/pinata/pinata.service';

describe('RewardService', () => {
  let service: RewardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: PinataService, useValue: {} },
      ],
    }).compile();

    service = module.get<RewardService>(RewardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
