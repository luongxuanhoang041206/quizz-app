import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/UpdateUserDto';
import { UserService } from './user.service';
import { XpHistoryQueryDto, CursorPaginationDto } from './dto/query.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get a public user profile by id' })
  @ApiParam({
    name: 'id',
    description: 'User id.',
    example: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile.',
    schema: {
      example: {
        id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
        email: 'alice@example.com',
        username: 'alice_quiz',
        avatar_url: 'https://example.com/avatars/alice.png',
        bio: 'I build and play history quizzes.',
        created_at: '2026-06-08T04:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getUser(@Param('id') userId: string) {
    return this.userService.getUser(userId);
  }

  @Patch(':id/update')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a user profile' })
  @ApiParam({
    name: 'id',
    description: 'User id.',
    example: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Updated user profile.',
    schema: {
      example: {
        id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
        email: 'alice@example.com',
        username: 'alice_updated',
        avatar_url: 'https://example.com/avatars/alice.png',
        bio: 'I build and play history quizzes.',
        updated_at: '2026-06-08T04:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation or database error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  updateUser(@Param('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(userId, dto);
  }

  @Get(':id/quizzes')
  @ApiOperation({ summary: 'List quizzes created by a user' })
  @ApiParam({
    name: 'id',
    description: 'User id.',
    example: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
  })
  @ApiResponse({
    status: 200,
    description: 'Quizzes created by the user.',
    schema: {
      example: [
        {
          id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
          title: 'World Capitals Challenge',
          description: 'Test your knowledge of capital cities.',
          creator_id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
          visibility: 'public',
          created_at: '2026-06-08T04:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Database error.' })
  userQuizz(@Param('id') userId: string) {
    return this.userService.userQuizz(userId);
  }

  @Get(':id/attempts')
  @ApiOperation({ summary: 'List quiz attempts for a user' })
  @ApiParam({
    name: 'id',
    description: 'User id.',
    example: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
  })
  @ApiResponse({
    status: 200,
    description: 'Attempts made by the user.',
    schema: {
      example: [
        {
          id: '4e283391-a313-43dc-a13c-76bbd42b3f32',
          score: 8,
          completed_at: '2026-06-08T04:20:00.000Z',
          quizzes: {
            id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
            title: 'World Capitals Challenge',
            description: 'Test your knowledge of capital cities.',
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Database error.' })
  userQuizzAttemps(@Param('id') userId: string) {
    return this.userService.userQuizzAttemps(userId);
  }

  @Get(':id/category-stats')
  getCategoryStats(@Param('id') userId: string) {
    return this.userService.getCategoryStats(userId);
  }

  @Get(':id/xp-history') // Lay data ve XP chart theo time
  getXpChart(@Param('id') userId: string, @Query() query: XpHistoryQueryDto) {
    const period = query?.period || 'week';
    return this.userService.getXpHistory(userId, period as any);
  }

  @Get(':id/recent-attempts') // Ds quizz gan day voi score va XP earned
  getRecentAttempt(
    @Param('id') userId: string,
    @Query() pager: CursorPaginationDto
  ) {
    const limit = pager?.limit || 10;
    const cursor = pager?.cursor;
    return this.userService.getRecentAttempts(userId, limit, cursor);
  }

  @Get(':id/badges')
  getUserBadges(@Param('id') userId: string) {
    return this.userService.getUserBadges(userId);
  }

  @Get(':id/activity') // timeline hoat dong gan day
  getActivityFeed(
    @Param('id') userId: string,
    @Query() pager: CursorPaginationDto
  ) {
    const limit = pager?.limit || 20;
    const cursor = pager?.cursor;
    return this.userService.getActivityFeed(userId, limit, cursor);
  }

  @Get(':id/milestones')
  getMilestones(
    @Param('id') userId: string,
  ) {
    return this.userService.getMilestones(userId);
  }

  // Gop: profile + category-stats + badges (summany) + recent-attemps + activity
  @Get(':id/profile/full') // single request cho lan dau tai profile page (bff pattern)
  getFullProfile(
    @Param('id') userId: string
  ) {
    return this.userService.getFullProfile(userId);
  }
}
