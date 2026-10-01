import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BudgetsService } from './budgets.service';

@Controller('api/budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  private getUserId(req: any): string {
    return (req.user?._id || req.user?.id).toString();
  }

  @Get('current')
  async getCurrent(@Req() req) {
    return this.budgetsService.getCurrent(this.getUserId(req));
  }

  @Post()
  async setBudget(
    @Req() req,
    @Body()
    body: {
      month?: number;
      year?: number;
      limit: number;
      payday?: number;
      currency?: string;
    },
  ) {
    return this.budgetsService.setBudget(this.getUserId(req), body);
  }
}
