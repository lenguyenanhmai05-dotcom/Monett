import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BudgetData } from '../services/api';
import { BudgetModal } from './BudgetModal';

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
  const isVi = language === 'vi';
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <>
      <View style={styles.card}>
        {/* Hàng trên: Nhãn & Badge ngày lương */}
        <View style={styles.topRow}>
          <View style={styles.labelRow}>
            <Ionicons name="wallet-outline" size={16} color="#A7F3D0" style={{ marginRight: 6 }} />
            <Text style={styles.labelTitle}>
              {isVi ? 'Số dư khả dụng' : 'Available Balance'}
            </Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setIsModalVisible(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hàng giữa: Số dư nổi bật & Mascot ếch Monett */}
        <View style={styles.mainRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsModalVisible(true)}
            style={styles.amountTouchable}
          >
            <Text style={styles.mainAmount}>
              {budget.remaining.toLocaleString('vi-VN')}{' '}
              <Text style={styles.currencyText}>{budget.currency || 'VND'}</Text>
            </Text>
          </TouchableOpacity>

          {/* Linh vật ếch Monett 3D tinh tế */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsModalVisible(true)}
            style={styles.mascotWrapper}
          >
            <Image
              source={require('../../assets/frogs/frog-calendar-mascot.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Thanh tiến độ tối giản siêu mảnh */}
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.max(0, budget.spentPercent || 0))}%`,
                  backgroundColor:
                    budget.status === 'danger'
                      ? '#F87171'
                      : budget.status === 'warning'
                      ? '#FBBF24'
                      : '#34D399',
                },
              ]}
            />
          </View>

          {/* Thông số phụ tối giản 2 đầu */}
          <View style={styles.statsRow}>
            <Text style={styles.statText}>
              {isVi ? 'Đã chi' : 'Spent'}:{' '}
              <Text style={styles.statHighlight}>
                {budget.spent.toLocaleString('vi-VN')} {budget.currency || 'VND'}
              </Text>{' '}
              ({budget.spentPercent || 0}%)
            </Text>

            <Text style={styles.statText}>
              {isVi ? 'Hạn mức tháng' : 'Limit'}:{' '}
              <Text style={styles.statHighlight}>
                {budget.limit.toLocaleString('vi-VN')} {budget.currency || 'VND'}
              </Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Modal chỉnh sửa hạn mức ngân sách */}
      <BudgetModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSaved={(updated) => {
          onBudgetUpdated?.(updated);
        }}
        currentLimit={budget.limit}
        currentPayday={budget.payday}
        currentSpent={budget.spent}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#064E3B', // Tone xanh lục bảo sang trọng, đậm nét Monett
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
    overflow: 'visible',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A7F3D0',
    letterSpacing: 0.2,
  },
  editBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountTouchable: {
    flex: 1,
  },
  mainAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  currencyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  mascotWrapper: {
    marginTop: -28,
    marginBottom: -10,
    marginRight: 6,
  },
  mascotImage: {
    width: 104,
    height: 104,
  },
  progressSection: {
    marginBottom: 0,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  statHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
