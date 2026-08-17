import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { XpService } from './xp.service';
import { ActivityService } from './activity.service';

@Module({
  controllers: [UserController],
  providers: [UserService, XpService, ActivityService],
  exports: [UserService, XpService, ActivityService],
})
export class UserModule {}
