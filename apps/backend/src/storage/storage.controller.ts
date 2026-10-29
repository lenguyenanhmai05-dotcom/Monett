import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('api/upload')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 10485760, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const isValidMime = file.mimetype.match(/\/(jpg|jpeg|png|webp|gif|heic|heif)$/i);
        const isValidExt = file.originalname.match(/\.(jpg|jpeg|png|webp|gif|heic|heif)$/i);
        if (!isValidMime && !isValidExt) {
          return cb(new BadRequestException('Chỉ cho phép tải lên định dạng hình ảnh (JPG, PNG, WEBP, HEIC)!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy tệp tải lên hoặc định dạng không hợp lệ.');
    }
    
    let lastCloudinaryError: any = null;
    // 1. Thử tải lên Cloudinary nếu có cấu hình
    try {
      if (this.storageService.isCloudinaryConfigured()) {
        const result: any = await this.storageService.uploadImage(file, 'monett_receipts');
        if (result && result.secure_url) {
          console.log('[Storage] Đã lưu ảnh thành công lên Cloudinary:', result.secure_url);
          return {
            success: true,
            url: result.secure_url,
          };
        }
      }
    } catch (error: any) {
      lastCloudinaryError = error?.message || String(error);
      console.warn('[Storage] Cloudinary không khả dụng hoặc lỗi, tự động chuyển sang lưu trữ cục bộ:', error?.message);
    }

    // 2. Fallback lưu trữ cục bộ (Local Disk Storage) 100% tin cậy & mượt mà
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExt = path.extname(file.originalname) || '.jpg';
      const uniqueFilename = `receipt_${Date.now()}_${Math.round(Math.random() * 1e9)}${fileExt}`;
      const filePath = path.join(uploadDir, uniqueFilename);

      if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
      } else if ((file as any).path) {
        fs.copyFileSync((file as any).path, filePath);
      } else {
        throw new Error('Dữ liệu tệp tin rỗng');
      }

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const baseUrl = `${protocol}://${host}`;
      const localUrl = `${baseUrl}/uploads/${uniqueFilename}`;

      console.log('[Storage] Đã lưu ảnh thành công vào local storage:', localUrl);

      return {
        success: true,
        url: localUrl,
      };
    } catch (localErr: any) {
      console.error('[Storage] Lưu tệp tin cục bộ thất bại:', localErr);
      throw new BadRequestException('Không thể lưu ảnh: ' + (localErr.message || 'Lỗi không xác định'));
    }
  }
}
