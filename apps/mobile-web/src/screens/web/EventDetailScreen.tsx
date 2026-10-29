import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  MonettEvent,
  EventExpenseItem,
  EventMember,
  sendEventInvitation,
} from '../../services/eventsStorage';
import { inviteFriendToEventApi, updateEventApi } from '../../services/api';
import { CreateEventModal } from '../../components/CreateEventModal';
import { TransactionEditModal } from '../../components/TransactionEditModal';
import { CategorySvgIcon } from '../../components/CategorySvgIcon';
import { InviteFriendsModal } from '../../components/InviteFriendsModal';

interface EventDetailScreenProps {
  event: MonettEvent;
  onBack: () => void;
  onUpdateEvent: (updatedEvent: MonettEvent) => void;
  onDeleteEvent: (eventId: string, eventTitle: string) => void;
  onOpenCreateNewEvent?: () => void;
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({
  event,
  onBack,
  onUpdateEvent,
  onDeleteEvent,
  onOpenCreateNewEvent,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const { addNotification, unreadCount, openNotifications } = useNotifications();
  const isVi = language === 'vi';

  // State for Edit Event modal
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);

  // State for Invite Friends modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Vai trò của người dùng hiện tại (Owner hoặc Bạn bè/Member)
  const [currentRole, setCurrentRole] = useState<'owner' | 'member'>('owner');
  const isOwner = currentRole === 'owner';

  // State for Transaction CRUD Modal (Create / Edit)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<EventExpenseItem | null>(null);

  // Transaction Form fields
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txTitle, setTxTitle] = useState('');
  const [txAmountStr, setTxAmountStr] = useState('');
  const [txCategory, setTxCategory] = useState('Cafe');
  const [txCategoryIcon, setTxCategoryIcon] = useState('☕');
  const [txPayer, setTxPayer] = useState(event.ownerName || 'Tôi');
  const [txDate, setTxDate] = useState('');

  // Hover state for items (web)
  const [hoveredTxId, setHoveredTxId] = useState<string | null>(null);

