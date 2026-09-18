import { Module } from '@nestjs/common';
import { CardanoModule } from 'blockchain/src/cardano/cardano.module';
import { DatabaseModule } from 'src/database/database.module';
import { ChallengeController } from './challenge.controller';
import { ChallengeService } from './challenge.service';

@Module({
  imports: [DatabaseModule, CardanoModule],
  controllers: [ChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}
