/**
 * incomeStorage.ts
 * Quản lý và lưu trữ các khoản thu nhập (Income Records) của Monett
 * Hỗ trợ lưu trữ bền vững qua in-memory cache, AsyncStorage (Mobile Native iOS/Android)
 * và localStorage (Web) & đồng bộ an toàn không gây render loop với React 19 Fabric.
 */

import { Platform } from 'react-native';
import { createTransactionApi, deleteTransactionApi, getTransactionsApi, getStoredUserId } from './api';
import {
  getCachedBudget,
  saveCachedBudget,
  notifyBudgetUpdated,
  CachedBudgetData,
  calculateMonthTotalExpenses,
  isIncomeTransactionOrItem,
  INCOME_CATEGORY_NAMES,
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

// 1. In-memory cache đồng bộ để đọc tức thì 0ms trên cả React Native Mobile & Web
const inMemoryCache: Record<string, IncomeRecord[]> = {};

// In-memory listeners cho cập nhật chéo giữa các widget và màn hình
const incomeListeners = new Set<(records: IncomeRecord[]) => void>();
let isNotifying = false;

// Helper an toàn lấy AsyncStorage trên React Native
const getAsyncStorage = () => {
  try {
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return null;
  }
};

export function getIncomeStorageKey(userId?: string): string {
  const uid = userId || getStoredUserId();
  return uid && uid !== 'guest' ? `monett_income_records_${uid}` : 'monett_income_records';
}

/**
 * Phát tín hiệu cập nhật danh sách thu nhập đến tất cả component đang lắng nghe.
 * Đẩy qua setTimeout(0) để KHÔNG bao giờ gọi setState đồng bộ trong chu trình render của React 19.
 */
export function notifyIncomeUpdated(records?: IncomeRecord[]): void {
  if (isNotifying) return;
  isNotifying = true;

  setTimeout(() => {
    try {
      const list = records || getIncomeRecords();
      incomeListeners.forEach((cb) => {
        try {
          cb(list);
        } catch (_) {}
      });

      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          if (typeof CustomEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent(INCOME_UPDATED_EVENT, { detail: list }));
          }
          window.dispatchEvent(new Event('storage'));
        } catch (_) {}
      }
    } finally {
      isNotifying = false;
    }
  }, 0);
}

/**
 * Tải trước dữ liệu thu nhập từ AsyncStorage vào in-memory cache khi khởi động app
 */
export async function preloadIncomeFromAsyncStorage(userId?: string): Promise<IncomeRecord[]> {
  const key = getIncomeStorageKey(userId);
  const storage = getAsyncStorage();
  if (!storage) return inMemoryCache[key] || [];

  try {
    const raw = await storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (r) => r && r.id !== 'inc-sample-1' && r.title !== 'Lương hàng tháng'
        );
        inMemoryCache[key] = cleaned;
        notifyIncomeUpdated(cleaned);
        return cleaned;
      }
    }
  } catch (_) {}

  return inMemoryCache[key] || [];
}

/**
 * Lấy danh sách các khoản thu nhập từ storage theo từng tài khoản (0ms đồng bộ, hoàn toàn pure)
 */
export function getIncomeRecords(userId?: string): IncomeRecord[] {
  const key = getIncomeStorageKey(userId);

  // 1. In-memory cache trước (nhanh nhất và không mất giữa các lần chuyển màn hình)
  if (inMemoryCache[key] && Array.isArray(inMemoryCache[key])) {
    return inMemoryCache[key];
  }

  // 2. Thử đọc từ window.localStorage nếu chạy trên Web / Mobile Web
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (r) => r && r.id !== 'inc-sample-1' && r.title !== 'Lương hàng tháng'
          );
          inMemoryCache[key] = cleaned;
          return cleaned;
        }
      }
    } catch (_) {}
  }

  if (!inMemoryCache[key]) {
    inMemoryCache[key] = [];
  }

  return inMemoryCache[key];
}

/**
 * Lưu danh sách các khoản thu nhập vào storage theo từng tài khoản và phát thông báo
 */
export function saveIncomeRecords(records: IncomeRecord[], userId?: string): void {
  const key = getIncomeStorageKey(userId);
  inMemoryCache[key] = records;

  // 1. Lưu vào Web localStorage nếu có
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, JSON.stringify(records));
    } catch (_) {}
  }

  // 2. Lưu bền vững vào AsyncStorage trên Native Mobile (iOS / Android)
  const storage = getAsyncStorage();
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(records)).catch(() => {});
    } catch (_) {}
  }

  // 3. Thông báo bất đồng bộ cho tất cả subscribers
  notifyIncomeUpdated(records);
}

/**
 * Xóa sạch cache thu nhập của một tài khoản cụ thể
 */
export function clearUserIncomeStorage(userId?: string): void {
  const uid = userId || getStoredUserId();
  const key = getIncomeStorageKey(uid);
  delete inMemoryCache[key];

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  const storage = getAsyncStorage();
  if (storage) {
    try {
      storage.removeItem(key).catch(() => {});
    } catch (_) {}
  }

  notifyIncomeUpdated([]);
}

