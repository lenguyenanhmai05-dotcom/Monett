import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  private toObjectId(id: string): Types.ObjectId {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID giao dịch không hợp lệ');
    }
    return new Types.ObjectId(id);
  }

  private sanitizeTransactionDto(dto: any) {
    const sanitized: any = {};
    if (dto.title !== undefined) sanitized.title = String(dto.title).trim();
    if (dto.type !== undefined) sanitized.type = dto.type === 'income' ? 'income' : 'expense';

    if (dto.amount !== undefined) {
      const absAmount = Math.abs(Number(dto.amount) || 0);
      const isExpense = (sanitized.type || dto.type) === 'expense';
      sanitized.amount = isExpense ? -absAmount : absAmount;
    }

    if (dto.category !== undefined) sanitized.category = String(dto.category).trim();
    if (dto.categoryIcon !== undefined) sanitized.categoryIcon = String(dto.categoryIcon);
    if (dto.note !== undefined) sanitized.note = String(dto.note).trim();
    if (dto.photoUri !== undefined) sanitized.photoUri = dto.photoUri;
    if (dto.walletId !== undefined) sanitized.walletId = dto.walletId;
    if (dto.date !== undefined && dto.date) sanitized.date = new Date(dto.date);

    return sanitized;
  }

  async create(userId: string, dto: any): Promise<Transaction> {
    const data = this.sanitizeTransactionDto(dto);
    const created = new this.transactionModel({
      ...data,
      user: this.toObjectId(userId),
      date: data.date || new Date(),
    });
    return created.save();
  }

  async findAll(userId: string, query: FindTransactionsQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { user: this.toObjectId(userId) };

    if (query.category && query.category !== 'all' && query.category !== 'Tất cả') {
      filter.category = query.category;
    }

    if (query.search && query.search.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { note: { $regex: escaped, $options: 'i' } },
      ];
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

    let items: any[];

    if (query.sort === 'amount_asc' || query.sort === 'amount_desc') {
      const sortDir = query.sort === 'amount_asc' ? 1 : -1;
      items = await this.transactionModel.aggregate([
        { $match: filter },
        { $addFields: { absAmount: { $abs: '$amount' } } },
        { $sort: { absAmount: sortDir, date: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
      items = items.map((doc) => ({
        ...doc,
        id: doc._id?.toString(),
      }));
    } else {
      let sortOption: any = { date: -1, createdAt: -1 };
      if (query.sort === 'date_asc') {
        sortOption = { date: 1, createdAt: 1 };
      }
      items = await this.transactionModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec();
    }

    const total = await this.transactionModel.countDocuments(filter).exec();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByDate(userId: string, dateStr?: string) {
    let start: Date;
    let end: Date;

    if (!dateStr) {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else {
      const d = new Date(dateStr);
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    }

    const items = await this.transactionModel
      .find({
        user: this.toObjectId(userId),
        date: { $gte: start, $lte: end },
      })
      .sort({ date: -1, createdAt: -1 })
      .exec();

    const photos = items
      .filter((t) => t.photoUri && t.photoUri.trim().length > 0)
      .map((t) => ({
        id: (t as any)._id?.toString() || (t as any).id,
        photoUri: t.photoUri,
        title: t.title,
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
      }));

    let totalExpense = 0;
    let totalIncome = 0;
    for (const t of items) {
      const val = Math.abs(t.amount);
      if (t.type === 'expense' || t.amount < 0) {
        totalExpense += val;
      } else {
        totalIncome += val;
      }
    }

    return {
      date: dateStr || new Date().toISOString().split('T')[0],
      totalItems: items.length,
      totalExpense,
      totalIncome,
      net: totalIncome - totalExpense,
      items,
      photos,
    };
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const objectId = this.toObjectId(id);
    const tx = await this.transactionModel.findOne({
      _id: objectId,
      user: this.toObjectId(userId),
    });
    if (!tx) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }
    return tx;
  }

  async update(userId: string, id: string, dto: any): Promise<Transaction> {
    const objectId = this.toObjectId(id);
    const updateData = this.sanitizeTransactionDto(dto);
    delete updateData.user;
    delete updateData._id;

    const updated = await this.transactionModel.findOneAndUpdate(
      { _id: objectId, user: this.toObjectId(userId) },
      { $set: updateData },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('Không tìm thấy giao dịch để cập nhật');
    }
    return updated;
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const objectId = this.toObjectId(id);
    const res = await this.transactionModel.deleteOne({
      _id: objectId,
      user: this.toObjectId(userId),
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
      user: this.toObjectId(userId),
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    let totalExpense = 0;
    let totalIncome = 0;
    const categorySpending: Record<string, number> = {};

    for (const t of txs) {
      const val = Math.abs(t.amount);
      if (t.type === 'expense' || t.amount < 0) {
        totalExpense += val;
        const cat = t.category || 'Khác';
        categorySpending[cat] = (categorySpending[cat] || 0) + val;
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
      categorySpending,
    };
  }
}
