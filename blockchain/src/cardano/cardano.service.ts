import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Blockfrost,
  Data,
  Lucid,
   fromHex,
  mintingPolicyToId,
  type LucidEvolution,
  type MintingPolicy,
  type Network,
  applyParamsToScript,
} from '@lucid-evolution/lucid';
import fs from 'fs';
import path from 'path';
import { Cip25AssetMetadata, ClaimResponse } from '../achievement/interfaces/achievement.interface';
// Backend Payment Key Hash — baked into the minting policy at compile time
const BACKEND_PKH = '970115f50af244eeae9091406d7a0f8016baf32cc56576c840801ead';

interface PlutusValidator {
  title: string;
  hash: string;
  compiledCode: string;
}

interface PlutusJson {
  validators: PlutusValidator[];
}
const BackendPkhSchema = Data.Bytes();

type BackendPkh = Data.Static<typeof BackendPkhSchema>;

const BackendPkh = BackendPkhSchema as unknown as BackendPkh;
@Injectable()
export class CardanoService implements OnModuleInit {
  private lucid!: LucidEvolution;
  private policyId!: string;
  private mintingPolicy!: MintingPolicy;
  private network!: Network;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const blockfrostUrl = this.configService.getOrThrow<string>('BLOCKFROST_API_URL');
    const blockfrostProjectId = this.configService.getOrThrow<string>('BLOCKFROST_PROJECT_ID');
    const seedPhrase = this.configService.getOrThrow<string>('BACKEND_SEED_PHRASE');

    this.network = this.resolveNetwork(blockfrostUrl);

    this.lucid = await Lucid(
      new Blockfrost(blockfrostUrl, blockfrostProjectId),
      this.network,
    );

    this.lucid.selectWallet.fromSeed(seedPhrase);
    
  //   const validatorObj = this.loadMintAchievementValidator();

  //   const appliedScript = applyParamsToScript(
  //   validatorObj.compiledCode,
  //   [
  //     Data.to(
  //       BACKEND_PKH,
  //       BackendPkh,
  //     ),
  //   ],
  // );

  //   this.mintingPolicy = {
  //     type: 'PlutusV3',
  //     script: appliedScript,
  //   };

  //   this.policyId = mintingPolicyToId(this.mintingPolicy);

  //   console.log('[Cardano] BACKEND_PKH:', BACKEND_PKH);
  //   console.log('[Cardano] Policy ID:', this.policyId);
    const validatorObj = this.loadMintAchievementValidator();

      this.mintingPolicy = {
        type: 'PlutusV3',
        script: validatorObj.compiledCode,
      };

      this.policyId = mintingPolicyToId(this.mintingPolicy);

