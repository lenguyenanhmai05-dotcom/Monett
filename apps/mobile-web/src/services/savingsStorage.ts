export interface SavingsDepositRecord {
  id: string;
  amount: number;
  note?: string;
  date: string; // 'dd/mm/yyyy'
  createdAt: string;
}

export interface ISavingsGoal {
  id: string;
  title: string;           // Tên mục tiêu tích lũy (VD: "Du văn lịch")
  targetAmount: number;    // Số tiền mục tiêu (VD: 2000000)
  currentAmount: number;   // Số tiền đã tích (VD: 0)
  deadline?: string;       // Ngày hoàn thành: 'dd/mm/yyyy' hoặc 'yyyy-mm-dd'
  note?: string;           // Ghi chú
  icon?: string;           // Icon name hoặc emoji
  color?: string;          // Màu chủ đạo
  createdAt: string;
  deposits?: SavingsDepositRecord[];
}

export const getFutureDateFormatted = (daysFromNow: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const TARGET_EMAIL = 'lenguyenanhmai113@gmail.com';

export const REAL_SAVINGS_GOALS_FOR_USER: ISavingsGoal[] = [
  {
    id: 'goal-mai-1',
    title: 'Quỹ dự phòng khẩn cấp 6 tháng',
    targetAmount: 30000000,
    currentAmount: 18500000,
    deadline: '31/12/2026',
    note: 'Tích lũy an toàn gửi tiết kiệm linh hoạt Techcombank sinh lời đều đặn',
    icon: 'shield-checkmark',
    color: '#059669',
    createdAt: '2026-07-15T08:00:00.000Z',
    deposits: [
      { id: 'dep-1', amount: 10000000, note: 'Khởi tạo quỹ dự phòng an toàn', date: '15/07/2026', createdAt: '2026-07-15T08:00:00.000Z' },
      { id: 'dep-2', amount: 5000000, note: 'Trích lương tháng 8', date: '15/08/2026', createdAt: '2026-08-15T08:00:00.000Z' },
      { id: 'dep-3', amount: 3500000, note: 'Thưởng dự án quý 3', date: '15/09/2026', createdAt: '2026-09-15T08:00:00.000Z' },
    ],
  },
  {
    id: 'goal-mai-2',
    title: 'Nâng cấp Macbook Air M3',
    targetAmount: 28000000,
    currentAmount: 16000000,
    deadline: '20/11/2026',
    note: 'Nâng cấp máy phục vụ công việc thiết kế và lập trình ứng dụng',
    icon: 'laptop',
    color: '#0284C7',
    createdAt: '2026-08-01T09:00:00.000Z',
    deposits: [
      { id: 'dep-4', amount: 9000000, note: 'Tiền tiết kiệm đợt 1', date: '01/08/2026', createdAt: '2026-08-01T09:00:00.000Z' },
      { id: 'dep-5', amount: 7000000, note: 'Trích lương tháng 9', date: '05/09/2026', createdAt: '2026-09-05T09:00:00.000Z' },
    ],
  },
  {
    id: 'goal-mai-3',
    title: 'Du lịch Nhật Bản ngắm hoa anh đào',
    targetAmount: 42000000,
    currentAmount: 15000000,
    deadline: '25/03/2027',
    note: 'Hành trình Tokyo - Kyoto - Osaka 7 ngày cùng bạn bè',
    icon: 'airplane',
    color: '#EC4899',
    createdAt: '2026-09-10T10:00:00.000Z',
    deposits: [
      { id: 'dep-6', amount: 15000000, note: 'Trích quỹ du lịch năm 2026', date: '10/09/2026', createdAt: '2026-09-10T10:00:00.000Z' },
    ],
  },
  {
    id: 'goal-mai-4',
    title: 'Quỹ học chứng chỉ IELTS & UI/UX',
    targetAmount: 12000000,
    currentAmount: 12000000,
    deadline: '10/10/2026',
    note: 'Đã hoàn thành 100% mục tiêu, chuẩn bị đăng ký khóa học',
    icon: 'school',
    color: '#8B5CF6',
    createdAt: '2026-06-01T08:00:00.000Z',
    deposits: [
      { id: 'dep-7', amount: 6000000, note: 'Tiết kiệm đợt 1', date: '01/06/2026', createdAt: '2026-06-01T08:00:00.000Z' },
      { id: 'dep-8', amount: 6000000, note: 'Hoàn tất tiết kiệm đợt 2', date: '01/07/2026', createdAt: '2026-07-01T08:00:00.000Z' },
    ],
  },
];

export const INITIAL_SAVINGS_GOALS: ISavingsGoal[] = [];

const STORAGE_PREFIX = '@monett_savings_goals_';
export const SAVINGS_UPDATED_EVENT = 'monett:savings_updated';

// 1. In-memory cache đồng bộ để đọc tức thì 0ms trên cả React Native Mobile & Web
const inMemoryCache: Record<string, ISavingsGoal[]> = {};

// In-memory listeners cho cập nhật chéo giữa các widget và màn hình
const savingsListeners = new Set<() => void>();
let isNotifying = false;

export function notifySavingsUpdated(): void {
  if (isNotifying) return;
  isNotifying = true;
  try {
    savingsListeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        if (typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent(SAVINGS_UPDATED_EVENT));
        }
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  } finally {
    isNotifying = false;
  }
}

