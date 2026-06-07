import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { StartAttemptDto } from './dto/start-attempt.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Controller('api/attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async start(@CurrentUser() user: any, @Body() dto: StartAttemptDto) {
    return this.attemptsService.startAttempt(user.id, dto.quiz_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/submit')
  async submit(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.attemptsService.submitAttempt(user.id, id, dto.answers || []);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.attemptsService.getAttempt(user.id, id);
  }
}
