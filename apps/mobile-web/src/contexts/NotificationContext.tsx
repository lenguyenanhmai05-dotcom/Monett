import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { sendBrowserNotification } from '../utils/browserNotification';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { getStreakApi, getFriendRequestsApi, getPendingEventInvitationsApi, getStoredUserId } from '../services/api';
import { getStoredEventInvitations } from '../services/eventsStorage';

export type NotificationType = 'friend' | 'moment' | 'expense' | 'system' | 'budget' | 'reminder' | 'event';

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
    type?: string;
    inviteId?: string;
    eventId?: string;
    eventTitle?: string;
    inviterName?: string;
    inviterId?: string;
    inviterEmail?: string;
    recipientId?: string;
    recipientName?: string;
    recipientEmail?: string;
    inviteStatus?: 'pending' | 'accepted' | 'declined';
    [key: string]: any;
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

/**
 * Tạo key lưu trữ localStorage riêng biệt cho từng tài khoản (userId)
 * Tránh hoàn toàn việc tài khoản bạn bè đăng nhập bị dính thông báo của tài khoản khác
 */
export const getNotificationStorageKey = (userId?: string): string => {
  const uid = userId || getStoredUserId();
  return uid && uid !== 'guest' ? `monett_notifications_${uid}` : 'monett_notifications_guest';
};

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

/**
 * Làm sạch dữ liệu thông báo:
 * - Loại bỏ hoàn toàn các thông báo giả lập mẫu (Cà phê Highlands, Bún chả trưa, cảnh báo ngân sách 78%, v.v.)
 * - Cập nhật đúng nội dung chuỗi streak của tài khoản hiện tại
 * - TUYỆT ĐỐI không tự ý chèn thông báo chi tiêu giả mạo nếu người dùng chưa từng chi tiêu
 */
export const sanitizeNotifications = (list: AppNotification[], streak: number = 1): AppNotification[] => {
  const { title: streakTitle, message: streakMessage } = getStreakNotificationContent(streak);
  
  // Lọc bỏ triệt để các thông báo mẫu / fake không thuộc về tài khoản thực tế
  const cleaned = list.filter((n) => {
    if (!n || !n.id) return false;
    // Bỏ các thông báo fake seed
    if (
      n.id === 'seed-notif-2' ||
      n.id === 'seed-notif-3' ||
      n.id === 'seed-notif-5' ||
      n.id === 'seed-notif-6' ||
      n.id === 'seed-notif-reminder'
    ) {
      return false;
    }
    // Bỏ thông báo mẫu mua cá & rau tươi
    if (n.title?.includes('mua cá & rau tươi') || n.message?.includes('mua cá & rau tươi')) {
      return false;
    }
    return true;
  });

  return cleaned.map((n) => {
    if (
      n.id === 'seed-notif-4' ||
      n.id === 'welcome-notif-streak' ||
      n.title.includes('streak') ||
      n.title.includes('chuỗi') ||
      n.title.includes('Streak')
    ) {
      return {
        ...n,
        title: streakTitle,
        message: streakMessage,
      };
    }
    if (n.id === 'seed-notif-1' && (n.message.includes('Minh Anh') || n.metadata?.friendName === 'Minh Anh')) {
      return {
        ...n,
        title: 'Chào mừng bạn đến với Monett! 🤝',
        message: 'Chào mừng bạn đến với Monett! Kết nối bạn bè qua mã QR hoặc ID để cùng nhau chia sẻ khoảnh khắc chi tiêu trên Bảng tin.',
        metadata: { ...n.metadata, friendName: 'Bạn bè' },
      };
    }
    return n;
  });
};

/**
 * Danh sách thông báo ban đầu cho tài khoản mới (Chỉ chào mừng và nhắc streak, KHÔNG có chi tiêu giả mạo)
 */
