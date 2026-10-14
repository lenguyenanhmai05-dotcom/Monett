import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RemindersService } from './reminders.service';
import { CreateReminderDto, UpdateReminderDto } from './dto/create-reminder.dto';

@Controller('api/reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  private getUserId(req: any): string {
    return (req.user?._id || req.user?.id).toString();
  }

  @Post()
  async create(@Req() req, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(this.getUserId(req), dto);
  }

  @Get()
  async findAll(@Req() req, @Query('date') date?: string) {
    return this.remindersService.findAll(this.getUserId(req), date);
  }

  @Patch(':id/toggle')
  async toggleComplete(@Req() req, @Param('id') id: string) {
    return this.remindersService.toggleComplete(this.getUserId(req), id);
  }

  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    return this.remindersService.delete(this.getUserId(req), id);
  }

  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.remindersService.update(this.getUserId(req), id, dto);
  }
}
