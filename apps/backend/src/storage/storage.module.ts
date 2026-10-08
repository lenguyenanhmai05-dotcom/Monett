import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.provider';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  providers: [CloudinaryProvider, StorageService],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule {}
