import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get aggregate dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics and top lists.',
    schema: {
      example: {
        counts: {
          totalUsers: 120,
          totalQuizzes: 45,
          totalCompletedAttempts: 380,
        },
        topPlayedQuizzes: [
          {
            id: '2f7df55f-5ea1-45a4-a6e8-929b518ad7e9',
            title: 'World Capitals Challenge',
            play_count: 88,
            like_count: 24,
          },
        ],
        topLikedQuizzes: [
          {
            id: '6fd2c944-0047-46d1-bd35-936880e3df6e',
            title: 'JavaScript Basics',
            play_count: 62,
            like_count: 31,
          },
        ],
        topAttempts: [
          {
            id: '4e283391-a313-43dc-a13c-76bbd42b3f32',
            score: 10,
            total_points: 10,
            percentage: '100.00',
            username: 'alice_quiz',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Unable to load dashboard data.' })
  getDashboard(): Promise<any> {
    return this.dashboardService.getDashboard();
  }
}
