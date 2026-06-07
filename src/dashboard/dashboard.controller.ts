import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard
   * Lấy thống kê tổng hợp dashboard gồm:
   * - Counts: Tổng số user, quiz, completed attempts
   * - Top 10 Quiz hot nhất
   * - Top 10 Quiz được thích nhất
   * - Top 10 Lượt làm bài điểm cao nhất
   */
  @Get('dashboard')
  getDashboard(): Promise<any> {
    return this.dashboardService.getDashboard();
  }
}
