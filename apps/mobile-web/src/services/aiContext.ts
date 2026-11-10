import { MonettEvent, loadEventsFromStorage } from './eventsStorage';
import { ISavingsGoal, loadSavingsGoals } from './savingsStorage';
import { DebtItem, loadDebtItems } from './debtStorage';
import { RecurringItem, loadRecurringItems, calculateMonthlyEquivalent } from './recurringStorage';
import { PersonalNote, loadNotesFromStorage } from './notesStorage';
import { getCachedBudget, getInitialDayRecordsFromLocalStorage, DayExpenseRecord } from './calendarStorage';
import { getIncomeRecords, IncomeRecord } from './incomeStorage';

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
    const dayRecordsMap = getInitialDayRecordsFromLocalStorage(userId);
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayKey = `${dd}/${mm}/${yyyy}`;
    todayRecords = dayRecordsMap[todayKey] || null;
  } catch (e) {
    console.warn('Lỗi đọc chi tiêu hôm nay cho AI context:', e);
  }

  try {
    incomes = getIncomeRecords(userId);
  } catch (e) {
    console.warn('Lỗi đọc thu nhập cho AI context:', e);
  }

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
  };
}

/**
 * Tạo bản tóm tắt văn bản chi tiết, có cấu trúc để cung cấp trực tiếp vào prompt của Gemini AI
 */
export function buildAiPromptContext(ctx: UserFinancialContextData): string {
  const parts: string[] = [];

  parts.push(`📍 MÀN HÌNH ĐANG XEM: "${ctx.activeTabName}" (Mã tab: ${ctx.activeTab})`);

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
    const noteLines = ctx.notes.slice(0, 6).map(
      (n, idx) => `  ${idx + 1}. [${n.isPinned ? 'Được ghim 📌' : 'Ghi chú'}] "${n.title}": ${n.content}`
    );
    parts.push(`⏰ SỔ TAY GHI CHÚ (${ctx.notes.length} ghi chú):\n${noteLines.join('\n')}`);
  }

  // 6. TỔNG QUAN NGÂN SÁCH THÁNG & HÔM NAY
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
 * Tự động phân tích câu hỏi dựa trên ngữ cảnh màn hình hiện tại và toàn bộ dữ liệu người dùng.
 */