      console.log('[Cardano] Blueprint hash:', validatorObj.hash);
      console.log('[Cardano] Calculated policy ID:', this.policyId);
  }

  getPolicyId(): string {
    return this.policyId;
  }

  /**
   * Build and submit a CIP-25 NFT mint transaction.
   *
   * @param walletAddress  Bech32 address of the recipient (from DB, never from DTO).
   * @param assetNameHex   64-char hex string = SHA-256(quizId:userId) = 32 on-chain bytes.
   *                       Pass as-is — do NOT call fromText() on it (that would double-encode).
   * @param cip25Entry     { [assetNameHex]: { name, image, description, ... } }
   *                       This function wraps it in { [policyId]: cip25Entry } for label 721.
   */
  async buildAchievementClaimTx(
    walletAddress: string,
    assetNameHex: string,
    cip25Entry: Record<string, Cip25AssetMetadata>,
  ): Promise<ClaimResponse> {
    console.log('[Cardano] BACKEND_PKH:', BACKEND_PKH);
    const assetUnit = this.policyId + assetNameHex;

    // const cip25Metadata = {
    //   [this.policyId]: cip25Entry,
    // };

    console.log('\n========== CARDANO DEBUG ==========');

    console.log('policyId:', this.policyId);
    console.log('policyId length:', this.policyId.length);
    console.log(
      'policyId bytes:',
      Buffer.byteLength(this.policyId, 'utf8'),
    );

    console.log('assetNameHex:', assetNameHex);
    console.log('assetNameHex length:', assetNameHex.length);
    console.log(
      'assetNameHex bytes:',
      Buffer.byteLength(assetNameHex, 'utf8'),
    );

    console.log('assetUnit:', assetUnit);
    console.log('walletAddress:', walletAddress);
    
    const assetMetadata = cip25Entry[assetNameHex];

    console.log('assetMetadata:', assetMetadata);

    if (assetMetadata) {
      console.log('name:', assetMetadata.name);
      console.log(
        'name length:',
        assetMetadata.name?.length,
      );

      console.log('image:', assetMetadata.image);
      console.log(
        'image length:',
        assetMetadata.image?.length,
      );
      console.log(
        'image bytes:',
        assetMetadata.image
          ? Buffer.byteLength(assetMetadata.image, 'utf8')
          : 0,
      );

      console.log('description:', assetMetadata.description);
      console.log(
        'description length:',
        assetMetadata.description?.length,
      );
    }

    if (!assetMetadata) {
      throw new Error(
        `CIP-25 metadata not found for asset ${assetNameHex}`,
      );
    }

    const chunkString = (value: string, maxBytes = 64): string[] => {
      const chunks: string[] = [];
      let current = '';

      for (const char of value) {
        const next = current + char;

        if (Buffer.byteLength(next, 'utf8') > maxBytes) {
          if (!current) {
            throw new Error('Cannot split metadata value');
          }

          chunks.push(current);
          current = char;
        } else {
          current = next;
        }
      }

      if (current) {
        chunks.push(current);
      }

      return chunks;
    };

    const image =
      Buffer.byteLength(assetMetadata.image, 'utf8') <= 64
        ? assetMetadata.image
        : chunkString(assetMetadata.image);

    console.log('===================================\n');
    const cip25Metadata = {
      [this.policyId]: {
        [assetNameHex]: {
          name: assetMetadata.name,
          image,
          mediaType: 'image/png',
          ...(assetMetadata.description
            ? {
                description:
                  Buffer.byteLength(
                    assetMetadata.description,
                    'utf8',
                  ) <= 64
                    ? assetMetadata.description
                    : chunkString(assetMetadata.description),
              }
            : {}),
        },
      },
    };

    console.log(
      'CIP-25 metadata:',
      JSON.stringify(cip25Metadata, null, 2),
    );

    console.log(
      'image bytes:',
      Buffer.byteLength(assetMetadata.image, 'utf8'),
    );
    let tx: any;

    try {
      tx = await this.lucid
        .newTx()

        .mintAssets(
          { [assetUnit]: 1n },
          Data.void(),
        )

        .attach.MintingPolicy(this.mintingPolicy)

        .pay.ToAddress(walletAddress, {
          lovelace: 2_000_000n,
          [assetUnit]: 1n,
        })

        .attachMetadata(
          721,
          cip25Metadata,
        )
        
        .addSignerKey(BACKEND_PKH)

        .complete();
        console.log('[Cardano] BACKEND_PKH:', BACKEND_PKH);
        console.log("MINTING POLICY:", this.mintingPolicy);
        console.log(
          "POLICY ID:",
          mintingPolicyToId(this.mintingPolicy),
);

    } catch (e) {
      console.error(
        '[CardanoService] buildAchievementClaimTx error:',
        e,
      );

      throw e;
    }

    console.log('[CardanoService] TX built successfully');

    const signedTx = await tx.sign.withWallet().complete();

    console.log('[CardanoService] TX signed successfully');

    const txHash = await signedTx.submit();

    console.log('[CardanoService] txHash:', txHash);

    const ipfsCid =
      (cip25Entry[assetNameHex]?.image ?? '')
        .replace('ipfs://', '');

    return {
      txHash,
      unsignedTxCbor: signedTx.toCBOR(),
      ipfsCid,
      contentHash: '',
      policyId: this.policyId,
      userAssetName: assetNameHex,
    };
  }

  private loadMintAchievementValidator(): PlutusValidator {
    const plutusJson = this.readPlutusJson();
    const validator = plutusJson.validators.find(
      (v) => v.title === 'mint_achievement.mint_achievement.mint',
    );

    if (!validator) {
      throw new Error('mint_achievement validator not found in plutus.json');
    }

    return validator;
  }

  private readPlutusJson(): PlutusJson {
    const plutusJsonPath =
      this.configService.get<string>('PLUTUS_JSON_PATH') ??
      this.resolveDefaultPlutusJsonPath();

    return JSON.parse(fs.readFileSync(plutusJsonPath, 'utf-8')) as PlutusJson;
  }

  private resolveDefaultPlutusJsonPath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'blockchain/contracts/quiz-achievement/plutus.json'),
      path.resolve(process.cwd(), 'contracts/quiz-achievement/plutus.json'),
      path.resolve(__dirname, '../../contracts/quiz-achievement/plutus.json'),
    ];

    const found = candidates.find((c) => fs.existsSync(c));
    if (!found) throw new Error('contracts/quiz-achievement/plutus.json not found');
    return found;
  }

  private resolveNetwork(blockfrostUrl: string): Network {
    if (blockfrostUrl.includes('mainnet')) return 'Mainnet';
    if (blockfrostUrl.includes('preprod')) return 'Preprod';
    return 'Preview';
  }
}
