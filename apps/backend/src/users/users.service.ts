import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(userData: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async findOrCreateGoogleUser(data: {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  }): Promise<UserDocument> {
    const normalizedEmail = data.email.toLowerCase().trim();

    // 1. Tìm theo googleId trước
    let user = await this.findByGoogleId(data.googleId);
    if (user) {
      if (data.avatarUrl && !user.avatarUrl) {
        user.avatarUrl = data.avatarUrl;
        await user.save();
      }
      return user;
    }

    // 2. Nếu chưa có googleId, kiểm tra email đã đăng ký chưa
    user = await this.findByEmail(normalizedEmail);
    if (user) {
      user.googleId = data.googleId;
      if (data.avatarUrl && !user.avatarUrl) {
        user.avatarUrl = data.avatarUrl;
      }
      return user.save();
    }

    // 3. Tạo mới tài khoản Google trong MongoDB
    return this.create({
      email: normalizedEmail,
      fullName: data.fullName || normalizedEmail.split('@')[0],
      avatarUrl: data.avatarUrl || null,
      googleId: data.googleId,
      authProvider: 'google',
      currency: 'VND',
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { password: passwordHash }).exec();
  }
}

