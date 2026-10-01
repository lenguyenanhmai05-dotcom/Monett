import { Controller, Get, Put, Body, UseGuards, Request, BadRequestException, Post, UseInterceptors, UploadedFile, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private getUserId(req: any): string {
    const id = req.user?._id || req.user?.id || req.user?.sub;
    return id ? id.toString() : '';
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const userId = this.getUserId(req);
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    // Omit sensitive data before returning
    const userObj = user.toObject();
    delete userObj.password;
    return { data: userObj };
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = this.getUserId(req);
    const updatedUser = await this.usersService.updateProfile(userId, updateProfileDto);
    if (!updatedUser) {
      throw new BadRequestException('User not found');
    }
    const userObj = updatedUser.toObject();
    delete userObj.password;
    return { 
      message: 'Profile updated successfully',
      data: userObj 
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    const userId = this.getUserId(req);
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.authProvider === 'google') {
      throw new BadRequestException('Google accounts cannot change password');
    }

    const isMatch = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(changePasswordDto.newPassword, salt);

    await this.usersService.updatePassword(userId, hash);

    return { message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req: any, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const uid = (req.user?._id || req.user?.id || 'avatar').toString();
        cb(null, `${uid}-${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  }))
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = this.getUserId(req);

    // Construct the public URL
    const baseUrl = req.protocol + '://' + req.get('host');
    const avatarUrl = `${baseUrl}/uploads/${file.filename}`;

    // Update user's avatar in DB
    const updatedUser = await this.usersService.updateProfile(userId, { avatarUrl });
    if (!updatedUser) {
      throw new BadRequestException('User not found');
    }

    const userObj = updatedUser.toObject();
    delete userObj.password;

    return {
      message: 'Avatar uploaded successfully',
      data: userObj,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('streak')
  async getStreak(@Request() req) {
    const userId = this.getUserId(req);
    return this.usersService.getStreak(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('streak/check-in')
  async checkInStreak(@Request() req) {
    const userId = this.getUserId(req);
    return this.usersService.checkInStreak(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export-data')
  async exportData(
    @Request() req,
    @Res() res: Response,
    @Query('format') format = 'csv'
  ) {
    const userId = this.getUserId(req);
    const reportData = await this.usersService.exportData(userId);
    return this.formatAndSendExport(res, reportData, format);
  }

  @UseGuards(JwtAuthGuard)
  @Post('feedback')
  async submitFeedback(
    @Request() req,
    @Body() body: { category: string; message: string }
  ) {
    const userId = this.getUserId(req);
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (!body.message || body.message.trim().length < 5) {
      throw new BadRequestException('Feedback message must be at least 5 characters');
    }
    // Log feedback (in production, save to DB or send email)
    console.log(`[FEEDBACK] User: ${user.email} | Category: ${body.category} | Message: ${body.message}`);
    return { 
      success: true, 
      message: 'Feedback submitted successfully',
      data: { category: body.category, submittedAt: new Date().toISOString() }
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rating')
  async submitRating(
    @Request() req,
    @Body() body: { stars: number; comment?: string }
  ) {
    const userId = this.getUserId(req);
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (!body.stars || body.stars < 1 || body.stars > 5) {
      throw new BadRequestException('Rating must be between 1 and 5 stars');
    }
    // Log rating (in production, aggregate ratings in DB)
    console.log(`[RATING] User: ${user.email} | Stars: ${body.stars}/5 | Comment: ${body.comment || 'N/A'}`);
    return { 
      success: true,
      message: 'Rating submitted successfully',
      data: { stars: body.stars, submittedAt: new Date().toISOString() }
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('export-data')
  async exportDataPost(
    @Request() req,
    @Res() res: Response,
    @Body() body: { format?: string; clientTransactions?: any[] }
  ) {
    const userId = this.getUserId(req);
    const format = body?.format || 'csv';
    const reportData = await this.usersService.exportData(userId, body?.clientTransactions || []);
    return this.formatAndSendExport(res, reportData, format);
  }

  private formatAndSendExport(res: Response, reportData: any, format: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `monett_financial_report_${timestamp}`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      return res.send(JSON.stringify(reportData, null, 2));
    }

    // Default: CSV format with UTF-8 BOM so Excel opens properly
    let csv = '\uFEFF';
    csv += '=== BÁO CÁO TÀI CHÍNH MONETT ===\r\n';
    csv += `Chủ tài khoản,${reportData.user.fullName}\r\n`;
    csv += `Email,${reportData.user.email}\r\n`;
    csv += `Đơn vị tiền tệ,${reportData.user.currency}\r\n`;
    csv += `Chuỗi ngày Streak,${reportData.user.streak} ngày\r\n`;
    csv += `Thời gian xuất báo cáo,${new Date().toLocaleString('vi-VN')}\r\n`;
    csv += `Tổng số giao dịch,${reportData.summary.totalTransactions}\r\n`;
    csv += `Tổng thu (+),${reportData.summary.totalIncome.toLocaleString()} ${reportData.user.currency}\r\n`;
    csv += `Tổng chi (-),${reportData.summary.totalExpense.toLocaleString()} ${reportData.user.currency}\r\n`;
    csv += `Số dư ròng,${reportData.summary.netBalance.toLocaleString()} ${reportData.user.currency}\r\n\r\n`;

    csv += 'Mã giao dịch,Ngày,Giờ,Danh mục,Tiêu đề / Ghi chú,Số tiền,Phân loại,Nguồn dữ liệu\r\n';
    for (const tx of reportData.transactions) {
      const cleanTitle = (tx.title || '').replace(/"/g, '""');
      const cleanCat = (tx.category || '').replace(/"/g, '""');
      csv += `"${tx.id}","${tx.date}","${tx.time}","${cleanCat}","${cleanTitle}",${tx.amount},"${tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}","${tx.source}"\r\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }
}
