import { Platform } from 'react-native';

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
export const RECURRING_UPDATED_EVENT = 'monett:recurring_updated';

// 1. In-memory cache đồng bộ để đọc tức thì 0ms trên cả React Native Mobile & Web
const inMemoryCache: Record<string, RecurringItem[]> = {};

// In-memory listeners cho cập nhật chéo giữa các widget và màn hình
const recurringListeners = new Set<() => void>();
let isNotifying = false;

export function notifyRecurringUpdated(): void {
  if (isNotifying) return;
  isNotifying = true;
  try {
    recurringListeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        if (typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent(RECURRING_UPDATED_EVENT));
        }
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  } finally {
    isNotifying = false;
  }
}

export function subscribeRecurringUpdates(callback: () => void): () => void {
  recurringListeners.add(callback);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const handleEvent = () => {
      try {
        callback();
      } catch {}
    };
    window.addEventListener(RECURRING_UPDATED_EVENT, handleEvent);
    window.addEventListener('storage', handleEvent);
    return () => {
      recurringListeners.delete(callback);
      window.removeEventListener(RECURRING_UPDATED_EVENT, handleEvent);
      window.removeEventListener('storage', handleEvent);
    };
  }
  return () => {
    recurringListeners.delete(callback);
  };
}

export const getRecurringStorageKey = (userId?: string, userEmail?: string): string => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  if (normEmail) return `${STORAGE_PREFIX}${normEmail}`;
  if (userId && userId.trim()) return `${STORAGE_PREFIX}${userId.trim()}`;
  return `${STORAGE_PREFIX}guest`;
};

// Helper an toàn lấy AsyncStorage
const getAsyncStorage = () => {
  try {
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return null;
  }
};

/**
 * Đọc đồng bộ dữ liệu định kỳ (ưu tiên Memory Cache -> LocalStorage -> Fallback)
 */
export const loadRecurringItems = (userId?: string, userEmail?: string): RecurringItem[] => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const primaryKey = getRecurringStorageKey(userId, userEmail);

  // 1. Kiểm tra trong bộ nhớ đệm (In-Memory Cache) trước - nhanh nhất và đảm bảo không mất giữa các lần chuyển tab
  if (inMemoryCache[primaryKey] && inMemoryCache[primaryKey].length > 0) {
    return inMemoryCache[primaryKey];
  }

  // Thử các khóa phụ trong bộ nhớ
  const memoryCandidates = [
    normEmail ? `${STORAGE_PREFIX}${normEmail}` : '',
    userId ? `${STORAGE_PREFIX}${userId.trim()}` : '',
    `${STORAGE_PREFIX}guest`,
    `${STORAGE_PREFIX}global`,
  ].filter(Boolean);

  for (const cKey of memoryCandidates) {
    if (inMemoryCache[cKey] && inMemoryCache[cKey].length > 0) {
      inMemoryCache[primaryKey] = inMemoryCache[cKey];
      return inMemoryCache[cKey];
    }
  }

  // 2. Thử đọc từ window.localStorage nếu chạy trên Web / Mobile Web
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawPrimary = window.localStorage.getItem(primaryKey);
      if (rawPrimary) {
        const parsed = JSON.parse(rawPrimary);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryCache[primaryKey] = parsed;
          return parsed;
        }
      }

      for (const fbKey of memoryCandidates) {
        const rawFb = window.localStorage.getItem(fbKey);
        if (rawFb) {
          const parsed = JSON.parse(rawFb);
          if (Array.isArray(parsed) && parsed.length > 0) {
            inMemoryCache[primaryKey] = parsed;
            inMemoryCache[fbKey] = parsed;
            try {
              window.localStorage.setItem(primaryKey, JSON.stringify(parsed));
            } catch {}
            return parsed;
          }
        }
      }

      // Quét tất cả các key localStorage có tiền tố @monett_recurring_items_
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          const val = window.localStorage.getItem(k);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              inMemoryCache[primaryKey] = parsed;
              return parsed;
            }
          }
        }
      }
    } catch {}
  }

  // 3. Fallback dữ liệu mẫu nếu là tài khoản demo đặc thù
  if (normEmail === TARGET_EMAIL) {
    inMemoryCache[primaryKey] = REAL_RECURRING_ITEMS_FOR_USER;
    return REAL_RECURRING_ITEMS_FOR_USER;
  }

  return inMemoryCache[primaryKey] || [];
};

/**
 * Lưu dữ liệu định kỳ đồng thời vào:
 * 1. In-memory cache (cho lần đọc kế tiếp tức thì 0ms)
 * 2. AsyncStorage (lưu bền vững trên thiết bị Android / iOS)
 * 3. LocalStorage (lưu bền vững trên Web)
 */
