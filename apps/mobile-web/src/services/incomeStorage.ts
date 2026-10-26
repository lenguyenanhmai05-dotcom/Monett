/**
 * incomeStorage.ts
 * Quản lý và lưu trữ các khoản thu nhập (Income Records) của Monett
 * Hỗ trợ lưu trữ bền vững qua localStorage & đồng bộ với backend / ngân sách tổng
 */

import { createTransactionApi, deleteTransactionApi, getTransactionsApi, getStoredUserId } from './api';
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

export function getIncomeStorageKey(userId?: string): string {
  const uid = userId || getStoredUserId();
  return uid && uid !== 'guest' ? `monett_income_records_${uid}` : 'monett_income_records';
}

// Danh sách thu nhập khởi tạo rỗng để người dùng tự thêm
const INITIAL_INCOME_RECORDS: IncomeRecord[] = [];

/**
 * Lấy danh sách các khoản thu nhập từ storage theo từng tài khoản
 */
export function getIncomeRecords(userId?: string): IncomeRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const key = getIncomeStorageKey(userId);
    const raw = localStorage.getItem(key);
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
        saveIncomeRecords(cleaned, userId);
      }
      return cleaned;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Lưu danh sách các khoản thu nhập vào storage theo từng tài khoản và bắn event thông báo
 */
export function saveIncomeRecords(records: IncomeRecord[], userId?: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const key = getIncomeStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(records));
      window.dispatchEvent(new CustomEvent(INCOME_UPDATED_EVENT, { detail: records }));
    } catch (_) {}
  }
}

/**
 * Xóa sạch cache thu nhập của một tài khoản cụ thể
 */
export function clearUserIncomeStorage(userId?: string): void {
  const uid = userId || getStoredUserId();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(getIncomeStorageKey(uid));
    } catch (_) {}
  }
}

/**
 * Tính tổng thu nhập cho tháng và năm cụ thể
 */
export function getTotalIncomeForMonth(year: number, month: number, userId?: string): number {
  const records = getIncomeRecords(userId);
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

/**
 * Đồng bộ danh sách các khoản thu nhập từ các giao dịch trên MongoDB Backend
 */
export function syncIncomesFromBackendTransactions(
  txList: any[],
  userId?: string
): IncomeRecord[] {
  if (!Array.isArray(txList) || txList.length === 0) return getIncomeRecords(userId);

  const incomeTxs = txList.filter(
    (t) => t && (t.type === 'income' || (t.amount && Number(t.amount) > 0 && t.type !== 'expense'))
  );

  if (incomeTxs.length === 0) return getIncomeRecords(userId);

  const existing = getIncomeRecords(userId);
  const existingMap = new Map<string, IncomeRecord>();
  existing.forEach((r) => {
    if (r.id) existingMap.set(r.id, r);
  });

  incomeTxs.forEach((t) => {
    const id = String(t._id || t.id);
    const dateObj = t.date ? new Date(t.date) : (t.createdAt ? new Date(t.createdAt) : new Date());
    const dateStr = !isNaN(dateObj.getTime())
      ? dateObj.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const rec: IncomeRecord = {
      id,
      title: t.title || t.note || 'Thu nhập',
      amount: Math.abs(Number(t.amount) || 0),
      category: t.category || 'Lương',
      date: dateStr,
      note: t.note || '',
      createdAt: isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime(),
    };
    existingMap.set(id, rec);
  });

  const merged = Array.from(existingMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  saveIncomeRecords(merged, userId);
  syncIncomeWithBudget(merged);
  return merged;
}
