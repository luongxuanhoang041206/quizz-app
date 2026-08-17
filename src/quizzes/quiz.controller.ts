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
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Role } from 'src/common/enums/role.enum';
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
  @ApiQuery({ name: 'search',     required: false, example: 'capital' })
  @ApiQuery({ name: 'category',   required: false, example: 'Geography' })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['easy', 'medium', 'hard'] })
  @ApiQuery({ name: 'sort',       required: false, enum: ['newest', 'oldest', 'title'], example: 'newest' })
  @ApiQuery({ name: 'page',       required: false, example: 1 })
  @ApiQuery({ name: 'limit',      required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated public quizzes.' })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  getPublicQuizzes(@Query() query: QueryQuizDto) {
    return this.quizService.getPublicQuizzes(query);
  }

  @Post('quizzes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a quiz. ADMIN may set isNftQuiz=true; USER always gets isNftQuiz=false.' })
  @ApiBody({ type: CreateQuizDto })
  @ApiResponse({ status: 201, description: 'Created quiz.' })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  createQuiz(@CurrentUser() user: AuthUser, @Body() dto: CreateQuizDto) {
    return this.quizService.createQuiz(user.id, dto, user.role);
  }

  @Get('quizzes/:id')
  @ApiOperation({ summary: 'Get quiz details with questions' })
  @ApiParam({ name: 'id', example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9' })
  @ApiResponse({ status: 200, description: 'Quiz details.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  getQuiz(@Param('id') quizId: string) {
    return this.quizService.getQuiz(quizId);
  }

  @Patch('quizzes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a quiz. ADMIN may set isNftQuiz; USER requests ignore isNftQuiz.' })
  @ApiParam({ name: 'id', example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9' })
  @ApiBody({ type: UpdateQuizDto })
  @ApiResponse({ status: 200, description: 'Updated quiz.' })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the quiz owner may update it.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  updateQuiz(
    @Param('id') quizId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.quizService.updateQuiz(quizId, user.id, dto, user.role);
  }

  @Delete('quizzes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a quiz owned by the current user' })
  @ApiParam({ name: 'id', example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9' })
  @ApiResponse({ status: 200, description: 'Quiz deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the quiz owner may delete it.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  deleteQuiz(@Param('id') quizId: string, @CurrentUser() user: AuthUser) {
    return this.quizService.deleteQuiz(quizId, user.id);
  }

  // ADMIN-only: enable NFT reward on any existing quiz
  @Patch('quizzes/:id/enable-nft')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[ADMIN] Enable NFT reward on a quiz' })
  @ApiParam({ name: 'id', example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9' })
  @ApiResponse({ status: 200, description: 'NFT enabled on quiz.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'ADMIN role required.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  enableNft(@Param('id') quizId: string) {
    return this.quizService.enableNft(quizId);
  }

  @Post('quizzes/:id/questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a question in a quiz' })
  @ApiParam({ name: 'id', example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9' })
  @ApiBody({ type: CreateQuestionDto })
  @ApiResponse({ status: 201, description: 'Created question.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the quiz owner may add questions.' })
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
  @ApiOperation({ summary: 'Update a question' })
  @ApiParam({ name: 'id', example: '8bb536a6-d719-4e9f-a773-95d30f30d09b' })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({ status: 200, description: 'Updated question.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the quiz owner may update questions.' })
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
  @ApiOperation({ summary: 'Delete a question' })
  @ApiParam({ name: 'id', example: '8bb536a6-d719-4e9f-a773-95d30f30d09b' })
  @ApiResponse({ status: 200, description: 'Question deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the quiz owner may delete questions.' })
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
  @ApiParam({ name: 'id', example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9' })
  @ApiBody({ type: ReorderQuestionsDto })
  @ApiResponse({ status: 200, description: 'Questions reordered.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 403, description: 'Only the quiz owner may reorder questions.' })
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
  @ApiParam({ name: 'id', example: 'c1d2e3f4-0000-0000-0000-000000000001' })
  @ApiBody({ type: UpdateAnswerDto })
  @ApiResponse({ status: 200, description: 'Updated answer.' })
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
  @ApiParam({ name: 'id', example: 'c1d2e3f4-0000-0000-0000-000000000001' })
  @ApiResponse({ status: 200, description: 'Answer deleted.' })
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
  @ApiParam({ name: 'id', example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9' })
  @ApiBody({ type: toggleQuestionDto })
  @ApiResponse({ status: 200, description: 'Updated quiz.' })
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
