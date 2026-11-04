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

// Danh sách các id đã bị người dùng xóa để không bao giờ bị merge lại từ transaction cũ
const inMemoryDeletedIds = new Set<string>();

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

export function getDeletedIncomeIds(): Set<string> {
  return inMemoryDeletedIds;
}

/**
 * Thuật toán chuẩn hoá & khử trùng lặp (Deduplication) các khoản thu nhập:
 * 1. Loại bỏ các ID nằm trong danh sách đã xóa (tombstone inMemoryDeletedIds)
 * 2. Loại bỏ bản ghi trùng ID
 * 3. Nếu một khoản thu tạm thời (ID dạng inc-...) có khoản thu chính thức từ backend MongoDB
 *    (cùng ngày YYYY-MM-DD, cùng số tiền, và cùng tiêu đề hoặc danh mục),
 *    khoản thu chính thức từ backend sẽ được GIỮ LẠI và bản ghi tạm inc-... sẽ bị LOẠI BỎ.
 * 4. Loại bỏ các bản ghi trùng lặp do bấm đúp nhanh (cùng ngày, số tiền, tiêu đề, tạo trong vòng 15 giây).
 */
export function deduplicateIncomeRecords(records: IncomeRecord[]): IncomeRecord[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const deletedIds = getDeletedIncomeIds();
  // Lọc ban đầu loại bỏ null/undefined và các ID đã bị xóa
  const valid = records.filter((r) => r && r.id && !deletedIds.has(r.id));
  if (valid.length <= 1) return valid;

  // B1: Khử trùng lặp ID tuyệt đối
  const seenIds = new Set<string>();
  const uniqueById: IncomeRecord[] = [];
  for (const r of valid) {
    if (!seenIds.has(r.id)) {
      seenIds.add(r.id);
      uniqueById.push(r);
    }
  }

  // B2: Tách biệt backend records (ID từ MongoDB) và temp records (ID inc-...)
  const backendRecords = uniqueById.filter((r) => !r.id.startsWith('inc-'));
  const tempRecords = uniqueById.filter((r) => r.id.startsWith('inc-'));

  const redundantTempIds = new Set<string>();
  for (const temp of tempRecords) {
    const tempDateStr = String(temp.date || '').slice(0, 10);
    const tempAmt = Math.abs(Number(temp.amount) || 0);
    const tempTitle = (temp.title || '').trim().toLowerCase();
    const tempCat = (temp.category || '').trim().toLowerCase();

    const matchingBackend = backendRecords.find((b) => {
      const bDateStr = String(b.date || '').slice(0, 10);
      const bAmt = Math.abs(Number(b.amount) || 0);
      const bTitle = (b.title || '').trim().toLowerCase();
      const bCat = (b.category || '').trim().toLowerCase();

      const sameDate = bDateStr === tempDateStr;
      const sameAmount = bAmt === tempAmt;
      const sameTitleOrCat =
        (bTitle && tempTitle && bTitle === tempTitle) ||
        (bCat && tempCat && bCat === tempCat) ||
        (bTitle && tempCat && bTitle === tempCat) ||
        (tempTitle && bCat && tempTitle === bCat);

      return sameDate && sameAmount && sameTitleOrCat;
    });

    if (matchingBackend) {
      redundantTempIds.add(temp.id);
    }
  }

  // B3: Lọc bỏ các temp record bị thừa
  const nonRedundant = uniqueById.filter((r) => !redundantTempIds.has(r.id));

  // B4: Khử trùng lặp do double-tap (2 bản ghi trùng hệt nhau tạo cách nhau <= 15s)
  const result: IncomeRecord[] = [];
  for (const r of nonRedundant) {
    const rDateStr = String(r.date || '').slice(0, 10);
    const rAmt = Math.abs(Number(r.amount) || 0);
    const rTitle = (r.title || '').trim().toLowerCase();

    const isDuplicateDoubleTap = result.some((existing) => {
      if (existing.id === r.id) return true;
      const exDateStr = String(existing.date || '').slice(0, 10);
      const exAmt = Math.abs(Number(existing.amount) || 0);
      const exTitle = (existing.title || '').trim().toLowerCase();

      const sameDate = exDateStr === rDateStr;
      const sameAmount = exAmt === rAmt;
      const sameTitle = exTitle === rTitle;
      const timeDiff = Math.abs((existing.createdAt || 0) - (r.createdAt || 0));

      if (
        sameDate &&
        sameAmount &&
        sameTitle &&
        (timeDiff <= 15000 || existing.id.startsWith('inc-') || r.id.startsWith('inc-'))
      ) {
        return true;
      }
      return false;
    });

    if (!isDuplicateDoubleTap) {
      result.push(r);
    }
  }

  return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function markIncomeDeleted(id: string): void {
  if (!id) return;
  inMemoryDeletedIds.add(id);

  // Lưu vào AsyncStorage và localStorage
  const storage = getAsyncStorage();
  if (storage) {
    storage.setItem('monett_deleted_income_ids', JSON.stringify(Array.from(inMemoryDeletedIds))).catch(() => {});
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('monett_deleted_income_ids', JSON.stringify(Array.from(inMemoryDeletedIds)));
    } catch (_) {}
  }
}