  // Calculate statistics
  const totalExpense = event.expenses
    .filter((e) => e.type !== 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIncome = event.expenses
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const transactionCount = event.expenses.length;
  const remainingBudget = event.estimatedBudget - totalExpense;

  // Category breakdown for expenses
  const categoryBreakdown = React.useMemo(() => {
    const expenseItems = event.expenses.filter((e) => e.type !== 'income');
    const catMap: { [cat: string]: number } = {};
    expenseItems.forEach((item) => {
      const cat = item.category || 'Khác';
      catMap[cat] = (catMap[cat] || 0) + item.amount;
    });
    return Object.entries(catMap)
      .map(([catName, amount]) => ({
        category: catName,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [event.expenses, totalExpense]);

  // Open modal to add a new transaction
  const handleOpenAddTxModal = () => {
    setEditingTx(null);
    setTxType('expense');
    setTxTitle('');
    setTxAmountStr('');
    setTxCategory('Cafe');
    setTxCategoryIcon('☕');
    setTxPayer(event.ownerName || 'Tôi');

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    setTxDate(`${dd}/${mm}/${yyyy}`);

    setIsTxModalOpen(true);
  };

  // Open modal to edit an existing transaction
  const handleOpenEditTxModal = (tx: EventExpenseItem) => {
    setEditingTx(tx);
    setTxType(tx.type || 'expense');
    setTxTitle(tx.title);
    setTxAmountStr(String(tx.amount));
    setTxCategory(tx.category || 'Cafe');
    setTxCategoryIcon(tx.categoryIcon || '☕');
    setTxPayer(tx.payer || event.ownerName || 'Tôi');
    setTxDate(tx.date || '');
    setIsTxModalOpen(true);
  };

  // Save transaction (Create or Update)
  const handleSaveTransaction = () => {
    const cleanTitle = txTitle.trim();
    if (!cleanTitle) {
      alert(isVi ? 'Vui lòng nhập tên giao dịch.' : 'Please enter transaction title.');
      return;
    }

    const amount = parseInt(txAmountStr.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) {
      alert(isVi ? 'Vui lòng nhập số tiền hợp lệ.' : 'Please enter a valid amount.');
      return;
    }

    let updatedExpenses: EventExpenseItem[];

    if (editingTx) {
      // UPDATE
      updatedExpenses = event.expenses.map((item) =>
        item.id === editingTx.id
          ? {
              ...item,
              title: cleanTitle,
              amount,
              type: txType,
              category: txCategory,
              categoryIcon: txCategoryIcon,
              payer: txPayer.trim() || undefined,
              date: txDate.trim() || item.date,
            }
          : item
      );

      addNotification({
        type: 'expense',
        title: isVi ? 'Cập nhật giao dịch ✏️' : 'Transaction Updated ✏️',
        message: isVi
          ? `Đã cập nhật khoản "${cleanTitle}" trong sự kiện "${event.title}"`
          : `Updated "${cleanTitle}" in event "${event.title}"`,
        iconBg: '#EDE9FE',
        iconColor: '#7C3AED',
      });
    } else {
      // CREATE
      const newTx: EventExpenseItem = {
        id: `ee-${Date.now()}`,
        title: cleanTitle,
        amount,
        type: txType,
        category: txCategory,
        categoryIcon: txCategoryIcon,
        payer: txPayer.trim() || 'Tôi',
        date: txDate.trim() || 'Hôm nay',
        createdAt: new Date().toISOString(),
      };

      updatedExpenses = [newTx, ...event.expenses];

      addNotification({
        type: 'expense',
        title: txType === 'income' ? 'Ghi nhận khoản thu 💰' : 'Ghi nhận chi tiêu 💸',
        message: isVi
          ? `Đã thêm ${amount.toLocaleString('vi-VN')} đ ("${cleanTitle}") vào sự kiện "${event.title}"`
          : `Added ${amount.toLocaleString('vi-VN')} đ ("${cleanTitle}") to event "${event.title}"`,
        iconBg: txType === 'income' ? '#DCFCE7' : '#FEF3C7',
        iconColor: txType === 'income' ? '#059669' : '#D97706',
      });
    }

    // Recalculate spent and income
    const updatedSpent = updatedExpenses
      .filter((e) => e.type !== 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const updatedIncome = updatedExpenses
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    onUpdateEvent({
      ...event,
      expenses: updatedExpenses,
      spentAmount: updatedSpent,
      incomeAmount: updatedIncome,
    });

    setIsTxModalOpen(false);
    setEditingTx(null);
  };

  // Delete a transaction (DELETE)
  const handleDeleteTransaction = (txId: string, txTitle: string) => {
    const confirmMsg = isVi
      ? `Bạn có chắc chắn muốn xóa giao dịch "${txTitle}" không?`
      : `Are you sure you want to delete transaction "${txTitle}"?`;

    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(confirmMsg)) return;
    }

    const updatedExpenses = event.expenses.filter((e) => e.id !== txId);
    const updatedSpent = updatedExpenses
      .filter((e) => e.type !== 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const updatedIncome = updatedExpenses
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    onUpdateEvent({
      ...event,
      expenses: updatedExpenses,
      spentAmount: updatedSpent,
      incomeAmount: updatedIncome,
    });

    addNotification({
      type: 'expense',
      title: isVi ? 'Đã xóa giao dịch 🗑️' : 'Transaction Deleted 🗑️',
      message: isVi ? `Đã xóa giao dịch "${txTitle}".` : `Transaction "${txTitle}" deleted.`,
      iconBg: '#FEE2E2',
      iconColor: '#DC2626',
    });
  };

  // Xử lý mời bạn bè tham gia sự kiện
  const handleInviteFriend = (friend: {
    id: string;
    name: string;
    avatarUrl?: string;
    email?: string;
  }) => {
    const existingMembers = event.members || [];
    const already = existingMembers.some(
      (m) => m.id === friend.id || m.name.toLowerCase() === friend.name.toLowerCase()
    );
    if (already) return;

    const newMember: EventMember = {
      id: friend.id,
      name: friend.name,
      avatarUrl: friend.avatarUrl,
      email: friend.email,
      role: 'member',
      status: 'pending',
      invitedAt: new Date().toLocaleDateString('vi-VN'),
    };

    const updatedMembers = [...existingMembers, newMember];
    const updatedEvent: MonettEvent = {
      ...event,
      members: updatedMembers,
    };
    onUpdateEvent(updatedEvent);

    // Gửi lời mời tới Backend API và hệ thống thông báo
    inviteFriendToEventApi(event.id, {
      id: friend.id,
      name: friend.name,
      email: friend.email,
      avatarUrl: friend.avatarUrl,
    }).catch((err) => console.warn('Lỗi gọi inviteFriendToEventApi:', err));

    sendEventInvitation({
      eventId: event.id,
      eventTitle: event.title,
      eventLocation: event.location,
      eventStartDate: event.startDate,
      inviterName: event.ownerName || 'Ánh Mai',
      inviterId: event.ownerId,
      recipientId: friend.id,
      recipientName: friend.name,
      recipientEmail: friend.email,
      eventData: updatedEvent,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('monett:event_invitations_updated'));
      window.dispatchEvent(new CustomEvent('monett:events_updated'));
    }

    addNotification({
      type: 'event',
      title: isVi ? 'Đã gửi lời mời 📩' : 'Invite Sent 📩',
      message: isVi
        ? `Đã gửi lời mời tham gia "${event.title}" đến ${friend.name}. Đang chờ bạn chấp nhận!`
        : `Sent invitation for "${event.title}" to ${friend.name}. Waiting for acceptance!`,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
    });
  };

  // Kiểm tra quyền: Chỉ chủ sự kiện (Owner) mới được xóa sự kiện
  const handleDeleteEventClick = () => {
    if (!isOwner) {
      alert(
        isVi
          ? `Bạn đang xem ở vai trò bạn bè (thành viên). Bạn không được quyền xóa sự kiện của chủ sự kiện (${event.ownerName || 'Owner'})!`
          : `You are a member. You cannot delete the event owned by ${event.ownerName || 'Owner'}!`
      );
      return;
    }
    onDeleteEvent(event.id, event.title);
  };

  // Color tokens
  const pageBg = isDark ? '#0B1120' : '#F5F0E8';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const eventHeaderCardBg = isDark ? '#1E293B' : '#ECE5D8';
  const eventHeaderCardBorder = isDark ? '#334155' : '#DDD6C9';
  const dividerColor = isDark ? '#334155' : '#E8E2D9';
  const textPrimary = isDark ? '#F8FAFC' : '#111827';
  const textSecondary = isDark ? '#94A3B8' : '#4B5563';
  const tagBg = isDark ? '#334155' : '#F1F5F9';

  const currentStatus = event.status || 'ongoing';
  const statusConfig = {
    ongoing: {
      labelVi: 'Đang diễn ra',
      labelEn: 'Ongoing',
      badgeBg: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
      badgeColor: '#166534',
      badgeBorder: isDark ? '#234C34' : '#BFDECA',
    },
    upcoming: {
      labelVi: 'Sắp tới',
      labelEn: 'Upcoming',
      badgeBg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
      badgeColor: '#B45309',
      badgeBorder: isDark ? '#78350F' : '#FDE68A',
    },
    completed: {
      labelVi: 'Hoàn thành',
      labelEn: 'Completed',
      badgeBg: isDark ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF',
      badgeColor: '#6B21A8',
      badgeBorder: isDark ? '#3C354C' : '#DDD6FE',
    },
  }[currentStatus] || {
    labelVi: 'Đang diễn ra',
    labelEn: 'Ongoing',
    badgeBg: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
    badgeColor: '#166534',
    badgeBorder: isDark ? '#234C34' : '#BFDECA',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: pageBg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= TOP HEADER BAR ================= */}
      <View style={styles.topHeaderRow}>
        <Text style={[styles.pageTitle, { color: textPrimary }]}>
          {isVi ? 'Sự kiện' : 'Events'}
        </Text>

        <View style={styles.topHeaderRight}>
          {/* Nút "+ Thêm" (Tạo sự kiện mới) */}
          <TouchableOpacity
            style={styles.topAddEventBtn}
            onPress={onOpenCreateNewEvent}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#064E3B" />
            <Text style={styles.topAddEventBtnText}>
              {isVi ? 'Thêm' : 'Add'}
            </Text>
          </TouchableOpacity>

          {/* Nút chuông thông báo (Khớp ảnh 2) */}
          <TouchableOpacity
            style={[styles.topBellBtn, { backgroundColor: cardBg, borderColor: isDark ? '#334155' : '#E8E2D9' }]}
            onPress={openNotifications}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={18} color={textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.topBellBadge}>
                <Text style={styles.topBellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= THANG CẮT NGANG GIỮA "SỰ KIỆN" VÀ NÚT LÙI SỰ KIỆN (KHỚP ẢNH 2) ================= */}
      <View style={[styles.topDivider, { backgroundColor: dividerColor }]} />

      {/* ================= BACK BREADCRUMB: "← Sự kiện" ================= */}
      <TouchableOpacity
        style={styles.backBreadcrumb}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={16} color={textPrimary} />
        <Text style={[styles.backBreadcrumbText, { color: textPrimary }]}>
          {isVi ? 'Sự kiện' : 'Events'}
        </Text>
      </TouchableOpacity>

      {/* ================= EVENT HEADER CARD (KHỚP 100% ẢNH 2) ================= */}
      <View style={[styles.eventHeaderCard, { backgroundColor: eventHeaderCardBg, borderColor: eventHeaderCardBorder }]}>
        <View style={styles.eventHeaderLeft}>
          {/* Tên sự kiện + Badge trạng thái (bấm để đổi nhanh) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 2 }}>
            <Text style={[styles.eventTitle, { color: textPrimary }]}>
              {event.title}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const nextStatus: Record<'upcoming' | 'ongoing' | 'completed', 'upcoming' | 'ongoing' | 'completed'> = {
                  upcoming: 'ongoing',
                  ongoing: 'completed',
                  completed: 'upcoming',
                };
                const newStatus = nextStatus[currentStatus];
                onUpdateEvent({ ...event, status: newStatus });
              }}
              activeOpacity={0.75}
              style={{
                backgroundColor: statusConfig.badgeBg,
                borderColor: statusConfig.badgeBorder,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 12,
              }}
              accessibilityLabel="Bấm để đổi trạng thái"
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: statusConfig.badgeColor }}>
                {isVi ? statusConfig.labelVi : statusConfig.labelEn}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Khoảng ngày diễn ra */}
          <Text style={[styles.eventDateRange, { color: textSecondary }]}>
            {event.startDate}
            {event.endDate ? ` → ${event.endDate}` : ''}
          </Text>

          {/* Địa điểm */}
          {event.location ? (
            <View style={styles.eventLocationRow}>
              <Ionicons name="location-outline" size={14} color={textSecondary} style={{ marginRight: 2 }} />
              <Text style={[styles.eventLocationText, { color: textSecondary }]}>
                {event.location}
              </Text>
            </View>
          ) : null}

          {/* Cụm avatar thành viên tham gia + Nút "+ Mời bạn" nếu có */}
          {event.members && event.members.length > 0 && (
            <View style={styles.memberAvatarGroupRow}>
              <View style={styles.avatarStack}>
                {event.members.slice(0, 5).map((m, idx) => (
                  <View
                    key={m.id || idx}
                    style={[
                      styles.stackedAvatarWrap,
                      {
                        borderColor: eventHeaderCardBg,
                        marginLeft: idx === 0 ? 0 : -8,
                        zIndex: 10 - idx,
                      },
                    ]}
                  >
                    {m.avatarUrl ? (
                      <Image source={{ uri: m.avatarUrl }} style={styles.stackedAvatarImg} />
                    ) : (
                      <View style={[styles.stackedAvatarPlaceholder, { backgroundColor: m.role === 'owner' ? '#059669' : '#3B82F6' }]}>
                        <Text style={styles.stackedAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    {m.role === 'owner' && (
                      <View style={styles.ownerCrownBadge}>
                        <Text style={styles.ownerCrownText}>👑</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.invitePillBtn}
                onPress={() => setIsInviteModalOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={13} color="#064E3B" />
                <Text style={styles.invitePillBtnText}>
                  {isVi ? 'Mời bạn' : 'Invite'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Nút Sửa & Xóa sự kiện (Tròn trắng viền nhẹ khớp 100% Ảnh 2) */}
        <View style={styles.eventHeaderActions}>
          {/* Sửa sự kiện (Pencil) */}
          <TouchableOpacity
            style={[styles.circleActionBtn, { backgroundColor: '#FFFFFF', borderColor: isDark ? '#334155' : '#DDD6C9' }]}
            onPress={() => setIsEditEventModalOpen(true)}
            activeOpacity={0.75}
            accessibilityLabel="Chỉnh sửa sự kiện"
          >
            <Ionicons name="create-outline" size={18} color="#475569" />
          </TouchableOpacity>

          {/* Xóa sự kiện (Trash) */}
          <TouchableOpacity
            style={[styles.circleActionBtn, { backgroundColor: '#FFFFFF', borderColor: isDark ? '#334155' : '#DDD6C9' }]}
            onPress={handleDeleteEventClick}
            activeOpacity={0.75}
            accessibilityLabel="Xóa sự kiện"
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= MAIN CONTENT: 2 CỘT (GIAO DỊCH & SIDEBAR CHỈ SỐ) ================= */}
      <View style={styles.mainGrid}>
        {/* ================= CỘT TRÁI: GIAO DỊCH TRONG SỰ KIỆN ================= */}
        <View style={styles.leftCol}>
          {/* Header hàng: "Giao dịch trong sự kiện" + Nút "+ Thêm" */}
          <View style={styles.txSectionHeader}>
            <Text style={[styles.txSectionTitle, { color: textPrimary }]}>
              {isVi ? 'Giao dịch trong sự kiện' : 'Transactions in event'}
            </Text>

            <TouchableOpacity
              style={styles.addTxPillBtn}
              onPress={handleOpenAddTxModal}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#064E3B" />
              <Text style={styles.addTxPillBtnText}>
                {isVi ? 'Thêm' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Danh sách giao dịch */}
          {event.expenses.length === 0 ? (
            <View style={[styles.emptyTxBox, { backgroundColor: cardBg, borderColor: dividerColor }]}>
              <Ionicons name="receipt-outline" size={36} color={textSecondary} />
              <Text style={[styles.emptyTxTitle, { color: textPrimary }]}>
                {isVi ? 'Chưa có giao dịch nào' : 'No transactions yet'}
              </Text>
              <Text style={[styles.emptyTxSubtitle, { color: textSecondary }]}>
                {isVi
                  ? 'Bấm nút "+ Thêm" ở trên để ghi lại các khoản cafe, ăn uống, di chuyển hoặc thu tiền!'
                  : 'Click "+ Add" above to record expenses or income for this event!'}
              </Text>
            </View>
          ) : (
            <View style={styles.txList}>
              {event.expenses.map((tx) => {
                const isIncome = tx.type === 'income';
                const isHovered = hoveredTxId === tx.id;

                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.txItemCard,
                      { backgroundColor: cardBg, borderColor: dividerColor },
                    ]}
                    {...({
                      onMouseEnter: () => setHoveredTxId(tx.id),
                      onMouseLeave: () => setHoveredTxId(null),
                    } as any)}
                  >
                    {/* Bên trái: Icon tròn + Tên & phụ đề */}
                    <View style={styles.txItemLeft}>
                      {/* Icon tròn SVG */}
                      <View style={[styles.txIconCircle, { backgroundColor: isDark ? '#334155' : '#EDE6DC' }]}>
                        <CategorySvgIcon
                          name={tx.category || tx.title}
                          size={18}
                          color={isDark ? '#F8FAFC' : '#1E293B'}
                        />
                      </View>

                      {/* Tiêu đề & Subtitle */}
                      <View style={styles.txInfoWrap}>
                        <Text style={[styles.txItemTitle, { color: textPrimary }]}>
                          {tx.title}
                        </Text>
                        <Text style={[styles.txItemSubtitle, { color: textSecondary }]}>
                          {tx.category || 'Chi phí'}
                          {tx.payer ? ` · ${tx.payer}` : ''}
                          {tx.date ? ` · ${tx.date}` : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Bên phải: Số tiền & Nút sửa/xóa khi hover/click */}
                    <View style={styles.txItemRight}>
                      {/* Số tiền */}
                      <Text
                        style={[
                          styles.txItemAmount,
                          { color: isIncome ? '#059669' : '#DC2626' },
                        ]}
                      >
                        {isIncome ? '+' : '-'}
                        {tx.amount.toLocaleString('vi-VN')} đ
                      </Text>

                      {/* Nút sửa / xóa giao dịch */}
                      <View style={styles.txActionBtnsRow}>
                        <TouchableOpacity
                          style={styles.miniTxActionBtn}
                          onPress={() => handleOpenEditTxModal(tx)}
                          activeOpacity={0.7}
                          accessibilityLabel="Sửa giao dịch"
                        >
                          <Ionicons name="pencil" size={14} color={textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.miniTxActionBtn}
                          onPress={() => handleDeleteTransaction(tx.id, tx.title)}
                          activeOpacity={0.7}
                          accessibilityLabel="Xóa giao dịch"
                        >
                          <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ================= CỘT PHẢI: BẢNG CHỈ SỐ TÀI CHÍNH (CHI - THU - SỐ LƯỢNG & NGÂN SÁCH) ================= */}
        <View style={styles.rightCol}>
          {/* Hàng 3 thẻ mini: Chi | Thu | Giao dịch */}
          <View style={styles.metricCardsRow}>
            {/* Thẻ 1: Chi */}
            <View style={[styles.miniMetricCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
              <Text style={[styles.miniMetricLabel, { color: textSecondary }]}>
                {isVi ? 'Chi' : 'Spent'}
              </Text>
              <Text style={[styles.miniMetricValue, { color: '#DC2626' }]}>
                {totalExpense.toLocaleString('vi-VN')}
              </Text>
            </View>

            {/* Thẻ 2: Thu */}
            <View style={[styles.miniMetricCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
              <Text style={[styles.miniMetricLabel, { color: textSecondary }]}>
                {isVi ? 'Thu' : 'Income'}
              </Text>
              <Text style={[styles.miniMetricValue, { color: '#059669' }]}>
                {totalIncome.toLocaleString('vi-VN')}
              </Text>
            </View>

            {/* Thẻ 3: Giao dịch */}
            <View style={[styles.miniMetricCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
              <Text style={[styles.miniMetricLabel, { color: textSecondary }]}>
                {isVi ? 'Giao dịch' : 'Txns'}
              </Text>
              <Text style={[styles.miniMetricValue, { color: textPrimary }]}>
                {transactionCount}
              </Text>
            </View>
          </View>

          {/* Thẻ Ngân sách dự kiến */}
          <View style={[styles.budgetSummaryCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
            <View style={styles.budgetRow}>
              <Text style={[styles.budgetSummaryLabel, { color: textSecondary }]}>
                {isVi ? 'Ngân sách dự kiến' : 'Estimated budget'}
              </Text>
              <Text style={[styles.budgetSummaryValue, { color: textPrimary }]}>
                {event.estimatedBudget.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            {/* Tiến độ ngân sách */}
            {event.estimatedBudget > 0 && (
              <View style={styles.budgetProgressSection}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          Math.round((totalExpense / event.estimatedBudget) * 100),
                          100
                        )}%`,
                        backgroundColor:
                          totalExpense > event.estimatedBudget ? '#DC2626' : '#10B981',
                      },
                    ]}
                  />
                </View>
                <View style={styles.remainingRow}>
                  <Text style={[styles.remainingLabel, { color: textSecondary }]}>
                    {remainingBudget >= 0
                      ? isVi
                        ? 'Còn lại trong ngân sách:'
                        : 'Remaining:'
                      : isVi
                      ? 'Vượt định mức:'
                      : 'Over budget:'}
                  </Text>
                  <Text
                    style={[
                      styles.remainingValue,
                      { color: remainingBudget >= 0 ? '#059669' : '#DC2626' },
                    ]}
                  >
                    {Math.abs(remainingBudget).toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Thẻ Thành viên tham gia sự kiện */}
          <View style={[styles.membersCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
            <View style={styles.membersCardHeader}>
              <View style={styles.membersHeaderTitleWrap}>
                <Text style={[styles.membersCardTitle, { color: textPrimary }]}>
                  {isVi ? 'Thành viên tham gia' : 'Event Members'}
                </Text>
                <View style={styles.memberCountBadge}>
                  <Text style={styles.memberCountBadgeText}>
                    {(event.members || []).length}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.inviteMiniBtn}
                onPress={() => setIsInviteModalOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={13} color="#064E3B" />
                <Text style={styles.inviteMiniBtnText}>
                  {isVi ? '+ Mời bạn' : '+ Invite'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.membersList}>
              {(event.members || []).map((m, index, arr) => (
                <View
                  key={m.id}
                  style={[
                    styles.memberItem,
                    index !== arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                  ]}
                >
                  <View style={styles.memberLeft}>
                    {m.avatarUrl ? (
                      <Image source={{ uri: m.avatarUrl }} style={styles.memberAvatarImg} />
                    ) : (
                      <View
                        style={[
                          styles.memberAvatarPlaceholder,
                          { backgroundColor: m.role === 'owner' ? '#059669' : '#3B82F6' },
                        ]}
                      >
                        <Text style={styles.memberAvatarInitials}>
                          {m.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, { color: textPrimary }]}>
                          {m.name}
                        </Text>
                        {m.role === 'owner' ? (
                          <View style={styles.memberRoleBadgeOwner}>
                            <Text style={styles.memberRoleBadgeOwnerText}>
                              👑 {isVi ? 'Chủ' : 'Owner'}
                            </Text>
                          </View>
                        ) : m.status === 'pending' ? (
                          <View style={[styles.memberRoleBadgeMember, { backgroundColor: isDark ? '#451A03' : '#FEF3C7', borderColor: '#F59E0B' }]}>
                            <Text style={[styles.memberRoleBadgeMemberText, { color: '#D97706', fontWeight: '700' }]}>
                              ⏳ {isVi ? 'Chờ xác nhận' : 'Pending'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.memberRoleBadgeMember}>
                            <Text style={styles.memberRoleBadgeMemberText}>
                              {isVi ? 'Bạn bè' : 'Member'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.memberSub, { color: textSecondary }]}>
                        {m.status === 'pending'
                          ? (isVi ? 'Đã mời • Đang chờ accept' : 'Invited • Waiting for acceptance')
                          : (m.email || (m.joinedAt ? (isVi ? `Tham gia ${m.joinedAt}` : `Joined ${m.joinedAt}`) : (isVi ? 'Đang hoạt động' : 'Active')))}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Thẻ Phân bổ chi tiêu theo danh mục (Cân bằng chiều cao & bố cục 2 cột) */}
          {categoryBreakdown.length > 0 && (
            <View style={[styles.categoryBreakdownCard, { backgroundColor: cardBg, borderColor: dividerColor }]}>
              <View style={styles.breakdownHeaderRow}>
                <Text style={[styles.breakdownTitle, { color: textPrimary }]}>
                  {isVi ? 'Phân bổ chi tiêu' : 'Expense Breakdown'}
                </Text>
                <Text style={[styles.breakdownCountBadge, { color: textSecondary }]}>
                  {`${categoryBreakdown.length} ${isVi ? 'danh mục' : 'categories'}`}
                </Text>
              </View>

              <View style={styles.breakdownList}>
                {categoryBreakdown.map((item, index) => {
                  const barColors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];
                  const barColor = barColors[index % barColors.length];

                  return (
                    <View key={item.category} style={styles.breakdownItem}>
                      <View style={styles.breakdownItemHeader}>
                        <View style={styles.breakdownItemLeft}>
                          <View style={[styles.breakdownIconCircle, { backgroundColor: isDark ? '#334155' : '#EDE6DC' }]}>
                            <CategorySvgIcon name={item.category} size={13} color={isDark ? '#F8FAFC' : '#1E293B'} />
                          </View>
                          <Text style={[styles.breakdownCatName, { color: textPrimary }]}>
                            {item.category}
                          </Text>
                        </View>
                        <View style={styles.breakdownItemRight}>
                          <Text style={[styles.breakdownAmount, { color: textPrimary }]}>
                            {item.amount.toLocaleString('vi-VN')} đ
                          </Text>
                          <Text style={[styles.breakdownPercent, { color: textSecondary }]}>
                            {item.percentage}%
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.breakdownTrack, { backgroundColor: isDark ? '#334155' : '#F1EFEA' }]}>
                        <View
                          style={[
                            styles.breakdownFill,
                            { width: `${Math.min(item.percentage, 100)}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ================= MODAL SỬA GIAO DỊCH (KHỚP 100% ẢNH 1 & ẢNH 2) ================= */}
      <TransactionEditModal
        visible={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={(txData) => {
          let updatedExpenses: EventExpenseItem[];

          if (editingTx) {
            // UPDATE
            updatedExpenses = event.expenses.map((item) =>
              item.id === editingTx.id
                ? {
                    ...item,
                    title: txData.title,
                    amount: txData.amount,
                    type: txData.type,
                    category: txData.category,
                    categoryIcon: txData.categoryIcon,
                    date: txData.date,
                    note: txData.note,
                    payer: txData.payer,
                  }
                : item
            );

            addNotification({
              type: 'expense',
              title: isVi ? 'Cập nhật giao dịch ✏️' : 'Transaction Updated ✏️',
              message: isVi
                ? `Đã cập nhật khoản "${txData.title}" trong sự kiện "${event.title}"`
                : `Updated "${txData.title}" in event "${event.title}"`,
              iconBg: '#EDE9FE',
              iconColor: '#7C3AED',
            });
          } else {
            // CREATE
            const newTx: EventExpenseItem = {
              id: `ee-${Date.now()}`,
              title: txData.title,
              amount: txData.amount,
              type: txData.type,
              category: txData.category,
              categoryIcon: txData.categoryIcon,
              payer: txData.payer || event.ownerName || 'Tôi',
              date: txData.date,
              note: txData.note,
              createdAt: new Date().toISOString(),
            };

            updatedExpenses = [newTx, ...event.expenses];

            addNotification({
              type: 'expense',
              title: txData.type === 'income' ? 'Ghi nhận khoản thu 💰' : 'Ghi nhận chi tiêu 💸',
              message: isVi
                ? `Đã thêm ${txData.amount.toLocaleString('vi-VN')} đ ("${txData.title}") vào sự kiện "${event.title}"`
                : `Added ${txData.amount.toLocaleString('vi-VN')} đ ("${txData.title}") to event "${event.title}"`,
              iconBg: txData.type === 'income' ? '#DCFCE7' : '#FEF3C7',
              iconColor: txData.type === 'income' ? '#059669' : '#D97706',
            });
          }

          // Recalculate spent and income
          const updatedSpent = updatedExpenses
            .filter((e) => e.type !== 'income')
            .reduce((sum, e) => sum + e.amount, 0);

          const updatedIncome = updatedExpenses
            .filter((e) => e.type === 'income')
            .reduce((sum, e) => sum + e.amount, 0);

          onUpdateEvent({
            ...event,
            expenses: updatedExpenses,
            spentAmount: updatedSpent,
            incomeAmount: updatedIncome,
          });

          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onDelete={
          editingTx
            ? () => {
                handleDeleteTransaction(editingTx.id, editingTx.title);
                setIsTxModalOpen(false);
                setEditingTx(null);
              }
            : undefined
        }
        initialData={editingTx}
        eventName={event.title}
      />

      {/* ================= MODAL SỬA THÔNG TIN SỰ KIỆN ================= */}
      <CreateEventModal
        visible={isEditEventModalOpen}
        onClose={() => setIsEditEventModalOpen(false)}
        onSave={(data) => {
          onUpdateEvent({
            ...event,
            ...data,
          });
          setIsEditEventModalOpen(false);
        }}
        editingEvent={event}
      />

      {/* ================= MODAL MỜI BẠN BÈ ================= */}
      <InviteFriendsModal
        visible={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        eventTitle={event.title}
        currentMembers={event.members || []}
        onInviteFriend={handleInviteFriend}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 60,
    width: '100%',
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topAddEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#98E4B0',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  topAddEventBtnText: {
    color: '#064E3B',
    fontSize: 14,
    fontWeight: '800',
  },
  topBellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  topBellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  topBellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    lineHeight: 11,
  },
  topDivider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  backBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backBreadcrumbText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Thẻ thông tin sự kiện lớn màu kem be khớp ảnh 2
  eventHeaderCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 24,
    paddingVertical: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  eventHeaderLeft: {
    flex: 1,
    gap: 6,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  eventDateRange: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  eventLocationIcon: {
    fontSize: 13,
    fontWeight: '700',
  },
  eventLocationText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  eventHeaderActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  circleActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  // Lưới 2 cột chính - Cân bằng toàn màn hình 100%
  mainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    width: '100%',
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 1.4,
    minWidth: 360,
  },
  rightCol: {
    flex: 1,
    minWidth: 340,
    maxWidth: 480,
    gap: 16,
  },
  txSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  txSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  addTxPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#98E4B0',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  addTxPillBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#064E3B',
  },
  emptyTxBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 8,
  },
  emptyTxTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyTxSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 360,
  },
  txList: {
    gap: 12,
  },
  txItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  txItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    marginRight: 12,
  },
  txIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfoWrap: {
    flex: 1,
  },
  txItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  txItemSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  txItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  txItemAmount: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  txActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniTxActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  // Right Col: Metric Cards
  metricCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniMetricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  miniMetricLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  miniMetricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  budgetSummaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryBreakdownCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  breakdownCountBadge: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    gap: 6,
  },
  breakdownItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownCatName: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  breakdownItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownAmount: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  breakdownPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetSummaryLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  budgetSummaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  budgetProgressSection: {
    gap: 8,
    paddingTop: 6,
  },
  progressTrack: {
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  remainingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  remainingValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  // Modal Backdrop & Transaction Form Card
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
  },
  txModalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  txModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  txModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txModalBody: {
    maxHeight: 520,
  },
  txModalBodyContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 16,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
  },
  typeTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  typeTabBtnExpenseActive: {
    backgroundColor: '#FEE2E2',
  },
  typeTabBtnIncomeActive: {
    backgroundColor: '#DCFCE7',
  },
  typeTabText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  typeTabTextActive: {
    color: '#111827',
  },
  formGroup: {
    gap: 7,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  formInput: {
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
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colHalf: {
    flex: 1,
    gap: 7,
  },
  txModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 16,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitPillBtn: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  // Member avatar stack & role switch in header
  memberAvatarGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  stackedAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  stackedAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  ownerCrownBadge: {
    position: 'absolute',
    top: -7,
    right: -6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  ownerCrownText: {
    fontSize: 9,
  },
  invitePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  invitePillBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#064E3B',
  },
  roleSwitcherWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  roleSwitchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleSwitchBtnActive: {
    backgroundColor: '#10B981',
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  roleSwitchTextActive: {
    color: '#FFFFFF',
  },
  circleActionBtnDisabled: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Members Card in rightCol
  membersCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  membersCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membersHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  membersCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  memberCountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  memberCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#064E3B',
  },
  inviteMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#98E4B0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  inviteMiniBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064E3B',
  },
  membersList: {
    gap: 0,
  },
  memberItem: {
    paddingVertical: 10,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  memberAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  memberRoleBadgeOwner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  memberRoleBadgeOwnerText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  memberRoleBadgeMember: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memberRoleBadgeMemberText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  memberSub: {
    fontSize: 11.5,
    fontWeight: '500',
  },
});
