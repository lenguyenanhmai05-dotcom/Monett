import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { playNotificationSound } from '../utils/soundUtils';

export type NotificationType = 'friend' | 'moment' | 'expense' | 'system' | 'budget';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO string
  read: boolean;
  avatarUrl?: string;
  iconName?: string;
  iconColor?: string;
  iconBg?: string;
  metadata?: {
    friendId?: string;
    friendName?: string;
    momentId?: string;
    amount?: number;
    category?: string;
    targetTab?: string;
  };
}

export type NewNotificationInput = Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
  id?: string;
  createdAt?: string;
  read?: boolean;
};

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  addNotification: (input: NewNotificationInput) => AppNotification;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  openNotifications: () => void;
  closeNotifications: () => void;
  toggleNotifications: () => void;
}

const STORAGE_KEY = 'monett_notifications_v1';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'seed-notif-1',
    type: 'friend',
    title: 'Kết bạn thành công! 🤝',
    message: 'Minh Anh đã chấp nhận lời mời kết bạn của bạn. Giờ hai bạn đã có thể xem khoảnh khắc chi tiêu của nhau trên Bảng tin!',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    read: false,
    iconBg: '#EDE9FE',
    iconColor: '#8B5CF6',
    metadata: {
      friendName: 'Minh Anh',
      targetTab: 'feed',
    },
  },
  {
    id: 'seed-notif-2',
    type: 'moment',
    title: 'Đã đăng khoảnh khắc chi tiêu 📸',
    message: 'Khoảnh khắc chi tiêu "Cà phê sáng Highlands" (45.000đ) của bạn đã được đăng thành công lên bảng tin bạn bè.',
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(), // 50 mins ago
    read: false,
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    metadata: {
      amount: 45000,
      category: 'Cà phê & Nước',
      targetTab: 'feed',
    },
  },
  {
    id: 'seed-notif-3',
    type: 'expense',
    title: 'Lưu nhanh chi tiêu thành công 🍜',
    message: 'Khoản chi Ăn uống "Bún chả trưa" (55.000đ) đã được tự động cộng dồn vào lịch chi tiêu ngày hôm nay.',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    read: true,
    iconBg: '#FFF1F2',
    iconColor: '#E11D48',
    metadata: {
      amount: 55000,
      category: 'Ăn uống',
      targetTab: 'home',
    },
  },
  {
    id: 'seed-notif-4',
    type: 'system',
    title: 'Duy trì chuỗi streak 5 ngày! 🔥',
    message: 'Tuyệt vời! Bạn đang duy trì thói quen ghi chép tài chính rất tốt. Cố gắng ghi chép hôm nay để đạt mốc 6 ngày nhé!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18 hours ago
    read: true,
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
    metadata: {
      targetTab: 'home',
    },
  },
  {
    id: 'seed-notif-5',
    type: 'budget',
    title: 'Cảnh báo hạn mức ngân sách ⚠️',
    message: 'Hạn mức chi tiêu tháng này của bạn đã đạt 78%. Hãy chú ý cân đối chi tiêu các ngày tới nhé.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    read: true,
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
    metadata: {
      targetTab: 'analytics',
    },
  },
];

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  addNotification: () => ({} as AppNotification),
  markAsRead: () => {},
  markAllAsRead: () => {},
  deleteNotification: () => {},
  clearAll: () => {},
  openNotifications: () => {},
  closeNotifications: () => {},
  toggleNotifications: () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc notifications từ localStorage:', e);
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [isOpen, setIsOpen] = useState(false);

  // Lưu vào localStorage mỗi khi danh sách notifications thay đổi
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      }
    } catch (e) {
      console.warn('Lỗi lưu notifications vào localStorage:', e);
    }
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const addNotification = useCallback((input: NewNotificationInput): AppNotification => {
    const newNotif: AppNotification = {
      id: input.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: input.type,
      title: input.title,
      message: input.message,
      createdAt: input.createdAt || new Date().toISOString(),
      read: input.read ?? false,
      avatarUrl: input.avatarUrl,
      iconName: input.iconName,
      iconColor: input.iconColor,
      iconBg: input.iconBg,
      metadata: input.metadata,
    };

    setNotifications((prev) => [newNotif, ...prev]);

    // Phát âm thanh thông báo dịu nhẹ
    playNotificationSound().catch(() => {});

    return newNotif;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const openNotifications = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeNotifications = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleNotifications = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isOpen,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
      openNotifications,
      closeNotifications,
      toggleNotifications,
    }),
    [
      notifications,
      unreadCount,
      isOpen,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
      openNotifications,
      closeNotifications,
      toggleNotifications,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
