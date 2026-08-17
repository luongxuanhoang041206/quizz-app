import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { UserModule } from 'src/users/user.module';
import { CardanoModule } from '../cardano/cardano.module';
import { AchievementController } from './achievement.controller';
import { AchievementService } from './achievement.service';
import { PinataModule } from '../pinata/pinata.module';

@Module({
  imports: [DatabaseModule, CardanoModule, UserModule, PinataModule],
  controllers: [AchievementController],
  providers: [AchievementService],
  exports: [AchievementService],
})
export class AchievementModule {}
