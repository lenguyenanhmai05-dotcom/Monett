import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { sendBrowserNotification } from '../utils/browserNotification';
import { useAuth } from './AuthContext';
import { getStreakApi, getFriendRequestsApi } from '../services/api';

export type NotificationType = 'friend' | 'moment' | 'expense' | 'system' | 'budget' | 'reminder';

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

const STORAGE_KEY = 'monett_notifications_v2';
const OLD_STORAGE_KEY = 'monett_notifications_v1';

export const getStreakNotificationContent = (streak: number) => {
  const currentStreak = Math.max(0, streak);
  const nextStreak = currentStreak + 1;
  const title = currentStreak > 0
    ? `Duy trì chuỗi streak ${currentStreak} ngày! 🔥`
    : 'Bắt đầu chuỗi streak ngay hôm nay! 🔥';
  const message = currentStreak > 0
    ? `Tuyệt vời! Bạn đang duy trì thói quen ghi chép tài chính rất tốt. Cố gắng ghi chép hôm nay để đạt mốc ${nextStreak} ngày nhé!`
    : 'Hãy ghi chép khoản chi tiêu đầu tiên hôm nay để bắt đầu chuỗi streak 1 ngày nhé!';
  return { title, message };
};

export const sanitizeNotifications = (list: AppNotification[], streak: number = 1): AppNotification[] => {
  const { title: streakTitle, message: streakMessage } = getStreakNotificationContent(streak);
  const result = list.map((n) => {
    if (n.id === 'seed-notif-4' || n.title.includes('streak') || n.title.includes('chuỗi') || n.title.includes('Streak')) {
      return {
        ...n,
        title: streakTitle,
        message: streakMessage,
      };
    }
    if (n.id === 'seed-notif-1' && (n.message.includes('Minh Anh') || n.metadata?.friendName === 'Minh Anh')) {
      return {
        ...n,
        title: 'Kết bạn thành công! 🤝',
        message: 'Chào mừng bạn đến với Monett! Kết nối bạn bè qua mã QR hoặc ID để cùng nhau chia sẻ khoảnh khắc chi tiêu trên Bảng tin.',
        metadata: { ...n.metadata, friendName: 'Bạn bè' },
      };
    }
    return n;
  });

  // Đảm bảo luôn có thông báo chi tiêu mới chưa đọc trong tab Chi tiêu
  const hasUnreadExpense = result.some((n) => n.id === 'seed-notif-6' || (n.type === 'expense' && !n.read));
  if (!hasUnreadExpense) {
    result.unshift({
      id: 'seed-notif-6',
      type: 'expense',
      title: 'Đã lưu chi tiêu mới 💰',
      message: 'Khoản chi "Ăn uống & Cà phê" (65.000đ) vừa được ghi nhận thành công vào sổ chi tiêu ngày.',
      createdAt: new Date().toISOString(),
      read: false,
      iconBg: '#FFF1F2',
      iconColor: '#E11D48',
      metadata: {
        amount: 65000,
        category: 'Ăn uống',
        targetTab: 'home',
      },
    });
  }

  // Lọc bỏ các thông báo mẫu cũ không còn dùng (ví dụ: sample reminder mua cá & rau tươi)
  return result.filter(
    (n) => n.id !== 'seed-notif-reminder' && !n.title.includes('mua cá & rau tươi') && !n.message.includes('mua cá & rau tươi')
  );
};

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'seed-notif-1',
    type: 'friend',
    title: 'Kết bạn thành công! 🤝',
    message: 'Chào mừng bạn đến với Monett! Kết nối bạn bè qua mã QR hoặc ID để cùng nhau chia sẻ khoảnh khắc chi tiêu trên Bảng tin.',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    read: false,
    iconBg: '#EDE9FE',
    iconColor: '#8B5CF6',
    metadata: {
      friendName: 'Bạn bè',
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
    title: 'Duy trì chuỗi streak 1 ngày! 🔥',
    message: 'Tuyệt vời! Bạn đang duy trì thói quen ghi chép tài chính rất tốt. Cố gắng ghi chép hôm nay để đạt mốc 2 ngày nhé!',
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
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const initialStreak = typeof user?.streak === 'number' ? user.streak : 1;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        let stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          stored = window.localStorage.getItem(OLD_STORAGE_KEY);
        }
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return sanitizeNotifications(parsed, initialStreak);
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc notifications từ localStorage:', e);
    }
    return sanitizeNotifications(INITIAL_NOTIFICATIONS, initialStreak);
  });

  const [isOpen, setIsOpen] = useState(false);

  // Tự động đồng bộ số ngày chuỗi (streak) hiện tại từ thông tin tài khoản người dùng và backend API
  useEffect(() => {
    let mounted = true;

    const syncStreak = (streakVal: number) => {
      const { title: streakTitle, message: streakMessage } = getStreakNotificationContent(streakVal);
      setNotifications((prev) => {
        let changed = false;
        const next = prev.map((n) => {
          // Cập nhật thông báo chuỗi streak với số ngày thật của tài khoản
          if (n.id === 'seed-notif-4' || n.title.includes('streak') || n.title.includes('chuỗi') || n.title.includes('Streak')) {
            if (n.title !== streakTitle || n.message !== streakMessage) {
              changed = true;
              return {
                ...n,
                title: streakTitle,
                message: streakMessage,
              };
            }
          }
          // Xóa dấu vết Minh Anh ở thông báo mẫu nếu còn lưu trong localStorage cũ
          if (n.id === 'seed-notif-1' && (n.message.includes('Minh Anh') || n.metadata?.friendName === 'Minh Anh')) {
            changed = true;
            return {
              ...n,
              title: 'Kết bạn thành công! 🤝',
              message: 'Chào mừng bạn đến với Monett! Kết nối bạn bè qua mã QR hoặc ID để cùng nhau chia sẻ khoảnh khắc chi tiêu trên Bảng tin.',
              metadata: { ...n.metadata, friendName: 'Bạn bè' },
            };
          }
          return n;
        });

        return changed ? next : prev;
      });
    };

    if (typeof user?.streak === 'number') {
      syncStreak(user.streak);
    }

    // Luôn gọi API để lấy streak chuẩn xác nhất từ MongoDB
    getStreakApi()
      .then((data: any) => {
        if (mounted && data && typeof data.streak === 'number') {
          syncStreak(data.streak);
        }
      })
      .catch(() => {});

    // Tự động đồng bộ các lời mời kết bạn đang chờ (Pending Friend Requests) từ Backend
    if (user?.id || (user as any)?._id) {
      getFriendRequestsApi()
        .then((requests: any[]) => {
          if (!mounted || !Array.isArray(requests) || requests.length === 0) return;
          setNotifications((prev) => {
            let next = [...prev];
            let changed = false;
            requests.forEach((req: any) => {
              const reqId = req._id || req.id;
              const notifId = `friend-req-${reqId}`;
              const exists = next.some((n) => n.id === notifId);
              if (!exists && req.status === 'pending') {
                const requesterName = req.requester?.fullName || 'Một người dùng';
                next.unshift({
                  id: notifId,
                  type: 'friend',
                  title: 'Lời mời kết bạn mới 🤝',
                  message: `${requesterName} vừa gửi cho bạn một lời mời kết bạn trên Monett!`,
                  createdAt: req.createdAt || new Date().toISOString(),
                  read: false,
                  iconBg: '#EDE9FE',
                  iconColor: '#8B5CF6',
                  avatarUrl: req.requester?.avatarUrl,
                  metadata: {
                    friendId: req.requester?._id || req.requester?.id,
                    friendName: requesterName,
                    targetTab: 'feed',
                  },
                });
                changed = true;
              }
            });
            return changed ? next : prev;
          });
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, [user?.streak, user?.id, (user as any)?._id]);

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

    // Gửi Web Browser Notification khi có thông báo mới (không kèm âm thanh)
    if (!newNotif.read) {
      sendBrowserNotification(newNotif.title, {
        body: newNotif.message,
        playSound: false,
      });
    }

    return newNotif;
  }, []);

  // Tự động kiểm tra và gửi thông báo nhắc nhở vào chuông khi đến giờ cài đặt (reminderTime)
  useEffect(() => {
    const reminderTime = user?.reminderTime?.trim();
    if (!reminderTime) return;

    const checkReminder = () => {
      try {
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;
        const todayDateStr = now.toISOString().split('T')[0];

        if (currentTimeStr === reminderTime) {
          const sentKey = `monett_daily_reminder_${todayDateStr}_${reminderTime}`;
          if (typeof window !== 'undefined' && window.localStorage) {
            const alreadySent = window.localStorage.getItem(sentKey);
            if (!alreadySent) {
              window.localStorage.setItem(sentKey, 'true');
              addNotification({
                type: 'system',
                title: 'Đến giờ ghi chép chi tiêu rồi! ⏰🔥',
                message: `Đã đến giờ ${reminderTime} nhắc nhở hằng ngày. Hãy dành 1 phút cập nhật chi tiêu hôm nay để duy trì chuỗi streak nhé!`,
                iconBg: '#ECFDF5',
                iconColor: '#059669',
                metadata: { targetTab: 'home' },
              });
            }
          }
        }
      } catch (e) {
        console.warn('Lỗi kiểm tra reminderTime:', e);
      }
    };

    checkReminder();
    const timer = setInterval(checkReminder, 30000);

    return () => clearInterval(timer);
  }, [user?.reminderTime, addNotification]);

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
