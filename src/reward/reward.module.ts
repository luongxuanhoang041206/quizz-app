import { Module } from '@nestjs/common';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';
import { DatabaseModule } from 'src/database/database.module';
import { PinataModule } from 'blockchain/src/pinata/pinata.module';
import { CardanoModule } from 'blockchain/src/cardano/cardano.module';

@Module({
  imports: [
    DatabaseModule,
    PinataModule,
    CardanoModule,
  ],
  controllers: [RewardController],
  providers: [RewardService]
})
export class RewardModule {}
