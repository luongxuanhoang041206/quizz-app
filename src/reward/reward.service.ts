import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { CreateRewardDto } from './dto/create-reward.dto';
import { PinataService } from 'blockchain/src/pinata/pinata.service';

@Injectable()
export class RewardService {
    constructor(
        @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
        private readonly pinataService: PinataService
    ) {}

    async createReward(userId: string, dto: CreateRewardDto, image: Express.Multer.File) {
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
}
