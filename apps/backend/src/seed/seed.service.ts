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
      // Đồng thời đảm bảo tài khoản Google lenguyenanhmai05@gmail.com luôn có role ADMIN
      const googleAdminEmail = 'lenguyenanhmai05@gmail.com';
      const existingGoogleAdmin = await this.userModel.findOne({ email: googleAdminEmail }).exec();
      if (existingGoogleAdmin && existingGoogleAdmin.role !== UserRole.ADMIN) {
        existingGoogleAdmin.role = UserRole.ADMIN;
        await existingGoogleAdmin.save();
        this.logger.log(`✅ Cập nhật role ADMIN cho tài khoản Google: ${googleAdminEmail}`);
      }

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

  async purgeSampleTransactions(): Promise<void> {
    try {
      const sampleTitles = [
        'Cà phê sữa đá',
        'Caesar Salad Bò áp chảo',
        'Combo Lẩu Bò Cà Chua',
        'Bánh Tart Dâu & Trà Đào',
        'Phở bò tái lăn đặc biệt',
        'Tô bún bò thập cẩm chả cua',
        'Freeze Trà Xanh cỡ lớn',
        'Cơm niêu xá xíu & Canh chua',
        'Đổ xăng Ron 95',
        'Pizza 4 Cheese & Salad bơ',
        'Nước ép cam tươi',
        'Thực phẩm tươi sống & Rau củ',
      ];
      const res = await this.transactionModel.deleteMany({
        $or: [
          { title: { $in: sampleTitles } },
          { photoUri: { $regex: 'unsplash.com' } },
        ],
      }).exec();
      if (res.deletedCount > 0) {
        this.logger.log(`🧹 Đã xóa sạch triệt để ${res.deletedCount} giao dịch mẫu giả khỏi MongoDB cho tất cả tài khoản!`);
      }
    } catch (err: any) {
      this.logger.error(`Lỗi khi dọn dẹp giao dịch mẫu: ${err.message}`);
    }
  }
}