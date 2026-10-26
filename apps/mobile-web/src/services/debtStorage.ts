export type DebtType = 'lent' | 'borrowed';

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface DebtItem {
  id: string;
  personName: string;
  amount: number;
  paidAmount: number;
  type: DebtType; // 'lent': Cho mượn (họ nợ mình) | 'borrowed': Đang vay (mình nợ họ)
  startDate: string; // dd/mm/yyyy
  dueDate?: string; // dd/mm/yyyy
  note?: string;
  isSettled: boolean;
  createdAt: string;
  payments?: DebtPayment[];
}

export const TARGET_EMAIL = 'lenguyenanhmai113@gmail.com';

export const REAL_DEBTS_FOR_USER: DebtItem[] = [
  // Cho mượn (Lent)
  {
    id: 'debt-mai-1',
    personName: 'Hoàng Nam',
    amount: 4500000,
    paidAmount: 2500000,
    type: 'lent',
    startDate: '12/08/2026',
    dueDate: '30/10/2026',
    note: 'Cho Nam mượn tiền đóng tiền nhà trọ, Nam đã chuyển khoản trả trước 2tr5',
    isSettled: false,
    createdAt: '2026-08-12T09:00:00.000Z',
    payments: [
      { id: 'pay-1', amount: 2500000, date: '25/08/2026', note: 'Chuyển khoản Vietcombank' },
    ],
  },
  {
    id: 'debt-mai-2',
    personName: 'Linh Nhi',
    amount: 1800000,
    paidAmount: 1800000,
    type: 'lent',
    startDate: '05/08/2026',
    dueDate: '20/08/2026',
    note: 'Mua hộ vé concert ca nhạc cùng nhóm',
    isSettled: true,
    createdAt: '2026-08-05T10:00:00.000Z',
    payments: [
      { id: 'pay-2', amount: 1800000, date: '18/08/2026', note: 'Nhi đã chuyển khoản hoàn tất' },
    ],
  },
  {
    id: 'debt-mai-3',
    personName: 'Minh Quân',
    amount: 2200000,
    paidAmount: 0,
    type: 'lent',
    startDate: '10/09/2026',
    dueDate: '15/11/2026',
    note: 'Tạm ứng tiền đặt cọc tour du lịch sinh thái Cát Tiên',
    isSettled: false,
    createdAt: '2026-09-10T11:00:00.000Z',
    payments: [],
  },
  // Đang vay (Borrowed)
  {
    id: 'debt-mai-4',
    personName: 'Bảo Trâm',
    amount: 1500000,
    paidAmount: 1500000,
    type: 'borrowed',
    startDate: '02/09/2026',
    dueDate: '10/09/2026',
    note: 'Trâm order hộ mỹ phẩm hàng xách tay Nhật Bản',
    isSettled: true,
    createdAt: '2026-09-02T14:00:00.000Z',
    payments: [
      { id: 'pay-3', amount: 1500000, date: '08/09/2026', note: 'Đã chuyển khoản trả đủ qua Techcombank' },
    ],
  },
  {
    id: 'debt-mai-5',
    personName: 'Khánh Vy',
    amount: 950000,
    paidAmount: 500000,
    type: 'borrowed',
    startDate: '18/09/2026',
    dueDate: '05/11/2026',
    note: 'Góp tiền mua quà sinh nhật cho bạn chung',
    isSettled: false,
    createdAt: '2026-09-18T16:00:00.000Z',
    payments: [
      { id: 'pay-4', amount: 500000, date: '25/09/2026', note: 'Đã trả trước 500k' },
    ],
  },
];

const STORAGE_PREFIX = '@monett_debt_items_';

export const DEFAULT_INITIAL_DEBTS: DebtItem[] = [];

export const getDebtStorageKey = (userId?: string, userEmail?: string): string => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  if (normEmail) return `${STORAGE_PREFIX}${normEmail}`;
  if (userId && userId.trim()) return `${STORAGE_PREFIX}${userId.trim()}`;
  return `${STORAGE_PREFIX}guest`;
};

export const loadDebtItems = (userId?: string, userEmail?: string): DebtItem[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const normEmail = (userEmail || '').trim().toLowerCase();
    const key = getDebtStorageKey(userId, userEmail);
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      if (normEmail === TARGET_EMAIL) {
        saveDebtItems(REAL_DEBTS_FOR_USER, userId, userEmail);
        return REAL_DEBTS_FOR_USER;
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((d) => d && !String(d.id).startsWith('debt_sample_'));
      if (cleaned.length === 0 && normEmail === TARGET_EMAIL) {
        saveDebtItems(REAL_DEBTS_FOR_USER, userId, userEmail);
        return REAL_DEBTS_FOR_USER;
      }
      return cleaned;
    }
    return normEmail === TARGET_EMAIL ? REAL_DEBTS_FOR_USER : [];
  } catch {
    return [];
  }
};

export const saveDebtItems = (items: DebtItem[], userId?: string, userEmail?: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const key = getDebtStorageKey(userId, userEmail);
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {}
};

/**
 * Tính số ngày còn lại đến hạn trả nợ
 */
export const calculateDebtDaysRemaining = (
  dueDate?: string
): { days: number; text: string; isPast: boolean; isToday: boolean } => {
  if (!dueDate || !dueDate.trim()) {
    return { days: 0, text: 'Không thời hạn', isPast: false, isToday: false };
  }

  let targetDate: Date | null = null;
  const clean = dueDate.trim();

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
    return { days: 0, text: 'Không thời hạn', isPast: false, isToday: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return { days: diffDays, text: `Còn ${diffDays} ngày`, isPast: false, isToday: false };
  } else if (diffDays === 0) {
    return { days: 0, text: 'Hôm nay tới hạn', isPast: false, isToday: true };
  } else {
    return { days: diffDays, text: `Quá hạn ${Math.abs(diffDays)} ngày`, isPast: true, isToday: false };
  }
};
