import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

import * as dotenv from 'dotenv';
import * as path from 'path';

// Đảm bảo cấu hình trong file .env của dự án được ưu tiên
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/backend/.env', '../apps/backend/.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const primaryUri = configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/monett');
        let selectedUri = primaryUri;

        if (primaryUri.includes('mongodb+srv')) {
          try {
            const mongooseMod = await import('mongoose');
            const testConn = await mongooseMod.default.createConnection(primaryUri, {
              serverSelectionTimeoutMS: 3500,
            }).asPromise();
            await testConn.close();
            console.log(`✅ Kết nối thành công tới MongoDB Atlas: ${primaryUri.replace(/:([^:@]+)@/, ':****@')}`);
          } catch (err: any) {
            console.warn(`⚠️ MongoDB Atlas tạm thời không phản hồi (${err.message}). Tự động chuyển sang Local MongoDB...`);
            selectedUri = 'mongodb://localhost:27017/monett';
          }
        }

        const maskedUri = selectedUri.replace(/:([^:@]+)@/, ':****@');
        console.log(`📡 Mongoose đang sử dụng Database: ${maskedUri}`);
        return { uri: selectedUri };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
