import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getBudgetApi, BudgetData, getTransactionsByDateApi, deleteTransactionApi } from '../../services/api';
import { FinancialCalendarWidget } from '../../components/FinancialCalendarWidget';
import { RemindersWidget } from '../../components/RemindersWidget';
import { BillsAndDebtsWidget } from '../../components/BillsAndDebtsWidget';

import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { BudgetModal } from '../../components/BudgetModal';
import { formatYMD } from '../../utils/dateUtils';

interface HomeScreenProps {
  refreshTrigger?: number;
  onNavigateToCamera?: (dateStr?: string) => void;
  onNavigateToAddExpense?: (dateStr?: string) => void;
  onNavigateToQuickSave?: (dateStr?: string) => void;
  onNavigateToDetail?: (transactionId: string) => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToCalendar?: () => void;
  onNavigateToProfile?: () => void;
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
}) => {
  const { user: authUser } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const avatarUri = authUser?.avatarUrl;

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

  const [budget, setBudget] = React.useState<BudgetData>({
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
  });

  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const [selectedDateStr, setSelectedDateStr] = React.useState<string>(todayStr);
  const [selectedWeekDay, setSelectedWeekDay] = React.useState<number>(new Date().getDate());
  const [selectedDateLabel, setSelectedDateLabel] = React.useState<string>('Hôm nay');

  const [todayExpenses, setTodayExpenses] = React.useState<ExpenseCardItem[]>(DEFAULT_TODAY_EXPENSES);
  const [todayTotal, setTodayTotal] = React.useState<number>(185000);
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [deletingExpense, setDeletingExpense] = React.useState<ExpenseCardItem | null>(null);
  const [isDeletingTx, setIsDeletingTx] = React.useState<boolean>(false);
  const [isBudgetModalVisible, setIsBudgetModalVisible] = React.useState<boolean>(false);

  const greetingSub = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return isVi ? 'Chào buổi sáng,' : 'Good morning,';
    if (h < 18) return isVi ? 'Chào buổi chiều,' : 'Good afternoon,';
    return isVi ? 'Chào buổi tối,' : 'Good evening,';
  }, [isVi]);

  // Tính số ngày còn lại trong tháng và gợi ý chi an toàn hàng ngày
  const remainingDaysInMonth = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, lastDayOfMonth - now.getDate() + 1);
  }, []);

  const safeDailySpend = useMemo(() => {
    return Math.max(0, Math.round(budget.remaining / remainingDaysInMonth));
  }, [budget.remaining, remainingDaysInMonth]);

  const handleConfirmDeleteExpense = async () => {
    if (!deletingExpense) return;
    setIsDeletingTx(true);
    try {
      if (deletingExpense.id && !deletingExpense.id.startsWith('tx_')) {
        await deleteTransactionApi(deletingExpense.id);
      }
      setTodayExpenses((prev) => prev.filter((item) => item.id !== deletingExpense.id));
      setTodayTotal((prev) => Math.max(0, prev - deletingExpense.rawAmount));
      setDeletingExpense(null);
      // Refresh lại ngân sách
      const budgetData = await getBudgetApi();
      if (budgetData && budgetData.limit) setBudget(budgetData);
    } catch (e: any) {
      console.log('Error deleting transaction:', e);
      if (typeof alert !== 'undefined') {
        alert('Không thể xóa giao dịch: ' + (e?.message || 'Lỗi kết nối'));
      }
    } finally {
      setIsDeletingTx(false);
    }
  };

  const fetchHomeData = React.useCallback(async (targetDate?: string) => {
    const queryDate = targetDate || selectedDateStr;
    try {
      const budgetData = await getBudgetApi();
      if (budgetData && budgetData.limit) {
        setBudget(budgetData);
      }
    } catch (e) {}

    try {
      const dailyRes = await getTransactionsByDateApi(queryDate);
      if (dailyRes && Array.isArray(dailyRes.items)) {
        if (dailyRes.items.length > 0) {
          const formatted: ExpenseCardItem[] = dailyRes.items.map((it: any) => ({
            id: it._id || it.id,
            title: it.title,
            amount: `${it.type === 'income' || it.amount > 0 ? '+' : '-'}${Math.abs(it.amount).toLocaleString('vi-VN')} đ`,
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
            onPress={() => {
              if (typeof alert !== 'undefined') {
                alert(isVi ? 'Bạn không có thông báo mới nào.' : 'You have no new notifications.');
              }
            }}
          >
            <Ionicons name="notifications-outline" size={21} color="#1E293B" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNavigateToProfile}
            activeOpacity={0.8}
          >
            {avatarUri && !imageError ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={[styles.avatar, { backgroundColor: avatarColor.bg, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: avatarColor.text, fontWeight: '800', fontSize: 16 }}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
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



        {/* 3. MINIMALIST EMERALD BUDGET CARD (Bản xanh đậm #064E3B + Ếch ôm lịch 3D siêu cute) */}
        <View style={styles.budgetCard}>
          <View style={styles.cardLeftContent}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="wallet-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.cardSubLabel}>{isVi ? 'Khả dụng' : 'Available'}</Text>
              </View>
              <TouchableOpacity
                style={styles.cardEditBtn}
                onPress={() => setIsBudgetModalVisible(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={11} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onNavigateToAnalytics}
            >
              <Text style={styles.cardMainBalance}>
                {budget.remaining.toLocaleString('vi-VN')} đ
              </Text>
            </TouchableOpacity>
          </View>

          {/* Chú ếch 3D ôm lịch dễ thương nhô nhẹ lên mép thẻ */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsBudgetModalVisible(true)}
            style={styles.cardMascotWrapper}
          >
            <Image
              source={require('../../../assets/frogs/frog-calendar-mascot.png')}
              style={styles.cardMascotImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* 4. LỊCH TÀI CHÍNH (Thay thế cho bảng Tuần này) */}
        <FinancialCalendarWidget
          selectedDay={selectedWeekDay}
          onSelectDay={(dayNum, fullDateStr, dateLabel) => {
            setSelectedWeekDay(dayNum);
            setSelectedDateStr(fullDateStr);
            setSelectedDateLabel(fullDateStr === todayStr ? 'Hôm nay' : dateLabel);
            fetchHomeData(fullDateStr);
          }}
          onViewAll={onNavigateToCalendar}
        />

        {/* 4.5. MỤC NHẮC NHỞ (Dưới Lịch tài chính, trên HÔM NAY) */}
        <RemindersWidget currentDateStr={selectedDateStr} />

        {/* 4.6. HÓA ĐƠN ĐỊNH KỲ & SỔ GHI NỢ (Dưới Mục nhắc nhở) */}
        <BillsAndDebtsWidget />

        {/* Khoảng cách đáy cuộn */}
        <View style={{ height: 28 }} />
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

      {/* Modal chỉnh sửa hạn mức ngân sách */}
      <BudgetModal
        visible={isBudgetModalVisible}
        onClose={() => setIsBudgetModalVisible(false)}
        currentLimit={budget.limit}
        currentSpent={budget.spent}
        onSaved={(updatedBudget) => {
          setBudget(updatedBudget);
          setIsBudgetModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  // MINIMALIST EMERALD BUDGET CARD (Tone xanh đậm #064E3B, chiều cao thu gọn, ếch 3D ôm lịch)
  budgetCard: {
    backgroundColor: '#064E3B', // Xanh đậm bản cũ sang trọng, uy tín
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10, // Thu gọn chiều cao cho đỡ chiếm diện tích
    marginBottom: 14,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
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
    fontSize: 13,
    color: '#FFFFFF', // Chữ Khả dụng màu trắng
    fontWeight: '700',
    letterSpacing: 0.2,
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
  cardMainBalance: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  cardMascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26, // Chú ếch nhô cao hơn khung xanh theo yêu cầu
    marginBottom: -10,
    marginRight: -4,
    marginLeft: 6,
  },
  cardMascotImage: {
    width: 96,
    height: 96,
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
});
