import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('api/upload')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 5242880, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Only JPG, JPEG, and PNG files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded or file format is invalid.');
    }
    
    try {
      const result = await this.storageService.uploadImage(file);
      return {
        success: true,
        url: result.secure_url,
      };
    } catch (error: any) {
      console.error('Cloudinary Upload Error:', error);
      throw new BadRequestException('Failed to upload image to cloud storage: ' + (error.message || 'Unknown error'));
    }
  }
}
