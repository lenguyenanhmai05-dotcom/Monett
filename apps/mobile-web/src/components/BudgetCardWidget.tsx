import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BudgetData } from '../services/api';
import { BudgetModal } from './BudgetModal';

interface BudgetCardWidgetProps {
  budget: BudgetData;
  onBudgetUpdated?: (newBudget: BudgetData) => void;
  language?: 'vi' | 'en';
}

export const BudgetCardWidget: React.FC<BudgetCardWidgetProps> = ({
  budget,
  onBudgetUpdated,
  language = 'vi',
}) => {
  const [showModal, setShowModal] = useState(false);

  const isVi = language === 'vi';
  const spentPercent = budget.limit > 0 ? Number(((budget.spent / budget.limit) * 100).toFixed(1)) : 0;
  const isDanger = spentPercent > 100;
  const isWarning = spentPercent >= 80 && !isDanger;

  return (
    <>
      <View style={styles.card}>
        {/* Header Widget */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Ionicons name="wallet" size={20} color="#059669" />
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {isVi ? 'Tổng Tài Sản & Hạn Mức Tháng' : 'Available Balance & Budget'}
              </Text>
              <Text style={styles.headerSub}>
                {isVi ? 'Theo dõi ngân sách an toàn' : 'Safe financial limits'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.updateBtnText}>{isVi ? 'Thiết lập' : 'Settings'}</Text>
          </TouchableOpacity>
        </View>

        {/* Số dư chính */}
        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceLabel}>{isVi ? 'Số dư khả dụng tháng' : 'Monthly available'}</Text>
            <Text style={styles.balanceAmount}>
              {budget.remaining.toLocaleString('vi-VN')} đ
            </Text>
          </View>
          <View style={styles.badgeWrap}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isDanger ? '#FEF2F2' : isWarning ? '#FFFBEB' : '#ECFDF5' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isDanger ? '#DC2626' : isWarning ? '#D97706' : '#059669' },
                ]}
              >
                {isDanger
                  ? isVi ? '🚨 Vượt ngân sách' : '🚨 Over budget'
                  : isWarning
                  ? isVi ? '⚠️ Chạm 80%' : '⚠️ Over 80%'
                  : isVi ? '✅ An toàn' : '✅ Healthy'}
              </Text>
            </View>
          </View>
        </View>

        {/* Hộp Ngày Trả Lương */}
        <View style={styles.paydayCard}>
          <View style={styles.paydayNumberBox}>
            <Text style={styles.paydayNumber}>
              {budget.payday < 10 ? `0${budget.payday}` : budget.payday}
            </Text>
          </View>
          <View style={styles.paydayInfo}>
            <Text style={styles.paydayTitle}>
              {isVi ? 'Ngày trả lương định kỳ' : 'Payday Schedule'}
            </Text>
            <Text style={styles.paydayCycle}>
              {isVi
                ? `Chu kỳ tính: Ngày ${budget.payday < 10 ? '0' + budget.payday : budget.payday} hàng tháng`
                : `Cycle: ${budget.payday}th of every month`}
            </Text>
          </View>
          <View style={styles.daysRemainingBadge}>
            <Text style={styles.daysRemainingText}>
              {isVi ? `Còn ${budget.daysUntilPayday} ngày` : `${budget.daysUntilPayday} days left`}
            </Text>
          </View>
        </View>

        {/* Thanh Tiến Độ Ngân Sách An Toàn */}
        <View style={styles.safeBudgetSection}>
          <View style={styles.safeBudgetHeader}>
            <Text style={styles.safeBudgetTitle}>
              {isVi ? `Hạn mức chi tiêu an toàn tháng ${budget.month}:` : `Safe limit (Month ${budget.month}):`}{' '}
              <Text style={styles.boldText}>
                {budget.spent.toLocaleString('vi-VN')} / {budget.limit.toLocaleString('vi-VN')} đ ({spentPercent}%)
              </Text>
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, spentPercent)}%`,
                  backgroundColor: isDanger ? '#EF4444' : isWarning ? '#F59E0B' : '#059669',
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Modal thiết lập ngân sách */}
      <BudgetModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={onBudgetUpdated}
        currentLimit={budget.limit}
        currentPayday={budget.payday}
        currentSpent={budget.spent}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  updateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  badgeWrap: {
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  paydayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  paydayNumberBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  paydayNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563EB',
  },
  paydayInfo: {
    flex: 1,
  },
  paydayTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  paydayCycle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  daysRemainingBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  daysRemainingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  safeBudgetSection: {
    marginTop: 4,
  },
  safeBudgetHeader: {
    marginBottom: 8,
  },
  safeBudgetTitle: {
    fontSize: 12,
    color: '#475569',
  },
  boldText: {
    fontWeight: '800',
    color: '#0F172A',
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
});
