import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { XpService } from './xp.service';
import { BadgeService } from './badge.service';
import { ActivityService } from './activity.service';

@Module({
  controllers: [UserController],
  providers: [UserService, XpService, BadgeService, ActivityService],
  exports: [XpService, BadgeService, ActivityService],
})
export class UserModule {}