export function generateSmartLocalContextReply(
  query: string,
  ctx: UserFinancialContextData
): { reply: string; action?: { label: string; tabKey: string } } {
  const q = query.toLowerCase().trim();
  const currentTab = ctx.activeTab;

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 1: HỎI VỀ SỰ KIỆN (EVENTS)
  // Kích hoạt khi có từ khóa sự kiện HOẶC đang đứng ở trang 'events' và hỏi về chi tiết / danh sách / ngân sách
  // -------------------------------------------------------------
  const isAskingEvents =
    q.includes('sự kiện') ||
    q.includes('su kien') ||
    q.includes('event') ||
    q.includes('du lịch') ||
    q.includes('du lich') ||
    q.includes('đi chơi') ||
    q.includes('di choi') ||
    q.includes('đà nẵng') ||
    q.includes('da nang') ||
    q.includes('đà lạt') ||
    q.includes('da lat') ||
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
    const matchedEvent = ctx.events.find(
      (e) => q.includes(e.title.toLowerCase()) || (e.location && q.includes(e.location.toLowerCase()))
    );

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
        const lines = matchedEvent.expenses.slice(0, 5).map(
          (ex) => `• ${ex.title}: **${formatVND(ex.amount)}** (${ex.date}${ex.payer ? ` - ${ex.payer}` : ''})`
        );
        expTxt = `\n\n📌 **Các khoản chi tiêu gần nhất trong sự kiện:**\n${lines.join('\n')}`;
      }

      return {
        reply:
          `Thông tin chi tiết sự kiện **"${matchedEvent.title}"** nè bạn ơi! 🐸✨\n\n` +
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
    const eventSummaries = ctx.events.map((e, idx) => {
      const statusLabel = e.status === 'ongoing' ? 'Đang diễn ra' : e.status === 'completed' ? 'Đã xong' : 'Sắp tới';
      return `${idx + 1}. **${e.title}** (${statusLabel})\n   • Ngân sách: **${formatVND(e.estimatedBudget || 0)}** | Đã chi: **${formatVND(e.spentAmount || 0)}** | Đã thu: **${formatVND(e.incomeAmount || 0)}**\n   • Thời gian: ${e.startDate}${e.endDate ? ` → ${e.endDate}` : ''}${e.location ? ` | Địa điểm: ${e.location}` : ''}`;
    });

    return {
      reply:
        `Hiện tại bạn đang có **${ctx.events.length} sự kiện** trong hệ thống nè! 🐸📅\n\n` +
        eventSummaries.join('\n\n') +
        `\n\nBạn có thể hỏi mình chi tiết từng sự kiện hoặc bấm nút bên dưới để vào trang xem trực tiếp nhé!`,
      action: { label: '📅 Đến Trang Sự Kiện', tabKey: 'events' },
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 2: HỎI VỀ ĐỊNH KỲ (RECURRING - CHI & THU ĐỊNH KỲ)
  // Kích hoạt khi có từ khóa định kỳ / hóa đơn HOẶC đang ở tab 'recurring'
  // -------------------------------------------------------------
  const isAskingRecurring =
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
  // TRƯỜNG HỢP 3: HỎI VỀ TÍCH LŨY (SAVINGS / HEO ĐẤT)
  // Kích hoạt khi có từ khóa tích lũy / heo đất / tiết kiệm HOẶC đang ở tab 'savings' / 'budget'
  // -------------------------------------------------------------
  const isAskingSavings =
    q.includes('tích lũy') ||
    q.includes('tich luy') ||
    q.includes('heo đất') ||
    q.includes('heo dat') ||
    q.includes('tiết kiệm') ||
    q.includes('tiet kiem') ||
    q.includes('mục tiêu') ||
    q.includes('muc tieu') ||
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
  // TRƯỜNG HỢP 4: HỎI VỀ SỔ GHI NỢ (DEBTS)
  // Kích hoạt khi có từ khóa nợ / mượn / vay HOẶC đang ở tab 'debt' / 'debts'
  // -------------------------------------------------------------
  const isAskingDebt =
    q.includes('nợ') ||
    q.includes('no') ||
    q.includes('mượn') ||
    q.includes('muon') ||
    q.includes('vay') ||
    q.includes('đòi tiền') ||
    q.includes('doi tien') ||
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
  // Kích hoạt khi có từ khóa ghi chú / nhắc nhở HOẶC đang ở tab 'reminders'
  // -------------------------------------------------------------
  const isAskingReminders =
    q.includes('ghi chú') ||
    q.includes('ghi chu') ||
    q.includes('nhắc nhở') ||
    q.includes('nhac nho') ||
    q.includes('lịch hẹn') ||
    q.includes('lich hen') ||
    q.includes('mua sắm') ||
    q.includes('mua sam') ||
    (currentTab === 'reminders' &&
      (q.includes('ở đây') ||
        q.includes('trang này') ||
        q.includes('chi tiết') ||
        q.includes('danh sách') ||
        q.includes('có gì')));

  if (isAskingReminders) {
    if (!ctx.notes || ctx.notes.length === 0) {
      return {
        reply:
          'Bạn hiện chưa có ghi chú hay danh sách nào trong sổ tay! 🐸📝\n\nBạn có thể vào tab **Nhắc Nhở & Ghi Chú** để ghi lại danh sách mua sắm, các khoản cần thanh toán hoặc đặt chuông báo hẹn giờ nhé!',
        action: { label: '⏰ Đến Trang Nhắc Nhở', tabKey: 'reminders' },
      };
    }

    const noteItems = ctx.notes.map(
      (n) => `• **${n.title}**${n.isPinned ? ' 📌' : ''}:\n  ${n.content.replace(/\n/g, ' ')}`
    );

    return {
      reply:
        `Bạn đang có **${ctx.notes.length} ghi chú** trong sổ tay nè! 🐸📝✨\n\n` +
        noteItems.join('\n\n') +
        `\n\nBạn có thể vào trang Nhắc Nhở để thêm việc mới hoặc đặt chuông hẹn giờ tiện lợi nha!`,
      action: { label: '⏰ Đến Trang Nhắc Nhở', tabKey: 'reminders' },
    };
  }

  // -------------------------------------------------------------
  // TRƯỜNG HỢP 6: HỎI VỀ NGÂN SÁCH / THU CHI HÔM NAY / THÁNG NÀY
  // Kích hoạt khi hỏi ngân sách, hôm nay chi bao nhiêu, dòng tiền
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
    q.includes('tiêu bao nhiêu') ||
    q.includes('chi bao nhiêu') ||
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
  // TRƯỜNG HỢP 7: CÂU HỎI CHUNG VỀ "TRANG NÀY" MÀ KHÔNG RÕ CHỦ ĐỀ
  // -------------------------------------------------------------
  if (q.includes('trang này') || q.includes('ở đây') || q.includes('màn hình này')) {
    return {
      reply:
        `Bạn đang ở màn hình **"${ctx.activeTabName}"** nè! 🐸📍\n\n` +
        `Tại trang này, bạn có thể hỏi mình mọi thông tin chi tiết về số liệu, ngân sách, danh sách các mục, hoặc nhờ mình giải thích cách dùng nhé! ✨`,
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
        `Oa chào bạn iu nha! 🐸💚 Mình là Ếch Monett – trợ lý tài chính thông minh của bạn đây! Hiện tại bạn đang xem **${ctx.activeTabName}**.\n\nBạn muốn kiểm tra dữ liệu gì trong trang này (sự kiện, định kỳ, sổ nợ, heo đất...) cứ bảo mình nhé! ✨`,
    };
  }

  // Mẹo 50/30/20 & Tiết kiệm
  if (q.includes('50/30/20') || q.includes('cách tiết kiệm') || q.includes('quản lý tài chính')) {
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
      `Bạn đang ở **${ctx.activeTabName}**. Bạn có thể hỏi mình:\n` +
      `• Chi tiết các sự kiện, chi phí chuyến đi bạn đang tham gia\n` +
      `• Các khoản chi định kỳ & thu định kỳ mỗi tháng\n` +
      `• Tiến độ các chú heo đất và số tiền còn thiếu\n` +
      `• Danh sách ai đang nợ tiền bạn hoặc bạn cần trả ai\n` +
      `• Tình hình chi tiêu hôm nay và ngân sách còn lại! ✨`,
  };
}
