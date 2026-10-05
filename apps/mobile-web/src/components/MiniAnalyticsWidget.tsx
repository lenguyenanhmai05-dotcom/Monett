import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
  const [loading, setLoading] = useState(false);
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
    { id: '4', name: 'Di chuyển & Học tập', amount: 2673000, percent: 18, color: '#94A3B8', icon: '🚗' },
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
  const radius = 48;
  const strokeWidth = 16;
  const circum = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

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

      {/* Content: Donut on Left + Summary Stats on Right */}
      <View style={styles.contentRow}>
        {/* Left: Interactive Donut Chart */}
        <View style={styles.chartCol}>
          <View style={styles.donutWrapper}>
            <Svg width="130" height="130" viewBox="0 0 130 130">
              <G rotation="-90" origin="65, 65">
                {categories.map((c, i) => {
                  const strokeDash = (c.percent / 100) * circum;
                  const offset = accumulatedOffset;
                  accumulatedOffset += strokeDash;
                  return (
                    <Circle
                      key={i}
                      cx="65"
                      cy="65"
                      r={radius}
                      fill="transparent"
                      stroke={c.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${strokeDash} ${circum - strokeDash}`}
                      strokeDashoffset={-offset}
                      strokeLinecap="round"
                    />
                  );
                })}
              </G>
            </Svg>

            {/* Donut Center */}
            <View style={styles.donutCenter}>
              <Text style={styles.centerSub}>{isVi ? 'Cao nhất' : 'Highest'}</Text>
              <Text style={styles.centerPercent}>{categories[0]?.percent || 38}%</Text>
              <Text style={styles.centerCat} numberOfLines={1}>
                {categories[0]?.name?.split('&')[0]?.trim() || 'Ăn uống'}
              </Text>
            </View>
          </View>
        </View>

        {/* Right: Key Summary Metrics */}
        <View style={styles.statsCol}>
          {/* Stat 1: Tiết kiệm được trong tháng */}
          <View style={styles.statBoxGreen}>
            <View style={styles.statBoxHeader}>
              <Text style={styles.statBoxLabel}>
                🐷 {isVi ? 'Tiền Tích Lũy Còn Lại' : 'Remaining Savings'}
              </Text>
              <View style={styles.badgePillGreen}>
                <Text style={styles.badgePillTextGreen}>+{overview.savingsTargetDiffPercent || 15}%</Text>
              </View>
            </View>
            <Text style={styles.statBoxValueGreen}>{formatMoney(overview.savings)} VNĐ</Text>
            <Text style={styles.statBoxSub}>
              {isVi
                ? `Chiếm ${overview.savingsPercent || 32.5}% tổng thu nhập`
                : `${overview.savingsPercent || 32.5}% of total income`}
            </Text>
          </View>

          {/* Stat 2: Mức chi TB/ngày */}
          <View style={styles.statBoxAmber}>
            <View style={styles.statBoxHeader}>
              <Text style={styles.statBoxLabel}>
                📅 {isVi ? 'Mức Chi TB / Ngày' : 'Daily Average Spend'}
              </Text>
              <View style={styles.badgePillAmber}>
                <Text style={styles.badgePillTextAmber}>{isVi ? 'Mức an toàn' : 'Safe'}</Text>
              </View>
            </View>
            <Text style={styles.statBoxValueAmber}>
              {formatMoney(overview.dailyAverage || 480000)} VNĐ
            </Text>
            <Text style={styles.statBoxSub}>
              {isVi ? 'Chuẩn ngân sách: 480.000đ/ngày' : 'Budget target: 480k/day'}
            </Text>
          </View>
        </View>
      </View>

      {/* Category Progress Bars */}
      <View style={styles.catGrid}>
        {categories.map((c) => (
          <View key={c.id} style={styles.catCard}>
            <View style={styles.catHeader}>
              <View style={styles.catLeft}>
                <View style={[styles.catDot, { backgroundColor: c.color }]} />
                <Text style={styles.catName} numberOfLines={1}>
                  {c.name}
                </Text>
              </View>
              <Text style={styles.catPercent}>{c.percent}%</Text>
            </View>

            <View style={styles.track}>
              <View style={[styles.fill, { width: `${c.percent}%`, backgroundColor: c.color }]} />
            </View>

            <Text style={styles.catAmt}>{formatMoney(c.amount)}đ</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  titleGroup: {
    gap: 2,
  },
  tag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewDetailBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  chartCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutWrapper: {
    position: 'relative',
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  centerPercent: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 22,
  },
  centerCat: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
  },
  statsCol: {
    flex: 1,
    minWidth: 260,
    gap: 12,
  },
  statBoxGreen: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
  },
  statBoxAmber: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 12,
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
    fontSize: 17,
    fontWeight: '900',
    color: '#047857',
  },
  statBoxValueAmber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#B45309',
  },
  statBoxSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  catPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  track: {
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  catAmt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
});
