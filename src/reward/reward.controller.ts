import { Body, Controller, Param, Post, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { RewardService } from './reward.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthUser } from '@supabase/supabase-js';
import { Role } from 'src/common/enums/role.enum';
import { CreateRewardDto } from './dto/create-reward.dto';
import { FileInterceptor } from '@nestjs/platform-express';
@Controller()
export class RewardController {
    constructor(private readonly rewardService: RewardService) {}

    @Post('reward')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @UseInterceptors(FileInterceptor('image'))
    createReward(@CurrentUser() user: AuthUser, @Body() dto: CreateRewardDto,@UploadedFile() image: Express.Multer.File,) {
        return this.rewardService.createReward(user.id, dto, image);
    }
}
