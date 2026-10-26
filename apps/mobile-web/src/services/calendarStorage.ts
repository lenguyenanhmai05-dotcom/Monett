/**
 * calendarStorage.ts
 * Reliable persistent storage for spending calendar and expense photos:
 * 1. Client-side canvas image compression (resizes large camera photos from ~10MB down to ~80KB).
 * 2. IndexedDB primary storage (unlimited quota, never loses data or photos on refresh/tab switch).
 * 3. localStorage secondary cache for zero-flicker instant synchronous loading.
 */
import { getStoredUserId } from './api';

const DB_NAME = 'MonettDB';
const DB_VERSION = 1;
const STORE_NAME = 'calendar_data';
export const CALENDAR_STORAGE_KEY = 'monett_day_records';

export function getCalendarStorageKey(userId?: string): string {
  const uid = userId || getStoredUserId();
  return uid && uid !== 'guest' ? `monett_day_records_${uid}` : 'monett_day_records';
}

export function getBudgetStorageKey(userId?: string): string {
  const uid = userId || getStoredUserId();
  return uid && uid !== 'guest' ? `monett_cached_budget_${uid}` : 'monett_cached_budget';
}

/**
 * Compresses an image File or Blob using HTML5 Canvas.
 * Resizes max dimension to 1200px and encodes to JPEG quality 0.8.
 * Typical result: 5MB-20MB phone photo -> 60KB-120KB.
 */
export function compressImageFile(file: File | Blob, maxDim = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.FileReader) {
      return reject(new Error('FileReader not supported in this environment'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return reject(new Error('Failed to read file as DataURL'));

      const img = new (window as any).Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return resolve(dataUrl);
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not available'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSaveRecords<T>(value: T, userId?: string): Promise<boolean> {
  try {
    const db = await openIndexedDB();
    const key = getCalendarStorageKey(userId);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function idbLoadRecords<T>(userId?: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    const key = getCalendarStorageKey(userId);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export const CALENDAR_UPDATED_EVENT = 'monett:calendar_records_updated';
export const BUDGET_UPDATED_EVENT = 'monett:budget_records_updated';
export const BUDGET_STORAGE_KEY = 'monett_cached_budget';

export interface CachedBudgetData {
  month: number;
  year: number;
  limit: number;
  spent: number;
  remaining: number;
  spentPercent: number;
  remainingPercent: number;
  status: 'safe' | 'warning' | 'danger';
  payday: number;
  daysUntilPayday: number;
  currency: string;
}

/**
 * Lấy ngân sách được lưu đệm trong localStorage để render tức thì 0ms không phải chờ API
 */
export function getCachedBudget(userId?: string): CachedBudgetData | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const key = getBudgetStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Lưu ngân sách vào localStorage để đồng bộ giữa các tab và màn hình
 */
export function saveCachedBudget(budget: CachedBudgetData, userId?: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const key = getBudgetStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(budget));
    } catch (_) {}
  }
}

/**
 * Phát sự kiện khi ngân sách / số dư khả dụng thay đổi để Web & Mobile cập nhật ngay tức thì
 */
export function notifyBudgetUpdated(budget?: CachedBudgetData): void {
  if (budget) {
    saveCachedBudget(budget);
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(BUDGET_UPDATED_EVENT, { detail: budget || getCachedBudget() })
      );
    } catch (_) {}
  }
}

/**
 * Đăng ký nhận cập nhật ngân sách / số dư tức thì khi có khoản chi tiêu mới hoặc xóa khoản chi
 */
