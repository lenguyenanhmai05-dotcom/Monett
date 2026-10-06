import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getAnalyticsOverviewApi,
  getCategoryBreakdownApi,
  getTransactionsApi,
} from '../../services/api';
import { getCurrentWeekRange, getDayOfWeekShort } from '../../utils/dateUtils';

interface AnalyticsScreenProps {
  onBack?: () => void;
  refreshTrigger?: number;
}

const getInitialChartData = () => {
  const todayShort = getDayOfWeekShort(new Date());
  const rawChart = [
    { day: 'T2', amount: 85, heightPercent: 28 },
    { day: 'T3', amount: 45, heightPercent: 15 },
    { day: 'T4', amount: 320, heightPercent: 100, highest: true },
    { day: 'T5', amount: 150, heightPercent: 48 },
    { day: 'T6', amount: 65, heightPercent: 22 },
    { day: 'T7', amount: 120, heightPercent: 38 },
    { day: 'CN', amount: 185, heightPercent: 60 },
  ];
  return rawChart.map((item) => ({
    ...item,
    current: item.day === todayShort,
  }));
};

interface CategoryItem {
  name: string;
  amount: string;
  percent: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const getCategoryMeta = (catName: string) => {
  const name = catName.toLowerCase();
  if (name.includes('ăn') || name.includes('uống') || name.includes('ẩm thực') || name.includes('bún')) {
    return { icon: 'restaurant-outline' as const, color: '#059669', bg: '#ECFDF5' };
  }
  if (name.includes('mua') || name.includes('sắm') || name.includes('shop')) {
    return { icon: 'bag-handle-outline' as const, color: '#2563EB', bg: '#EFF6FF' };
  }
  if (name.includes('xe') || name.includes('di chuyển') || name.includes('xăng')) {
    return { icon: 'car-outline' as const, color: '#D97706', bg: '#FEF3C7' };
  }
  if (name.includes('cà phê') || name.includes('cafe')) {
    return { icon: 'cafe-outline' as const, color: '#DB2777', bg: '#FCE7F3' };
  }
  return { icon: 'grid-outline' as const, color: '#7C3AED', bg: '#F5F3FF' };
};

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { name: 'Ăn uống', icon: 'restaurant-outline', amount: '520.000 đ', percent: 50, color: '#059669', bg: '#ECFDF5' },
  { name: 'Mua sắm', icon: 'bag-handle-outline', amount: '200.000 đ', percent: 19, color: '#2563EB', bg: '#EFF6FF' },
  { name: 'Di chuyển', icon: 'car-outline', amount: '180.000 đ', percent: 17, color: '#D97706', bg: '#FEF3C7' },
  { name: 'Cà phê', icon: 'cafe-outline', amount: '145.000 đ', percent: 14, color: '#DB2777', bg: '#FCE7F3' },
];

