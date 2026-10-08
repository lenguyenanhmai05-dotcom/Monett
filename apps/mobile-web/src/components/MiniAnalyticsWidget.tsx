import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { IAnalyticsOverview, ICategoryBreakdown } from '@monett/shared';
import { getAnalyticsOverviewApi, getCategoryBreakdownApi } from '../services/api';

interface MiniAnalyticsWidgetProps {
  language?: 'vi' | 'en';
  onViewFullReport?: () => void;
}

export const MiniAnalyticsWidget: React.FC<MiniAnalyticsWidgetProps> = ({
  language = 'vi',
  onViewFullReport,
}) => {
  const isVi = language === 'vi';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const [loading, setLoading] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const [overview, setOverview] = useState<IAnalyticsOverview>({
    totalIncome: 22000000,
    totalExpense: 14850000,
    savings: 7150000,
    dailyAverage: 480000,
    savingsPercent: 32.5,
    expensePercent: 67.5,
    savingsTargetDiffPercent: 15,
    incomeFixedPercent: 100,
    budgetLimit: 22000000,
    isSafe: true,
    safetyStatus: 'safe',
    streakDays: 24,
    momentsCount: 38,
    totalTransactions: 48,
    momentsRatio: 82,
    banner: {
      streakDays: 24,
      title: 'Tuyệt vời! Bạn đang kiểm soát chi tiêu rất xuất sắc',
      subtitle: 'Chi tiêu Tháng 10 đang nằm gọn trong ngưỡng an toàn 67.5% tổng thu nhập.',
    },
  });

  const [categories, setCategories] = useState<ICategoryBreakdown[]>([
    { id: '1', name: 'Ăn uống & Cà phê', amount: 5643000, percent: 38, color: '#047857', icon: '🍜' },
    { id: '2', name: 'Nhà cửa & Tiền phòng', amount: 3861000, percent: 26, color: '#4F46E5', icon: '🏠' },
    { id: '3', name: 'Mua sắm đồ dùng', amount: 2673000, percent: 18, color: '#F59E0B', icon: '🛍️' },
    { id: '4', name: 'Di chuyển & Học tập', amount: 2673000, percent: 18, color: '#0EA5E9', icon: '🚗' },
  ]);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ovData, catData] = await Promise.all([
          getAnalyticsOverviewApi('month'),
          getCategoryBreakdownApi('month'),
        ]);
        if (mounted) {
          if (ovData && ovData.totalIncome) setOverview(ovData);
          if (catData && catData.length > 0) setCategories(catData);
        }
      } catch (e) {
        // Fallback to default
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const formatMoney = (num?: number) => {
    if (!num) return '0';
    return Math.abs(num).toLocaleString('vi-VN');
  };

  // Donut Math
  const size = 210;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2; // (210 - 22) / 2 = 94
  const circum = 2 * Math.PI * radius; // ~590.62
  let accumulatedOffset = 0;

  const activeCategory = selectedCatId ? categories.find(c => c.id === selectedCatId) : null;
  const highestCategory = categories.length > 0
    ? [...categories].sort((a, b) => b.percent - a.percent)[0]
    : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.tag}>📊 {isVi ? 'TỔNG QUAN TÀI CHÍNH' : 'FINANCIAL OVERVIEW'}</Text>
          <Text style={styles.title}>
            {isVi ? 'Phân Tích Cơ Cấu Chi Tiêu' : 'Spending Structure Analysis'}
          </Text>
        </View>

        {onViewFullReport && (
          <TouchableOpacity
            style={styles.viewDetailBtn}
            onPress={onViewFullReport}
            activeOpacity={0.7}
          >
            <Text style={styles.viewDetailText}>
              {isVi ? 'Xem báo cáo chi tiết ›' : 'View Full Report ›'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main 2-Sided Layout: Sơ đồ to bên trái + Các mục chi tiêu bên phải */}
      <View style={[styles.mainLayout, isDesktop ? styles.rowDesktop : styles.colMobile]}>
        {/* ================= LEFT SIDE: SƠ ĐỒ TO + THỐNG KÊ NHANH ================= */}
        <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
          {/* Big Interactive Donut Chart */}
          <View style={styles.donutWrapper}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                {categories.map((c, i) => {
                  const strokeDash = (c.percent / 100) * circum;
                  const offset = accumulatedOffset;
                  accumulatedOffset += strokeDash;
                  const isSelected = activeCategory?.id === c.id;

                  return (
                    <Circle
                      key={c.id || i}
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="transparent"
                      stroke={c.color}
                      strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={`${strokeDash} ${circum - strokeDash}`}
                      strokeDashoffset={-offset}
                      strokeLinecap="round"
                      opacity={activeCategory && !isSelected ? 0.35 : 1}
                    />
                  );
                })}
              </G>
            </Svg>

            {/* Donut Center */}
            <View style={styles.donutCenter}>
              {activeCategory ? (
                <>
                  <Text style={styles.centerIcon}>{activeCategory.icon || '🏷️'}</Text>
                  <Text style={[styles.centerPercent, { color: activeCategory.color }]}>
                    {activeCategory.percent}%
                  </Text>
                  <Text style={styles.centerCatName} numberOfLines={1}>
                    {activeCategory.name}
                  </Text>
                  <Text style={styles.centerAmt}>{formatMoney(activeCategory.amount)}đ</Text>
                </>
              ) : (
                <>
                  <Text style={styles.centerSub}>{isVi ? 'TỔNG CHI TIÊU' : 'TOTAL EXPENSE'}</Text>
                  <Text style={styles.centerTotalAmount}>
                    {formatMoney(overview.totalExpense || 14850000)}đ
                  </Text>
                  {highestCategory && (
                    <View style={styles.highestPill}>
                      <Text style={styles.highestPillText}>
                        🔥 {isVi ? 'Cao nhất' : 'Highest'}: {highestCategory.name.split('&')[0].trim()} ({highestCategory.percent}%)
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* 2 Quick Summary Metrics Under Chart */}
          <View style={styles.statsRow}>
            {/* Stat 1: Tiết kiệm được trong tháng */}
            <View style={styles.statBoxGreen}>
              <View style={styles.statBoxHeader}>
                <Text style={styles.statBoxLabel}>
                  🐷 {isVi ? 'Tiền Tích Lũy' : 'Savings'}
                </Text>
                <View style={styles.badgePillGreen}>
                  <Text style={styles.badgePillTextGreen}>+{overview.savingsTargetDiffPercent || 15}%</Text>
                </View>
              </View>
              <Text style={styles.statBoxValueGreen}>{formatMoney(overview.savings)} VNĐ</Text>
              <Text style={styles.statBoxSub}>
                {isVi
                  ? `Chiếm ${overview.savingsPercent || 32.5}% thu nhập`
                  : `${overview.savingsPercent || 32.5}% of income`}
              </Text>
            </View>

            {/* Stat 2: Mức chi TB/ngày */}
            <View style={styles.statBoxAmber}>
              <View style={styles.statBoxHeader}>
                <Text style={styles.statBoxLabel}>
                  📅 {isVi ? 'Chi TB / Ngày' : 'Daily Spend'}
                </Text>
                <View style={styles.badgePillAmber}>
                  <Text style={styles.badgePillTextAmber}>{isVi ? 'An toàn' : 'Safe'}</Text>
                </View>
              </View>
              <Text style={styles.statBoxValueAmber}>
                {formatMoney(overview.dailyAverage || 480000)} VNĐ
              </Text>
              <Text style={styles.statBoxSub}>
                {isVi ? 'Chuẩn: 480k/ngày' : 'Target: 480k/day'}
              </Text>
            </View>
          </View>
        </View>

        {/* ================= RIGHT SIDE: CÁC MỤC ĂN UỐNG, CÀ PHÊ, DI CHUYỂN, HỌC TẬP,... ================= */}
        <View style={[styles.rightColumn, isDesktop && styles.rightColumnDesktop]}>
          <View style={styles.categoryListHeader}>
            <Text style={styles.categorySectionTitle}>
              🏷️ {isVi ? 'Chi tiết từng khoản chi' : 'Expense Breakdown'}
            </Text>
            <Text style={styles.categoryCount}>
              {categories.length} {isVi ? 'danh mục' : 'categories'}
            </Text>
          </View>

          <View style={styles.categoriesList}>
            {categories.map((c) => {
              const isSelected = activeCategory?.id === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catRowCard,
                    isSelected && [styles.catRowCardSelected, { borderColor: c.color }],
                  ]}
                  onPress={() => setSelectedCatId(isSelected ? null : c.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.catLeftPart}>
                    <View style={[styles.catIconWrap, { backgroundColor: c.color + '18' }]}>
                      <Text style={styles.catIconEmoji}>{c.icon || '🏷️'}</Text>
                    </View>
                    <View style={styles.catTextInfo}>
                      <View style={styles.catTitleLine}>
                        <Text style={styles.catNameText}>{c.name}</Text>
                        <View style={[styles.catPercentBadge, { backgroundColor: c.color + '20' }]}>
                          <Text style={[styles.catPercentBadgeText, { color: c.color }]}>
                            {c.percent}%
                          </Text>
                        </View>
                      </View>
                      {/* Progress Bar */}
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${c.percent}%`, backgroundColor: c.color },
                          ]}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.catRightPart}>
                    <Text style={styles.catAmountMain}>{formatMoney(c.amount)} VNĐ</Text>
                    <Text style={styles.catRatioSub}>
                      {isVi ? `chiếm ${c.percent}% chi tiêu` : `${c.percent}% of total`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  titleGroup: {
    gap: 4,
  },
  tag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  viewDetailBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },

  // 2-Sided Layout
  mainLayout: {
    gap: 28,
  },
  rowDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  colMobile: {
    flexDirection: 'column',
  },

  // LEFT COLUMN
  leftColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  leftColumnDesktop: {
    flex: 1,
    minWidth: 320,
  },
  donutWrapper: {
    position: 'relative',
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    paddingHorizontal: 8,
  },
  centerIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  centerPercent: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  centerCatName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  centerAmt: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  centerSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  centerTotalAmount: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
    marginBottom: 4,
  },
  highestPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  highestPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },

  // Stats Row under Chart
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statBoxGreen: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 14,
    padding: 12,
  },
  statBoxAmber: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 14,
    padding: 12,
  },
  statBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  badgePillGreen: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgePillTextGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  badgePillAmber: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgePillTextAmber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  statBoxValueGreen: {
    fontSize: 15,
    fontWeight: '900',
    color: '#047857',
  },
  statBoxValueAmber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B45309',
  },
  statBoxSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },

  // RIGHT COLUMN: Categories
  rightColumn: {
    gap: 12,
    justifyContent: 'center',
  },
  rightColumnDesktop: {
    flex: 1.25,
    minWidth: 360,
  },
  categoryListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  categorySectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  categoriesList: {
    gap: 10,
  },
  catRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  catRowCardSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  catLeftPart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catIconEmoji: {
    fontSize: 18,
  },
  catTextInfo: {
    flex: 1,
    gap: 6,
  },
  catTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  catNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  catPercentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catPercentBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catRightPart: {
    alignItems: 'flex-end',
    minWidth: 110,
  },
  catAmountMain: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  catRatioSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
});