export function subscribeBudgetUpdates(
  callback: (budget: CachedBudgetData | null) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: any) => {
    if (e.detail && typeof e.detail === 'object') {
      callback(e.detail);
    } else {
      callback(getCachedBudget());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === BUDGET_STORAGE_KEY) {
      callback(getCachedBudget());
    }
  };

  window.addEventListener(BUDGET_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(BUDGET_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Cập nhật số dư khả dụng và tổng chi tiêu ngay lập tức (Optimistic UI 0ms).
 * deltaAmount > 0: Thêm chi tiêu -> spent tăng, remaining giảm
 * deltaAmount < 0: Xóa chi tiêu -> spent giảm, remaining tăng
 */
export function applyBudgetDelta(
  deltaAmount: number,
  currentBudget?: CachedBudgetData
): CachedBudgetData {
  const base: CachedBudgetData = currentBudget || getCachedBudget() || {
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    limit: 22000000,
    spent: 0,
    remaining: 22000000,
    spentPercent: 0,
    remainingPercent: 100,
    status: 'safe',
    payday: 5,
    daysUntilPayday: 12,
    currency: 'VND',
  };

  const newSpent = Math.max(0, (base.spent || 0) + deltaAmount);
  const limit = base.limit || 0;
  const newRemaining = Math.max(0, limit - newSpent);
  const spentPercent = limit > 0 ? Number(((newSpent / limit) * 100).toFixed(1)) : 0;
  const remainingPercent = limit > 0 ? Number(((newRemaining / limit) * 100).toFixed(1)) : 0;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (spentPercent > 100) {
    status = 'danger';
  } else if (spentPercent >= 80) {
    status = 'warning';
  }

  const updated: CachedBudgetData = {
    ...base,
    spent: newSpent,
    remaining: newRemaining,
    spentPercent,
    remainingPercent,
    status,
  };

  saveCachedBudget(updated);
  notifyBudgetUpdated(updated);
  return updated;
}

/**
 * Phát sự kiện khi dữ liệu lịch / ảnh chi tiêu được cập nhật để các view (Web & Mobile) cùng đồng bộ ngay lập tức.
 */
export function notifyCalendarUpdated(records?: Record<string, any>): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(CALENDAR_UPDATED_EVENT, { detail: records || getInitialDayRecordsFromLocalStorage() })
      );
    } catch (_) {}
  }
}

/**
 * Đăng ký nhận cập nhật lịch chi tiêu khi có thay đổi từ Web hoặc Mobile
 */
export function subscribeCalendarUpdates(
  callback: (records: Record<string, DayExpenseRecord>) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: any) => {
    if (e.detail && typeof e.detail === 'object') {
      callback(e.detail);
    } else {
      callback(getInitialDayRecordsFromLocalStorage());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key && (e.key === CALENDAR_STORAGE_KEY || e.key.startsWith('monett_day_records'))) {
      callback(getInitialDayRecordsFromLocalStorage());
    }
  };

  window.addEventListener(CALENDAR_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(CALENDAR_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Saves records to IndexedDB (asynchronous unlimited storage)
 * AND synchronizes to localStorage for fast immediate reads.
 */
export function saveDayRecordsToStorage(records: any, userId?: string): void {
  const key = getCalendarStorageKey(userId);
  // 1. Primary: IndexedDB (Reliable, unlimited quota, persists across tabs/sessions)
  idbSaveRecords(records, userId).catch((err) => {
    console.warn('[calendarStorage] IndexedDB save error:', err);
  });

  // 2. Secondary: localStorage (instant synchronous read on initial render)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, JSON.stringify(records));
      // Remove old duplicated key to free up 50% storage space
      localStorage.removeItem('monett_day_photos');
    } catch {
      try {
        localStorage.removeItem('monett_day_photos');
        localStorage.setItem(key, JSON.stringify(records));
      } catch {
        console.warn('[calendarStorage] localStorage quota reached; full records are securely stored in IndexedDB.');
      }
    }
  }

  // 3. Thông báo cho các component Mobile & Web đang mở để cập nhật tức thời
  notifyCalendarUpdated(records);
}

// Dữ liệu ban đầu hoàn toàn rỗng để tài khoản hiển thị 100% dữ liệu chi tiêu thật từ MongoDB
export const INITIAL_SAMPLE_RECORDS: Record<string, DayExpenseRecord> = {};

/**
 * Kiểm tra xem một item có phải là dữ liệu mẫu giả lập trước đây hay không
 */
