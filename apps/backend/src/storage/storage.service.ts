import { Injectable, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import * as fs from 'fs';

@Injectable()
export class StorageService implements OnModuleInit {
  private configureCloudinary(): boolean {
    let cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    let api_key = process.env.CLOUDINARY_API_KEY;
    let api_secret = process.env.CLOUDINARY_API_SECRET;

    if (process.env.CLOUDINARY_URL) {
      try {
        const parsed = new URL(process.env.CLOUDINARY_URL);
        if (parsed.hostname && parsed.username && parsed.password) {
          cloud_name = parsed.hostname;
          api_key = parsed.username;
          api_secret = parsed.password;
        }
      } catch (e) {
        console.warn('[StorageService] Không thể phân tích CLOUDINARY_URL:', e);
      }
    }

    if (cloud_name && api_key && api_secret) {
      cloudinary.config({
        cloud_name,
        api_key,
        api_secret,
        secure: true,
      });
      return true;
    }

    return false;
  }

  onModuleInit() {
    const ok = this.configureCloudinary();
    if (ok) {
      console.log(`[StorageService] Đã kích hoạt Cloudinary thành công cho tài khoản: ${cloudinary.config().cloud_name}`);
    } else {
      console.warn('[StorageService] Thiếu biến môi trường Cloudinary, sẽ sử dụng Local Disk Storage làm dự phòng.');
    }
  }

  isCloudinaryConfigured(): boolean {
    const conf = cloudinary.config();
    if (conf.cloud_name && conf.api_key && conf.api_secret) {
      return true;
    }
    return this.configureCloudinary();
  }

  uploadImage(file: Express.Multer.File, customFolder?: string): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const folderName = customFolder || process.env.CLOUDINARY_FOLDER || 'monett_receipts';
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          resource_type: 'image',
          format: 'webp',
          quality: 'auto:good',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      if (file.buffer) {
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      } else if ((file as any).path && fs.existsSync((file as any).path)) {
        fs.createReadStream((file as any).path).pipe(uploadStream);
      } else {
        reject(new Error('Tệp không có dữ liệu buffer hoặc đường dẫn path hợp lệ.'));
      }
    });
  }

  uploadBase64(base64Data: string, customFolder?: string): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const folderName = customFolder || process.env.CLOUDINARY_FOLDER || 'monett_receipts';
    return cloudinary.uploader.upload(base64Data, {
      folder: folderName,
      resource_type: 'image',
      format: 'webp',
      quality: 'auto:good',
    });
  }
}
