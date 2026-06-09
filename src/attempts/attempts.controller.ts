import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AttemptsService } from './attempts.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { UpdateAttemptDto } from './dto/update-attempt.dto';

@ApiTags('Attempts')
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Start a new quiz attempt' })
  @ApiBody({ type: CreateAttemptDto })
  @ApiResponse({
    status: 201,
    description: 'Attempt started.',
    schema: {
      example: {
        id: '4e283391-a313-43dc-a13c-76bbd42b3f32',
        user_id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
        quiz_id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
        status: 'started',
        started_at: '2026-06-08T04:10:00.000Z',
        answers: {},
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Quiz not found or not public.' })
  create(
    @Body() createAttemptDto: CreateAttemptDto,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.attemptsService.create(user.id, createAttemptDto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit an attempt and calculate score' })
  @ApiParam({
    name: 'id',
    description: 'Attempt id.',
    example: '4e283391-a313-43dc-a13c-76bbd42b3f32',
  })
  @ApiBody({ type: SubmitAttemptDto })
  @ApiResponse({
    status: 201,
    description: 'Attempt submitted and scored.',
    schema: {
      example: {
        id: '4e283391-a313-43dc-a13c-76bbd42b3f32',
        user_id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
        quiz_id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
        status: 'completed',
        score: 10,
        total_points: 10,
        submitted_at: '2026-06-08T04:20:00.000Z',
        answers: {
          '8bb536a6-d719-4e9f-a773-95d30f30d09b': {
            question_id: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
            selected_option: 'Paris',
            is_correct: true,
          },
        },
        detail: {
          score: 10,
          total_points: 10,
          percentage: '100.00',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid attempt state or answer.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Attempt not found.' })
  submit(
    @Param('id') attemptId: string,
    @Body() submitAttemptDto: SubmitAttemptDto,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.attemptsService.submit(attemptId, submitAttemptDto, user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get attempt result details' })
  @ApiParam({
    name: 'id',
    description: 'Attempt id.',
    example: '4e283391-a313-43dc-a13c-76bbd42b3f32',
  })
  @ApiResponse({
    status: 200,
    description: 'Attempt details with answers and explanations.',
    schema: {
      example: {
        id: '4e283391-a313-43dc-a13c-76bbd42b3f32',
        user_id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
        quiz_id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
        status: 'completed',
        score: 10,
        total_points: 10,
        percentage: '100.00',
        started_at: '2026-06-08T04:10:00.000Z',
        submitted_at: '2026-06-08T04:20:00.000Z',
        answers_detail: [
          {
            question_id: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
            content: 'What is the capital of France?',
            options: ['Paris', 'Rome', 'Berlin', 'Madrid'],
            correct_answer: 'Paris',
            selected_option: 'Paris',
            is_correct: true,
            points: 10,
            explanation: 'Paris is the capital of France.',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'User cannot access this attempt.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Attempt not found.' })
  findOne(
    @Param('id') attemptId: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.attemptsService.findOne(attemptId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Legacy attempts list endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Legacy placeholder response.',
    schema: { type: 'string', example: 'This action returns all attempts' },
  })
  findAll() {
    return this.attemptsService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Legacy update attempt endpoint' })
  @ApiParam({ name: 'id', description: 'Numeric attempt id.', example: '1' })
  @ApiBody({ type: UpdateAttemptDto })
  @ApiResponse({
    status: 200,
    description: 'Legacy placeholder response.',
    schema: { type: 'string', example: 'This action updates a #1 attempt' },
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  update(@Param('id') id: string, @Body() updateAttemptDto: UpdateAttemptDto) {
    return this.attemptsService.update(+id, updateAttemptDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Legacy remove attempt endpoint' })
  @ApiParam({ name: 'id', description: 'Numeric attempt id.', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Legacy placeholder response.',
    schema: { type: 'string', example: 'This action removes a #1 attempt' },
  })
  remove(@Param('id') id: string) {
    return this.attemptsService.remove(+id);
  }
}