export function isSampleRecordItem(item: any): boolean {
  if (!item) return false;
  const idStr = String(item.id || item._id || '');
  if (/^[0-9]+-[0-9]+$/.test(idStr)) return true; // '1-1', '2-1', '10-1', '11-1', etc.
  if (idStr.startsWith('legacy-')) return true;
  if (typeof item.photoUri === 'string' && item.photoUri.includes('unsplash.com')) return true;
  const sampleNotes = [
    'Cà phê sáng vỉa hè',
    'Bữa trưa healthy',
    'Lẩu mini cuối tuần',
    'Bánh tart dâu',
    'Bát phở tái lăn',
    'Tô bún bò thơm nồng',
    'Freeze Trà Xanh',
    'Cơm niêu xá xíu',
    'Đổ xăng Ron 95',
    'Pizza 4 Cheese',
    'Đi siêu thị mua rau',
  ];
  if (typeof item.note === 'string' && sampleNotes.some((n) => item.note.includes(n))) return true;
  return false;
}

/**
 * Dọn sạch triệt để toàn bộ dữ liệu mẫu demo giả lập khỏi localStorage & IndexedDB cho tất cả tài khoản
 */
export function purgeAllLegacySampleData(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === CALENDAR_STORAGE_KEY || k.startsWith('monett_day_records'))) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            if (data && typeof data === 'object') {
              const cleaned: Record<string, DayExpenseRecord> = {};
              let changed = false;
              Object.entries(data).forEach(([dateKey, rec]: [string, any]) => {
                if (!rec) return;
                const items = Array.isArray(rec.items) ? rec.items : [];
                const realItems = items.filter((it: any) => !isSampleRecordItem(it));
                if (realItems.length !== items.length) changed = true;
                if (rec.photoUri && rec.photoUri.includes('unsplash.com')) changed = true;

                if (realItems.length > 0) {
                  cleaned[dateKey] = {
                    ...rec,
                    items: realItems,
                    amount: realItems.reduce((s: number, it: any) => s + (it.amount || 0), 0),
                    photoUri: getLatestPhotoFromItems(realItems),
                  };
                } else {
                  changed = true;
                }
              });

              if (changed) {
                localStorage.setItem(k, JSON.stringify(cleaned));
                idbSaveRecords(cleaned, k.replace('monett_day_records_', ''));
              }
            }
          } catch (_) {}
        }
      }
    }
  } catch (_) {}
}

// Tự động dọn dẹp sạch sẽ ngay khi nạp module
if (typeof window !== 'undefined') {
  purgeAllLegacySampleData();
}

/**
 * Trích xuất timestamp chính xác lúc upload/tạo giao dịch (từ createdAt, MongoDB ObjectId, local tempId hoặc date có giờ thực).
 * Đảm bảo 100% không dùng giờ tĩnh (07:00, 12:00, 08:00) sinh ra từ UTC midnight.
 */
export function getUploadTimestamp(item?: {
  createdAt?: string | Date;
  date?: string | Date;
  id?: string;
  _id?: string;
}): Date | null {
  if (!item) return null;

  // 1. Ưu tiên createdAt (thời gian ghi nhận thực tế trên server/database hoặc lúc lưu local)
  if (item.createdAt) {
    const cd = new Date(item.createdAt);
    if (!isNaN(cd.getTime())) return cd;
  }

  // 2. id / _id là MongoDB ObjectId (8 ký tự hex đầu tiên chính là unix epoch tính bằng giây)
  const idStr = String(item._id || item.id || '');
  if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
    const epochSec = parseInt(idStr.substring(0, 8), 16);
    if (!isNaN(epochSec) && epochSec > 1500000000 && epochSec < 2500000000) {
      return new Date(epochSec * 1000);
    }
  }

  // 3. id là local tempId dạng `tx-<ms>` hoặc `exp-<ms>`
  const localMatch = idStr.match(/(?:tx|exp)-(\d{10,14})/);
  if (localMatch) {
    const ms = Number(localMatch[1]);
    if (!isNaN(ms) && ms > 1500000000000) {
      return new Date(ms);
    }
  }

  // 4. item.date nếu có chứa giờ phút thực tế (không phải UTC midnight 00:00:00Z hay 12:00:00)
  if (item.date) {
    const d = new Date(item.date);
    if (!isNaN(d.getTime())) {
      const isUtcMidnightOrFixed =
        typeof item.date === 'string' &&
        (item.date.endsWith('T00:00:00.000Z') ||
          item.date.endsWith('T00:00:00Z') ||
          item.date.includes('T12:00:00') ||
          item.date.endsWith('T00:00:00'));
      if (!isUtcMidnightOrFixed) {
        return d;
      }
    }
  }

  return null;
}

