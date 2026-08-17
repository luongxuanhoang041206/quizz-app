import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { PinataService } from '../pinata/pinata.service';
import { CardanoService } from '../cardano/cardano.service';
import { ClaimAchievementDto } from './dto/claim-achievement.dto';
import { AchievementMetadata, ApiError, Cip25AssetMetadata, ClaimResponse } from './interfaces/achievement.interface';
import crypto from 'crypto';

const NFT_SCORE_THRESHOLD = 80;

@Injectable()
export class AchievementService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly pinataService: PinataService,
    private readonly cardanoService: CardanoService,
  ) {}

  async getMyEarnedAchievements(userId: string) {
    const { data, error } = await this.supabase
      .from('achievement')
      .select(`
        id,
        status,
        quiz_id,
        reward_id,
        tx_hash,
        policy_id,
        asset_name,
        ipfs_cid,
        minted_at,
        created_at,
        reward:reward_id (
          id,
          name,
          description,
          image
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'SUCCESS')
      .order('minted_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data || []).map((item: any) => {
      const rewardObj = Array.isArray(item.reward) ? item.reward[0] : item.reward;
      return {
        id: item.id,
        status: item.status,
        quizId: item.quiz_id,
        reward: rewardObj
          ? {
              id: rewardObj.id,
              name: rewardObj.name,
              description: rewardObj.description ?? null,
              image: rewardObj.image,
              metadata: null,
              policyType: 'CIP25',
              policyId: item.policy_id ?? null,
              assetName: item.asset_name ?? null,
            }
          : null,
        txHash: item.tx_hash ?? null,
        mintedAt: item.minted_at ?? item.created_at ?? null,
      };
    });
  }

  async claim(userId: string, achievementId: string) {
    const { data: achievement, error } = await this.supabase
      .from('achievement')
      .select(`
        id,
        status,
        quiz_id,
        reward_id,
        user_id,
        reward(*)
        `)
        .eq('id', achievementId)
        .eq('user_id', userId)
        .single();

      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('wallet_address')
        .eq('id', achievement?.user_id)
        .single();

        if (error || !achievement) {
          throw new NotFoundException('Achievement không tồn tại');
        }

        if(achievement.status !== 'PENDING') {
          throw new BadRequestException(
            `Achievement đang ở trạng thái ${achievement.status}`,
          );
        }

        const walletAddress = user?.wallet_address;

        if (!walletAddress) {
          throw new BadRequestException(
            'User chưa liên kết ví Cardano',
          );
        }

        if (!achievement.reward) {
          throw new BadRequestException(
            'Reward không tồn tại',
          );
        }

        const { data: dataReward } = await this.supabase
          .from('reward')
          .select('name, image, description')
          .eq('id', achievement.reward_id)
          .single();

        try {

         const assetName = crypto
          .createHash('sha256')
          .update(`${achievement.quiz_id}:${achievement.user_id}`)
          .digest('hex');

          const metadata = {
            [assetName]: {
              name: dataReward?.name,
              image: dataReward?.image,
              mediaType: "image/png",
              description: dataReward?.description
            }
          };

          const result = await this.cardanoService.buildAchievementClaimTx(
            user.wallet_address,
            assetName,
            metadata,
          );

          await this.supabase
            .from('achievement')
            .update({
              status: 'SUCCESS',
              tx_hash: result.txHash,
              policy_id: result.policyId,
              asset_name: result.userAssetName,
              minted_at: new Date().toISOString(),
              ipfs_cid: result.ipfsCid,
            })
            .eq('id', achievement.id);
            return {
              tx_hash: result.txHash,
            };
        } catch(e) {
          await this.supabase
            .from('achievement')
            .update({
              status: 'FAILED',
            })
            .eq('id', achievement.id);

            throw e ;
        }
  }

  // async claim(userId: string, dto: ClaimAchievementDto, achievementId: string): Promise<ClaimResponse> {
  //   try {



  //     // 2. Ownership
  //     if (attempt.user_id !== userId) {
  //       throw new BadRequestException({ error: 'Bạn không phải chủ sở hữu của lượt thi này' } as ApiError);
  //     }

  //     // 3. Must be submitted
  //     if (attempt.status !== 'submitted') {
  //       throw new BadRequestException({ error: 'Lượt thi chưa hoàn thành' } as ApiError);
  //     }

  //     // 4. Score threshold
  //     const totalPoints = attempt.total_points ?? 100;
  //     const scorePercentage = totalPoints > 0 ? (attempt.score / totalPoints) * 100 : 0;
  //     if (scorePercentage < NFT_SCORE_THRESHOLD) {
  //       throw new BadRequestException({
  //         error: `Điểm số chưa đạt ${NFT_SCORE_THRESHOLD}% để nhận NFT (đạt ${scorePercentage.toFixed(1)}%)`,
  //       } as ApiError);
  //     }

  //     // 5. Anti-replay
  //     if (attempt.is_claimed) {
  //       throw new BadRequestException({ error: 'NFT cho lượt thi này đã được nhận trước đó' } as ApiError);
  //     }

  //     // 6. Fetch achievement record (PENDING — created by attempts.service after submit)
  //     const { data: achievement, error: achErr } = await this.supabase
  //       .from('achievement')
  //       .select('id, status, reward_id')
  //       .eq('id', achievementId)
  //       .single();

  //     if (achErr || !achievement) {
  //       throw new NotFoundException({ error: 'Achievement không tồn tại' } as ApiError);
  //     }

  //     if (achievement.status === 'COMPLETED') {
  //       throw new BadRequestException({ error: 'Achievement này đã được mint' } as ApiError);
  //     }

  //     // 7. Query reward metadata (name, description, image)
  //     const { data: reward, error: rewardErr } = await this.supabase
  //       .from('reward')
  //       .select('id, name, description, image')
  //       .eq('id', achievement.reward_id)
  //       .single();

  //     if (rewardErr || !reward) {
  //       throw new NotFoundException({ error: 'Reward không tồn tại' } as ApiError);
  //     }

  //     // 8. Build CIP-25 metadata
  //     const assetName = this.deriveAssetName(attempt.quiz_id, userId);

  //     const metadata: AchievementMetadata = {
  //       name: reward.name,
  //       description: reward.description,
  //       image: reward.image, // already ipfs://... or https://...
  //       quizId: attempt.quiz_id,
  //     };

  //     // 9. Upload metadata JSON to IPFS
  //     const upload = await this.pinataService.uploadAchievementToIPFS(metadata);

  //     // 10. Build CIP-25 on-chain metadata object (passed to cardano service)
  //     const cip25MetadataEntry: Record<string, Cip25AssetMetadata> = {
  //       [assetName]: {
  //         name: reward.name,
  //         description: reward.description,
  //         image: `ipfs://${upload.cid}`,
  //         quizId: attempt.quiz_id,
  //       },
  //     };

  //     // 11. Mint NFT — submit transaction on-chain
  //     const claimTx = await this.cardanoService.buildAchievementClaimTx(
  //       dto,
  //       assetName,
  //       cip25MetadataEntry,
  //     );

  //     // 12. Mark attempt as claimed
  //     await this.supabase
  //       .from('attempts')
  //       .update({ is_claimed: true, claimed_at: new Date().toISOString() })
  //       .eq('id', dto.attemptId);

  //     // 13. Update achievement record with tx details
  //     await this.supabase
  //       .from('achievement')
  //       .update({
  //         user_id: userId,
  //         quiz_id: attempt.quiz_id,
  //         tx_hash: claimTx.txHash,
  //         policy_id: claimTx.policyId,
  //         asset_name: claimTx.userAssetName,
  //         ipfs_cid: upload.cid,
  //         status: 'COMPLETED',
  //         minted_at: new Date().toISOString(),
  //       })
  //       .eq('id', achievementId);

  //     // 14. Create badge entry for the user
  //     await this.badgeService.createBadge(
  //       userId,
  //       achievementId,
  //       reward.name,
  //       reward.image,
  //       claimTx.policyId,
  //       claimTx.userAssetName,
  //       claimTx.txHash,
  //     );

  //     return claimTx;
  //   } catch (error) {
  //     if (
  //       error instanceof BadRequestException ||
  //       error instanceof NotFoundException
  //     ) {
  //       throw error;
  //     }
  //     const message = error instanceof Error ? error.message : 'Unknown error';
  //     throw new InternalServerErrorException({
  //       error: 'Achievement claim failed',
  //       details: message,
  //     } as ApiError);
  //   }
  // }

  // /**
  //  * Derive a deterministic hex asset name from quizId + userId.
  //  * 32 bytes (64 hex chars) — fits Cardano asset name limit.
  //  * The contract only checks: asset_name != "" and quantity == 1.
  //  */
  // private deriveAssetName(quizId: string, userId: string): string {
  //   return crypto
  //     .createHash('sha256')
  //     .update(`${quizId}:${userId}`)
  //     .digest('hex');
  // }
}
