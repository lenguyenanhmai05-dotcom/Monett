import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, AppNotification, NotificationType } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import {
  isBrowserNotificationSupported,
  isBrowserNotificationEnabled,
  setBrowserNotificationEnabled,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from '../utils/browserNotification';
import { useAuth } from '../contexts/AuthContext';
import { acceptEventInvitation, declineEventInvitation } from '../services/eventsStorage';
import { acceptEventInvitationApi, declineEventInvitationApi, normalizeAvatarUrl } from '../services/api';

const SafeNotificationAvatar: React.FC<{
  avatarUrl?: string;
  iconConfig: { name: any; color: string; bg: string };
  style: any;
  iconBoxStyle: any;
}> = ({ avatarUrl, iconConfig, style, iconBoxStyle }) => {
  const [err, setErr] = useState(false);
  const normalized = normalizeAvatarUrl(avatarUrl);

  React.useEffect(() => {
    setErr(false);
  }, [avatarUrl]);

  if (normalized && !err) {
    return (
      <Image
        source={{ uri: normalized }}
        style={style}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={[iconBoxStyle, { backgroundColor: iconConfig.bg }]}>
      <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
    </View>
  );
};

interface NotificationModalProps {
  onNavigateToTab?: (tab: any) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ onNavigateToTab }) => {
  const { openChat } = useChat();
  const {
    notifications,
    unreadCount,
    isOpen,
    closeNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const { isDark } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const isVi = language === 'vi';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const [filterType, setFilterType] = useState<'all' | NotificationType>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [browserNotifsEnabled, setBrowserNotifsEnabled] = useState<boolean>(() => {
    return isBrowserNotificationEnabled();
  });

  // Đồng bộ trạng thái bật/tắt thông báo trình duyệt
  React.useEffect(() => {
    const handleSync = () => {
      setBrowserNotifsEnabled(isBrowserNotificationEnabled());
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('monett_browser_notif_toggle', handleSync);
      return () => {
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('monett_browser_notif_toggle', handleSync);
        }
      };
    }
  }, []);

  const handleToggleBrowserNotifications = async () => {
    if (browserNotifsEnabled) {
      setBrowserNotificationEnabled(false);
      setBrowserNotifsEnabled(false);
    } else {
      const permission = await requestBrowserNotificationPermission();
      if (permission === 'granted') {
        setBrowserNotificationEnabled(true);
        setBrowserNotifsEnabled(true);
        // Bắn thông báo ngoài màn hình chào mừng ngay lập tức
        sendBrowserNotification(
          isVi ? '🔔 Monett: Đã bật thông báo trình duyệt!' : '🔔 Monett: Desktop alerts enabled!',
          {
            body: isVi
              ? 'Tuyệt vời! Bạn sẽ nhận được thông báo ngoài màn hình ngay cả khi đang chuyển tab khác hoặc ẩn trình duyệt.'
              : 'You will now receive desktop notifications even when working in other tabs.',
          }
        );
      } else if (permission === 'denied') {
        alert(
          isVi
            ? 'Trình duyệt đang chặn quyền thông báo. Bạn vui lòng nhấn vào biểu tượng ổ khóa bên cạnh thanh địa chỉ (URL) trên trình duyệt và chọn "Cho phép" thông báo nhé!'
            : 'Notifications are blocked by your browser. Please click the lock icon in your address bar and set Notifications to Allow.'
        );
      }
    }
  };

  // Lọc thông báo theo tab
  const filteredNotifications = useMemo(() => {
    if (filterType === 'all') return notifications;
    if (filterType === 'reminder') {
      return notifications.filter((n) => n.type === 'reminder');
    }
    if (filterType === 'moment') {
      return notifications.filter((n) => n.type === 'moment' || n.type === 'expense' || n.type === 'budget');
    }
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  // Hàm tính khoảng thời gian tương đối
  const formatRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 60) return isVi ? 'Vừa xong' : 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return isVi ? `${diffMin} phút trước` : `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return isVi ? `${diffHour} giờ trước` : `${diffHour}h ago`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return isVi ? `${diffDay} ngày trước` : `${diffDay}d ago`;

      const d = new Date(isoString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (notif: AppNotification) => {
    switch (notif.type) {
      case 'reminder':
        return { name: 'alarm' as const, color: '#7C3AED', bg: isDark ? 'rgba(124, 58, 237, 0.2)' : '#EDE9FE' };
      case 'friend':
        return { name: 'people' as const, color: '#8B5CF6', bg: isDark ? 'rgba(139, 92, 246, 0.2)' : '#EDE9FE' };
      case 'moment':
        return { name: 'camera' as const, color: '#059669', bg: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' };
      case 'expense':
        return { name: 'receipt' as const, color: '#E11D48', bg: isDark ? 'rgba(225, 29, 72, 0.2)' : '#FFF1F2' };
      case 'budget':
        return { name: 'pie-chart' as const, color: '#DC2626', bg: isDark ? 'rgba(220, 38, 38, 0.2)' : '#FEF2F2' };
      case 'event':
        return { name: 'calendar' as const, color: '#059669', bg: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7' };
      case 'system':
      default:
        return { name: 'flame' as const, color: '#D97706', bg: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FFFBEB' };
    }
  };

  const handleNotificationPress = (notif: AppNotification) => {
    markAsRead(notif.id);
    closeNotifications();

    if (notif.metadata?.openChat && notif.metadata?.friendId) {
      if (notif.metadata?.isGroup) {
        openChat({
          id: notif.metadata.groupId || notif.metadata.friendId,
          name: notif.metadata.friendName || 'Nhóm trò chuyện',
          icon: 'users',
          isGroup: true,
        });
        return;
      }
      openChat({
        _id: notif.metadata.friendId,
        id: notif.metadata.friendId,
        fullName: notif.metadata.friendName || 'Bạn bè',
        avatarUrl: notif.avatarUrl,
      });
      return;
    }

    // Nếu là thông báo chi tiêu -> Bấm là nhảy ra ngay Nhật Ký Ảnh Chi Tiêu!
    const isExpenseNotif =
      notif.type === 'expense' ||
      notif.metadata?.targetTab === 'photo_journal' ||
      notif.metadata?.targetTab === 'journal' ||
      (notif.title && notif.title.toLowerCase().includes('chi tiêu')) ||
      (notif.message && notif.message.toLowerCase().includes('khoản chi'));

    if (isExpenseNotif) {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('monett:open_photo_journal'));
      }
      if (onNavigateToTab) {
        onNavigateToTab('photo_journal');
      }
      return;
    }

    if (notif.metadata?.targetTab && onNavigateToTab) {
      onNavigateToTab(notif.metadata.targetTab);
    }
  };

  // Xử lý chấp nhận lời mời tham gia sự kiện
  const handleAcceptEventInvite = async (notif: AppNotification) => {
    if (!notif.metadata?.inviteId) return;
    const invId = notif.metadata.inviteId;
    try {
      await acceptEventInvitationApi(invId);
    } catch (e) {
      console.warn('Lỗi acceptEventInvitationApi:', e);
    }
    acceptEventInvitation(invId, user ? { id: (user as any)._id || user.id, email: user.email, fullName: user.fullName } : undefined);
    markAsRead(notif.id);
    if (notif.metadata) {
      notif.metadata.inviteStatus = 'accepted';
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monett:event_invitations_updated'));
      window.dispatchEvent(new CustomEvent('monett:events_updated'));
    }
    if (onNavigateToTab) {
      closeNotifications();
      onNavigateToTab('events');
    }
  };

  // Xử lý từ chối lời mời tham gia sự kiện
  const handleDeclineEventInvite = async (notif: AppNotification) => {
    if (!notif.metadata?.inviteId) return;
    const invId = notif.metadata.inviteId;
    try {
      await declineEventInvitationApi(invId);
    } catch (e) {
      console.warn('Lỗi declineEventInvitationApi:', e);
    }
    declineEventInvitation(invId);
    markAsRead(notif.id);
    if (notif.metadata) {
      notif.metadata.inviteStatus = 'declined';
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monett:event_invitations_updated'));
    }
  };

  // Đếm số thông báo chưa đọc theo từng danh mục
  const tabCounts = useMemo(() => {
    return {
      all: notifications.filter((n) => !n.read).length,
      reminder: notifications.filter((n) => n.type === 'reminder' && !n.read).length,
      friend: notifications.filter((n) => (n.type === 'friend' || n.type === 'event') && !n.read).length,
      moment: notifications.filter((n) => (n.type === 'moment' || n.type === 'expense' || n.type === 'budget') && !n.read).length,
      system: notifications.filter((n) => n.type === 'system' && !n.read).length,
    };
  }, [notifications]);

  // Nội dung trạng thái rỗng tương ứng với từng tab
  const emptyStateContent = useMemo(() => {
    switch (filterType) {
      case 'reminder':
        return {
          title: isVi ? 'Chưa có thông báo lời nhắc' : 'No reminder notifications',
          subtitle: isVi
            ? 'Khi các mục trong "Mục nhắc nhở" đến giờ hẹn hoặc sắp diễn ra, thông báo sẽ hiển thị tại đây.'
            : 'Scheduled reminders from your planner will appear here when due.',
        };
      case 'friend':
        return {
          title: isVi ? 'Chưa có thông báo bạn bè' : 'No friend notifications',
          subtitle: isVi
            ? 'Khi có lời mời kết bạn mới, bạn bè chấp nhận kết bạn hoặc chia sẻ khoảnh khắc chi tiêu, thông báo sẽ hiển thị tại đây.'
            : 'Friend requests, accepted connections, and friend moments will appear here.',
        };
      case 'moment':
        return {
          title: isVi ? 'Chưa có thông báo chi tiêu' : 'No expense notifications',
          subtitle: isVi
            ? 'Các cập nhật ghi chép chi tiêu và khoảnh khắc đã đăng sẽ hiển thị tại đây.'
            : 'Expense logs and shared moments will appear here.',
        };
      case 'system':
        return {
          title: isVi ? 'Chưa có thông báo hệ thống' : 'No system notifications',
          subtitle: isVi
            ? 'Thông báo chuỗi streak, cảnh báo ngân sách và tin tức hệ thống sẽ hiển thị tại đây.'
            : 'Streak reminders, budget alerts, and system notices will appear here.',
        };
      default:
        return {
          title: isVi ? 'Không có thông báo nào' : 'No notifications',
          subtitle: isVi
            ? 'Khi có sự kiện kết bạn, đăng khoảnh khắc, lời nhắc hẹn hoặc cập nhật chi tiêu, thông báo sẽ hiển thị ở đây.'
            : 'Friend activities, reminders, shared moments, and expense updates will appear here.',
        };
    }
  }, [filterType, isVi]);

  if (!isOpen) return null;

  return (
    <>
      <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={closeNotifications}
    >
      <TouchableWithoutFeedback onPress={closeNotifications}>
        <View
          style={[
            styles.overlay,
            {
              justifyContent: isDesktop ? 'flex-start' : 'flex-end',
              alignItems: isDesktop ? 'flex-end' : 'stretch',
              paddingTop: isDesktop ? 64 : 0,
              paddingRight: isDesktop ? 48 : 0,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.popoverCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  width: isDesktop ? 440 : '100%',
                  maxHeight: isDesktop ? 620 : '88%',
                  borderRadius: isDesktop ? 20 : 0,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                },
              ]}
            >
              {/* Thanh kéo handle indicator trên Mobile */}
              {!isDesktop && (
                <View style={styles.handleBarWrap}>
                  <View style={[styles.handleBar, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
                </View>
              )}
              {/* Header */}
              <View
                style={[
                  styles.header,
                  { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' },
                ]}
              >
                <View style={styles.headerTitleRow}>
                  <View style={styles.headerIconCircle}>
                    <Ionicons name="notifications" size={17} color="#059669" />
                  </View>
                  <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                    {isVi ? 'Thông báo' : 'Notifications'}
                  </Text>
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadgePill}>
                      <Text style={styles.unreadBadgePillText}>
                        {unreadCount} {isVi ? 'mới' : 'new'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.headerActions}>
                  {unreadCount > 0 && (
                    <TouchableOpacity
                      onPress={markAllAsRead}
                      style={[
                        styles.headerActionBtn,
                        { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                      ]}
                      activeOpacity={0.7}
                      accessibilityLabel={isVi ? 'Đánh dấu đã đọc tất cả' : 'Mark all as read'}
                    >
                      <Ionicons name="checkmark-done" size={16} color="#059669" />
                      <Text style={[styles.headerActionText, { color: '#059669' }]}>
                        {isVi ? 'Đã đọc hết' : 'Read all'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {notifications.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowClearConfirm(true)}
                      style={[
                        styles.headerActionBtn,
                        { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                      ]}
                      activeOpacity={0.7}
                      accessibilityLabel={isVi ? 'Xóa toàn bộ' : 'Clear all'}
                    >
                      <Ionicons name="trash-outline" size={15} color="#94A3B8" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={closeNotifications}
                    style={styles.closeBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* BANNER CÔNG TẮC BẬT / TẮT THÔNG BÁO TRÌNH DUYỆT (DESKTOP NOTIFICATIONS) */}
              <View
                style={[
                  styles.browserNotifBanner,
                  {
                    backgroundColor: isDark
                      ? (browserNotifsEnabled ? 'rgba(5, 150, 105, 0.15)' : '#1E293B')
                      : (browserNotifsEnabled ? '#F0FDF4' : '#F8FAFC'),
                    borderColor: isDark
                      ? (browserNotifsEnabled ? 'rgba(5, 150, 105, 0.4)' : '#334155')
                      : (browserNotifsEnabled ? '#A7F3D0' : '#E2E8F0'),
                  },
                ]}
              >
                <View style={styles.browserNotifLeft}>
                  <View
                    style={[
                      styles.browserNotifIconCircle,
                      {
                        backgroundColor: browserNotifsEnabled
                          ? (isDark ? 'rgba(5, 150, 105, 0.25)' : '#DCFCE7')
                          : (isDark ? '#334155' : '#E2E8F0'),
                      },
                    ]}
                  >
                    <Ionicons
                      name={browserNotifsEnabled ? 'notifications' : 'notifications-off-outline'}
                      size={16}
                      color={browserNotifsEnabled ? '#059669' : '#64748B'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.browserNotifTitle,
                          { color: isDark ? '#F8FAFC' : '#0F172A' },
                        ]}
                      >
                        {isVi ? 'Thông báo trình duyệt' : 'Desktop Notifications'}
                      </Text>
                      <View
                        style={[
                          styles.browserNotifStatusBadge,
                          {
                            backgroundColor: browserNotifsEnabled
                              ? (isDark ? 'rgba(5, 150, 105, 0.3)' : '#DCFCE7')
                              : (isDark ? 'rgba(100, 116, 139, 0.2)' : '#F1F5F9'),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.browserNotifStatusText,
                            { color: browserNotifsEnabled ? '#059669' : '#64748B' },
                          ]}
                        >
                          {browserNotifsEnabled ? (isVi ? 'Đang bật' : 'ON') : (isVi ? 'Đang tắt' : 'OFF')}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.browserNotifSub,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                      numberOfLines={1}
                    >
                      {browserNotifsEnabled
                        ? (isVi ? 'Hiện popup ngoài màn hình khi có lời nhắc & chi tiêu' : 'Sends desktop alerts for reminders and expenses')
                        : (isVi ? 'Bật để hiện thông báo ra màn hình điện thoại & máy tính' : 'Enable to get alerts on phone & desktop')}
                    </Text>
                  </View>
                </View>

                {/* Nút công tắc Switch Toggle Bật / Tắt */}
                <TouchableOpacity
                  style={[
                    styles.switchTrack,
                    browserNotifsEnabled
                      ? styles.switchTrackOn
                      : (isDark ? styles.switchTrackOffDark : styles.switchTrackOff),
                  ]}
                  onPress={handleToggleBrowserNotifications}
                  activeOpacity={0.8}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: browserNotifsEnabled }}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      browserNotifsEnabled ? styles.switchThumbOn : styles.switchThumbOff,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {/* Filter Tabs */}
              <View
                style={[
                  styles.filterRow,
                  { borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' },
                ]}
              >
                {[
                  { key: 'all', label: isVi ? 'Tất cả' : 'All' },
                  { key: 'reminder', label: isVi ? 'Lời nhắc' : 'Reminders' },
                  { key: 'friend', label: isVi ? 'Bạn bè' : 'Friends' },
                  { key: 'moment', label: isVi ? 'Chi tiêu' : 'Expenses' },
                  { key: 'system', label: isVi ? 'Hệ thống' : 'System' },
                ].map((tab) => {
                  const isActive = filterType === tab.key;
                  const unreadInTab = tabCounts[tab.key as keyof typeof tabCounts] || 0;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => setFilterType(tab.key as any)}
                      style={[
                        styles.filterChip,
                        isActive && styles.filterChipActive,
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: isDark ? '#94A3B8' : '#64748B' },
                          isActive && styles.filterChipTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                      {unreadInTab > 0 && (
                        <View
                          style={[
                            styles.tabBadge,
                            isActive && styles.tabBadgeActive,
                            { backgroundColor: isActive ? 'rgba(255, 255, 255, 0.3)' : (isDark ? 'rgba(5, 150, 105, 0.3)' : '#DCFCE7') },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tabBadgeText,
                              isActive && styles.tabBadgeTextActive,
                              { color: isActive ? '#FFFFFF' : '#059669' },
                            ]}
                          >
                            {unreadInTab}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Notification List */}
              <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {filteredNotifications.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View
                      style={[
                        styles.emptyIconCircle,
                        { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' },
                      ]}
                    >
                      <Ionicons
                        name={
                          filterType === 'friend'
                            ? 'people-outline'
                            : filterType === 'reminder'
                            ? 'alarm-outline'
                            : 'notifications-off-outline'
                        }
                        size={36}
                        color={isDark ? '#475569' : '#94A3B8'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.emptyTitle,
                        { color: isDark ? '#F8FAFC' : '#0F172A' },
                      ]}
                    >
                      {emptyStateContent.title}
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                    >
                      {emptyStateContent.subtitle}
                    </Text>
                  </View>
                ) : (
                  filteredNotifications.map((notif) => {
                    const iconConfig = getNotificationIcon(notif);
                    return (
                      <TouchableOpacity
                        key={notif.id}
                        onPress={() => handleNotificationPress(notif)}
                        style={[
                          styles.notifCard,
                          {
                            backgroundColor: isDark
                              ? notif.read
                                ? 'transparent'
                                : 'rgba(5, 150, 105, 0.12)'
                              : notif.read
                              ? 'transparent'
                              : '#F0FDF4',
                            borderBottomColor: isDark ? '#1E293B' : '#F8FAFC',
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        {/* Icon hoặc Avatar với fallback an toàn */}
                        <SafeNotificationAvatar
                          avatarUrl={notif.avatarUrl}
                          iconConfig={iconConfig}
                          style={styles.notifAvatar}
                          iconBoxStyle={styles.notifIconBox}
                        />

                        {/* Nội dung thông báo */}
                        <View style={styles.notifBody}>
                          <View style={styles.notifTitleRow}>
                            <Text
                              style={[
                                styles.notifTitle,
                                {
                                  color: isDark ? '#F8FAFC' : '#0F172A',
                                  fontWeight: notif.read ? '700' : '900',
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {notif.title}
                            </Text>
                            {!notif.read && <View style={styles.unreadDot} />}
                          </View>

                          <Text
                            style={[
                              styles.notifMessage,
                              {
                                color: isDark ? '#CBD5E1' : '#475569',
                              },
                            ]}
                            numberOfLines={3}
                          >
                            {notif.message}
                          </Text>

                          {/* Nút chấp nhận / từ chối lời mời sự kiện */}
                          {notif.metadata?.type === 'event_invite' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4 }}>
                              {notif.metadata?.inviteStatus === 'accepted' ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>
                                    {isVi ? 'Đã tham gia sự kiện' : 'Joined Event'}
                                  </Text>
                                </View>
                              ) : notif.metadata?.inviteStatus === 'declined' ? (
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8' }}>
                                  {isVi ? 'Đã từ chối' : 'Declined'}
                                </Text>
                              ) : (
                                <>
                                  <TouchableOpacity
                                    style={{
                                      backgroundColor: '#059669',
                                      paddingHorizontal: 14,
                                      paddingVertical: 6,
                                      borderRadius: 10,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleAcceptEventInvite(notif);
                                    }}
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                                      {isVi ? 'Chấp nhận' : 'Accept'}
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={{
                                      backgroundColor: isDark ? '#334155' : '#F1F5F9',
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 10,
                                    }}
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      handleDeclineEventInvite(notif);
                                    }}
                                    activeOpacity={0.8}
                                  >
                                    <Text style={{ color: isDark ? '#CBD5E1' : '#64748B', fontSize: 12.5, fontWeight: '600' }}>
                                      {isVi ? 'Từ chối' : 'Decline'}
                                    </Text>
                                  </TouchableOpacity>
                                </>
                              )}
                            </View>
                          )}

                          <View style={styles.notifMetaRow}>
                            <Text
                              style={[
                                styles.notifTime,
                                { color: isDark ? '#64748B' : '#94A3B8' },
                              ]}
                            >
                              {formatRelativeTime(notif.createdAt)}
                            </Text>

                            {(notif.metadata?.targetTab || notif.type === 'expense' || notif.title?.includes('chi tiêu')) && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleNotificationPress(notif);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Text style={styles.notifLinkHint}>
                                  {isVi ? 'Chạm để xem ›' : 'Tap to view ›'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Nút xóa từng mục */}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          style={styles.notifDeleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle-outline" size={17} color="#94A3B8" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>

    {/* MODAL XÁC NHẬN XÓA TẤT CẢ THÔNG BÁO */}
    <Modal
      visible={showClearConfirm}
      transparent
      animationType="fade"
      onRequestClose={() => setShowClearConfirm(false)}
    >
      <TouchableOpacity
        style={styles.confirmBackdrop}
        activeOpacity={1}
        onPress={() => setShowClearConfirm(false)}
      >
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            {/* Icon thùng rác đỏ */}
            <View
              style={[
                styles.confirmIconWrap,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' },
              ]}
            >
              <Ionicons name="trash" size={26} color="#EF4444" />
            </View>

            {/* Tiêu đề & nội dung hỏi người dùng */}
            <Text
              style={[
                styles.confirmTitle,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
            >
              {isVi ? 'Xóa tất cả thông báo?' : 'Delete all notifications?'}
            </Text>
            <Text
              style={[
                styles.confirmSubtitle,
                { color: isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              {isVi
                ? `Bạn có chắc chắn muốn xóa toàn bộ ${notifications.length} thông báo không? Thao tác này không thể hoàn tác.`
                : `Are you sure you want to delete all ${notifications.length} notifications? This action cannot be undone.`}
            </Text>

            {/* Hàng nút lựa chọn */}
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[
                  styles.confirmCancelBtn,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                  },
                ]}
                onPress={() => setShowClearConfirm(false)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.confirmCancelBtnText,
                    { color: isDark ? '#E2E8F0' : '#475569' },
                  ]}
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() => {
                  clearAll();
                  setShowClearConfirm(false);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="trash" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmDeleteBtnText}>
                  {isVi ? 'Xóa tất cả' : 'Delete All'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  </>
  );
};

const styles = StyleSheet.create({
  handleBarWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 99999,
  },
  popoverCard: {
    width: Platform.OS === 'web' ? 440 : '100%',
    maxHeight: Platform.OS === 'web' ? 620 : '85%',
    borderRadius: Platform.OS === 'web' ? 20 : 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  browserNotifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  browserNotifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
    gap: 10,
  },
  browserNotifIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  browserNotifTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  browserNotifStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  browserNotifStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  browserNotifSub: {
    fontSize: 11,
    marginTop: 1.5,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: '#059669',
  },
  switchTrackOff: {
    backgroundColor: '#CBD5E1',
  },
  switchTrackOffDark: {
    backgroundColor: '#475569',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  switchThumbOff: {
    transform: [{ translateX: 0 }],
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  unreadBadgePill: {
    backgroundColor: '#059669',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: '#059669',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  notifAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginTop: 2,
    backgroundColor: '#E2E8F0',
  },
  listContainer: {
    maxHeight: 440,
  },
  listContent: {
    paddingVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 290,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
    position: 'relative',
  },
  notifIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifBody: {
    flex: 1,
    paddingRight: 18,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 13.5,
    flex: 1,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#059669',
    marginLeft: 6,
  },
  notifMessage: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 6,
  },
  notifMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  notifLinkHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  notifDeleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100002,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