const DEFAULT_TOP_EXPENSES = [
  {
    title: 'Lẩu Haidilao (T4)',
    amount: '320.000 đ',
    category: 'Ăn uống',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80',
  },
  {
    title: 'Bún bò & bữa tối (CN)',
    amount: '185.000 đ',
    category: 'Ẩm thực',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120&auto=format&fit=crop&q=80',
  },
  {
    title: 'Đi siêu thị WinMart (T5)',
    amount: '150.000 đ',
    category: 'Mua sắm',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120&auto=format&fit=crop&q=80',
  },
];

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onBack, refreshTrigger }) => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [totalSpent, setTotalSpent] = useState<number>(1045000);
  const [dailyAvg, setDailyAvg] = useState<number>(149000);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [topExpenses, setTopExpenses] = useState(DEFAULT_TOP_EXPENSES);
  const [chartData, setChartData] = useState(getInitialChartData());
  const currentWeekStr = useMemo(() => getCurrentWeekRange(), []);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [overviewData, catData, txData] = await Promise.allSettled([
        getAnalyticsOverviewApi(period, currentMonth, currentYear),
        getCategoryBreakdownApi(period, currentMonth, currentYear),
        getTransactionsApi({ limit: 3, sort: 'amount_asc' }),
      ]);

      if (overviewData.status === 'fulfilled' && overviewData.value) {
        const ov = overviewData.value as any;
        const spent = Math.abs(ov.totalExpense || ov.totalSpent || 0);
        if (spent > 0) {
          setTotalSpent(spent);
          const divisor = period === 'week' ? 7 : (now.getDate() || 1);
          setDailyAvg(Math.round(spent / divisor));
        }
      }

      if (catData.status === 'fulfilled' && Array.isArray(catData.value) && catData.value.length > 0) {
        const cats: CategoryItem[] = catData.value.map((c: any) => {
          const meta = getCategoryMeta(c.name || c.category || 'Khác');
          return {
            name: c.name || c.category || 'Khác',
            icon: meta.icon,
            color: meta.color,
            bg: meta.bg,
            amount: `${Math.abs(c.amount || c.total || 0).toLocaleString('vi-VN')} đ`,
            percent: c.percentage || Math.round(c.percent || 0),
          };
        });
        setCategoryBreakdown(cats);
      }

      if (txData.status === 'fulfilled' && (txData.value as any)?.items?.length > 0) {
        const items = (txData.value as any).items.filter((t: any) => t.amount < 0);
        if (items.length > 0) {
          const formatted = items.slice(0, 3).map((t: any) => ({
            title: t.title,
            amount: `${Math.abs(t.amount).toLocaleString('vi-VN')} đ`,
            category: t.category || 'Chi tiêu',
            image: t.photoUri || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80',
          }));
          setTopExpenses(formatted);
        }
      }
    } catch (e) {
      console.log('Error fetching analytics:', e);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData, refreshTrigger]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar Chuẩn Fintech */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
        <Text style={styles.headerTitle}>Báo Cáo Thống Kê</Text>
        <TouchableOpacity style={styles.infoBtn} activeOpacity={0.7}>
          <Ionicons name="sparkles" size={17} color="#047857" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Bộ lọc Tuần / Tháng: Segmented Control iOS Cao Cấp */}
        <View style={styles.segmentedWrapper}>
          <TouchableOpacity
            style={[styles.segmentBtn, period === 'week' && styles.segmentBtnActive]}
            onPress={() => setPeriod('week')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={period === 'week' ? '#047857' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentText, period === 'week' && styles.segmentTextActive]}>
              Tuần này ({currentWeekStr})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, period === 'month' && styles.segmentBtnActive]}
            onPress={() => setPeriod('month')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="pie-chart-outline"
              size={13}
              color={period === 'month' ? '#047857' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentText, period === 'month' && styles.segmentTextActive]}>
              Tháng {new Date().getMonth() + 1}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Thẻ Metrics Banner Tổng Chi Tiêu (Fintech Overview Card) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>TỔNG CHI TIÊU KỲ NÀY</Text>
              <Text style={styles.summaryTotal}>{totalSpent.toLocaleString('vi-VN')} đ</Text>
            </View>

            {/* Trend Badge Tone-on-Tone */}
            <View style={styles.trendBadge}>
              <Ionicons name="trending-down" size={13} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.trendBadgeText}>Ổn định</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBottomRow}>
            <View style={styles.subMetricCol}>
              <Text style={styles.subMetricLabel}>Trung bình / ngày</Text>
              <Text style={styles.subMetricValue}>{dailyAvg.toLocaleString('vi-VN')} đ</Text>
            </View>
            <View style={styles.subMetricCol}>
              <Text style={styles.subMetricLabel}>Đánh giá kỳ</Text>
              <Text style={[styles.subMetricValue, { color: '#6EE7B7' }]}>Dưới hạn mức 🛡️</Text>
            </View>
          </View>
        </View>

        {/* 3.5. Chỉ số kỷ luật tài chính (Financial Health Score) */}
        <View style={styles.healthScoreCard}>
          <View style={styles.healthScoreLeft}>
            <View style={styles.healthShieldCircle}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.healthScoreTitle}>Kỷ luật ngân sách</Text>
              <Text style={styles.healthScoreSubtitle}>Chi tiêu đúng kế hoạch, không thâm hụt</Text>
            </View>
          </View>
          <View style={styles.healthScoreBadge}>
            <Text style={styles.healthScoreNumber}>88<Text style={styles.healthScoreTotal}>/100</Text></Text>
          </View>
        </View>

        {/* 4. Biểu đồ cột tuần: Capsule Bars Hiện Đại */}
        <View style={styles.chartCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>BIỂU ĐỒ CHI THEO NGÀY</Text>
            <View style={styles.chartLegend}>
              <View style={[styles.chartLegendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.chartLegendText}>Hôm nay</Text>
            </View>
          </View>

          <View style={styles.barChartWrapper}>
            {chartData.map((item, idx) => (
              <View key={idx} style={styles.barColumn}>
                <Text style={[styles.barTopAmount, item.highest && styles.barTopAmountHighest]}>
                  {item.amount}k
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${item.heightPercent}%` },
                      item.highest && styles.barHighest,
                      item.current && styles.barCurrent,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barDayLabel,
                    item.day === 'CN' && styles.barDayLabelSunday,
                    item.current && styles.barDayLabelCurrent,
                  ]}
                >
                  {item.day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 5. Phân bổ theo Danh Mục: Vector Icon Box Tone-on-Tone */}
        <View style={styles.breakdownCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>CƠ CẤU DANH MỤC</Text>
            <Text style={styles.cardSubCount}>{categoryBreakdown.length} nhóm chi tiêu</Text>
          </View>

          {categoryBreakdown.map((cat, i) => (
            <View key={i} style={styles.catBreakdownItem}>
              <View style={styles.catInfoRow}>
                <View style={styles.catLeft}>
                  <View style={[styles.catIconContainer, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon} size={15} color={cat.color} />
                  </View>
                  <Text style={styles.catTitle}>{cat.name}</Text>
                </View>
                <View style={styles.catRight}>
                  <Text style={styles.catSum}>{cat.amount}</Text>
                  <View style={styles.catPercentBadge}>
                    <Text style={styles.catPct}>{cat.percent}%</Text>
                  </View>
                </View>
              </View>

              {/* Progress track bo tròn mượt mà */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${cat.percent}%`, backgroundColor: cat.color },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* 6. Top chi tiêu cao nhất */}
        <View style={[styles.breakdownCard, { marginBottom: 24 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>KHOẢN CHI LỚN TRONG TUẦN</Text>
            <Ionicons name="sparkles-outline" size={14} color="#D97706" />
          </View>

          {topExpenses.map((t, idx) => (
            <View key={idx} style={styles.topExpRow}>
              <Image source={{ uri: t.image }} style={styles.topExpThumb} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.topExpTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.topExpCategory}>{t.category}</Text>
              </View>
              <Text style={styles.topExpAmount}>{t.amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // SEGMENTED CONTROL
  segmentedWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  // METRICS BANNER CARD
  summaryCard: {
    backgroundColor: '#064E3B',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.6,
  },
  summaryTotal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 14,
  },
  summaryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subMetricCol: {
    flex: 1,
  },
  subMetricLabel: {
    fontSize: 11,
    color: '#D1FAE5',
    fontWeight: '500',
  },
  subMetricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 3,
  },
  // HEALTH SCORE CARD
  healthScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  healthScoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  healthShieldCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  healthScoreSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  healthScoreBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  healthScoreNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
  },
  healthScoreTotal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  // CHART CARD
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.6,
  },
  cardSubCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chartLegendText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  barChartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 145,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTopAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  barTopAmountHighest: {
    color: '#E11D48',
    fontWeight: '800',
  },
  barTrack: {
    width: 16,
    height: 95,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#A7F3D0',
    borderRadius: 8,
  },
  barHighest: {
    backgroundColor: '#F43F5E',
  },
  barCurrent: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  barDayLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '600',
  },
  barDayLabelSunday: {
    color: '#EA580C',
    fontWeight: '700',
  },
  barDayLabelCurrent: {
    color: '#047857',
    fontWeight: '900',
  },
  // CATEGORY BREAKDOWN CARD
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  catBreakdownItem: {
    marginBottom: 16,
  },
  catInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catSum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  catPercentBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  catPct: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // TOP EXPENSES
  topExpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  topExpThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  topExpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  topExpCategory: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  topExpAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
});
