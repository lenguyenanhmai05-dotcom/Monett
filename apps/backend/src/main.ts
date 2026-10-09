import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
// Trigger restart
