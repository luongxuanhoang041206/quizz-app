import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthUser } from 'src/common/decorators/current-user.decorator';
import { ChallengeService } from './challenge.service';
import { ChallengeStatus } from './challenge.types';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { CreateChallengeRequirementDto } from './dto/create-challenge-requirement.dto';
import { UpdateChallengeRequirementDto } from './dto/update-challenge-requirement.dto';
import { CreateChallengeRewardDto } from './dto/create-challenge-reward.dto';
import { UpdateChallengeRewardDto } from './dto/update-challenge-reward.dto';

@Controller('challenges')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  // ==========================================
  // CHALLENGES
  // ==========================================

  @Post()
  @UseGuards(JwtAuthGuard)
  createChallenge(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateChallengeDto,
  ) {
    return this.challengeService.createChallenge(user.id, dto);
  }

  @Get()
  listPublicChallenges(@Query('status') status?: ChallengeStatus) {
    return this.challengeService.listPublicChallenges(
      status ? { status } : undefined,
    );
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMyChallenges(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ChallengeStatus,
  ) {
    return this.challengeService.listMyChallenges(
      user.id,
      status ? { status } : undefined,
    );
  }

  @Get(':challengeId')
  getChallenge(
    @Param('challengeId') challengeId: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.challengeService.getChallenge(challengeId, user?.id);
  }

  @Patch(':challengeId')
  @UseGuards(JwtAuthGuard)
  updateChallenge(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
    @Body() dto: UpdateChallengeDto,
  ) {
    return this.challengeService.updateChallenge(challengeId, user.id, dto);
  }

  @Delete(':challengeId')
  @UseGuards(JwtAuthGuard)
  deleteChallenge(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
  ) {
    return this.challengeService.deleteChallenge(challengeId, user.id);
  }

  @Post(':challengeId/publish')
  @UseGuards(JwtAuthGuard)
  publishChallenge(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
  ) {
    return this.challengeService.publishChallenge(challengeId, user.id);
  }

  @Post(':challengeId/cancel')
  @UseGuards(JwtAuthGuard)
  cancelChallenge(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
  ) {
    return this.challengeService.cancelChallenge(challengeId, user.id);
  }

  // ==========================================
  // REQUIREMENTS
  // ==========================================

  @Post(':challengeId/requirements')
  @UseGuards(JwtAuthGuard)
  addRequirement(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
    @Body() dto: CreateChallengeRequirementDto,
  ) {
    return this.challengeService.addRequirement(challengeId, user.id, dto);
  }

  @Get(':challengeId/requirements')
  listRequirements(@Param('challengeId') challengeId: string) {
    return this.challengeService.listRequirements(challengeId);
  }

  @Patch(':challengeId/requirements/:requirementId')
  @UseGuards(JwtAuthGuard)
  updateRequirement(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
    @Param('requirementId') requirementId: string,
    @Body() dto: UpdateChallengeRequirementDto,
  ) {
    return this.challengeService.updateRequirement(
      challengeId,
      requirementId,
      user.id,
      dto,
    );
  }

  @Delete(':challengeId/requirements/:requirementId')
  @UseGuards(JwtAuthGuard)
  deleteRequirement(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
    @Param('requirementId') requirementId: string,
  ) {
    return this.challengeService.deleteRequirement(
      challengeId,
      requirementId,
      user.id,
    );
  }

  // ==========================================
  // REWARDS
  // ==========================================

  @Post(':challengeId/rewards')
  @UseGuards(JwtAuthGuard)
  addReward(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
    @Body() dto: CreateChallengeRewardDto,
  ) {
    return this.challengeService.addReward(challengeId, user.id, dto);
  }

  @Get(':challengeId/rewards')
  listRewards(@Param('challengeId') challengeId: string) {
    return this.challengeService.listRewards(challengeId);
  }

  @Patch(':challengeId/rewards/:rewardId')
  @UseGuards(JwtAuthGuard)
  updateReward(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
    @Param('rewardId') rewardId: string,
    @Body() dto: UpdateChallengeRewardDto,
  ) {
    return this.challengeService.updateReward(
      challengeId,
      rewardId,
      user.id,
      dto,
    );
  }

  @Delete(':challengeId/rewards/:rewardId')
  @UseGuards(JwtAuthGuard)
  deleteReward(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
    @Param('rewardId') rewardId: string,
  ) {
    return this.challengeService.deleteReward(challengeId, rewardId, user.id);
  }

  // ==========================================
  // GATING & PARTICIPATION
  // ==========================================

  @Get(':challengeId/eligibility')
  @UseGuards(JwtAuthGuard)
  checkEligibility(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
  ) {
    return this.challengeService.checkChallengeEligibility(
      challengeId,
      user.id,
    );
  }

  @Post(':challengeId/start')
  @UseGuards(JwtAuthGuard)
  startChallenge(
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
  ) {
    return this.challengeService.startChallenge(challengeId, user.id);
  }
}
