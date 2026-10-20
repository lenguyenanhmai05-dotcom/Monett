import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (_) {}
dns.setDefaultResultOrder('ipv4first');

import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cho phép nhận payload hình ảnh base64 lớn
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.useWebSocketAdapter(new IoAdapter(app));

  // Kích hoạt xác thực dữ liệu đầu vào tự động (DTO Validation)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Cho phép kết nối CORS từ cả Web Browser và App Mobile
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Monett Backend API đang chạy tại: http://localhost:${port}`);
  console.log(`🩺 Health check endpoint: http://localhost:${port}/api/health`);
}
bootstrap();
// Trigger restart: 2026-10-19 22:48
