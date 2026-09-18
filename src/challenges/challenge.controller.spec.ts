import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';
import {
  ChallengeParticipationStatus,
  ChallengeRewardTier,
  ChallengeRewardType,
  ChallengeStatus,
} from './challenge.types';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { CreateChallengeRequirementDto } from './dto/create-challenge-requirement.dto';
import { UpdateChallengeRequirementDto } from './dto/update-challenge-requirement.dto';
import { CreateChallengeRewardDto } from './dto/create-challenge-reward.dto';
import { UpdateChallengeRewardDto } from './dto/update-challenge-reward.dto';

describe('ChallengeController', () => {
  let controller: ChallengeController;
  let mockChallengeService: any;

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    username: 'user1',
    role: 'USER',
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockChallengeService = {
      createChallenge: jest.fn(),
      listPublicChallenges: jest.fn(),
      listMyChallenges: jest.fn(),
      getChallenge: jest.fn(),
      updateChallenge: jest.fn(),
      deleteChallenge: jest.fn(),
      publishChallenge: jest.fn(),
      cancelChallenge: jest.fn(),
      addRequirement: jest.fn(),
      listRequirements: jest.fn(),
      updateRequirement: jest.fn(),
      deleteRequirement: jest.fn(),
      addReward: jest.fn(),
      listRewards: jest.fn(),
      updateReward: jest.fn(),
      deleteReward: jest.fn(),
      checkChallengeEligibility: jest.fn(),
      startChallenge: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengeController],
      providers: [
        { provide: ChallengeService, useValue: mockChallengeService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ChallengeController>(ChallengeController);
  });

  describe('createChallenge', () => {
    it('should create a challenge with user id', async () => {
      const dto: CreateChallengeDto = {
        title: 'Cardano Advanced Quest',
        description: 'Advanced Cardano challenge',
      };

      const mockChallenge = {
        id: 'challenge-1',
        title: dto.title,
        description: dto.description,
        created_by: mockUser.id,
        status: ChallengeStatus.DRAFT,
        start_at: null,
        end_at: null,
        max_participants: null,
        reward_claim_deadline: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockChallengeService.createChallenge.mockResolvedValue(mockChallenge);

      const result = await controller.createChallenge(mockUser, dto);

      expect(mockChallengeService.createChallenge).toHaveBeenCalledWith(
        mockUser.id,
        dto,
      );
      expect(result).toEqual(mockChallenge);
    });
  });

  describe('listPublicChallenges & listMyChallenges', () => {
    it('should list public challenges', async () => {
      const list = [{ id: 'c-1', title: 'Public One' }];
      mockChallengeService.listPublicChallenges.mockResolvedValue(list);

      const result = await controller.listPublicChallenges(ChallengeStatus.ACTIVE);
      expect(mockChallengeService.listPublicChallenges).toHaveBeenCalledWith({
        status: ChallengeStatus.ACTIVE,
      });
      expect(result).toEqual(list);
    });

    it('should list my challenges for authenticated user', async () => {
      const list = [{ id: 'c-1', title: 'My One' }];
      mockChallengeService.listMyChallenges.mockResolvedValue(list);

      const result = await controller.listMyChallenges(mockUser);
      expect(mockChallengeService.listMyChallenges).toHaveBeenCalledWith(
        mockUser.id,
        undefined,
      );
      expect(result).toEqual(list);
    });
  });

  describe('getChallenge, updateChallenge & deleteChallenge', () => {
    it('should get challenge details', async () => {
      const detail = { id: 'c-1', title: 'Title' };
      mockChallengeService.getChallenge.mockResolvedValue(detail);

      const result = await controller.getChallenge('c-1', mockUser);
      expect(mockChallengeService.getChallenge).toHaveBeenCalledWith('c-1', mockUser.id);
      expect(result).toEqual(detail);
    });

    it('should update challenge', async () => {
      const dto: UpdateChallengeDto = { title: 'Updated' };
      const updated = { id: 'c-1', title: 'Updated' };
      mockChallengeService.updateChallenge.mockResolvedValue(updated);

      const result = await controller.updateChallenge(mockUser, 'c-1', dto);
      expect(mockChallengeService.updateChallenge).toHaveBeenCalledWith(
        'c-1',
        mockUser.id,
        dto,
      );
      expect(result).toEqual(updated);
    });

    it('should delete challenge', async () => {
      mockChallengeService.deleteChallenge.mockResolvedValue({ success: true });

      const result = await controller.deleteChallenge(mockUser, 'c-1');
      expect(mockChallengeService.deleteChallenge).toHaveBeenCalledWith('c-1', mockUser.id);
      expect(result).toEqual({ success: true });
    });
  });

  describe('publishChallenge & cancelChallenge', () => {
    it('should publish challenge', async () => {
      const published = { id: 'c-1', status: ChallengeStatus.ACTIVE };
      mockChallengeService.publishChallenge.mockResolvedValue(published);

      const result = await controller.publishChallenge(mockUser, 'c-1');
      expect(mockChallengeService.publishChallenge).toHaveBeenCalledWith('c-1', mockUser.id);
      expect(result).toEqual(published);
    });

    it('should cancel challenge', async () => {
      const cancelled = { id: 'c-1', status: ChallengeStatus.CANCELLED };
      mockChallengeService.cancelChallenge.mockResolvedValue(cancelled);

      const result = await controller.cancelChallenge(mockUser, 'c-1');
      expect(mockChallengeService.cancelChallenge).toHaveBeenCalledWith('c-1', mockUser.id);
      expect(result).toEqual(cancelled);
    });
  });

  describe('Requirements endpoints', () => {
    it('should add requirement', async () => {
      const dto: CreateChallengeRequirementDto = {
        policyId: 'policy1',
        assetName: 'asset1',
        minQuantity: 1,
      };
      const req = { id: 'r-1', ...dto };
      mockChallengeService.addRequirement.mockResolvedValue(req);

      const result = await controller.addRequirement(mockUser, 'c-1', dto);
      expect(mockChallengeService.addRequirement).toHaveBeenCalledWith('c-1', mockUser.id, dto);
      expect(result).toEqual(req);
    });

    it('should list requirements', async () => {
      const list = [{ id: 'r-1' }];
      mockChallengeService.listRequirements.mockResolvedValue(list);

      const result = await controller.listRequirements('c-1');
      expect(mockChallengeService.listRequirements).toHaveBeenCalledWith('c-1');
      expect(result).toEqual(list);
    });

    it('should update requirement', async () => {
      const dto: UpdateChallengeRequirementDto = { minQuantity: 2 };
      const updated = { id: 'r-1', min_quantity: 2 };
      mockChallengeService.updateRequirement.mockResolvedValue(updated);

      const result = await controller.updateRequirement(mockUser, 'c-1', 'r-1', dto);
      expect(mockChallengeService.updateRequirement).toHaveBeenCalledWith('c-1', 'r-1', mockUser.id, dto);
      expect(result).toEqual(updated);
    });

    it('should delete requirement', async () => {
      mockChallengeService.deleteRequirement.mockResolvedValue({ success: true });

      const result = await controller.deleteRequirement(mockUser, 'c-1', 'r-1');
      expect(mockChallengeService.deleteRequirement).toHaveBeenCalledWith('c-1', 'r-1', mockUser.id);
      expect(result).toEqual({ success: true });
    });
  });

  describe('Rewards endpoints', () => {
    it('should add reward', async () => {
      const dto: CreateChallengeRewardDto = {
        tier: ChallengeRewardTier.WINNER,
        type: ChallengeRewardType.POINTS,
        name: '100 XP',
        config: { amount: 100 },
      };
      const rew = { id: 'rew-1', ...dto };
      mockChallengeService.addReward.mockResolvedValue(rew);

      const result = await controller.addReward(mockUser, 'c-1', dto);
      expect(mockChallengeService.addReward).toHaveBeenCalledWith('c-1', mockUser.id, dto);
      expect(result).toEqual(rew);
    });

    it('should list rewards', async () => {
      const list = [{ id: 'rew-1' }];
      mockChallengeService.listRewards.mockResolvedValue(list);

      const result = await controller.listRewards('c-1');
      expect(mockChallengeService.listRewards).toHaveBeenCalledWith('c-1');
      expect(result).toEqual(list);
    });

    it('should update reward', async () => {
      const dto: UpdateChallengeRewardDto = { name: '200 XP' };
      const updated = { id: 'rew-1', name: '200 XP' };
      mockChallengeService.updateReward.mockResolvedValue(updated);

      const result = await controller.updateReward(mockUser, 'c-1', 'rew-1', dto);
      expect(mockChallengeService.updateReward).toHaveBeenCalledWith('c-1', 'rew-1', mockUser.id, dto);
      expect(result).toEqual(updated);
    });

    it('should delete reward', async () => {
      mockChallengeService.deleteReward.mockResolvedValue({ success: true });

      const result = await controller.deleteReward(mockUser, 'c-1', 'rew-1');
      expect(mockChallengeService.deleteReward).toHaveBeenCalledWith('c-1', 'rew-1', mockUser.id);
      expect(result).toEqual({ success: true });
    });
  });

  describe('Eligibility & Start', () => {
    it('should check eligibility', async () => {
      const elig = { challengeId: 'c-1', eligible: true, requirements: [] };
      mockChallengeService.checkChallengeEligibility.mockResolvedValue(elig);

      const result = await controller.checkEligibility(mockUser, 'c-1');
      expect(mockChallengeService.checkChallengeEligibility).toHaveBeenCalledWith('c-1', mockUser.id);
      expect(result).toEqual(elig);
    });

    it('should start challenge', async () => {
      const participation = {
        id: 'p-1',
        challenge_id: 'c-1',
        user_id: mockUser.id,
        status: ChallengeParticipationStatus.IN_PROGRESS,
      };
      mockChallengeService.startChallenge.mockResolvedValue(participation);

      const result = await controller.startChallenge(mockUser, 'c-1');
      expect(mockChallengeService.startChallenge).toHaveBeenCalledWith('c-1', mockUser.id);
      expect(result).toEqual(participation);
    });
  });
});
