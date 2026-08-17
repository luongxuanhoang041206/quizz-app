const mockSignedTx = {
  toCBOR: jest.fn().mockReturnValue('signed-cbor-hex'),
  submit: jest.fn().mockResolvedValue('tx-hash-abc'),
};

const mockCompletedTx = {
  sign: {
    withWallet: jest.fn().mockReturnValue({
      complete: jest.fn().mockResolvedValue(mockSignedTx),
    }),
  },
};

const mockTxBuilder: any = {};
mockTxBuilder.mintAssets = jest.fn().mockReturnValue(mockTxBuilder);
mockTxBuilder.attach = {
  MintingPolicy: jest.fn().mockReturnValue(mockTxBuilder),
};
mockTxBuilder.pay = {
  ToAddress: jest.fn().mockReturnValue(mockTxBuilder),
};
mockTxBuilder.attachMetadata = jest.fn().mockReturnValue(mockTxBuilder);
mockTxBuilder.addSignerKey = jest.fn().mockReturnValue(mockTxBuilder);
mockTxBuilder.complete = jest.fn().mockResolvedValue(mockCompletedTx);

const mockLucidInstance = {
  selectWallet: {
    fromSeed: jest.fn(),
  },
  newTx: jest.fn().mockReturnValue(mockTxBuilder),
};

jest.mock('@lucid-evolution/lucid', () => ({
  __esModule: true,
  Lucid: jest.fn().mockResolvedValue(mockLucidInstance),
  Blockfrost: jest.fn().mockImplementation(() => ({})),
  Data: {
    void: jest.fn().mockReturnValue('mock-void-redeemer'),
  },
  mintingPolicyToId: jest.fn().mockReturnValue('policyId123'),
}));

// Stub out fs.readFileSync / fs.existsSync so the validator loads in tests
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(
    JSON.stringify({
      validators: [
        {
          title: 'mint_achievement.mint_achievement.mint',
          hash: 'abc',
          compiledCode: '590100deadbeef',
        },
      ],
    }),
  ),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CardanoService } from './cardano.service';
import { Cip25AssetMetadata } from '../achievement/interfaces/achievement.interface';

const mockConfigService = {
  getOrThrow: jest.fn(),
  get: jest.fn(),
};

describe('CardanoService', () => {
  let service: CardanoService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      switch (key) {
        case 'BLOCKFROST_API_URL':
          return 'https://cardano-preprod.blockfrost.io/api/v0';
        case 'BLOCKFROST_PROJECT_ID':
          return 'test_project_id';
        case 'BACKEND_SEED_PHRASE':
          return 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24';
        default:
          throw new Error(`Missing config ${key}`);
      }
    });
    mockConfigService.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardanoService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CardanoService>(CardanoService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return policyId from getPolicyId()', () => {
    expect(service.getPolicyId()).toBe('policyId123');
  });

  it('should build and submit a CIP-25 mint transaction', async () => {
    const walletAddress = 'addr_test1qxyz';
    // 64-char hex = 32 bytes on-chain
    const assetNameHex = 'a'.repeat(64);
    const cip25Entry: Record<string, Cip25AssetMetadata> = {
      [assetNameHex]: {
        name: 'Test Badge',
        image: 'ipfs://QmTest',
        description: 'A test badge',
      },
    };

    const response = await service.buildAchievementClaimTx(walletAddress, assetNameHex, cip25Entry);

    expect(response.txHash).toBe('tx-hash-abc');
    expect(response.unsignedTxCbor).toBe('signed-cbor-hex');
    expect(response.policyId).toBe('policyId123');
    expect(response.userAssetName).toBe(assetNameHex);
    expect(response.ipfsCid).toBe('QmTest');

    // Verify the asset unit passed to mintAssets is policyId + assetNameHex (no fromText encoding)
    expect(mockTxBuilder.mintAssets).toHaveBeenCalledWith(
      { [`policyId123${assetNameHex}`]: 1n },
      'mock-void-redeemer',
    );

    // Verify NFT is sent to user wallet
    expect(mockTxBuilder.pay.ToAddress).toHaveBeenCalledWith(walletAddress, {
      lovelace: 2_000_000n,
      [`policyId123${assetNameHex}`]: 1n,
    });

    // Verify CIP-25 metadata label 721
    expect(mockTxBuilder.attachMetadata).toHaveBeenCalledWith(721, {
      policyId123: cip25Entry,
    });
  });

  it('should throw if lucid tx building throws', async () => {
    mockTxBuilder.complete.mockRejectedValueOnce(new Error('Insufficient funds'));

    const cip25Entry: Record<string, Cip25AssetMetadata> = {
      ['a'.repeat(64)]: { name: 'x', image: 'ipfs://y' },
    };

    await expect(
      service.buildAchievementClaimTx('addr_test1qxyz', 'a'.repeat(64), cip25Entry),
    ).rejects.toThrow('Insufficient funds');
  });
});