export async function preloadDeletedIncomeIds(): Promise<Set<string>> {
  const storage = getAsyncStorage();
  if (storage) {
    try {
      const raw = await storage.getItem('monett_deleted_income_ids');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((id: string) => inMemoryDeletedIds.add(id));
        }
      }
    } catch (_) {}
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem('monett_deleted_income_ids');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((id: string) => inMemoryDeletedIds.add(id));
        }
      }
    } catch (_) {}
  }
  return inMemoryDeletedIds;
}

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
  await preloadDeletedIncomeIds();
  const key = getIncomeStorageKey(userId);
  const storage = getAsyncStorage();
  if (!storage) return getIncomeRecords(userId);

  try {
    const raw = await storage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = deduplicateIncomeRecords(
          parsed.filter(
            (r) => r && r.id !== 'inc-sample-1' && r.title !== 'Lương hàng tháng' && !inMemoryDeletedIds.has(r.id)
          )
        );
        inMemoryCache[key] = cleaned;
        notifyIncomeUpdated(cleaned);
        return cleaned;
      }
    }
  } catch (_) {}

  return getIncomeRecords(userId);
}

/**
 * Lấy danh sách các khoản thu nhập từ storage theo từng tài khoản (0ms đồng bộ, hoàn toàn pure & tự động khử trùng lặp)
 */
export function getIncomeRecords(userId?: string): IncomeRecord[] {
  const key = getIncomeStorageKey(userId);

  // 1. In-memory cache trước (nhanh nhất và không mất giữa các lần chuyển màn hình)
  if (inMemoryCache[key] && Array.isArray(inMemoryCache[key])) {
    const cleaned = deduplicateIncomeRecords(inMemoryCache[key]);
    inMemoryCache[key] = cleaned;
    return cleaned;
  }

  // 2. Thử đọc từ window.localStorage nếu chạy trên Web / Mobile Web
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = deduplicateIncomeRecords(
            parsed.filter((r) => r && r.id !== 'inc-sample-1' && r.title !== 'Lương hàng tháng')
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
  const filtered = deduplicateIncomeRecords(records);
  inMemoryCache[key] = filtered;

  // 1. Lưu vào Web localStorage nếu có
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (_) {}
  }

  // 2. Lưu bền vững vào AsyncStorage trên Native Mobile (iOS / Android)
  const storage = getAsyncStorage();
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(filtered)).catch(() => {});
    } catch (_) {}
  }

  // 3. Thông báo bất đồng bộ cho tất cả subscribers
  notifyIncomeUpdated(filtered);
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
 * Thêm một khoản thu nhập mới:
 * 1. Gửi đồng bộ lên backend MongoDB trước (nếu thiết bị online) để lấy ObjectId chính thức.
 * 2. Lưu vào storage với ID chính thức đó (tránh việc lưu id tạm inc-... rồi sau đó bị merge thành 2 bản ghi).
 * 3. Nếu offline hoặc lỗi, fallback sang ID inc-..., và thuật toán deduplicate sẽ tự động thay thế khi online.
 */
