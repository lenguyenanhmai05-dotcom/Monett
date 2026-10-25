import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { getBudgetApi, BudgetData, getTransactionsByDateApi, getTransactionsApi, deleteTransactionApi } from '../../services/api';
import { FinancialCalendarWidget } from '../../components/FinancialCalendarWidget';
import { RemindersWidget } from '../../components/RemindersWidget';
import { HomeRecentTransactionsWidget } from '../../components/HomeRecentTransactionsWidget';
import { HomeRecurringWidget } from '../../components/HomeRecurringWidget';
import { HomeEventsWidget } from '../../components/HomeEventsWidget';

import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { IncomeManagementScreen } from './IncomeManagementScreen';
import { formatYMD } from '../../utils/dateUtils';
import {
  getInitialDayRecordsFromLocalStorage,
  saveDayRecordsToStorage,
  mergeTransactionsIntoDayRecords,
  subscribeCalendarUpdates,
  removeDayRecordItem,
  getCachedBudget,
  saveCachedBudget,
  notifyBudgetUpdated,
  subscribeBudgetUpdates,
  applyBudgetDelta,
  calculateMonthTotalExpenses,
  isIncomeTransactionOrItem,
} from '../../services/calendarStorage';
import {
  getTotalIncomeForMonth,
  subscribeIncomeUpdates,
  syncIncomeWithBudget,
} from '../../services/incomeStorage';

