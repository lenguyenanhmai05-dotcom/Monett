import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  MonettEvent,
  EventExpenseItem,
  loadEventsFromStorage,
  saveEventsToStorage,
} from '../../services/eventsStorage';
import { CreateEventModal } from '../../components/CreateEventModal';
import { EventDetailModal } from '../../components/EventDetailModal';
import { EventDetailScreen } from './EventDetailScreen';

interface EventsScreenProps {
  onNavigateToTab?: (tab: any) => void;
}

// Pastel icon backgrounds matching the screenshot (Card 1: yellow, Card 2: baby blue, etc.)
const ICON_PALETTES = [
  '#FCD34D', // Pastel Yellow (như thẻ 1 trong ảnh)
  '#BAE6FD', // Pastel Sky Blue (như thẻ 2 trong ảnh)
  '#FBCFE8', // Pastel Pink
  '#DDD6FE', // Pastel Lavender
  '#A7F3D0', // Pastel Mint
  '#FED7AA', // Pastel Peach
];

export const EventsScreen: React.FC<EventsScreenProps> = ({ onNavigateToTab }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const { addNotification } = useNotifications();
  const isVi = language === 'vi';

  // Events state
  const [events, setEvents] = useState<MonettEvent[]>(() => loadEventsFromStorage());
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected event for dedicated Detail Page view
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

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

  // Sync to storage on state change
  useEffect(() => {
    saveEventsToStorage(events);
  }, [events]);

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
  const totalBudget = events.reduce((sum, e) => sum + (e.estimatedBudget || 0), 0);
  const totalSpent = events.reduce((sum, e) => sum + (e.spentAmount || 0), 0);

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
  }) => {
    if (editingEvent) {
      // Update existing
      setEvents((prev) =>
        prev.map((item) =>
          item.id === editingEvent.id
            ? {
                ...item,
                ...eventData,
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
        status: 'ongoing', // Default new event to ongoing as seen in screenshot
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
  const pageBg = isDark ? '#0B1120' : '#F5F0E8';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const cardBorder = isDark ? '#334155' : '#E7DECF';
  const textPrimary = isDark ? '#F8FAFC' : '#111827';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const tagBg = isDark ? '#334155' : '#F1F5F9';

  // If an event is selected, render the dedicated Event Detail Page
  if (selectedEventId) {
    const activeEvent = events.find((e) => e.id === selectedEventId);
    if (activeEvent) {
      return (
        <EventDetailScreen
          event={activeEvent}
          onBack={() => setSelectedEventId(null)}
          onUpdateEvent={(updatedEvent) => {
            setEvents((prev) =>
              prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
            );
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
            <View style={styles.headerIconBadge}>
              <Ionicons name="calendar" size={22} color="#059669" />
            </View>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {isVi ? 'Quản Lý Sự Kiện & Kế Hoạch' : 'Events & Trip Planner'}
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            {isVi
              ? 'Lên kế hoạch, theo dõi ngân sách chi tiêu và ghi nhận hóa đơn cho từng sự kiện'
              : 'Plan, track budgets, and manage expenses for every trip & special occasion'}
          </Text>
        </View>

        {/* Action Button: Nút Tạo Sự Kiện Mới */}
        <TouchableOpacity
          style={styles.createEventBtn}
          onPress={() => {
            setEditingEvent(null);
            setIsCreateModalOpen(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.createEventBtnText}>
            {isVi ? 'Tạo sự kiện mới' : 'New Event'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= OVERVIEW STATS CARDS ================= */}
      <View style={styles.statsGrid}>
        {/* Card 1: Tổng số sự kiện */}
        <View style={[styles.statCard, { backgroundColor: '#221D18', borderColor: '#221D18' }]}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statCardLabel, { color: '#9E958A' }]}>
              {isVi ? 'Tổng số sự kiện' : 'Total Events'}
            </Text>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(246, 241, 233, 0.12)' }]}>
              <Ionicons name="calendar-outline" size={18} color="#F6F1E9" />
            </View>
          </View>
          <Text style={[styles.statCardValue, { color: '#F6F1E9' }]}>{totalEvents}</Text>
          <Text style={[styles.statCardSub, { color: '#9E958A' }]}>
            {isVi ? `${ongoingCount} đang diễn ra • ${upcomingCount} sắp tới` : `${ongoingCount} ongoing • ${upcomingCount} upcoming`}
          </Text>
        </View>

        {/* Card 2: Đang diễn ra */}
        <View style={[styles.statCard, { backgroundColor: '#BEE3C2', borderColor: '#BEE3C2' }]}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statCardLabel, { color: '#697664' }]}>
              {isVi ? 'Đang diễn ra' : 'Ongoing Now'}
            </Text>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(34, 29, 24, 0.08)' }]}>
              <Ionicons name="radio-button-on" size={18} color="#221D18" />
            </View>
          </View>
          <Text style={[styles.statCardValue, { color: '#221D18' }]}>{ongoingCount}</Text>
          <Text style={[styles.statCardSub, { color: '#697664' }]}>
            {isVi ? 'Sự kiện kích hoạt trong kỳ' : 'Active events this period'}
          </Text>
        </View>

        {/* Card 3: Ngân sách */}
        <View style={[styles.statCard, { backgroundColor: '#B7D9F2', borderColor: '#B7D9F2' }]}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statCardLabel, { color: '#697664' }]}>
              {isVi ? 'Ngân sách' : 'Budget'}
            </Text>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(34, 29, 24, 0.08)' }]}>
              <Ionicons name="wallet-outline" size={18} color="#221D18" />
            </View>
          </View>
          <Text style={[styles.statCardValue, { color: '#221D18' }]}>
            {totalBudget.toLocaleString('vi-VN')} <Text style={[styles.currencySub, { color: '#221D18' }]}>đ</Text>
          </Text>
          <Text style={[styles.statCardSub, { color: '#697664' }]}>
            {isVi ? 'Kế hoạch chi tiêu đã định' : 'Allocated target budgets'}
          </Text>
        </View>

        {/* Card 4: Chi tiêu thực tế */}
        <View style={[styles.statCard, { backgroundColor: '#F5D25F', borderColor: '#F5D25F' }]}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statCardLabel, { color: '#697664' }]}>
              {isVi ? 'Chi tiêu thực tế' : 'Actual Spent'}
            </Text>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(34, 29, 24, 0.08)' }]}>
              <Ionicons name="card-outline" size={18} color="#221D18" />
            </View>
          </View>
          <Text style={[styles.statCardValue, { color: '#221D18' }]}>
            {totalSpent.toLocaleString('vi-VN')} <Text style={[styles.currencySub, { color: '#221D18' }]}>đ</Text>
          </Text>
          <Text style={[styles.statCardSub, { color: '#697664' }]}>
            {totalBudget > 0
              ? `${Math.round((totalSpent / totalBudget) * 100)}% ${isVi ? 'ngân sách dự kiến' : 'of budget'}`
              : isVi ? 'Chưa phân bổ ngân sách' : 'No budget set'}
          </Text>
        </View>
      </View>

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
            { key: 'all', labelVi: 'Tất cả', labelEn: 'All', count: totalEvents, activeBg: '#221D18', activeColor: '#F6F1E9' },
            { key: 'ongoing', labelVi: 'Đang diễn ra', labelEn: 'Ongoing', count: ongoingCount, activeBg: '#D2EADA', activeColor: '#064E3B' },
            { key: 'upcoming', labelVi: 'Sắp tới', labelEn: 'Upcoming', count: upcomingCount, activeBg: '#D4E5F7', activeColor: '#075985' },
            {
              key: 'completed',
              labelVi: 'Hoàn thành',
              labelEn: 'Completed',
              count: events.filter((e) => e.status === 'completed').length,
              activeBg: '#E3E1EB',
              activeColor: '#4C1D95',
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
                    backgroundColor: isActive ? tab.activeBg : (isDark ? '#1E293B' : '#FFFFFF'),
                    borderWidth: 1,
                    borderColor: isActive ? (tab.activeBg || '#221D18') : cardBorder,
                  },
                ]}
                onPress={() => setFilterStatus(tab.key as any)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                    { color: isActive ? tab.activeColor : textSecondary },
                  ]}
                >
                  {isVi ? tab.labelVi : tab.labelEn} ({tab.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ================= DANH SÁCH SỰ KIỆN (TINH GỌN KHỚP 100% ẢNH MẪU) ================= */}
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
              ? 'Hãy bấm "Tạo sự kiện mới" để bắt đầu lên kế hoạch cho chuyến đi hoặc dịp đặc biệt!'
              : 'Click "New Event" to start planning your next trip or occasion!'}
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
        <View style={styles.eventsGrid}>
          {filteredEvents.map((evt, index) => {
            // Status styling: Nền thẻ, viền thẻ & badge theo tone màu #D2EADA
            const statusConfig = {
              ongoing: {
                labelVi: 'Đang diễn ra',
                labelEn: 'Ongoing',
                cardBg: isDark ? '#163322' : '#D2EADA', // #D2EADA theo yêu cầu
                cardBorder: isDark ? '#234C34' : '#BFDECA',
                badgeBg: isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
                badgeColor: '#166534',
              },
              upcoming: {
                labelVi: 'Sắp tới',
                labelEn: 'Upcoming',
                cardBg: isDark ? '#192E46' : '#D4E5F7', // Tone xanh trời cùng hệ màu #D2EADA
                cardBorder: isDark ? '#244365' : '#BDD6EE',
                badgeBg: isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
                badgeColor: '#0284C7',
              },
              completed: {
                labelVi: 'Hoàn thành',
                labelEn: 'Completed',
                cardBg: isDark ? '#282333' : '#E3E1EB', // Tone lavender/xám cùng hệ màu #D2EADA
                cardBorder: isDark ? '#3C354C' : '#CEC8DC',
                badgeBg: isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
                badgeColor: '#6B21A8',
              },
            }[evt.status] || {
              labelVi: 'Đang diễn ra',
              labelEn: 'Ongoing',
              cardBg: isDark ? '#163322' : '#D2EADA',
              cardBorder: isDark ? '#234C34' : '#BFDECA',
              badgeBg: isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
              badgeColor: '#166534',
            };

            // Cute pastel icon background
            const iconBg =
              ICON_PALETTES[
                Math.abs(
                  evt.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index
                ) % ICON_PALETTES.length
              ];

            return (
              <TouchableOpacity
                key={evt.id}
                style={[
                  styles.compactCard,
                  {
                    backgroundColor: statusConfig.cardBg,
                    borderColor: statusConfig.cardBorder,
                  },
                ]}
                onPress={() => setSelectedEventId(evt.id)}
                activeOpacity={0.88}
              >
                {/* 1. Top Row: Icon Box (#F6D35F) + Title/Date + Status Badge */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardHeaderLeft}>
                    {/* Square yellow icon box khớp #F6D35F ảnh 4 */}
                    <View style={[styles.cardIconBox, { backgroundColor: '#F6D35F' }]}>
                      <Ionicons name="sparkles" size={18} color="#1E293B" />
                    </View>

                    {/* Title & Date range */}
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

                  {/* Status Badge khớp ảnh 1, 2, 3 & 4 */}
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig.badgeColor }]}>
                      {isVi ? statusConfig.labelVi : statusConfig.labelEn}
                    </Text>
                  </View>
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

                {/* 3. Bottom Row: Ngân sách & Chi tiết → (Khớp 100% ảnh 4) */}
                <View style={styles.cardBottomRow}>
                  <Text style={[styles.cardBudgetSimple, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {isVi ? 'Ngân sách ' : 'Budget '}
                    <Text style={{ fontWeight: '800', color: isDark ? '#F8FAFC' : '#111827' }}>
                      {(evt.estimatedBudget || 0).toLocaleString('vi-VN')}
                    </Text>
                  </Text>

                  {/* Nút "Chi tiết →" dạng text link không nền khớp ảnh 4 */}
                  <TouchableOpacity
                    onPress={() => setSelectedEventId(evt.id)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Chi tiết sự kiện ${evt.title}`}
                    style={styles.detailLinkWrap}
                  >
                    <Text style={[styles.detailLinkText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
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
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 60,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
    minWidth: 280,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
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
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  createEventBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statCardLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  currencySub: {
    fontSize: 15,
    fontWeight: '700',
  },
  statCardSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
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
  // Compact Cards Grid — layout chuẩn 2 cột trên desktop
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  compactCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: '48.5%' as any,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
  // Budget progress bar
  budgetProgressWrap: {
    marginTop: 8,
    marginBottom: 4,
    gap: 5,
  },
  budgetProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetProgressTrack: {
    height: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: 5,
    borderRadius: 4,
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
});
