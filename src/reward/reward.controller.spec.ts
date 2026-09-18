import { Test, TestingModule } from '@nestjs/testing';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';

describe('RewardController', () => {
  let controller: RewardController;
  let rewardService: { checkRewardAssetOwnership: jest.Mock };

  beforeEach(async () => {
    rewardService = {
      checkRewardAssetOwnership: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardController],
      providers: [{ provide: RewardService, useValue: rewardService }],
    }).compile();

    controller = module.get<RewardController>(RewardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the authenticated user id to the ownership service', async () => {
    rewardService.checkRewardAssetOwnership.mockResolvedValue({
      rewardId: 'reward-1',
      rewardName: 'Cardano Beginner',
      owned: true,
      quantity: '1',
      assetUnit: 'policy123asset456',
    });

    await controller.checkOwnership(
      { id: 'user-1', email: 'a@example.com', username: 'alice', role: 'USER' },
      'reward-1',
    );

    expect(rewardService.checkRewardAssetOwnership).toHaveBeenCalledWith(
      'reward-1',
      'user-1',
    );
  });
});
