import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CardanoService } from 'blockchain/src/cardano/cardano.service';
import { SUPABASE_CLIENT } from 'src/database/database.module';
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
import { CreateChallengeRewardDto } from './dto/create-challenge-reward.dto';

describe('ChallengeService', () => {
  let service: ChallengeService;
  let mockSupabase: any;
  let mockCardanoService: any;

  const mockCreatorId = 'user-creator-1';
  const mockOtherUserId = 'user-other-2';

  beforeEach(async () => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };

    mockCardanoService = {
      checkAssetOwnership: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeService,
        { provide: SUPABASE_CLIENT, useValue: mockSupabase },
        { provide: CardanoService, useValue: mockCardanoService },
      ],
    }).compile();

    service = module.get<ChallengeService>(ChallengeService);
  });

  // ====================================================
  // CHALLENGE CRUD & LIFECYCLE
  // ====================================================
  describe('Challenge CRUD', () => {
    it('should create a challenge with DRAFT status and set created_by', async () => {
      const dto: CreateChallengeDto = {
        title: 'Cardano Master Quest',
        description: 'Solve challenges on Cardano',
        startAt: '2026-09-01T00:00:00Z',
        endAt: '2026-09-30T00:00:00Z',
        maxParticipants: 50,
      };

      const mockCreated = {
        id: 'challenge-1',
        title: dto.title,
        description: dto.description,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
        start_at: dto.startAt,
        end_at: dto.endAt,
        max_participants: dto.maxParticipants,
        reward_claim_deadline: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreated, error: null }),
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await service.createChallenge(mockCreatorId, dto);

      expect(mockSupabase.from).toHaveBeenCalledWith('challenges');
      expect(chain.insert).toHaveBeenCalledWith({
        title: dto.title,
        description: dto.description,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
        start_at: dto.startAt,
        end_at: dto.endAt,
        max_participants: dto.maxParticipants,
        reward_claim_deadline: null,
      });
      expect(result.status).toBe(ChallengeStatus.DRAFT);
      expect(result.created_by).toBe(mockCreatorId);
    });

    it('should reject creating challenge if end date <= start date', async () => {
      const dto: CreateChallengeDto = {
        title: 'Invalid Dates',
        startAt: '2026-09-30T00:00:00Z',
        endAt: '2026-09-01T00:00:00Z',
      };

      await expect(
        service.createChallenge(mockCreatorId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject creating challenge if maxParticipants <= 0', async () => {
      const dto: CreateChallengeDto = {
        title: 'Invalid Participants',
        maxParticipants: 0,
      };

      await expect(
        service.createChallenge(mockCreatorId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow creator to update challenge in DRAFT status', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        title: 'Old Title',
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
        start_at: null,
        end_at: null,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };

      const updated = { ...existing, title: 'New Title' };
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: updated, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(updateChain);

      const dto: UpdateChallengeDto = { title: 'New Title' };
      const result = await service.updateChallenge(challengeId, mockCreatorId, dto);

      expect(result.title).toBe('New Title');
    });

    it('should prevent non-creator from updating challenge', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        title: 'Old Title',
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };
      mockSupabase.from.mockReturnValue(selectChain);

      await expect(
        service.updateChallenge(challengeId, mockOtherUserId, { title: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent modifying non-DRAFT challenge', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        title: 'Active Title',
        created_by: mockCreatorId,
        status: ChallengeStatus.ACTIVE,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };
      mockSupabase.from.mockReturnValue(selectChain);

      await expect(
        service.updateChallenge(challengeId, mockCreatorId, { title: 'New' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow creator to delete DRAFT challenge', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };

      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(deleteChain);

      const result = await service.deleteChallenge(challengeId, mockCreatorId);
      expect(result.success).toBe(true);
    });

    it('should prevent non-creator from deleting challenge', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };
      mockSupabase.from.mockReturnValue(selectChain);

      await expect(
        service.deleteChallenge(challengeId, mockOtherUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================
  // PUBLIC & MY CHALLENGES DISCOVERY
  // ====================================================
  describe('Discovery', () => {
    it('should list public challenges excluding DRAFT', async () => {
      const activeChallenge = {
        id: 'c-1',
        title: 'Active One',
        status: ChallengeStatus.ACTIVE,
      };

      const chain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [activeChallenge], error: null }),
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await service.listPublicChallenges();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c-1');
    });

    it('should reject querying DRAFT from public challenges endpoint', async () => {
      await expect(
        service.listPublicChallenges({ status: ChallengeStatus.DRAFT }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should list creator my challenges including DRAFT', async () => {
      const myChallenge = {
        id: 'c-draft',
        title: 'Draft One',
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [myChallenge], error: null }),
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await service.listMyChallenges(mockCreatorId);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ChallengeStatus.DRAFT);
    });

    it('should hide DRAFT challenge detail from non-creator', async () => {
      const draftChallenge = {
        id: 'c-draft',
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: draftChallenge, error: null }),
      };
      mockSupabase.from.mockReturnValue(selectChain);

      await expect(
        service.getChallenge('c-draft', mockOtherUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ====================================================
  // REQUIREMENTS MANAGEMENT
  // ====================================================
  describe('Requirements CRUD', () => {
    it('should add requirement to DRAFT challenge', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };

      const mockReq = {
        id: 'req-1',
        challenge_id: challengeId,
        policy_id: 'policy-1',
        asset_name: 'asset-1',
        min_quantity: '1',
        sort_order: 0,
        created_at: new Date().toISOString(),
      };

      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockReq, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      const dto: CreateChallengeRequirementDto = {
        policyId: 'policy-1',
        assetName: 'asset-1',
        minQuantity: 1,
      };

      const result = await service.addRequirement(challengeId, mockCreatorId, dto);
      expect(result.id).toBe('req-1');
      expect(result.policy_id).toBe('policy-1');
    });

    it('should reject duplicate requirement in same challenge', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };

      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      const dto: CreateChallengeRequirementDto = {
        policyId: 'policy-1',
        assetName: 'asset-1',
      };

      await expect(
        service.addRequirement(challengeId, mockCreatorId, dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject requirement on published challenge', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.ACTIVE,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };
      mockSupabase.from.mockReturnValue(selectChain);

      await expect(
        service.addRequirement(challengeId, mockCreatorId, {
          policyId: 'p',
          assetName: 'a',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ====================================================
  // REWARDS MANAGEMENT
  // ====================================================
  describe('Rewards CRUD', () => {
    it('should add NFT reward with valid config', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };

      const mockReward = {
        id: 'rew-1',
        challenge_id: challengeId,
        tier: ChallengeRewardTier.WINNER,
        type: ChallengeRewardType.NFT,
        name: 'Winner Badge NFT',
        description: 'First place badge',
        config: { policyId: 'policy123', assetName: 'winnerNFT' },
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockReward, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      const dto: CreateChallengeRewardDto = {
        tier: ChallengeRewardTier.WINNER,
        type: ChallengeRewardType.NFT,
        name: 'Winner Badge NFT',
        description: 'First place badge',
        config: { policyId: 'policy123', assetName: 'winnerNFT' },
      };

      const result = await service.addReward(challengeId, mockCreatorId, dto);
      expect(result.id).toBe('rew-1');
      expect(result.type).toBe(ChallengeRewardType.NFT);
    });

    it('should add TOKEN reward with valid config and string amount', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };

      const mockReward = {
        id: 'rew-token',
        challenge_id: challengeId,
        tier: ChallengeRewardTier.WINNER,
        type: ChallengeRewardType.TOKEN,
        name: '1000 USDC',
        config: { policyId: 'usdcPolicy', assetName: 'USDC', amount: '1000000000' },
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockReward, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      const dto: CreateChallengeRewardDto = {
        tier: ChallengeRewardTier.WINNER,
        type: ChallengeRewardType.TOKEN,
        name: '1000 USDC',
        config: { policyId: 'usdcPolicy', assetName: 'USDC', amount: '1000000000' },
      };

      const result = await service.addReward(challengeId, mockCreatorId, dto);
      expect(result.type).toBe(ChallengeRewardType.TOKEN);
    });

    it('should add POINTS reward', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };

      const mockReward = {
        id: 'rew-pts',
        challenge_id: challengeId,
        tier: ChallengeRewardTier.PARTICIPATION,
        type: ChallengeRewardType.POINTS,
        name: '100 XP',
        config: { amount: 100 },
        sort_order: 0,
      };

      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockReward, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(insertChain);

      const dto: CreateChallengeRewardDto = {
        tier: ChallengeRewardTier.PARTICIPATION,
        type: ChallengeRewardType.POINTS,
        name: '100 XP',
        config: { amount: 100 },
      };

      const result = await service.addReward(challengeId, mockCreatorId, dto);
      expect(result.type).toBe(ChallengeRewardType.POINTS);
    });

    it('should reject invalid reward config', async () => {
      const challengeId = 'challenge-1';
      const existing = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: existing, error: null }),
      };
      mockSupabase.from.mockReturnValue(selectChain);

      const invalidDto: CreateChallengeRewardDto = {
        tier: ChallengeRewardTier.WINNER,
        type: ChallengeRewardType.NFT,
        name: 'Invalid NFT Reward',
        config: { policyId: '' }, // missing assetName
      };

      await expect(
        service.addReward(challengeId, mockCreatorId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ====================================================
  // PUBLISH & CANCEL
  // ====================================================
  describe('Publish & Cancel', () => {
    it('should reject publish if no requirements', async () => {
      const challengeId = 'challenge-1';
      const challenge = {
        id: challengeId,
        title: 'My Challenge',
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
        start_at: null,
        end_at: null,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const reqChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) => fn({ data: [], error: null })),
      };

      const rewChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) => fn({ data: [{ id: 'rew-1' }], error: null })),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(reqChain)
        .mockReturnValueOnce(rewChain);

      await expect(
        service.publishChallenge(challengeId, mockCreatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject publish if end date is in the past', async () => {
      const challengeId = 'challenge-1';
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const challenge = {
        id: challengeId,
        title: 'My Challenge',
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
        start_at: null,
        end_at: pastDate,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const reqChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) => fn({ data: [{ id: 'r1' }], error: null })),
      };

      const rewChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) =>
          fn({
            data: [
              {
                id: 'rew1',
                type: ChallengeRewardType.POINTS,
                config: { amount: 100 },
              },
            ],
            error: null,
          }),
        ),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(reqChain)
        .mockReturnValueOnce(rewChain);

      await expect(
        service.publishChallenge(challengeId, mockCreatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should publish immediately to ACTIVE if start_at is past or null', async () => {
      const challengeId = 'challenge-1';
      const futureEnd = new Date(Date.now() + 864000000).toISOString();
      const challenge = {
        id: challengeId,
        title: 'Active Master Challenge',
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
        start_at: null,
        end_at: futureEnd,
        max_participants: 100,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const reqChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) =>
          fn({
            data: [{ id: 'req-1', policy_id: 'p', asset_name: 'a', min_quantity: '1' }],
            error: null,
          }),
        ),
      };

      const rewChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) =>
          fn({
            data: [
              {
                id: 'rew-1',
                type: ChallengeRewardType.POINTS,
                config: { amount: 1000 },
              },
            ],
            error: null,
          }),
        ),
      };

      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...challenge, status: ChallengeStatus.ACTIVE },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(reqChain)
        .mockReturnValueOnce(rewChain)
        .mockReturnValueOnce(updateChain);

      const result = await service.publishChallenge(challengeId, mockCreatorId);
      expect(result.status).toBe(ChallengeStatus.ACTIVE);
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: ChallengeStatus.ACTIVE }),
      );
    });

    it('should publish to SCHEDULED if start_at is in the future', async () => {
      const challengeId = 'challenge-1';
      const futureStart = new Date(Date.now() + 86400000).toISOString();
      const futureEnd = new Date(Date.now() + 864000000).toISOString();
      const challenge = {
        id: challengeId,
        title: 'Upcoming Challenge',
        created_by: mockCreatorId,
        status: ChallengeStatus.DRAFT,
        start_at: futureStart,
        end_at: futureEnd,
        max_participants: null,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const reqChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) =>
          fn({
            data: [{ id: 'req-1', policy_id: 'p', asset_name: 'a', min_quantity: '1' }],
            error: null,
          }),
        ),
      };

      const rewChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) =>
          fn({
            data: [
              {
                id: 'rew-1',
                type: ChallengeRewardType.POINTS,
                config: { amount: 500 },
              },
            ],
            error: null,
          }),
        ),
      };

      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...challenge, status: ChallengeStatus.SCHEDULED },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(reqChain)
        .mockReturnValueOnce(rewChain)
        .mockReturnValueOnce(updateChain);

      const result = await service.publishChallenge(challengeId, mockCreatorId);
      expect(result.status).toBe(ChallengeStatus.SCHEDULED);
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: ChallengeStatus.SCHEDULED }),
      );
    });

    it('should allow cancelling ACTIVE or SCHEDULED challenge', async () => {
      const challengeId = 'challenge-1';
      const challenge = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.ACTIVE,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...challenge, status: ChallengeStatus.CANCELLED },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(updateChain);

      const result = await service.cancelChallenge(challengeId, mockCreatorId);
      expect(result.status).toBe(ChallengeStatus.CANCELLED);
    });

    it('should reject cancelling CLOSED challenge', async () => {
      const challengeId = 'challenge-1';
      const challenge = {
        id: challengeId,
        created_by: mockCreatorId,
        status: ChallengeStatus.CLOSED,
      };

      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };
      mockSupabase.from.mockReturnValue(selectChain);

      await expect(
        service.cancelChallenge(challengeId, mockCreatorId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ====================================================
  // GATING & PARTICIPATION
  // ====================================================
  describe('Gating & Participation', () => {
    it('should pass eligibility when user wallet owns all required NFTs', async () => {
      const challengeId = 'challenge-1';
      const userId = 'user-1';

      const challenge = {
        id: challengeId,
        status: ChallengeStatus.ACTIVE,
        start_at: null,
        end_at: null,
      };

      const requirements = [
        {
          id: 'req-1',
          challenge_id: challengeId,
          policy_id: 'policy1',
          asset_name: 'asset1',
          min_quantity: '1',
          sort_order: 0,
        },
      ];

      const userWallet = {
        id: userId,
        wallet_address: 'addr_test1user',
      };

      const challengeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const reqChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) =>
          fn({ data: requirements, error: null }),
        ),
      };

      const userChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userWallet, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(challengeChain)
        .mockReturnValueOnce(reqChain)
        .mockReturnValueOnce(userChain);

      mockCardanoService.checkAssetOwnership.mockResolvedValue({
        owned: true,
        quantity: 1n,
        assetUnit: 'policy1asset1',
        address: 'addr_test1user',
      });

      const result = await service.checkChallengeEligibility(challengeId, userId);

      expect(result.eligible).toBe(true);
      expect(result.requirements[0].satisfied).toBe(true);
      expect(mockCardanoService.checkAssetOwnership).toHaveBeenCalledWith(
        'addr_test1user',
        'policy1',
        'asset1',
      );
    });

    it('should fail eligibility if user does not own NFT even if earned previously (earned != owned)', async () => {
      const challengeId = 'challenge-1';
      const userId = 'user-1';

      const challenge = {
        id: challengeId,
        status: ChallengeStatus.ACTIVE,
        start_at: null,
        end_at: null,
      };

      const requirements = [
        {
          id: 'req-1',
          challenge_id: challengeId,
          policy_id: 'policy1',
          asset_name: 'asset1',
          min_quantity: '1',
          sort_order: 0,
        },
      ];

      const userWallet = {
        id: userId,
        wallet_address: 'addr_test1user',
      };

      const challengeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const reqChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) =>
          fn({ data: requirements, error: null }),
        ),
      };

      const userChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: userWallet, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(challengeChain)
        .mockReturnValueOnce(reqChain)
        .mockReturnValueOnce(userChain);

      mockCardanoService.checkAssetOwnership.mockResolvedValue({
        owned: false,
        quantity: 0n,
        assetUnit: 'policy1asset1',
        address: 'addr_test1user',
      });

      const result = await service.checkChallengeEligibility(challengeId, userId);
      expect(result.eligible).toBe(false);
    });

    it('should enforce max_participants in startChallenge', async () => {
      const challengeId = 'challenge-1';
      const userId = 'user-101';

      const challenge = {
        id: challengeId,
        status: ChallengeStatus.ACTIVE,
        start_at: null,
        end_at: null,
        max_participants: 100,
      };

      const challengeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const countChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 100, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(challengeChain)
        .mockReturnValueOnce(countChain);

      await expect(
        service.startChallenge(challengeId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should start challenge successfully when eligible and under max_participants', async () => {
      const challengeId = 'challenge-1';
      const userId = 'user-1';

      const challenge = {
        id: challengeId,
        status: ChallengeStatus.ACTIVE,
        start_at: null,
        end_at: null,
        max_participants: 100,
      };

      const challengeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const countChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 50, error: null }),
      };

      // In checkChallengeEligibility:
      const eligChallengeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const reqChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) => fn({ data: [], error: null })),
      };

      const userChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: userId, wallet_address: 'addr_test' },
          error: null,
        }),
      };

      const participation = {
        id: 'part-1',
        challenge_id: challengeId,
        user_id: userId,
        status: ChallengeParticipationStatus.IN_PROGRESS,
        started_at: new Date().toISOString(),
        completed_at: null,
      };

      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: participation, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(challengeChain) // loadChallenge in startChallenge
        .mockReturnValueOnce(countChain) // count in startChallenge
        .mockReturnValueOnce(eligChallengeChain) // loadChallenge in checkChallengeEligibility
        .mockReturnValueOnce(reqChain) // loadRequirements in checkChallengeEligibility
        .mockReturnValueOnce(userChain) // loadUserWallet in checkChallengeEligibility
        .mockReturnValueOnce(insertChain); // insert participation

      const result = await service.startChallenge(challengeId, userId);
      expect(result.id).toBe('part-1');
      expect(result.status).toBe(ChallengeParticipationStatus.IN_PROGRESS);
    });

    it('should throw ConflictException if challenge already started', async () => {
      const challengeId = 'challenge-1';
      const userId = 'user-1';

      const challenge = {
        id: challengeId,
        status: ChallengeStatus.ACTIVE,
        start_at: null,
        end_at: null,
        max_participants: null,
      };

      const challengeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const eligChallengeChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: challenge, error: null }),
      };

      const reqChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((fn) => fn({ data: [], error: null })),
      };

      const userChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: userId, wallet_address: 'addr_test' },
          error: null,
        }),
      };

      const insertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(challengeChain)
        .mockReturnValueOnce(eligChallengeChain)
        .mockReturnValueOnce(reqChain)
        .mockReturnValueOnce(userChain)
        .mockReturnValueOnce(insertChain);

      await expect(
        service.startChallenge(challengeId, userId),
      ).rejects.toThrow(ConflictException);
    });
  });
});
