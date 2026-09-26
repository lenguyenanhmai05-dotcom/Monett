import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';

interface AnalyticsScreenProps {
  onBack?: () => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onBack }) => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const chartData = [
    { day: 'T2', amount: 85, heightPercent: 28 },
    { day: 'T3', amount: 45, heightPercent: 15 },
    { day: 'T4', amount: 320, heightPercent: 100, highest: true },
    { day: 'T5', amount: 150, heightPercent: 48 },
    { day: 'T6', amount: 65, heightPercent: 22 },
    { day: 'T7', amount: 120, heightPercent: 38 },
    { day: 'CN', amount: 185, heightPercent: 60, current: true },
  ];

  const categoryBreakdown = [
    { name: 'Ăn uống', icon: '🍜', amount: '520.000 đ', percent: 50, color: '#10B981' },
    { name: 'Mua sắm', icon: '🛍️', amount: '200.000 đ', percent: 19, color: '#3B82F6' },
    { name: 'Di chuyển', icon: '🚗', amount: '180.000 đ', percent: 17, color: '#F59E0B' },
    { name: 'Cà phê', icon: '☕', amount: '145.000 đ', percent: 14, color: '#EC4899' },
  ];

  const topExpenses = [
    {
      title: 'Lẩu Haidilao (T4)',
      amount: '320.000 đ',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120&auto=format&fit=crop&q=80',
    },
    {
      title: 'Bún bò & bữa tối (CN)',
      amount: '185.000 đ',
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120&auto=format&fit=crop&q=80',
    },
    {
      title: 'Đi siêu thị WinMart (T5)',
      amount: '150.000 đ',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnIcon}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Báo Cáo Thống Kê</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Bộ lọc Tuần / Tháng */}
        <View style={styles.periodTabs}>
          <TouchableOpacity
            style={[styles.periodTab, period === 'week' && styles.periodTabActive]}
            onPress={() => setPeriod('week')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'week' && styles.periodTabTextActive,
              ]}
            >
              Tuần này (9/9 - 15/9)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
            onPress={() => setPeriod('month')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'month' && styles.periodTabTextActive,
              ]}
            >
              Tháng 9
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Tổng chi & Trung bình */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Tổng chi tiêu</Text>
            <Text style={styles.summaryTotal}>1.045.000 đ</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Trung bình / ngày</Text>
            <Text style={styles.summaryAvg}>149.000 đ</Text>
          </View>
        </View>

        {/* 4. Biểu đồ cột tuần */}
        <View style={styles.chartCard}>
          <Text style={styles.cardHeading}>BIỂU ĐỒ CHI THEO NGÀY</Text>
          <View style={styles.barChartWrapper}>
            {chartData.map((item, idx) => (
              <View key={idx} style={styles.barColumn}>
                <Text style={styles.barTopAmount}>{item.amount}k</Text>
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
                    item.current && styles.barDayLabelCurrent,
                  ]}
                >
                  {item.day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 5. Phân bổ theo Danh Mục */}
        <View style={styles.breakdownCard}>
          <Text style={styles.cardHeading}>CƠ CẤU DANH MỤC</Text>
          {categoryBreakdown.map((cat, i) => (
            <View key={i} style={styles.catBreakdownItem}>
              <View style={styles.catInfoRow}>
                <View style={styles.catLeft}>
                  <Text style={styles.catEmoji}>{cat.icon}</Text>
                  <Text style={styles.catTitle}>{cat.name}</Text>
                </View>
                <View style={styles.catRight}>
                  <Text style={styles.catSum}>{cat.amount}</Text>
                  <Text style={styles.catPct}>{cat.percent}%</Text>
                </View>
              </View>

              {/* Progress track */}
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
        <View style={[styles.breakdownCard, { marginBottom: 20 }]}>
          <Text style={styles.cardHeading}>KHOẢN CHI LỚN TRONG TUẦN</Text>
          {topExpenses.map((t, idx) => (
            <View key={idx} style={styles.topExpRow}>
              <Image source={{ uri: t.image }} style={styles.topExpThumb} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.topExpTitle}>{t.title}</Text>
                <Text style={styles.topExpAmount}>{t.amount}</Text>
              </View>
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
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnIcon: {
    fontSize: 24,
    color: '#374151',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodTabTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#0D3B37',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  summaryCol: {
    flex: 1,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  summaryAvg: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6EE7B7',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  barChartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTopAmount: {
    fontSize: 9,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: '#F3F4F6',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#A7F3D0',
    borderRadius: 7,
  },
  barHighest: {
    backgroundColor: '#E11D48',
  },
  barCurrent: {
    backgroundColor: '#047857',
  },
  barDayLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '600',
  },
  barDayLabelCurrent: {
    color: '#047857',
    fontWeight: '800',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  catBreakdownItem: {
    marginBottom: 14,
  },
  catInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catEmoji: {
    fontSize: 16,
  },
  catTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catSum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  catPct: {
    fontSize: 11,
    color: '#6B7280',
    width: 32,
    textAlign: 'right',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  topExpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  topExpThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  topExpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  topExpAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
    marginTop: 2,
  },
});
