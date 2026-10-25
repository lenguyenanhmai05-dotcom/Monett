import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@monett/shared';
import { AdminService } from './admin.service';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    const stats = await this.adminService.getStats();
    return { data: stats };
  }

  @Get('users')
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 50;
    const res = await this.adminService.getUsers(search, role, p, l);
    return { data: res };
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Request() req: any,
    @Param('id') userId: string,
    @Body('role') role: UserRole,
  ) {
    const operatorEmail = req.user?.email || '';
    const updated = await this.adminService.updateUserRole(userId, role, operatorEmail);
    return { data: updated, message: 'Cập nhật vai trò thành công' };
  }

  @Patch('users/:id/pro')
  async toggleUserPro(@Param('id') userId: string) {
    const updated = await this.adminService.toggleUserPro(userId);
    return { data: updated, message: 'Cập nhật trạng thái PRO thành công' };
  }

  @Delete('users/:id')
  async deleteUser(@Request() req: any, @Param('id') userId: string) {
    const operatorEmail = req.user?.email || '';
    const res = await this.adminService.deleteUser(userId, operatorEmail);
    return { data: res };
  }

  @Get('transactions')
  async getTransactions(@Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 30;
    const txs = await this.adminService.getRecentTransactions(l);
    return { data: txs };
  }

  @Get('moments')
  async getMoments(@Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 30;
    const moments = await this.adminService.getRecentMoments(l);
    return { data: moments };
  }

  @Delete('moments/:id')
  async deleteMoment(@Param('id') momentId: string) {
    const res = await this.adminService.deleteMoment(momentId);
    return { data: res };
  }
}
