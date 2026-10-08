import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BudgetData } from '../services/api';

interface IntegratedBudgetBarProps {
  budget: BudgetData;
  onBudgetUpdated?: (budget: BudgetData) => void;
  language: 'vi' | 'en';
}

export const IntegratedBudgetBar: React.FC<IntegratedBudgetBarProps> = ({
  budget,
  onBudgetUpdated,
  language,
}) => {
  const { isDark, colors } = useTheme();
  const styles = getStyles(isDark, colors);

  const remainingDaysInMonth = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, lastDayOfMonth - now.getDate() + 1);
  }, []);

  const safeDailySpend = useMemo(() => {
    return Math.max(0, Math.round(budget.remaining / remainingDaysInMonth));
  }, [budget.remaining, remainingDaysInMonth]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrapper}>
          <View style={styles.iconCircle}>
            <Ionicons name="wallet" size={18} color="#059669" />
          </View>
          <Text style={styles.mainTitle}>
            {language === 'vi' ? 'Tổng Tài Sản & Hạn Mức' : 'Total Assets & Budget'}
          </Text>
        </View>
        <TouchableOpacity style={styles.paydayBadge}>
          <Text style={styles.paydayText}>
            {language === 'vi' ? `Còn ${budget.daysUntilPayday} ngày đến kỳ lương` : `${budget.daysUntilPayday} days until payday`}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.balanceRow}>
        <View>
          <Text style={styles.label}>
            {language === 'vi' ? 'Số dư khả dụng' : 'Available Balance'}
          </Text>
          <Text style={styles.balanceAmount}>
            {budget.remaining.toLocaleString('vi-VN')} {budget.currency}
          </Text>
        </View>
        <View style={styles.alignRight}>
          <Text style={styles.label}>
            {language === 'vi' ? 'Hạn mức tháng' : 'Monthly Limit'}
          </Text>
          <Text style={styles.limitAmount}>
            {budget.limit.toLocaleString('vi-VN')} {budget.currency}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(0, budget.spentPercent))}%`,
                backgroundColor:
                  budget.status === 'danger'
                    ? '#EF4444'
                    : budget.status === 'warning'
                    ? '#F59E0B'
                    : '#10B981',
              },
            ]}
          />
        </View>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressTextLeft}>
            {language === 'vi' ? 'Đã chi' : 'Spent'}: {budget.spent.toLocaleString('vi-VN')} {budget.currency} ({budget.spentPercent}%)
          </Text>
          <Text style={styles.progressTextRight}>
            {budget.remainingPercent}% {language === 'vi' ? 'còn lại' : 'left'}
          </Text>
        </View>
      </View>

      <View style={styles.insightBox}>
        <Ionicons name="bulb-outline" size={16} color="#D97706" style={{ marginRight: 8 }} />
        <Text style={styles.insightText}>
          {language === 'vi'
            ? `Gợi ý chi tiêu an toàn hôm nay: ~${safeDailySpend.toLocaleString('vi-VN')} ${budget.currency}`
            : `Safe daily spending today: ~${safeDailySpend.toLocaleString('vi-VN')} ${budget.currency}`}
        </Text>
      </View>
    </View>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: isDark ? '#000000' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 14,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  paydayBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paydayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -0.5,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  limitAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: isDark ? '#334155' : '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTextLeft: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  progressTextRight: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#334155' : '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#E2E8F0',
  },
  insightText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
