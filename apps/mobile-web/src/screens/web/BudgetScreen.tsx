import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getBudgetApi, BudgetData } from '../../services/api';
import { BudgetCardWidget } from '../../components/BudgetCardWidget';
import { BudgetModal } from '../../components/BudgetModal';
import { FROGS } from '../../../assets/frogIndex';

interface BudgetScreenProps {
  onNavigateToTab?: (tab: any) => void;
}

interface CategoryConfig {
  category: string;
  icon: string;
  defaultLimitRatio: number; // Tỷ lệ tương đối trên tổng ngân sách
  color: string;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  { category: 'Ăn uống', icon: '🍲', defaultLimitRatio: 0.3, color: '#059669' },
  { category: 'Mua sắm', icon: '🛍️', defaultLimitRatio: 0.2, color: '#0284C7' },
  { category: 'Cà phê', icon: '☕', defaultLimitRatio: 0.1, color: '#D97706' },
  { category: 'Di chuyển', icon: '⛽', defaultLimitRatio: 0.1, color: '#7C3AED' },
  { category: 'Học tập', icon: '📚', defaultLimitRatio: 0.1, color: '#2563EB' },
  { category: 'Giải trí', icon: '🎬', defaultLimitRatio: 0.1, color: '#DB2777' },
  { category: 'Khác', icon: '📦', defaultLimitRatio: 0.1, color: '#64748B' },
];

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ onNavigateToTab }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const isVi = language === 'vi';

  const [budget, setBudget] = useState<BudgetData>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    limit: 20000000,
    spent: 0,
    remaining: 20000000,
    spentPercent: 0,
    remainingPercent: 100,
    status: 'safe',
    payday: 5,
    daysUntilPayday: 12,
    currency: 'VND',
    categorySpending: {},
  });

  const [showModal, setShowModal] = useState(false);

  const fetchBudget = () => {
    getBudgetApi()
      .then((data) => {
        if (data && data.limit) {
          setBudget(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load budget:', err);
      });
  };

  useEffect(() => {
    fetchBudget();
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
              💳 {isVi ? 'KẾ HOẠCH TÀI CHÍNH' : 'BUDGET PLANNER'}
            </Text>
          </View>
          <Text style={styles.pageTitle}>
            {isVi ? 'Kế Hoạch & Giám Sát Ngân Sách Tháng' : 'Monthly Budget Planning & Monitor'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {isVi
              ? `Thiết lập hạn mức chi tiêu tháng ${budget.month}/${budget.year}, phân bổ nguồn lực theo từng danh mục và nhận cảnh báo sớm.`
              : `Set spending limits for Month ${budget.month}/${budget.year}, categorize budgets and receive smart alerts.`}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.setupBtn}
            onPress={() => setShowModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.setupBtnText}>
              {isVi ? 'Cài đặt hạn mức' : 'Adjust Limit'}
            </Text>
          </TouchableOpacity>

          {onNavigateToTab && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => onNavigateToTab('home')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
              <Text style={styles.backBtnText}>
                {isVi ? 'Về Tổng quan' : 'Dashboard'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ================= ROW 1: OVERVIEW CARD & SMART TIPS ================= */}
      <View style={[styles.gridRow, isDesktop ? styles.rowDesktop : styles.rowMobile]}>
        <View style={[styles.mainBudgetCardWrap, isDesktop ? styles.flex6 : styles.flex1]}>
          <BudgetCardWidget
            budget={budget}
            onBudgetUpdated={setBudget}
            language={language as any}
          />
        </View>

        <View style={[styles.adviceCard, isDesktop ? styles.flex4 : styles.flex1]}>
          <View style={styles.adviceHeader}>
            <View style={styles.frogAvatarWrap}>
              <Image source={FROGS[0]} style={{ width: 40, height: 40 }} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.adviceTag}>
                {isVi ? 'LỜI KHUYÊN MONETT CHIBI' : 'MONETT SMART TIP'}
              </Text>
              <Text style={styles.adviceTitle}>
                {budget.status === 'safe'
                  ? isVi ? 'Tiến độ rất tuyệt vời! 🌟' : 'Excellent pacing! 🌟'
                  : budget.status === 'warning'
                  ? isVi ? 'Chú ý tiết chế chi tiêu ⚠️' : 'Watch your spending ⚠️'
                  : isVi ? 'Cảnh báo vượt hạn mức! 🚨' : 'Budget exceeded! 🚨'}
              </Text>
            </View>
          </View>

          <Text style={styles.adviceBody}>
            {isVi
              ? `Bạn hiện còn ${budget.remaining.toLocaleString('vi-VN')} đ cho ${budget.daysUntilPayday} ngày tới. Trung bình mỗi ngày bạn nên chi tiêu tối đa ${(
                  Math.round(budget.remaining / Math.max(1, budget.daysUntilPayday))
                ).toLocaleString('vi-VN')} đ để duy trì tỷ lệ an toàn.`
              : `You have ${budget.remaining.toLocaleString('vi-VN')} VND remaining for the next ${budget.daysUntilPayday} days. Recommended daily spending limit is ${(
                  Math.round(budget.remaining / Math.max(1, budget.daysUntilPayday))
                ).toLocaleString('vi-VN')} VND.`}
          </Text>

          <View style={styles.ruleBadge}>
            <Text style={styles.ruleBadgeText}>
              💡 {isVi ? 'Nguyên tắc 50/30/20: Dành tối thiểu 20% thu nhập để tích lũy.' : '50/30/20 Rule: Save at least 20% for future stability.'}
            </Text>
          </View>
        </View>
      </View>

      {/* ================= ROW 2: CATEGORY BREAKDOWN (REAL DATA) ================= */}
      <View style={styles.categoryCard}>
        <View style={styles.catHeader}>
          <View style={styles.catHeaderLeft}>
            <View style={styles.catIconWrap}>
              <Ionicons name="pie-chart-outline" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.catCardTitle}>
                {isVi ? 'Phân Bổ Chi Tiêu Theo Danh Mục' : 'Category Spending Breakdown'}
              </Text>
              <Text style={styles.catCardSub}>
                {isVi
                  ? 'Số liệu chi tiêu thực tế từ cơ sở dữ liệu giao dịch tháng này'
                  : 'Actual spending calculated from real transaction records'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.catList}>
          {CATEGORY_CONFIGS.map((item, idx) => {
            const spent = budget.categorySpending?.[item.category] || 0;
            const categoryLimit = Math.max(500000, Math.round(budget.limit * item.defaultLimitRatio));
            const pct = Math.min(100, Math.round((spent / categoryLimit) * 100));
            const isCatWarning = pct >= 80 && pct <= 100;
            const isCatDanger = pct > 100 || (spent > categoryLimit);

            return (
              <View key={idx} style={styles.catItemRow}>
                <View style={styles.catTopRow}>
                  <View style={styles.catNameWrap}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>{item.icon}</Text>
                    <Text style={styles.catNameText}>{item.category}</Text>
                  </View>

                  <View style={styles.catAmountWrap}>
                    <Text style={[styles.catAmountSpent, isCatDanger && { color: '#EF4444' }]}>
                      {spent.toLocaleString('vi-VN')} đ
                    </Text>
                    <Text style={styles.catAmountLimit}>
                      {' '}/ {categoryLimit.toLocaleString('vi-VN')} đ ({pct}%)
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.catTrack}>
                  <View
                    style={[
                      styles.catFill,
                      {
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: isCatDanger ? '#EF4444' : isCatWarning ? '#F59E0B' : item.color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Modal chỉnh sửa */}
      <BudgetModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={(updated) => {
          setBudget(updated);
          fetchBudget();
        }}
        currentLimit={budget.limit}
        currentPayday={budget.payday}
        currentSpent={budget.spent}
      />
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
    headerActions: {
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
    setupBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: '#059669',
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    setupBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
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
    },
    backBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#059669',
    },
    gridRow: {
      gap: 20,
      marginBottom: 24,
    },
    rowDesktop: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    rowMobile: {
      flexDirection: 'column',
    },
    flex6: {
      flex: 6,
    },
    flex4: {
      flex: 4,
    },
    flex1: {
      flex: 1,
    },
    mainBudgetCardWrap: {
      justifyContent: 'center',
    },
    adviceCard: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      justifyContent: 'space-between',
    },
    adviceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    frogAvatarWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
      borderWidth: 1,
      borderColor: isDark ? '#047857' : '#A7F3D0',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    adviceTag: {
      fontSize: 11,
      fontWeight: '800',
      color: '#059669',
      letterSpacing: 0.5,
    },
    adviceTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    adviceBody: {
      fontSize: 13,
      color: isDark ? '#CBD5E1' : '#475569',
      lineHeight: 20,
      marginBottom: 16,
    },
    ruleBadge: {
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    ruleBadgeText: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#475569',
      lineHeight: 18,
      fontStyle: 'italic',
    },
    categoryCard: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    catHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    catHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    catIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
      borderWidth: 1,
      borderColor: isDark ? '#047857' : '#A7F3D0',
    },
    catCardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    catCardSub: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    catList: {
      gap: 16,
    },
    catItemRow: {
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#F1F5F9',
      paddingBottom: 14,
    },
    catTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    catNameWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    catNameText: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#F1F5F9' : '#1E293B',
    },
    catAmountWrap: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    catAmountSpent: {
      fontSize: 13,
      fontWeight: '800',
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    catAmountLimit: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    catTrack: {
      height: 8,
      backgroundColor: isDark ? '#334155' : '#F1F5F9',
      borderRadius: 99,
      overflow: 'hidden',
    },
    catFill: {
      height: '100%',
      borderRadius: 99,
    },
  });
