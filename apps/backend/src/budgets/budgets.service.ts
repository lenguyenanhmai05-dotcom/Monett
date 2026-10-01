import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Budget, BudgetDocument } from './schemas/budget.schema';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    private readonly transactionsService: TransactionsService,
  ) {}

  async getCurrent(userId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let budget = await this.budgetModel.findOne({
      user: new Types.ObjectId(userId),
      month,
      year,
    });

    if (!budget) {
      budget = await this.budgetModel.create({
        user: new Types.ObjectId(userId),
        month,
        year,
        limit: 22000000,
        currency: 'VND',
        payday: 5,
      });
    }

    const stats = await this.transactionsService.getMonthStats(userId, month, year);
    const spent = stats.totalExpense;
    const limit = budget.limit;
    const remaining = Math.max(0, limit - spent);
    const spentPercent = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;
    const remainingPercent = limit > 0 ? Number(((remaining / limit) * 100).toFixed(1)) : 0;

    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (spentPercent > 100) {
      status = 'danger';
    } else if (spentPercent >= 80) {
      status = 'warning';
    }

    // Tính số ngày còn lại đến kỳ trả lương kế tiếp
    const todayDate = now.getDate();
    const payday = budget.payday || 5;
    let daysUntilPayday = payday - todayDate;
    if (daysUntilPayday < 0) {
      // Sang tháng sau
      const daysInMonth = new Date(year, month, 0).getDate();
      daysUntilPayday = (daysInMonth - todayDate) + payday;
    }

    return {
      month,
      year,
      limit,
      spent,
      remaining,
      spentPercent,
      remainingPercent,
      status,
      payday,
      daysUntilPayday,
      currency: budget.currency || 'VND',
    };
  }

  async setBudget(
    userId: string,
    dto: { month?: number; year?: number; limit: number; payday?: number; currency?: string },
  ) {
    const now = new Date();
    const month = dto.month || now.getMonth() + 1;
    const year = dto.year || now.getFullYear();

    const updateFields: any = { limit: dto.limit };
    if (dto.payday) updateFields.payday = dto.payday;
    if (dto.currency) updateFields.currency = dto.currency;

    await this.budgetModel.findOneAndUpdate(
      { user: new Types.ObjectId(userId), month, year },
      { $set: updateFields },
      { upsert: true, new: true },
    );

    return this.getCurrent(userId);
  }
}
