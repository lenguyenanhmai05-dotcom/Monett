import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@monett/shared';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Transaction, TransactionDocument } from '../transactions/schemas/transaction.schema';
import { UsersService } from '../users/users.service';

export interface SeedResult {
  adminCreated: boolean;
  adminEmail: string;
  message: string;
}

const SAMPLE_TRANSACTIONS = [
  {
    title: 'Cà phê sữa đá',
    amount: -45000,
    type: 'expense',
    category: 'Cà phê',
    categoryIcon: '☕',
    note: 'Cà phê sáng vỉa hè ngắm phố phường thanh bình',
    photoUri: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=250&auto=format&fit=crop&q=80',
    date: new Date('2026-10-01T07:30:00.000Z'),
  },
  {
    title: 'Caesar Salad Bò áp chảo',
    amount: -120000,
    type: 'expense',
    category: 'Ăn uống',
    categoryIcon: '🍜',
    note: 'Bữa trưa healthy cùng đồng nghiệp công ty',
    photoUri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=250&auto=format&fit=crop&q=80',
    date: new Date('2026-10-02T12:15:00.000Z'),
  },
  {
    title: 'Combo Lẩu Bò Cà Chua',
    amount: -310000,
    type: 'expense',
    category: 'Ăn uống',
    categoryIcon: '🍲',
    note: 'Lẩu mini cuối tuần thật ấm bụng',
    photoUri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=250&auto=format&fit=crop&q=80',
    date: new Date('2026-10-03T13:00:00.000Z'),
  },
  {
    title: 'Bánh Tart Dâu & Trà Đào',
    amount: -185000,
    type: 'expense',
    category: 'Trà chiều',
    categoryIcon: '🍰',
    note: 'Bánh tart dâu và trà hoa quả thư giãn chủ nhật',
    photoUri: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=250&auto=format&fit=crop&q=80',
    date: new Date('2026-10-04T16:45:00.000Z'),
  },
  {
    title: 'Phở bò tái lăn đặc biệt',
    amount: -95000,
    type: 'expense',
    category: 'Ăn uống',
    categoryIcon: '🍜',
    note: 'Bát phở tái lăn ngập hành lá thơm nức đầu tuần',
    photoUri: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=250&auto=format&fit=crop&q=80',
    date: new Date('2026-10-05T08:00:00.000Z'),
  },
  {
    title: 'Tô bún bò thập cẩm chả cua',
    amount: -150000,
    type: 'expense',
    category: 'Ăn uống',
    categoryIcon: '🍜',
    note: 'Tô bún bò thơm nồng cùng đồng nghiệp trưa',
    photoUri: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=250&auto=format&fit=crop&q=80',
    date: new Date('2026-10-06T11:30:00.000Z'),
  },
  {
    title: 'Freeze Trà Xanh cỡ lớn',
    amount: -65000,
    type: 'expense',
    category: 'Cà phê',
    categoryIcon: '☕',
    note: 'Ly Freeze Trà Xanh nạp năng lượng tập trung làm việc',
    photoUri: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=250&auto=format&fit=crop&q=80',
    date: new Date('2026-10-07T09:15:00.000Z'),
  },
  {
    title: 'Cơm niêu xá xíu & Canh chua',
    amount: -220000,
    type: 'expense',
    category: 'Ẩm thực',
    categoryIcon: '🍚',
    note: 'Cơm niêu xá xíu thơm giòn cháy đáy',
    photoUri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=250&auto=format&fit=crop&q=80',
    date: new Date('2026-10-08T12:10:00.000Z'),
  },
  {
    title: 'Đổ xăng Ron 95',
    amount: -75000,
    type: 'expense',
    category: 'Di chuyển',
    categoryIcon: '⛽',
    note: 'Đổ đầy bình xăng xe máy chạy cả tuần',
    photoUri: '',
    date: new Date('2026-10-09T08:15:00.000Z'),
  },
  {
    title: 'Pizza 4 Cheese & Salad bơ',
    amount: -390000,
    type: 'expense',
    category: 'Ẩm thực',
    categoryIcon: '🍕',
    note: 'Tự thưởng pizza phô mai thơm lừng mừng cuối tuần!',
    photoUri: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    date: new Date('2026-10-10T19:42:00.000Z'),
  },
  {
    title: 'Nước ép cam tươi',
    amount: -60000,
    type: 'expense',
    category: 'Đồ uống',
    categoryIcon: '🍹',
    note: 'Nước ép cam tươi thanh mát',
    photoUri: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    date: new Date('2026-10-10T19:50:00.000Z'),
  },
  {
    title: 'Thực phẩm tươi sống & Rau củ',
    amount: -280000,
    type: 'expense',
    category: 'Đi chợ',
    categoryIcon: '🛒',
    note: 'Đi siêu thị mua rau củ quả tươi cho tuần mới',
    photoUri: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=250&auto=format&fit=crop&q=80',
    date: new Date('2026-10-11T18:00:00.000Z'),
  },
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    private readonly usersService: UsersService,
  ) {}

  async seedAdmin(): Promise<SeedResult> {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@monett.vn').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Monett Admin';

    try {
      // Kiểm tra admin đã tồn tại chưa
      const existingAdmin = await this.userModel.findOne({ email: adminEmail }).exec();
      if (existingAdmin) {
        // Đảm bảo tài khoản có role ADMIN
        if (existingAdmin.role !== UserRole.ADMIN) {
          existingAdmin.role = UserRole.ADMIN;
          await existingAdmin.save();
          this.logger.log(`✅ Cập nhật role ADMIN cho tài khoản: ${adminEmail}`);
        }
        return {
          adminCreated: false,
          adminEmail,
          message: `Admin account already exists: ${adminEmail}`,
        };
      }

      // Hash mật khẩu
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      // Tạo admin user mới
      const newAdmin = new this.userModel({
        email: adminEmail,
        password: hashedPassword,
        fullName: adminName,
        role: UserRole.ADMIN,
        currency: 'VND',
        authProvider: 'local',
      });

      await newAdmin.save();

      this.logger.log(`✅ Đã tạo tài khoản Admin: ${adminEmail}`);
      this.logger.log(`   Mật khẩu: ${adminPassword}`);
      this.logger.log(`   Vui lòng thay đổi mật khẩu sau khi đăng nhập!`);

      return {
        adminCreated: true,
        adminEmail,
        message: `Admin account created: ${adminEmail}`,
      };
    } catch (error: any) {
      this.logger.error(`Lỗi khi seed admin: ${error.message}`);
      throw error;
    }
  }

  async seedSampleTransactions(): Promise<void> {
    try {
      const users = await this.userModel.find().exec();
      for (const user of users) {
        for (const item of SAMPLE_TRANSACTIONS) {
          const exists = await this.transactionModel.findOne({
            user: user._id,
            title: item.title,
            date: item.date,
          });
          if (!exists) {
            await this.transactionModel.create({
              ...item,
              user: user._id,
            });
          }
        }
      }
      this.logger.log('✅ Đã kiểm tra và đồng bộ chi tiêu mẫu cho tất cả tài khoản');
    } catch (err: any) {
      this.logger.error(`Lỗi khi seed giao dịch mẫu: ${err.message}`);
    }
  }
}