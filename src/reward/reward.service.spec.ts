import { Test, TestingModule } from '@nestjs/testing';
import { RewardService } from './reward.service';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { PinataService } from 'blockchain/src/pinata/pinata.service';
import { CardanoService } from 'blockchain/src/cardano/cardano.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RewardService', () => {
  let service: RewardService;
  let cardanoService: { checkAssetOwnership: jest.Mock };
  let supabase: { from: jest.Mock };

  beforeEach(async () => {
    cardanoService = {
      checkAssetOwnership: jest.fn(),
    };
    supabase = {
      from: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        { provide: SUPABASE_CLIENT, useValue: supabase },
        { provide: PinataService, useValue: {} },
        { provide: CardanoService, useValue: cardanoService },
      ],
    }).compile();

    service = module.get<RewardService>(RewardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('checks reward ownership with the authenticated user wallet from the database', async () => {
    mockSupabaseSingle([
      { data: { id: 'user-1', wallet_address: 'addr_user_a' }, error: null },
      {
        data: {
          id: 'reward-1',
          name: 'Cardano Beginner',
          policy_id: 'policy123',
          asset_name: 'asset456',
        },
        error: null,
      },
    ]);
    cardanoService.checkAssetOwnership.mockResolvedValue({
      owned: true,
      quantity: 1n,
      assetUnit: 'policy123asset456',
      address: 'addr_user_a',
    });

    await expect(
      service.checkRewardAssetOwnership('reward-1', 'user-1'),
    ).resolves.toEqual({
      rewardId: 'reward-1',
      rewardName: 'Cardano Beginner',
      owned: true,
      quantity: '1',
      assetUnit: 'policy123asset456',
    });

    expect(cardanoService.checkAssetOwnership).toHaveBeenCalledWith(
      'addr_user_a',
      'policy123',
      'asset456',
    );
  });

  it('returns owned false when the authenticated user wallet does not hold the asset', async () => {
    mockSupabaseSingle([
      { data: { id: 'user-1', wallet_address: 'addr_user_a' }, error: null },
      {
        data: {
          id: 'reward-1',
          name: 'Cardano Beginner',
          policy_id: 'policy123',
          asset_name: 'asset456',
        },
        error: null,
      },
    ]);
    cardanoService.checkAssetOwnership.mockResolvedValue({
      owned: false,
      quantity: 0n,
      assetUnit: 'policy123asset456',
      address: 'addr_user_a',
    });

    await expect(
      service.checkRewardAssetOwnership('reward-1', 'user-1'),
    ).resolves.toMatchObject({
      owned: false,
      quantity: '0',
    });
  });

  it('does not accept an arbitrary client wallet address', async () => {
    mockSupabaseSingle([
      { data: { id: 'user-1', wallet_address: 'addr_user_a' }, error: null },
      {
        data: {
          id: 'reward-1',
          name: 'Cardano Beginner',
          policy_id: 'policy123',
          asset_name: 'asset456',
        },
        error: null,
      },
    ]);
    cardanoService.checkAssetOwnership.mockResolvedValue({
      owned: true,
      quantity: 1n,
      assetUnit: 'policy123asset456',
      address: 'addr_user_a',
    });

    await service.checkRewardAssetOwnership('reward-1', 'user-1');

    expect(cardanoService.checkAssetOwnership).not.toHaveBeenCalledWith(
      'addr_user_b',
      expect.any(String),
      expect.any(String),
    );
  });

  it('throws a clear error when the authenticated user has no wallet address', async () => {
    mockSupabaseSingle([
      { data: { id: 'user-1', wallet_address: null }, error: null },
    ]);

    await expect(
      service.checkRewardAssetOwnership('reward-1', 'user-1'),
    ).rejects.toThrow(
      new BadRequestException('User wallet address is not configured'),
    );
    expect(cardanoService.checkAssetOwnership).not.toHaveBeenCalled();
  });

  it('throws a clear error when the reward has no blockchain asset identity', async () => {
    mockSupabaseSingle([
      { data: { id: 'user-1', wallet_address: 'addr_user_a' }, error: null },
      {
        data: {
          id: 'reward-1',
          name: 'Cardano Beginner',
          policy_id: null,
          asset_name: null,
        },
        error: null,
      },
    ]);

    await expect(
      service.checkRewardAssetOwnership('reward-1', 'user-1'),
    ).rejects.toThrow(
      new BadRequestException('Reward does not have blockchain asset identity'),
    );
    expect(cardanoService.checkAssetOwnership).not.toHaveBeenCalled();
  });

  it('throws when the reward does not exist', async () => {
    mockSupabaseSingle([
      { data: { id: 'user-1', wallet_address: 'addr_user_a' }, error: null },
      { data: null, error: { message: 'not found' } },
    ]);

    await expect(
      service.checkRewardAssetOwnership('reward-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  function mockSupabaseSingle(
    results: Array<{ data: unknown; error: unknown }>,
  ) {
    supabase.from.mockImplementation(() => {
      const result = results.shift();
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(result),
      };
    });
  }
});
