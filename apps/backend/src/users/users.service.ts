import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Moment, MomentDocument } from '../moments/schemas/moment.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Moment.name) private readonly momentModel: Model<MomentDocument>,
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

  async updateProfile(userId: string, updateData: { fullName?: string; avatarUrl?: string; theme?: string; currency?: string; reminderTime?: string; isPro?: boolean }): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();
  }

  async getStreak(userId: string): Promise<{ streak: number; lastActiveDate: string; activeToday: boolean }> {
    const user = await this.userModel.findById(userId).exec();
    const today = new Date().toISOString().split('T')[0];
    const streak = user?.streak || 1;
    const lastActiveDate = user?.lastActiveDate || today;
    return {
      streak,
      lastActiveDate,
      activeToday: lastActiveDate === today,
    };
  }

  async checkInStreak(userId: string): Promise<{ streak: number; message: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('User not found');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreak = user.streak || 0;

    if (user.lastActiveDate === todayStr) {
      return { streak: currentStreak, message: 'Hôm nay bạn đã duy trì chuỗi rồi!' };
    } else if (user.lastActiveDate === yesterdayStr) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    user.streak = currentStreak;
    user.lastActiveDate = todayStr;
    if (currentStreak >= 7) {
      user.isPro = true;
    }
    await user.save();

    const proBonusMsg = currentStreak === 7 ? ' 👑 Chúc mừng bạn đã mở khóa danh hiệu PRO Thành Viên Tinh Hoa!' : '';
    return { 
      streak: currentStreak, 
      message: `Tuyệt vời! Chuỗi của bạn đã tăng lên ${currentStreak} ngày! 🔥${proBonusMsg}` 
    };
  }

  async exportData(userId: string, clientTransactions: any[] = []): Promise<any> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('User not found');

    const moments = await this.momentModel.find({ user: userId }).sort({ createdAt: -1 }).exec();

    // Kết hợp các khoảnh khắc từ moments feed và giao dịch client
    const serverTxs = moments.map(m => {
      const createdAt = (m as any).createdAt ? new Date((m as any).createdAt) : new Date();
      return {
        id: m._id.toString(),
        date: createdAt.toISOString().split('T')[0],
        time: createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        category: m.category || 'Chi tiêu',
        title: m.caption || 'Khoảnh khắc chi tiêu',
        amount: m.amount || 0,
        type: (m.amount || 0) < 0 ? 'expense' : 'income',
        source: 'Moments Feed',
      };
    });

    const parsedClientTxs = clientTransactions.map(tx => {
      const txDate = tx.date ? new Date(tx.date) : new Date();
      return {
        id: tx.id || String(Math.random()),
        date: txDate.toISOString().split('T')[0],
        time: txDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        category: tx.category || 'Chi tiêu',
        title: tx.title || tx.note || 'Giao dịch ví',
        amount: tx.amount || 0,
        type: tx.type || ((tx.amount || 0) < 0 ? 'expense' : 'income'),
        source: 'Ví cá nhân',
      };
    });

    const allTransactions = [...serverTxs, ...parsedClientTxs];
    // Khử trùng lặp ID
    const uniqueTxs = Array.from(new Map(allTransactions.map(t => [t.id, t])).values());

    const totalExpense = uniqueTxs
      .filter(t => t.type === 'expense' || t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalIncome = uniqueTxs
      .filter(t => t.type === 'income' || t.amount > 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      user: {
        fullName: user.fullName,
        email: user.email,
        currency: user.currency || 'VND',
        streak: user.streak || 1,
        reminderTime: user.reminderTime || null,
        createdAt: (user as any).createdAt,
      },
      summary: {
        totalTransactions: uniqueTxs.length,
        totalExpense,
        totalIncome,
        netBalance: totalIncome - totalExpense,
        exportedAt: new Date().toISOString(),
      },
      transactions: uniqueTxs,
    };
  }
}

