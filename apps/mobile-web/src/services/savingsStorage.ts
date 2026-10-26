export interface SavingsDepositRecord {
  id: string;
  amount: number;
  note?: string;
  date: string; // 'dd/mm/yyyy'
  createdAt: string;
}

export interface ISavingsGoal {
  id: string;
  title: string;           // Tên mục tiêu tích lũy (VD: "Du văn lịch")
  targetAmount: number;    // Số tiền mục tiêu (VD: 2000000)
  currentAmount: number;   // Số tiền đã tích (VD: 0)
  deadline?: string;       // Ngày hoàn thành: 'dd/mm/yyyy' hoặc 'yyyy-mm-dd'
  note?: string;           // Ghi chú
  icon?: string;           // Icon name hoặc emoji
  color?: string;          // Màu chủ đạo
  createdAt: string;
  deposits?: SavingsDepositRecord[];
}

export const getFutureDateFormatted = (daysFromNow: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const TARGET_EMAIL = 'lenguyenanhmai113@gmail.com';

export const REAL_SAVINGS_GOALS_FOR_USER: ISavingsGoal[] = [
  {
    id: 'goal-mai-1',
    title: 'Quỹ dự phòng khẩn cấp 6 tháng',
    targetAmount: 30000000,
    currentAmount: 18500000,
    deadline: '31/12/2026',
    note: 'Tích lũy an toàn gửi tiết kiệm linh hoạt Techcombank sinh lời đều đặn',
    icon: 'shield-checkmark',
    color: '#059669',
    createdAt: '2026-07-15T08:00:00.000Z',
    deposits: [
      { id: 'dep-1', amount: 10000000, note: 'Khởi tạo quỹ dự phòng an toàn', date: '15/07/2026', createdAt: '2026-07-15T08:00:00.000Z' },
      { id: 'dep-2', amount: 5000000, note: 'Trích lương tháng 8', date: '15/08/2026', createdAt: '2026-08-15T08:00:00.000Z' },
      { id: 'dep-3', amount: 3500000, note: 'Thưởng dự án quý 3', date: '15/09/2026', createdAt: '2026-09-15T08:00:00.000Z' },
    ],
  },
  {
    id: 'goal-mai-2',
    title: 'Nâng cấp Macbook Air M3',
    targetAmount: 28000000,
    currentAmount: 16000000,
    deadline: '20/11/2026',
    note: 'Nâng cấp máy phục vụ công việc thiết kế và lập trình ứng dụng',
    icon: 'laptop',
    color: '#0284C7',
    createdAt: '2026-08-01T09:00:00.000Z',
    deposits: [
      { id: 'dep-4', amount: 9000000, note: 'Tiền tiết kiệm đợt 1', date: '01/08/2026', createdAt: '2026-08-01T09:00:00.000Z' },
      { id: 'dep-5', amount: 7000000, note: 'Trích lương tháng 9', date: '05/09/2026', createdAt: '2026-09-05T09:00:00.000Z' },
    ],
  },
  {
    id: 'goal-mai-3',
    title: 'Du lịch Nhật Bản ngắm hoa anh đào',
    targetAmount: 42000000,
    currentAmount: 15000000,
    deadline: '25/03/2027',
    note: 'Hành trình Tokyo - Kyoto - Osaka 7 ngày cùng bạn bè',
    icon: 'airplane',
    color: '#EC4899',
    createdAt: '2026-09-10T10:00:00.000Z',
    deposits: [
      { id: 'dep-6', amount: 15000000, note: 'Trích quỹ du lịch năm 2026', date: '10/09/2026', createdAt: '2026-09-10T10:00:00.000Z' },
    ],
  },
  {
    id: 'goal-mai-4',
    title: 'Quỹ học chứng chỉ IELTS & UI/UX',
    targetAmount: 12000000,
    currentAmount: 12000000,
    deadline: '10/10/2026',
    note: 'Đã hoàn thành 100% mục tiêu, chuẩn bị đăng ký khóa học',
    icon: 'school',
    color: '#8B5CF6',
    createdAt: '2026-06-01T08:00:00.000Z',
    deposits: [
      { id: 'dep-7', amount: 6000000, note: 'Tiết kiệm đợt 1', date: '01/06/2026', createdAt: '2026-06-01T08:00:00.000Z' },
      { id: 'dep-8', amount: 6000000, note: 'Hoàn tất tiết kiệm đợt 2', date: '01/07/2026', createdAt: '2026-07-01T08:00:00.000Z' },
    ],
  },
];

export const INITIAL_SAVINGS_GOALS: ISavingsGoal[] = [];

const STORAGE_PREFIX = '@monett_savings_goals_';

export const getSavingsStorageKey = (userId?: string, userEmail?: string): string => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  if (normEmail) return `${STORAGE_PREFIX}${normEmail}`;
  if (userId && userId.trim()) return `${STORAGE_PREFIX}${userId.trim()}`;
  return `${STORAGE_PREFIX}guest`;
};

export const loadSavingsGoals = (userId?: string, userEmail?: string): ISavingsGoal[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const normEmail = (userEmail || '').trim().toLowerCase();
    const key = getSavingsStorageKey(userId, userEmail);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      // Chỉ DUY NHẤT tài khoản lenguyenanhmai113@gmail.com được nạp dữ liệu thật này
      if (normEmail === TARGET_EMAIL) {
        saveSavingsGoals(REAL_SAVINGS_GOALS_FOR_USER, userId, userEmail);
        return REAL_SAVINGS_GOALS_FOR_USER;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((g) => g && g.id !== 'goal-sample-1');
      if (cleaned.length === 0 && normEmail === TARGET_EMAIL) {
        saveSavingsGoals(REAL_SAVINGS_GOALS_FOR_USER, userId, userEmail);
        return REAL_SAVINGS_GOALS_FOR_USER;
      }
      return cleaned;
    }
    return normEmail === TARGET_EMAIL ? REAL_SAVINGS_GOALS_FOR_USER : [];
  } catch {
    return [];
  }
};

export const saveSavingsGoals = (goals: ISavingsGoal[], userId?: string, userEmail?: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const key = getSavingsStorageKey(userId, userEmail);
    window.localStorage.setItem(key, JSON.stringify(goals));
  } catch {}
};

/**
 * Tính số ngày còn lại đến deadline:
 * Trả về { days, text, isPast, isToday }
 */
export const calculateGoalDaysRemaining = (
  deadline?: string
): { days: number; text: string; isPast: boolean; isToday: boolean } => {
  if (!deadline || !deadline.trim()) {
    return { days: 0, text: 'Không giới hạn', isPast: false, isToday: false };
  }

  let targetDate: Date | null = null;
  const clean = deadline.trim();

  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      targetDate = new Date(y, m, d);
    }
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      targetDate = new Date(y, m, d);
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    return { days: 0, text: 'Không giới hạn', isPast: false, isToday: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return { days: diffDays, text: `Còn ${diffDays} ngày`, isPast: false, isToday: false };
  } else if (diffDays === 0) {
    return { days: 0, text: 'Hôm nay', isPast: false, isToday: true };
  } else {
    return { days: diffDays, text: `Quá hạn ${Math.abs(diffDays)} ngày`, isPast: true, isToday: false };
  }
};
