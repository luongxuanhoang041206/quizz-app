import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthUser } from 'src/common/decorators/current-user.decorator';
@UseGuards(JwtAuthGuard)
@Controller('sessions/:id')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Post('submit')
  submitAnswer(
    @Param('id') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.leaderboardService.submitAnswer(sessionId,user.id, dto);
  }

  @Get('leaderboard')
  getLeaderboard(@Param('id') sessionId: string) {
    return this.leaderboardService.getLeaderboard(sessionId);
  }
}
