import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { UpdateAttemptDto } from './dto/update-attempt.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  /**
   * POST /api/attempts
   * Bắt đầu làm quiz - tạo một attempt mới
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createAttemptDto: CreateAttemptDto, @CurrentUser() user: { id: string; email: string }) {
    return this.attemptsService.create(user.id, createAttemptDto);
  }

  /**
   * POST /api/attempts/:id/submit
   * Nộp bài và chấm điểm
   */
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  submit(
    @Param('id') attemptId: string,
    @Body() submitAttemptDto: SubmitAttemptDto,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.attemptsService.submit(attemptId, submitAttemptDto, user.id);
  }

  /**
   * GET /api/attempts/:id
   * Lấy chi tiết kết quả làm bài (bao gồm questions, answers, explanations)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') attemptId: string, @CurrentUser() user: { id: string; email: string }) {
    return this.attemptsService.findOne(attemptId, user.id);
  }

  @Get()
  findAll() {
    return this.attemptsService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAttemptDto: UpdateAttemptDto) {
    return this.attemptsService.update(+id, updateAttemptDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attemptsService.remove(+id);
  }
}

