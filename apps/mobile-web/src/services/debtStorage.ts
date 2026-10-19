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

const STORAGE_PREFIX = '@monett_debt_items_';

export const DEFAULT_INITIAL_DEBTS: DebtItem[] = [
  {
    id: 'debt_sample_lent_1',
    personName: 'Anh Tuấn (Đồng nghiệp)',
    amount: 5000000,
    paidAmount: 2000000,
    type: 'lent',
    startDate: '10/10/2026',
    dueDate: '30/11/2026',
    note: 'Mượn đóng tiền cọc phòng trọ',
    isSettled: false,
    createdAt: new Date().toISOString(),
    payments: [
      { id: 'pay_1', amount: 2000000, date: '15/10/2026', note: 'Chuyển khoản trả đợt 1' },
    ],
  },
  {
    id: 'debt_sample_lent_2',
    personName: 'Hoàng Minh',
    amount: 1500000,
    paidAmount: 1500000,
    type: 'lent',
    startDate: '01/09/2026',
    dueDate: '20/09/2026',
    note: 'Tiền vé xem hòa nhạc',
    isSettled: true,
    createdAt: new Date().toISOString(),
    payments: [
      { id: 'pay_2', amount: 1500000, date: '19/09/2026', note: 'Đã trả qua MoMo' },
    ],
  },
  {
    id: 'debt_sample_borrowed_1',
    personName: 'Chị Lan (Chị gái)',
    amount: 10000000,
    paidAmount: 4000000,
    type: 'borrowed',
    startDate: '05/10/2026',
    dueDate: '25/12/2026',
    note: 'Vay phụ tiền sắm laptop làm việc',
    isSettled: false,
    createdAt: new Date().toISOString(),
    payments: [
      { id: 'pay_3', amount: 4000000, date: '18/10/2026', note: 'Trích lương tháng 10 trả bớt' },
    ],
  },
];

export const loadDebtItems = (userId?: string): DebtItem[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_INITIAL_DEBTS;
  }
  try {
    const key = `${STORAGE_PREFIX}${userId || 'guest'}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return DEFAULT_INITIAL_DEBTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_INITIAL_DEBTS;
  } catch {
    return DEFAULT_INITIAL_DEBTS;
  }
};

export const saveDebtItems = (items: DebtItem[], userId?: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const key = `${STORAGE_PREFIX}${userId || 'guest'}`;
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
