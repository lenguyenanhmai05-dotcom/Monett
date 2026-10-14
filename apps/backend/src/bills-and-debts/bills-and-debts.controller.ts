import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillsAndDebtsService } from './bills-and-debts.service';
import {
  CreateRecurringBillDto,
  UpdateRecurringBillDto,
  CreateDebtDto,
  UpdateDebtDto,
} from './dto/bill-debt.dto';

@Controller('api/bills-and-debts')
@UseGuards(JwtAuthGuard)
export class BillsAndDebtsController {
  constructor(private readonly billsAndDebtsService: BillsAndDebtsService) {}

  private getUserId(req: any): string {
    return (req.user?._id || req.user?.id).toString();
  }

  // ================= RECURRING BILLS =================
  @Get('bills')
  async getBills(@Req() req) {
    return this.billsAndDebtsService.getBills(this.getUserId(req));
  }

  @Post('bills')
  async createBill(@Req() req, @Body() dto: CreateRecurringBillDto) {
    return this.billsAndDebtsService.createBill(this.getUserId(req), dto);
  }

  @Put('bills/:id')
  async updateBill(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringBillDto,
  ) {
    return this.billsAndDebtsService.updateBill(this.getUserId(req), id, dto);
  }

  @Patch('bills/:id/toggle')
  async toggleBillPaid(@Req() req, @Param('id') id: string) {
    return this.billsAndDebtsService.toggleBillPaid(this.getUserId(req), id);
  }

  @Delete('bills/:id')
  async deleteBill(@Req() req, @Param('id') id: string) {
    return this.billsAndDebtsService.deleteBill(this.getUserId(req), id);
  }

  // ================= DEBT BOOK (SỔ GHI NỢ) =================
  @Get('debts')
  async getDebts(@Req() req) {
    return this.billsAndDebtsService.getDebts(this.getUserId(req));
  }

  @Get('debts/summary')
  async getDebtSummary(@Req() req) {
    return this.billsAndDebtsService.getDebtSummary(this.getUserId(req));
  }

  @Post('debts')
  async createDebt(@Req() req, @Body() dto: CreateDebtDto) {
    return this.billsAndDebtsService.createDebt(this.getUserId(req), dto);
  }

  @Put('debts/:id')
  async updateDebt(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateDebtDto,
  ) {
    return this.billsAndDebtsService.updateDebt(this.getUserId(req), id, dto);
  }

  @Patch('debts/:id/toggle')
  async toggleDebtSettled(@Req() req, @Param('id') id: string) {
    return this.billsAndDebtsService.toggleDebtSettled(this.getUserId(req), id);
  }

  @Delete('debts/:id')
  async deleteDebt(@Req() req, @Param('id') id: string) {
    return this.billsAndDebtsService.deleteDebt(this.getUserId(req), id);
  }
}
