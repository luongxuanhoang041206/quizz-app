import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthUser } from 'src/common/decorators/current-user.decorator';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { QueryQuizDto } from './dto/query-quiz.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizService } from './quiz.service';
import { toggleQuestionDto } from './dto/toggleQuestion.dto';

@ApiTags('Quizzes')
@Controller()
export class QuizController {
  constructor(private readonly quizService: QuizService) { }

  @Get('quizzes')
  @ApiOperation({ summary: 'List & search public quizzes' })
  @ApiQuery({ name: 'search',     required: false, example: 'capital',   description: 'Keyword matched against title and description.' })
  @ApiQuery({ name: 'category',   required: false, example: 'Geography', description: 'Filter by category name (case-insensitive partial match).' })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'medium', 'hard'], description: 'Filter by difficulty.' })
  @ApiQuery({ name: 'sort',       required: false, enum: ['newest', 'oldest', 'title'], example: 'newest' })
  @ApiQuery({ name: 'page',       required: false, example: 1  })
  @ApiQuery({ name: 'limit',      required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Paginated public quizzes.',
    schema: {
      example: {
        items: [
          {
            id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
            title: 'World Capitals Challenge',
            description: 'Test your knowledge of capital cities.',
            category: 'Geography',
            difficulty: 'easy',
            tags: ['world', 'capitals'],
            creator_id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
            visibility: 'public',
            created_at: '2026-06-08T04:00:00.000Z',
            users: {
              id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
              username: 'alice_quiz',
              avatar_url: 'https://example.com/avatars/alice.png',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  getPublicQuizzes(@Query() query: QueryQuizDto) {
    return this.quizService.getPublicQuizzes(query);
  }

  @Post('quizzes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a quiz' })
  @ApiBody({ type: CreateQuizDto })
  @ApiResponse({
    status: 201,
    description: 'Created quiz.',
    schema: {
      example: {
        id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
        title: 'World Capitals Challenge',
        description: 'Test your knowledge of capital cities.',
            visibility: 'public',
        creator_id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
        created_at: '2026-06-08T04:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  createQuiz(@CurrentUser() user: AuthUser, @Body() dto: CreateQuizDto) {
    return this.quizService.createQuiz(user.id, dto);
  }

  @Get('quizzes/:id')
  @ApiOperation({ summary: 'Get quiz details with questions' })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz details.',
    schema: {
      example: {
        id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
        title: 'World Capitals Challenge',
        description: 'Test your knowledge of capital cities.',
        visibility: 'public',
        users: {
          id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
          username: 'alice_quiz',
          avatar_url: 'https://example.com/avatars/alice.png',
        },
        questions: [
          {
            id: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
            question_text: 'What is the capital of France?',
            type: 'MULTIPLE_CHOICE',
            options: ['Paris', 'Rome', 'Berlin', 'Madrid'],
            correct_answer: { values: ['Paris'], indices: [0] },
            explanation: 'Paris is the capital of France.',
            order_index: 0,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  getQuiz(@Param('id') quizId: string) {
    return this.quizService.getQuiz(quizId);
  }

  @Patch('quizzes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a quiz owned by the current user' })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiBody({ type: UpdateQuizDto })
  @ApiResponse({
    status: 200,
    description: 'Updated quiz.',
    schema: {
      example: {
        id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
        title: 'World Capitals Challenge - Updated',
        description: 'A refreshed set of world capital questions.',
                visibility: 'public',
        updated_at: '2026-06-08T04:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the quiz owner may update it.',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  updateQuiz(
    @Param('id') quizId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.quizService.updateQuiz(quizId, user.id, dto);
  }

  @Delete('quizzes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a quiz owned by the current user' })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz deleted.',
  })
  @ApiResponse({ status: 400, description: 'Database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the quiz owner may delete it.',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  deleteQuiz(@Param('id') quizId: string, @CurrentUser() user: AuthUser) {
    return this.quizService.deleteQuiz(quizId, user.id);
  }

  @Post('quizzes/:id/questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a question in a quiz' })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiBody({ type: CreateQuestionDto })
  @ApiResponse({
    status: 201,
    description: 'Created question.',
    schema: {
      example: {
        id: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
        quiz_id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
        question_text: 'What is the capital of France?',
        type: 'MULTIPLE_CHOICE',
        options: ['Paris', 'Rome', 'Berlin', 'Madrid'],
        correct_answer: { values: ['Paris'], indices: [0] },
        explanation: 'Paris is the capital of France.',
        order_index: 0,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the quiz owner may add questions.',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  createQuestion(
    @Param('id') quizId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.quizService.createQuestion(quizId, user.id, dto);
  }

  @Patch('questions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a question owned by the current user' })
  @ApiParam({
    name: 'id',
    description: 'Question id.',
    example: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
  })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({
    status: 200,
    description: 'Updated question.',
    schema: {
      example: {
        id: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
        question_text: 'What is the capital city of France?',
        type: 'MULTIPLE_CHOICE',
        options: ['Paris', 'Lyon', 'Nice', 'Marseille'],
        correct_answer: { values: ['Paris'], indices: [0] },
        explanation: 'Paris is the capital of France.',
        order_index: 1,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the quiz owner may update questions.',
  })
  @ApiResponse({ status: 404, description: 'Question or quiz not found.' })
  updateQuestion(
    @Param('id') questionId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.quizService.updateQuestion(questionId, user.id, dto);
  }

  @Delete('questions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a question owned by the current user' })
  @ApiParam({
    name: 'id',
    description: 'Question id.',
    example: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
  })
  @ApiResponse({
    status: 200,
    description: 'Question deleted.',
    schema: { example: { message: 'Question deleted successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the quiz owner may delete questions.',
  })
  @ApiResponse({ status: 404, description: 'Question or quiz not found.' })
  deleteQuestion(
    @Param('id') questionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quizService.deleteQuestion(questionId, user.id);
  }

  @Put('quizzes/:id/questions/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reorder questions in a quiz' })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiBody({ type: ReorderQuestionsDto })
  @ApiResponse({
    status: 200,
    description: 'Questions reordered.',
    schema: { example: { message: 'Questions reordered successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the quiz owner may reorder questions.',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  reorderQuestions(
    @Param('id') quizId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.quizService.reorderQuestions(quizId, user.id, dto);
  }

  @Patch('answers/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an answer in a question' })
  @ApiParam({
    name: 'id',
    description: 'Answer id.',
    example: 'c1d2e3f4-0000-0000-0000-000000000001',
  })
  @ApiBody({ type: UpdateAnswerDto })
  @ApiResponse({
    status: 200,
    description: 'Updated answer.',
    schema: {
      example: {
        id: 'c1d2e3f4-0000-0000-0000-000000000001',
        question_id: '8bb536a6-d719-4e9f-a773-95d30f30d09b',
        text: 'Paris',
        is_correct: true,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the quiz owner may update answers.' })
  @ApiResponse({ status: 404, description: 'Answer or question not found.' })
  updateAnswer(
    @Param('id') answerId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAnswerDto,
  ) {
    return this.quizService.updateAnswer(answerId, user.id, dto);
  }

  @Delete('answers/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an answer from a question' })
  @ApiParam({
    name: 'id',
    description: 'Answer id.',
    example: 'c1d2e3f4-0000-0000-0000-000000000001',
  })
  @ApiResponse({
    status: 200,
    description: 'Answer deleted.',
    schema: { example: { message: 'Answer deleted successfully' } },
  })
  @ApiResponse({ status: 400, description: 'Database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the quiz owner may delete answers.' })
  @ApiResponse({ status: 404, description: 'Answer or question not found.' })
  deleteAnswer(
    @Param('id') answerId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quizService.deleteAnswer(answerId, user.id);
  }

  @Patch('quizzes/:id/visibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Toggle a quiz's visibility (public <-> private)" })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiBody({ type: toggleQuestionDto })
  @ApiResponse({ status: 200, description: 'Updated quiz.' })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the quiz owner may change visibility.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  toggleVisibility(
    @Param('id') quizId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: toggleQuestionDto,
  ) {
    return this.quizService.toggle(quizId, user.id, dto);
  }
}
