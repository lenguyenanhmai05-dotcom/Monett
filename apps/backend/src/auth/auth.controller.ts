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
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ApiResponse, AuthResponse, IUser } from '@monett/shared';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  async sendOtp(
    @Body() sendOtpDto: SendOtpDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const data = await this.authService.sendOtp(sendOtpDto.email);
    return {
      success: true,
      message: data.message,
      data: { message: data.message },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() verifyDto: VerifyOtpDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const data = await this.authService.verifyOtp(verifyDto.email, verifyDto.otp);
    return {
      success: true,
      message: data.message,
      data: { message: data.message },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() forgotDto: ForgotPasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const data = await this.authService.forgotPassword(forgotDto.email);
    return {
      success: true,
      message: data.message,
      data: { message: data.message },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset-password')
  async resetPassword(
    @Body() resetDto: ResetPasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const data = await this.authService.resetPassword(resetDto);
    return {
      success: true,
      message: data.message,
      data: { message: data.message },
      timestamp: new Date().toISOString(),
    };
  }

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

  @Post('google')
  async googleAuth(
    @Body() googleAuthDto: GoogleAuthDto,
  ): Promise<ApiResponse<AuthResponse>> {
    const data = await this.authService.googleLogin(googleAuthDto);
    return {
      success: true,
      message: 'Đăng nhập bằng tài khoản Google thành công!',
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
