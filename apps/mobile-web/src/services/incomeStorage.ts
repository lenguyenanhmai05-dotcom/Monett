/**
 * incomeStorage.ts
 * Quản lý và lưu trữ các khoản thu nhập (Income Records) của Monett
 * Hỗ trợ lưu trữ bền vững qua localStorage & đồng bộ với backend / ngân sách tổng
 */

import { createTransactionApi, deleteTransactionApi, getTransactionsApi } from './api';
import {
  getCachedBudget,
  saveCachedBudget,
  notifyBudgetUpdated,
  CachedBudgetData,
  calculateMonthTotalExpenses,
} from './calendarStorage';

export type IncomeCategoryType =
  | 'Lương'
  | 'Thưởng/KPI'
  | 'Freelance/Ngoài giờ'
  | 'Đầu tư'
  | 'Kinh doanh/Bán hàng'
  | 'Được tặng/Lì xì'
  | 'Khoản thu khác';

export interface IncomeRecord {
  id: string;
  title: string;
  amount: number;
  category: IncomeCategoryType | string;
  date: string; // YYYY-MM-DD
  note?: string;
  createdAt: number;
}

export const INCOME_STORAGE_KEY = 'monett_income_records';
export const INCOME_UPDATED_EVENT = 'monett:income_records_updated';

// Danh sách thu nhập khởi tạo rỗng để người dùng tự thêm
const INITIAL_INCOME_RECORDS: IncomeRecord[] = [];

/**
 * Lấy danh sách các khoản thu nhập từ storage
 */
export function getIncomeRecords(): IncomeRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(INCOME_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Tự động loại bỏ khoản thu mẫu hardcode 'inc-sample-1' hoặc 'Lương hàng tháng' trước đó
      const cleaned = parsed.filter(
        (r) => r && r.id !== 'inc-sample-1' && r.title !== 'Lương hàng tháng'
      );
      if (cleaned.length !== parsed.length) {
        saveIncomeRecords(cleaned);
      }
      return cleaned;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Lưu danh sách các khoản thu nhập vào storage và bắn event thông báo
 */
export function saveIncomeRecords(records: IncomeRecord[]): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(records));
      window.dispatchEvent(new CustomEvent(INCOME_UPDATED_EVENT, { detail: records }));
    } catch (_) {}
  }
}

/**
 * Tính tổng thu nhập cho tháng và năm cụ thể
 */
export function getTotalIncomeForMonth(year: number, month: number): number {
  const records = getIncomeRecords();
  return records
    .filter((r) => {
      const parts = r.date.split('-');
      if (parts.length === 3) {
        return Number(parts[0]) === year && Number(parts[1]) === month;
      }
      return false;
    })
    .reduce((sum, r) => sum + (r.amount || 0), 0);
}

/**
 * Cập nhật ngân sách tổng (Budget.limit và Budget.remaining) khi có thay đổi khoản thu:
 * - Hạn mức (limit) = Tổng thu nhập trong tháng người dùng thêm vào
 * - Tiền chi (spent) = Tổng chi tiêu thực tế trong tháng
 * - Số dư khả dụng (remaining) = Tổng thu nhập - Tổng chi tiêu
 */
export function syncIncomeWithBudget(records?: IncomeRecord[]): CachedBudgetData | null {
  try {
    const list = records || getIncomeRecords();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const totalMonthIncome = list
      .filter((r) => {
        const parts = r.date.split('-');
        return Number(parts[0]) === curYear && Number(parts[1]) === curMonth;
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const realSpent = calculateMonthTotalExpenses(curYear, curMonth);
    const cached = getCachedBudget();

    const newLimit = totalMonthIncome;
    const newRemaining = totalMonthIncome > 0 ? (totalMonthIncome - realSpent) : (realSpent > 0 ? -realSpent : 0);
    const spentPercent = totalMonthIncome > 0 ? Number(((realSpent / totalMonthIncome) * 100).toFixed(1)) : (realSpent > 0 ? 100 : 0);
    const remainingPercent = totalMonthIncome > 0 ? Math.max(0, Number(((newRemaining / totalMonthIncome) * 100).toFixed(1))) : 0;

    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (totalMonthIncome === 0) {
      status = realSpent > 0 ? 'danger' : 'safe';
    } else if (newRemaining < 0 || spentPercent > 100) {
      status = 'danger';
    } else if (spentPercent >= 80) {
      status = 'warning';
    }

    const updated: CachedBudgetData = {
      ...(cached || {}),
      month: curMonth,
      year: curYear,
      limit: newLimit,
      spent: realSpent,
      remaining: newRemaining,
      spentPercent,
      remainingPercent,
      status,
      payday: cached?.payday || 5,
      daysUntilPayday: cached?.daysUntilPayday || 12,
      currency: cached?.currency || 'VND',
    };
    saveCachedBudget(updated);
    notifyBudgetUpdated(updated);
    return updated;
  } catch (_) {
    return null;
  }
}

/**
 * Thêm một khoản thu nhập mới
 */
export async function addIncomeRecord(
  data: Omit<IncomeRecord, 'id' | 'createdAt'>
): Promise<IncomeRecord> {
  const newRecord: IncomeRecord = {
    ...data,
    id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
  };

  const current = getIncomeRecords();
  const updated = [newRecord, ...current];
  saveIncomeRecords(updated);
  syncIncomeWithBudget(updated);

  // Thử đồng bộ lên backend
  try {
    await createTransactionApi({
      title: data.title,
      amount: Math.abs(data.amount),
      type: 'income',
      category: data.category,
      date: data.date,
      note: data.note,
    });
  } catch (_) {}

  return newRecord;
}

/**
 * Xóa một khoản thu nhập
 */
export async function deleteIncomeRecord(id: string): Promise<boolean> {
  const current = getIncomeRecords();
  const updated = current.filter((r) => r.id !== id);
  saveIncomeRecords(updated);
  syncIncomeWithBudget(updated);

  try {
    await deleteTransactionApi(id);
  } catch (_) {}

  return true;
}

/**
 * Đăng ký lắng nghe sự kiện cập nhật khoản thu nhập
 */
export function subscribeIncomeUpdates(callback: (records: IncomeRecord[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (e: any) => {
    callback(e.detail || getIncomeRecords());
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === INCOME_STORAGE_KEY) {
      callback(getIncomeRecords());
    }
  };

  window.addEventListener(INCOME_UPDATED_EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(INCOME_UPDATED_EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}
