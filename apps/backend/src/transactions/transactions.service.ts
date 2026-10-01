import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';

export interface FindTransactionsQuery {
  page?: number;
  limit?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sort?: string;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async create(userId: string, dto: any): Promise<Transaction> {
    const created = new this.transactionModel({
      ...dto,
      user: new Types.ObjectId(userId),
      date: dto.date ? new Date(dto.date) : new Date(),
    });
    return created.save();
  }

  async findAll(userId: string, query: FindTransactionsQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { user: new Types.ObjectId(userId) };

    if (query.category && query.category !== 'all' && query.category !== 'Tất cả') {
      filter.category = query.category;
    }

    if (query.search) {
      filter.title = { $regex: query.search.trim(), $options: 'i' };
    }

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) {
        filter.date.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    let sortOption: any = { date: -1, createdAt: -1 };
    if (query.sort === 'amount_asc') {
      sortOption = { amount: 1 };
    } else if (query.sort === 'amount_desc') {
      sortOption = { amount: -1 };
    } else if (query.sort === 'date_asc') {
      sortOption = { date: 1 };
    }

    const [items, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const tx = await this.transactionModel.findOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    });
    if (!tx) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }
    return tx;
  }

  async update(userId: string, id: string, dto: any): Promise<Transaction> {
    const updateData: any = { ...dto };
    if (dto.date) {
      updateData.date = new Date(dto.date);
    }
    const updated = await this.transactionModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), user: new Types.ObjectId(userId) },
      { $set: updateData },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Không tìm thấy giao dịch để cập nhật');
    }
    return updated;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const res = await this.transactionModel.deleteOne({
      _id: new Types.ObjectId(id),
      user: new Types.ObjectId(userId),
    });
    if (res.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy giao dịch để xóa');
    }
    return { success: true, message: 'Đã xóa giao dịch thành công' };
  }

  async getMonthStats(userId: string, month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const txs = await this.transactionModel.find({
      user: new Types.ObjectId(userId),
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    let totalExpense = 0;
    let totalIncome = 0;

    for (const t of txs) {
      const val = Math.abs(t.amount);
      if (t.type === 'expense' || t.amount < 0) {
        totalExpense += val;
      } else {
        totalIncome += val;
      }
    }

    return {
      month,
      year,
      totalExpense,
      totalIncome,
      balance: totalIncome - totalExpense,
      count: txs.length,
    };
  }
}