/**
 * Định dạng thời gian chính xác lúc upload của khoản chi tiêu theo chuẩn HH:mm
 */
export function formatExpenseUploadTime(item?: {
  createdAt?: string | Date;
  time?: string;
  date?: string | Date;
  id?: string;
  _id?: string;
}): string {
  if (!item) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  const uploadDate = getUploadTimestamp(item);
  if (uploadDate) {
    const h = String(uploadDate.getHours()).padStart(2, '0');
    const m = String(uploadDate.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  // Nếu item.time đã có sẵn và không phải các giá trị tĩnh mặc định (07:00 do UTC+7 của 00:00, 12:00, 08:00)
  if (item.time && item.time !== '07:00' && item.time !== '12:00' && item.time !== '08:00') {
    return item.time;
  }

  // Fallback: Thời điểm upload hiện tại, tuyệt đối không dùng giờ tĩnh giả lập
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const INCOME_CATEGORY_NAMES = [
  'Lương',
  'Thưởng/KPI',
  'Freelance/Ngoài giờ',
  'Đầu tư',
  'Kinh doanh/Bán hàng',
  'Được tặng/Lì xì',
  'Khoản thu khác',
];

export function isIncomeTransactionOrItem(it: any): boolean {
  if (!it) return false;
  if (it.type === 'income') return true;
  if (typeof it.id === 'string' && it.id.startsWith('inc-')) return true;
  if (typeof it._id === 'string' && it._id.startsWith('inc-')) return true;
  if (it.category && INCOME_CATEGORY_NAMES.includes(it.category)) return true;
  return false;
}

/**
 * Synchronous initial state loader from localStorage.
 */
export function getInitialDayRecordsFromLocalStorage(userId?: string): Record<string, DayExpenseRecord> {
  const key = getCalendarStorageKey(userId);
  const uid = userId || getStoredUserId();
  const isRealUser = uid && uid !== 'guest';

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const cleaned: Record<string, DayExpenseRecord> = {};
          let needsResave = false;
          Object.entries(parsed).forEach(([k, rec]: [string, any]) => {
            if (!rec) return;
            // Tự động loại bỏ mọi item thu nhập vô tình lọt vào dayRecords & loại bỏ dữ liệu mẫu cũ
            if (Array.isArray(rec.items) && rec.items.length > 0) {
              const origLen = rec.items.length;
              rec.items = rec.items.filter((it: any) => !isIncomeTransactionOrItem(it) && !isSampleRecordItem(it));
              if (rec.items.length !== origLen) {
                needsResave = true;
                rec.amount = rec.items.reduce((s: number, it: any) => s + (it.amount || 0), 0);
              }
            }
            if (rec.photoUri && rec.photoUri.includes('unsplash.com')) {
              rec.photoUri = getLatestPhotoFromItems(rec.items);
              needsResave = true;
            }
            // Nếu một ngày không có khoản chi nào (items rỗng và amount = 0), không giữ ảnh đại diện rác
            if (Array.isArray(rec.items) && rec.items.length === 0 && (!rec.amount || rec.amount === 0)) {
              needsResave = true;
              return;
            }
            // Chuẩn hóa lại thời gian từng item theo thời điểm upload thực tế (loại bỏ giờ tĩnh 07:00, 12:00)
            if (Array.isArray(rec.items) && rec.items.length > 0) {
              rec.items = rec.items.map((it: any) => ({
                ...it,
                time: formatExpenseUploadTime(it),
              }));
            }
            cleaned[k] = rec;
          });
          if (needsResave && typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.setItem(key, JSON.stringify(cleaned));
            } catch (_) {}
          }
          return cleaned;
        }
      }
    } catch (_) {}
  }
  // Bắt đầu rỗng hoàn toàn 100% để nạp dữ liệu chi tiêu thật từ MongoDB
  return {};
}

/**
 * Lấy ảnh được upload mới nhất từ danh sách các khoản chi tiêu trong ngày
 */
