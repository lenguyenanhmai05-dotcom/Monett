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
import { getBudgetApi, BudgetData, getTransactionsByDateApi, deleteTransactionApi } from '../../services/api';
import { WeeklyCalendarWidget, WeekDayItem } from '../../components/WeeklyCalendarWidget';
import { StreakBadgeWidget } from '../../components/StreakBadgeWidget';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
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

  const greetingSub = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng,';
    if (h < 18) return 'Chào buổi chiều,';
    return 'Chào buổi tối,';
  }, []);

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
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.quickSaveBtnText}>Lưu nhanh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              if (typeof alert !== 'undefined') {
                alert('Bạn không có thông báo mới nào.');
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

        {/* 2.5 Streak Widget: Giữ lửa chi tiêu */}
        <View style={{ marginBottom: 14 }}>
          <StreakBadgeWidget />
        </View>

        {/* 3. THE SIGNATURE EMERALD BUDGET CARD */}
        <TouchableOpacity
          style={styles.budgetCard}
          activeOpacity={0.9}
          onPress={onNavigateToAnalytics}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="card-outline" size={15} color="#A7F3D0" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeaderTag}>
                {`HẠN MỨC THÁNG ${budget.month}`}
              </Text>
            </View>

            {/* Status Chip Tone-on-Tone chuẩn Fintech */}
            <View style={styles.budgetStatusPill}>
              <View
                style={[
                  styles.budgetStatusDot,
                  {
                    backgroundColor:
                      budget.status === 'danger'
                        ? '#F87171'
                        : budget.status === 'warning'
                        ? '#FBBF24'
                        : '#34D399',
                  },
                ]}
              />
              <Ionicons
                name={
                  budget.status === 'danger'
                    ? 'alert-circle'
                    : budget.status === 'warning'
                    ? 'warning-outline'
                    : 'shield-checkmark'
                }
                size={11}
                color="#A7F3D0"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.budgetStatusText}>
                {budget.status === 'danger'
                  ? 'CẢNH BÁO'
                  : budget.status === 'warning'
                  ? 'CHI NHANH'
                  : 'ỔN ĐỊNH'}
              </Text>
            </View>
          </View>

          <Text style={styles.cardSubLabel}>Số dư khả dụng tháng</Text>
          <Text style={styles.cardMainBalance}>{budget.remaining.toLocaleString('vi-VN')} đ</Text>

          {/* Thanh Tiến Độ Ngân Sách */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.max(0, budget.remainingPercent))}%`,
                    backgroundColor:
                      budget.status === 'danger'
                        ? '#EF4444'
                        : budget.status === 'warning'
                        ? '#F59E0B'
                        : '#34D399',
                  },
                ]}
              />
            </View>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTextLeft}>
                Đã chi: {budget.spent.toLocaleString('vi-VN')} đ ({budget.spentPercent}%)
              </Text>
              <Text style={styles.progressTextRight}>{budget.remainingPercent}% còn lại</Text>
            </View>
          </View>

          {/* Gợi ý chi tiêu an toàn hàng ngày (Insight Pill chuẩn Apple HIG) */}
          <View style={styles.safeDailyContainer}>
            <View style={styles.safeDailyIconCircle}>
              <Ionicons name="sparkles" size={11} color="#F59E0B" />
            </View>
            <Text style={styles.safeDailyText}>
              Gợi ý chi hôm nay an toàn: ~{safeDailySpend.toLocaleString('vi-VN')} đ ({remainingDaysInMonth} ngày còn lại)
            </Text>
          </View>
        </TouchableOpacity>

        {/* 4. Tổng quan tuần (Weekly Overview 7 ngày) */}
        <WeeklyCalendarWidget
          selectedDay={selectedWeekDay}
          onSelectDay={(item: WeekDayItem) => {
            setSelectedWeekDay(item.dayNum);
            setSelectedDateStr(item.fullDateStr);
            setSelectedDateLabel(item.fullDateStr === todayStr ? 'Hôm nay' : `${item.day}, ${item.date}`);
            fetchHomeData(item.fullDateStr);
          }}
          onViewAll={onNavigateToCalendar}
        />

        {/* 5. Giao dịch theo ngày đã chọn */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionTitle}>
              {selectedDateStr === todayStr
                ? 'HÔM NAY'
                : `NGÀY ${selectedDateLabel.toUpperCase()}`}
            </Text>
            {selectedDateStr !== todayStr && (
              <TouchableOpacity
                style={styles.backTodayBtn}
                onPress={handleResetToToday}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={12} color="#047857" style={{ marginRight: 3 }} />
                <Text style={styles.backTodayText}>Về hôm nay</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => onNavigateToAddExpense && onNavigateToAddExpense(selectedDateStr)}>
            <Text style={styles.viewAllText}>+ Thêm khoản chi</Text>
          </TouchableOpacity>
        </View>

        {/* Danh sách các món chi tiêu */}
        {todayExpenses.length > 0 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.todayScroll}>
              {todayExpenses.map((exp) => (
                <TouchableOpacity
                  key={exp.id}
                  style={styles.expenseCard}
                  activeOpacity={0.8}
                  onPress={() => onNavigateToDetail && onNavigateToDetail(exp.id)}
                  onLongPress={() => setDeletingExpense(exp)}
                >
                  <View style={styles.expenseImageWrap}>
                    <Image source={{ uri: exp.image }} style={styles.expenseThumb} />
                    {/* Nút xóa nhanh 1 chạm */}
                    <TouchableOpacity
                      style={styles.cardDeleteQuickBtn}
                      activeOpacity={0.7}
                      onPress={(e) => {
                        e.stopPropagation();
                        setDeletingExpense(exp);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={11} color="#0F172A" />
                    </TouchableOpacity>

                    {/* Badge danh mục tinh tế */}
                    {exp.category && (
                      <View style={styles.cardCategoryBadge}>
                        <Text style={styles.cardCategoryText} numberOfLines={1}>
                          {exp.category}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.expenseTitle} numberOfLines={1}>{exp.title}</Text>
                  <Text style={styles.expenseAmount}>{exp.amount}</Text>
                  <Text style={styles.expenseTime}>{exp.time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tổng kết ngày */}
            <View style={styles.todaySummary}>
              <Text style={styles.todaySummaryLabel}>
                Tổng {selectedDateStr === todayStr ? 'hôm nay' : selectedDateLabel}
              </Text>
              <Text style={styles.todaySummaryAmount}>-{todayTotal.toLocaleString('vi-VN')} đ</Text>
            </View>
          </>
        ) : (
          /* Empty State thân thiện với Mascot chú ếch Monett */
          <View style={styles.emptyContainer}>
            <Image
              source={require('../../../assets/frog-hat-coin.png')}
              style={styles.emptyFrogImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>
              Chưa có khoản chi nào {selectedDateStr === todayStr ? 'hôm nay' : 'trong ngày này'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedDateStr === todayStr
                ? 'Chụp ảnh món ăn hoặc ghi chép nhanh để lưu giữ khoảnh khắc và kiểm soát chi tiêu nhé!'
                : 'Không có giao dịch nào được ghi nhận cho ngày này.'}
            </Text>
            <View style={styles.emptyActionsRow}>
              <TouchableOpacity
                style={styles.emptyPrimaryBtn}
                activeOpacity={0.85}
                onPress={() => onNavigateToCamera && onNavigateToCamera(selectedDateStr)}
              >
                <Ionicons name="camera" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyPrimaryBtnText}>Chụp ảnh món</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.emptySecondaryBtn}
                activeOpacity={0.8}
                onPress={() => onNavigateToAddExpense && onNavigateToAddExpense(selectedDateStr)}
              >
                <Ionicons name="create-outline" size={15} color="#047857" style={{ marginRight: 6 }} />
                <Text style={styles.emptySecondaryBtnText}>Nhập tay</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Nút hành động nhanh Camera */}
        <TouchableOpacity
          style={styles.cameraBannerBtn}
          activeOpacity={0.85}
          onPress={() => onNavigateToCamera && onNavigateToCamera(selectedDateStr)}
        >
          <View style={styles.cameraBannerIconWrap}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cameraBannerTitle}>Chụp ảnh món ăn & Hóa đơn</Text>
            <Text style={styles.cameraBannerDesc}>Lưu giữ khoảnh khắc chi tiêu trong 1 chạm</Text>
          </View>
          <View style={styles.cameraBannerArrowWrap}>
            <Ionicons name="arrow-forward" size={16} color="#047857" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal xác nhận xóa giao dịch chuẩn Fintech */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
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
    paddingTop: 16,
    paddingBottom: 100,
  },
  greetingSection: {
    marginBottom: 16,
  },
  greetingSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
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
  cameraBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 20,
    padding: 12,
    marginTop: 20,
  },
  cameraBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  cameraBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  cameraBannerDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  cameraBannerArrowWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  // EMERALD BUDGET CARD
  budgetCard: {
    backgroundColor: '#064E3B',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.5,
  },
  budgetStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  budgetStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  budgetStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D1FAE5',
    letterSpacing: 0.4,
  },
  cardTotalLimit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  cardSubLabel: {
    fontSize: 12,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  cardMainBalance: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  progressContainer: {
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressTextLeft: {
    fontSize: 11,
    color: '#D1FAE5',
    fontWeight: '600',
  },
  progressTextRight: {
    fontSize: 11,
    color: '#6EE7B7',
    fontWeight: '800',
  },
  safeDailyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  safeDailyIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  safeDailyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ECFDF5',
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
