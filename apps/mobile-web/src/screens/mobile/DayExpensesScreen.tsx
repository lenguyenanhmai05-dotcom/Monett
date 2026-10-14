import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTransactionsByDateApi } from '../../services/api';
import { SAMPLE_DAYS_MAP } from '../../components/FinancialCalendarWidget';

export interface DayExpensesScreenProps {
  dateStr: string; // YYYY-MM-DD
  dateLabel?: string;
  refreshTrigger?: number;
  onBack: () => void;
  onNavigateToDetail?: (transactionId: string) => void;
  onNavigateToQuickSave?: (dateStr: string) => void;
  onNavigateToCamera?: (dateStr: string) => void;
}

interface DayExpenseItem {
  id: string;
  title: string;
  amount: string;
  rawAmount: number;
  time: string;
  category: string;
  image?: string;
}

export const DayExpensesScreen: React.FC<DayExpensesScreenProps> = ({
  dateStr,
  dateLabel,
  refreshTrigger,
  onBack,
  onNavigateToDetail,
  onNavigateToQuickSave,
  onNavigateToCamera,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expenses, setExpenses] = useState<DayExpenseItem[]>([]);
  const [totalSpent, setTotalSpent] = useState<number>(0);

  // Định dạng ngày hiển thị đẹp chuẩn xác theo thực tế (Thứ, ngày/tháng/năm)
  const formattedDateTitle = useMemo(() => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const dayOfWeek = isVi
          ? ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][d.getDay()]
          : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];

        const now = new Date();
        const isToday =
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate();

        if (isToday) {
          return isVi
            ? `Hôm nay (${dayOfWeek}, ${parts[2]}/${parts[1]}/${parts[0]})`
            : `Today (${dayOfWeek}, ${parts[2]}/${parts[1]}/${parts[0]})`;
        }
        return `${dayOfWeek}, ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch (e) {}
    return dateLabel || dateStr;
  }, [dateStr, dateLabel, isVi]);

  const fetchDayExpenses = useCallback(async () => {
    try {
      const res = await getTransactionsByDateApi(dateStr);
      let itemsList: any[] = [];

      if (res && Array.isArray(res.items) && res.items.length > 0) {
        itemsList = res.items;
      } else {
        // Fallback: Nếu ngày này có dữ liệu mẫu khớp với Lịch (Tháng 10/2026, ngày 1..11)
        const parts = dateStr.split('-');
        if (parts.length === 3 && parts[0] === '2026' && parts[1] === '10') {
          const dNum = Number(parts[2]);
          const sample = SAMPLE_DAYS_MAP[dNum];
          if (sample && Array.isArray(sample.items) && sample.items.length > 0) {
            itemsList = sample.items.map((it: any) => ({
              id: it.id,
              title: it.title,
              amount: -(sample.rawAmount || 0),
              photoUri: sample.imageUrl,
              category: sample.category || it.category,
              date: dateStr,
            }));
          }
        }
      }

      if (itemsList.length > 0) {
        const formatted: DayExpenseItem[] = itemsList.map((it: any) => ({
          id: it._id || it.id,
          title: it.title || (isVi ? 'Khoản chi' : 'Expense'),
          amount: `${it.type === 'income' || it.amount > 0 ? '+' : '-'}${Math.abs(it.amount).toLocaleString('vi-VN')} đ`,
          rawAmount: Math.abs(it.amount),
          time: it.date
            ? new Date(it.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '08:00',
          category: it.category || (isVi ? 'Chi tiêu' : 'General'),
          image: it.photoUri,
        }));
        setExpenses(formatted);
        const total = formatted.reduce((acc, curr) => acc + curr.rawAmount, 0);
        setTotalSpent(total);
      } else {
        setExpenses([]);
        setTotalSpent(0);
      }
    } catch (e) {
      console.log('Error fetching day expenses:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateStr, isVi]);

  useEffect(() => {
    setLoading(true);
    fetchDayExpenses();
  }, [fetchDayExpenses, refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDayExpenses();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* 1. Header tối giản & thanh lịch */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {formattedDateTitle}
          </Text>
          <Text style={styles.headerSubtitle}>
            {expenses.length} {isVi ? 'khoản chi tiêu' : 'expenses'}
          </Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#047857']} />
        }
      >
        {/* 2. Hero Tối Giản: TỔNG CHI TIÊU TO RÕ Ở TRUNG TÂM */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <View style={styles.heroBadgeDot} />
            <Text style={styles.heroBadgeText}>{isVi ? 'KHOẢN LƯU CHI TIÊU' : 'EXPENSE SUMMARY'}</Text>
          </View>

          <Text style={styles.heroAmount}>
            {totalSpent > 0 ? `-${totalSpent.toLocaleString('vi-VN')} đ` : '0 đ'}
          </Text>

          {/* 2 nút hành động tối giản dạng pill */}
          <View style={styles.actionPillsRow}>
            <TouchableOpacity
              style={styles.pillQuickSave}
              onPress={() => onNavigateToQuickSave && onNavigateToQuickSave(dateStr)}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={15} color="#047857" style={{ marginRight: 6 }} />
              <Text style={styles.pillQuickSaveText}>{isVi ? 'Lưu nhanh' : 'Quick Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pillCamera}
              onPress={() => onNavigateToCamera && onNavigateToCamera(dateStr)}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.pillCameraText}>{isVi ? 'Chụp ảnh' : 'Take Photo'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Đường gạch phân cách nhẹ */}
        <View style={styles.sectionDivider} />

        {/* 3. MỤC: THỜI GIAN CHI TIÊU (Lướt lên xem trọn vẹn khắp màn hình) */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeaderRow}>
            <Text style={styles.timelineTitle}>
              {isVi ? 'Thời gian chi tiêu' : 'Timeline'}
            </Text>
            <Text style={styles.timelineCountText}>
              {expenses.length} {isVi ? 'giao dịch' : 'items'}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#047857" />
              <Text style={styles.loadingText}>{isVi ? 'Đang tải dữ liệu...' : 'Loading...'}</Text>
            </View>
          ) : expenses.length === 0 ? (
            /* Empty state tối giản - KHÔNG LẶP LẠI NÚT BẤM */
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={32} color="#047857" />
              </View>
              <Text style={styles.emptyTitle}>
                {isVi ? 'Chưa có khoản chi nào ngày này' : 'No expenses recorded'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isVi
                  ? 'Bấm Lưu nhanh hoặc Chụp ảnh ở phía trên để ghi lại chi tiêu nhé!'
                  : 'Use Quick Save or Camera above to record an expense for this day.'}
              </Text>
            </View>
          ) : (
            /* Danh sách các khoản chi tràn rộng toàn màn hình */
            <View style={styles.expenseList}>
              {expenses.map((item, index) => (
                <View key={item.id || index}>
                  <TouchableOpacity
                    style={styles.expenseItemRow}
                    activeOpacity={0.65}
                    onPress={() => onNavigateToDetail && onNavigateToDetail(item.id)}
                  >
                    <View style={styles.expenseItemLeft}>
                      {/* Badge giờ & danh mục */}
                      <View style={styles.metaRow}>
                        <View style={styles.timeBadge}>
                          <Ionicons name="time-outline" size={11} color="#64748B" style={{ marginRight: 3 }} />
                          <Text style={styles.timeBadgeText}>{item.time}</Text>
                        </View>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{item.category}</Text>
                        </View>
                      </View>

                      {/* Tên khoản chi */}
                      <Text style={styles.expenseTitle} numberOfLines={2}>
                        {item.title}
                      </Text>

                      {/* Số tiền */}
                      <Text style={styles.expenseAmount}>
                        {item.amount.startsWith('-') || item.amount.startsWith('+') ? item.amount : `-${item.amount}`}
                      </Text>
                    </View>

                    {/* Thumbnail ảnh hoặc Icon */}
                    <View style={styles.expenseItemRight}>
                      {item.image && !item.image.includes('placeholder') ? (
                        <Image
                          source={{ uri: item.image }}
                          style={styles.expenseThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.expenseIconBox}>
                          <Ionicons name="receipt-outline" size={24} color="#047857" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Đường kẻ mỏng nhẹ nhàng giữa các khoản chi */}
                  {index < expenses.length - 1 && <View style={styles.itemDivider} />}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Hero section tối giản
  heroSection: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#047857',
    marginRight: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
    marginBottom: 20,
  },
  actionPillsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 360,
  },
  pillQuickSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  pillQuickSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#047857',
  },
  pillCamera: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  pillCameraText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionDivider: {
    height: 8,
    backgroundColor: '#F8FAFC',
    marginVertical: 4,
  },
  // Timeline
  timelineSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  expenseList: {
    paddingBottom: 20,
  },
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  expenseItemLeft: {
    flex: 1,
    paddingRight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EF4444',
  },
  expenseItemRight: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  expenseIconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});
