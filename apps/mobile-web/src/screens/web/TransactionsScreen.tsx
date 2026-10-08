import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { TransactionTableWidget } from '../../components/TransactionTableWidget';
import { getTransactionsMonthStatsApi } from '../../services/api';

interface TransactionsScreenProps {
  onNavigateToTab?: (tab: any) => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ onNavigateToTab }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const isVi = language === 'vi';

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    txCount: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await getTransactionsMonthStatsApi(selectedMonth, selectedYear);
      if (res) {
        setStats({
          totalIncome: res.totalIncome || 0,
          totalExpense: res.totalExpense || 0,
          netBalance: res.balance !== undefined ? res.balance : (res.totalIncome || 0) - (res.totalExpense || 0),
          txCount: res.count || 0,
        });
      }
    } catch (e) {
      console.warn('Failed to fetch month stats:', e);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const styles = getStyles(isDark, colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= HEADER BAR ================= */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.badgeLabel}>
            <Text style={styles.badgeLabelText}>
              🧾 {isVi ? 'QUẢN LÝ TÀI CHÍNH' : 'EXPENSE & INCOME'}
            </Text>
          </View>
          <Text style={styles.pageTitle}>
            {isVi ? 'Nhật Ký & Bảng Kê Giao Dịch' : 'Transaction Logs & Master Table'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {isVi
              ? 'Theo dõi toàn bộ dòng tiền thu chi minh bạch, phân loại danh mục và đối soát ngân sách.'
              : 'Keep track of all your income, expenses, category spending, and monthly cash flow.'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Month Selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth}>
              <Ionicons name="chevron-back" size={16} color={isDark ? '#CBD5E1' : '#475569'} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {isVi ? `Tháng ${selectedMonth}/${selectedYear}` : `${selectedMonth}/${selectedYear}`}
            </Text>
            <TouchableOpacity style={styles.monthNavBtn} onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={16} color={isDark ? '#CBD5E1' : '#475569'} />
            </TouchableOpacity>
          </View>

          {onNavigateToTab && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => onNavigateToTab('home')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
              <Text style={styles.backBtnText}>
                {isVi ? 'Về Tổng quan' : 'Back to Home'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ================= KPI STATS CARDS ================= */}
      <View style={[styles.kpiRow, isDesktop ? styles.kpiDesktop : styles.kpiMobile]}>
        {/* Card 1: Tổng Thu */}
        <View style={[styles.kpiCard, styles.kpiCardIncome]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>{isVi ? 'Tổng thu nhập' : 'Total Income'}</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
              <Ionicons name="trending-up" size={16} color="#059669" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>
            +{stats.totalIncome.toLocaleString('vi-VN')} đ
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? `Ghi nhận tháng ${selectedMonth}/${selectedYear}` : `Recorded in ${selectedMonth}/${selectedYear}`}
          </Text>
        </View>

        {/* Card 2: Tổng Chi */}
        <View style={[styles.kpiCard, styles.kpiCardExpense]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>{isVi ? 'Tổng chi tiêu' : 'Total Expenses'}</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }]}>
              <Ionicons name="trending-down" size={16} color="#E11D48" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#E11D48' }]}>
            -{stats.totalExpense.toLocaleString('vi-VN')} đ
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? 'Tổng các khoản chi tiêu' : 'Total recorded expenses'}
          </Text>
        </View>

        {/* Card 3: Số Dư Ròng */}
        <View style={[styles.kpiCard, styles.kpiCardNet]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>{isVi ? 'Dòng tiền ròng' : 'Net Cashflow'}</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="wallet-outline" size={16} color="#047857" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: stats.netBalance >= 0 ? '#047857' : '#DC2626' }]}>
            {stats.netBalance >= 0 ? '+' : ''}
            {stats.netBalance.toLocaleString('vi-VN')} đ
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? 'Chênh lệch Thu - Chi thực tế' : 'Actual Income minus Expenses'}
          </Text>
        </View>

        {/* Card 4: Tổng giao dịch */}
        <View style={[styles.kpiCard, styles.kpiCardCount]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>{isVi ? 'Số lượng mục' : 'Transactions'}</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Ionicons name="documents-outline" size={16} color="#475569" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            {stats.txCount} {isVi ? 'khoản' : 'entries'}
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? `Tháng ${selectedMonth}/${selectedYear}` : `In month ${selectedMonth}/${selectedYear}`}
          </Text>
        </View>
      </View>

      {/* ================= TRANSACTION MASTER TABLE ================= */}
      <View style={styles.tableSection}>
        <TransactionTableWidget language={language as any} onChanged={fetchStats} />
      </View>
    </ScrollView>
  );
};

const getStyles = (isDark: boolean, colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0B131E' : '#F8FAFC',
    },
    contentContainer: {
      padding: 24,
      paddingBottom: 60,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
      flexWrap: 'wrap',
      gap: 12,
    },
    headerLeft: {
      flex: 1,
      minWidth: 260,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    badgeLabel: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
      borderWidth: 1,
      borderColor: isDark ? '#047857' : '#A7F3D0',
      marginBottom: 8,
    },
    badgeLabelText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#059669',
      letterSpacing: 0.5,
    },
    pageTitle: {
      fontSize: 24,
      fontWeight: '900',
      color: isDark ? '#F1F5F9' : '#0F172A',
      marginBottom: 4,
    },
    pageSubtitle: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
      lineHeight: 18,
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    monthNavBtn: {
      padding: 4,
    },
    monthLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#F1F5F9' : '#0F172A',
      paddingHorizontal: 8,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    backBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#059669',
    },
    kpiRow: {
      gap: 16,
      marginBottom: 24,
    },
    kpiDesktop: {
      flexDirection: 'row',
    },
    kpiMobile: {
      flexDirection: 'column',
    },
    kpiCard: {
      flex: 1,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 6,
      elevation: 1,
    },
    kpiCardIncome: {
      borderLeftWidth: 4,
      borderLeftColor: '#059669',
    },
    kpiCardExpense: {
      borderLeftWidth: 4,
      borderLeftColor: '#E11D48',
    },
    kpiCardNet: {
      borderLeftWidth: 4,
      borderLeftColor: '#047857',
    },
    kpiCardCount: {
      borderLeftWidth: 4,
      borderLeftColor: '#64748B',
    },
    kpiHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    kpiLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    kpiIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    kpiValue: {
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 4,
    },
    kpiNote: {
      fontSize: 11,
      color: isDark ? '#64748B' : '#94A3B8',
    },
    tableSection: {
      marginTop: 4,
    },
  });
