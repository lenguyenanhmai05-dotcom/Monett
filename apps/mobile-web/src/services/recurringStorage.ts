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

const STORAGE_PREFIX = '@monett_recurring_items_';

export const loadRecurringItems = (userId?: string): RecurringItem[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const key = `${STORAGE_PREFIX}${userId || 'guest'}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveRecurringItems = (items: RecurringItem[], userId?: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const key = `${STORAGE_PREFIX}${userId || 'guest'}`;
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
