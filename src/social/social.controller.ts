import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { CreateSocialDto } from './dto/create-social.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  /**
   * POST /api/quizzes/:id/like
   * Toggle Like - Thêm hoặc xóa like một quiz
   */
  @Post('quizzes/:id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(
    @Param('id') quizId: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.socialService.toggleLike(quizId, user.id);
  }

  /**
   * POST /api/quizzes/:id/bookmark
   * Toggle Bookmark - Thêm hoặc xóa bookmark một quiz
   */
  @Post('quizzes/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  toggleBookmark(
    @Param('id') quizId: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.socialService.toggleBookmark(quizId, user.id);
  }

  /**
   * GET /api/quizzes/:id/comments
   * Lấy danh sách bình luận của một quiz
   */
  @Get('quizzes/:id/comments')
  getComments(@Param('id') quizId: string) {
    return this.socialService.getComments(quizId);
  }

  /**
   * POST /api/quizzes/:id/comments
   * Thêm bình luận mới cho một quiz
   */
  @Post('quizzes/:id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('id') quizId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.socialService.addComment(quizId, user.id, createCommentDto);
  }

  /**
   * DELETE /api/comments/:id
   * Xóa bình luận
   */
  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @Param('id') commentId: string,
    @CurrentUser() user: { id: string; email: string },
  ) {
    return this.socialService.deleteComment(commentId, user.id);
  }

  // Legacy endpoints (keep for backward compatibility)
  @Post()
  create(@Body() createSocialDto: CreateSocialDto) {
    return this.socialService.create(createSocialDto);
  }

  @Get()
  findAll() {
    return this.socialService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.socialService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.socialService.remove(+id);
  }
}
