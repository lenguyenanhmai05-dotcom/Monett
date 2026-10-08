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

  // Ngày theo giờ Việt Nam (YYYY-MM-DD) – tránh lệch ngày do dùng UTC (00:00–06:59 VN bị tính là hôm trước)
  private toVnDateStr(date: Date): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  }

  // Trả về ngày Thứ 2 (YYYY-MM-DD) của tuần chứa ngày dateStr – dùng làm "mã tuần"
  private getWeekKey(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(`${dateStr}T00:00:00Z`);
    const diffToMonday = (d.getUTCDay() + 6) % 7; // CN=6, T2=0, T3=1, ...
    d.setUTCDate(d.getUTCDate() - diffToMonday);
    return d.toISOString().split('T')[0];
  }

  // Mỗi tuần có 1 lá chắn, không cộng dồn: còn lá chắn nếu tuần này chưa dùng
  private isShieldAvailable(shieldUsedDate: string | undefined, todayStr: string): boolean {
    return !shieldUsedDate || this.getWeekKey(shieldUsedDate) !== this.getWeekKey(todayStr);
  }

  async getStreak(userId: string): Promise<{
    streak: number;
    lastActiveDate: string;
    activeToday: boolean;
    totalActiveDays: number;
    longestStreak: number;
    shieldAvailable: boolean;
    shieldUsedToday: boolean;
  }> {
    const user = await this.userModel.findById(userId).exec();
    const today = this.toVnDateStr(new Date());
    const streak = user?.streak ?? 0;
    const lastActiveDate = user?.lastActiveDate || '';
    return {
      streak,
      lastActiveDate,
      activeToday: lastActiveDate === today,
      // User cũ chưa có field mới -> lấy tối thiểu bằng streak hiện tại
      totalActiveDays: Math.max(user?.totalActiveDays || 0, streak),
      longestStreak: Math.max(user?.longestStreak || 0, streak),
      shieldAvailable: this.isShieldAvailable(user?.shieldUsedDate, today),
      shieldUsedToday: !!user?.shieldUsedDate && user.shieldUsedDate === today,
    };
  }

  async checkInStreak(userId: string): Promise<{
    streak: number;
    totalActiveDays: number;
    longestStreak: number;
    shieldAvailable: boolean;
    shieldUsed: boolean;
    message: string;
  }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new Error('User not found');

    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const todayStr = this.toVnDateStr(new Date(now));
    const yesterdayStr = this.toVnDateStr(new Date(now - DAY_MS));
    const twoDaysAgoStr = this.toVnDateStr(new Date(now - 2 * DAY_MS));

    let currentStreak = user.streak || 0;
    // User cũ chưa có field mới -> lấy tối thiểu bằng streak hiện tại
    let totalActiveDays = Math.max(user.totalActiveDays || 0, currentStreak);
    let longestStreak = Math.max(user.longestStreak || 0, currentStreak);

    if (user.lastActiveDate === todayStr) {
      return {
        streak: currentStreak,
        totalActiveDays,
        longestStreak,
        shieldAvailable: this.isShieldAvailable(user.shieldUsedDate, todayStr),
        shieldUsed: false,
        message: 'Hôm nay bạn đã duy trì chuỗi rồi!',
      };
    }

    let shieldUsed = false;
    if (user.lastActiveDate === yesterdayStr) {
      // Vào liên tiếp -> tăng chuỗi
      currentStreak += 1;
    } else if (
      user.lastActiveDate === twoDaysAgoStr &&
      currentStreak > 0 &&
      this.isShieldAvailable(user.shieldUsedDate, todayStr)
    ) {
      // Lỡ đúng 1 ngày + tuần này còn lá chắn -> tự động dùng lá chắn, giữ chuỗi
      // (ngày bị lỡ không được cộng vào chuỗi)
      shieldUsed = true;
      user.shieldUsedDate = todayStr;
      currentStreak += 1;
    } else {
      // Lỡ từ 2 ngày trở lên hoặc hết lá chắn -> mất chuỗi
      currentStreak = 1;
    }
    const isComeback = !!user.lastActiveDate && !shieldUsed && user.lastActiveDate !== yesterdayStr;

    // Tổng số ngày hoạt động luôn được cộng dồn, không bao giờ reset
    totalActiveDays += 1;
    longestStreak = Math.max(longestStreak, currentStreak);

    user.streak = currentStreak;
    user.totalActiveDays = totalActiveDays;
    user.longestStreak = longestStreak;
    user.lastActiveDate = todayStr;
    if (currentStreak >= 3) {
      user.isPro = true;
    }
    await user.save();

    const proBonusMsg = currentStreak === 3 ? ' 👑 Chúc mừng bạn đã mở khóa danh hiệu PRO Thành Viên Tinh Hoa!' : '';
    let message: string;
    if (shieldUsed) {
      message = `🛡️ Lá chắn đã bảo vệ chuỗi của bạn! Chuỗi hiện tại: ${currentStreak} ngày. Lá chắn sẽ hồi lại vào Thứ 2 tuần sau.${proBonusMsg}`;
    } else if (isComeback) {
      message = `Chào mừng bạn quay lại! 👋 Bạn đã đồng hành cùng Monett ${totalActiveDays} ngày (kỷ lục chuỗi: ${longestStreak} ngày).`;
    } else {
      message = `Tuyệt vời! Chuỗi của bạn đã tăng lên ${currentStreak} ngày! 🔥${proBonusMsg}`;
    }

    return {
      streak: currentStreak,
      totalActiveDays,
      longestStreak,
      shieldAvailable: this.isShieldAvailable(user.shieldUsedDate, todayStr),
      shieldUsed,
      message,
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