export function subscribeSavingsUpdates(callback: () => void): () => void {
  savingsListeners.add(callback);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const handleEvent = () => {
      try {
        callback();
      } catch {}
    };
    window.addEventListener(SAVINGS_UPDATED_EVENT, handleEvent);
    window.addEventListener('storage', handleEvent);
    return () => {
      savingsListeners.delete(callback);
      window.removeEventListener(SAVINGS_UPDATED_EVENT, handleEvent);
      window.removeEventListener('storage', handleEvent);
    };
  }
  return () => {
    savingsListeners.delete(callback);
  };
}

export const getSavingsStorageKey = (userId?: string, userEmail?: string): string => {
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

export const loadSavingsGoals = (userId?: string, userEmail?: string): ISavingsGoal[] => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const primaryKey = getSavingsStorageKey(userId, userEmail);

  // 1. Kiểm tra trong bộ nhớ đệm (In-Memory Cache) trước - tức thời 0ms
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
      const raw = window.localStorage.getItem(primaryKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((g) => g && g.id !== 'goal-sample-1');
          inMemoryCache[primaryKey] = cleaned;
          return cleaned;
        }
      }

      for (const fbKey of memoryCandidates) {
        const rawFb = window.localStorage.getItem(fbKey);
        if (rawFb) {
          const parsed = JSON.parse(rawFb);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed.filter((g) => g && g.id !== 'goal-sample-1');
            inMemoryCache[primaryKey] = cleaned;
            inMemoryCache[fbKey] = cleaned;
            try {
              window.localStorage.setItem(primaryKey, JSON.stringify(cleaned));
            } catch {}
            return cleaned;
          }
        }
      }

      // Quét tất cả các key localStorage có tiền tố @monett_savings_goals_
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          const val = window.localStorage.getItem(k);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.filter((g) => g && g.id !== 'goal-sample-1');
              inMemoryCache[primaryKey] = cleaned;
              return cleaned;
            }
          }
        }
      }
    } catch {}
  }

  // 3. Fallback dữ liệu mẫu nếu là tài khoản demo đặc thù
  if (normEmail === TARGET_EMAIL) {
    inMemoryCache[primaryKey] = REAL_SAVINGS_GOALS_FOR_USER;
    return REAL_SAVINGS_GOALS_FOR_USER;
  }

  return inMemoryCache[primaryKey] || [];
};

export const saveSavingsGoals = (goals: ISavingsGoal[], userId?: string, userEmail?: string): void => {
  const normEmail = (userEmail || '').trim().toLowerCase();
  const primaryKey = getSavingsStorageKey(userId, userEmail);
  const jsonStr = JSON.stringify(goals);

  // 1. Cập nhật ngay lập tức vào Memory Cache
  inMemoryCache[primaryKey] = goals;
  inMemoryCache[`${STORAGE_PREFIX}guest`] = goals;
  inMemoryCache[`${STORAGE_PREFIX}global`] = goals;
  if (normEmail) inMemoryCache[`${STORAGE_PREFIX}${normEmail}`] = goals;
  if (userId && userId.trim()) inMemoryCache[`${STORAGE_PREFIX}${userId.trim()}`] = goals;

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
  notifySavingsUpdated();
};

export async function preloadSavingsFromAsyncStorage(userId?: string, userEmail?: string): Promise<ISavingsGoal[]> {
  const asyncStorage = getAsyncStorage();
  if (!asyncStorage) return loadSavingsGoals(userId, userEmail);

  try {
    const primaryKey = getSavingsStorageKey(userId, userEmail);
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
            const cleaned = parsed.filter((g) => g && g.id !== 'goal-sample-1');
            inMemoryCache[primaryKey] = cleaned;
            inMemoryCache[`${STORAGE_PREFIX}guest`] = cleaned;
            inMemoryCache[`${STORAGE_PREFIX}global`] = cleaned;
            notifySavingsUpdated();
            return cleaned;
          }
        } catch {}
      }
    }

    try {
      const allKeys = await asyncStorage.getAllKeys();
      const savingsKeys = allKeys.filter((k: string) => k && k.startsWith(STORAGE_PREFIX));
      if (savingsKeys.length > 0) {
        const pairs = await asyncStorage.multiGet(savingsKeys);
        for (const [, v] of pairs) {
          if (v) {
            const parsed = JSON.parse(v);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.filter((g) => g && g.id !== 'goal-sample-1');
              inMemoryCache[primaryKey] = cleaned;
              inMemoryCache[`${STORAGE_PREFIX}guest`] = cleaned;
              notifySavingsUpdated();
              return cleaned;
            }
          }
        }
      }
    } catch {}
  } catch {}

  return loadSavingsGoals(userId, userEmail);
}

preloadSavingsFromAsyncStorage().catch(() => {});

/**
 * Tính số ngày còn lại đến deadline:
 * Trả về { days, text, isPast, isToday }
 */
export const calculateGoalDaysRemaining = (
  deadline?: string
): { days: number; text: string; isPast: boolean; isToday: boolean } => {
  if (!deadline || !deadline.trim()) {
    return { days: 0, text: 'Không giới hạn', isPast: false, isToday: false };
  }

  let targetDate: Date | null = null;
  const clean = deadline.trim();

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
    return { days: 0, text: 'Không giới hạn', isPast: false, isToday: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return { days: diffDays, text: `Còn ${diffDays} ngày`, isPast: false, isToday: false };
  } else if (diffDays === 0) {
    return { days: 0, text: 'Hôm nay', isPast: false, isToday: true };
  } else {
    return { days: diffDays, text: `Quá hạn ${Math.abs(diffDays)} ngày`, isPast: true, isToday: false };
  }
};