export const saveRecurringItems = (items: RecurringItem[], userId?: string, userEmail?: string): void => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const primaryKey = getRecurringStorageKey(userId, userEmail);
  const jsonStr = JSON.stringify(items);

  // 1. Cập nhật ngay lập tức vào Memory Cache
  inMemoryCache[primaryKey] = items;
  inMemoryCache[`${STORAGE_PREFIX}guest`] = items;
  inMemoryCache[`${STORAGE_PREFIX}global`] = items;
  if (normEmail) inMemoryCache[`${STORAGE_PREFIX}${normEmail}`] = items;
  if (userId && userId.trim()) inMemoryCache[`${STORAGE_PREFIX}${userId.trim()}`] = items;

  // 2. Lưu vào window.localStorage nếu có
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(primaryKey, jsonStr);
      window.localStorage.setItem(`${STORAGE_PREFIX}guest`, jsonStr);
      window.localStorage.setItem(`${STORAGE_PREFIX}global`, jsonStr);
      if (normEmail) window.localStorage.setItem(`${STORAGE_PREFIX}${normEmail}`, jsonStr);
      if (userId && userId.trim()) window.localStorage.setItem(`${STORAGE_PREFIX}${userId.trim()}`, jsonStr);
    } catch {}
  }

  // 3. Lưu bền vững vào AsyncStorage (hỗ trợ cả React Native Mobile Android/iOS và Expo)
  const asyncStorage = getAsyncStorage();
  if (asyncStorage) {
    try {
      asyncStorage.setItem(primaryKey, jsonStr).catch(() => {});
      asyncStorage.setItem(`${STORAGE_PREFIX}guest`, jsonStr).catch(() => {});
      asyncStorage.setItem(`${STORAGE_PREFIX}global`, jsonStr).catch(() => {});
      if (normEmail) {
        asyncStorage.setItem(`${STORAGE_PREFIX}${normEmail}`, jsonStr).catch(() => {});
      }
      if (userId && userId.trim()) {
        asyncStorage.setItem(`${STORAGE_PREFIX}${userId.trim()}`, jsonStr).catch(() => {});
      }
    } catch {}
  }

  // 4. Phát tín hiệu cập nhật tức thời
  notifyRecurringUpdated();
};

/**
 * Tải trước dữ liệu định kỳ từ AsyncStorage khi app/màn hình mở lên
 */
export async function preloadRecurringFromAsyncStorage(userId?: string, userEmail?: string): Promise<RecurringItem[]> {
  const asyncStorage = getAsyncStorage();
  if (!asyncStorage) return loadRecurringItems(userId, userEmail);

  try {
    const primaryKey = getRecurringStorageKey(userId, userEmail);
    const normEmail = (userEmail || '').trim().toLowerCase();

    const keysToTry = [
      primaryKey,
      normEmail ? `${STORAGE_PREFIX}${normEmail}` : '',
      userId && userId.trim() ? `${STORAGE_PREFIX}${userId.trim()}` : '',
      `${STORAGE_PREFIX}guest`,
      `${STORAGE_PREFIX}global`,
    ].filter(Boolean);

    for (const key of keysToTry) {
      const raw = await asyncStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            inMemoryCache[primaryKey] = parsed;
            inMemoryCache[`${STORAGE_PREFIX}guest`] = parsed;
            inMemoryCache[`${STORAGE_PREFIX}global`] = parsed;
            notifyRecurringUpdated();
            return parsed;
          }
        } catch {}
      }
    }

    // Quét toàn bộ key trong AsyncStorage nếu chưa thấy
    try {
      const allKeys = await asyncStorage.getAllKeys();
      const recurringKeys = allKeys.filter((k: string) => k && k.startsWith(STORAGE_PREFIX));
      if (recurringKeys.length > 0) {
        const pairs = await asyncStorage.multiGet(recurringKeys);
        for (const [, v] of pairs) {
          if (v) {
            const parsed = JSON.parse(v);
            if (Array.isArray(parsed) && parsed.length > 0) {
              inMemoryCache[primaryKey] = parsed;
              inMemoryCache[`${STORAGE_PREFIX}guest`] = parsed;
              notifyRecurringUpdated();
              return parsed;
            }
          }
        }
      }
    } catch {}
  } catch {}

  return loadRecurringItems(userId, userEmail);
}

// Khởi chạy nạp ngay khi module được import
preloadRecurringFromAsyncStorage().catch(() => {});

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