/**
 * Tính tổng thu nhập cho tháng và năm cụ thể
 */
export function getTotalIncomeForMonth(year: number, month: number, userId?: string): number {
  const records = getIncomeRecords(userId);
  return records
    .filter((r) => {
      if (!r || !r.date) return false;
      const d = new Date(r.date);
      if (!isNaN(d.getTime())) {
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      }
      const parts = String(r.date).split('-');
      if (parts.length >= 2) {
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
        if (!r || !r.date) return false;
        const d = new Date(r.date);
        if (!isNaN(d.getTime())) {
          return d.getFullYear() === curYear && d.getMonth() + 1 === curMonth;
        }
        const parts = String(r.date).split('-');
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

  // Thử đồng bộ lên MongoDB backend
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
 * Đăng ký lắng nghe sự kiện cập nhật khoản thu nhập (hoạt động đồng thời trên cả React Native Mobile & Web)
 */
export function subscribeIncomeUpdates(callback: (records: IncomeRecord[]) => void): () => void {
  incomeListeners.add(callback);

  let handleCustom: ((e: any) => void) | null = null;
  let handleStorage: ((e: StorageEvent) => void) | null = null;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    handleCustom = (e: any) => {
      try {
        callback(e.detail || getIncomeRecords());
      } catch (_) {}
    };

    handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('monett_income_records')) {
        try {
          callback(getIncomeRecords());
        } catch (_) {}
      }
    };

    window.addEventListener(INCOME_UPDATED_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    incomeListeners.delete(callback);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      if (handleCustom) window.removeEventListener(INCOME_UPDATED_EVENT, handleCustom);
      if (handleStorage) window.removeEventListener('storage', handleStorage);
    }
  };
}

/**
 * Hàm thuần túy (pure function) trích xuất danh sách IncomeRecord từ các giao dịch.
 * Không gọi storage, không bắn event, hoàn toàn an toàn khi gọi trong useState initializer.
 */
export function extractIncomesFromTransactions(txList: any[]): IncomeRecord[] {
  if (!Array.isArray(txList) || txList.length === 0) return [];

  const isIncome = (t: any): boolean => {
    if (!t) return false;
    if (t.type === 'income') return true;
    if (typeof t.id === 'string' && t.id.startsWith('inc-')) return true;
    if (typeof t._id === 'string' && t._id.startsWith('inc-')) return true;
    if (t.category && INCOME_CATEGORY_NAMES.includes(t.category)) return true;
    if (Number(t.amount) > 0 && t.type !== 'expense') return true;
    return isIncomeTransactionOrItem(t);
  };

  const incomeTxs = txList.filter(isIncome);
  if (incomeTxs.length === 0) return [];

  return incomeTxs.map((t) => {
    const id = String(t._id || t.id);
    const dateObj = t.date ? new Date(t.date) : (t.createdAt ? new Date(t.createdAt) : new Date());
    const dateStr = !isNaN(dateObj.getTime())
      ? dateObj.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const categoryName = (t.category && INCOME_CATEGORY_NAMES.includes(t.category))
      ? t.category
      : (t.category || 'Lương');

    return {
      id,
      title: t.title || t.note || (t.category ? `Khoản thu: ${t.category}` : 'Thu nhập'),
      amount: Math.abs(Number(t.amount) || 0),
      category: categoryName,
      date: dateStr,
      note: t.note || '',
      createdAt: isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime(),
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Đồng bộ danh sách các khoản thu nhập từ các giao dịch trên MongoDB Backend.
 * Chỉ lưu và phát sự kiện nếu có dữ liệu mới/thay đổi để ngăn chặn render loop.
 */
export function syncIncomesFromBackendTransactions(
  txList: any[],
  userId?: string
): IncomeRecord[] {
  const existing = getIncomeRecords(userId);
  if (!Array.isArray(txList) || txList.length === 0) return existing;

  const extracted = extractIncomesFromTransactions(txList);
  if (extracted.length === 0) return existing;

  const existingMap = new Map<string, IncomeRecord>();
  existing.forEach((r) => {
    if (r.id) existingMap.set(r.id, r);
  });

  let hasNewOrChanged = false;
  extracted.forEach((rec) => {
    const prev = existingMap.get(rec.id);
    if (!prev || prev.amount !== rec.amount || prev.title !== rec.title || prev.date !== rec.date || prev.category !== rec.category) {
      hasNewOrChanged = true;
      existingMap.set(rec.id, rec);
    }
  });

  // Nếu không có thay đổi nào, giữ nguyên tham chiếu cũ để không kích hoạt re-render
  if (!hasNewOrChanged && existing.length === existingMap.size) {
    return existing;
  }

  const merged = Array.from(existingMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  saveIncomeRecords(merged, userId);
  syncIncomeWithBudget(merged);
  return merged;
}

// Tự động nạp trước từ AsyncStorage khi khởi tạo module
preloadIncomeFromAsyncStorage().catch(() => {});