interface HomeScreenProps {
  refreshTrigger?: number;
  onNavigateToCamera?: (dateStr?: string) => void;
  onNavigateToAddExpense?: (dateStr?: string) => void;
  onNavigateToQuickSave?: (dateStr?: string) => void;
  onNavigateToDetail?: (transactionId: string) => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToCalendar?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToDayExpenses?: (dateStr: string, dateLabel: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

interface ExpenseCardItem {
  id: string;
  title: string;
  amount: string;
  rawAmount: number;
  time: string;
  category: string;
  image: string;
}

const DEFAULT_TODAY_EXPENSES: ExpenseCardItem[] = [
  {
    id: 'tx_1',
    title: 'Bún bò Huế',
    amount: '-85.000 đ',
    rawAmount: 85000,
    time: '12:30',
    category: 'Ăn uống',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'tx_2',
    title: 'Cà phê muối',
    amount: '-45.000 đ',
    rawAmount: 45000,
    time: '10:15',
    category: 'Cà phê',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'tx_3',
    title: 'Đổ xăng xe',
    amount: '-55.000 đ',
    rawAmount: 55000,
    time: '08:20',
    category: 'Di chuyển',
    image: 'https://images.unsplash.com/photo-1527018607912-0ab8dc7ff34c?w=200&auto=format&fit=crop&q=80',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  refreshTrigger,
  onNavigateToCamera,
  onNavigateToAddExpense,
  onNavigateToQuickSave,
  onNavigateToDetail,
  onNavigateToAnalytics,
  onNavigateToCalendar,
  onNavigateToProfile,
  onNavigateToDayExpenses,
  onNavigateToTab,
}) => {
  const { user: authUser, logout } = useAuth();
  const { language } = useLanguage();
  const { unreadCount, toggleNotifications } = useNotifications();
  const isVi = language === 'vi';
  const avatarUri = authUser?.avatarUrl;
  const [isMenuDrawerVisible, setIsMenuDrawerVisible] = React.useState(false);

  const handleLogout = () => {
    Alert.alert(
      isVi ? 'Đăng xuất tài khoản' : 'Log Out',
      isVi ? 'Bạn có chắc chắn muốn đăng xuất khỏi Monett không?' : 'Are you sure you want to log out of Monett?',
      [
        { text: isVi ? 'Hủy' : 'Cancel', style: 'cancel' },
        {
          text: isVi ? 'Đăng xuất' : 'Log Out',
          style: 'destructive',
          onPress: () => {
            setIsMenuDrawerVisible(false);
            logout();
          },
        },
      ]
    );
  };

  const displayName = authUser?.fullName || (authUser?.email ? authUser.email.split('@')[0] : 'Min');

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: '#FEE2E2', text: '#B91C1C' }, // Red
      { bg: '#FEF3C7', text: '#D97706' }, // Yellow
      { bg: '#D1FAE5', text: '#059669' }, // Green
      { bg: '#DBEAFE', text: '#2563EB' }, // Blue
      { bg: '#E0E7FF', text: '#4F46E5' }, // Indigo
      { bg: '#FCE7F3', text: '#DB2777' }, // Pink
      { bg: '#F3E8FF', text: '#7E22CE' }, // Purple
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const avatarColor = getAvatarColor(displayName);
  const [imageError, setImageError] = React.useState(false);

  const [budget, setBudget] = React.useState<BudgetData>(() => {
    return (
      (getCachedBudget() as BudgetData) || {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        limit: 22000000,
        spent: 6180000,
        remaining: 15820000,
        spentPercent: 28.1,
        remainingPercent: 71.9,
        status: 'safe',
        payday: 5,
        daysUntilPayday: 12,
        currency: 'VND',
      }
    );
  });

  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const [selectedDateStr, setSelectedDateStr] = React.useState<string>(todayStr);
  const [selectedWeekDay, setSelectedWeekDay] = React.useState<number>(new Date().getDate());
  const [selectedDateLabel, setSelectedDateLabel] = React.useState<string>('Hôm nay');

  const [todayExpenses, setTodayExpenses] = React.useState<ExpenseCardItem[]>(DEFAULT_TODAY_EXPENSES);
  const [todayTotal, setTodayTotal] = React.useState<number>(185000);
  const [monthTransactions, setMonthTransactions] = React.useState<any[]>([]);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [deletingExpense, setDeletingExpense] = React.useState<ExpenseCardItem | null>(null);
  const [isDeletingTx, setIsDeletingTx] = React.useState<boolean>(false);
  const [isIncomeScreenOpen, setIsIncomeScreenOpen] = React.useState<boolean>(false);
  const [totalMonthIncome, setTotalMonthIncome] = React.useState<number>(() => {
    const n = new Date();
    return getTotalIncomeForMonth(n.getFullYear(), n.getMonth() + 1);
  });

  // Tổng chi tiêu thực tế của tháng hiện tại
  const realMonthSpent = React.useMemo(() => {
    const n = new Date();
    return calculateMonthTotalExpenses(n.getFullYear(), n.getMonth() + 1, undefined, monthTransactions);
  }, [monthTransactions]);

  // Số dư khả dụng = Tổng thu nhập - Tổng chi tiêu
  const availableBalance = React.useMemo(() => {
    if (totalMonthIncome === 0) {
      return realMonthSpent > 0 ? -realMonthSpent : 0;
    }
    return totalMonthIncome - realMonthSpent;
  }, [totalMonthIncome, realMonthSpent]);

  // Trạng thái ngân sách dựa trên thu & chi thực tế
  const budgetStatus = React.useMemo<'safe' | 'warning' | 'danger'>(() => {
    if (totalMonthIncome === 0) {
      return realMonthSpent > 0 ? 'danger' : 'safe';
    }
    if (availableBalance < 0) return 'danger';
    if (realMonthSpent / totalMonthIncome >= 0.8) return 'warning';
    return 'safe';
  }, [totalMonthIncome, realMonthSpent, availableBalance]);

  const greetingSub = React.useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return isVi ? 'Chào buổi sáng,' : 'Good morning,';
    if (h >= 11 && h < 14) return isVi ? 'Chào buổi trưa,' : 'Good noon,';
    if (h >= 14 && h < 18) return isVi ? 'Chào buổi chiều,' : 'Good afternoon,';
    if (h >= 18 && h < 22) return isVi ? 'Chào buổi tối,' : 'Good evening,';
    return isVi ? 'Chào bạn đêm muộn,' : 'Late night greetings,';
  }, [isVi]);

  // Tính số ngày còn lại trong tháng và gợi ý chi an toàn hàng ngày
  const remainingDaysInMonth = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, lastDayOfMonth - now.getDate() + 1);
  }, []);

  const safeDailySpend = useMemo(() => {
    return Math.max(0, Math.round(Math.max(0, availableBalance) / remainingDaysInMonth));
  }, [availableBalance, remainingDaysInMonth]);

  const handleConfirmDeleteExpense = async () => {
    if (!deletingExpense) return;
    const itemToDelete = deletingExpense;
    setIsDeletingTx(true);

    // Cập nhật số dư khả dụng ngay lập tức (0ms Optimistic UI)
    const updatedBudget = applyBudgetDelta(-itemToDelete.rawAmount, budget);
    setBudget(updatedBudget);

    // Cập nhật danh sách chi tiêu ngày được chọn ngay lập tức
    removeDayRecordItem(itemToDelete.id);
    setTodayExpenses((prev) => prev.filter((item) => item.id !== itemToDelete.id));
    setTodayTotal((prev) => Math.max(0, prev - itemToDelete.rawAmount));
    setDeletingExpense(null);
    setIsDeletingTx(false);

    try {
      if (itemToDelete.id && !itemToDelete.id.startsWith('tx_') && !itemToDelete.id.startsWith('tx-')) {
        await deleteTransactionApi(itemToDelete.id);
      }
    } catch (e: any) {
      console.log('Error deleting transaction from API:', e);
    } finally {
      try {
        syncIncomeWithBudget();
        fetchHomeData();
      } catch (_) {}
    }
  };

  const fetchHomeData = React.useCallback(async (targetDate?: string) => {
    const queryDate = targetDate || selectedDateStr;
    try {
      syncIncomeWithBudget();
    } catch (e) {}

    // Lấy toàn bộ giao dịch của tháng để hiển thị lên Lịch tài chính và đồng bộ với dayRecords
    try {
      const monthRes: any = await getTransactionsApi({ limit: 300 });
      const txList = Array.isArray(monthRes) ? monthRes : monthRes?.data || monthRes?.items || [];
      if (Array.isArray(txList)) {
        setMonthTransactions(txList);
        const curRecords = getInitialDayRecordsFromLocalStorage();
        const merged = mergeTransactionsIntoDayRecords(curRecords, txList);
        saveDayRecordsToStorage(merged);
      }
    } catch (e) {}

    try {
      const dailyRes = await getTransactionsByDateApi(queryDate);
      if (dailyRes && Array.isArray(dailyRes.items)) {
        const expenseOnly = dailyRes.items.filter((it: any) => !isIncomeTransactionOrItem(it));
        if (expenseOnly.length > 0) {
          const formatted: ExpenseCardItem[] = expenseOnly.map((it: any) => ({
            id: it._id || it.id,
            title: it.title,
            amount: `-${Math.abs(it.amount).toLocaleString('vi-VN')} đ`,
            rawAmount: Math.abs(it.amount),
            time: it.date ? new Date(it.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay',
            category: it.category || 'Ăn uống',
            image: it.photoUri || 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&auto=format&fit=crop&q=80',
          }));
          setTodayExpenses(formatted);
          const total = formatted.reduce((acc, curr) => acc + curr.rawAmount, 0);
          setTodayTotal(total);
        } else {
          setTodayExpenses([]);
          setTodayTotal(0);
        }
      }
    } catch (e) {}
  }, [selectedDateStr]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  }, [fetchHomeData]);

  const handleResetToToday = () => {
    const now = new Date();
    setSelectedDateStr(todayStr);
    setSelectedWeekDay(now.getDate());
    setSelectedDateLabel('Hôm nay');
    fetchHomeData(todayStr);
  };

  React.useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData, refreshTrigger]);

  // Lắng nghe cập nhật lịch chi tiêu từ Web hoặc các modal khác để tự động làm mới
  React.useEffect(() => {
    const unsub = subscribeCalendarUpdates(() => {
      fetchHomeData();
    });
    return unsub;
  }, [fetchHomeData]);

  // Lắng nghe cập nhật ngân sách trực tiếp (khi lưu hoặc xóa chi tiêu) để số dư nhảy tức thì
  React.useEffect(() => {
    const unsub = subscribeBudgetUpdates((b) => {
      if (b) setBudget(b as BudgetData);
    });
    return unsub;
  }, []);

  // Lắng nghe cập nhật các khoản thu nhập để nhảy tổng thu tức thì
  React.useEffect(() => {
    const unsub = subscribeIncomeUpdates(() => {
      const n = new Date();
      setTotalMonthIncome(getTotalIncomeForMonth(n.getFullYear(), n.getMonth() + 1));
    });
    return unsub;
  }, []);

  if (isIncomeScreenOpen) {
    return <IncomeManagementScreen onBack={() => setIsIncomeScreenOpen(false)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Image
            source={require('../../../assets/adaptive-icon.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Monett</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.quickSaveBtn}
            onPress={() => onNavigateToQuickSave && onNavigateToQuickSave(selectedDateStr)}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={13} color="#047857" style={{ marginRight: 3 }} />
            <Text style={styles.quickSaveBtnText}>{isVi ? 'Lưu nhanh' : 'Quick Save'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleNotifications}
            activeOpacity={0.7}
          >
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={21}
              color={unreadCount > 0 ? '#059669' : '#1E293B'}
            />
            {unreadCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>

          {/* Nút Hamburger Menu (thay cho ảnh đại diện theo yêu cầu) */}
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setIsMenuDrawerVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel={isVi ? 'Mở menu danh mục' : 'Open menu'}
          >
            <Ionicons name="menu-outline" size={23} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
      >
        {/* 2. Lời chào */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingSub}>{greetingSub}</Text>
          <Text style={styles.greetingName}>{displayName}</Text>
        </View>



        {/* 3. EMERALD BUDGET CARD (Khả dụng - bản to rõ như hình 2 + Ếch ôm lịch 3D) */}
        <View style={styles.budgetCard}>
          <View style={styles.cardLeftContent}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="wallet-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.cardSubLabel}>{isVi ? 'Khả dụng' : 'Available'}</Text>
              </View>
              {/* Bấm icon cây bút nhảy ra trang tổng thu nhập luôn */}
              <TouchableOpacity
                style={styles.cardEditBtn}
                onPress={() => setIsIncomeScreenOpen(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={11} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Badge trạng thái */}
              <View
                style={[
                  styles.cardStatusBadge,
                  budgetStatus === 'danger'
                    ? { backgroundColor: '#EF4444' }
                    : budgetStatus === 'warning'
                    ? { backgroundColor: '#F59E0B' }
                    : { backgroundColor: '#10B981' },
                ]}
              >
                <Text style={styles.cardStatusBadgeText}>
                  {totalMonthIncome === 0
                    ? (isVi ? 'Chưa có thu' : 'No Income')
                    : budgetStatus === 'danger'
                    ? (isVi ? 'Vượt' : 'Exceeded')
                    : budgetStatus === 'warning'
                    ? (isVi ? 'Gần đủ' : 'Warning')
                    : (isVi ? 'An toàn' : 'Safe')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsIncomeScreenOpen(true)}
            >
              <Text style={styles.cardMainBalance}>
                {availableBalance >= 0
                  ? `${availableBalance.toLocaleString('vi-VN')} đ`
                  : `-${Math.abs(availableBalance).toLocaleString('vi-VN')} đ`}
              </Text>
            </TouchableOpacity>

            <View style={styles.cardDividerLine} />

            <Text style={styles.cardStatusSubText}>
              {totalMonthIncome === 0
                ? (isVi ? 'Bấm ✏️ để thêm thu nhập và bắt đầu quản lý' : 'Tap ✏️ to add income & track budget')
                : budgetStatus === 'danger'
                ? (isVi ? 'Chi đang vượt thu tháng này' : 'Expenses exceed income this month')
                : (isVi ? `Chi tiêu an toàn: ~${safeDailySpend.toLocaleString('vi-VN')} đ/ngày` : `Safe spend: ~${safeDailySpend.toLocaleString('vi-VN')} đ/day`)}
            </Text>
          </View>

          {/* Chú ếch 3D ôm lịch dễ thương nhô nhẹ lên mép thẻ */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsIncomeScreenOpen(true)}
            style={styles.cardMascotWrapper}
          >
            <Image
              source={require('../../../assets/frogs/frog-calendar-mascot.png')}
              style={styles.cardMascotImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* 4. LỊCH TÀI CHÍNH (Đã tích hợp phần CHI và THU bên trong thẻ lịch như hình 1) */}
        <FinancialCalendarWidget
          selectedDay={selectedWeekDay}
          transactions={monthTransactions}
          totalIncome={totalMonthIncome}
          onPressIncome={() => setIsIncomeScreenOpen(true)}
          onPressExpense={onNavigateToAnalytics}
          onNavigateToCamera={() => onNavigateToCamera?.()}
          onSelectDay={(dayNum, fullDateStr, dateLabel) => {
            setSelectedWeekDay(dayNum);
            setSelectedDateStr(fullDateStr);
            const label = fullDateStr === todayStr ? (isVi ? 'Hôm nay' : 'Today') : dateLabel;
            setSelectedDateLabel(label);
            if (onNavigateToDayExpenses) {
              onNavigateToDayExpenses(fullDateStr, label);
            }
          }}
          onViewAll={onNavigateToCalendar}
        />

        {/* 4.5. MỤC NHẮC NHỞ */}
        <RemindersWidget currentDateStr={selectedDateStr} />

        {/* 4.6. GIAO DỊCH GẦN ĐÂY (Khớp 100% hình 2) */}
        <HomeRecentTransactionsWidget
          transactions={monthTransactions}
          onViewAll={onNavigateToCalendar}
          onSelectTransaction={onNavigateToDetail}
          language={language}
        />

        {/* 4.7. CHI ĐỊNH KỲ (Khớp 100% hình 2) */}
        <HomeRecurringWidget
          onViewAll={() => {
            if (onNavigateToTab) onNavigateToTab('recurring');
          }}
          language={language}
        />

        {/* 4.8. SỰ KIỆN (Khớp 100% hình 2) */}
        <HomeEventsWidget
          onViewAll={() => {
            if (onNavigateToTab) onNavigateToTab('events');
          }}
          language={language}
        />

        {/* Khoảng cách đáy cuộn */}
        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmDeleteModal
        visible={Boolean(deletingExpense)}
        itemTitle={deletingExpense?.title}
        itemAmount={deletingExpense?.amount}
        itemImage={deletingExpense?.image}
        itemCategory={deletingExpense?.category}
        isDeleting={isDeletingTx}
        onConfirm={handleConfirmDeleteExpense}
        onCancel={() => setDeletingExpense(null)}
      />

      {/* 6. MODAL HAMBURGER MENU DRAWER */}
      <Modal
        visible={isMenuDrawerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          {/* Backdrop tối mờ */}
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setIsMenuDrawerVisible(false)}
          />

          {/* Khung Drawer bên phải */}
          <View style={styles.drawerContainer}>
            {/* Header Drawer */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrandRow}>
                <Image
                  source={require('../../../assets/adaptive-icon.png')}
                  style={styles.drawerBrandLogo}
                  resizeMode="contain"
                />
                <Text style={styles.drawerBrandTitle}>Monett</Text>
              </View>
              <TouchableOpacity
                style={styles.drawerCloseBtn}
                onPress={() => setIsMenuDrawerVisible(false)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Danh mục: Tổng quan, Bảng tin, Sự kiện, Báo cáo, Tích lũy, Sổ ghi nợ, Cài đặt */}
            <ScrollView
              style={styles.drawerMenuList}
              contentContainerStyle={styles.drawerMenuContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.drawerSectionTitle}>
                {isVi ? 'DANH MỤC' : 'CATEGORIES'}
              </Text>

              {/* 1. Tổng quan */}
              <TouchableOpacity
                style={[styles.drawerMenuItem, styles.drawerMenuItemActive]}
                onPress={() => {
                  setIsMenuDrawerVisible(false);
                  onNavigateToTab?.('home');
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.drawerMenuIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="home" size={18} color="#064E3B" />
                </View>
                <Text style={[styles.drawerMenuText, styles.drawerMenuTextActive]}>
                  {isVi ? 'Tổng quan' : 'Overview'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#059669" />
              </TouchableOpacity>

              {/* 2. Bảng tin */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsMenuDrawerVisible(false);
                  onNavigateToTab?.('feed');
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.drawerMenuIconBox, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="newspaper-outline" size={18} color="#7C3AED" />
                </View>
                <Text style={styles.drawerMenuText}>
                  {isVi ? 'Bảng tin' : 'Feed'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              {/* 3. Sự kiện */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsMenuDrawerVisible(false);
                  onNavigateToTab?.('events');
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.drawerMenuIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="calendar-outline" size={18} color="#D97706" />
                </View>
                <Text style={styles.drawerMenuText}>
                  {isVi ? 'Sự kiện' : 'Events'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              {/* 4. Báo cáo */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsMenuDrawerVisible(false);
                  if (onNavigateToTab) onNavigateToTab('analytics');
                  else onNavigateToAnalytics?.();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.drawerMenuIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="pie-chart-outline" size={18} color="#0284C7" />
                </View>
                <Text style={styles.drawerMenuText}>
                  {isVi ? 'Báo cáo' : 'Reports'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              {/* 5. Tích lũy */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsMenuDrawerVisible(false);
                  onNavigateToTab?.('savings');
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.drawerMenuIconBox, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="wallet-outline" size={18} color="#DB2777" />
                </View>
                <Text style={styles.drawerMenuText}>
                  {isVi ? 'Tích lũy' : 'Savings'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              {/* 6. Sổ ghi nợ */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsMenuDrawerVisible(false);
                  onNavigateToTab?.('debt');
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.drawerMenuIconBox, { backgroundColor: '#FFEDD5' }]}>
                  <Ionicons name="book-outline" size={18} color="#EA580C" />
                </View>
                <Text style={styles.drawerMenuText}>
                  {isVi ? 'Sổ ghi nợ' : 'Debt Book'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              {/* 7. Cài đặt (Bấm vào cài đặt thì mới đưa tới trang cá nhân) */}
              <TouchableOpacity
                style={styles.drawerMenuItem}
                onPress={() => {
                  setIsMenuDrawerVisible(false);
                  if (onNavigateToTab) onNavigateToTab('profile');
                  else onNavigateToProfile?.();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.drawerMenuIconBox, { backgroundColor: '#F1F5F9' }]}>
                  <Ionicons name="settings-outline" size={18} color="#475569" />
                </View>
                <Text style={styles.drawerMenuText}>
                  {isVi ? 'Cài đặt' : 'Settings'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </ScrollView>

            {/* Ở DƯỚI CÙNG: Ảnh đại diện, Tên, Gmail, và Icon Đăng xuất */}
            <View style={styles.drawerFooter}>
              <View style={styles.drawerUserProfile}>
                {avatarUri && !imageError ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.drawerUserAvatar}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <View
                    style={[
                      styles.drawerUserAvatar,
                      { backgroundColor: avatarColor.bg, justifyContent: 'center', alignItems: 'center' },
                    ]}
                  >
                    <Text style={{ color: avatarColor.text, fontWeight: '800', fontSize: 16 }}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.drawerUserInfo}>
                  <Text style={styles.drawerUserName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.drawerUserEmail} numberOfLines={1}>
                    {authUser?.email || 'user@monett.vn'}
                  </Text>
                </View>
              </View>

              {/* Nút Icon Đăng xuất */}
              <TouchableOpacity
                style={styles.drawerLogoutBtn}
                onPress={handleLogout}
                activeOpacity={0.75}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel={isVi ? 'Đăng xuất tài khoản' : 'Log out'}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#FAF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  quickSaveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  greetingSection: {
    marginBottom: 6,
  },
  greetingSub: {
    fontSize: 12.5,
    color: '#6B7280',
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  todayScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  expenseCard: {
    width: 115,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  expenseThumb: {
    width: '100%',
    height: '100%',
  },
  expenseImageWrap: {
    position: 'relative',
    width: '100%',
    height: 70,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardDeleteQuickBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  cardCategoryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardCategoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expenseTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  expenseAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E11D48',
    marginTop: 2,
  },
  expenseTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  todaySummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 4,
  },
  todaySummaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  todaySummaryAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E11D48',
  },
  // EMERALD BUDGET CARD (Khả dụng - to rõ như hình 2 + ếch 3D ôm lịch)
  budgetCard: {
    backgroundColor: '#064E3B', // Xanh đậm sang trọng
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    minHeight: 140,
    marginBottom: 12,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    overflow: 'visible',
    position: 'relative',
  },
  cardLeftContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSubLabel: {
    fontSize: 14,
    color: '#FFFFFF', // Chữ Khả dụng màu trắng
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardEditBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cardStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    marginLeft: 10,
  },
  cardStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardMainBalance: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  cardDividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 8,
    width: '90%',
  },
  cardStatusSubText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  cardMascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    marginBottom: -8,
    marginRight: -6,
    marginLeft: 8,
  },
  cardMascotImage: {
    width: 104,
    height: 104,
  },

  backTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  backTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 4,
    marginBottom: 8,
  },
  emptyFrogImage: {
    width: 90,
    height: 90,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptySecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  hamburgerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawerContainer: {
    width: '78%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  drawerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerBrandLogo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  drawerBrandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.3,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerMenuList: {
    flex: 1,
  },
  drawerMenuContent: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 6,
  },
  drawerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  drawerMenuItemActive: {
    backgroundColor: '#F0FDF4',
  },
  drawerMenuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerMenuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  drawerMenuTextActive: {
    fontWeight: '700',
    color: '#064E3B',
  },
  drawerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  drawerUserProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  drawerUserAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#10B981',
    marginRight: 10,
  },
  drawerUserInfo: {
    flex: 1,
  },
  drawerUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  drawerUserEmail: {
    fontSize: 11.5,
    color: '#64748B',
  },
  drawerLogoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
