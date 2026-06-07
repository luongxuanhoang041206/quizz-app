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
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizService } from './quiz.service';

@Controller()
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('quizzes/search')
  searchQuizzes(@Query('q') keyword?: string) {
    return this.quizService.searchQuizzes(keyword);
  }

  @Get('quizzes')
  getPublicQuizzes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('q') keyword?: string,
  ) {
    return this.quizService.getPublicQuizzes({ page, limit, sort, keyword });
  }

  @Post('quizzes')
  @UseGuards(JwtAuthGuard)
  createQuiz(@CurrentUser() user: AuthUser, @Body() dto: CreateQuizDto) {
    return this.quizService.createQuiz(user.id, dto);
  }

  @Get('quizzes/:id')
  getQuiz(@Param('id') quizId: string) {
    return this.quizService.getQuiz(quizId);
  }

  @Patch('quizzes/:id')
  @UseGuards(JwtAuthGuard)
  updateQuiz(
    @Param('id') quizId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.quizService.updateQuiz(quizId, user.id, dto);
  }

  @Delete('quizzes/:id')
  @UseGuards(JwtAuthGuard)
  deleteQuiz(@Param('id') quizId: string, @CurrentUser() user: AuthUser) {
    return this.quizService.deleteQuiz(quizId, user.id);
  }

  @Post('quizzes/:id/questions')
  @UseGuards(JwtAuthGuard)
  createQuestion(
    @Param('id') quizId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.quizService.createQuestion(quizId, user.id, dto);
  }

  @Patch('questions/:id')
  @UseGuards(JwtAuthGuard)
  updateQuestion(
    @Param('id') questionId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.quizService.updateQuestion(questionId, user.id, dto);
  }

  @Delete('questions/:id')
  @UseGuards(JwtAuthGuard)
  deleteQuestion(
    @Param('id') questionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quizService.deleteQuestion(questionId, user.id);
  }

  @Put('quizzes/:id/questions/reorder')
  @UseGuards(JwtAuthGuard)
  reorderQuestions(
    @Param('id') quizId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.quizService.reorderQuestions(quizId, user.id, dto);
  }
}
