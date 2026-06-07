import { Test, TestingModule } from '@nestjs/testing';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';

describe('AttemptsController', () => {
  let controller: AttemptsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttemptsController],
      providers: [AttemptsService],
    }).compile();

    controller = module.get<AttemptsController>(AttemptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
