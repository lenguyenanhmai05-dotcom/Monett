import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriod } from '@monett/shared';

@Controller('api/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private getUserId(req: any): string {
    return (req.user?._id || req.user?.id).toString();
  }

  /**
   * GET /api/analytics/overview
   * Tổng thu, tổng chi, số tiền tiết kiệm trong kỳ.
   */
  @Get('overview')
  async getOverview(
    @Req() req: any,
    @Query('period') period?: AnalyticsPeriod,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const userId = this.getUserId(req);
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    const p: AnalyticsPeriod = (['day', 'week', 'month', 'quarter', 'year'].includes(period || '') ? period : 'month') as AnalyticsPeriod;
    return this.analyticsService.getOverview(userId, p, m, y);
  }

  @Get('daily-trend')
  async getDailyTrend(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const userId = this.getUserId(req);
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    return this.analyticsService.getDailyTrend(userId, m, y);
  }

  /**
   * GET /api/analytics/category-breakdown
   * Tỷ lệ phần trăm và tổng tiền của từng nhóm danh mục.
   */
  @Get('category-breakdown')
  async getCategoryBreakdown(
    @Req() req: any,
    @Query('period') period?: AnalyticsPeriod,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const userId = this.getUserId(req);
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    const p: AnalyticsPeriod = (['day', 'week', 'month', 'quarter', 'year'].includes(period || '') ? period : 'month') as AnalyticsPeriod;
    return this.analyticsService.getCategories(userId, m, y, p);
  }

  @Get('categories')
  async getCategories(
    @Req() req: any,
    @Query('period') period?: AnalyticsPeriod,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.getCategoryBreakdown(req, period, month, year);
  }

  /**
   * GET /api/analytics/monthly-comparison
   * Dữ liệu 6 tháng gần nhất để vẽ biểu đồ so sánh.
   */
  @Get('monthly-comparison')
  async getMonthlyComparison(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const userId = this.getUserId(req);
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    return this.analyticsService.getMonthlyComparison(userId, m, y);
  }

  @Get('comparison')
  async getComparison(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.getMonthlyComparison(req, month, year);
  }

  @Get('emotions')
  async getEmotions(
    @Req() req: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const userId = this.getUserId(req);
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    return this.analyticsService.getEmotions(userId, m, y);
  }

  @Get('moments')
  async getFeaturedMoments(@Req() req: any) {
    const userId = this.getUserId(req);
    return this.analyticsService.getFeaturedMoments(userId);
  }

  /**
   * GET /api/analytics/full-report
   * Toàn bộ dữ liệu tổng hợp cho trang Báo Cáo & Thống Kê Chi Tiêu Chuyên Sâu
   */
  @Get('full-report')
  async getFullReport(
    @Req() req: any,
    @Query('period') period?: AnalyticsPeriod,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const userId = this.getUserId(req);
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    const p: AnalyticsPeriod = (['day', 'week', 'month', 'year'].includes(period || '') ? period : 'month') as AnalyticsPeriod;
    return this.analyticsService.getFullReport(userId, p, m, y);
  }
}
