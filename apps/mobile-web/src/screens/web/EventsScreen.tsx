import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  MonettEvent,
  EventExpenseItem,
  loadEventsFromStorage,
  saveEventsToStorage,
  resetToRealEvents,
  REAL_EVENTS_FOR_USER,
  EventInvitation,
  getPendingEventInvitationsForUser,
  acceptEventInvitation,
  declineEventInvitation,
} from '../../services/eventsStorage';
import {
  getEventsApi,
  createEventApi,
  updateEventApi,
  deleteEventApi,
  getPendingEventInvitationsApi,
  acceptEventInvitationApi,
  declineEventInvitationApi,
} from '../../services/api';
import { CreateEventModal } from '../../components/CreateEventModal';
import { EventDetailModal } from '../../components/EventDetailModal';
import { EventDetailScreen } from './EventDetailScreen';

interface EventsScreenProps {
  onNavigateToTab?: (tab: any) => void;
  onBack?: () => void;
}

// Pastel icon backgrounds for category icon boxes
const ICON_PALETTES = [
  '#FEF3C7', // Pastel Amber
  '#E0E7FF', // Pastel Indigo
  '#DCFCE7', // Pastel Emerald
  '#FCE7F3', // Pastel Pink
  '#E0F2FE', // Pastel Sky
  '#F3E8FF', // Pastel Purple
];