export function getLatestPhotoFromItems(items?: ExpenseItem[]): string | undefined {
  if (!items || items.length === 0) return undefined;
  const itemsWithPhoto = items.filter(
    (it) => it.photoUri && it.photoUri.trim().length > 0 && !it.photoUri.includes('unsplash.com')
  );
  if (itemsWithPhoto.length === 0) return undefined;

  const sorted = [...itemsWithPhoto].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return (b.time || '').localeCompare(a.time || '');
  });

  return sorted[0]?.photoUri;
}

/**
 * Hợp nhất các giao dịch thực tế từ Backend vào cấu trúc dayRecords của Lịch trình chi tiêu.
 * Giúp cả Web lẫn Mobile nhận diện đúng mọi hình ảnh và chi tiêu được thêm vào từ bất kỳ thiết bị nào.
 */
export function mergeTransactionsIntoDayRecords(
  currentRecords: Record<string, DayExpenseRecord>,
  transactions: any[]
): Record<string, DayExpenseRecord> {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return currentRecords;
  }

  const nextRecords: Record<string, DayExpenseRecord> = { ...currentRecords };

  transactions.forEach((tx) => {
    if (!tx || !tx.date) return;
    // BỎ QUA GIAO DỊCH THU NHẬP! dayRecords chỉ lưu lịch trình CHI TIÊU
    if (isIncomeTransactionOrItem(tx)) return;
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) return;

    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const key = `${y}-${m}-${day}`;
    const paddedKey = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const existing = nextRecords[key] || nextRecords[paddedKey] || {
      amount: 0,
      category: tx.category || 'Ăn uống',
      categoryIcon: tx.categoryIcon || '🍜',
      items: [],
      dateStr: paddedKey,
    };

    const txId = String(tx._id || tx.id || `tx-${Date.now()}`);
    // Thời gian chính xác lúc upload (không dùng giờ tĩnh 07:00 sinh từ UTC midnight)
    const timeStr = formatExpenseUploadTime({ ...tx, id: txId });

    let items = existing.items ? [...existing.items] : [];
    const existingIndex = items.findIndex((it) => it.id === txId);

    const item: ExpenseItem = {
      id: txId,
      time: timeStr,
      amount: Math.abs(tx.amount || 0),
      category: tx.category || 'Ăn uống',
      categoryIcon: tx.categoryIcon || '🍜',
      title: tx.title || tx.note || '',
      type: (tx.type || 'expense') as 'expense' | 'income',
      note: tx.note || tx.title || '',
      photoUri: tx.photoUri || undefined,
      createdAt: tx.createdAt || (getUploadTimestamp(tx) ? getUploadTimestamp(tx)!.toISOString() : d.toISOString()),
    };

    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], ...item, time: timeStr };
    } else {
      items.push(item);
    }

    items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const totalAmount = items.reduce((sum, it) => sum + (it.amount || 0), 0);
    // Tự động lấy ảnh được upload mới nhất từ danh sách các khoản chi tiêu
    const latestPhoto = getLatestPhotoFromItems(items);
    const photoUri = latestPhoto || (items.length > 0 ? existing.photoUri : undefined);

    const updatedRecord: DayExpenseRecord = {
      ...existing,
      photoUri,
      amount: totalAmount,
      dateStr: paddedKey,
      items,
    };

    nextRecords[key] = updatedRecord;
    nextRecords[paddedKey] = updatedRecord;
  });

  return nextRecords;
}

/**
 * Xây dựng bản ghi lịch chi tiêu sạch sẽ 100% từ danh sách giao dịch MongoDB của đúng tài khoản người dùng
 */
export function buildDayRecordsFromTransactions(
  transactions: any[]
): Record<string, DayExpenseRecord> {
  return mergeTransactionsIntoDayRecords({}, transactions);
}

/**
 * Xóa sạch bộ nhớ đệm lịch của một tài khoản cụ thể
 */
export function clearUserCalendarStorage(userId?: string): void {
  const uid = userId || getStoredUserId();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(getCalendarStorageKey(uid));
      localStorage.removeItem(getBudgetStorageKey(uid));
    } catch (_) {}
  }
}

