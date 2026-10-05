import React, { useState, useEffect } from 'react';
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
import { getTransactionsApi } from '../../services/api';

interface TransactionsScreenProps {
  onNavigateToTab?: (tab: any) => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ onNavigateToTab }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const isVi = language === 'vi';

  const [stats, setStats] = useState({
    totalIncome: 3650000,
    totalExpense: 630000,
    netBalance: 3020000,
    txCount: 6,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res: any = await getTransactionsApi({ limit: 100 });
        const items = res?.items || res?.data?.items || [];
        if (items.length > 0 && isMounted) {
          let inc = 0;
          let exp = 0;
          items.forEach((item: any) => {
            const amt = Math.abs(item.amount || 0);
            if (item.type === 'income' || item.amount > 0) {
              inc += amt;
            } else {
              exp += amt;
            }
          });
          setStats({
            totalIncome: inc,
            totalExpense: exp,
            netBalance: inc - exp,
            txCount: items.length,
          });
        }
      } catch (e) {
        // Fallback default mock stats
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

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

      {/* ================= KPI STATS CARDS ================= */}
      <View style={[styles.kpiRow, isDesktop ? styles.kpiDesktop : styles.kpiMobile]}>
        {/* Card 1: Tổng Thu */}
        <View style={[styles.kpiCard, styles.kpiCardIncome]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>{isVi ? 'Tổng thu nhập' : 'Total Income'}</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="trending-up" size={16} color="#059669" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>
            +{stats.totalIncome.toLocaleString('vi-VN')} đ
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? 'Bao gồm lương, thưởng & hoàn tiền' : 'Includes salary, bonus & cashback'}
          </Text>
        </View>

        {/* Card 2: Tổng Chi */}
        <View style={[styles.kpiCard, styles.kpiCardExpense]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>{isVi ? 'Tổng chi tiêu' : 'Total Expenses'}</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trending-down" size={16} color="#E11D48" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#E11D48' }]}>
            -{stats.totalExpense.toLocaleString('vi-VN')} đ
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? 'Chi phí sinh hoạt & ăn uống' : 'Living expenses & daily dining'}
          </Text>
        </View>

        {/* Card 3: Số Dư Ròng */}
        <View style={[styles.kpiCard, styles.kpiCardNet]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>{isVi ? 'Dòng tiền ròng' : 'Net Cashflow'}</Text>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#ECFDF5' }]}>
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
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="documents-outline" size={16} color="#475569" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#0F172A' }]}>
            {stats.txCount} {isVi ? 'khoản' : 'entries'}
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? 'Được ghi chép trong kỳ' : 'Recorded in period'}
          </Text>
        </View>
      </View>

      {/* ================= TRANSACTION MASTER TABLE ================= */}
      <View style={styles.tableSection}>
        <TransactionTableWidget language={language as any} />
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
    badgeLabel: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: '#ECFDF5',
      borderWidth: 1,
      borderColor: '#A7F3D0',
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
