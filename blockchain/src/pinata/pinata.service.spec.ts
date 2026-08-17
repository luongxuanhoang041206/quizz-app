import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PinataService } from './pinata.service';

describe('PinataService', () => {
  let service: PinataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinataService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt'),
          },
        },
      ],
    }).compile();

    service = module.get<PinataService>(PinataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