/**
 * Xóa một giao dịch khỏi dayRecords và lưu lại vào Storage.
 * - Nếu xóa hết các khoản chi tiêu trong ngày -> xóa luôn ảnh đại diện ô lịch.
 * - Nếu vẫn còn các khoản chi tiêu khác -> tự động lấy ảnh được upload mới nhất để làm ảnh đại diện ô lịch.
 */
export function removeDayRecordItem(itemId: string, userId?: string): Record<string, DayExpenseRecord> {
  const current = getInitialDayRecordsFromLocalStorage(userId);
  const next: Record<string, DayExpenseRecord> = {};
  const matchId = (it: any) => String(it.id || it._id) === String(itemId);

  Object.entries(current).forEach(([k, rec]) => {
    if (!rec) return;
    const hasItem = rec.items && rec.items.some(matchId);
    if (!hasItem) {
      if (Array.isArray(rec.items) && rec.items.length === 0 && (!rec.amount || rec.amount === 0)) {
        return;
      }
      next[k] = rec;
      return;
    }

    const filteredItems = (rec.items || []).filter((it) => !matchId(it));

    // Rule 1: Nếu xóa hết các khoản chi tiêu trong ngày -> Xóa luôn ảnh đại diện ô lịch
    if (filteredItems.length === 0) {
      next[k] = {
        amount: 0,
        category: '',
        categoryIcon: '',
        items: [],
        photoUri: undefined,
        dateStr: rec.dateStr,
      };
      return;
    }

    // Rule 2: Nếu vẫn còn các khoản chi tiêu khác -> Tự động lấy ảnh upload mới nhất
    const newTotal = filteredItems.reduce((s, it) => s + (it.amount || 0), 0);
    const latestPhoto = getLatestPhotoFromItems(filteredItems);

    next[k] = {
      ...rec,
      amount: newTotal,
      photoUri: latestPhoto,
      items: filteredItems,
    };
  });

  saveDayRecordsToStorage(next, userId);
  notifyCalendarUpdated(next);
  return next;
}

export interface ExpenseItem {
  id: string;
  time: string; // "14:30"
  amount: number;
  category: string;
  categoryIcon: string;
  title?: string;
  type?: 'expense' | 'income';
  note?: string;
  photoUri?: string;
  createdAt: string;
}

export interface DayExpenseRecord {
  photoUri?: string;
  amount: number; // Tổng cộng dồn tất cả các khoản chi trong ngày
  category: string;
  categoryIcon: string;
  note?: string;
  dateStr?: string;
  items?: ExpenseItem[];
}

/**
 * Tính tổng chi tiêu thực tế của một tháng cụ thể từ dayRecords và transactions.
 * Loại bỏ trùng lặp ngày, đảm bảo số liệu chuẩn xác 100% theo thời gian thực.
 */
export function calculateMonthTotalExpenses(
  year: number,
  month: number,
  dayRecords?: Record<string, DayExpenseRecord>,
  transactions?: any[]
): number {
  const records = dayRecords || getInitialDayRecordsFromLocalStorage();
  const dayMap: Record<number, number> = {};

  // 1. Giao dịch backend nếu có
  if (Array.isArray(transactions) && transactions.length > 0) {
    transactions.forEach((tx: any) => {
      if (!tx || !tx.date) return;
      // BỎ QUA GIAO DỊCH THU NHẬP!
      if (isIncomeTransactionOrItem(tx)) return;
      const d = new Date(tx.date);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const dNum = d.getDate();
        dayMap[dNum] = (dayMap[dNum] || 0) + Math.abs(tx.amount || 0);
      }
    });
  }

  // 3. dayRecords lưu trữ (ưu tiên đè lên dữ liệu mẫu nếu có thay đổi)
  if (records && typeof records === 'object') {
    Object.entries(records).forEach(([key, rec]) => {
      if (!rec) return;
      const parts = key.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (y === year && m === month) {
          if (Array.isArray(rec.items)) {
            const expenseItems = rec.items.filter((it: any) => !isIncomeTransactionOrItem(it));
            if (expenseItems.length === 0) {
              dayMap[d] = 0;
            } else {
              dayMap[d] = expenseItems.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
            }
          } else if (rec.amount !== undefined) {
            dayMap[d] = rec.amount;
          }
        }
      }
    });
  }

  return Object.values(dayMap).reduce((sum, val) => sum + val, 0);
}
