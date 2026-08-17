import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthUser } from 'src/common/decorators/current-user.decorator';
import { AchievementService } from './achievement.service';
import { ClaimAchievementDto } from './dto/claim-achievement.dto';

import { EarnedAchievementDto } from './dto/earned-achievement-response.dto';

@ApiTags('Achievement')
@Controller(['achievements', 'achievement'])
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get earned achievements (SUCCESS) for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of earned achievements joined with reward info.',
    type: [EarnedAchievementDto],
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  async getMyEarnedAchievements(@CurrentUser() user: AuthUser) {
    return this.achievementService.getMyEarnedAchievements(user.id);
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Claim achievement NFT for a passed quiz attempt' })
  @ApiBody({ type: ClaimAchievementDto })
  @ApiResponse({ status: 201, description: 'NFT minted and tx submitted.' })
  @ApiResponse({ status: 400, description: 'Validation error or ineligible attempt.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Attempt or achievement not found.' })
  async claim(
    @CurrentUser() user: AuthUser,
    @Body() dto: ClaimAchievementDto,
  ) {
    // achievementId comes from the DTO, not a URL param
    return this.achievementService.claim(user.id, dto.achievement_id);
  }
}
