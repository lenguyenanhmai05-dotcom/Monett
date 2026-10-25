import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Transaction, TransactionDocument } from '../transactions/schemas/transaction.schema';
import { Moment, MomentDocument } from '../moments/schemas/moment.schema';
import { UserRole, IAdminStats } from '@monett/shared';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Moment.name) private readonly momentModel: Model<MomentDocument>,
  ) {}

  async getStats(): Promise<IAdminStats> {
    const [
      totalUsers,
      totalAdmins,
      googleUsers,
      localUsers,
      proUsers,
      totalTransactions,
      totalMoments,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ role: UserRole.ADMIN }).exec(),
      this.userModel.countDocuments({ authProvider: 'google' }).exec(),
      this.userModel.countDocuments({ authProvider: { $ne: 'google' } }).exec(),
      this.userModel.countDocuments({ isPro: true }).exec(),
      this.transactionModel.countDocuments().exec(),
      this.momentModel.countDocuments().exec(),
    ]);

    // Tính tổng thu và tổng chi hệ thống
    const sumAgg = await this.transactionModel.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    let totalExpense = 0;
    let totalIncome = 0;
    for (const item of sumAgg) {
      if (item._id === 'income') {
        totalIncome = item.total;
      } else {
        totalExpense += item.total;
      }
    }

    // Đếm số người dùng có streak hoặc hoạt động gần đây
    const today = new Date().toISOString().slice(0, 10);
    const activeUsersToday = await this.userModel.countDocuments({
      $or: [{ streak: { $gt: 0 } }, { lastActiveDate: today }],
    }).exec();

    return {
      totalUsers,
      totalAdmins,
      googleUsers,
      localUsers,
      proUsers,
      totalTransactions,
      totalIncome,
      totalExpense,
      totalMoments,
      activeUsersToday,
    };
  }

  async getUsers(search?: string, role?: string, page = 1, limit = 50) {
    const filter: any = {};
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    if (role && role !== 'ALL') {
      filter.role = role;
    }

    const skip = (Math.max(1, page) - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      users: users.map((u) => u.toJSON()),
      total,
      page,
      limit,
    };
  }

  async updateUserRole(userId: string, newRole: UserRole, operatorEmail: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.email.toLowerCase().trim() === 'lenguyenanhmai05@gmail.com' && newRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Không thể hạ quyền Admin của tài khoản chủ hệ thống');
    }

    user.role = newRole;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  async toggleUserPro(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    user.isPro = !user.isPro;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  async deleteUser(userId: string, operatorEmail: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.email.toLowerCase().trim() === 'lenguyenanhmai05@gmail.com') {
      throw new ForbiddenException('Không thể xóa tài khoản chủ hệ thống');
    }

    if (user.email.toLowerCase().trim() === operatorEmail.toLowerCase().trim()) {
      throw new BadRequestException('Không thể tự xóa chính tài khoản đang đăng nhập');
    }

    // Xóa dữ liệu liên quan
    await Promise.all([
      this.transactionModel.deleteMany({ user: new Types.ObjectId(userId) }).exec(),
      this.momentModel.deleteMany({ user: new Types.ObjectId(userId) }).exec(),
      this.userModel.findByIdAndDelete(userId).exec(),
    ]);

    return { success: true, message: `Đã xóa người dùng ${user.email}` };
  }

  async getRecentTransactions(limit = 30) {
    const txs = await this.transactionModel
      .find()
      .populate('user', 'fullName email avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return txs.map((t) => t.toJSON());
  }

  async getRecentMoments(limit = 30) {
    const moments = await this.momentModel
      .find()
      .populate('user', 'fullName email avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return moments.map((m) => m.toJSON());
  }

  async deleteMoment(momentId: string) {
    const res = await this.momentModel.findByIdAndDelete(momentId).exec();
    if (!res) {
      throw new NotFoundException('Không tìm thấy bài đăng');
    }
    return { success: true, message: 'Đã xóa bài đăng vi phạm' };
  }
}
