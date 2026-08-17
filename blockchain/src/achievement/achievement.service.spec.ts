import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { AchievementService } from './achievement.service';
import { CardanoService } from '../cardano/cardano.service';
import { PinataService } from '../pinata/pinata.service';

describe('AchievementService', () => {
  let service: AchievementService;

  const mockCardanoService = {
    buildAchievementClaimTx: jest.fn(),
  };

  const mockPinataService = {
    uploadFile: jest.fn(),
  };

  const mockSupabase = {
    from: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        { provide: SUPABASE_CLIENT, useValue: mockSupabase },
        { provide: PinataService, useValue: mockPinataService },
        { provide: CardanoService, useValue: mockCardanoService },
      ],
    }).compile();

    service = module.get<AchievementService>(AchievementService);
  });

  describe('getMyEarnedAchievements', () => {
    it('should return earned achievements with status SUCCESS and mapped reward info', async () => {
      const mockData = [
        {
          id: 'ach-1',
          status: 'SUCCESS',
          quiz_id: 'quiz-1',
          reward_id: 'reward-1',
          tx_hash: '0x123',
          policy_id: 'policy-1',
          asset_name: 'asset-1',
          ipfs_cid: 'Qm123',
          minted_at: '2026-08-16T20:00:00.000Z',
          reward: {
            id: 'reward-1',
            name: 'Cardano Beginner',
            description: 'Completed Cardano Basics',
            image: 'ipfs://QmImage123',
          },
        },
      ];

      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      mockSupabase.from.mockReturnValue(chain);

      const result = await service.getMyEarnedAchievements('user-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('achievement');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(chain.eq).toHaveBeenCalledWith('status', 'SUCCESS');
      expect(result).toEqual([
        {
          id: 'ach-1',
          status: 'SUCCESS',
          quizId: 'quiz-1',
          reward: {
            id: 'reward-1',
            name: 'Cardano Beginner',
            description: 'Completed Cardano Basics',
            image: 'ipfs://QmImage123',
            metadata: null,
            policyType: 'CIP25',
            policyId: 'policy-1',
            assetName: 'asset-1',
          },
          txHash: '0x123',
          mintedAt: '2026-08-16T20:00:00.000Z',
        },
      ]);
    });

    it('should throw BadRequestException if Supabase returns error', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
      };

      mockSupabase.from.mockReturnValue(chain);

      await expect(service.getMyEarnedAchievements('user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('claim', () => {
    it('should throw NotFoundException if achievement not found', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };

      mockSupabase.from.mockReturnValue(chain);

      await expect(service.claim('user-1', 'ach-1')).rejects.toThrow(NotFoundException);
    });
  });
});
