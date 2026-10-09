import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RecurringBill,
  RecurringBillDocument,
} from './schemas/recurring-bill.schema';
import { Debt, DebtDocument } from './schemas/debt.schema';
import {
  CreateRecurringBillDto,
  UpdateRecurringBillDto,
  CreateDebtDto,
  UpdateDebtDto,
} from './dto/bill-debt.dto';

@Injectable()
export class BillsAndDebtsService {
  constructor(
    @InjectModel(RecurringBill.name)
    private recurringBillModel: Model<RecurringBillDocument>,
    @InjectModel(Debt.name)
    private debtModel: Model<DebtDocument>,
  ) {}

  // ================= RECURRING BILLS =================
  async getBills(userId: string) {
    const currentMonth = `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1,
    ).padStart(2, '0')}`;

    const bills = await this.recurringBillModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ dueDay: 1 })
      .exec();

    // Tự động kiểm tra nếu tháng mới thì reset isPaidThisMonth nếu lastPaidMonth khác currentMonth
    return bills.map((bill) => {
      const b = bill.toJSON();
      if (b.lastPaidMonth && b.lastPaidMonth !== currentMonth) {
        b.isPaidThisMonth = false;
      }
      return b;
    });
  }

  async createBill(userId: string, dto: CreateRecurringBillDto) {
    const bill = new this.recurringBillModel({
      ...dto,
      user: new Types.ObjectId(userId),
      isPaidThisMonth: false,
    });
    return bill.save();
  }

  async updateBill(userId: string, id: string, dto: UpdateRecurringBillDto) {
    const updated = await this.recurringBillModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Hóa đơn không tồn tại');
    return updated;
  }

  async toggleBillPaid(userId: string, id: string) {
    const bill = await this.recurringBillModel
      .findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .exec();
    if (!bill) throw new NotFoundException('Hóa đơn không tồn tại');

    const currentMonth = `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1,
    ).padStart(2, '0')}`;

    bill.isPaidThisMonth = !bill.isPaidThisMonth;
    bill.lastPaidMonth = bill.isPaidThisMonth ? currentMonth : '';
    return bill.save();
  }

  async deleteBill(userId: string, id: string) {
    const res = await this.recurringBillModel
      .deleteOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .exec();
    return { success: res.deletedCount > 0 };
  }

  // ================= DEBT BOOK (SỔ GHI NỢ) =================
  async getDebts(userId: string) {
    return this.debtModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getDebtSummary(userId: string) {
    const debts = await this.debtModel
      .find({
        user: new Types.ObjectId(userId),
        isSettled: false,
      })
      .exec();

    let lendCount = 0;
    let lendTotal = 0;
    let borrowCount = 0;
    let borrowTotal = 0;

    debts.forEach((d) => {
      if (d.type === 'lend') {
        lendCount += 1;
        lendTotal += d.amount || 0;
      } else if (d.type === 'borrow') {
        borrowCount += 1;
        borrowTotal += d.amount || 0;
      }
    });

    return {
      lendCount,
      lendTotal,
      borrowCount,
      borrowTotal,
    };
  }

  async createDebt(userId: string, dto: CreateDebtDto) {
    const debt = new this.debtModel({
      ...dto,
      user: new Types.ObjectId(userId),
      isSettled: false,
    });
    return debt.save();
  }

  async updateDebt(userId: string, id: string, dto: UpdateDebtDto) {
    const updated = await this.debtModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Khoản nợ không tồn tại');
    return updated;
  }

  async toggleDebtSettled(userId: string, id: string) {
    const debt = await this.debtModel
      .findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .exec();
    if (!debt) throw new NotFoundException('Khoản nợ không tồn tại');
    debt.isSettled = !debt.isSettled;
    return debt.save();
  }

  async deleteDebt(userId: string, id: string) {
    const res = await this.debtModel
      .deleteOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
      })
      .exec();
    return { success: res.deletedCount > 0 };
  }
}
