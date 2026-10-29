import { getStoredUserId } from '../services/api';

// In-memory fallback cache for mobile native environments where localStorage is not available
const inMemoryAlertedCache: Record<string, Set<string>> = {};

/**
 * Quản lý danh sách ID nhắc nhở đã được báo hôm nay để KHÔNG BAO GIỜ lặp lại (theo từng user)
 */
export const getAlertedReminderIds = (dateStr: string, userId?: string): Set<string> => {
  const uid = userId || getStoredUserId();
  const cacheKey = `monett_alerted_reminders_${uid}_${dateStr}`;

  try {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      const raw = (window as any).localStorage.getItem(cacheKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    }
  } catch {}

  // Fallback in-memory
  if (!inMemoryAlertedCache[cacheKey]) {
    inMemoryAlertedCache[cacheKey] = new Set<string>();
  }
  return inMemoryAlertedCache[cacheKey];
};

/**
 * Đánh dấu nhắc nhở đã được phát chuông / hiển thị thông báo
 */
export const markReminderAsAlerted = (id: string, dateStr: string, userId?: string) => {
  const uid = userId || getStoredUserId();
  const cacheKey = `monett_alerted_reminders_${uid}_${dateStr}`;
  const current = getAlertedReminderIds(dateStr, uid);
  current.add(id);

  try {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      (window as any).localStorage.setItem(cacheKey, JSON.stringify(Array.from(current)));
    }
  } catch {}

  inMemoryAlertedCache[cacheKey] = current;
};

/**
 * Bỏ đánh dấu nhắc nhở khi người dùng đổi giờ hoặc hoàn thành
 */
export const unmarkReminderAsAlerted = (id: string, dateStr: string, userId?: string) => {
  const uid = userId || getStoredUserId();
  const cacheKey = `monett_alerted_reminders_${uid}_${dateStr}`;
  const current = getAlertedReminderIds(dateStr, uid);
  current.delete(id);

  try {
    if (typeof window !== 'undefined' && (window as any).localStorage) {
      (window as any).localStorage.setItem(cacheKey, JSON.stringify(Array.from(current)));
    }
  } catch {}

  inMemoryAlertedCache[cacheKey] = current;
};

/**
 * Kiểm tra xem lời nhắc đã được báo chuông hay chưa
 */
export const isReminderAlerted = (id: string, dateStr: string, userId?: string): boolean => {
  const alerted = getAlertedReminderIds(dateStr, userId);
  return alerted.has(id);
};