export const EventsScreen: React.FC<EventsScreenProps> = ({ onNavigateToTab, onBack }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const userEmail = (user as any)?.email || '';
  const userId = (user as any)?.id || (user as any)?._id || '';
  const isVi = language === 'vi';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigateToTab) {
      onNavigateToTab('home');
    }
  };

  // Events state - chỉ nạp dữ liệu thật nếu tài khoản là lenguyenanhmai113@gmail.com
  const [events, setEvents] = useState<MonettEvent[]>(() =>
    loadEventsFromStorage(userEmail, userId)
  );

  // Khi tài khoản người dùng thay đổi hoặc khi khởi động: nạp từ API & Local Storage
  const fetchAllEvents = useCallback(async () => {
    try {
      const apiList = await getEventsApi();
      if (Array.isArray(apiList) && apiList.length > 0) {
        setEvents(apiList);
        saveEventsToStorage(apiList, userEmail, userId);
        return;
      }
    } catch {}
    setEvents(loadEventsFromStorage(userEmail, userId));
  }, [userEmail, userId]);

  useEffect(() => {
    fetchAllEvents();
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const handleEventsUpdated = (e: any) => {
        if (e?.detail && Array.isArray(e.detail) && e.detail.length > 0) {
          setEvents(e.detail);
        }
      };
      window.addEventListener('monett:events_updated', handleEventsUpdated);
      return () => {
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('monett:events_updated', handleEventsUpdated);
        }
      };
    }
  }, [fetchAllEvents]);

  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected event for dedicated Detail Page view
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Pending event invitations for this user
  const [pendingInvitations, setPendingInvitations] = useState<EventInvitation[]>([]);

  // Tự động làm mới và đồng bộ lời mời sự kiện từ cả Backend API và Local Storage
  const refreshInvites = useCallback(async () => {
    const localList = getPendingEventInvitationsForUser(userId, userEmail);
    try {
      const apiInvites = await getPendingEventInvitationsApi();
      if (Array.isArray(apiInvites)) {
        const combined = [...apiInvites];
        localList.forEach((loc) => {
          const exists = combined.some(
            (c: any) => (c._id && c._id === loc.id) || (c.id && c.id === loc.id) || (c.eventId === loc.eventId && c.status === 'pending')
          );
          if (!exists) combined.push(loc);
        });
        setPendingInvitations(combined as any);
        return;
      }
    } catch {}
    setPendingInvitations(localList);
  }, [userId, userEmail]);

  useEffect(() => {
    refreshInvites();
    const interval = setInterval(refreshInvites, 3500);

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('monett:event_invitations_updated', refreshInvites);
      return () => {
        clearInterval(interval);
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('monett:event_invitations_updated', refreshInvites);
        }
      };
    }
    return () => clearInterval(interval);
  }, [refreshInvites]);

  const handleAcceptInvite = async (invite: EventInvitation | any) => {
    const inviteId = invite.id || invite._id;
    try {
      await acceptEventInvitationApi(inviteId);
    } catch (e) {
      console.warn('Lỗi gọi acceptEventInvitationApi:', e);
    }

    const joinedEvent = acceptEventInvitation(inviteId, {
      id: userId,
      email: userEmail,
      fullName: (user as any)?.name || (user as any)?.fullName || 'Ánh Mai',
    });

    // Làm mới danh sách sự kiện từ API & Local
    await fetchAllEvents();
    refreshInvites();

    if (joinedEvent || invite.eventData) {
      const targetId = joinedEvent?.id || invite.eventId || invite.eventData?.id;
      if (targetId) setSelectedEventId(targetId);

      addNotification({
        type: 'event',
        title: isVi ? 'Tham gia thành công 🎉' : 'Joined Event 🎉',
        message: isVi
          ? `Bạn đã tham gia sự kiện "${invite.eventTitle || joinedEvent?.title}" cùng ${invite.inviterName}!`
          : `You joined "${invite.eventTitle || joinedEvent?.title}" invited by ${invite.inviterName}!`,
        iconBg: '#DCFCE7',
        iconColor: '#059669',
      });
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monett:event_invitations_updated'));
        window.dispatchEvent(new CustomEvent('monett:events_updated'));
      } catch (_) {}
    }
  };

  const handleDeclineInvite = async (invite: EventInvitation | any) => {
    const inviteId = invite.id || invite._id;
    try {
      await declineEventInvitationApi(inviteId);
    } catch (e) {
      console.warn('Lỗi gọi declineEventInvitationApi:', e);
    }

    declineEventInvitation(inviteId);
    refreshInvites();

    addNotification({
      type: 'event',
      title: isVi ? 'Đã từ chối lời mời' : 'Invite Declined',
      message: isVi
        ? `Đã từ chối lời mời tham gia "${invite.eventTitle}".`
        : `Declined invite for "${invite.eventTitle}".`,
      iconBg: '#F3F4F6',
      iconColor: '#6B7280',
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('monett:event_invitations_updated'));
      } catch (_) {}
    }
  };

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MonettEvent | null>(null);

  // Selected event for Detail View Modal ("Chi tiết →")
  const [selectedDetailEvent, setSelectedDetailEvent] = useState<MonettEvent | null>(null);

  // Quick Add Expense Modal to a specific event
  const [expenseModalEvent, setExpenseModalEvent] = useState<MonettEvent | null>(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmountStr, setExpenseAmountStr] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Ăn uống');
  const [expenseCategoryIcon, setExpenseCategoryIcon] = useState('🍜');

  // Sync to storage on state change cho đúng tài khoản
  useEffect(() => {
    saveEventsToStorage(events, userEmail, userId);
  }, [events, userEmail, userId]);

  // Keep selectedDetailEvent in sync with events state
  useEffect(() => {
    if (selectedDetailEvent) {
      const updated = events.find((e) => e.id === selectedDetailEvent.id);
      if (updated) setSelectedDetailEvent(updated);
    }
  }, [events]);

  // Statistics
  const totalEvents = events.length;
  const ongoingCount = events.filter((e) => e.status === 'ongoing').length;
  const upcomingCount = events.filter((e) => e.status === 'upcoming').length;
  const completedCount = events.filter((e) => e.status === 'completed').length;
  const totalBudget = events.reduce((sum, e) => sum + (e.estimatedBudget || 0), 0);
  const totalSpent = events.reduce((sum, e) => sum + (e.spentAmount || 0), 0);
  const budgetSpentRatio = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const activeEvent = events.find((e) => e.status === 'ongoing');

  // Smart Category Emoji detection
  const getEventEmoji = (title: string, location?: string) => {
    const t = (title + ' ' + (location || '')).toLowerCase();
    if (t.includes('đà lạt') || t.includes('thông') || t.includes('núi') || t.includes('rừng')) return '🌲';
    if (t.includes('sinh nhật') || t.includes('birthday') || t.includes('tiệc') || t.includes('bbq')) return '🎂';
    if (t.includes('cắm trại') || t.includes('camping') || t.includes('trekking') || t.includes('cát tiên')) return '🏕️';
    if (t.includes('biển') || t.includes('phú quốc') || t.includes('vũng tàu') || t.includes('nha trang') || t.includes('hè')) return '🏖️';
    if (t.includes('xe') || t.includes('roadtrip') || t.includes('phượt')) return '🚗';
    if (t.includes('bay') || t.includes('du lịch') || t.includes('tour') || t.includes('flight')) return '✈️';
    if (t.includes('hội') || t.includes('cưới') || t.includes('wedding')) return '🎉';
    return '✨';
  };

  // Filtered events
  const filteredEvents = events.filter((e) => {
    if (filterStatus !== 'all' && e.status !== filterStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchLoc = e.location ? e.location.toLowerCase().includes(q) : false;
      const matchDesc = e.description ? e.description.toLowerCase().includes(q) : false;
      return matchTitle || matchLoc || matchDesc;
    }
    return true;
  });

  // Handle Create or Edit Event
  const handleSaveEvent = (eventData: {
    title: string;
    startDate: string;
    endDate?: string;
    location?: string;
    estimatedBudget: number;
    description?: string;
    status?: 'upcoming' | 'ongoing' | 'completed';
  }) => {
    if (editingEvent) {
      // Update existing
      setEvents((prev) =>
        prev.map((item) =>
          item.id === editingEvent.id
            ? {
                ...item,
                ...eventData,
                status: eventData.status || item.status,
              }
            : item
        )
      );

      addNotification({
        type: 'moment',
        title: isVi ? 'Cập nhật sự kiện ✏️' : 'Event Updated ✏️',
        message: isVi
          ? `Đã cập nhật thông tin sự kiện "${eventData.title}"`
          : `Event "${eventData.title}" has been updated.`,
        iconBg: '#EDE9FE',
        iconColor: '#7C3AED',
      });
      setEditingEvent(null);
    } else {
      // Create new
      const newEvent: MonettEvent = {
        id: `evt-${Date.now()}`,
        ...eventData,
        spentAmount: 0,
        expenses: [],
        status: eventData.status || 'ongoing', // Default new event to selected or ongoing
        createdAt: new Date().toISOString(),
      };

      setEvents((prev) => [newEvent, ...prev]);

      addNotification({
        type: 'moment',
        title: isVi ? 'Sự kiện mới 🗓️' : 'New Event 🗓️',
        message: isVi
          ? `Đã tạo thành công sự kiện "${eventData.title}" với ngân sách ${eventData.estimatedBudget.toLocaleString('vi-VN')} đ`
          : `Successfully created event "${eventData.title}" with budget ${eventData.estimatedBudget.toLocaleString('vi-VN')} đ`,
        iconBg: '#DCFCE7',
        iconColor: '#059669',
      });
    }
  };

  // Handle Delete Event
  const handleDeleteEvent = (id: string, title: string) => {
    const confirmMsg = isVi
      ? `Bạn có chắc chắn muốn xóa sự kiện "${title}" không?`
      : `Are you sure you want to delete event "${title}"?`;

    // Web compatible confirm
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(confirmMsg)) return;
    }

    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (selectedDetailEvent?.id === id) setSelectedDetailEvent(null);

    addNotification({
      type: 'moment',
      title: isVi ? 'Đã xóa sự kiện 🗑️' : 'Event Deleted 🗑️',
      message: isVi ? `Đã xóa sự kiện "${title}".` : `Event "${title}" has been deleted.`,
      iconBg: '#FEE2E2',
      iconColor: '#DC2626',
    });
  };

  // Handle status toggle (upcoming -> ongoing -> completed -> upcoming)
  const handleToggleStatus = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const nextStatus: Record<'upcoming' | 'ongoing' | 'completed', 'upcoming' | 'ongoing' | 'completed'> = {
          upcoming: 'ongoing',
          ongoing: 'completed',
          completed: 'upcoming',
        };
        const status = nextStatus[e.status];
        return { ...e, status };
      })
    );
  };

  // Handle Quick Add Expense into an event
  const handleAddExpenseToEvent = () => {
    if (!expenseModalEvent) return;
    const cleanTitle = expenseTitle.trim();
    if (!cleanTitle) {
      alert(isVi ? 'Vui lòng nhập tên chi tiêu.' : 'Please enter expense name.');
      return;
    }
    const amount = parseInt(expenseAmountStr.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) {
      alert(isVi ? 'Vui lòng nhập số tiền hợp lệ.' : 'Please enter a valid amount.');
      return;
    }

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    const newExpense: EventExpenseItem = {
      id: `ee-${Date.now()}`,
      title: cleanTitle,
      amount,
      category: expenseCategory,
      categoryIcon: expenseCategoryIcon,
      date: `${dd}/${mm}/${yyyy}`,
      createdAt: new Date().toISOString(),
    };

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== expenseModalEvent.id) return ev;
        const updatedExpenses = [newExpense, ...ev.expenses];
        const updatedSpent = updatedExpenses.reduce((sum, item) => sum + item.amount, 0);
        return {
          ...ev,
          expenses: updatedExpenses,
          spentAmount: updatedSpent,
        };
      })
    );

    addNotification({
      type: 'expense',
      title: isVi ? 'Ghi nhận chi tiêu sự kiện 💸' : 'Event Expense Logged 💸',
      message: isVi
        ? `Đã thêm ${amount.toLocaleString('vi-VN')} đ ("${cleanTitle}") vào sự kiện "${expenseModalEvent.title}"`
        : `Added ${amount.toLocaleString('vi-VN')} đ ("${cleanTitle}") to event "${expenseModalEvent.title}"`,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
    });

    setExpenseModalEvent(null);
    setExpenseTitle('');
    setExpenseAmountStr('');
  };

  // Color tokens
  const pageBg = isDark ? '#0B0F17' : '#F5F0E8';
  const cardBg = isDark ? '#121A27' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E7DECF';
  const textPrimary = isDark ? '#F8FAFC' : '#111827';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const tagBg = isDark ? '#1C2638' : '#F1F5F9';

  // If an event is selected, render the dedicated Event Detail Page
  if (selectedEventId) {
    const activeEvent = events.find((e) => e.id === selectedEventId || (e as any)._id === selectedEventId);
    if (activeEvent) {
      return (
        <EventDetailScreen
          event={activeEvent}
          onBack={() => setSelectedEventId(null)}
          onUpdateEvent={(updatedEvent) => {
            const targetId = updatedEvent.id || (updatedEvent as any)._id;
            setEvents((prev) => {
              const next = prev.map((e) => {
                const eid = e.id || (e as any)._id;
                return (eid === targetId || e.id === updatedEvent.id) ? updatedEvent : e;
              });
              saveEventsToStorage(next, userEmail, userId);
              return next;
            });
            if (targetId && !targetId.startsWith('evt-')) {
              updateEventApi(targetId, {
                expenses: updatedEvent.expenses,
                spentAmount: updatedEvent.spentAmount,
                incomeAmount: updatedEvent.incomeAmount,
              }).catch(() => {});
            }
          }}
          onDeleteEvent={(id, title) => {
            handleDeleteEvent(id, title);
            setSelectedEventId(null);
          }}
          onOpenCreateNewEvent={() => {
            setEditingEvent(null);
            setIsCreateModalOpen(true);
          }}
        />
      );
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: pageBg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= HEADER SECTION ================= */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {isVi ? 'Sự kiện' : 'Events'}
            </Text>
          </View>
          {isDesktop && (
            <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
              {isVi
                ? 'Lên kế hoạch, theo dõi ngân sách chi tiêu và ghi nhận hóa đơn cho từng sự kiện'
                : 'Plan, track budgets, and manage expenses for every trip & special occasion'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={isDark ? '#F8FAFC' : '#221D18'} />
        </TouchableOpacity>
      </View>

      {/* Action Button: Nút Tạo Sự Kiện Mới / + Thêm ở dưới tiêu đề (giống trang Tích lũy) */}
      <TouchableOpacity
        style={styles.createEventBtn}
        onPress={() => {
          setEditingEvent(null);
          setIsCreateModalOpen(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={16} color="#064E3B" style={{ marginRight: 6 }} />
        <Text style={styles.createEventBtnText}>
          {isVi ? 'Thêm' : 'New'}
        </Text>
      </TouchableOpacity>

      {/* ================= PENDING EVENT INVITATIONS BANNER ================= */}
      {pendingInvitations.length > 0 && (
        <View style={styles.inviteBannerContainer}>
          {pendingInvitations.map((inv) => (
            <View
              key={inv.id}
              style={[
                styles.inviteBannerCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FEF9C3',
                  borderColor: isDark ? '#F59E0B' : '#FDE047',
                },
              ]}
            >
              <View style={styles.inviteBannerLeft}>
                <View style={styles.inviteBannerIconWrap}>
                  <Ionicons name="mail-unread" size={20} color="#D97706" />
                </View>
                <View style={styles.inviteBannerTextWrap}>
                  <Text style={[styles.inviteBannerTitle, { color: textPrimary }]}>
                    {isVi ? 'Lời mời tham gia sự kiện mới 📩' : 'New Event Invitation 📩'}
                  </Text>
                  <Text style={[styles.inviteBannerDesc, { color: textSecondary }]}>
                    <Text style={{ fontWeight: '700', color: textPrimary }}>{inv.inviterName}</Text>{' '}
                    {isVi ? 'đã mời bạn tham gia sự kiện' : 'invited you to join'}{' '}
                    <Text style={{ fontWeight: '700', color: textPrimary }}>"{inv.eventTitle}"</Text>
                    {inv.eventLocation ? ` • 📍 ${inv.eventLocation}` : ''}
                    {inv.eventStartDate ? ` (${inv.eventStartDate})` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.inviteBannerActions}>
                <TouchableOpacity
                  style={styles.inviteAcceptBtn}
                  onPress={() => handleAcceptInvite(inv)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.inviteAcceptBtnText}>
                    {isVi ? 'Chấp nhận & Vào sự kiện' : 'Accept & Join'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.inviteDeclineBtn, { borderColor: isDark ? '#475569' : '#D1D5DB' }]}
                  onPress={() => handleDeclineInvite(inv)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.inviteDeclineBtnText, { color: textSecondary }]}>
                    {isVi ? 'Từ chối' : 'Decline'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ================= OVERVIEW STATS CARDS ================= */}
      {isDesktop ? (
        /* ================= GIAO DIỆN WEB: 3 Ô NGANG HÀNG ================= */
        <View style={styles.statsGrid}>
          {/* Card 1: ĐANG / SẮP TỚI */}
          <View
            style={[
              styles.statCard,
              styles.cardDark,
              isDark && {
                backgroundColor: '#0D2018',
                borderColor: 'rgba(16, 185, 129, 0.35)',
                shadowColor: '#000',
              },
            ]}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.cardDarkLabel}>
                {isVi ? 'ĐANG / SẮP TỚI' : 'ACTIVE / UPCOMING'}
              </Text>
              <View style={[styles.cardDarkBadge, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.2)' }]}>
                <Text style={[styles.cardDarkBadgeText, isDark && { color: '#34D399' }]}>{totalEvents}</Text>
              </View>
            </View>
            <Text style={styles.cardDarkAmount}>
              {totalEvents} <Text style={{ fontSize: 18, fontWeight: '700' }}>{isVi ? 'sự kiện' : 'events'}</Text>
            </Text>
            <View style={[styles.cardDarkDivider, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]} />
            <Text style={styles.cardDarkSub}>
              {isVi
                ? `${ongoingCount} đang diễn ra • ${upcomingCount} sắp tới • ${completedCount} đã xong`
                : `${ongoingCount} ongoing • ${upcomingCount} upcoming • ${completedCount} done`}
            </Text>
          </View>

          {/* Card 2: Đang diễn ra */}
          <View
            style={[
              styles.statCard,
              styles.cardMint,
              isDark && {
                backgroundColor: '#0F261D',
                borderColor: 'rgba(16, 185, 129, 0.3)',
              },
            ]}
          >
            <View style={styles.cardHeaderLeftWrap}>
              <Ionicons name="sparkles" size={17} color={isDark ? '#34D399' : '#047857'} style={{ marginRight: 6 }} />
              <Text style={[styles.cardMintLabel, isDark && { color: '#34D399' }]}>
                {isVi ? 'Đang diễn ra' : 'Ongoing now'}
              </Text>
            </View>
            <Text style={[styles.cardMintAmount, isDark && { color: '#F8FAFC' }]}>
              {ongoingCount}
            </Text>
            <Text style={[styles.cardMintSub, isDark && { color: '#6EE7B7' }]}>
              {isVi ? 'sự kiện đang hoạt động' : 'active events'}
            </Text>
          </View>

          {/* Card 3: Ngân sách */}
          <View
            style={[
              styles.statCard,
              styles.cardSky,
              isDark && {
                backgroundColor: '#241B0E',
                borderColor: 'rgba(245, 158, 11, 0.3)',
              },
            ]}
          >
            <View style={styles.cardHeaderLeftWrap}>
              <Ionicons name="time-outline" size={17} color={isDark ? '#FBBF24' : '#B45309'} style={{ marginRight: 6 }} />
              <Text style={[styles.cardSkyLabel, isDark && { color: '#FBBF24' }]}>
                {isVi ? 'Ngân sách' : 'Budget'}
              </Text>
            </View>
            <Text style={[styles.cardSkyAmount, isDark && { color: '#F8FAFC' }]}>
              {totalBudget.toLocaleString('vi-VN')} <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FBBF24' : '#92400E' }}>đ</Text>
            </Text>
            <Text style={[styles.cardSkySub, isDark && { color: '#FDE68A' }]}>
              {isVi ? 'đang + sắp tới' : 'active + upcoming'}
            </Text>
          </View>
        </View>
      ) : (
        /* ================= GIAO DIỆN MOBILE: GIỮ NGUYÊN (1 Ô TRÊN + 2 Ô DƯỚI) ================= */
        <View style={styles.statsContainer}>
          {/* Card 1: ĐANG / SẮP TỚI (#221D18 - Hẹp lại / thon gọn) */}
          <View style={[
            styles.statCard,
            styles.cardDark,
            styles.cardDarkSlim,
            isDark && {
              backgroundColor: '#0D2018',
              borderColor: 'rgba(16, 185, 129, 0.35)',
              shadowColor: '#000',
            }
          ]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.cardDarkLabel}>
                {isVi ? 'ĐANG / SẮP TỚI' : 'ACTIVE / UPCOMING'}
              </Text>
              <View style={[styles.cardDarkBadge, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.2)' }]}>
                <Text style={[styles.cardDarkBadgeText, isDark && { color: '#34D399' }]}>{totalEvents}</Text>
              </View>
            </View>
            <Text style={styles.cardDarkAmount}>
              {totalEvents} <Text style={{ fontSize: 18, fontWeight: '700' }}>{isVi ? 'sự kiện' : 'events'}</Text>
            </Text>
            <View style={[styles.cardDarkDivider, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]} />
            <Text style={styles.cardDarkSub}>
              {isVi
                ? `${ongoingCount} đang diễn ra • ${upcomingCount} sắp tới • ${completedCount} đã xong`
                : `${ongoingCount} ongoing • ${upcomingCount} upcoming • ${completedCount} done`}
            </Text>
          </View>

          {/* Gộp Tab 2 & Tab 3: Bên trái là Tab 3 (Ngân sách), bên phải là Tab 2 (Đang diễn ra) */}
          <View style={styles.twoCardsRow}>
            {/* Bên trái: Tab 3 (Ngân sách - thẻ vàng) */}
            <View style={[
              styles.statCard,
              styles.cardSky,
              styles.halfCard,
              isDark && {
                backgroundColor: '#241B0E',
                borderColor: 'rgba(245, 158, 11, 0.3)',
              }
            ]}>
              <View style={styles.cardHeaderLeftWrap}>
                <Ionicons name="time-outline" size={16} color={isDark ? '#FBBF24' : '#B45309'} style={{ marginRight: 5 }} />
                <Text style={[styles.cardSkyLabel, isDark && { color: '#FBBF24' }]} numberOfLines={1}>
                  {isVi ? 'Ngân sách' : 'Budget'}
                </Text>
              </View>
              <Text style={[styles.halfCardAmount, isDark && { color: '#F8FAFC' }]} numberOfLines={1}>
                {totalBudget.toLocaleString('vi-VN')} <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#FBBF24' : '#92400E' }}>đ</Text>
              </Text>
              <Text style={[styles.cardSkySub, isDark && { color: '#FDE68A' }]} numberOfLines={1}>
                {isVi ? 'đang + sắp tới' : 'active + upcoming'}
              </Text>
            </View>

            {/* Bên phải: Tab 2 (Đang diễn ra - thẻ xanh mint) */}
            <View style={[
              styles.statCard,
              styles.cardMint,
              styles.halfCard,
              isDark && {
                backgroundColor: '#0F261D',
                borderColor: 'rgba(16, 185, 129, 0.3)',
              }
            ]}>
              <View style={styles.cardHeaderLeftWrap}>
                <Ionicons name="sparkles" size={15} color={isDark ? '#34D399' : '#047857'} style={{ marginRight: 5 }} />
                <Text style={[styles.cardMintLabel, isDark && { color: '#34D399' }]} numberOfLines={1}>
                  {isVi ? 'Đang diễn ra' : 'Ongoing now'}
                </Text>
              </View>
              <Text style={[styles.halfCardAmountMint, isDark && { color: '#F8FAFC' }]} numberOfLines={1}>
                {ongoingCount}
              </Text>
              <Text style={[styles.cardMintSub, isDark && { color: '#6EE7B7' }]} numberOfLines={1}>
                {isVi ? 'sự kiện active' : 'active events'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ================= SEARCH & STATUS FILTERS ================= */}
      <View style={[styles.filterBar, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {/* Search Input */}
        <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
          <Ionicons name="search-outline" size={18} color={textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={isVi ? 'Tìm kiếm theo tên sự kiện, địa điểm, ghi chú...' : 'Search by title, location, notes...'}
            placeholderTextColor={textSecondary}
            style={[styles.searchInput, { color: textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterPillsRow}>
          {[
            { key: 'all', labelVi: 'Tất cả', labelEn: 'All', count: totalEvents, activeBg: isDark ? '#059669' : '#221D18', activeColor: '#FFFFFF', activeBorder: isDark ? '#059669' : '#221D18' },
            { key: 'ongoing', labelVi: 'Đang diễn ra', labelEn: 'Ongoing', count: ongoingCount, activeBg: isDark ? 'rgba(16, 185, 129, 0.25)' : '#D2EADA', activeColor: isDark ? '#34D399' : '#064E3B', activeBorder: isDark ? '#059669' : '#BFDECA' },
            { key: 'upcoming', labelVi: 'Sắp tới', labelEn: 'Upcoming', count: upcomingCount, activeBg: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7', activeColor: isDark ? '#FBBF24' : '#B45309', activeBorder: isDark ? '#D97706' : '#FDE68A' },
            {
              key: 'completed',
              labelVi: 'Hoàn thành',
              labelEn: 'Completed',
              count: completedCount,
              activeBg: isDark ? 'rgba(168, 85, 247, 0.25)' : '#E3E1EB',
              activeColor: isDark ? '#C084FC' : '#4C1D95',
              activeBorder: isDark ? '#7C3AED' : '#CEC8DC',
            },
          ].map((tab) => {
            const isActive = filterStatus === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                  {
                    backgroundColor: isActive ? tab.activeBg : (isDark ? '#0B0F17' : '#FFFFFF'),
                    borderWidth: 1,
                    borderColor: isActive ? tab.activeBorder : (isDark ? 'rgba(255, 255, 255, 0.08)' : cardBorder),
                  },
                ]}
                onPress={() => setFilterStatus(tab.key as any)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                    { color: isActive ? tab.activeColor : textSecondary, fontWeight: isActive ? '700' : '600' },
                  ]}
                >
                  {isVi ? tab.labelVi : tab.labelEn} ({tab.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ================= DANH SÁCH SỰ KIỆN ================= */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeading, { color: textPrimary }]}>
          {isVi ? 'Danh sách' : 'Event List'}
        </Text>
      </View>

      {filteredEvents.length === 0 ? (
        <View style={[styles.emptyStateCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="calendar-clear-outline" size={40} color="#059669" />
          </View>
          <Text style={[styles.emptyTitle, { color: textPrimary }]}>
            {isVi ? 'Không tìm thấy sự kiện nào' : 'No Events Found'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
            {searchQuery
              ? isVi
                ? 'Không có sự kiện nào khớp với từ khóa tìm kiếm.'
                : 'No events match your search term.'
              : isVi
              ? 'Hãy bấm "Thêm" để bắt đầu lên kế hoạch cho chuyến đi hoặc dịp đặc biệt!'
              : 'Click "New" to start planning your next trip or occasion!'}
          </Text>
          <TouchableOpacity
            style={styles.emptyCreateBtn}
            onPress={() => {
              setEditingEvent(null);
              setIsCreateModalOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.emptyCreateBtnText}>
              {isVi ? 'Tạo sự kiện ngay' : 'Create Event Now'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.eventsGrid, !isDesktop && styles.eventsGridMobile]}>
          {filteredEvents.map((evt) => {
            const statusConfig = {
              ongoing: {
                labelVi: 'Đang diễn ra',
                labelEn: 'Ongoing',
                cardBg: isDark ? '#111B27' : '#D2EADA',
                cardBorder: isDark ? 'rgba(16, 185, 129, 0.35)' : '#BFDECA',
                badgeBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#FFFFFF',
                badgeColor: isDark ? '#34D399' : '#166534',
              },
              upcoming: {
                labelVi: 'Sắp tới',
                labelEn: 'Upcoming',
                cardBg: isDark ? '#181A24' : '#FEF3C7',
                cardBorder: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
                badgeBg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FFFFFF',
                badgeColor: isDark ? '#FBBF24' : '#B45309',
              },
              completed: {
                labelVi: 'Hoàn thành',
                labelEn: 'Completed',
                cardBg: isDark ? '#161522' : '#E3E1EB',
                cardBorder: isDark ? 'rgba(168, 85, 247, 0.35)' : '#CEC8DC',
                badgeBg: isDark ? 'rgba(168, 85, 247, 0.2)' : '#FFFFFF',
                badgeColor: isDark ? '#C084FC' : '#6B21A8',
              },
            }[evt.status] || {
              labelVi: 'Đang diễn ra',
              labelEn: 'Ongoing',
              cardBg: isDark ? '#111B27' : '#D2EADA',
              cardBorder: isDark ? 'rgba(16, 185, 129, 0.35)' : '#BFDECA',
              badgeBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#FFFFFF',
              badgeColor: isDark ? '#34D399' : '#166534',
            };

            return (
              <TouchableOpacity
                key={evt.id}
                style={[
                  styles.compactCard,
                  !isDesktop && styles.compactCardMobile,
                  {
                    backgroundColor: statusConfig.cardBg,
                    borderColor: statusConfig.cardBorder,
                  },
                ]}
                onPress={() => setSelectedEventId(evt.id)}
                activeOpacity={0.88}
              >
                {/* 1. Top Row: Icon Box (Xanh lá đậm #064E3B) + Title/Date + Status Badge */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.cardIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#064E3B' }]}>
                      <Ionicons name="sparkles" size={17} color={isDark ? "#34D399" : "#A7F3D0"} />
                    </View>

                    <View style={styles.cardTitleWrap}>
                      <Text style={[styles.cardTitle, { color: isDark ? '#F8FAFC' : '#111827' }]} numberOfLines={1}>
                        {evt.title}
                      </Text>
                      <Text style={[styles.cardDateRange, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        {evt.startDate}
                        {evt.endDate ? ` → ${evt.endDate}` : ''}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleStatus(evt.id);
                    }}
                    activeOpacity={0.75}
                    style={[styles.statusBadge, { backgroundColor: statusConfig.badgeBg }]}
                    accessibilityLabel={`Trạng thái: ${isVi ? statusConfig.labelVi : statusConfig.labelEn}. Bấm để đổi`}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusConfig.badgeColor }]}>
                      {isVi ? statusConfig.labelVi : statusConfig.labelEn}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 2. Middle Row: Location */}
                {evt.location ? (
                  <View style={styles.cardLocationRow}>
                    <Text style={[styles.locationIcon, { color: isDark ? '#94A3B8' : '#64748B' }]}>◎</Text>
                    <Text style={[styles.locationText, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                      {evt.location}
                    </Text>
                  </View>
                ) : (
                  <View style={{ height: 12 }} />
                )}

                {/* 3. Bottom Row: Chi | Thu | Ngân sách & Chi tiết → */}
                <View style={styles.cardBottomRow}>
                  <View style={{ gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={[styles.cardBudgetSimple, { color: isDark ? '#94A3B8' : '#64748B', fontSize: 12 }]}>
                        {isVi ? 'Chi: ' : 'Spent: '}
                        <Text style={{ fontWeight: '800', color: '#DC2626' }}>
                          {(evt.spentAmount || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </Text>
                      {(evt.incomeAmount || 0) > 0 ? (
                        <Text style={[styles.cardBudgetSimple, { color: isDark ? '#94A3B8' : '#64748B', fontSize: 12 }]}>
                          {isVi ? 'Thu: ' : 'Income: '}
                          <Text style={{ fontWeight: '800', color: '#059669' }}>
                            {(evt.incomeAmount || 0).toLocaleString('vi-VN')} đ
                          </Text>
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.cardBudgetSimple, { color: isDark ? '#94A3B8' : '#64748B', fontSize: 11.5 }]}>
                      {isVi ? 'Ngân sách: ' : 'Budget: '}
                      <Text style={{ fontWeight: '700', color: isDark ? '#F8FAFC' : '#111827' }}>
                        {(evt.estimatedBudget || 0).toLocaleString('vi-VN')} đ
                      </Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedEventId(evt.id)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Chi tiết sự kiện ${evt.title}`}
                    style={styles.detailLinkWrap}
                  >
                    <Text style={[styles.detailLinkText, { color: isDark ? '#34D399' : '#047857', fontWeight: '800' }]}>
                      {isVi ? 'Chi tiết →' : 'Details →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ================= MODAL XEM CHI TIẾT SỰ KIỆN (KHI BẤM "CHI TIẾT →") ================= */}
      <EventDetailModal
        visible={!!selectedDetailEvent}
        event={selectedDetailEvent}
        onClose={() => setSelectedDetailEvent(null)}
        onEdit={(ev) => {
          setEditingEvent(ev);
          setIsCreateModalOpen(true);
          setSelectedDetailEvent(null);
        }}
        onDelete={(id, title) => {
          handleDeleteEvent(id, title);
          setSelectedDetailEvent(null);
        }}
        onToggleStatus={(id) => {
          handleToggleStatus(id);
        }}
        onAddExpense={(ev) => {
          setExpenseModalEvent(ev);
          setExpenseTitle('');
          setExpenseAmountStr('');
        }}
      />

      {/* ================= MODAL TẠO / SỬA SỰ KIỆN (MATCHING 100% SCREENSHOT) ================= */}
      <CreateEventModal
        visible={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        editingEvent={editingEvent}
      />

      {/* ================= MODAL NHANH: THÊM CHI TIÊU CHO SỰ KIỆN ================= */}
      {expenseModalEvent && (
        <Modal
          visible={!!expenseModalEvent}
          transparent
          animationType="fade"
          onRequestClose={() => setExpenseModalEvent(null)}
        >
          <TouchableWithoutFeedback onPress={() => setExpenseModalEvent(null)}>
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={[styles.expenseDialogCard, { backgroundColor: cardBg }]}>
                  {/* Header */}
                  <View style={[styles.dialogHeader, { borderBottomColor: cardBorder }]}>
                    <View>
                      <Text style={[styles.dialogTitle, { color: textPrimary }]}>
                        {isVi ? 'Thêm chi tiêu sự kiện' : 'Add Event Expense'}
                      </Text>
                      <Text style={[styles.dialogSub, { color: textSecondary }]}>
                        {expenseModalEvent.title}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setExpenseModalEvent(null)}
                      style={[styles.closeCircleBtn, { backgroundColor: tagBg }]}
                    >
                      <Ionicons name="close" size={18} color={textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Body */}
                  <View style={styles.expenseDialogBody}>
                    {/* Tên khoản chi */}
                    <View style={styles.modalFormGroup}>
                      <Text style={[styles.modalLabel, { color: textPrimary }]}>
                        {isVi ? 'Tên khoản chi' : 'Expense Title'} *
                      </Text>
                      <TextInput
                        value={expenseTitle}
                        onChangeText={setExpenseTitle}
                        placeholder={isVi ? 'Vé cáp treo, Ăn tối buffet, Homestay...' : 'Dinner, Cable car, Hotel...'}
                        placeholderTextColor={textSecondary}
                        style={[styles.modalInput, { backgroundColor: tagBg, color: textPrimary }]}
                        autoFocus
                      />
                    </View>

                    {/* Số tiền */}
                    <View style={styles.modalFormGroup}>
                      <Text style={[styles.modalLabel, { color: textPrimary }]}>
                        {isVi ? 'Số tiền (VNĐ)' : 'Amount (VND)'} *
                      </Text>
                      <TextInput
                        value={
                          expenseAmountStr
                            ? parseInt(expenseAmountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN')
                            : ''
                        }
                        onChangeText={(txt) => setExpenseAmountStr(txt.replace(/\D/g, ''))}
                        placeholder="0"
                        placeholderTextColor={textSecondary}
                        keyboardType="numeric"
                        style={[styles.modalInput, { backgroundColor: tagBg, color: textPrimary, fontSize: 18, fontWeight: '700' }]}
                      />
                    </View>

                    {/* Chọn Danh mục nhanh */}
                    <View style={styles.modalFormGroup}>
                      <Text style={[styles.modalLabel, { color: textPrimary }]}>
                        {isVi ? 'Danh mục' : 'Category'}
                      </Text>
                      <View style={styles.categoryPillsWrap}>
                        {[
                          { name: 'Ăn uống', icon: '🍜' },
                          { name: 'Cà phê & Nước', icon: '☕' },
                          { name: 'Di chuyển & Xăng', icon: '🛵' },
                          { name: 'Vé tham quan', icon: '🎫' },
                          { name: 'Khách sạn', icon: '🏨' },
                          { name: 'Mua sắm', icon: '🛍️' },
                          { name: 'Khác', icon: '✨' },
                        ].map((cat) => {
                          const isSelected = expenseCategory === cat.name;
                          return (
                            <TouchableOpacity
                              key={cat.name}
                              onPress={() => {
                                setExpenseCategory(cat.name);
                                setExpenseCategoryIcon(cat.icon);
                              }}
                              style={[
                                styles.catPill,
                                isSelected && styles.catPillSelected,
                                { backgroundColor: isSelected ? '#DCFCE7' : tagBg },
                              ]}
                            >
                              <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
                              <Text
                                style={[
                                  styles.catPillText,
                                  isSelected && { color: '#059669', fontWeight: '700' },
                                  { color: textPrimary },
                                ]}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  {/* Footer */}
                  <View style={[styles.dialogFooter, { borderTopColor: cardBorder }]}>
                    <TouchableOpacity
                      onPress={() => setExpenseModalEvent(null)}
                      style={styles.cancelTextBtn}
                    >
                      <Text style={[styles.cancelBtnText, { color: textSecondary }]}>
                        {isVi ? 'Huỷ' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleAddExpenseToEvent}
                      style={[styles.saveExpenseBtn, { backgroundColor: '#059669' }]}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.saveExpenseBtnText}>
                        {isVi ? 'Ghi nhận chi tiêu' : 'Save Expense'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140, // Đảm bảo không bị thanh bottom tab che ("cụt ngủn")
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  headerLeft: {
    flex: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  createEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#98E4B0',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#82D99E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  createEventBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
  // 3 Overview Cards Layout (Giống Tích lũy)
  statsContainer: {
    marginBottom: 20,
    gap: 12,
  },
  cardDarkSlim: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    minHeight: 96,
    width: '100%',
  },
  twoCardsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  halfCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  halfCardAmount: {
    fontSize: 21,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: -0.4,
    marginTop: 6,
    marginBottom: 2,
  },
  halfCardAmountMint: {
    fontSize: 21,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.4,
    marginTop: 6,
    marginBottom: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    width: '100%',
  },
  statsGridMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    minHeight: 96,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardMobile: {
    width: '100%',
    minHeight: 96,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  // Card 1: Xanh lá đậm sang trọng (#064E3B - Đồng bộ nhận diện thương hiệu)
  cardDark: {
    backgroundColor: '#064E3B',
    borderColor: '#065F46',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  cardDarkLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.6,
  },
  cardDarkBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cardDarkBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064E3B',
  },
  cardDarkAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 4,
  },
  cardDarkDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginVertical: 4,
  },
  cardDarkSub: {
    fontSize: 11.5,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  // Card 2: Pastel Mint Green (#BEE3C2)
  cardMint: {
    backgroundColor: '#BEE3C2',
    borderColor: '#A7F3D0',
  },
  cardHeaderLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardMintLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#047857',
  },
  cardMintAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.5,
    marginTop: 2,
    marginBottom: 4,
  },
  cardMintSub: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#065F46',
  },
  // Card 3: Pastel Yellow nhạt nhạt thanh lịch (#FEF3C7)
  cardSky: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  cardSkyLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B45309',
  },
  cardSkyAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: -0.5,
    marginTop: 2,
    marginBottom: 4,
  },
  cardSkySub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#B45309',
  },
  filterBar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 24,
    gap: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    outlineStyle: 'none' as any,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    fontWeight: '700',
  },
  sectionHeaderRow: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  emptyStateCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 420,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 14,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Compact Cards Grid
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
  },
  eventsGridMobile: {
    flexDirection: 'column',
    gap: 14,
    width: '100%',
  },
  compactCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: '48.5%' as any,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  compactCardMobile: {
    width: '100%',
    maxWidth: '100%',
    minWidth: '100%',
    flex: undefined,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  cardDateRange: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 13.5,
    lineHeight: 19,
    marginVertical: 8,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    marginBottom: 6,
  },
  locationIcon: {
    fontSize: 12,
    fontWeight: '700',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardBudgetSimple: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailLinkWrap: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  detailLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  // Modal Backdrop & Expense Dialog
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
  },
  expenseDialogCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  dialogSub: {
    fontSize: 13,
    marginTop: 2,
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseDialogBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  modalFormGroup: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    outlineStyle: 'none' as any,
  },
  categoryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  catPillSelected: {
    borderWidth: 1,
    borderColor: '#059669',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 14,
  },
  cancelTextBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveExpenseBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  saveExpenseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  inviteBannerContainer: {
    marginBottom: 20,
    gap: 12,
  },
  inviteBannerCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  inviteBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 260,
  },
  inviteBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteBannerTextWrap: {
    flex: 1,
  },
  inviteBannerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  inviteBannerDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  inviteBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  inviteAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  inviteDeclineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  inviteDeclineBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
