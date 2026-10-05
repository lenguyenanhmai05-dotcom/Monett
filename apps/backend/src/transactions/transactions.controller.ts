import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService, FindTransactionsQuery } from './transactions.service';

@Controller('api/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  private getUserId(req: any): string {
    return (req.user?._id || req.user?.id).toString();
  }

  @Post()
  async create(@Req() req, @Body() body: any) {
    return this.transactionsService.create(this.getUserId(req), body);
  }

  @Get()
  async findAll(@Req() req, @Query() query: FindTransactionsQuery) {
    return this.transactionsService.findAll(this.getUserId(req), query);
  }

  @Get('stats/month')
  async getMonthStats(
    @Req() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.transactionsService.getMonthStats(this.getUserId(req), m, y);
  }

  @Get('by-date')
  async findByDate(@Req() req, @Query('date') date?: string) {
    return this.transactionsService.findByDate(this.getUserId(req), date);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.transactionsService.findOne(this.getUserId(req), id);
  }

  @Put(':id')
  async update(@Req() req, @Param('id') id: string, @Body() body: any) {
    return this.transactionsService.update(this.getUserId(req), id, body);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.transactionsService.remove(this.getUserId(req), id);
  }
}