export const getInitialNotificationsForUser = (streak: number = 0): AppNotification[] => {
  const { title: streakTitle, message: streakMessage } = getStreakNotificationContent(streak);
  return [
    {
      id: 'welcome-notif-1',
      type: 'friend',
      title: 'Chào mừng bạn đến với Monett! 🤝',
      message: 'Chào mừng bạn đến với Monett! Kết nối bạn bè qua mã QR hoặc ID để cùng nhau chia sẻ khoảnh khắc chi tiêu trên Bảng tin.',
      createdAt: new Date().toISOString(),
      read: false,
      iconBg: '#EDE9FE',
      iconColor: '#8B5CF6',
      metadata: {
        friendName: 'Bạn bè',
        targetTab: 'feed',
      },
    },
    {
      id: 'welcome-notif-streak',
      type: 'system',
      title: streakTitle,
      message: streakMessage,
      createdAt: new Date().toISOString(),
      read: false,
      iconBg: '#FFFBEB',
      iconColor: '#D97706',
      metadata: {
        targetTab: 'home',
      },
    },
  ];
};

/**
 * Tải danh sách thông báo riêng của tài khoản hiện tại từ localStorage
 */
export const loadUserNotifications = (userId: string, streak: number = 1): AppNotification[] => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const userKey = getNotificationStorageKey(userId);
      const stored = window.localStorage.getItem(userKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return sanitizeNotifications(parsed, streak);
        }
      }

      // Chỉ migrate key v2 cũ nếu đây là tài khoản quản trị viên / tài khoản ban đầu
      const isAdminAccount = userId === 'mock_admin_id' || userId === 'admin_mai_05' || userId.includes('mai');
      if (isAdminAccount) {
        let legacyStored = window.localStorage.getItem('monett_notifications_v2');
        if (!legacyStored) {
          legacyStored = window.localStorage.getItem('monett_notifications_v1');
        }
        if (legacyStored) {
          const parsed = JSON.parse(legacyStored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = sanitizeNotifications(parsed, streak);
            window.localStorage.setItem(userKey, JSON.stringify(sanitized));
            return sanitized;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc notifications từ localStorage:', e);
  }
  return getInitialNotificationsForUser(streak);
};

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
  const { socket } = useSocket();
  const currentUserId = user?.id || (user as any)?._id || getStoredUserId();
  const currentStreak = typeof user?.streak === 'number' ? user.streak : 1;

  // Quản lý state gắn chặt với userId để không bao giờ bị ghi đè chéo giữa các tài khoản
  const [userScopedState, setUserScopedState] = useState<{ userId: string; notifications: AppNotification[] }>(() => {
    return {
      userId: currentUserId,
      notifications: loadUserNotifications(currentUserId, currentStreak),
    };
  });

  const [isOpen, setIsOpen] = useState(false);

  // Khi chuyển đổi người dùng (login / logout / switch account), đổi ngay sang thông báo của tài khoản đó
  useEffect(() => {
    if (userScopedState.userId !== currentUserId) {
      const userNotifs = loadUserNotifications(currentUserId, currentStreak);
      setUserScopedState({
        userId: currentUserId,
        notifications: userNotifs,
      });
    }
  }, [currentUserId, currentStreak, userScopedState.userId]);

  // Tự động đồng bộ số ngày chuỗi (streak) hiện tại từ thông tin tài khoản người dùng và backend API
  useEffect(() => {
    let mounted = true;

    const syncStreak = (streakVal: number) => {
      const { title: streakTitle, message: streakMessage } = getStreakNotificationContent(streakVal);
      setUserScopedState((prev) => {
        let changed = false;
        const next = prev.notifications.map((n) => {
          if (
            n.id === 'seed-notif-4' ||
            n.id === 'welcome-notif-streak' ||
            n.title.includes('streak') ||
            n.title.includes('chuỗi') ||
            n.title.includes('Streak')
          ) {
            if (n.title !== streakTitle || n.message !== streakMessage) {
              changed = true;
              return {
                ...n,
                title: streakTitle,
                message: streakMessage,
              };
            }
          }
          return n;
        });

        return changed ? { ...prev, notifications: next } : prev;
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

    // Hàm đồng bộ toàn diện: Lời mời kết bạn + Lời mời tham gia sự kiện (từ Backend API & Local)
    const syncAllPending = () => {
      if (!currentUserId || currentUserId === 'guest') return;

      // 1. Đồng bộ lời mời kết bạn từ Backend
      getFriendRequestsApi()
        .then((requests: any[]) => {
          if (!mounted || !Array.isArray(requests) || requests.length === 0) return;
          setUserScopedState((prev) => {
            if (prev.userId !== currentUserId) return prev;
            let next = [...prev.notifications];
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
            return changed ? { ...prev, notifications: next } : prev;
          });
        })
        .catch(() => {});

      // 2. Đồng bộ lời mời tham gia sự kiện từ Backend API
      getPendingEventInvitationsApi()
        .then((invites: any[]) => {
          if (!mounted || !Array.isArray(invites)) return;
          setUserScopedState((prev) => {
            if (prev.userId !== currentUserId) return prev;
            let next = [...prev.notifications];
            let changed = false;
            invites.forEach((inv: any) => {
              const invId = (inv._id || inv.id || '').toString();
              const notifId = `notif-invite-${invId}`;
              const exists = next.some(
                (n) => n.id === notifId || n.metadata?.inviteId === invId || (n.metadata?.eventId === inv.eventId && n.type === 'event' && !n.read)
              );
              if (!exists && inv.status === 'pending') {
                const inviterName = inv.inviterName || 'Bạn bè';
                const eventTitle = inv.eventTitle || 'Sự kiện';
                next.unshift({
                  id: notifId,
                  type: 'event',
                  title: 'Lời mời tham gia sự kiện 🏕️',
                  message: `${inviterName} đã mời bạn tham gia sự kiện "${eventTitle}". Bạn có muốn tham gia không?`,
                  createdAt: inv.createdAt || new Date().toISOString(),
                  read: false,
                  iconName: 'calendar',
                  iconColor: '#059669',
                  iconBg: '#DCFCE7',
                  metadata: {
                    type: 'event_invite',
                    inviteId: invId,
                    eventId: inv.eventId,
                    eventTitle: eventTitle,
                    inviterName: inviterName,
                    inviterId: inv.inviterId,
                    inviterEmail: inv.inviterEmail,
                    recipientId: inv.recipientId,
                    recipientName: inv.recipientName,
                    recipientEmail: inv.recipientEmail,
                    inviteStatus: 'pending',
                    targetTab: 'events',
                  },
                });
                changed = true;
              }
            });
            return changed ? { ...prev, notifications: next } : prev;
          });
        })
        .catch(() => {});

      // 3. Đồng bộ lời mời sự kiện từ Local Storage (đối với môi trường cùng trình duyệt)
      try {
        const localInvites = getStoredEventInvitations();
        const userEmailNorm = (user?.email || '').trim().toLowerCase();
        const userUidNorm = (currentUserId || '').trim().toLowerCase();

        const pendingForMe = localInvites.filter((inv) => {
          if (inv.status !== 'pending') return false;
          const invUid = (inv.recipientId || '').trim().toLowerCase();
          const invEmail = (inv.recipientEmail || '').trim().toLowerCase();
          return (userUidNorm && invUid === userUidNorm) || (userEmailNorm && invEmail === userEmailNorm);
        });

        if (pendingForMe.length > 0) {
          setUserScopedState((prev) => {
            if (prev.userId !== currentUserId) return prev;
            let next = [...prev.notifications];
            let changed = false;
            pendingForMe.forEach((inv) => {
              const notifId = `notif-invite-${inv.id}`;
              const exists = next.some((n) => n.id === notifId || n.metadata?.inviteId === inv.id);
              if (!exists) {
                next.unshift({
                  id: notifId,
                  type: 'event',
                  title: 'Lời mời tham gia sự kiện 🏕️',
                  message: `${inv.inviterName} đã mời bạn tham gia sự kiện "${inv.eventTitle}". Bạn có muốn tham gia không?`,
                  createdAt: inv.createdAt || new Date().toISOString(),
                  read: false,
                  iconName: 'calendar',
                  iconColor: '#059669',
                  iconBg: '#DCFCE7',
                  metadata: {
                    type: 'event_invite',
                    inviteId: inv.id,
                    eventId: inv.eventId,
                    eventTitle: inv.eventTitle,
                    inviterName: inv.inviterName,
                    inviterId: inv.inviterId,
                    inviterEmail: inv.inviterEmail,
                    recipientId: inv.recipientId,
                    recipientName: inv.recipientName,
                    recipientEmail: inv.recipientEmail,
                    inviteStatus: 'pending',
                    targetTab: 'events',
                  },
                });
                changed = true;
              }
            });
            return changed ? { ...prev, notifications: next } : prev;
          });
        }
      } catch (_) {}
    };

    syncAllPending();
    const pollInterval = setInterval(syncAllPending, 4000);

    const handleCustomNotifAdded = (e: any) => {
      if (e?.detail) {
        syncAllPending();
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('monett:notification_added', handleCustomNotifAdded);
      window.addEventListener('monett:event_invitations_updated', syncAllPending);
    }

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('monett:notification_added', handleCustomNotifAdded);
        window.removeEventListener('monett:event_invitations_updated', syncAllPending);
      }
    };
  }, [user?.streak, user?.email, currentUserId]);

  // Lưu vào localStorage riêng biệt của từng tài khoản mỗi khi danh sách notifications thay đổi
  useEffect(() => {
    if (userScopedState.userId) {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          const userKey = getNotificationStorageKey(userScopedState.userId);
          window.localStorage.setItem(userKey, JSON.stringify(userScopedState.notifications));
        }
      } catch (e) {
        console.warn('Lỗi lưu notifications vào localStorage:', e);
      }
    }
  }, [userScopedState]);

  // Danh sách notifications thuộc về tài khoản hiện tại
  const notifications = useMemo(() => {
    return userScopedState.userId === currentUserId ? userScopedState.notifications : [];
  }, [userScopedState, currentUserId]);

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

    setUserScopedState((prev) => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications],
    }));

    // Gửi Web Browser Notification khi có thông báo mới (không kèm âm thanh)
    if (!newNotif.read) {
      sendBrowserNotification(newNotif.title, {
        body: newNotif.message,
        playSound: false,
      });
    }

    return newNotif;
  }, []);

  // ─── REALTIME THÔNG BÁO TỪ BẠN BÈ QUA SOCKET & CROSS-TAB STORAGE ───
  useEffect(() => {
    if (!currentUserId || currentUserId === 'guest') return;

    // 1. Nhận tin nhắn mới từ bạn bè
    const handleReceiveMessage = (msg: any) => {
      if (!msg) return;
      const senderId = String(msg.sender || '');
      const receiverId = String(msg.receiver || '');
      const myIdStr = String(currentUserId);

      // Chỉ hiển thị thông báo nếu người nhận là tôi và người gửi không phải là tôi
      if (senderId && senderId !== myIdStr && (receiverId === myIdStr || !receiverId)) {
        const sName = msg.senderName || 'Bạn bè';
        const msgText = msg.text || (msg.imageUrl ? 'Đã gửi một hình ảnh 📷' : 'Đã gửi cho bạn một tin nhắn');

        addNotification({
          id: `msg-${msg._id || Date.now()}`,
          type: 'moment',
          title: `Tin nhắn mới từ ${sName} 💬`,
          message: msgText,
          avatarUrl: msg.senderAvatar,
          iconBg: '#EEF2FF',
          iconColor: '#4F46E5',
          metadata: {
            friendId: senderId,
            friendName: sName,
            targetTab: 'feed',
            openChat: true,
          },
        });
      }
    };

    // 2. Nhận thông báo bình luận, reaction bài viết hoặc nhóm trò chuyện từ bạn bè
    const handleMomentNotification = (data: any) => {
      if (!data) return;
      const cName = data.commenterName || data.creatorName || 'Bạn bè';
      const isReaction = data.type === 'reaction';

      let notifTitle = '';
      let notifMessage = '';
      let notifIconBg = '#FFF7ED';
      let notifIconColor = '#F97316';

      if (data.type === 'group_invite') {
        notifTitle = `${cName} đã thêm bạn vào nhóm 👥`;
        notifMessage = `Bạn đã được thêm vào nhóm "${data.groupName || 'Mới'}"`;
        notifIconBg = '#DCFCE7';
        notifIconColor = '#059669';
      } else if (data.type === 'group_message') {
        notifTitle = `${data.groupName ? `[${data.groupName}] ` : ''}${cName} 💬`;
        notifMessage = data.text || 'Đã gửi một tin nhắn vào nhóm';
        notifIconBg = '#EEF2FF';
        notifIconColor = '#4F46E5';
      } else if (isReaction) {
        notifTitle = `${cName} đã thả cảm xúc ${data.emoji || '❤️'}`;
        notifMessage = data.caption ? `Trên bài viết: "${data.caption}"` : 'Đã bày tỏ cảm xúc với bài viết của bạn';
        notifIconBg = '#FEF2F2';
        notifIconColor = '#EF4444';
      } else {
        notifTitle = `Bình luận mới từ ${cName} 💬`;
        notifMessage = data.text || 'Đã gửi phản hồi vào bài viết của bạn';
      }

      addNotification({
        id: `notif-${data.momentId || data.groupId || ''}-${Date.now()}`,
        type: 'moment',
        title: notifTitle,
        message: notifMessage,
        avatarUrl: data.commenterAvatar,
        iconBg: notifIconBg,
        iconColor: notifIconColor,
        metadata: {
          momentId: data.momentId,
          friendId: data.groupId || data.userId || data.commenterId,
          friendName: data.groupName || cName,
          targetTab: 'feed',
          isGroup: !!data.groupId,
          groupId: data.groupId,
          openChat: !!data.groupId,
        },
      });
    };

    if (socket) {
      socket.on('receive_message', handleReceiveMessage);
      socket.on('moment_notification', handleMomentNotification);
      socket.on('group_notification', handleMomentNotification);
    }

    // 3. Lắng nghe thông báo chéo giữa các tab trên cùng trình duyệt
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'monett_cross_tab_notif' && e.newValue) {
        try {
          const item = JSON.parse(e.newValue);
          const myIdStr = String(currentUserId);
          if (item && item.recipientId === myIdStr && item.senderId !== myIdStr) {
            if (item.type === 'message') {
              addNotification({
                id: `msg-cross-${Date.now()}`,
                type: 'moment',
                title: `Tin nhắn mới từ ${item.senderName || 'Bạn bè'} 💬`,
                message: item.text || (item.imageUrl ? 'Đã gửi một hình ảnh 📷' : 'Đã gửi cho bạn một tin nhắn'),
                avatarUrl: item.senderAvatar,
                iconBg: '#EEF2FF',
                iconColor: '#4F46E5',
                metadata: {
                  friendId: item.senderId,
                  friendName: item.senderName,
                  targetTab: 'feed',
                  openChat: true,
                },
              });
            } else if (item.type === 'moment_comment' || item.type === 'moment_reaction') {
              const isReaction = item.type === 'moment_reaction';
              addNotification({
                id: `moment-cross-${Date.now()}`,
                type: 'moment',
                title: isReaction
                  ? `${item.senderName || 'Bạn bè'} đã thả cảm xúc ${item.emoji || '❤️'}`
                  : `Bình luận mới từ ${item.senderName || 'Bạn bè'} 💬`,
                message: isReaction
                  ? (item.caption ? `Trên bài viết: "${item.caption}"` : 'Đã bày tỏ cảm xúc với bài viết của bạn')
                  : (item.text || 'Đã gửi phản hồi vào bài viết của bạn'),
                avatarUrl: item.senderAvatar,
                iconBg: isReaction ? '#FEF2F2' : '#FFF7ED',
                iconColor: isReaction ? '#EF4444' : '#F97316',
                metadata: {
                  momentId: item.momentId,
                  friendId: item.senderId,
                  friendName: item.senderName,
                  targetTab: 'feed',
                },
              });
            }
          }
        } catch {}
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', handleStorage);
    }

    return () => {
      if (socket) {
        socket.off('receive_message', handleReceiveMessage);
        socket.off('moment_notification', handleMomentNotification);
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('storage', handleStorage);
      }
    };
  }, [socket, currentUserId, addNotification]);

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
          const sentKey = `monett_daily_reminder_${currentUserId}_${todayDateStr}_${reminderTime}`;
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
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
  }, [user?.reminderTime, currentUserId, addNotification]);

  const markAsRead = useCallback((id: string) => {
    setUserScopedState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllAsRead = useCallback(() => {
    setUserScopedState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setUserScopedState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  }, []);

  const clearAll = useCallback(() => {
    setUserScopedState((prev) => ({
      ...prev,
      notifications: [],
    }));
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
