import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
