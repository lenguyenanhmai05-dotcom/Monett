import {
  MonettEvent,
  loadEventsFromStorage,
  preloadEventsFromAsyncStorage,
  saveEventsToStorage,
} from './eventsStorage';
import {
  ISavingsGoal,
  loadSavingsGoals,
  preloadSavingsFromAsyncStorage,
} from './savingsStorage';
import {
  DebtItem,
  loadDebtItems,
  preloadDebtFromAsyncStorage,
} from './debtStorage';
import {
  RecurringItem,
  loadRecurringItems,
  preloadRecurringFromAsyncStorage,
  calculateMonthlyEquivalent,
} from './recurringStorage';
import { PersonalNote, loadNotesFromStorage } from './notesStorage';
import { getCachedBudget, getInitialDayRecordsFromLocalStorage, DayExpenseRecord } from './calendarStorage';
import { getIncomeRecords, IncomeRecord } from './incomeStorage';
import { getEventsApi, getRecurringBillsApi, getDebtsApi } from './api';

export interface CategorySpendingSummary {
  category: string;
  amount: number;
  percent: number;
  count: number;
}

export interface FinancialAnalyticsSummary {
  month: number;
  year: number;
  totalMonthExpense: number;
  totalWeekExpense: number;
  categoryBreakdown: CategorySpendingSummary[];
  topCategory: CategorySpendingSummary | null;
  highestSpendingDay: { date: string; amount: number } | null;
  totalTransactionsCount: number;
}

export interface UserFinancialContextData {
  activeTab: string;
  activeTabName: string;
  events: MonettEvent[];
  savings: ISavingsGoal[];
  debts: DebtItem[];
  recurring: RecurringItem[];
  notes: PersonalNote[];
  budget: ReturnType<typeof getCachedBudget>;
  todayRecords: DayExpenseRecord | null;
  incomes: IncomeRecord[];
  analytics: FinancialAnalyticsSummary;
}

export const TAB_NAME_MAP: Record<string, string> = {
  home: 'Tổng quan (Trang chủ & Ngân sách)',
  events: 'Sự kiện (Quản lý chuyến đi, tiệc tùng, chi tiêu nhóm)',
  budget: 'Tích lũy & Heo đất (Mục tiêu tiết kiệm, quỹ dự phòng)',
  savings: 'Tích lũy & Heo đất (Mục tiêu tiết kiệm, quỹ dự phòng)',
  recurring: 'Định kỳ (Khoản chi định kỳ & Khoản thu định kỳ cố định)',
  debt: 'Sổ ghi nợ (Quản lý tiền cho mượn và các khoản vay nợ)',
  debts: 'Sổ ghi nợ (Quản lý tiền cho mượn và các khoản vay nợ)',
  reminders: 'Nhắc nhở & Ghi chú (Sổ tay ghi chép cá nhân & Lịch hẹn)',
  analytics: 'Báo cáo tài chính (Thống kê & Phân tích thu chi)',
  transactions: 'Lịch sử giao dịch',
  feed: 'Bảng tin & Bạn bè (Cộng đồng khoảnh khắc chi tiêu)',
  friends: 'Danh sách bạn bè',
  messages: 'Tin nhắn trò chuyện',
  profile: 'Trang cá nhân & Cài đặt',
  income: 'Quản lý thu nhập',
};

const formatVND = (num: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(num || 0))) + ' đ';
};

/**
 * Tải trước và đồng bộ toàn bộ dữ liệu tài chính của người dùng từ Storage & Backend API
 * Đảm bảo người dùng đứng ở bất kỳ màn hình nào cũng có sẵn 100% dữ liệu để hỏi đáp ngay tức thì!
 */
export async function preloadAllFinancialData(userId?: string, userEmail?: string): Promise<void> {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const uId = (userId || '').trim();

  try {
    // 1. Tải trước các storage song song trên cả Native Mobile và Web
    await Promise.allSettled([
      preloadEventsFromAsyncStorage(normEmail, uId),
      preloadSavingsFromAsyncStorage(uId, normEmail),
      preloadDebtFromAsyncStorage(uId, normEmail),
      preloadRecurringFromAsyncStorage(uId, normEmail),
    ]);

    // 2. Đồng bộ các sự kiện từ Backend API vào cache & storage
    try {
      const apiEvents = await getEventsApi();
      if (Array.isArray(apiEvents) && apiEvents.length > 0) {
        const localEvents = loadEventsFromStorage(normEmail, uId);
        const merged = [...apiEvents];
        localEvents.forEach((loc) => {
          const locId = String(loc.id || (loc as any)._id || '');
          const locTempId = String((loc as any).tempId || '');
          const exists = merged.some((m) => {
            const mId = String(m.id || (m as any)._id || '');
            return (mId && mId === locId) || (locTempId && mId === locTempId);
          });
          if (!exists) {
            merged.push(loc);
          }
        });
        saveEventsToStorage(merged, normEmail, uId, false, true);
      }
    } catch (_) {}

    // 3. Đồng bộ hóa đơn định kỳ từ Backend API nếu có
    try {
      const apiBills = await getRecurringBillsApi();
      if (Array.isArray(apiBills) && apiBills.length > 0) {
        // API bills đã được lấy sẵn trong cache
      }
    } catch (_) {}
  } catch (err) {
    console.warn('preloadAllFinancialData notice:', err);
  }
}

/**
 * Tính toán số liệu thống kê & phân tích chi tiêu (Analytics) tự động từ dayRecords và ngân sách
 */
