import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { CreateRewardDto } from './dto/create-reward.dto';
import { PinataService } from 'blockchain/src/pinata/pinata.service';
import { CardanoService } from 'blockchain/src/cardano/cardano.service';

@Injectable()
export class RewardService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly pinataService: PinataService,
    private readonly cardanoService: CardanoService,
  ) {}

  async createReward(
    userId: string,
    dto: CreateRewardDto,
    image: Express.Multer.File,
  ) {
    const uploaded = await this.pinataService.uploadFile(
      image.buffer,
      image.originalname,
      image.mimetype,
    );

    const { data, error } = await this.supabase
      .from('reward')
      .insert({
        name: dto.name,
        description: dto.description,
        image: `ipfs://${uploaded.cid}`,
        // metadata: dto.metadata ?? null,
        // created_by: userId,
      })
      .select('id, name, description, image')
      .single();

    if (error) throw new BadRequestException(error.message);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      image: data.image,
    };
  }

  async checkRewardAssetOwnership(rewardId: string, userId: string) {
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id, wallet_address')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new NotFoundException('User not found');
    }

    if (!user.wallet_address) {
      throw new BadRequestException('User wallet address is not configured');
    }

    const reward = await this.supabase
      .from('reward')
      .select('id, name, policy_id, asset_name')
      .eq('id', rewardId)
      .single();

    if (reward.error) throw new NotFoundException('Reward not found');

    if (!reward.data.policy_id || !reward.data.asset_name) {
      throw new BadRequestException(
        'Reward does not have blockchain asset identity',
      );
    }

    const ownership = await this.cardanoService.checkAssetOwnership(
      user.wallet_address,
      reward.data.policy_id,
      reward.data.asset_name,
    );

    return {
      rewardId: reward.data.id,
      rewardName: reward.data.name,
      owned: ownership.owned,
      quantity: ownership.quantity.toString(),
      assetUnit: ownership.assetUnit,
    };
  }
}
