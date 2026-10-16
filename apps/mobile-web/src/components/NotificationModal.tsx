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

  const [filterType, setFilterType] = useState<'all' | NotificationType>('all');

  // Lọc thông báo theo tab
  const filteredNotifications = useMemo(() => {
    if (filterType === 'all') return notifications;
    if (filterType === 'moment') {
      return notifications.filter((n) => n.type === 'moment' || n.type === 'expense');
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

  // Tạo thông báo thử nghiệm
  const handleCreateTestNotification = () => {
    const randomChoices = [
      {
        type: 'friend' as NotificationType,
        title: 'Lời mời kết bạn mới 🤝',
        message: 'Hoàng Long vừa gửi cho bạn một lời mời kết bạn trên Monett!',
        metadata: { targetTab: 'feed' },
      },
      {
        type: 'moment' as NotificationType,
        title: 'Đăng khoảnh khắc chi tiêu thành công 📸',
        message: 'Khoảnh khắc "Ăn tối cùng hội bạn" đã được đăng lên bảng tin.',
        metadata: { targetTab: 'feed' },
      },
      {
        type: 'expense' as NotificationType,
        title: 'Đã lưu chi tiêu mới 💰',
        message: 'Khoản chi "Đi siêu thị VinMart" (320.000đ) đã được ghi nhận.',
        metadata: { targetTab: 'home' },
      },
    ];
    const picked = randomChoices[Math.floor(Math.random() * randomChoices.length)];
    addNotification(picked);
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
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.popoverCard,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
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
                  { key: 'friend', label: isVi ? 'Bạn bè' : 'Friends' },
                  { key: 'moment', label: isVi ? 'Chi tiêu' : 'Expenses' },
                  { key: 'system', label: isVi ? 'Hệ thống' : 'System' },
                ].map((tab) => {
                  const isActive = filterType === tab.key;
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
                        name="notifications-off-outline"
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
                      {isVi ? 'Không có thông báo nào' : 'No notifications'}
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: isDark ? '#94A3B8' : '#64748B' },
                      ]}
                    >
                      {isVi
                        ? 'Khi có sự kiện kết bạn, đăng khoảnh khắc hoặc cập nhật chi tiêu, thông báo sẽ hiển thị ở đây.'
                        : 'Friend activities, shared moments, and expense updates will appear here.'}
                    </Text>

                    <TouchableOpacity
                      style={styles.testBtn}
                      onPress={handleCreateTestNotification}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.testBtnText}>
                        {isVi ? 'Tạo thông báo thử nghiệm' : 'Generate Test Alert'}
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: Platform.OS === 'web' ? 'flex-start' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch',
    paddingTop: Platform.OS === 'web' ? 64 : 0,
    paddingRight: Platform.OS === 'web' ? 48 : 0,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'transparent',
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
