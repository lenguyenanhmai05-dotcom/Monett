import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiResponse } from '@monett/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot() {
    return {
      name: 'Monett Backend API',
      status: 'online',
      message: 'Server Backend Monett đang hoạt động bình thường! 🚀',
      healthCheck: 'http://localhost:3000/api/health',
      frontendUrl: 'http://localhost:8081',
      guide: 'Đây là cổng API (Backend). Để xem giao diện Web người dùng, vui lòng mở terminal chạy "npm run dev:mobile" và truy cập http://localhost:8081',
    };
  }

  @Get('api/health')
  getHealth(): ApiResponse<{ status: string; uptime: number }> {
    return this.appService.getHealth();
  }
}
