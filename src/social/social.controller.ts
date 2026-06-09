import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateSocialDto } from './dto/create-social.dto';
import { SocialService } from './social.service';

@ApiTags('Social')
@Controller()
export class SocialController {
  constructor(private readonly socialService: SocialService) { }

  @Post('quizzes/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle like for a quiz' })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiResponse({
    status: 201,
    description: 'Like state after toggling.',
    schema: { example: { liked: true } },
  })
  @ApiResponse({ status: 400, description: 'Unable to add or remove like.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  toggleLike(
    @Param('id') quizId: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.socialService.toggleLike(quizId, user.id);
  }

  @Post('quizzes/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle bookmark for a quiz' })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiResponse({
    status: 201,
    description: 'Bookmark state after toggling.',
    schema: { example: { bookmarked: true } },
  })
  @ApiResponse({
    status: 400,
    description: 'Unable to add or remove bookmark.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  toggleBookmark(
    @Param('id') quizId: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.socialService.toggleBookmark(quizId, user.id);
  }

  @Get('quizzes/:id/comments')
  @ApiOperation({ summary: 'List comments for a quiz' })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiResponse({
    status: 200,
    description: 'Comments for the quiz.',
    schema: {
      example: [
        {
          id: '660a9d34-7ab9-4c98-b3c8-950dc3cd20c8',
          content: 'Great quiz, the final question was tricky!',
          created_at: '2026-06-08T04:25:00.000Z',
          updated_at: '2026-06-08T04:25:00.000Z',
          user: {
            username: 'alice_quiz',
            avatar_url: 'https://example.com/avatars/alice.png',
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Unable to load comments.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  getComments(@Param('id') quizId: string) {
    return this.socialService.getComments(quizId);
  }

  @Post('quizzes/:id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a comment to a quiz' })
  @ApiParam({
    name: 'id',
    description: 'Quiz id.',
    example: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
  })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: 201,
    description: 'Created comment.',
    schema: {
      example: {
        id: '660a9d34-7ab9-4c98-b3c8-950dc3cd20c8',
        content: 'Great quiz, the final question was tricky!',
        created_at: '2026-06-08T04:25:00.000Z',
        updated_at: '2026-06-08T04:25:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  addComment(
    @Param('id') quizId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.socialService.addComment(quizId, user.id, createCommentDto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a comment owned by the current user' })
  @ApiParam({
    name: 'id',
    description: 'Comment id.',
    example: '660a9d34-7ab9-4c98-b3c8-950dc3cd20c8',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted.',
    schema: { example: { message: 'Binh luan da duoc xoa thanh cong' } },
  })
  @ApiResponse({ status: 400, description: 'Unable to delete comment.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the comment owner may delete it.',
  })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  deleteComment(
    @Param('id') commentId: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.socialService.deleteComment(commentId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Legacy create social endpoint' })
  @ApiBody({ type: CreateSocialDto })
  @ApiResponse({
    status: 201,
    description: 'Legacy placeholder response.',
    schema: { type: 'string', example: 'This action adds a new social' },
  })
  create(@Body() createSocialDto: CreateSocialDto) {
    return this.socialService.create(createSocialDto);
  }

  @Get()
  @ApiOperation({ summary: 'Legacy social list endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Legacy placeholder response.',
    schema: { type: 'string', example: 'This action returns all social' },
  })
  findAll() {
    return this.socialService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Legacy get social endpoint' })
  @ApiParam({ name: 'id', description: 'Numeric social id.', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Legacy placeholder response.',
    schema: { type: 'string', example: 'This action returns a #1 social' },
  })
  findOne(@Param('id') id: string) {
    return this.socialService.findOne(+id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Legacy remove social endpoint' })
  @ApiParam({ name: 'id', description: 'Numeric social id.', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Legacy placeholder response.',
    schema: { type: 'string', example: 'This action removes a #1 social' },
  })
  remove(@Param('id') id: string) {
    return this.socialService.remove(+id);
  }
}