export async function addIncomeRecord(
  data: Omit<IncomeRecord, 'id' | 'createdAt'>
): Promise<IncomeRecord> {
  let realId: string | null = null;
  const now = Date.now();

  try {
    const res: any = await createTransactionApi({
      title: data.title,
      amount: Math.abs(data.amount),
      type: 'income',
      category: data.category,
      date: data.date,
      note: data.note,
    });
    const backendItem = res?.data || res;
    if (backendItem && (backendItem._id || backendItem.id)) {
      realId = String(backendItem._id || backendItem.id);
    }
  } catch (_) {
    // Offline hoặc lỗi mạng -> dùng fallback ID
  }

  const recordId = realId || `inc-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const newRecord: IncomeRecord = {
    ...data,
    id: recordId,
    createdAt: now,
  };

  const current = getIncomeRecords();
  const merged = deduplicateIncomeRecords([newRecord, ...current]);
  saveIncomeRecords(merged);
  syncIncomeWithBudget(merged);

  return newRecord;
}

/**
 * Xóa một khoản thu nhập (vĩnh viễn, không bị hồi sinh lại từ cache cũ):
 * Đánh dấu xóa cả ID hiện tại và bất kỳ bản sao đối ứng nào (inc-... vs MongoDB ID).
 */
export async function deleteIncomeRecord(id: string): Promise<boolean> {
  markIncomeDeleted(id);
  const current = getIncomeRecords();
  const toDelete = current.find((r) => r.id === id);

  // Nếu bản ghi có bản sao tương ứng (cùng date, amount, title), đánh dấu xóa luôn cả bản sao
  if (toDelete) {
    const targetDate = String(toDelete.date || '').slice(0, 10);
    const targetAmt = Math.abs(Number(toDelete.amount) || 0);
    const targetTitle = (toDelete.title || '').trim().toLowerCase();

    current.forEach((r) => {
      if (r.id !== id) {
        const rDate = String(r.date || '').slice(0, 10);
        const rAmt = Math.abs(Number(r.amount) || 0);
        const rTitle = (r.title || '').trim().toLowerCase();
        if (rDate === targetDate && rAmt === targetAmt && rTitle === targetTitle) {
          markIncomeDeleted(r.id);
        }
      }
    });
  }

  const updated = current.filter((r) => r.id !== id && !getDeletedIncomeIds().has(r.id));
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
 * Không gọi storage, không bắn event, loại bỏ các mục đã bị xóa và tự động khử trùng lặp.
 */
export function extractIncomesFromTransactions(txList: any[]): IncomeRecord[] {
  if (!Array.isArray(txList) || txList.length === 0) return [];

  const deletedIds = getDeletedIncomeIds();

  const isIncome = (t: any): boolean => {
    if (!t) return false;
    const id = String(t._id || t.id);
    if (deletedIds.has(id)) return false; // Không lấy các mục đã bị xóa
    if (t.type === 'income') return true;
    if (typeof t.id === 'string' && t.id.startsWith('inc-')) return true;
    if (typeof t._id === 'string' && t._id.startsWith('inc-')) return true;
    if (t.category && INCOME_CATEGORY_NAMES.includes(t.category)) return true;
    if (Number(t.amount) > 0 && t.type !== 'expense') return true;
    return isIncomeTransactionOrItem(t);
  };

  const incomeTxs = txList.filter(isIncome);
  if (incomeTxs.length === 0) return [];

  const rawList: IncomeRecord[] = incomeTxs.map((t) => {
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
  });

  return deduplicateIncomeRecords(rawList);
}

/**
 * Đồng bộ danh sách các khoản thu nhập từ các giao dịch trên MongoDB Backend.
 * Tự động hợp nhất và khử trùng lặp giữa local storage và backend MongoDB.
 */
export function syncIncomesFromBackendTransactions(
  txList: any[],
  userId?: string
): IncomeRecord[] {
  const existing = getIncomeRecords(userId);
  if (!Array.isArray(txList) || txList.length === 0) return existing;

  const extracted = extractIncomesFromTransactions(txList);
  if (extracted.length === 0) return existing;

  const combined = deduplicateIncomeRecords([...extracted, ...existing]);

  // Kiểm tra xem có dữ liệu mới hoặc thay đổi hay không để tránh re-render thừa
  const deletedIds = getDeletedIncomeIds();
  const validExisting = existing.filter((r) => !deletedIds.has(r.id));
  const isIdentical =
    combined.length === validExisting.length &&
    combined.every((c, idx) => {
      const ex = validExisting[idx];
      return ex && c.id === ex.id && c.amount === ex.amount && c.date === ex.date && c.title === ex.title;
    });

  if (isIdentical) {
    return validExisting;
  }

  saveIncomeRecords(combined, userId);
  syncIncomeWithBudget(combined);
  return combined;
}

// Tự động nạp trước từ AsyncStorage khi khởi tạo module
preloadIncomeFromAsyncStorage().catch(() => {});
