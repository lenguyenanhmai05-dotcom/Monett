import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { MomentsService } from './moments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/moments')
@UseGuards(JwtAuthGuard)
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  private getUserId(req: any): string {
    return (req.user?._id || req.user?.id).toString();
  }

  @Get('feed')
  async getFeed(@Req() req) {
    return this.momentsService.getFeed(this.getUserId(req));
  }

  @Post('upload-photo')
  @UseInterceptors(
    FileInterceptor('file', {
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
          const uid = (req.user?._id || req.user?.id || 'moment').toString();
          cb(null, `moment-${uid}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async uploadPhoto(@Req() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh để tải lên');
    }
    const baseUrl = req.protocol + '://' + req.get('host');
    const photoUrl = `${baseUrl}/uploads/${file.filename}`;
    return {
      message: 'Tải ảnh lên thành công',
      photoUrl,
    };
  }

  @Post()
  async createMoment(
    @Req() req,
    @Body() body: { photo: string; caption?: string; amount?: number; category?: string; currency?: string },
  ) {
    return this.momentsService.createMoment(this.getUserId(req), body);
  }

  @Put(':id')
  async updateMoment(
    @Req() req,
    @Param('id') momentId: string,
    @Body() body: { caption?: string; amount?: number; category?: string; photo?: string; currency?: string },
  ) {
    return this.momentsService.updateMoment(momentId, this.getUserId(req), body);
  }

  @Delete(':id')
  async deleteMoment(@Req() req, @Param('id') momentId: string) {
    return this.momentsService.deleteMoment(momentId, this.getUserId(req));
  }

  @Post(':id/react')
  async reactMoment(
    @Req() req,
    @Param('id') momentId: string,
    @Body('emoji') emoji: string,
  ) {
    return this.momentsService.reactMoment(momentId, this.getUserId(req), emoji);
  }

  @Post(':id/comments')
  async addComment(
    @Req() req,
    @Param('id') momentId: string,
    @Body('text') text: string,
  ) {
    return this.momentsService.addComment(momentId, this.getUserId(req), text);
  }
}
