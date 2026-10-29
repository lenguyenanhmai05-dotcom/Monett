import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IAnalyticsOverview,
  IDailySpendingTrend,
  ICategoryBreakdown,
  IMonthlyComparison,
  IEmoMindfulness,
  IFeaturedMoment,
  IFullAnalyticsReport,
  AnalyticsPeriod,
} from '@monett/shared';
import { Transaction, TransactionDocument } from '../transactions/schemas/transaction.schema';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Moment, MomentDocument } from '../moments/schemas/moment.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Moment.name)
    private readonly momentModel: Model<MomentDocument>,
  ) {}

  /**
   * GET /api/analytics/overview
   * Tổng thu, tổng chi, số tiền tiết kiệm trong kỳ (100% dữ liệu thực).
   */
  async getOverview(
    userId: string,
    period: AnalyticsPeriod = 'month',
    month?: number,
    year?: number,
  ): Promise<IAnalyticsOverview> {
    const now = new Date();
    const targetMonth = month ? Number(month) : now.getMonth() + 1;
    const targetYear = year ? Number(year) : now.getFullYear();

    // Lấy thông tin user (để lấy streak thực tế)
    const user = await this.userModel.findById(userId).exec();
    const streakDays = user?.streak || 0;

    // Lấy budget hiện tại nếu có
    const budget = await this.budgetModel.findOne({
      user: new Types.ObjectId(userId),
      month: targetMonth,
      year: targetYear,
    }).exec();

    // Xác định khoảng thời gian lọc
    let startDate: Date;
    let endDate: Date;

    if (period === 'day') {
      startDate = new Date(targetYear, targetMonth - 1, now.getDate(), 0, 0, 0);
      endDate = new Date(targetYear, targetMonth - 1, now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      const day = now.getDay() || 7;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'quarter') {
      const quarterIndex = Math.floor((targetMonth - 1) / 3);
      const qStartMonth = quarterIndex * 3;
      startDate = new Date(targetYear, qStartMonth, 1);
      endDate = new Date(targetYear, qStartMonth + 3, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      startDate = new Date(targetYear, 0, 1);
      endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    } else {
      // Month
      startDate = new Date(targetYear, targetMonth - 1, 1);
      endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    }

    // Truy vấn các giao dịch trong kỳ
    const txs = await this.transactionModel.find({
      user: new Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
    }).exec();

    let calcExpense = 0;
    let calcIncome = 0;
    let withPhotoCount = 0;

    for (const t of txs) {
      const val = Math.abs(t.amount);
      if (t.type === 'expense' || t.amount < 0) {
        calcExpense += val;
      } else {
        calcIncome += val;
      }
      if (t.photoUri && t.photoUri.trim().length > 0) {
        withPhotoCount++;
      }
    }

    const baseLimit = budget?.limit || 0;
    const totalIncome = calcIncome;
    const totalExpense = calcExpense;
    const savings = Math.max(0, totalIncome - totalExpense);
    const expensePercent = totalIncome > 0 ? Number(((totalExpense / totalIncome) * 100).toFixed(1)) : 0;
    const savingsPercent = totalIncome > 0 ? Number(((savings / totalIncome) * 100).toFixed(1)) : 0;

    // Tính mức chi tiêu trung bình ngày (daily average)
    const daysInPeriod = Math.max(
      1,
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
    const dailyAverage = Math.round(totalExpense / daysInPeriod);

    const isSafe = baseLimit > 0 ? totalExpense <= baseLimit : true;
    const safetyStatus = baseLimit > 0 && totalExpense > baseLimit ? 'danger' : baseLimit > 0 && totalExpense > baseLimit * 0.8 ? 'warning' : 'safe';

    const totalTransactions = txs.length;
    const momentsCount = withPhotoCount;
    const momentsRatio = totalTransactions > 0 ? Math.round((momentsCount / totalTransactions) * 100) : 0;

    return {
      totalIncome,
      totalExpense,
      savings,
      dailyAverage,
      savingsPercent,
      expensePercent,
      savingsTargetDiffPercent: 0,
      incomeFixedPercent: 100,
      budgetLimit: baseLimit,
      isSafe,
      safetyStatus,
      streakDays,
      momentsCount,
      totalTransactions,
      momentsRatio,
      banner: {
        streakDays,
        title: isSafe
          ? 'Tuyệt vời! Bạn đang kiểm soát chi tiêu rất tốt'
          : 'Chú ý! Chi tiêu tháng này đang tiến gần hạn mức',
        subtitle: `Chi tiêu Tháng ${targetMonth} ${totalExpense > 0 ? `là ${totalExpense.toLocaleString('vi-VN')}đ` : 'chưa phát sinh'}`,
      },
    };
  }

  /**
   * GET /api/analytics/daily-trend
   * Xu Hướng Chi Tiêu Hàng Ngày theo từng mốc ngày thực tế trong tháng
   */
  async getDailyTrend(userId: string, month?: number, year?: number): Promise<IDailySpendingTrend[]> {
    const now = new Date();
    const targetMonth = month ? Number(month) : now.getMonth() + 1;
    const targetYear = year ? Number(year) : now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    const daysInMonth = endDate.getDate();

    const txs = await this.transactionModel.find({
      user: new Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
      $or: [{ type: 'expense' }, { amount: { $lt: 0 } }],
    }).exec();

    const dayMap = new Map<number, number>();
    for (const t of txs) {
      const d = new Date(t.date).getDate();
      dayMap.set(d, (dayMap.get(d) || 0) + Math.abs(t.amount));
    }

    const budget = await this.budgetModel.findOne({
      user: new Types.ObjectId(userId),
      month: targetMonth,
      year: targetYear,
    }).exec();
    const dailyBenchmark = budget?.limit ? Math.round(budget.limit / daysInMonth) : 0;

    let peakDay = 0;
    let peakAmount = 0;
    for (const [day, amt] of dayMap.entries()) {
      if (amt > peakAmount) {
        peakAmount = amt;
        peakDay = day;
      }
    }

    const trendPoints: IDailySpendingTrend[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = d < 10 ? '0' + d : String(d);
      const amt = dayMap.get(d) || 0;
      trendPoints.push({
        day: dayStr,
        label: dayStr + ' Th' + targetMonth,
        amount: amt,
        benchmark: dailyBenchmark,
        isPeak: d === peakDay && peakAmount > 0,
        highlightTitle: d === peakDay && peakAmount > 0 ? 'Đỉnh chi: Ngày ' + dayStr + ' (' + (peakAmount / 1000).toLocaleString('vi-VN') + 'k)' : undefined,
      });
    }

    return trendPoints;
  }

  /**
   * GET /api/analytics/category-breakdown
   * Tỷ lệ phần trăm và tổng tiền của từng nhóm danh mục.
   */
  async getCategories(
    userId: string,
    month?: number,
    year?: number,
    period: AnalyticsPeriod = 'month',
  ): Promise<ICategoryBreakdown[]> {
    const now = new Date();
    const targetMonth = month ? Number(month) : now.getMonth() + 1;
    const targetYear = year ? Number(year) : now.getFullYear();

    let startDate: Date;
    let endDate: Date;

    if (period === 'day') {
      startDate = new Date(targetYear, targetMonth - 1, now.getDate(), 0, 0, 0);
      endDate = new Date(targetYear, targetMonth - 1, now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      const day = now.getDay() || 7;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'quarter') {
      const quarterIndex = Math.floor((targetMonth - 1) / 3);
      const qStartMonth = quarterIndex * 3;
      startDate = new Date(targetYear, qStartMonth, 1);
      endDate = new Date(targetYear, qStartMonth + 3, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      startDate = new Date(targetYear, 0, 1);
      endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    } else {
      // Month
      startDate = new Date(targetYear, targetMonth - 1, 1);
      endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
    }

    const txs = await this.transactionModel.find({
      user: new Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
      $or: [{ type: 'expense' }, { amount: { $lt: 0 } }],
    }).exec();

    if (txs.length > 0) {
      const catMap = new Map<string, { amount: number; count: number; icon: string }>();
      let total = 0;
      for (const t of txs) {
        const val = Math.abs(t.amount);
        total += val;
        const catName = t.category || 'Khác';
        const existing = catMap.get(catName) || { amount: 0, count: 0, icon: t.categoryIcon || '💵' };
        existing.amount += val;
        existing.count += 1;
        catMap.set(catName, existing);
      }

      if (total > 0) {
        const palette = ['#047857', '#4F46E5', '#F59E0B', '#94A3B8', '#EC4899', '#06B6D4'];
        let idx = 0;
        const result: ICategoryBreakdown[] = [];
        for (const [name, val] of catMap.entries()) {
          const percent = Math.round((val.amount / total) * 100);
          result.push({
            id: 'cat-' + (idx + 1),
            name,
            amount: val.amount,
            percent,
            color: palette[idx % palette.length],
            icon: val.icon,
            count: val.count,
          });
          idx++;
        }
        return result.sort((a, b) => b.amount - a.amount);
      }
    }

    return [];
  }

  /**
   * GET /api/analytics/monthly-comparison
   * Dữ liệu 6 tháng gần nhất để vẽ biểu đồ so sánh dòng tiền Thu nhập vs Chi tiêu.
   */
  async getMonthlyComparison(userId: string, month?: number, year?: number): Promise<IMonthlyComparison> {
    const now = new Date();
    const targetMonth = month ? Number(month) : now.getMonth() + 1;
    const targetYear = year ? Number(year) : now.getFullYear();

    // Chuẩn bị danh sách 6 tháng gần nhất
    const sixMonths: Array<{
      monthName: string;
      month: number;
      year: number;
      income: number;
      expense: number;
      amount: number;
      savings: number;
      netCashflow: number;
      displayAmount: string;
      displayIncome: string;
      isCurrent: boolean;
      deltaPercent?: number;
    }> = [];


    for (let i = 5; i >= 0; i--) {
      let m = targetMonth - i;
      let y = targetYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }

      // Check real DB if available
      const startM = new Date(y, m - 1, 1);
      const endM = new Date(y, m, 0, 23, 59, 59, 999);
      const txs = await this.transactionModel.find({
        user: new Types.ObjectId(userId),
        date: { $gte: startM, $lte: endM },
      }).exec();

      let exp = 0;
      let inc = 0;
      for (const t of txs) {
        if (t.type === 'expense' || t.amount < 0) {
          exp += Math.abs(t.amount);
        } else {
          inc += Math.abs(t.amount);
        }
      }

      const finalExp = exp;
      const finalInc = inc;
      const savings = finalInc - finalExp;
      const isCur = i === 0;

      let deltaPercent: number | undefined = undefined;
      if (isCur) {
        const prevExp = sixMonths.length > 0 ? sixMonths[sixMonths.length - 1].expense : 0;
        deltaPercent = prevExp > 0 ? Number((((finalExp - prevExp) / prevExp) * 100).toFixed(1)) : 0;
      }

      sixMonths.push({
        monthName: `Tháng ${m}`,
        month: m,
        year: y,
        income: finalInc,
        expense: finalExp,
        amount: finalExp,
        savings,
        netCashflow: savings,
        displayAmount: `${(finalExp / 1000000).toFixed(1)}M`,
        displayIncome: `${(finalInc / 1000000).toFixed(1)}M`,
        isCurrent: isCur,
        deltaPercent,
      });
    }

    return {
      months: sixMonths,
      insight: {
        title: 'Xu hướng tích cực',
        description: `Chi tiêu Tháng ${targetMonth} giảm 1.050.000đ so với Tháng ${targetMonth === 1 ? 12 : targetMonth - 1} nhờ tiết giảm chi phí mua sắm bốc đồng.`,
        isPositive: true,
      },
    };
  }

  /**
   * GET /api/analytics/emotions
   * Cảm Xúc Sau Chi Tiêu & Chỉ số hạnh phúc/chánh niệm
   */
  async getEmotions(userId: string, month?: number, year?: number): Promise<IEmoMindfulness> {
    const now = new Date();
    const targetMonth = month ? Number(month) : now.getMonth() + 1;
    const targetYear = year ? Number(year) : now.getFullYear();

    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const txs = await this.transactionModel
      .find({
        user: new Types.ObjectId(userId),
        date: { $gte: start, $lte: end },
        $or: [{ type: 'expense' }, { amount: { $lt: 0 } }],
      })
      .exec();

    let essential = 0;
    let happy = 0;
    let impulse = 0;

    for (const tx of txs) {
      const amt = Math.abs(tx.amount);
      const cat = (tx.category || '').toLowerCase();
      if (cat.includes('nhà') || cat.includes('điện') || cat.includes('nước') || cat.includes('xăng') || cat.includes('học') || cat.includes('thuê') || cat.includes('bảo hiểm')) {
        essential += amt;
      } else if (cat.includes('mua sắm') || cat.includes('game') || cat.includes('nhậu') || cat.includes('tiệc')) {
        impulse += amt;
      } else {
        happy += amt;
      }
    }

    const total = essential + happy + impulse;
    if (total === 0) {
      return {
        items: [],
        suggestion: 'Chưa có dữ liệu cảm xúc chi tiêu trong tháng này.',
      };
    }

    const happyPct = Math.round((happy / total) * 100);
    const essPct = Math.round((essential / total) * 100);
    const impPct = Math.max(0, 100 - happyPct - essPct);

    return {
      items: [
        {
          key: 'happy',
          title: 'Hạnh phúc / Đầu tư cho bản thân',
          percent: happyPct,
          amount: happy,
          color: '#10B981',
          emoji: '😊',
          description: `${happy.toLocaleString('vi-VN')}đ chi tiêu cho trải nghiệm & sức khỏe.`,
        },
        {
          key: 'essential',
          title: 'Bắt buộc / Sinh hoạt thiết yếu',
          percent: essPct,
          amount: essential,
          color: '#64748B',
          emoji: '😐',
          description: `${essential.toLocaleString('vi-VN')}đ hóa đơn sinh hoạt định kỳ, xăng xe.`,
        },
        {
          key: 'impulse',
          title: 'Bốc đồng / Khác',
          percent: impPct,
          amount: impulse,
          color: '#EF4444',
          emoji: '⚡',
          description: `${impulse.toLocaleString('vi-VN')}đ chi mua sắm, phát sinh ngoài dự kiến.`,
        },
      ],
      suggestion:
        happyPct >= 50
          ? 'Tỷ lệ chi tiêu mang lại niềm vui chiếm đa số, dòng tiền đang rất lành mạnh!'
          : 'Hãy cân đối các khoản chi thiết yếu và hạn chế chi tiêu bốc đồng để tích lũy tốt hơn.',
    };
  }

  /**
   * GET /api/analytics/moments
   * 4 Khoảnh khắc chi tiêu tiêu biểu kèm hình ảnh chất lượng cao
   */
  async getFeaturedMoments(userId: string): Promise<IFeaturedMoment[]> {
    try {
      const userObjId = new Types.ObjectId(userId);
      const realTx = await this.transactionModel
        .find({ user: userObjId, photoUri: { $exists: true, $ne: '' } })
        .sort({ date: -1 })
        .limit(4)
        .exec();

      if (realTx && realTx.length > 0) {
        return realTx
          .filter((tx) => tx.photoUri && !tx.photoUri.includes('unsplash.com'))
          .map((tx) => ({
            id: tx._id.toString(),
            badge: tx.category || 'Chi tiêu',
            badgeColor: '#047857',
            amount: tx.amount,
            title: tx.title || 'Khoản chi tiêu',
            subtitle: `${new Date(tx.date).toLocaleDateString('vi-VN')} • ${tx.note || tx.category || ''}`,
            photoUri: tx.photoUri || '',
          }));
      }
    } catch (_) {}

    return [];
  }

  /**
   * GET /api/analytics/full-report
   * Trả về toàn bộ dữ liệu báo cáo chuyên sâu
   */
  async getFullReport(
    userId: string,
    period: AnalyticsPeriod = 'month',
    month?: number,
    year?: number,
  ): Promise<IFullAnalyticsReport> {
    const now = new Date();
    const targetMonth = month ? Number(month) : now.getMonth() + 1;
    const targetYear = year ? Number(year) : now.getFullYear();

    const [overview, dailyTrend, categories, comparison, emotions, moments] = await Promise.all([
      this.getOverview(userId, period, targetMonth, targetYear),
      this.getDailyTrend(userId, targetMonth, targetYear),
      this.getCategories(userId, targetMonth, targetYear),
      this.getMonthlyComparison(userId, targetMonth, targetYear),
      this.getEmotions(userId, targetMonth, targetYear),
      this.getFeaturedMoments(userId),
    ]);

    const dNum = now.getDate() < 10 ? '0' + now.getDate() : String(now.getDate());
    const dateDisplay = `Hôm nay, ${dNum} Tháng ${targetMonth < 10 ? '0' + targetMonth : targetMonth}, ${targetYear}`;

    return {
      period,
      month: targetMonth,
      year: targetYear,
      dateDisplay,
      overview,
      dailyTrend,
      categories,
      comparison,
      emotions,
      moments,
    };
  }
}
