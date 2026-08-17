import { Test, TestingModule } from '@nestjs/testing';
import { AchievementController } from './achievement.controller';
import { AchievementService } from './achievement.service';
import type { AuthUser } from 'src/common/decorators/current-user.decorator';

describe('AchievementController', () => {
  let controller: AchievementController;
  let service: AchievementService;

  const mockAchievementService = {
    claim: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AchievementController],
      providers: [
        {
          provide: AchievementService,
          useValue: mockAchievementService,
        },
      ],
    }).compile();

    controller = module.get<AchievementController>(AchievementController);
    service = module.get<AchievementService>(AchievementService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call achievementService.claim with userId and achievement_id', async () => {
    const mockUser: AuthUser = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
    };
    const mockDto = { achievement_id: '550e8400-e29b-41d4-a716-446655440000' };
    const mockResponse = { tx_hash: 'tx123' };

    mockAchievementService.claim.mockResolvedValue(mockResponse);

    const result = await controller.claim(mockUser, mockDto as any);

    expect(service.claim).toHaveBeenCalledWith('user-123', '550e8400-e29b-41d4-a716-446655440000');
    expect(result).toBe(mockResponse);
  });

  it('should return health ok', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
