import { Injectable } from '@nestjs/common';
import { ApiResponse } from '@monett/shared';

@Injectable()
export class AppService {
  getHealth(): ApiResponse<{ status: string; uptime: number }> {
    return {
      success: true,
      message: 'Monett API is running successfully!',
      data: {
        status: 'UP',
        uptime: process.uptime(),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
