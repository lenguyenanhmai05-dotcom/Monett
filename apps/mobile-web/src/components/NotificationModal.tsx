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

interface NotificationModalProps {
  onNavigateToTab?: (tab: any) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ onNavigateToTab }) => {
  const {
    notifications,
    unreadCount,
    isOpen,
    closeNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addNotification,
  } = useNotifications();

  const { isDark } = useTheme();
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const [filterType, setFilterType] = useState<'all' | NotificationType>('all');

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
      case 'system':
      default:
        return { name: 'flame' as const, color: '#D97706', bg: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FFFBEB' };
    }
  };

  const handleNotificationPress = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.metadata?.targetTab && onNavigateToTab) {
      closeNotifications();
      onNavigateToTab(notif.metadata.targetTab);
    }
  };

  // Đếm số thông báo chưa đọc theo từng danh mục
  const tabCounts = useMemo(() => {
    return {
      all: notifications.filter((n) => !n.read).length,
      reminder: notifications.filter((n) => n.type === 'reminder' && !n.read).length,
      friend: notifications.filter((n) => n.type === 'friend' && !n.read).length,
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
          btnText: isVi ? 'Tạo thử thông báo lời nhắc' : 'Generate Reminder Alert',
        };
      case 'friend':
        return {
          title: isVi ? 'Chưa có thông báo bạn bè' : 'No friend notifications',
          subtitle: isVi
            ? 'Khi có lời mời kết bạn mới, bạn bè chấp nhận kết bạn hoặc chia sẻ khoảnh khắc chi tiêu, thông báo sẽ hiển thị tại đây.'
            : 'Friend requests, accepted connections, and friend moments will appear here.',
          btnText: isVi ? 'Tạo thử thông báo bạn bè' : 'Generate Friend Alert',
        };
      case 'moment':
        return {
          title: isVi ? 'Chưa có thông báo chi tiêu' : 'No expense notifications',
          subtitle: isVi
            ? 'Các cập nhật ghi chép chi tiêu và khoảnh khắc đã đăng sẽ hiển thị tại đây.'
            : 'Expense logs and shared moments will appear here.',
          btnText: isVi ? 'Tạo thử thông báo chi tiêu' : 'Generate Expense Alert',
        };
      case 'system':
        return {
          title: isVi ? 'Chưa có thông báo hệ thống' : 'No system notifications',
          subtitle: isVi
            ? 'Thông báo chuỗi streak, cảnh báo ngân sách và tin tức hệ thống sẽ hiển thị tại đây.'
            : 'Streak reminders, budget alerts, and system notices will appear here.',
          btnText: isVi ? 'Tạo thử thông báo hệ thống' : 'Generate System Alert',
        };
      default:
        return {
          title: isVi ? 'Không có thông báo nào' : 'No notifications',
          subtitle: isVi
            ? 'Khi có sự kiện kết bạn, đăng khoảnh khắc, lời nhắc hẹn hoặc cập nhật chi tiêu, thông báo sẽ hiển thị ở đây.'
            : 'Friend activities, reminders, shared moments, and expense updates will appear here.',
          btnText: isVi ? 'Tạo thông báo thử nghiệm' : 'Generate Test Alert',
        };
    }
  }, [filterType, isVi]);

  // Tạo thông báo thử nghiệm phù hợp với tab đang chọn
  const handleCreateTestNotification = () => {
    if (filterType === 'reminder') {
      const reminderChoices = [
        {
          type: 'reminder' as NotificationType,
          title: 'Nhắc nhở: Xíu nữa đi chợ mua cá & rau tươi ⏰',
          message: 'Đã đến giờ nhắc nhở (17:30 - Báo trước 10 phút). Đừng quên ghé chợ mua cá và rau tươi tươi ngon nhé!',
          iconBg: '#EDE9FE',
          iconColor: '#7C3AED',
          metadata: { targetTab: 'home' },
        },
        {
          type: 'reminder' as NotificationType,
          title: 'Nhắc nhở: Đóng tiền phòng & điện nước 🏠',
          message: 'Đã đến hạn nộp tiền trọ theo lịch hẹn. Bạn hãy kiểm tra hóa đơn và thanh toán nhé!',
          iconBg: '#EDE9FE',
          iconColor: '#7C3AED',
          metadata: { targetTab: 'home' },
        },
      ];
      addNotification(reminderChoices[Math.floor(Math.random() * reminderChoices.length)]);
    } else if (filterType === 'friend') {
      const friendChoices = [
        {
          type: 'friend' as NotificationType,
          title: 'Lời mời kết bạn mới 🤝',
          message: 'Hoàng Long vừa gửi cho bạn một lời mời kết bạn trên Monett!',
          iconBg: '#EDE9FE',
          iconColor: '#8B5CF6',
          metadata: { targetTab: 'feed' },
        },
        {
          type: 'friend' as NotificationType,
          title: 'Kết bạn thành công! 🎉',
          message: 'Phương Thảo đã đồng ý lời mời kết bạn. Giờ hai bạn có thể xem khoảnh khắc chi tiêu của nhau!',
          iconBg: '#EDE9FE',
          iconColor: '#8B5CF6',
          metadata: { targetTab: 'feed' },
        },
        {
          type: 'friend' as NotificationType,
          title: 'Bạn bè vừa chia sẻ khoảnh khắc 📸',
          message: 'Minh Quân vừa chia sẻ khoảnh khắc "Cà phê sáng Highlands" (45.000đ) trên Bảng tin bạn bè.',
          iconBg: '#EDE9FE',
          iconColor: '#8B5CF6',
          metadata: { targetTab: 'feed' },
        },
      ];
      addNotification(friendChoices[Math.floor(Math.random() * friendChoices.length)]);
    } else if (filterType === 'moment') {
      const expenseChoices = [
        {
          type: 'moment' as NotificationType,
          title: 'Đăng khoảnh khắc chi tiêu thành công 📸',
          message: 'Khoảnh khắc "Ăn tối cùng hội bạn" đã được đăng lên bảng tin.',
          iconBg: '#ECFDF5',
          iconColor: '#059669',
          metadata: { targetTab: 'feed' },
        },
        {
          type: 'expense' as NotificationType,
          title: 'Đã lưu chi tiêu mới 💰',
          message: 'Khoản chi "Đi siêu thị VinMart" (320.000đ) đã được ghi nhận.',
          iconBg: '#FFF1F2',
          iconColor: '#E11D48',
          metadata: { targetTab: 'home' },
        },
      ];
      addNotification(expenseChoices[Math.floor(Math.random() * expenseChoices.length)]);
    } else if (filterType === 'system') {
      const systemChoices = [
        {
          type: 'system' as NotificationType,
          title: 'Duy trì chuỗi streak 3 ngày! 🔥',
          message: 'Tuyệt vời! Bạn đang duy trì thói quen ghi chép tài chính rất tốt.',
          iconBg: '#FFFBEB',
          iconColor: '#D97706',
          metadata: { targetTab: 'home' },
        },
        {
          type: 'budget' as NotificationType,
          title: 'Cảnh báo hạn mức ngân sách ⚠️',
          message: 'Chi tiêu tháng này của bạn đã đạt 80% hạn mức mục tiêu.',
          iconBg: '#FEF2F2',
          iconColor: '#DC2626',
          metadata: { targetTab: 'analytics' },
        },
      ];
      addNotification(systemChoices[Math.floor(Math.random() * systemChoices.length)]);
    } else {
      const allChoices = [
        {
          type: 'reminder' as NotificationType,
          title: 'Nhắc nhở: Xíu nữa đi chợ mua cá & rau tươi ⏰',
          message: 'Đã đến giờ nhắc nhở (17:30 - Báo trước 10 phút). Đừng quên ghé chợ mua cá và rau tươi tươi ngon nhé!',
          iconBg: '#EDE9FE',
          iconColor: '#7C3AED',
          metadata: { targetTab: 'home' },
        },
        {
          type: 'friend' as NotificationType,
          title: 'Lời mời kết bạn mới 🤝',
          message: 'Hoàng Long vừa gửi cho bạn một lời mời kết bạn trên Monett!',
          iconBg: '#EDE9FE',
          iconColor: '#8B5CF6',
          metadata: { targetTab: 'feed' },
        },
        {
          type: 'moment' as NotificationType,
          title: 'Đăng khoảnh khắc chi tiêu thành công 📸',
          message: 'Khoảnh khắc "Ăn tối cùng hội bạn" đã được đăng lên bảng tin.',
          iconBg: '#ECFDF5',
          iconColor: '#059669',
          metadata: { targetTab: 'feed' },
        },
        {
          type: 'expense' as NotificationType,
          title: 'Đã lưu chi tiêu mới 💰',
          message: 'Khoản chi "Đi siêu thị VinMart" (320.000đ) đã được ghi nhận.',
          iconBg: '#FFF1F2',
          iconColor: '#E11D48',
          metadata: { targetTab: 'home' },
        },
      ];
      addNotification(allChoices[Math.floor(Math.random() * allChoices.length)]);
    }
  };

  if (!isOpen) return null;

  return (
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
                      onPress={clearAll}
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

                    <TouchableOpacity
                      style={styles.testBtn}
                      onPress={handleCreateTestNotification}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.testBtnText}>
                        {emptyStateContent.btnText}
                      </Text>
                    </TouchableOpacity>
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
                        {/* Icon hoặc Avatar */}
                        {notif.avatarUrl ? (
                          <Image
                            source={{ uri: notif.avatarUrl }}
                            style={styles.notifAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              styles.notifIconBox,
                              { backgroundColor: iconConfig.bg },
                            ]}
                          >
                            <Ionicons
                              name={iconConfig.name}
                              size={18}
                              color={iconConfig.color}
                            />
                          </View>
                        )}

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

                          <View style={styles.notifMetaRow}>
                            <Text
                              style={[
                                styles.notifTime,
                                { color: isDark ? '#64748B' : '#94A3B8' },
                              ]}
                            >
                              {formatRelativeTime(notif.createdAt)}
                            </Text>

                            {notif.metadata?.targetTab && (
                              <Text style={styles.notifLinkHint}>
                                {isVi ? 'Chạm để xem ›' : 'Tap to view ›'}
                              </Text>
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

              {/* Footer */}
              <View
                style={[
                  styles.footer,
                  {
                    borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
                    backgroundColor: isDark ? '#0B1120' : '#FAFAFA',
                  },
                ]}
              >
                <Text style={styles.footerHint}>
                  {isVi
                    ? '💡 Tự động thông báo khi có bạn bè hoặc chi tiêu mới'
                    : '💡 Auto-notifies on new friend or expense events'}
                </Text>
                <TouchableOpacity
                  onPress={handleCreateTestNotification}
                  style={styles.footerSimulateBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.footerSimulateText}>
                    {isVi ? '+ Thử thông báo' : '+ Test'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    flex: 1,
  },
  footerSimulateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  footerSimulateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
});
