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
export const DEBT_UPDATED_EVENT = 'monett:debt_updated';

// 1. In-memory cache đồng bộ để đọc tức thì 0ms trên cả React Native Mobile & Web
const inMemoryCache: Record<string, DebtItem[]> = {};

// In-memory listeners cho cập nhật chéo giữa các widget và màn hình
const debtListeners = new Set<() => void>();
let isNotifying = false;

export function notifyDebtUpdated(): void {
  if (isNotifying) return;
  isNotifying = true;
  try {
    debtListeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        if (typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent(DEBT_UPDATED_EVENT));
        }
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  } finally {
    isNotifying = false;
  }
}

export function subscribeDebtUpdates(callback: () => void): () => void {
  debtListeners.add(callback);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const handleEvent = () => {
      try {
        callback();
      } catch {}
    };
    window.addEventListener(DEBT_UPDATED_EVENT, handleEvent);
    window.addEventListener('storage', handleEvent);
    return () => {
      debtListeners.delete(callback);
      window.removeEventListener(DEBT_UPDATED_EVENT, handleEvent);
      window.removeEventListener('storage', handleEvent);
    };
  }
  return () => {
    debtListeners.delete(callback);
  };
}

export const DEFAULT_INITIAL_DEBTS: DebtItem[] = [];

export const getDebtStorageKey = (userId?: string, userEmail?: string): string => {
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
 * Đọc đồng bộ dữ liệu sổ nợ (ưu tiên Memory Cache -> LocalStorage -> Fallback)
 */
export const loadDebtItems = (userId?: string, userEmail?: string): DebtItem[] => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const primaryKey = getDebtStorageKey(userId, userEmail);

  // 1. Kiểm tra trong bộ nhớ đệm (In-Memory Cache) trước - nhanh nhất và đảm bảo không mất giữa các lần chuyển tab
  if (inMemoryCache[primaryKey] && inMemoryCache[primaryKey].length > 0) {
    return inMemoryCache[primaryKey];
  }

  // Thử các khóa phụ trong bộ nhớ
  const memoryCandidates = [
    normEmail ? `${STORAGE_PREFIX}${normEmail}` : '',
    userId && userId.trim() ? `${STORAGE_PREFIX}${userId.trim()}` : '',
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
          const cleaned = parsed.filter((d) => d && !String(d.id).startsWith('debt_sample_'));
          if (cleaned.length > 0) {
            inMemoryCache[primaryKey] = cleaned;
            return cleaned;
          }
        }
      }

      for (const fbKey of memoryCandidates) {
        const rawFb = window.localStorage.getItem(fbKey);
        if (rawFb) {
          const parsed = JSON.parse(rawFb);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed.filter((d) => d && !String(d.id).startsWith('debt_sample_'));
            if (cleaned.length > 0) {
              inMemoryCache[primaryKey] = cleaned;
              inMemoryCache[fbKey] = cleaned;
              try {
                window.localStorage.setItem(primaryKey, JSON.stringify(cleaned));
              } catch {}
              return cleaned;
            }
          }
        }
      }

      // Quét tất cả các key localStorage có tiền tố @monett_debt_items_
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          const val = window.localStorage.getItem(k);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.filter((d) => d && !String(d.id).startsWith('debt_sample_'));
              if (cleaned.length > 0) {
                inMemoryCache[primaryKey] = cleaned;
                return cleaned;
              }
            }
          }
        }
      }
    } catch {}
  }

  // 3. Fallback dữ liệu mẫu nếu là tài khoản demo đặc thù
  if (normEmail === TARGET_EMAIL) {
    inMemoryCache[primaryKey] = REAL_DEBTS_FOR_USER;
    return REAL_DEBTS_FOR_USER;
  }

  return inMemoryCache[primaryKey] || [];
};

/**
 * Lưu dữ liệu sổ nợ đồng thời vào:
 * 1. In-memory cache (cho lần đọc kế tiếp tức thì 0ms)
 * 2. AsyncStorage (lưu bền vững trên thiết bị Android / iOS)
 * 3. LocalStorage (lưu bền vững trên Web)
 */
export const saveDebtItems = (items: DebtItem[], userId?: string, userEmail?: string): void => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const primaryKey = getDebtStorageKey(userId, userEmail);
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
  notifyDebtUpdated();
};

/**
 * Tải trước dữ liệu sổ nợ từ AsyncStorage khi app/màn hình mở lên
 */
export async function preloadDebtFromAsyncStorage(userId?: string, userEmail?: string): Promise<DebtItem[]> {
  const asyncStorage = getAsyncStorage();
  if (!asyncStorage) return loadDebtItems(userId, userEmail);

  try {
    const primaryKey = getDebtStorageKey(userId, userEmail);
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
            const cleaned = parsed.filter((d: any) => d && !String(d.id).startsWith('debt_sample_'));
            if (cleaned.length > 0) {
              inMemoryCache[primaryKey] = cleaned;
              inMemoryCache[`${STORAGE_PREFIX}guest`] = cleaned;
              inMemoryCache[`${STORAGE_PREFIX}global`] = cleaned;
              notifyDebtUpdated();
              return cleaned;
            }
          }
        } catch {}
      }
    }

    // Quét toàn bộ key trong AsyncStorage nếu chưa thấy
    try {
      const allKeys = await asyncStorage.getAllKeys();
      const debtKeys = allKeys.filter((k: string) => k && k.startsWith(STORAGE_PREFIX));
      if (debtKeys.length > 0) {
        const pairs = await asyncStorage.multiGet(debtKeys);
        for (const [, v] of pairs) {
          if (v) {
            const parsed = JSON.parse(v);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.filter((d: any) => d && !String(d.id).startsWith('debt_sample_'));
              if (cleaned.length > 0) {
                inMemoryCache[primaryKey] = cleaned;
                inMemoryCache[`${STORAGE_PREFIX}guest`] = cleaned;
                notifyDebtUpdated();
                return cleaned;
              }
            }
          }
        }
      }
    } catch {}
  } catch {}

  return loadDebtItems(userId, userEmail);
}

// Khởi chạy nạp ngay khi module được import
preloadDebtFromAsyncStorage().catch(() => {});

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
