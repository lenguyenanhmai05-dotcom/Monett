export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringType = 'expense' | 'income';

export interface RecurringItem {
  id: string;
  title: string;
  amount: number;
  type: RecurringType;
  frequency: RecurringFrequency;
  dayOfPayment: number | string; // e.g. 1
  isActive: boolean;
  createdAt: string;
  note?: string;
}

export const TARGET_EMAIL = 'lenguyenanhmai113@gmail.com';

export const REAL_RECURRING_ITEMS_FOR_USER: RecurringItem[] = [
  // Chi định kỳ
  {
    id: 'rec-exp-1',
    title: 'Tiền thuê căn hộ mini',
    amount: 5500000,
    type: 'expense',
    frequency: 'monthly',
    dayOfPayment: 1,
    isActive: true,
    createdAt: '2026-07-01T08:00:00.000Z',
    note: 'Chuyển khoản tiền phòng đầu tháng',
  },
  {
    id: 'rec-exp-2',
    title: 'Gói tập Gym & Yoga Cali',
    amount: 850000,
    type: 'expense',
    frequency: 'monthly',
    dayOfPayment: 5,
    isActive: true,
    createdAt: '2026-07-05T08:00:00.000Z',
    note: 'Thẻ tập rèn luyện sức khỏe',
  },
  {
    id: 'rec-exp-3',
    title: 'Internet cáp quang Viettel',
    amount: 265000,
    type: 'expense',
    frequency: 'monthly',
    dayOfPayment: 10,
    isActive: true,
    createdAt: '2026-07-10T08:00:00.000Z',
    note: 'Cước mạng wifi gia đình',
  },
  {
    id: 'rec-exp-4',
    title: 'Gói gia đình Spotify & Netflix',
    amount: 180000,
    type: 'expense',
    frequency: 'monthly',
    dayOfPayment: 15,
    isActive: true,
    createdAt: '2026-07-15T08:00:00.000Z',
    note: 'Giải trí phim ảnh và âm nhạc',
  },
  {
    id: 'rec-exp-5',
    title: 'Tiền điện & nước sinh hoạt',
    amount: 950000,
    type: 'expense',
    frequency: 'monthly',
    dayOfPayment: 18,
    isActive: true,
    createdAt: '2026-07-18T08:00:00.000Z',
    note: 'Thanh toán qua ví điện tử',
  },
  {
    id: 'rec-exp-6',
    title: 'Bảo hiểm sức khỏe Liberty',
    amount: 4800000,
    type: 'expense',
    frequency: 'yearly',
    dayOfPayment: 20,
    isActive: true,
    createdAt: '2026-06-20T08:00:00.000Z',
    note: 'Gói bảo lãnh viện phí thường niên',
  },
  {
    id: 'rec-exp-7',
    title: 'iCloud 200GB lưu trữ ảnh',
    amount: 69000,
    type: 'expense',
    frequency: 'monthly',
    dayOfPayment: 25,
    isActive: true,
    createdAt: '2026-08-25T08:00:00.000Z',
    note: 'Backup dữ liệu điện thoại và laptop',
  },
  // Thu định kỳ
  {
    id: 'rec-inc-1',
    title: 'Lương chính thức Monett Co.',
    amount: 22000000,
    type: 'income',
    frequency: 'monthly',
    dayOfPayment: 5,
    isActive: true,
    createdAt: '2026-07-05T08:00:00.000Z',
    note: 'Nhận lương qua tài khoản Techcombank',
  },
  {
    id: 'rec-inc-2',
    title: 'Dự án Freelance Design & Dev',
    amount: 6500000,
    type: 'income',
    frequency: 'monthly',
    dayOfPayment: 20,
    isActive: true,
    createdAt: '2026-07-20T08:00:00.000Z',
    note: 'Thiết kế giao diện và tư vấn hệ thống',
  },
  {
    id: 'rec-inc-3',
    title: 'Lãi gửi tiết kiệm ngân hàng',
    amount: 450000,
    type: 'income',
    frequency: 'monthly',
    dayOfPayment: 28,
    isActive: true,
    createdAt: '2026-08-28T08:00:00.000Z',
    note: 'Lãi nhận hàng tháng',
  },
];

const STORAGE_PREFIX = '@monett_recurring_items_';

export const getRecurringStorageKey = (userId?: string, userEmail?: string): string => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  if (normEmail) return `${STORAGE_PREFIX}${normEmail}`;
  if (userId && userId.trim()) return `${STORAGE_PREFIX}${userId.trim()}`;
  return `${STORAGE_PREFIX}guest`;
};

export const loadRecurringItems = (userId?: string, userEmail?: string): RecurringItem[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const normEmail = (userEmail || '').trim().toLowerCase();
    const key = getRecurringStorageKey(userId, userEmail);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      if (normEmail === TARGET_EMAIL) {
        saveRecurringItems(REAL_RECURRING_ITEMS_FOR_USER, userId, userEmail);
        return REAL_RECURRING_ITEMS_FOR_USER;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0 && normEmail === TARGET_EMAIL) {
        saveRecurringItems(REAL_RECURRING_ITEMS_FOR_USER, userId, userEmail);
        return REAL_RECURRING_ITEMS_FOR_USER;
      }
      return parsed;
    }
    return normEmail === TARGET_EMAIL ? REAL_RECURRING_ITEMS_FOR_USER : [];
  } catch {
    return [];
  }
};

export const saveRecurringItems = (items: RecurringItem[], userId?: string, userEmail?: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const key = getRecurringStorageKey(userId, userEmail);
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {}
};

export const getFrequencyLabel = (freq: RecurringFrequency, isVi = true): string => {
  switch (freq) {
    case 'daily':
      return isVi ? 'Hàng ngày' : 'Daily';
    case 'weekly':
      return isVi ? 'Hàng tuần' : 'Weekly';
    case 'yearly':
      return isVi ? 'Hàng năm' : 'Yearly';
    case 'monthly':
    default:
      return isVi ? 'Hàng tháng' : 'Monthly';
  }
};

export const getFrequencyPeriodSuffix = (freq: RecurringFrequency, isVi = true): string => {
  switch (freq) {
    case 'daily':
      return isVi ? '/ ngày' : '/ day';
    case 'weekly':
      return isVi ? '/ tuần' : '/ week';
    case 'yearly':
      return isVi ? '/ năm' : '/ year';
    case 'monthly':
    default:
      return isVi ? '/ tháng' : '/ month';
  }
};

export const calculateMonthlyEquivalent = (amount: number, freq: RecurringFrequency): number => {
  switch (freq) {
    case 'daily':
      return amount * 30;
    case 'weekly':
      return amount * 4;
    case 'yearly':
      return Math.round(amount / 12);
    case 'monthly':
    default:
      return amount;
  }
};