export function calculateFinancialAnalytics(
  dayRecordsMap?: Record<string, DayExpenseRecord> | null,
  budgetSpent?: number
): FinancialAnalyticsSummary {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  // Tuần này (Thứ 2 -> Chủ nhật)
  const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset, 0, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

  const catMap: Record<string, { amount: number; count: number }> = {};
  let totalMonthFromItems = 0;
  let totalWeekExpense = 0;
  let totalTxCount = 0;
  let highestDay: { date: string; amount: number } | null = null;

  if (dayRecordsMap && typeof dayRecordsMap === 'object') {
    Object.entries(dayRecordsMap).forEach(([k, rec]) => {
      if (!rec) return;

      let dObj: Date | null = null;
      let dateLabel = k;
      if (k.includes('-')) {
        const parts = k.split('-');
        if (parts.length === 3) {
          dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          dateLabel = `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}/${parts[0]}`;
        }
      } else if (k.includes('/')) {
        const parts = k.split('/');
        if (parts.length === 3) {
          dObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          dateLabel = k;
        }
      }

      if (!dObj || isNaN(dObj.getTime())) return;

      const isCurrentMonth = dObj.getFullYear() === curYear && dObj.getMonth() + 1 === curMonth;
      const isCurrentWeek = dObj >= monday && dObj <= sunday;

      let dayTotal = 0;

      if (Array.isArray(rec.items) && rec.items.length > 0) {
        rec.items.forEach((it: any) => {
          if (it.type === 'income' || it.isIncome) return;
          const amt = Math.abs(it.amount || 0);
          if (amt <= 0) return;

          dayTotal += amt;

          if (isCurrentMonth) {
            totalMonthFromItems += amt;
            totalTxCount += 1;
            const cName = it.category || 'Khác';
            if (!catMap[cName]) catMap[cName] = { amount: 0, count: 0 };
            catMap[cName].amount += amt;
            catMap[cName].count += 1;
          }

          if (isCurrentWeek) {
            totalWeekExpense += amt;
          }
        });
      } else if (rec.amount && rec.amount > 0 && !rec.photoUri?.includes('unsplash.com')) {
        const amt = Math.abs(rec.amount);
        dayTotal += amt;

        if (isCurrentMonth) {
          totalMonthFromItems += amt;
          totalTxCount += 1;
          const cName = rec.category || 'Khác';
          if (!catMap[cName]) catMap[cName] = { amount: 0, count: 0 };
          catMap[cName].amount += amt;
          catMap[cName].count += 1;
        }

        if (isCurrentWeek) {
          totalWeekExpense += amt;
        }
      }

      if (isCurrentMonth && dayTotal > 0) {
        if (!highestDay || dayTotal > highestDay.amount) {
          highestDay = { date: dateLabel, amount: dayTotal };
        }
      }
    });
  }

  const finalTotalMonth = budgetSpent && budgetSpent > 0 ? budgetSpent : totalMonthFromItems;

  const categoryBreakdown: CategorySpendingSummary[] = Object.entries(catMap)
    .map(([cat, data]) => ({
      category: cat,
      amount: data.amount,
      count: data.count,
      percent: finalTotalMonth > 0 ? Math.round((data.amount / finalTotalMonth) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

  return {
    month: curMonth,
    year: curYear,
    totalMonthExpense: finalTotalMonth,
    totalWeekExpense,
    categoryBreakdown,
    topCategory,
    highestSpendingDay: highestDay,
    totalTransactionsCount: totalTxCount,
  };
}

/**
 * Thu thập toàn bộ dữ liệu tài chính thực tế của người dùng từ các storage module
 */
export function collectUserFinancialContext(
  userId?: string,
  userEmail?: string,
  activeTab: string = 'home'
): UserFinancialContextData {
  const normTab = (activeTab || 'home').toLowerCase();
  const activeTabName = TAB_NAME_MAP[normTab] || normTab;

  let events: MonettEvent[] = [];
  let savings: ISavingsGoal[] = [];
  let debts: DebtItem[] = [];
  let recurring: RecurringItem[] = [];
  let notes: PersonalNote[] = [];
  let budget = null;
  let todayRecords: DayExpenseRecord | null = null;
  let incomes: IncomeRecord[] = [];
  let dayRecordsMap: Record<string, DayExpenseRecord> | null = null;

  try {
    events = loadEventsFromStorage(userEmail, userId);
  } catch (e) {
    console.warn('Lỗi đọc sự kiện cho AI context:', e);
  }

  try {
    savings = loadSavingsGoals(userId, userEmail);
  } catch (e) {
    console.warn('Lỗi đọc mục tiêu tích lũy cho AI context:', e);
  }

  try {
    debts = loadDebtItems(userId, userEmail);
  } catch (e) {
    console.warn('Lỗi đọc sổ nợ cho AI context:', e);
  }

  try {
    recurring = loadRecurringItems(userId, userEmail);
  } catch (e) {
    console.warn('Lỗi đọc định kỳ cho AI context:', e);
  }

  try {
    notes = loadNotesFromStorage(userId);
  } catch (e) {
    console.warn('Lỗi đọc ghi chú cho AI context:', e);
  }

  try {
    budget = getCachedBudget(userId);
  } catch (e) {
    console.warn('Lỗi đọc ngân sách cho AI context:', e);
  }

  try {
    dayRecordsMap = getInitialDayRecordsFromLocalStorage(userId);
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayKey = `${dd}/${mm}/${yyyy}`;
    todayRecords = dayRecordsMap ? dayRecordsMap[todayKey] || null : null;
  } catch (e) {
    console.warn('Lỗi đọc chi tiêu hôm nay cho AI context:', e);
  }

  try {
    incomes = getIncomeRecords(userId);
  } catch (e) {
    console.warn('Lỗi đọc thu nhập cho AI context:', e);
  }

  const analytics = calculateFinancialAnalytics(dayRecordsMap, budget?.spent);

  return {
    activeTab: normTab,
    activeTabName,
    events,
    savings,
    debts,
    recurring,
    notes,
    budget,
    todayRecords,
    incomes,
    analytics,
  };
}

/**
 * Tạo bản tóm tắt văn bản chi tiết, có cấu trúc để cung cấp trực tiếp vào prompt của Gemini AI
 */
export function buildAiPromptContext(ctx: UserFinancialContextData): string {
  const parts: string[] = [];

  parts.push(
    `📍 MÀN HÌNH ĐANG XEM: "${ctx.activeTabName}" (Mã tab: ${ctx.activeTab})\n` +
    `📌 NGUYÊN TẮC HỎI ĐÁP TOÀN DIỆN (CROSS-TAB): Người dùng có thể đứng ở bất kỳ màn hình nào (kể cả Trang chủ, Báo cáo, Cá nhân,...) và hỏi về bất kỳ dữ liệu nào của ứng dụng (Sự kiện, Tích lũy heo đất, Sổ ghi nợ, Khoản định kỳ, Ghi chú & Nhắc nhở, Báo cáo & Thống kê chi tiêu, Chi tiêu hôm nay, Ngân sách tháng). Bạn PHẢI tra cứu toàn bộ dữ liệu thực tế bên dưới để trả lời chi tiết và chính xác số liệu cho người dùng, KHÔNG yêu cầu họ phải tự mở trang đó để xem!`
  );

  // 1. SỰ KIỆN
  if (ctx.events && ctx.events.length > 0) {
    const evtLines = ctx.events.map((evt, idx) => {
      const dates = evt.endDate ? `${evt.startDate} đến ${evt.endDate}` : evt.startDate;
      const statusVi =
        evt.status === 'ongoing' ? 'Đang diễn ra' : evt.status === 'completed' ? 'Đã hoàn thành' : 'Sắp diễn ra';
      const rem = (evt.estimatedBudget || 0) - (evt.spentAmount || 0);
      const memberCount = evt.members ? evt.members.length : 1;

      let expDetails = '';
      if (evt.expenses && evt.expenses.length > 0) {
        const topExp = evt.expenses.slice(0, 5).map(
          (ex) => `    + [${ex.date}] ${ex.title}: ${formatVND(ex.amount)} (${ex.type === 'income' ? 'Khoản thu' : 'Khoản chi'}${ex.payer ? ` - Người chi: ${ex.payer}` : ''})`
        );
        expDetails = `\n    Các khoản chi tiêu trong sự kiện:\n${topExp.join('\n')}`;
      }

      return `  ${idx + 1}. Tên sự kiện: "${evt.title}"
    - Trạng thái: ${statusVi} | Thời gian: ${dates} | Địa điểm: ${evt.location || 'Chưa cập nhật'}
    - Ngân sách dự kiến: ${formatVND(evt.estimatedBudget || 0)}
    - Tổng đã chi: ${formatVND(evt.spentAmount || 0)} | Tổng đã thu: ${formatVND(evt.incomeAmount || 0)}
    - Ngân sách còn lại: ${formatVND(rem)}
    - Số thành viên tham gia: ${memberCount} người${expDetails}`;
    });

    parts.push(`📅 DANH SÁCH SỰ KIỆN TÀI CHÍNH (${ctx.events.length} sự kiện):\n${evtLines.join('\n\n')}`);
  } else {
    parts.push(`📅 SỰ KIỆN: Hiện tại người dùng chưa tạo sự kiện nào.`);
  }

  // 2. TÍCH LŨY (SAVINGS / HEO ĐẤT)
  if (ctx.savings && ctx.savings.length > 0) {
    const totalTarget = ctx.savings.reduce((s, g) => s + (g.targetAmount || 0), 0);
    const totalCurrent = ctx.savings.reduce((s, g) => s + (g.currentAmount || 0), 0);
    const overallPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

    const goalLines = ctx.savings.map((g, idx) => {
      const pct = g.targetAmount > 0 ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100) : 0;
      const rem = Math.max(0, (g.targetAmount || 0) - (g.currentAmount || 0));
      return `  ${idx + 1}. Mục tiêu: "${g.title}"
    - Đã tích lũy: ${formatVND(g.currentAmount || 0)} / ${formatVND(g.targetAmount)} (${pct}%)
    - Còn thiếu: ${formatVND(rem)} | Hạn hoàn thành: ${g.deadline || 'Chưa đặt hạn'}
    - Ghi chú: ${g.note || 'Không có'}`;
    });

    parts.push(
      `👛 TÍCH LŨY & HEO ĐẤT (${ctx.savings.length} mục tiêu, Đã đạt: ${formatVND(totalCurrent)} / ${formatVND(totalTarget)} - ${overallPct}%):\n${goalLines.join('\n')}`
    );
  } else {
    parts.push(`👛 TÍCH LŨY & HEO ĐẤT: Hiện chưa có mục tiêu tích lũy nào.`);
  }

  // 3. ĐỊNH KỲ (RECURRING)
  if (ctx.recurring && ctx.recurring.length > 0) {
    const expenses = ctx.recurring.filter((i) => i.type === 'expense');
    const incomes = ctx.recurring.filter((i) => i.type === 'income');

    const totalMonthlyExp = expenses
      .filter((i) => i.isActive)
      .reduce((s, i) => s + calculateMonthlyEquivalent(i.amount, i.frequency), 0);

    const totalMonthlyInc = incomes
      .filter((i) => i.isActive)
      .reduce((s, i) => s + calculateMonthlyEquivalent(i.amount, i.frequency), 0);

    const expLines = expenses.map(
      (i) => `  - [Chi] ${i.title}: ${formatVND(i.amount)} / ${i.frequency} (Ngày thanh toán: ${i.dayOfPayment}, ${i.isActive ? 'Đang bật' : 'Tạm tắt'})`
    );

    const incLines = incomes.map(
      (i) => `  + [Thu] ${i.title}: ${formatVND(i.amount)} / ${i.frequency} (Ngày nhận: ${i.dayOfPayment}, ${i.isActive ? 'Đang bật' : 'Tạm tắt'})`
    );

    parts.push(`🔁 KHOẢN ĐỊNH KỲ CỐ ĐỊNH:
  * Tổng chi định kỳ ước tính mỗi tháng: ${formatVND(totalMonthlyExp)} (${expenses.length} khoản chi)
${expLines.join('\n') || '  (Không có khoản chi)'}
  * Tổng thu định kỳ ước tính mỗi tháng: ${formatVND(totalMonthlyInc)} (${incomes.length} khoản thu)
${incLines.join('\n') || '  (Không có khoản thu)'}`);
  } else {
    parts.push(`🔁 KHOẢN ĐỊNH KỲ: Hiện chưa có hóa đơn định kỳ nào.`);
  }

  // 4. SỔ GHI NỢ (DEBTS)
  if (ctx.debts && ctx.debts.length > 0) {
    const lentList = ctx.debts.filter((d) => d.type === 'lent' && !d.isSettled);
    const borrowList = ctx.debts.filter((d) => d.type === 'borrowed' && !d.isSettled);
    const settledList = ctx.debts.filter((d) => d.isSettled);

    const totalLentRem = lentList.reduce((s, d) => s + (d.amount - (d.paidAmount || 0)), 0);
    const totalBorrowRem = borrowList.reduce((s, d) => s + (d.amount - (d.paidAmount || 0)), 0);

    const lentLines = lentList.map(
      (d) => `  - Cho "${d.personName}" mượn: Gốc ${formatVND(d.amount)}, Đã trả ${formatVND(d.paidAmount || 0)}, Còn nợ lại: ${formatVND(d.amount - (d.paidAmount || 0))}${d.dueDate ? `, Hạn trả: ${d.dueDate}` : ''}${d.note ? `, Ghi chú: ${d.note}` : ''}`
    );

    const borrowLines = borrowList.map(
      (d) => `  - Vay của "${d.personName}": Gốc ${formatVND(d.amount)}, Đã trả ${formatVND(d.paidAmount || 0)}, Còn nợ lại: ${formatVND(d.amount - (d.paidAmount || 0))}${d.dueDate ? `, Hạn trả: ${d.dueDate}` : ''}${d.note ? `, Ghi chú: ${d.note}` : ''}`
    );

    parts.push(`📖 SỔ GHI NỢ:
  * Đang cho người khác mượn: ${lentList.length} người chưa thanh toán hết (Tổng còn phải thu: ${formatVND(totalLentRem)})
${lentLines.join('\n') || '  (Không có ai nợ bạn)'}
  * Bạn đang vay nợ người khác: ${borrowList.length} khoản cần trả (Tổng còn phải trả: ${formatVND(totalBorrowRem)})
${borrowLines.join('\n') || '  (Bạn không nợ ai cả)'}
  * Đã thanh toán hoàn tất: ${settledList.length} khoản.`);
  } else {
    parts.push(`📖 SỔ GHI NỢ: Hiện không có khoản nợ nào trong sổ.`);
  }

  // 5. GHI CHÚ & NHẮC NHỞ (NOTES & REMINDERS)
  if (ctx.notes && ctx.notes.length > 0) {
    const noteLines = ctx.notes.slice(0, 10).map(
      (n, idx) => `  ${idx + 1}. [${n.isPinned ? 'Được ghim 📌' : 'Ghi chú'}] "${n.title}": ${n.content}`
    );
    parts.push(`⏰ SỔ TAY GHI CHÚ & NHẮC NHỞ (${ctx.notes.length} ghi chú/lịch hẹn):\n${noteLines.join('\n')}`);
  } else {
    parts.push(`⏰ SỔ TAY GHI CHÚ & NHẮC NHỞ: Hiện chưa có ghi chú hay lịch hẹn nào.`);
  }

  // 6. BÁO CÁO & THỐNG KÊ CHI TIÊU (ANALYTICS)
  if (ctx.analytics) {
    const a = ctx.analytics;
    const catLines = a.categoryBreakdown.slice(0, 8).map(
      (c) => `    + ${c.category}: ${formatVND(c.amount)} (${c.percent}%, ${c.count} giao dịch)`
    );

    parts.push(`📈 BÁO CÁO & THỐNG KÊ CHI TIÊU THÁNG ${a.month}/${a.year}:
  * Tổng chi tiêu tháng này: ${formatVND(a.totalMonthExpense)}
  * Tổng chi tiêu tuần này: ${formatVND(a.totalWeekExpense)}
  * Hạng mục chi nhiều nhất: ${a.topCategory ? `${a.topCategory.category} (${formatVND(a.topCategory.amount)} - ${a.topCategory.percent}%)` : 'Chưa có'}
  * Cơ cấu chi tiêu theo nhóm danh mục:
${catLines.join('\n') || '    (Chưa có khoản chi nào trong tháng)'}
  * Ngày chi tiêu nhiều nhất trong tháng: ${a.highestSpendingDay ? `${a.highestSpendingDay.date} (${formatVND(a.highestSpendingDay.amount)})` : 'Chưa có'}
  * Tổng số giao dịch chi tiêu trong tháng: ${a.totalTransactionsCount} giao dịch`);
  }

  // 7. TỔNG QUAN NGÂN SÁCH THÁNG & HÔM NAY
  if (ctx.budget) {
    parts.push(`📊 NGÂN SÁCH THÁNG ${ctx.budget.month}/${ctx.budget.year}:
  - Hạn mức chi tiêu: ${formatVND(ctx.budget.limit)}
  - Đã chi tiêu: ${formatVND(ctx.budget.spent)} (${ctx.budget.spentPercent}%)
  - Số dư còn lại: ${formatVND(ctx.budget.remaining)} (${ctx.budget.remainingPercent}%)
  - Trạng thái ngân sách: ${ctx.budget.status}
  - Ngày nhận lương: Ngày ${ctx.budget.payday} (còn ${ctx.budget.daysUntilPayday} ngày nữa)`);
  }

  if (ctx.todayRecords && ctx.todayRecords.items && ctx.todayRecords.items.length > 0) {
    const todayExp = ctx.todayRecords.items.map(
      (it) => `  + ${it.title || 'Chi tiêu'}: ${formatVND(it.amount)} (${it.category || 'Chung'})`
    );
    parts.push(`🧾 CHI TIÊU HÔM NAY (${formatVND(ctx.todayRecords.amount || 0)}):\n${todayExp.join('\n')}`);
  }

  return parts.join('\n\n');
}

/**
 * Bộ xử lý ngôn ngữ tự nhiên thông minh offline / client-side.
 * Hỗ trợ tra cứu dữ liệu chéo toàn diện (Cross-Tab):
 * Người dùng đứng ở bất kỳ màn hình nào cũng hỏi đáp được mọi dữ liệu của các trang khác!
 */
export function generateSmartLocalContextReply(
  query: string,
  ctx: UserFinancialContextData
): { reply: string; action?: { label: string; tabKey: string } } {
  const q = query.toLowerCase().trim();
  const currentTab = ctx.activeTab;

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 1: HỎI VỀ SỰ KIỆN (EVENTS)
  // Nhận diện từ khóa sự kiện HOẶC tên sự kiện / địa điểm cụ thể trong danh sách
  // -------------------------------------------------------------
  const hasEventKeyword =
    q.includes('sự kiện') ||
    q.includes('su kien') ||
    q.includes('event') ||
    q.includes('du lịch') ||
    q.includes('du lich') ||
    q.includes('đi chơi') ||
    q.includes('di choi') ||
    q.includes('chuyến đi') ||
    q.includes('chuyen di') ||
    q.includes('cắm trại') ||
    q.includes('cam trai') ||
    q.includes('tiệc') ||
    q.includes('tiec') ||
    q.includes('liên hoan') ||
    q.includes('đà nẵng') ||
    q.includes('da nang') ||
    q.includes('đà lạt') ||
    q.includes('da lat') ||
    q.includes('phú quốc') ||
    q.includes('phu quoc');

  const matchedEvent = ctx.events?.find((e) => {
    const titleLow = (e.title || '').toLowerCase();
    const locLow = (e.location || '').toLowerCase();
    if (q.includes(titleLow) || (locLow && q.includes(locLow))) return true;
    if (
      ((q.includes('đà nẵng') || q.includes('da nang')) && (titleLow.includes('đà nẵng') || locLow.includes('đà nẵng'))) ||
      ((q.includes('đà lạt') || q.includes('da lat')) && (titleLow.includes('đà lạt') || locLow.includes('đà lạt'))) ||
      ((q.includes('phú quốc') || q.includes('phu quoc')) && (titleLow.includes('phú quốc') || locLow.includes('phú quốc'))) ||
      ((q.includes('cắm trại') || q.includes('cam trai')) && titleLow.includes('cắm trại'))
    ) {
      return true;
    }
    const words = titleLow.split(/\s+/).filter((w) => w.length > 3);
    return words.length > 0 && words.some((w) => q.includes(w));
  });

  const isAskingEvents =
    hasEventKeyword ||
    !!matchedEvent ||
    (currentTab === 'events' &&
      (q.includes('ở đây') ||
        q.includes('trang này') ||
        q.includes('chi tiết') ||
        q.includes('danh sách') ||
        q.includes('có gì') ||
        q.includes('chi bao nhiêu') ||
        q.includes('thu bao nhiêu') ||
        q.includes('ngân sách') ||
        q.includes('tổng')));

  if (isAskingEvents) {
    if (!ctx.events || ctx.events.length === 0) {
      return {
        reply:
          'Bạn hiện chưa có sự kiện nào trong danh sách! 🐸📅\n\nHãy bấm nút **+ Tạo sự kiện mới** để lên kế hoạch cho chuyến du lịch, buổi tiệc liên hoan cùng bạn bè và theo dõi chi tiêu thật minh bạch nhé!',
        action: { label: '📅 Đến Trang Sự Kiện', tabKey: 'events' },
      };
    }

    // Nếu người dùng hỏi cụ thể một sự kiện theo tên
    if (matchedEvent) {
      const dates = matchedEvent.endDate ? `${matchedEvent.startDate} → ${matchedEvent.endDate}` : matchedEvent.startDate;
      const statusLabel =
        matchedEvent.status === 'ongoing'
          ? 'Đang diễn ra 🟢'
          : matchedEvent.status === 'completed'
          ? 'Đã kết thúc ✔️'
          : 'Sắp diễn ra ⏳';
      const rem = (matchedEvent.estimatedBudget || 0) - (matchedEvent.spentAmount || 0);

      let expTxt = '';
      if (matchedEvent.expenses && matchedEvent.expenses.length > 0) {
        const lines = matchedEvent.expenses.slice(0, 6).map(
          (ex) => `• ${ex.title}: **${formatVND(ex.amount)}** (${ex.date}${ex.payer ? ` - ${ex.payer}` : ''})`
        );
        expTxt = `\n\n📌 **Các khoản chi tiêu trong sự kiện:**\n${lines.join('\n')}`;
      }

      return {
        reply:
          `Chào bạn iu, Chú Ếch Monett 🐸💚 đã kiểm tra ngay sự kiện **"${matchedEvent.title}"** cho bạn rồi nè!\n\n` +
          `• **Trạng thái:** ${statusLabel}\n` +
          `• **Thời gian:** ${dates}\n` +
          `• **Địa điểm:** ${matchedEvent.location || 'Chưa cập nhật'}\n` +
          `• **Ngân sách dự kiến:** **${formatVND(matchedEvent.estimatedBudget || 0)}**\n` +
          `• **Tổng đã chi:** **${formatVND(matchedEvent.spentAmount || 0)}**\n` +
          `• **Tổng đã thu:** **${formatVND(matchedEvent.incomeAmount || 0)}**\n` +
          `• **Ngân sách còn lại:** **${formatVND(rem)}** (${rem >= 0 ? 'Trong hạn mức an toàn' : 'Đã vượt ngân sách!'})\n` +
          `• **Thành viên tham gia:** ${matchedEvent.members?.length || 1} người` +
          expTxt,
        action: { label: '📅 Xem Chi Tiết Sự Kiện', tabKey: 'events' },
      };
    }

    // Liệt kê toàn bộ danh sách sự kiện
    const isAskingCount = q.includes('bao nhiêu') || q.includes('mấy') || q.includes('số lượng') || q.includes('danh sách');
    const header = isAskingCount
      ? `Hiện tại bạn đang có **${ctx.events.length} sự kiện** trong hệ thống nè! 🐸📅✨`
      : `Danh sách sự kiện tài chính của bạn nè! 🐸📅✨`;

    const eventSummaries = ctx.events.map((e, idx) => {
      const statusLabel = e.status === 'ongoing' ? 'Đang diễn ra' : e.status === 'completed' ? 'Đã xong' : 'Sắp tới';
      return `${idx + 1}. **${e.title}** (${statusLabel})\n   • Ngân sách: **${formatVND(e.estimatedBudget || 0)}** | Đã chi: **${formatVND(e.spentAmount || 0)}** | Đã thu: **${formatVND(e.incomeAmount || 0)}**\n   • Thời gian: ${e.startDate}${e.endDate ? ` → ${e.endDate}` : ''}${e.location ? ` | Địa điểm: ${e.location}` : ''}`;
    });

    return {
      reply:
        `${header}\n\n` +
        eventSummaries.join('\n\n') +
        `\n\nBạn có thể hỏi mình chi tiết từng chuyến đi hoặc bấm nút bên dưới để vào trang xem trực tiếp nhé!`,
      action: { label: '📅 Đến Trang Sự Kiện', tabKey: 'events' },
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 2: HỎI VỀ TÍCH LŨY (SAVINGS / HEO ĐẤT)
  // Nhận diện từ khóa tích lũy, tiết kiệm, heo đất, mục tiêu hoặc tên mục tiêu cụ thể
  // -------------------------------------------------------------
  const hasSavingsKeyword =
    q.includes('tích lũy') ||
    q.includes('tich luy') ||
    q.includes('tiết kiệm') ||
    q.includes('tiet kiem') ||
    q.includes('heo đất') ||
    q.includes('heo dat') ||
    q.includes('mục tiêu') ||
    q.includes('muc tieu') ||
    q.includes('nuôi heo') ||
    q.includes('nuoi heo') ||
    q.includes('quỹ dự phòng') ||
    q.includes('quy du phong') ||
    q.includes('macbook') ||
    q.includes('mua xe') ||
    q.includes('mua nhà');

  const matchedGoal = ctx.savings?.find((g) => {
    const titleLow = (g.title || '').toLowerCase();
    if (q.includes(titleLow)) return true;
    const words = titleLow.split(/\s+/).filter((w) => w.length > 3);
    return words.length > 0 && words.some((w) => q.includes(w));
  });

  const isAskingSavings =
    hasSavingsKeyword ||
    !!matchedGoal ||
    ((currentTab === 'savings' || currentTab === 'budget') &&
      (q.includes('ở đây') ||
        q.includes('trang này') ||
        q.includes('chi tiết') ||
        q.includes('danh sách') ||
        q.includes('có gì') ||
        q.includes('tiến độ') ||
        q.includes('bao nhiêu')));

  if (isAskingSavings) {
    if (!ctx.savings || ctx.savings.length === 0) {
      return {
        reply:
          'Hiện tại bạn chưa có mục tiêu tích lũy nào! 🐸👛\n\nNuôi heo đất cùng Monett sẽ giúp bạn xây dựng quỹ khẩn cấp, mua điện thoại mới, du lịch hay mua xe dễ dàng hơn gấp 3 lần. Hãy vào trang Tích Lũy và tạo chú heo đất đầu tiên nhé!',
        action: { label: '👛 Đến Trang Tích Lũy', tabKey: 'budget' },
      };
    }

    // Nếu hỏi cụ thể 1 mục tiêu theo tên
    if (matchedGoal) {
      const pct = matchedGoal.targetAmount > 0 ? Math.round(((matchedGoal.currentAmount || 0) / matchedGoal.targetAmount) * 100) : 0;
      const rem = Math.max(0, (matchedGoal.targetAmount || 0) - (matchedGoal.currentAmount || 0));
      return {
        reply:
          `Tiến độ mục tiêu **"${matchedGoal.title}"** của bạn nè! 🐸👛✨\n\n` +
          `• **Đã tích lũy:** **${formatVND(matchedGoal.currentAmount || 0)}** / ${formatVND(matchedGoal.targetAmount)} (**${pct}%**)\n` +
          `• **Số tiền còn thiếu:** **${formatVND(rem)}**\n` +
          `• **Hạn hoàn thành:** ${matchedGoal.deadline || 'Chưa đặt hạn'}\n` +
          `• **Ghi chú:** ${matchedGoal.note || 'Không có'}\n\n` +
          (rem === 0 ? '🎉 Xin chúc mừng, bạn đã hoàn thành xuất sắc mục tiêu này!' : 'Cố lên bạn nhé, kiên trì tích góp mỗi ngày sẽ sớm về đích! 💚🪙'),
        action: { label: '👛 Đến Trang Tích Lũy', tabKey: 'budget' },
      };
    }

    const totalTarget = ctx.savings.reduce((s, g) => s + (g.targetAmount || 0), 0);
    const totalCurrent = ctx.savings.reduce((s, g) => s + (g.currentAmount || 0), 0);
    const overallPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

    const goalList = ctx.savings.map((g) => {
      const pct = g.targetAmount > 0 ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100) : 0;
      const rem = Math.max(0, (g.targetAmount || 0) - (g.currentAmount || 0));
      return `• **${g.title}:** Đã tích lũy **${formatVND(g.currentAmount || 0)}** / ${formatVND(g.targetAmount)} (**${pct}%**)${rem > 0 ? ` - Còn thiếu ${formatVND(rem)}` : ' - Đã đạt mục tiêu 🎉'}${g.deadline ? ` (Hạn: ${g.deadline})` : ''}`;
    });

    const isAskingCount =
      q.includes('bao nhiêu') ||
      q.includes('mấy') ||
      q.includes('số lượng') ||
      q.includes('so luong') ||
      q.includes('danh sách') ||
      q.includes('hiện tại');

    const header = isAskingCount
      ? `Hiện tại bạn đang có **${ctx.savings.length} mục tiêu tích lũy** (chú heo đất) nè! 🐸👛✨`
      : `Tiến độ nuôi heo đất của bạn nè! 🐸👛✨`;

    return {
      reply:
        `${header}\n\n` +
        `• **Số mục tiêu đang nuôi:** ${ctx.savings.length} chú heo đất\n` +
        `• **Tổng tiền đã tích góp:** **${formatVND(totalCurrent)}** / ${formatVND(totalTarget)} (**${overallPct}%**)\n\n` +
        goalList.join('\n') +
        `\n\nBạn đang làm rất xuất sắc, tiếp tục nạp tiền kiên trì mỗi tuần để sớm về đích nha! 💚🪙`,
      action: { label: '👛 Đến Trang Tích Lũy', tabKey: 'budget' },
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 3: HỎI VỀ ĐỊNH KỲ (RECURRING - CHI & THU ĐỊNH KỲ)
  // Nhận diện từ khóa định kỳ, hóa đơn, tiền phòng, tiền điện, tiền nước...
  // -------------------------------------------------------------
  const hasRecurringKeyword =
    q.includes('định kỳ') ||
    q.includes('dinh ky') ||
    q.includes('hóa đơn') ||
    q.includes('hoa don') ||
    q.includes('tiền phòng') ||
    q.includes('tiền trọ') ||
    q.includes('tiền nhà') ||
    q.includes('tiền điện') ||
    q.includes('tiền nước') ||
    q.includes('tiền mạng') ||
    q.includes('internet') ||
    q.includes('thu định kỳ') ||
    q.includes('chi định kỳ') ||
    q.includes('khoản định kỳ') ||
    q.includes('hàng tháng') ||
    q.includes('hang thang');

  const matchedRecurring = ctx.recurring?.find((r) => {
    const titleLow = (r.title || '').toLowerCase();
    return (
      q.includes(titleLow) ||
      (titleLow.includes('phòng') && q.includes('phòng')) ||
      (titleLow.includes('điện') && q.includes('điện')) ||
      (titleLow.includes('nước') && q.includes('nước')) ||
      (titleLow.includes('mạng') && q.includes('mạng'))
    );
  });

  const isAskingRecurring =
    hasRecurringKeyword ||
    !!matchedRecurring ||
    (currentTab === 'recurring' &&
      (q.includes('ở đây') ||
        q.includes('trang này') ||
        q.includes('chi tiết') ||
        q.includes('danh sách') ||
        q.includes('có gì') ||
        q.includes('tổng') ||
        q.includes('bao nhiêu')));

  if (isAskingRecurring) {
    if (!ctx.recurring || ctx.recurring.length === 0) {
      return {
        reply:
          'Bạn hiện chưa có khoản định kỳ nào được lưu! 🐸🔁\n\nTab **Định Kỳ** hỗ trợ quản lý cả hai mục:\n• **Chi định kỳ:** Tiền trọ, điện nước, internet, đăng ký netflix...\n• **Thu định kỳ:** Lương cứng, tiền cho thuê nhà, phụ cấp...\n\nBạn có thể vào tab Định Kỳ để bấm **+ Thêm** ngay nhé!',
        action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
      };
    }

    // Nếu hỏi cụ thể 1 hóa đơn
    if (matchedRecurring) {
      return {
        reply:
          `Thông tin khoản định kỳ **"${matchedRecurring.title}"** nè bạn ơi! 🐸🔁\n\n` +
          `• **Số tiền:** **${formatVND(matchedRecurring.amount)}** / ${matchedRecurring.frequency}\n` +
          `• **Phân loại:** ${matchedRecurring.type === 'expense' ? 'Khoản chi cố định 💸' : 'Khoản thu cố định 💰'}\n` +
          `• **Ngày thanh toán:** Ngày ${matchedRecurring.dayOfPayment} hàng tháng\n` +
          `• **Trạng thái:** ${matchedRecurring.isActive ? 'Đang bật nhắc nhở 🟢' : 'Đang tạm tắt ⚪'}`,
        action: { label: '🔁 Xem Trang Định Kỳ', tabKey: 'recurring' },
      };
    }

    const expenses = ctx.recurring.filter((i) => i.type === 'expense');
    const incomes = ctx.recurring.filter((i) => i.type === 'income');

    const totalMonthlyExp = expenses
      .filter((i) => i.isActive)
      .reduce((s, i) => s + calculateMonthlyEquivalent(i.amount, i.frequency), 0);

    const totalMonthlyInc = incomes
      .filter((i) => i.isActive)
      .reduce((s, i) => s + calculateMonthlyEquivalent(i.amount, i.frequency), 0);

    // Nếu hỏi riêng về thu định kỳ
    if (q.includes('thu') && !q.includes('chi')) {
      const incList = incomes.map(
        (i) => `• **${i.title}:** **${formatVND(i.amount)}** (${i.frequency}, nhận vào ngày ${i.dayOfPayment})`
      );
      return {
        reply:
          `Danh sách **Thu định kỳ** của bạn nè! 💰✨\n\n` +
          `• **Tổng ước tính thu mỗi tháng:** **${formatVND(totalMonthlyInc)}** (${incomes.length} khoản)\n\n` +
          (incList.join('\n') || 'Chưa có khoản thu định kỳ nào.') +
          `\n\nCác khoản này được lưu trữ bền vững và đồng bộ hoàn toàn với tài khoản của bạn nhé! 🐸💚`,
        action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
      };
    }

    // Nếu hỏi riêng về chi định kỳ
    if (q.includes('chi') && !q.includes('thu')) {
      const expList = expenses.map(
        (i) => `• **${i.title}:** **${formatVND(i.amount)}** (${i.frequency}, thanh toán ngày ${i.dayOfPayment})`
      );
      return {
        reply:
          `Danh sách **Chi định kỳ** cố định của bạn nè! 🔁💸\n\n` +
          `• **Tổng ước tính chi mỗi tháng:** **${formatVND(totalMonthlyExp)}** (${expenses.length} khoản)\n\n` +
          (expList.join('\n') || 'Chưa có khoản chi định kỳ nào.') +
          `\n\nHãy nhớ thanh toán đúng hạn để tránh bị phạt phí trễ nhé! 🐸💡`,
        action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
      };
    }

    // Tổng quan cả chi và thu
    const expSummary = expenses.slice(0, 4).map((i) => `  - ${i.title}: **${formatVND(i.amount)}** (${i.frequency})`);
    const incSummary = incomes.slice(0, 3).map((i) => `  - ${i.title}: **${formatVND(i.amount)}** (${i.frequency})`);

    return {
      reply:
        `Báo cáo các khoản **Định kỳ** của bạn nè! 🐸🔁\n\n` +
        `💸 **Chi định kỳ:** Có **${expenses.length} khoản** (Ước tính: **${formatVND(totalMonthlyExp)} / tháng**)\n` +
        (expSummary.join('\n') || '  (Chưa có khoản chi)') +
        `\n\n💰 **Thu định kỳ:** Có **${incomes.length} khoản** (Ước tính: **${formatVND(totalMonthlyInc)} / tháng**)\n` +
        (incSummary.join('\n') || '  (Chưa có khoản thu)') +
        `\n\nDòng tiền cố định ròng hàng tháng: **${formatVND(totalMonthlyInc - totalMonthlyExp)}**. Bạn có thể vào tab để quản lý chi tiết nhé!`,
      action: { label: '🔁 Đến Trang Định Kỳ', tabKey: 'recurring' },
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 4: HỎI VỀ SỔ GHI NỢ (DEBTS)
  // Nhận diện từ khóa nợ, mượn, vay, ai nợ, nợ ai hoặc tên người trong sổ
  // -------------------------------------------------------------
  const hasDebtKeyword =
    q.includes('nợ') ||
    q.includes('no') ||
    q.includes('mượn') ||
    q.includes('muon') ||
    q.includes('vay') ||
    q.includes('cho mượn') ||
    q.includes('cho muon') ||
    q.includes('cho vay') ||
    q.includes('ai nợ') ||
    q.includes('ai no') ||
    q.includes('nợ ai') ||
    q.includes('no ai') ||
    q.includes('đòi tiền') ||
    q.includes('doi tien') ||
    q.includes('sổ nợ') ||
    q.includes('so no') ||
    q.includes('tiền nợ');

  const cleanQ = q.replace(/["']/g, '');

  const matchedDebt = ctx.debts?.find((d) => {
    const nameLow = (d.personName || '').toLowerCase();
    if (!nameLow) return false;
    if (cleanQ.includes(nameLow)) return true;
    const parts = nameLow.split(/\s+/).filter((w) => w.length >= 2);
    return parts.length > 0 && parts.every((w) => cleanQ.includes(w));
  });

  const isAskingDebt =
    hasDebtKeyword ||
    !!matchedDebt ||
    ((currentTab === 'debt' || currentTab === 'debts') &&
      (q.includes('ở đây') ||
        q.includes('trang này') ||
        q.includes('chi tiết') ||
        q.includes('danh sách') ||
        q.includes('có gì') ||
        q.includes('tổng') ||
        q.includes('bao nhiêu')));

  if (isAskingDebt) {
    if (!ctx.debts || ctx.debts.length === 0) {
      return {
        reply:
          'Sổ ghi nợ của bạn hiện đang hoàn toàn trống! 🐸📖✨\n\nBạn không nợ ai và cũng không có ai nợ bạn cả. Đây là một trạng thái tài chính rất thanh thản và tự do đó!',
        action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
      };
    }

    // Nếu hỏi cụ thể một người (VD: Khánh Vy, Hoàng Nam, Minh Quân...)
    if (matchedDebt) {
      const isLent = matchedDebt.type === 'lent';
      const rem = matchedDebt.amount - (matchedDebt.paidAmount || 0);
      const actionRole = isLent ? 'bạn đang cho mượn' : 'bạn đang vay nợ';
      return {
        reply:
          `Chào bạn iu! Chú Ếch Monett 🐸💚 đã kiểm tra ngay khoản nợ của bạn với bạn **${matchedDebt.personName}** rồi nè:\n\n` +
          `Hiện tại ${actionRole} bạn **${matchedDebt.personName}** số tiền còn lại là **${formatVND(rem)}**!\n\n` +
          `📌 **Chi tiết cụ thể:**\n` +
          `• **Số tiền gốc:** **${formatVND(matchedDebt.amount)}**\n` +
          `• **Đã thanh toán:** **${formatVND(matchedDebt.paidAmount || 0)}**\n` +
          `• **Còn nợ lại:** **${formatVND(rem)}**\n` +
          `• **Hạn trả:** ${matchedDebt.dueDate || 'Chưa đặt hạn'}\n` +
          `• **Trạng thái:** ${matchedDebt.isSettled ? 'Đã hoàn tất thanh toán ✔️' : 'Chưa thanh toán xong ⏳'}` +
          (matchedDebt.note ? `\n• **Ghi chú:** ${matchedDebt.note}` : ''),
        action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
      };
    }

    // Nếu hỏi riêng về "vay nợ" (mình đang nợ ai, cần trả ai)
    const isAskingBorrowOnly =
      (q.includes('đang vay') || q.includes('tôi nợ') || q.includes('mình nợ') || q.includes('cần trả') || q.includes('phải trả')) &&
      !q.includes('cho mượn') &&
      !q.includes('ai nợ');
    if (isAskingBorrowOnly) {
      const borrowList = ctx.debts.filter((d) => d.type === 'borrowed' && !d.isSettled);
      const totalBorrowRem = borrowList.reduce((s, d) => s + (d.amount - (d.paidAmount || 0)), 0);
      const borrowDetails = borrowList.map(
        (d) => `• Vay của **${d.personName}**: Còn nợ **${formatVND(d.amount - (d.paidAmount || 0))}** (Gốc ${formatVND(d.amount)}${d.dueDate ? `, Hạn: ${d.dueDate}` : ''}${d.note ? `, Ghi chú: ${d.note}` : ''})`
      );
      return {
        reply:
          `Danh sách các khoản **bạn đang vay nợ người khác** nè! 🐸💰\n\n` +
          `• **Tổng số tiền cần trả:** **${formatVND(totalBorrowRem)}** (${borrowList.length} khoản)\n\n` +
          (borrowDetails.join('\n') || '• Bạn không vay nợ ai cả.'),
        action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
      };
    }

    // Nếu hỏi riêng về "cho mượn" (ai đang nợ tôi, cho ai mượn, cần thu)
    const isAskingLentOnly =
      (q.includes('cho mượn') || q.includes('cho vay') || q.includes('ai nợ') || q.includes('cần thu') || q.includes('đòi tiền')) &&
      !q.includes('đang vay') &&
      !q.includes('tôi nợ');
    if (isAskingLentOnly) {
      const lentList = ctx.debts.filter((d) => d.type === 'lent' && !d.isSettled);
      const totalLentRem = lentList.reduce((s, d) => s + (d.amount - (d.paidAmount || 0)), 0);
      const lentDetails = lentList.map(
        (d) => `• Cho **${d.personName}** mượn: Còn lại **${formatVND(d.amount - (d.paidAmount || 0))}** (Gốc ${formatVND(d.amount)}${d.dueDate ? `, Hạn: ${d.dueDate}` : ''}${d.note ? `, Ghi chú: ${d.note}` : ''})`
      );
      return {
        reply:
          `Danh sách các khoản **người khác đang nợ bạn** nè! 🐸💸\n\n` +
          `• **Tổng số tiền cần thu hồi:** **${formatVND(totalLentRem)}** (${lentList.length} người)\n\n` +
          (lentDetails.join('\n') || '• Không có ai nợ tiền bạn cả.'),
        action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
      };
    }

    const lentList = ctx.debts.filter((d) => d.type === 'lent' && !d.isSettled);
    const borrowList = ctx.debts.filter((d) => d.type === 'borrowed' && !d.isSettled);
    const totalLentRem = lentList.reduce((s, d) => s + (d.amount - (d.paidAmount || 0)), 0);
    const totalBorrowRem = borrowList.reduce((s, d) => s + (d.amount - (d.paidAmount || 0)), 0);

    const lentDetails = lentList.map(
      (d) => `• Cho **${d.personName}** mượn: Còn lại **${formatVND(d.amount - (d.paidAmount || 0))}** (Gốc ${formatVND(d.amount)}${d.dueDate ? `, Hạn: ${d.dueDate}` : ''})`
    );

    const borrowDetails = borrowList.map(
      (d) => `• Vay của **${d.personName}**: Còn nợ **${formatVND(d.amount - (d.paidAmount || 0))}** (Gốc ${formatVND(d.amount)}${d.dueDate ? `, Hạn: ${d.dueDate}` : ''})`
    );

    return {
      reply:
        `Chi tiết **Sổ Ghi Nợ** của bạn nè! 🐸📖\n\n` +
        `💸 **Tiền bạn cho mượn (${lentList.length} người chưa trả xong):**\n` +
        `• Tổng số tiền cần thu hồi: **${formatVND(totalLentRem)}**\n` +
        (lentDetails.join('\n') || '• Không có ai nợ tiền bạn cả.') +
        `\n\n💰 **Tiền bạn đang vay nợ (${borrowList.length} khoản cần trả):**\n` +
        `• Tổng số tiền bạn cần trả: **${formatVND(totalBorrowRem)}**\n` +
        (borrowDetails.join('\n') || '• Bạn không vay nợ ai.') +
        `\n\nBạn có thể bấm bên dưới để vào ghi nhận trả nợ hoặc thu hồi nhé! ✨`,
      action: { label: '📖 Đến Trang Sổ Ghi Nợ', tabKey: 'debts' },
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 5: HỎI VỀ NHẮC NHỞ & GHI CHÚ (REMINDERS / NOTES)
  // -------------------------------------------------------------
  const matchedNote = ctx.notes?.find((n) => {
    const tLow = (n.title || '').toLowerCase();
    const cLow = (n.content || '').toLowerCase();
    if (cleanQ.includes(tLow)) return true;
    const words = tLow.split(/\s+/).filter((w) => w.length > 2);
    if (words.some((w) => cleanQ.includes(w) && !['ghi', 'chú', 'nhắc', 'nhở', 'việc', 'cần', 'làm', 'danh', 'sách'].includes(w))) {
      return true;
    }
    if ((cleanQ.includes('siêu thị') || cleanQ.includes('sieu thi')) && (tLow.includes('siêu thị') || cLow.includes('siêu thị') || tLow.includes('mua') || cLow.includes('mua'))) return true;
    if ((cleanQ.includes('mua sắm') || cleanQ.includes('mua đồ')) && (tLow.includes('mua') || cLow.includes('mua'))) return true;
    if ((cleanQ.includes('khám răng') || cleanQ.includes('bác sĩ')) && (tLow.includes('răng') || cLow.includes('răng'))) return true;
    if ((cleanQ.includes('sinh nhật') || cleanQ.includes('quà')) && (tLow.includes('sinh nhật') || cLow.includes('sinh nhật') || tLow.includes('quà') || cLow.includes('quà'))) return true;
    return false;
  });

  const hasReminderKeyword =
    q.includes('ghi chú') ||
    q.includes('ghi chu') ||
    q.includes('nhắc nhở') ||
    q.includes('nhac nho') ||
    q.includes('lịch hẹn') ||
    q.includes('lich hen') ||
    q.includes('sổ tay') ||
    q.includes('so tay') ||
    q.includes('việc cần làm') ||
    q.includes('viec can lam') ||
    q.includes('todo') ||
    q.includes('to-do') ||
    q.includes('note') ||
    q.includes('reminder');

  const isAskingReminders =
    hasReminderKeyword ||
    !!matchedNote ||
    (currentTab === 'reminders' &&
      (q.includes('ở đây') ||
        q.includes('trang này') ||
        q.includes('chi tiết') ||
        q.includes('danh sách') ||
        q.includes('có gì') ||
        q.includes('mấy')));

  if (isAskingReminders) {
    if (!ctx.notes || ctx.notes.length === 0) {
      return {
        reply:
          'Bạn hiện chưa có ghi chú hay nhắc nhở nào trong sổ tay! 🐸📝\n\nBạn có thể vào tab **Nhắc Nhở & Ghi Chú** để ghi lại danh sách mua sắm, các việc cần làm hoặc đặt chuông báo hẹn giờ nhé!',
        action: { label: '⏰ Đến Trang Nhắc Nhở', tabKey: 'reminders' },
      };
    }

    // Nếu hỏi cụ thể một ghi chú / việc cần làm
    if (matchedNote) {
      return {
        reply:
          `Chào bạn iu! Chú Ếch Monett 🐸💚 đã kiểm tra ngay ghi chú/nhắc nhở **"${matchedNote.title}"** cho bạn rồi nè:\n\n` +
          `📌 **Nội dung:**\n${matchedNote.content}\n\n` +
          `• **Trạng thái:** ${matchedNote.isPinned ? 'Được ghim quan trọng 📌' : 'Ghi chú thường'}\n` +
          (matchedNote.createdAt ? `• **Thời gian tạo:** ${new Date(matchedNote.createdAt).toLocaleDateString('vi-VN')}\n` : '') +
          `\nBạn có thể bấm nút bên dưới để mở trang Nhắc Nhở và chỉnh sửa thêm nhé! ✨`,
        action: { label: '⏰ Đến Trang Nhắc Nhở', tabKey: 'reminders' },
      };
    }

    const noteItems = ctx.notes.map(
      (n, idx) => `• **${n.title}**${n.isPinned ? ' 📌 (Được ghim)' : ''}:\n  ${n.content.replace(/\n/g, '\n  ')}`
    );

    return {
      reply:
        `Bạn đang có **${ctx.notes.length} ghi chú/nhắc nhở** trong sổ tay nè! 🐸📝✨\n\n` +
        noteItems.join('\n\n') +
        `\n\nBạn có thể vào trang Nhắc Nhở để thêm việc mới hoặc đặt chuông hẹn giờ tiện lợi nha!`,
      action: { label: '⏰ Đến Trang Nhắc Nhở', tabKey: 'reminders' },
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 6: HỎI VỀ BÁO CÁO & THỐNG KÊ CHI TIÊU (ANALYTICS / REPORTS)
  // -------------------------------------------------------------
  const isAskingAnalytics =
    q.includes('báo cáo') ||
    q.includes('bao cao') ||
    q.includes('thống kê') ||
    q.includes('thong ke') ||
    q.includes('analytics') ||
    q.includes('biểu đồ') ||
    q.includes('bieu do') ||
    q.includes('cơ cấu') ||
    q.includes('co cau') ||
    q.includes('tỷ trọng') ||
    q.includes('ty trong') ||
    q.includes('hạng mục nào') ||
    q.includes('danh mục nào') ||
    q.includes('tiêu nhiều nhất') ||
    q.includes('chi nhiều nhất') ||
    q.includes('tốn tiền nhất') ||
    q.includes('chi tiêu tuần này') ||
    q.includes('chi tieu tuan nay') ||
    q.includes('chi tiêu thang này') ||
    q.includes('chi tiêu tháng này') ||
    ((q.includes('ăn uống') || q.includes('an uong') || q.includes('cà phê') || q.includes('cafe') || q.includes('mua sắm') || q.includes('mua sam') || q.includes('tiền xăng') || q.includes('xăng xe') || q.includes('đi lại')) &&
      (q.includes('bao nhiêu') || q.includes('hết bao nhiêu') || q.includes('tổng') || q.includes('mấy') || q.includes('thống kê') || q.includes('báo cáo'))) ||
    (currentTab === 'analytics' &&
      (q.includes('ở đây') ||
        q.includes('trang này') ||
        q.includes('chi tiết') ||
        q.includes('có gì') ||
        q.includes('tình hình') ||
        q.includes('thế nào')));

  if (isAskingAnalytics) {
    const a = ctx.analytics;
    const catBreakdown = a?.categoryBreakdown || [];

    // 6.1. Kiểm tra nếu người dùng hỏi về một danh mục chi tiêu cụ thể (Ăn uống, Cà phê, Mua sắm, Xăng xe...)
    const matchedCategory = catBreakdown.find((c) => {
      const cLow = c.category.toLowerCase();
      if (cleanQ.includes(cLow)) return true;
      if ((cleanQ.includes('ăn') || cleanQ.includes('ẩm thực') || cleanQ.includes('an uong')) && (cLow.includes('ăn') || cLow.includes('ẩm thực'))) return true;
      if ((cleanQ.includes('cà phê') || cleanQ.includes('cafe')) && (cLow.includes('cà phê') || cLow.includes('cafe'))) return true;
      if ((cleanQ.includes('mua sắm') || cleanQ.includes('mua sam') || cleanQ.includes('shopping')) && cLow.includes('mua')) return true;
      if ((cleanQ.includes('xăng') || cleanQ.includes('đi lại') || cleanQ.includes('di chuyển')) && (cLow.includes('xe') || cLow.includes('di chuyển') || cLow.includes('xăng'))) return true;
      if ((cleanQ.includes('phòng') || cleanQ.includes('tiền nhà') || cleanQ.includes('tiền trọ')) && (cLow.includes('nhà') || cLow.includes('phòng') || cLow.includes('trọ'))) return true;
      if (cleanQ.includes('giải trí') && cLow.includes('giải trí')) return true;
      return false;
    });

    if (matchedCategory) {
      const advice = matchedCategory.percent > 40
        ? '⚠️ Khoản này chiếm hơn 40% tổng chi tiêu tháng, bạn nhớ chú ý cân đối chi tiêu các ngày tới nhé!'
        : '✨ Mức chi tiêu cho danh mục này đang rất cân đối và hợp lý đó!';
      return {
        reply:
          `Chào bạn iu! Chú Ếch Monett 🐸💚 đã tra cứu thống kê chi tiêu danh mục **"${matchedCategory.category}"** cho bạn rồi nè:\n\n` +
          `• **Tổng số tiền đã chi:** **${formatVND(matchedCategory.amount)}**\n` +
          `• **Tỷ trọng:** Chiếm **${matchedCategory.percent}%** tổng chi tiêu tháng ${a.month}/${a.year}\n` +
          `• **Số lần giao dịch:** ${matchedCategory.count} lần\n\n` +
          advice,
        action: { label: '📊 Xem Biểu Đồ Báo Cáo', tabKey: 'analytics' },
      };
    }

    // 6.2. Nếu hỏi "tiêu nhiều nhất vào việc gì" / "danh mục nào nhiều nhất"
    if (q.includes('nhiều nhất') || q.includes('cao nhất') || q.includes('lon nhat') || q.includes('lớn nhất') || q.includes('tốn tiền nhất')) {
      if (a?.topCategory) {
        return {
          reply:
            `Trong tháng ${a.month}/${a.year}, danh mục bạn chi tiêu nhiều nhất là **"${a.topCategory.category}"**! 🐸💸\n\n` +
            `• **Tổng số tiền:** **${formatVND(a.topCategory.amount)}**\n` +
            `• **Tỷ trọng:** Chiếm **${a.topCategory.percent}%** toàn bộ chi tiêu tháng (${a.topCategory.count} giao dịch)\n` +
            (a.highestSpendingDay ? `• **Ngày chi tiêu đỉnh điểm:** Ngày ${a.highestSpendingDay.date} (${formatVND(a.highestSpendingDay.amount)})\n\n` : '\n') +
            `Bạn có thể bấm nút bên dưới để vào trang Báo Cáo xem biểu đồ phân tích chi tiết nhé!`,
          action: { label: '📊 Xem Biểu Đồ Báo Cáo', tabKey: 'analytics' },
        };
      }
    }

    // 6.3. Báo cáo chi tiêu tuần này
    if (q.includes('tuần') || q.includes('tuan')) {
      return {
        reply:
          `Báo cáo chi tiêu tuần này của bạn nè! 🐸📊✨\n\n` +
          `• **Tổng chi tiêu tuần này:** **${formatVND(a?.totalWeekExpense || 0)}**\n` +
          `• **Tổng chi tiêu cả tháng ${a.month}/${a.year}:** **${formatVND(a?.totalMonthExpense || 0)}**\n` +
          (a?.topCategory ? `• **Danh mục chi nhiều nhất:** **${a.topCategory.category}** (${formatVND(a.topCategory.amount)})\n\n` : '\n') +
          `Bạn có thể bấm vào nút bên dưới để xem chi tiết biểu đồ cột 7 ngày trong tuần nhé!`,
        action: { label: '📊 Xem Biểu Đồ Báo Cáo', tabKey: 'analytics' },
      };
    }

    // 6.4. Báo cáo tổng thể tháng & cơ cấu chi tiêu
    const catLines = catBreakdown.slice(0, 6).map(
      (c) => `• ${c.category}: **${formatVND(c.amount)}** (${c.percent}%, ${c.count} lần)`
    );

    return {
      reply:
        `Báo cáo & Phân tích chi tiêu tháng ${a.month}/${a.year} của bạn nè! 🐸📊✨\n\n` +
        `• **Tổng chi tiêu tháng này:** **${formatVND(a?.totalMonthExpense || 0)}**\n` +
        `• **Chi tiêu tuần này:** **${formatVND(a?.totalWeekExpense || 0)}**\n` +
        (a?.topCategory ? `• **Chi nhiều nhất vào:** **${a.topCategory.category}** (${formatVND(a.topCategory.amount)} - ${a.topCategory.percent}%)\n` : '') +
        (a?.highestSpendingDay ? `• **Ngày chi tiêu nhiều nhất:** Ngày ${a.highestSpendingDay.date} (${formatVND(a.highestSpendingDay.amount)})\n` : '') +
        `\n📌 **Cơ cấu chi tiêu theo nhóm danh mục:**\n` +
        (catLines.join('\n') || '• Bạn chưa phát sinh khoản chi tiêu nào trong tháng.') +
        `\n\nBạn có thể bấm nút bên dưới để xem biểu đồ cột & biểu đồ xu hướng trực quan trên trang Báo Cáo nhé!`,
      action: { label: '📊 Xem Biểu Đồ Báo Cáo', tabKey: 'analytics' },
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 7: HỎI VỀ NGÂN SÁCH / THU CHI HÔM NAY
  // -------------------------------------------------------------
  const isAskingBudget =
    q.includes('ngân sách') ||
    q.includes('ngan sach') ||
    q.includes('hôm nay') ||
    q.includes('hom nay') ||
    q.includes('tháng này') ||
    q.includes('thang nay') ||
    q.includes('số dư') ||
    q.includes('so du') ||
    q.includes('còn lại bao nhiêu') ||
    (currentTab === 'home' &&
      (q.includes('ở đây') || q.includes('trang này') || q.includes('tình hình') || q.includes('chi tiết')));

  if (isAskingBudget && (ctx.budget || ctx.todayRecords)) {
    let budgetText = '';
    if (ctx.budget) {
      budgetText =
        `📊 **Tình hình ngân sách tháng ${ctx.budget.month}/${ctx.budget.year}:**\n` +
        `• Hạn mức chi tiêu: **${formatVND(ctx.budget.limit)}**\n` +
        `• Đã chi tiêu: **${formatVND(ctx.budget.spent)}** (${ctx.budget.spentPercent}%)\n` +
        `• Số dư khả dụng còn lại: **${formatVND(ctx.budget.remaining)}** (${ctx.budget.remainingPercent}%)\n` +
        `• Ngày nhận lương dự kiến: Ngày ${ctx.budget.payday} (còn **${ctx.budget.daysUntilPayday} ngày** nữa)\n\n`;
    }

    let todayText = '';
    if (ctx.todayRecords && ctx.todayRecords.items && ctx.todayRecords.items.length > 0) {
      const topItems = ctx.todayRecords.items.map((i) => `  - ${i.title || 'Chi tiêu'}: **${formatVND(i.amount)}**`);
      todayText = `🧾 **Chi tiêu hôm nay (${formatVND(ctx.todayRecords.amount || 0)}):**\n${topItems.join('\n')}`;
    } else {
      todayText = `🧾 **Hôm nay:** Bạn chưa phát sinh khoản chi tiêu nào, thật tuyệt vời! 🌟`;
    }

    return {
      reply:
        `Báo cáo dòng tiền nhanh cho bạn nè! 🐸💰\n\n` +
        budgetText +
        todayText +
        `\n\nHãy giữ vững tốc độ chi tiêu hợp lý này để cán đích tháng an toàn nhé!`,
      action: { label: '⊞ Đến Trang Tổng Quan', tabKey: 'home' },
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 8: CÂU HỎI CHUNG VỀ "TRANG NÀY" MÀ KHÔNG RÕ CHỦ ĐỀ
  // -------------------------------------------------------------
  if (q.includes('trang này') || q.includes('ở đây') || q.includes('màn hình này')) {
    return {
      reply:
        `Bạn đang ở màn hình **"${ctx.activeTabName}"** nè! 🐸📍\n\n` +
        `Dù đang ở đây, bạn vẫn có thể hỏi mình mọi thông tin về Báo cáo chi tiêu, Nhắc nhở ghi chú, Tích lũy heo đất, Sự kiện, Sổ nợ, Khoản định kỳ hay Chi tiêu hôm nay nhé! ✨`,
    };
  }

  // Chào hỏi & Làm quen
  if (
    q === 'hello' ||
    q === 'hi' ||
    q.includes('chào') ||
    q.includes('chao') ||
    q.includes('alo') ||
    q.includes('ê ếch') ||
    q.includes('bạn ơi')
  ) {
    return {
      reply:
        `Oa chào bạn iu nha! 🐸💚 Mình là Ếch Monett – trợ lý tài chính thông minh của bạn đây! Bạn có thể hỏi mình bất kỳ dữ liệu nào về Báo cáo chi tiêu, Ghi chú & Nhắc nhở, Tích lũy heo đất, Sự kiện chuyến đi, Sổ ghi nợ, Hóa đơn định kỳ hay Ngân sách tháng nhé! ✨🪙`,
    };
  }

  // Mẹo 50/30/20 & Tiết kiệm khi người dùng chủ động hỏi mẹo
  if (
    q.includes('mẹo') ||
    q.includes('kinh nghiệm') ||
    q.includes('lời khuyên') ||
    q.includes('50/30/20') ||
    q.includes('cách tiết kiệm') ||
    q.includes('quản lý tài chính')
  ) {
    return {
      reply:
        'Bí kíp quản lý tài chính vàng từ Ếch Monett nè bạn ơi 🐸💡:\n\n' +
        '1️⃣ **Quy tắc 50/30/20:** 50% cho nhu cầu thiết yếu, 30% cho sở thích, và 20% cất ngay vào heo đất khi vừa nhận lương!\n' +
        '2️⃣ **Quy tắc 24h:** Trước khi mua đồ bốc đồng, hãy đợi 24 tiếng. Bạn sẽ tiết kiệm được 80% khoản tiền không đáng có!\n' +
        '3️⃣ **Tích lũy cùng Monett:** Tạo mục tiêu cụ thể sẽ giúp bạn có động lực tiết kiệm gấp 3 lần!',
      action: { label: '👛 Đến Trang Tích Lũy', tabKey: 'budget' },
    };
  }

  // Mặc định
  return {
    reply:
      `Ếch Monett đã lắng nghe câu hỏi của bạn nè! 🐸💚\n\n` +
      `Dù bạn đang ở bất kỳ màn hình nào, bạn đều có thể hỏi mình trực tiếp:\n` +
      `• **Báo cáo & Thống kê:** "Báo cáo chi tiêu tháng này", "Tôi tiêu nhiều nhất vào việc gì?", "Tiền ăn uống hết bao nhiêu?"\n` +
      `• **Nhắc nhở & Ghi chú:** "Tôi có những ghi chú gì?", "Nhắc nhở mua đồ siêu thị"\n` +
      `• **Sự kiện:** "Sự kiện đi du lịch ở Đà Nẵng đã chi tiêu bao nhiêu?", "Có bao nhiêu sự kiện?"\n` +
      `• **Tích lũy:** "Có bao nhiêu khoản tích lũy hiện tại?", "Tiến độ nuôi heo đất"\n` +
      `• **Định kỳ:** "Các khoản chi định kỳ tháng này", "Hóa đơn tiền phòng"\n` +
      `• **Sổ nợ:** "Ai đang nợ tiền tôi?", "Tôi đang vay bạn Khánh Vy bao nhiêu?"\n` +
      `• **Chi tiêu:** "Chi tiêu hôm nay là bao nhiêu?", "Ngân sách tháng này" ✨`,
  };
}
