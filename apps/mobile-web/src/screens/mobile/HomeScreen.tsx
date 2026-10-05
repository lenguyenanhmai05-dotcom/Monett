import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getBudgetApi, BudgetData, getTransactionsByDateApi, deleteTransactionApi } from '../../services/api';
import { WeeklyCalendarWidget } from '../../components/WeeklyCalendarWidget';

interface HomeScreenProps {
  refreshTrigger?: number;
  onNavigateToCamera?: () => void;
  onNavigateToAddExpense?: () => void;
  onNavigateToQuickSave?: () => void;
  onNavigateToDetail?: (transactionId: string) => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToCalendar?: () => void;
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

  const [todayExpenses, setTodayExpenses] = React.useState<ExpenseCardItem[]>(DEFAULT_TODAY_EXPENSES);
  const [todayTotal, setTodayTotal] = React.useState<number>(185000);

  const fetchHomeData = React.useCallback(async () => {
    try {
      const budgetData = await getBudgetApi();
      if (budgetData && budgetData.limit) {
        setBudget(budgetData);
      }
    } catch (e) {}

    try {
      const dailyRes = await getTransactionsByDateApi();
      if (dailyRes && dailyRes.items && dailyRes.items.length > 0) {
        const formatted: ExpenseCardItem[] = dailyRes.items.map((it: any) => ({
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
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData, refreshTrigger]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Image
            source={require('../../../assets/monett-brand-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.quickSaveBtn} onPress={onNavigateToQuickSave} activeOpacity={0.8}>
            <Ionicons name="flash" size={13} color="#047857" style={{ marginRight: 3 }} />
            <Text style={styles.quickSaveBtnText}>Lưu nhanh</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={21} color="#1E293B" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

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
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 2. Lời chào */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingSub}>Chào buổi sáng,</Text>
          <Text style={styles.greetingName}>{displayName} 👋</Text>
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
            <Text style={styles.cardTotalLimit}>{budget.limit.toLocaleString('vi-VN')} đ</Text>
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
        </TouchableOpacity>

        {/* 4. Tổng quan tuần (Weekly Overview 7 ngày) */}
        <WeeklyCalendarWidget
          selectedDay={24}
          onSelectDay={() => onNavigateToCalendar && onNavigateToCalendar()}
          onViewAll={onNavigateToCalendar}
        />

        {/* 5. Giao dịch hôm nay (Today's Expenses) */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>HÔM NAY</Text>
          <TouchableOpacity onPress={onNavigateToAddExpense}>
            <Text style={styles.viewAllText}>+ Thêm khoản chi</Text>
          </TouchableOpacity>
        </View>

        {/* Cuộn ngang các món chi tiêu có ảnh */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.todayScroll}>
          {todayExpenses.map((exp) => (
            <TouchableOpacity
              key={exp.id}
              style={styles.expenseCard}
              activeOpacity={0.8}
              onPress={() => onNavigateToDetail && onNavigateToDetail(exp.id)}
              onLongPress={() => {
                Alert.alert(
                  'Xóa giao dịch',
                  `Bạn có chắc muốn xóa "${exp.title}" (${exp.amount}) không?`,
                  [
                    { text: 'Hủy', style: 'cancel' },
                    {
                      text: 'Xóa',
                      style: 'destructive',
                      onPress: async () => {
                        if (exp.id && !exp.id.startsWith('tx_')) {
                          try {
                            await deleteTransactionApi(exp.id);
                          } catch (e) {
                            console.log('Error deleting transaction:', e);
                          }
                        }
                        setTodayExpenses((prev) => prev.filter((item) => item.id !== exp.id));
                        setTodayTotal((prev) => Math.max(0, prev - exp.rawAmount));
                      },
                    },
                  ]
                );
              }}
            >
              <Image source={{ uri: exp.image }} style={styles.expenseThumb} />
              <Text style={styles.expenseTitle} numberOfLines={1}>{exp.title}</Text>
              <Text style={styles.expenseAmount}>{exp.amount}</Text>
              <Text style={styles.expenseTime}>{exp.time}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tổng kết hôm nay */}
        <View style={styles.todaySummary}>
          <Text style={styles.todaySummaryLabel}>Tổng hôm nay</Text>
          <Text style={styles.todaySummaryAmount}>-{todayTotal.toLocaleString('vi-VN')} đ</Text>
        </View>

        {/* Nút hành động nhanh Camera */}
        <TouchableOpacity
          style={styles.cameraBannerBtn}
          activeOpacity={0.85}
          onPress={onNavigateToCamera}
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
  },
  brandLogo: {
    width: 105,
    height: 40,
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
    height: 70,
    borderRadius: 10,
    marginBottom: 8,
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
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
});
