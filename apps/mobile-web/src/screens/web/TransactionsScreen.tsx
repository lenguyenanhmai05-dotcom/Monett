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
        {/* Card 1: Thu nhập */}
        <View style={[styles.kpiCard, styles.kpiCardIncome]}>
          <View style={styles.kpiHeader}>
            <View style={styles.kpiIconWrap}>
              <Ionicons
                name="arrow-down-outline"
                size={18}
                color={isDark ? '#F8FAFC' : '#1E293B'}
                style={{ transform: [{ rotate: '45deg' }] }}
              />
            </View>
            <Text style={styles.kpiLabel}>{isVi ? 'Thu nhập' : 'Income'}</Text>
          </View>
          <Text style={styles.kpiValue}>
            {stats.totalIncome.toLocaleString('vi-VN')}
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? 'tháng này' : 'this month'}
          </Text>
        </View>

        {/* Card 2: Chi tiêu */}
        <View style={[styles.kpiCard, styles.kpiCardExpense]}>
          <View style={styles.kpiHeader}>
            <View style={styles.kpiIconWrap}>
              <Ionicons
                name="arrow-up-outline"
                size={18}
                color={isDark ? '#F8FAFC' : '#1E293B'}
                style={{ transform: [{ rotate: '45deg' }] }}
              />
            </View>
            <Text style={styles.kpiLabel}>{isVi ? 'Chi tiêu' : 'Expenses'}</Text>
          </View>
          <Text style={styles.kpiValue}>
            {stats.totalExpense.toLocaleString('vi-VN')}
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? 'tháng này' : 'this month'}
          </Text>
        </View>

        {/* Card 3: Số lượng mục */}
        <View style={[styles.kpiCard, styles.kpiCardCount]}>
          <View style={styles.kpiHeader}>
            <View style={styles.kpiIconWrap}>
              <Ionicons
                name="documents-outline"
                size={18}
                color={isDark ? '#F8FAFC' : '#1E293B'}
              />
            </View>
            <Text style={styles.kpiLabel}>{isVi ? 'Số lượng mục' : 'Transactions'}</Text>
          </View>
          <Text style={styles.kpiValue}>
            {stats.txCount} {isVi ? 'khoản' : 'items'}
          </Text>
          <Text style={styles.kpiNote}>
            {isVi ? 'tháng này' : 'this month'}
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
      backgroundColor: isDark ? '#0B131E' : '#F5F0E8',
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
      backgroundColor: isDark ? '#1E293B' : '#F5F0E8',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E8E0D5',
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
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    kpiCardIncome: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.22)' : '#BEE3C2',
    },
    kpiCardExpense: {
      backgroundColor: isDark ? 'rgba(244, 63, 94, 0.22)' : '#F5C3CB',
    },
    kpiCardCount: {
      backgroundColor: isDark ? 'rgba(100, 116, 139, 0.3)' : '#CBD5E1',
      borderColor: isDark ? '#64748B' : 'rgba(100, 116, 139, 0.25)',
    },
    kpiHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    kpiLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#F1F5F9' : '#1E293B',
      marginLeft: 10,
    },
    kpiIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    kpiValue: {
      fontSize: 28,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : '#18181B',
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    kpiNote: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#94A3B8' : '#52525B',
    },
    tableSection: {
      marginTop: 4,
    },
  });
