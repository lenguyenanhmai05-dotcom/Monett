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

export const INITIAL_SAVINGS_GOALS: ISavingsGoal[] = [
  {
    id: 'goal-sample-1',
    title: 'Du văn lịch',
    targetAmount: 2000000,
    currentAmount: 0,
    deadline: getFutureDateFormatted(6), // Còn đúng 6 ngày như trong ảnh mẫu
    note: 'Chuyến đi du lịch nghỉ dưỡng cùng bạn bè',
    icon: 'flag-outline',
    color: '#0284C7',
    createdAt: new Date().toISOString(),
    deposits: [],
  },
];

const STORAGE_PREFIX = '@monett_savings_goals_';

export const loadSavingsGoals = (userId?: string): ISavingsGoal[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INITIAL_SAVINGS_GOALS;
  }
  try {
    const key = `${STORAGE_PREFIX}${userId || 'guest'}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(INITIAL_SAVINGS_GOALS));
      return INITIAL_SAVINGS_GOALS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    window.localStorage.setItem(key, JSON.stringify(INITIAL_SAVINGS_GOALS));
    return INITIAL_SAVINGS_GOALS;
  } catch {
    return INITIAL_SAVINGS_GOALS;
  }
};

export const saveSavingsGoals = (goals: ISavingsGoal[], userId?: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const key = `${STORAGE_PREFIX}${userId || 'guest'}`;
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
