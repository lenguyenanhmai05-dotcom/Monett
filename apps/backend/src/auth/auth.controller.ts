import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiResponse, AuthResponse, IUser } from '@monett/shared';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<ApiResponse<AuthResponse>> {
    const data = await this.authService.register(registerDto);
    return {
      success: true,
      message: 'Đăng ký tài khoản thành công! Chào mừng bạn đến với Monett.',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse<AuthResponse>> {
    const data = await this.authService.login(loginDto);
    return {
      success: true,
      message: 'Đăng nhập thành công!',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any): Promise<ApiResponse<IUser>> {
    const user = await this.authService.getProfile(req.user._id);
    return {
      success: true,
      message: 'Lấy thông tin tài khoản thành công',
      data: user,
      timestamp: new Date().toISOString(),
    };
  }
}
