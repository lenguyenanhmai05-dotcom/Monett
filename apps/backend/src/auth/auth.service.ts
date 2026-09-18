import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { MailService } from '../mail/mail.service';
import { AuthResponse, IUser } from '@monett/shared';


@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(clientId);
  }

  async sendOtp(email: string): Promise<{ success: boolean; message: string; simulatedOtp?: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Kiểm tra email đã có tài khoản chưa
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException('Email này đã được đăng ký tài khoản! Vui lòng đăng nhập.');
    }

    // 2. Tạo mã OTP ngẫu nhiên 6 chữ số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // 3. Lưu/Cập nhật mã OTP vào MongoDB
    await this.otpModel.findOneAndUpdate(
      { email: normalizedEmail },
      { otp: otpCode, expiresAt, verified: false },
      { upsert: true, new: true },
    );

    // 4. Gửi email thông báo
    await this.mailService.sendOtpEmail(normalizedEmail, otpCode);

    return {
      success: true,
      message: `Mã xác thực OTP đã được gửi tới ${normalizedEmail} (Hiệu lực 5 phút)`,
      simulatedOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    };
  }

  async googleLogin(dto: GoogleAuthDto): Promise<AuthResponse> {
    let email = dto.email;
    let fullName = dto.fullName;
    let avatarUrl = dto.avatarUrl;
    let googleId = dto.googleId;

    if (dto.idToken) {
      try {
        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const ticket = await this.googleClient.verifyIdToken({
          idToken: dto.idToken,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        if (payload) {
          googleId = payload.sub;
          email = payload.email;
          fullName = payload.name;
          avatarUrl = payload.picture;
        }
      } catch (err: any) {
        console.warn('Google idToken verify notice:', err.message);
        if (!email) {
          throw new UnauthorizedException('Mã xác thực Google không hợp lệ hoặc đã hết hạn!');
        }
      }
    }

    if (!email) {
      throw new BadRequestException('Không tìm thấy thông tin email từ Google!');
    }

    const user = await this.usersService.findOrCreateGoogleUser({
      googleId: googleId || `google_${Date.now()}`,
      email,
      fullName: fullName || email.split('@')[0],
      avatarUrl,
    });

    const userJson = user.toJSON() as unknown as IUser;
    const token = this.generateToken(userJson.id, userJson.email);

    return {
      user: userJson,
      accessToken: token,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const normalizedEmail = registerDto.email.toLowerCase().trim();

    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException('Email này đã được đăng ký trong hệ thống!');
    }

    // 1. Kiểm tra xác thực mã OTP
    if (!registerDto.otp) {
      throw new BadRequestException('Vui lòng nhập mã xác thực OTP gửi qua Email!');
    }

    const otpRecord = await this.otpModel.findOne({
      email: normalizedEmail,
      otp: registerDto.otp.trim(),
    });

    if (!otpRecord) {
      throw new BadRequestException('Mã xác thực OTP không chính xác!');
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException(
        'Mã xác thực OTP đã hết hạn, vui lòng gửi lại mã mới!',
      );
    }

    // 2. Xóa mã OTP đã sử dụng
    await this.otpModel.deleteOne({ _id: otpRecord._id });

    // 3. Băm mật khẩu và lưu người dùng mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.usersService.create({
      email: normalizedEmail,
      password: hashedPassword,
      fullName: registerDto.fullName,
      currency: registerDto.currency || 'VND',
    });

    const userJson = user.toJSON() as unknown as IUser;
    const token = this.generateToken(userJson.id, userJson.email);

    return {
      user: userJson,
      accessToken: token,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
    }

    const userJson = user.toJSON() as unknown as IUser;
    const token = this.generateToken(userJson.id, userJson.email);

    return {
      user: userJson,
      accessToken: token,
    };
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string; simulatedOtp?: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Kiểm tra tài khoản có tồn tại không
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('Email này chưa được đăng ký tài khoản trong hệ thống Monett!');
    }

    // 2. Tạo mã OTP ngẫu nhiên 6 chữ số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // 3. Lưu/Cập nhật mã OTP vào MongoDB
    await this.otpModel.findOneAndUpdate(
      { email: normalizedEmail },
      { otp: otpCode, expiresAt, verified: false },
      { upsert: true, new: true },
    );

    // 4. Gửi email khôi phục mật khẩu thật qua SMTP
    await this.mailService.sendForgotPasswordEmail(normalizedEmail, otpCode);

    return {
      success: true,
      message: `Mã xác thực đặt lại mật khẩu đã được gửi tới ${normalizedEmail} (Hiệu lực 5 phút)`,
      simulatedOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Kiểm tra tài khoản
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('Không tìm thấy tài khoản người dùng!');
    }

    // 2. Kiểm tra mã OTP
    const validOtp = await this.otpModel.findOne({
      email: normalizedEmail,
      otp: dto.otp.trim(),
    });

    if (!validOtp) {
      throw new BadRequestException('Mã xác thực OTP không chính xác hoặc đã hết hạn!');
    }

    if (new Date() > validOtp.expiresAt) {
      throw new BadRequestException('Mã xác thực OTP đã hết hạn (chỉ có hiệu lực trong 5 phút)! Vui lòng yêu cầu mã mới.');
    }

    // 3. Hash mật khẩu mới và cập nhật
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.newPassword, salt);
    await this.usersService.updatePassword(user._id.toString(), hashedPassword);

    // 4. Xóa OTP sau khi đổi mật khẩu thành công
    await this.otpModel.deleteOne({ _id: validOtp._id });

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.',
    };
  }

  async getProfile(userId: string): Promise<IUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }
    return user.toJSON() as unknown as IUser;
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
    });
  }
}

