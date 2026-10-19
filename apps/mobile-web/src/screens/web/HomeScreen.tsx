import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { UserProfileHeader } from '../../components/UserProfileHeader';
import { IntegratedBudgetBar } from '../../components/IntegratedBudgetBar';
import { RemindersWidget } from '../../components/RemindersWidget';
import { RecentTransactionsWidget } from '../../components/RecentTransactionsWidget';
import { BudgetModal } from '../../components/BudgetModal';
import { loadRecurringItems, getFrequencyLabel } from '../../services/recurringStorage';
import { loadEventsFromStorage } from '../../services/eventsStorage';
import { getBudgetApi, BudgetData } from '../../services/api';
import {
  compressImageFile,
  saveDayRecordsToStorage,
  idbLoadRecords,
  getInitialDayRecordsFromLocalStorage,
} from '../../services/calendarStorage';

export interface ExpenseItem {
  id: string;
  time: string; // "14:30"
  amount: number;
  category: string;
  categoryIcon: string;
  note?: string;
  photoUri?: string;
  createdAt: string;
}

export interface DayExpenseRecord {
  photoUri?: string;
  amount: number; // Tổng cộng dồn tất cả các khoản chi trong ngày
  category: string;
  categoryIcon: string;
  note?: string;
  dateStr?: string;
  items?: ExpenseItem[];
}

export const CATEGORY_THEMES: Record<
  string,
  {
    primary: string;
    bgLight: string;
    bgDark: string;
    circleLight: string;
    circleDark: string;
    textLight: string;
    textDark: string;
  }
> = {
  food: {
    primary: '#E11D48',
    bgLight: '#FFF1F2',
    bgDark: 'rgba(225, 29, 72, 0.16)',
    circleLight: '#FFE4E6',
    circleDark: 'rgba(225, 29, 72, 0.28)',
    textLight: '#BE123C',
    textDark: '#FDA4AF',
  },
  coffee: {
    primary: '#8B5CF6',
    bgLight: '#F5F3FF',
    bgDark: 'rgba(139, 92, 246, 0.16)',
    circleLight: '#EDE9FE',
    circleDark: 'rgba(139, 92, 246, 0.28)',
    textLight: '#6D28D9',
    textDark: '#C4B5FD',
  },
  market: {
    primary: '#0EA5E9',
    bgLight: '#F0F9FF',
    bgDark: 'rgba(14, 165, 233, 0.16)',
    circleLight: '#E0F2FE',
    circleDark: 'rgba(14, 165, 233, 0.28)',
    textLight: '#0369A1',
    textDark: '#7DD3FC',
  },
  shopping: {
    primary: '#EC4899',
    bgLight: '#FDF2F8',
    bgDark: 'rgba(236, 72, 153, 0.16)',
    circleLight: '#FCE7F3',
    circleDark: 'rgba(236, 72, 153, 0.28)',
    textLight: '#BE185D',
    textDark: '#F472B6',
  },
  transport: {
    primary: '#F97316',
    bgLight: '#FFF7ED',
    bgDark: 'rgba(249, 115, 22, 0.16)',
    circleLight: '#FFEDD5',
    circleDark: 'rgba(249, 115, 22, 0.28)',
    textLight: '#C2410C',
    textDark: '#FDBA74',
  },
  bills: {
    primary: '#6366F1',
    bgLight: '#EEF2FF',
    bgDark: 'rgba(99, 102, 241, 0.16)',
    circleLight: '#E0E7FF',
    circleDark: 'rgba(99, 102, 241, 0.28)',
    textLight: '#4338CA',
    textDark: '#A5B4FC',
  },
  entertainment: {
    primary: '#D97706',
    bgLight: '#FFFBEB',
    bgDark: 'rgba(217, 119, 6, 0.16)',
    circleLight: '#FEF3C7',
    circleDark: 'rgba(217, 119, 6, 0.28)',
    textLight: '#B45309',
    textDark: '#FCD34D',
  },
  other: {
    primary: '#64748B',
    bgLight: '#F8FAFC',
    bgDark: 'rgba(100, 116, 139, 0.16)',
    circleLight: '#E2E8F0',
    circleDark: 'rgba(100, 116, 139, 0.28)',
    textLight: '#334155',
    textDark: '#CBD5E1',
  },
};

export const CategorySvgIcon: React.FC<{
  categoryId: string;
  size?: number;
  isSelected?: boolean;
}> = ({ categoryId, size = 28, isSelected = false }) => {
  switch (categoryId) {
    case 'food':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 11h16a1 1 0 0 1 1 1c0 5-4 8-9 8s-9-3-9-8a1 1 0 0 1 1-1z"
            stroke="#E11D48"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(225, 29, 72, 0.28)' : 'rgba(225, 29, 72, 0.12)'}
          />
          <Path
            d="M7 8c1-1 1-2 1-3M12 8c1-1 1-2 1-3M17 8c1-1 1-2 1-3"
            stroke="#E11D48"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
          />
          <Line x1="3" y1="11" x2="21" y2="11" stroke="#E11D48" strokeWidth={isSelected ? 2.4 : 2} />
        </Svg>
      );
    case 'coffee':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M17 8h1a4 4 0 1 1 0 8h-1"
            stroke="#8B5CF6"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"
            stroke="#8B5CF6"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(139, 92, 246, 0.28)' : 'rgba(139, 92, 246, 0.12)'}
          />
          <Line x1="6" y1="2" x2="6" y2="4" stroke="#8B5CF6" strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="10" y1="2" x2="10" y2="4" stroke="#8B5CF6" strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="14" y1="2" x2="14" y2="4" stroke="#8B5CF6" strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
        </Svg>
      );
    case 'market':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="8" cy="21" r="1.5" stroke="#0EA5E9" strokeWidth={1.5} fill="#0EA5E9" />
          <Circle cx="19" cy="21" r="1.5" stroke="#0EA5E9" strokeWidth={1.5} fill="#0EA5E9" />
          <Path
            d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
            stroke="#0EA5E9"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(14, 165, 233, 0.28)' : 'rgba(14, 165, 233, 0.12)'}
          />
        </Svg>
      );
    case 'shopping':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z"
            stroke="#EC4899"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(236, 72, 153, 0.28)' : 'rgba(236, 72, 153, 0.12)'}
          />
          <Line x1="3" y1="6" x2="21" y2="6" stroke="#EC4899" strokeWidth={isSelected ? 2.4 : 2} />
          <Path
            d="M16 10a4 4 0 0 1-8 0"
            stroke="#EC4899"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'transport':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="6" cy="18" r="3" stroke="#F97316" strokeWidth={2} fill={isSelected ? 'rgba(249, 115, 22, 0.28)' : 'rgba(249, 115, 22, 0.12)'} />
          <Circle cx="18" cy="18" r="3" stroke="#F97316" strokeWidth={2} fill={isSelected ? 'rgba(249, 115, 22, 0.28)' : 'rgba(249, 115, 22, 0.12)'} />
          <Path
            d="M6 18h12M15 6h3l-3 6h-6l-2-4h-3M9 12l2 6"
            stroke="#F97316"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'bills':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"
            stroke="#6366F1"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.12)'}
          />
          <Line x1="8" y1="7" x2="16" y2="7" stroke="#6366F1" strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="8" y1="12" x2="16" y2="12" stroke="#6366F1" strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="8" y1="17" x2="12" y2="17" stroke="#6366F1" strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
        </Svg>
      );
    case 'entertainment':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="2"
            y="4"
            width="20"
            height="16"
            rx="2"
            stroke="#D97706"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(217, 119, 6, 0.28)' : 'rgba(217, 119, 6, 0.12)'}
          />
          <Line x1="2" y1="9" x2="22" y2="9" stroke="#D97706" strokeWidth={isSelected ? 2.4 : 2} />
          <Line x1="8" y1="4" x2="6" y2="9" stroke="#D97706" strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="14" y1="4" x2="12" y2="9" stroke="#D97706" strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="20" y1="4" x2="18" y2="9" stroke="#D97706" strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
        </Svg>
      );
    case 'other':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3c0 4.5 3.5 8 8 8-4.5 0-8 3.5-8 8 0-4.5-3.5-8-8-8 4.5 0 8-3.5 8-8z"
            stroke="#64748B"
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(100, 116, 139, 0.28)' : 'rgba(100, 116, 139, 0.12)'}
          />
          <Path d="M5 3v4M3 5h4M19 17v4M17 19h4" stroke="#64748B" strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
  }
};

export const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Ăn uống', icon: '🍜' },
  { id: 'coffee', name: 'Cà phê & Nước', icon: '☕' },
  { id: 'market', name: 'Đi chợ & Siêu thị', icon: '🛒' },
  { id: 'shopping', name: 'Mua sắm', icon: '🛍️' },
  { id: 'transport', name: 'Di chuyển & Xăng', icon: '🛵' },
  { id: 'bills', name: 'Hóa đơn', icon: '🧾' },
  { id: 'entertainment', name: 'Giải trí', icon: '🎬' },
  { id: 'other', name: 'Khác', icon: '✨' },
];

export const formatAmountShort = (amount?: number): string => {
  if (!amount || amount <= 0) return '';
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}tr`;
  }
  if (amount >= 1_000) {
    const val = amount / 1_000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}k`;
  }
  return `${amount}đ`;
};

// ============================================================
// SUB-COMPONENT: HomeBalanceStrip
// 3 cards ngang: Số dư khả dụng (nâu pastel) | Thu nhập | Chi tiêu
// ============================================================
const HomeBalanceStrip: React.FC<{
  budget: any;
  onBudgetUpdated?: (b: any) => void;
  language: 'vi' | 'en';
  dayRecords: Record<string, any>;
  currentYear: number;
  currentMonth: number;
}> = ({ budget, onBudgetUpdated, language, dayRecords, currentYear, currentMonth }) => {
  const isVi = language === 'vi';
  const [modalVisible, setModalVisible] = useState(false);

  const monthlyIncome = budget.limit || 0;
  const monthlySpent = budget.spent || 0;

  return (
    <View style={bsStyles.row}>
      {/* Card 1: Số dư khả dụng - màu nâu pastel */}
      <TouchableOpacity
        style={[bsStyles.card, bsStyles.cardBalance]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.88}
      >
        <View style={bsStyles.cardTopRow}>
          <Text style={bsStyles.cardLabelDark}>{isVi ? 'SỐ DƯ KHẢ DỤNG' : 'AVAILABLE BALANCE'}</Text>
          {budget.status === 'danger' ? (
            <View style={[bsStyles.badge, { backgroundColor: '#EF4444' }]}><Text style={bsStyles.badgeText}>Vượt</Text></View>
          ) : budget.status === 'warning' ? (
            <View style={[bsStyles.badge, { backgroundColor: '#F59E0B' }]}><Text style={bsStyles.badgeText}>Gần đủ</Text></View>
          ) : (
            <View style={[bsStyles.badge, { backgroundColor: '#FEF08A' }]}><Text style={[bsStyles.badgeText, { color: '#713F12' }]}>An toàn</Text></View>
          )}
        </View>
        <Text style={bsStyles.balanceAmount}>
          {budget.remaining?.toLocaleString('vi-VN') || '0'}
          <Text style={bsStyles.balanceCurrency}> đ</Text>
        </Text>
        <Text style={bsStyles.cardSubDark}>
          {isVi ? 'Chi đang ở mức' : 'Spent so far'}: {(budget.spentPercent || 0).toFixed(0)}%
        </Text>
      </TouchableOpacity>

      {/* Card 2: Thu nhập - màu xanh lá nhạt */}
      <View style={[bsStyles.card, bsStyles.cardIncome]}>
        <View style={bsStyles.cardTopRow}>
          <View style={bsStyles.iconCircle}>
            <Ionicons name="arrow-down-outline" size={14} color="#047857" />
          </View>
          <Text style={bsStyles.cardLabel}>{isVi ? 'Thu nhập' : 'Income'}</Text>
        </View>
        <Text style={bsStyles.cardAmount}>
          {monthlyIncome.toLocaleString('vi-VN')}
        </Text>
        <Text style={bsStyles.cardSub}>{isVi ? 'tháng này' : 'this month'}</Text>
      </View>

      {/* Card 3: Chi tiêu - màu hồng nhạt */}
      <View style={[bsStyles.card, bsStyles.cardExpense]}>
        <View style={bsStyles.cardTopRow}>
          <View style={[bsStyles.iconCircle, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
            <Ionicons name="arrow-up-outline" size={14} color="#E11D48" />
          </View>
          <Text style={[bsStyles.cardLabel, { color: '#BE123C' }]}>{isVi ? 'Chi tiêu' : 'Expenses'}</Text>
        </View>
        <Text style={[bsStyles.cardAmount, { color: '#1E293B' }]}>
          {monthlySpent.toLocaleString('vi-VN')}
        </Text>
        <Text style={bsStyles.cardSub}>{isVi ? 'tháng này' : 'this month'}</Text>
      </View>

      <BudgetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={(updated) => { onBudgetUpdated?.(updated); }}
        currentLimit={budget.limit}
        currentPayday={budget.payday}
        currentSpent={budget.spent}
      />
    </View>
  );
};

const bsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 0,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    minHeight: 100,
  },
  cardBalance: {
    backgroundColor: '#7B6345',
    flex: 1.3,
    shadowColor: '#8B6747',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  cardIncome: {
    backgroundColor: '#BEE3C2',
    flex: 1,
  },
  cardExpense: {
    backgroundColor: '#FFC5C5',
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLabelDark: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
    flex: 1,
    marginLeft: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  balanceCurrency: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  cardSubDark: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065F46',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(4,120,87,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ============================================================
// SUB-COMPONENT: HomeRecurringEventsRow
// Chi định kỳ + Sự kiện ngang nhau với nút Xem tất cả
// ============================================================
const HomeRecurringEventsRow: React.FC<{
  userId?: string;
  language: 'vi' | 'en';
  onNavigateToTab?: (tab: any) => void;
  currentYear: number;
  currentMonth: number;
}> = ({ userId, language, onNavigateToTab, currentYear, currentMonth }) => {
  const isVi = language === 'vi';
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const recurringItems = React.useMemo(() => {
    return loadRecurringItems(userId).filter(it => it.type === 'expense' && it.isActive).slice(0, 3);
  }, [userId]);

  const events = React.useMemo(() => {
    return loadEventsFromStorage().slice(0, 3);
  }, []);

  const formatAmount = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  const statusColor = (s: string) => {
    if (s === 'ongoing') return '#FEF08A';
    if (s === 'upcoming') return '#D97706';
    return '#64748B';
  };
  const statusLabel = (s: string) => {
    if (s === 'ongoing') return 'Đang diễn ra';
    if (s === 'upcoming') return 'Sắp diễn ra';
    return 'Đã xong';
  };

  return (
    <View style={[reStyles.row, isWide && reStyles.rowWide]}>
      {/* Panel trái: Chi định kỳ */}
      <View style={[reStyles.panel, isWide && { flex: 1 }]}>
        <View style={reStyles.panelHeader}>
          <View style={reStyles.panelIconWrap}>
            <Ionicons name="repeat-outline" size={18} color="#7C3AED" />
          </View>
          <Text style={reStyles.panelTitle}>{isVi ? 'Chi định kỳ' : 'Recurring Expenses'}</Text>
          <TouchableOpacity
            style={reStyles.viewAllBtn}
            onPress={() => onNavigateToTab?.('recurring')}
            activeOpacity={0.7}
          >
            <Text style={reStyles.viewAllText}>{isVi ? 'Xem tất cả' : 'View all'}</Text>
            <Ionicons name="arrow-forward" size={12} color="#7C3AED" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
        <View style={reStyles.itemList}>
          {recurringItems.length === 0 ? (
            <View style={reStyles.emptyState}>
              <Ionicons name="repeat-outline" size={28} color="#D1C4E9" />
              <Text style={reStyles.emptyText}>{isVi ? 'Chưa có khoản định kỳ' : 'No recurring items yet'}</Text>
            </View>
          ) : recurringItems.map((item, idx) => (
            <View key={item.id} style={[reStyles.itemRow, idx === recurringItems.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[reStyles.itemIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="repeat" size={14} color="#7C3AED" />
              </View>
              <View style={reStyles.itemInfo}>
                <Text style={reStyles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={reStyles.itemSub}>{getFrequencyLabel(item.frequency, isVi)}</Text>
              </View>
              <Text style={[reStyles.itemAmount, { color: '#BE123C' }]}>-{formatAmount(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Panel phải: Sự kiện */}
      <View style={[reStyles.panel, isWide && { flex: 1 }]}>
        <View style={reStyles.panelHeader}>
          <View style={[reStyles.panelIconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="calendar-outline" size={18} color="#D97706" />
          </View>
          <Text style={reStyles.panelTitle}>{isVi ? 'Sự kiện' : 'Events'}</Text>
          <TouchableOpacity
            style={[reStyles.viewAllBtn, { backgroundColor: '#FEF3C7' }]}
            onPress={() => onNavigateToTab?.('events')}
            activeOpacity={0.7}
          >
            <Text style={[reStyles.viewAllText, { color: '#D97706' }]}>{isVi ? 'Xem tất cả' : 'View all'}</Text>
            <Ionicons name="arrow-forward" size={12} color="#D97706" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
        <View style={reStyles.itemList}>
          {events.length === 0 ? (
            <View style={reStyles.emptyState}>
              <Ionicons name="calendar-outline" size={28} color="#FDE68A" />
              <Text style={reStyles.emptyText}>{isVi ? 'Chưa có sự kiện nào' : 'No events yet'}</Text>
            </View>
          ) : events.map((ev, idx) => (
            <View key={ev.id} style={[reStyles.itemRow, idx === events.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[reStyles.itemIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="calendar" size={14} color="#D97706" />
              </View>
              <View style={reStyles.itemInfo}>
                <Text style={reStyles.itemTitle} numberOfLines={1}>{ev.title}</Text>
                <Text style={reStyles.itemSub}>{ev.startDate}{ev.endDate && ev.endDate !== ev.startDate ? ` - ${ev.endDate}` : ''}</Text>
              </View>
              <View style={[reStyles.statusBadge, { backgroundColor: statusColor(ev.status) + '22' }]}>
                <Text style={[reStyles.statusText, { color: statusColor(ev.status) }]}>{statusLabel(ev.status)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const reStyles = StyleSheet.create({
  row: {
    flexDirection: 'column',
    gap: 14,
    marginHorizontal: 0,
    marginBottom: 20,
  },
  rowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  panelIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  itemList: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export const HomeScreen: React.FC<{ onNavigateToTab?: (tab: any) => void }> = ({ onNavigateToTab }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const { addNotification } = useNotifications();
  const styles = getStyles(isDark, colors);

  // Real calendar state based on actual current date
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const today = new Date();
  const isCurrentRealMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
  const todayDate = isCurrentRealMonth ? today.getDate() : -1;

  // Days in month calculation
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // Monday start: Monday = 0, Tuesday = 1, ..., Sunday = 6
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  // Selected day for preview/upload
  const [selectedDay, setSelectedDay] = useState<number>(todayDate > 0 ? todayDate : 1);

  // Records map: key is `${year}-${month+1}-${day}` -> DayExpenseRecord
  const [dayRecords, setDayRecords] = useState<Record<string, DayExpenseRecord>>(() => {
    const records: Record<string, DayExpenseRecord> = {};
    try {
      const raw = getInitialDayRecordsFromLocalStorage();
      Object.entries(raw).forEach(([key, val]: [string, any]) => {
        if (val) {
          if (!val.items || !Array.isArray(val.items)) {
            if (val.amount > 0 || val.photoUri) {
              val.items = [
                {
                  id: `legacy-${key}`,
                  time: '12:00',
                  amount: val.amount || 0,
                  category: val.category || 'Ăn uống',
                  categoryIcon: val.categoryIcon || '🍜',
                  note: val.note || '',
                  photoUri: val.photoUri,
                  createdAt: new Date().toISOString(),
                },
              ];
            } else {
              val.items = [];
            }
          }
          if (val.items.length > 0) {
            val.amount = val.items.reduce((s: number, it: any) => s + (it.amount || 0), 0);
          }
          records[key] = val;
        }
      });
    } catch (_) { }
    return records;
  });

  // Asynchronous hydration from IndexedDB to guarantee persistence across tabs/sessions
  useEffect(() => {
    let isMounted = true;
    idbLoadRecords<Record<string, DayExpenseRecord>>().then((stored) => {
      if (isMounted && stored && Object.keys(stored).length > 0) {
        setDayRecords((prev) => {
          const merged = { ...prev };
          Object.entries(stored).forEach(([k, v]) => {
            if (v) {
              merged[k] = { ...merged[k], ...v };
            }
          });
          return merged;
        });
      }
    }).catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate monthly stats from dayRecords
  const monthlyStats = useMemo(() => {
    let totalSpending = 0;
    let countDays = 0;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const key = `${currentYear}-${currentMonth + 1}-${d}`;
      const rec = dayRecords[key];
      if (rec && (rec.amount > 0 || rec.photoUri)) {
        countDays++;
        if (rec.amount > 0) {
          totalSpending += rec.amount;
        }
      }
    }

    const avgPerDay = countDays > 0 ? Math.round(totalSpending / countDays) : 0;
    return { totalSpending, countDays, avgPerDay };
  }, [dayRecords, currentYear, currentMonth, totalDaysInMonth]);

  // Category breakdown calculation for current month
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, { name: string; icon: string; amount: number; count: number; color: string }> = {};
    const categoryColors: Record<string, string> = {
      'Ăn uống': CATEGORY_THEMES.food.primary,
      'Cà phê & Nước': CATEGORY_THEMES.coffee.primary,
      'Đi chợ & Siêu thị': CATEGORY_THEMES.market.primary,
      'Mua sắm': CATEGORY_THEMES.shopping.primary,
      'Di chuyển & Xăng': CATEGORY_THEMES.transport.primary,
      'Hóa đơn': CATEGORY_THEMES.bills.primary,
      'Giải trí': CATEGORY_THEMES.entertainment.primary,
      'Khác': CATEGORY_THEMES.other.primary,
    };

    let total = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const key = `${currentYear}-${currentMonth + 1}-${d}`;
      const rec = dayRecords[key];
      if (rec && rec.amount > 0) {
        const catName = rec.category || 'Ăn uống';
        const icon = rec.categoryIcon || '🍜';
        if (!catMap[catName]) {
          catMap[catName] = {
            name: catName,
            icon,
            amount: 0,
            count: 0,
            color: categoryColors[catName] || '#059669',
          };
        }
        catMap[catName].amount += rec.amount;
        catMap[catName].count += 1;
        total += rec.amount;
      }
    }

    const items = Object.values(catMap)
      .map((item) => ({
        ...item,
        percent: total > 0 ? Math.round((item.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { items, total };
  }, [dayRecords, currentYear, currentMonth, totalDaysInMonth]);

  // Selected day record & details for the 1/3 side column
  const selectedDayKey = `${currentYear}-${currentMonth + 1}-${selectedDay}`;
  const selectedDayRecord = dayRecords[selectedDayKey];
  const selectedDayPhoto = selectedDayRecord?.photoUri;
  const selectedDayAmount = selectedDayRecord?.amount || 0;
  const selectedDayCategory = selectedDayRecord?.category || 'Ăn uống';
  const selectedDayCategoryIcon = selectedDayRecord?.categoryIcon || '🍜';
  const selectedDayNote = selectedDayRecord?.note;

  // Selected date label formatting
  const selectedDayFormatted = useMemo(() => {
    const d = new Date(currentYear, currentMonth, selectedDay);
    const dayNamesVi = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dow = language === 'vi' ? dayNamesVi[d.getDay()] : dayNamesEn[d.getDay()];
    return {
      dow,
      dayNum: selectedDay < 10 ? `0${selectedDay}` : `${selectedDay}`,
      monthNum: currentMonth + 1,
      year: currentYear,
    };
  }, [currentYear, currentMonth, selectedDay, language]);

  // Quick Save Modal State (Lưu nhanh)
  const [quickSaveModalVisible, setQuickSaveModalVisible] = useState<boolean>(false);
  const [quickDayNum, setQuickDayNum] = useState<number>(todayDate > 0 ? todayDate : 1);
  const [quickAmountStr, setQuickAmountStr] = useState<string>('');
  const [quickCategory, setQuickCategory] = useState<string>('Ăn uống');
  const [quickCategoryIcon, setQuickCategoryIcon] = useState<string>('🍜');
  const [quickNote, setQuickNote] = useState<string>('');
  const [quickPhotoUri, setQuickPhotoUri] = useState<string>('');
  const [quickTimeStr, setQuickTimeStr] = useState<string>('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);

  // Day Timeline Modal State (Xem tất cả chi tiêu của ngày)
  const [timelineModalVisible, setTimelineModalVisible] = useState<boolean>(false);
  const [timelineDayNum, setTimelineDayNum] = useState<number>(todayDate > 0 ? todayDate : 1);

  // Full-image lightbox preview
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  // Mini Date Picker state inside Quick Save modal
  const [showMiniDatePicker, setShowMiniDatePicker] = useState<boolean>(false);
  const [pickerMonth, setPickerMonth] = useState<number>(currentMonth);
  const [pickerYear, setPickerYear] = useState<number>(currentYear);

  const handlePrevPickerMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  };

  const handleNextPickerMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  };

  const handlePickerToday = () => {
    const now = new Date();
    setPickerMonth(now.getMonth());
    setPickerYear(now.getFullYear());
    setQuickDayNum(now.getDate());
    setShowMiniDatePicker(false);
  };

  const getCurrentFormattedTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const handleOpenQuickSave = (dayNum?: number) => {
    const targetDay = dayNum ?? (todayDate > 0 ? todayDate : selectedDay || 1);
    setQuickDayNum(targetDay);
    setQuickAmountStr('');
    setQuickCategory('Ăn uống');
    setQuickCategoryIcon('🍜');
    setQuickNote('');
    setQuickPhotoUri('');
    setQuickTimeStr(getCurrentFormattedTime());
    setShowMiniDatePicker(false);
    setPickerMonth(currentMonth);
    setPickerYear(currentYear);
    setQuickSaveModalVisible(true);
  };

  const handleOpenTimelineForDay = (dayNum: number) => {
    setTimelineDayNum(dayNum);
    setSelectedDay(dayNum);
    setTimelineModalVisible(true);
  };

  const handleDayPress = (dayNum: number) => {
    setSelectedDay(dayNum);
    const photoKey = `${currentYear}-${currentMonth + 1}-${dayNum}`;
    const existing = dayRecords[photoKey];
    // Nếu ngày đó đã có ảnh hoặc có khoản chi tiêu -> mở modal xem chi tiết timeline tất cả chi tiêu
    if (existing && (existing.photoUri || existing.amount > 0 || (existing.items && existing.items.length > 0))) {
      handleOpenTimelineForDay(dayNum);
    } else {
      // Nếu chưa có chi tiêu -> mở ngay modal Lưu nhanh cho ngày này
      handleOpenQuickSave(dayNum);
    }
  };

  const handleCellActionPress = (e: any, dayNum: number) => {
    e?.stopPropagation?.();
    handleDayPress(dayNum);
  };

  const handleAddQuickAmount = (val: number) => {
    const current = parseInt(quickAmountStr.replace(/[^0-9]/g, ''), 10) || 0;
    setQuickAmountStr((current + val).toString());
  };

  const handleUploadPhotoInQuickSave = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          try {
            setIsCompressingPhoto(true);
            const compressedBase64 = await compressImageFile(file);
            setQuickPhotoUri(compressedBase64);
          } catch (err) {
            console.error('Error compressing image:', err);
          } finally {
            setIsCompressingPhoto(false);
          }
        }
      };
      input.click();
    }
  };

  const handleSaveQuickExpense = () => {
    const numericAmount = parseInt(quickAmountStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (numericAmount <= 0) {
      alert(language === 'vi' ? 'Vui lòng nhập số tiền chi tiêu hợp lệ' : 'Please enter a valid amount');
      return;
    }

    const photoKey = `${currentYear}-${currentMonth + 1}-${quickDayNum}`;
    const now = new Date();
    const timeToUse = quickTimeStr.trim() || getCurrentFormattedTime();

    const newItem: ExpenseItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      time: timeToUse,
      amount: numericAmount,
      category: quickCategory,
      categoryIcon: quickCategoryIcon,
      note: quickNote.trim(),
      photoUri: quickPhotoUri || undefined,
      createdAt: now.toISOString(),
    };

    setDayRecords((prev) => {
      const existing = prev[photoKey];
      let existingItems = existing?.items ? [...existing.items] : [];
      if (existingItems.length === 0 && (existing?.amount || existing?.photoUri)) {
        existingItems.push({
          id: `legacy-${photoKey}`,
          time: '12:00',
          amount: existing.amount || 0,
          category: existing.category || 'Ăn uống',
          categoryIcon: existing.categoryIcon || '🍜',
          note: existing.note || '',
          photoUri: existing.photoUri,
          createdAt: now.toISOString(),
        });
      }

      const updatedItems = [...existingItems, newItem];
      // Sắp xếp theo thứ tự thời gian chi tiêu trong ngày
      updatedItems.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      // Cộng dồn toàn bộ số tiền chi tiêu của ngày hôm đó
      const totalAmount = updatedItems.reduce((sum, it) => sum + (it.amount || 0), 0);

      // Ảnh hiển thị trên ô lịch: ưu tiên ảnh mới vừa tải lên, hoặc ảnh có sẵn của ô lịch
      const mainCoverPhoto =
        quickPhotoUri ||
        existing?.photoUri ||
        updatedItems.find((it) => it.photoUri)?.photoUri;

      const updatedRecord: DayExpenseRecord = {
        photoUri: mainCoverPhoto,
        amount: totalAmount,
        category: quickCategory,
        categoryIcon: quickCategoryIcon,
        note: quickNote.trim() || existing?.note || '',
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(quickDayNum).padStart(2, '0')}`,
        items: updatedItems,
      };

      const next = { ...prev, [photoKey]: updatedRecord };
      saveDayRecordsToStorage(next);
      return next;
    });

    const isMoment = Boolean(quickPhotoUri);
    addNotification({
      type: isMoment ? 'moment' : 'expense',
      title: isMoment
        ? (language === 'vi' ? 'Đã lưu khoảnh khắc chi tiêu! 📸' : 'Expense Moment Saved! 📸')
        : (language === 'vi' ? 'Đã ghi nhận chi tiêu 🍜' : 'Expense Recorded 🍜'),
      message: isMoment
        ? (language === 'vi'
          ? `Khoảnh khắc "${quickNote.trim() || quickCategory}" (${numericAmount.toLocaleString('vi-VN')} đ) đã được lưu thành công kèm ảnh vào ngày ${quickDayNum}/${currentMonth + 1}.`
          : `Moment "${quickNote.trim() || quickCategory}" (${numericAmount.toLocaleString('vi-VN')} đ) saved with photo on ${quickDayNum}/${currentMonth + 1}.`)
        : (language === 'vi'
          ? `Khoản chi "${quickNote.trim() || quickCategory}" (${numericAmount.toLocaleString('vi-VN')} đ) đã được cộng dồn vào ngày ${quickDayNum}/${currentMonth + 1}.`
          : `Expense "${quickNote.trim() || quickCategory}" (${numericAmount.toLocaleString('vi-VN')} đ) added to ${quickDayNum}/${currentMonth + 1}.`),
      iconBg: isMoment ? '#EDE9FE' : '#ECFDF5',
      iconColor: isMoment ? '#8B5CF6' : '#059669',
      metadata: {
        amount: numericAmount,
        category: quickCategory,
        targetTab: 'home',
      },
    });

    setQuickSaveModalVisible(false);
  };

  const handleDeleteExpenseItem = (dayNum: number, itemId: string) => {
    const photoKey = `${currentYear}-${currentMonth + 1}-${dayNum}`;
    setDayRecords((prev) => {
      const existing = prev[photoKey];
      if (!existing || !existing.items) return prev;

      const updatedItems = existing.items.filter((it) => it.id !== itemId);
      const totalAmount = updatedItems.reduce((sum, it) => sum + (it.amount || 0), 0);
      const remainingPhoto = updatedItems.find((it) => it.photoUri)?.photoUri;

      let next: Record<string, DayExpenseRecord>;
      if (updatedItems.length === 0 && !existing.photoUri) {
        next = { ...prev };
        delete next[photoKey];
      } else {
        next = {
          ...prev,
          [photoKey]: {
            ...existing,
            amount: totalAmount,
            photoUri: existing.photoUri || remainingPhoto,
            items: updatedItems,
          },
        };
      }

      saveDayRecordsToStorage(next);
      return next;
    });
  };

  const handlePickCoverPhotoForDay = (dayNum: number) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          try {
            const compressedBase64 = await compressImageFile(file);
            const photoKey = `${currentYear}-${currentMonth + 1}-${dayNum}`;
            setDayRecords((prev) => {
              const existing = prev[photoKey] || {
                amount: 0,
                category: 'Ăn uống',
                categoryIcon: '🍜',
                items: [],
              };
              const updated = { ...existing, photoUri: compressedBase64 };
              const next = { ...prev, [photoKey]: updated };
              saveDayRecordsToStorage(next);

              addNotification({
                type: 'moment',
                title: language === 'vi' ? 'Đã lưu ảnh khoảnh khắc chi tiêu 📸' : 'Moment Photo Saved 📸',
                message: language === 'vi'
                  ? `Đã cập nhật ảnh kỷ niệm cho ngày ${dayNum}/${currentMonth + 1}.`
                  : `Cover photo updated for ${dayNum}/${currentMonth + 1}.`,
                iconBg: '#EDE9FE',
                iconColor: '#8B5CF6',
                metadata: { targetTab: 'home' },
              });

              return next;
            });
          } catch (err) {
            console.error('Error compressing cover photo:', err);
          }
        }
      };
      input.click();
    }
  };

  const handleRemoveCoverPhotoForDay = (dayNum: number) => {
    const photoKey = `${currentYear}-${currentMonth + 1}-${dayNum}`;
    setDayRecords((prev) => {
      const existing = prev[photoKey];
      if (!existing) return prev;
      const updated = { ...existing, photoUri: undefined };
      const next = { ...prev, [photoKey]: updated };
      saveDayRecordsToStorage(next);
      return next;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  const handleTodayMonth = () => {
    const d = new Date();
    setCurrentDate(d);
    setSelectedDay(d.getDate());
  };

  const displayName = user?.fullName || 'Ánh Mai';
  const [imageError, setImageError] = useState(false);

  const [budget, setBudget] = useState<BudgetData>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    limit: 22000000,
    spent: 6180000,
    remaining: 15820000,
    spentPercent: 28.1,
    remainingPercent: 71.9,
    status: 'safe',
    payday: 5,
    daysUntilPayday: 12,
    currency: 'VND',
  });

  useEffect(() => {
    let isMounted = true;
    getBudgetApi()
      .then((data) => {
        if (isMounted && data && data.limit) {
          setBudget(data);
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: '#FEE2E2', text: '#B91C1C' }, // Red
      { bg: '#FEF3C7', text: '#B45309' }, // Amber
      { bg: '#DCFCE7', text: '#047857' }, // Green
      { bg: '#E0F2FE', text: '#0369A1' }, // Blue
      { bg: '#EDE9FE', text: '#6D28D9' }, // Purple
      { bg: '#FCE7F3', text: '#BE185D' }, // Pink
      { bg: '#F3F4F6', text: '#374151' }, // Gray
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const avatarColor = getAvatarColor(user?.fullName || user?.email || 'U');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ===================== PHẦN ĐẦU TRANG TỔNG QUAN (LIỀN MẠCH, THÔNG THOÁNG, KHÔNG ĐÓNG KHUNG) ===================== */}
      <View style={styles.overviewSection}>
        {/* 1. Header: Avatar + Tên + Badge + Streak liên tục */}
        <UserProfileHeader onQuickSave={() => handleOpenQuickSave(todayDate > 0 ? todayDate : 1)} />

        {/* 2. Số dư + Thu nhập + Chi tiêu (3 cards ngang nhau) */}
        <HomeBalanceStrip budget={budget} onBudgetUpdated={setBudget} language={language as any} dayRecords={dayRecords} currentYear={currentYear} currentMonth={currentMonth} />
      </View>

      {/* ===================== ROW 2: LỊCH TRÌNH CHI TIÊU (FULL WIDTH) ===================== */}
      <View style={[styles.card, styles.fullWidthCard]} nativeID="financial-calendar-section" {...({ id: 'financial-calendar-section' } as any)}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>
            {language === 'vi' ? 'Lịch trình chi tiêu' : 'Spending Schedule'}
          </Text>
          {monthlyStats.totalSpending > 0 && (
            <View style={styles.headerTotalSpentPill}>
              <Text style={styles.headerTotalSpentLabel}>
                {language === 'vi' ? 'Tổng chi:' : 'Total Spent:'}
              </Text>
              <Text style={styles.headerTotalSpentAmount}>
                {monthlyStats.totalSpending.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          )}
        </View>

        {/* Real Calendar Grid */}
        <View style={styles.streakJourneyBox}>
          {/* Quick Monthly Stats Summary Strip */}
          <View style={styles.monthlyStatsBar}>
            <View style={styles.monthStatCol}>
              <Text style={styles.monthStatLabel}>
                {language === 'vi' ? '💸 TỔNG CHI THÁNG' : '💸 MONTHLY SPENT'}
              </Text>
              <Text style={styles.monthStatValue}>
                {monthlyStats.totalSpending.toLocaleString('vi-VN')} <Text style={styles.monthStatCurrency}>đ</Text>
              </Text>
            </View>

            <View style={styles.monthStatDivider} />

            <View style={styles.monthStatCol}>
              <Text style={styles.monthStatLabel}>
                {language === 'vi' ? '📸 ĐÃ GHI NHẬN' : '📸 RECORDED'}
              </Text>
              <Text style={styles.monthStatValue}>
                {monthlyStats.countDays} <Text style={styles.monthStatUnit}>{language === 'vi' ? 'ngày' : 'days'}</Text>
              </Text>
            </View>

            <View style={styles.monthStatDivider} />

            <View style={styles.monthStatCol}>
              <Text style={styles.monthStatLabel}>
                {language === 'vi' ? '⚡ TRUNG BÌNH / NGÀY' : '⚡ DAILY AVG'}
              </Text>
              <Text style={styles.monthStatValue}>
                {monthlyStats.avgPerDay.toLocaleString('vi-VN')} <Text style={styles.monthStatCurrency}>đ</Text>
              </Text>
            </View>
          </View>

          <View style={styles.journeyHeader}>
            <View style={styles.monthNavRow}>
              <Text style={styles.journeyTitle}>
                🗓️ {language === 'vi' ? `Tháng ${currentMonth + 1}, ${currentYear}` : `${currentDate.toLocaleString('en-US', { month: 'long' })} ${currentYear}`}
              </Text>

              <View style={styles.monthControls}>
                <TouchableOpacity
                  style={styles.monthArrowBtn}
                  onPress={handlePrevMonth}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.monthArrowText}>‹</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.todayPillBtn}
                  onPress={handleTodayMonth}
                  activeOpacity={0.7}
                >
                  <Text style={styles.todayPillText}>{language === 'vi' ? 'Hôm nay' : 'Today'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.monthArrowBtn}
                  onPress={handleNextMonth}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.monthArrowText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#BEE3C2', borderWidth: 1, borderColor: '#A0D6A6' }]} />
                <Text style={styles.legendText}>
                  {language === 'vi' ? 'Đã chi tiêu' : 'Recorded'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#D97706' }]} />
                <Text style={styles.legendText}>
                  {language === 'vi' ? 'Hôm nay' : 'Today'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={{ fontSize: 11, marginRight: 2 }}>💰</Text>
                <Text style={styles.legendText}>
                  {language === 'vi' ? 'Có giá tiền' : 'Has price'}
                </Text>
              </View>
            </View>
          </View>

          {/* Days of week header (T2 -> CN) */}
          <View style={styles.dayOfWeekRow}>
            {(language === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((dow, idx) => (
              <View key={dow} style={styles.dayOfWeekCell}>
                <Text style={[styles.dayOfWeekText, (idx === 5 || idx === 6) && styles.weekendText]}>
                  {dow}
                </Text>
              </View>
            ))}
          </View>

          {/* 7-Columns Real Calendar Matrix */}
          <View style={styles.calendarGrid}>
            {/* Previous month padding days */}
            {Array.from({ length: firstDayOfWeek }, (_, i) => {
              const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
              const prevDayNum = prevMonthLastDay - firstDayOfWeek + i + 1;
              return (
                <View key={`prev-${i}`} style={[styles.calCell, styles.calCellPrevMonth]}>
                  <Text style={styles.prevMonthNum}>{prevDayNum}</Text>
                </View>
              );
            })}

            {/* Current month days (1..31) */}
            {Array.from({ length: totalDaysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const photoKey = `${currentYear}-${currentMonth + 1}-${dayNum}`;
              const record = dayRecords[photoKey];
              const photoUri = record?.photoUri;
              const amount = record?.amount || 0;
              const categoryIcon = record?.categoryIcon;
              const isToday = isCurrentRealMonth && dayNum === todayDate;
              const isCompleted = isCurrentRealMonth
                ? (dayNum < todayDate || !!photoUri || amount > 0)
                : (currentDate < today || !!photoUri || amount > 0);
              const isSelected = selectedDay === dayNum;

              return (
                <TouchableOpacity
                  key={`day-${dayNum}`}
                  style={[
                    styles.calCell,
                    isCompleted && styles.dayCellCompleted,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                    photoUri && styles.calCellWithPhoto,
                  ]}
                  onPress={() => handleDayPress(dayNum)}
                  activeOpacity={0.8}
                >
                  {photoUri ? (
                    <>
                      <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      <View style={styles.photoOverlay} />
                      <View style={styles.photoCellTopRow}>
                        <View style={styles.photoDayPill}>
                          <Text style={styles.photoDayText}>{dayNum < 10 ? `0${dayNum}` : dayNum}</Text>
                        </View>
                        <View style={styles.photoBadgeMini}>
                          <Text style={{ fontSize: 9 }}>{categoryIcon || '📷'}</Text>
                        </View>
                      </View>
                      <View style={styles.photoCellBottomRow}>
                        {amount > 0 ? (
                          <View style={styles.cellAmountBadge}>
                            <Text style={styles.cellAmountBadgeText}>-{formatAmountShort(amount)}</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.cellPricePromptBadge}
                            onPress={(e) => handleCellActionPress(e, dayNum)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.cellPricePromptText}>+ Nhập tiền</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.cellTopHeader}>
                        <Text
                          style={[
                            styles.dayNumText,
                            isToday && styles.dayNumTextToday,
                            isCompleted && styles.dayNumTextCompleted,
                          ]}
                        >
                          {dayNum < 10 ? `0${dayNum}` : dayNum}
                        </Text>
                        {isToday && (
                          <View style={styles.todayDotBadge} />
                        )}
                      </View>

                      <View style={styles.cellActionArea}>
                        {amount > 0 ? (
                          <View style={styles.noPhotoExpenseBadge}>
                            <Text style={styles.noPhotoExpenseIcon}>{categoryIcon || '💰'}</Text>
                            <Text style={styles.noPhotoExpenseText}>-{formatAmountShort(amount)}</Text>
                          </View>
                        ) : isToday ? (
                          <TouchableOpacity
                            style={styles.uploadMiniBadge}
                            onPress={(e) => handleCellActionPress(e, dayNum)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.uploadMiniPlus}>+</Text>
                            <Text style={styles.uploadMiniText}>
                              {language === 'vi' ? 'Ghi chi' : 'Record'}
                            </Text>
                          </TouchableOpacity>
                        ) : isCompleted ? (
                          <Text style={styles.dayStatusIcon}>🔥</Text>
                        ) : (
                          <Text style={styles.dayStatusIconPending}>○</Text>
                        )}
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer tip */}
        <View style={styles.calendarFooterTip}>
          <Text style={styles.calendarFooterText}>
            💡 {language === 'vi'
              ? 'Ấn vào bất kỳ ô ngày nào để tải ảnh hoá đơn, nhập số tiền và chọn danh mục chi tiêu.'
              : 'Tap any day cell to upload receipt photo, enter amount, and select expense category.'}
          </Text>
        </View>
      </View>

      {/* ===================== ROW 3: MỤC NHẮC NHỞ & GIAO DỊCH GẦN ĐÂY ===================== */}
      <View style={[styles.widgetsRow, width >= 900 && styles.widgetsRowWide]}>
        {/* CỘT 1: MỤC NHẮC NHỞ (kiểu card màu) */}
        <View style={[styles.widgetCol, width >= 900 && { flex: 1 }]}>
          <View style={styles.reminderCardWrap}>
            <View style={styles.reminderCardHeader}>
              <View style={styles.reminderCardIconWrap}>
                <Ionicons name="alarm-outline" size={18} color="#7C3AED" />
              </View>
              <Text style={styles.reminderCardTitle}>Mục nhắc nhở</Text>
            </View>
            <RemindersWidget
              noMargin={true}
              currentDateStr={`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(todayDate > 0 ? todayDate : 1).padStart(2, '0')}`}
            />
          </View>
        </View>

        {/* CỘT 2: GIAO DỊCH GẦN ĐÂY */}
        <View style={[styles.widgetCol, width >= 900 && { flex: 1 }]}>
          <RecentTransactionsWidget
            language={language as any}
            onViewAll={() => onNavigateToTab?.('transactions')}
          />
        </View>
      </View>

      {/* ===================== ROW 4: CHI ĐỊNH KỲ & SỰ KIỆN ===================== */}
      <HomeRecurringEventsRow
        userId={user?.id}
        language={language as any}
        onNavigateToTab={onNavigateToTab}
        currentYear={currentYear}
        currentMonth={currentMonth}
      />

      {/* ===================== 1. MODAL LƯU NHANH CHI TIÊU (KHÔNG BẮT BUỘC ẢNH, CỘNG DỒN VÀO LỊCH) ===================== */}
      <Modal
        visible={quickSaveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickSaveModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalFormCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.quickSaveModalIconCircle}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="#FFFFFF">
                    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </Svg>
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {language === 'vi' ? 'Lưu nhanh chi tiêu' : 'Quick Save Expense'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {language === 'vi'
                      ? `Tự động cộng dồn vào ngày ${quickDayNum < 10 ? '0' + quickDayNum : quickDayNum}/${currentMonth + 1}/${currentYear}`
                      : `Auto-accumulates into ${quickDayNum < 10 ? '0' + quickDayNum : quickDayNum}/${currentMonth + 1}/${currentYear}`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setQuickSaveModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Line x1="18" y1="6" x2="6" y2="18" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                  <Line x1="6" y1="6" x2="18" y2="18" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                </Svg>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 560 }}>
              {/* Ngày & Giờ chi tiêu */}
              <View style={styles.modalFormSection}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Ngày */}
                  <View style={{ flex: 1.3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                        <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#059669" strokeWidth="2" />
                        <Line x1="16" y1="2" x2="16" y2="6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                        <Line x1="8" y1="2" x2="8" y2="6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                        <Line x1="3" y1="10" x2="21" y2="10" stroke="#059669" strokeWidth="2" />
                      </Svg>
                      <Text style={styles.modalFormLabel}>
                        {language === 'vi' ? 'Ngày chi tiêu' : 'Expense Date'}
                      </Text>
                    </View>
                    <View style={styles.dateSelectorRow}>
                      <TouchableOpacity
                        style={styles.dateArrowMiniBtn}
                        onPress={() => setQuickDayNum((d) => Math.max(1, d - 1))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800' }}>‹</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dateSelectorCenterBtn}
                        onPress={() => setShowMiniDatePicker((v) => !v)}
                        activeOpacity={0.75}
                      >
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                          <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#059669" strokeWidth="2" />
                          <Line x1="16" y1="2" x2="16" y2="6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                          <Line x1="8" y1="2" x2="8" y2="6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                          <Line x1="3" y1="10" x2="21" y2="10" stroke="#059669" strokeWidth="2" />
                        </Svg>
                        <Text style={styles.dateSelectorText}>
                          {quickDayNum < 10 ? '0' + quickDayNum : quickDayNum}/{pickerMonth + 1}/{pickerYear}
                        </Text>
                        <Text style={styles.dateSelectorChevron}>{showMiniDatePicker ? '▲' : '▼'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dateArrowMiniBtn}
                        onPress={() => setQuickDayNum((d) => Math.min(totalDaysInMonth, d + 1))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800' }}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Giờ chi tiêu */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                        <Circle cx="12" cy="12" r="10" stroke="#059669" strokeWidth="2" />
                        <Polyline points="12 6 12 12 16 14" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                      <Text style={styles.modalFormLabel}>
                        {language === 'vi' ? 'Giờ chi' : 'Time'}
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.modalInput, { textAlign: 'center', fontWeight: '700' }]}
                      value={quickTimeStr}
                      onChangeText={setQuickTimeStr}
                      placeholder="12:00"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                {/* Dropdown Mini Lịch chuyên nghiệp */}
                {showMiniDatePicker && (
                  <View style={styles.miniCalDropdown}>
                    {/* Header Month / Year controls */}
                    <View style={styles.miniCalHeader}>
                      <TouchableOpacity
                        style={styles.miniCalArrowBtn}
                        onPress={handlePrevPickerMonth}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.miniCalArrowText}>‹</Text>
                      </TouchableOpacity>

                      <Text style={styles.miniCalTitle}>
                        {language === 'vi'
                          ? `Tháng ${pickerMonth + 1}, ${pickerYear}`
                          : `${new Date(pickerYear, pickerMonth).toLocaleString('en-US', { month: 'long' })} ${pickerYear}`}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.miniCalTodayBtn}
                          onPress={handlePickerToday}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.miniCalTodayText}>
                            {language === 'vi' ? 'Hôm nay' : 'Today'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.miniCalArrowBtn}
                          onPress={handleNextPickerMonth}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.miniCalArrowText}>›</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Day of Week Header */}
                    <View style={styles.miniCalDowRow}>
                      {(language === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((dow, idx) => (
                        <View key={dow + idx} style={styles.miniCalDowCell}>
                          <Text style={[styles.miniCalDowText, (idx === 5 || idx === 6) && styles.miniCalWeekendText]}>
                            {dow}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Day Grid Matrix */}
                    <View style={styles.miniCalGrid}>
                      {(() => {
                        const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                        const firstDow = (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7; // Monday = 0
                        const cells: (number | null)[] = [];
                        for (let i = 0; i < firstDow; i++) cells.push(null);
                        for (let d = 1; d <= daysInMonth; d++) cells.push(d);

                        return cells.map((day, idx) => {
                          if (day === null) {
                            return <View key={`empty-${idx}`} style={styles.miniCalCell} />;
                          }

                          const isSelected =
                            day === quickDayNum &&
                            pickerMonth === currentMonth &&
                            pickerYear === currentYear;
                          const isTodayDate =
                            today.getFullYear() === pickerYear &&
                            today.getMonth() === pickerMonth &&
                            today.getDate() === day;

                          return (
                            <TouchableOpacity
                              key={`day-${day}`}
                              style={[
                                styles.miniCalCell,
                                isTodayDate && styles.miniCalCellToday,
                                isSelected && styles.miniCalCellSelected,
                              ]}
                              onPress={() => {
                                setQuickDayNum(day);
                                setShowMiniDatePicker(false);
                              }}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.miniCalCellText,
                                  isTodayDate && styles.miniCalCellTextToday,
                                  isSelected && styles.miniCalCellTextSelected,
                                ]}
                              >
                                {day}
                              </Text>
                            </TouchableOpacity>
                          );
                        });
                      })()}
                    </View>
                  </View>
                )}
              </View>

              {/* 1. Số tiền chi tiêu */}
              <View style={styles.modalFormSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                      <Circle cx="12" cy="12" r="10" stroke="#D97706" strokeWidth="2" />
                      <Path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 3 5 2 5 5a2.5 2.5 0 0 1-5 0" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
                    </Svg>
                    <Text style={styles.modalFormLabel}>
                      {language === 'vi' ? 'Số tiền (VNĐ)' : 'Amount (VND)'} *
                    </Text>
                  </View>
                  {quickAmountStr && parseInt(quickAmountStr.replace(/\D/g, ''), 10) > 0 ? (
                    <Text style={styles.modalAmountFormatted}>
                      = {parseInt(quickAmountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN')} đ
                    </Text>
                  ) : null}
                </View>

                <TextInput
                  style={[styles.modalInput, styles.modalAmountInput]}
                  value={quickAmountStr}
                  onChangeText={setQuickAmountStr}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  autoFocus
                />

                {/* Quick Add Buttons */}
                <View style={styles.quickAmountRow}>
                  {[20000, 50000, 100000, 200000, 500000].map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={styles.quickAmountChip}
                      onPress={() => handleAddQuickAmount(val)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAmountText}>+{formatAmountShort(val)}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.quickAmountChip, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                    onPress={() => setQuickAmountStr('')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickAmountText, { color: '#DC2626' }]}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 2. Danh mục chi tiêu */}
              <View style={styles.modalFormSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                    <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx="7" cy="7" r="1.5" fill="#059669" />
                  </Svg>
                  <Text style={styles.modalFormLabel}>
                    {language === 'vi' ? 'Danh mục chi tiêu' : 'Category'}
                  </Text>
                </View>
                <View style={styles.categoryGrid}>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const isSelected = quickCategory === cat.name;
                    const theme = CATEGORY_THEMES[cat.id] || CATEGORY_THEMES.other;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          isSelected && {
                            borderColor: theme.primary,
                            borderWidth: 2,
                            backgroundColor: isDark ? theme.bgDark : theme.bgLight,
                            shadowColor: theme.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.22,
                            shadowRadius: 10,
                            elevation: 4,
                          },
                        ]}
                        onPress={() => {
                          setQuickCategory(cat.name);
                          setQuickCategoryIcon(cat.icon);
                        }}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.categoryIconCircle,
                            isSelected && {
                              backgroundColor: isDark ? theme.circleDark : theme.circleLight,
                            },
                          ]}
                        >
                          <CategorySvgIcon categoryId={cat.id} size={28} isSelected={isSelected} />
                        </View>
                        <Text
                          style={[
                            styles.categoryChipText,
                            isSelected && {
                              fontWeight: '900',
                              color: isDark ? theme.textDark : theme.textLight,
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. Ghi chú / Tên món (Tùy chọn) */}
              <View style={styles.modalFormSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={styles.modalFormLabel}>
                    {language === 'vi' ? 'Ghi chú / Tên món (Tùy chọn)' : 'Note (Optional)'}
                  </Text>
                </View>
                <TextInput
                  style={styles.modalInput}
                  value={quickNote}
                  onChangeText={setQuickNote}
                  placeholder={language === 'vi' ? 'Ví dụ: Cơm trưa, Cà phê Highland...' : 'E.g. Lunch, Coffee...'}
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* 4. Ảnh hóa đơn / khoảnh khắc (Tùy chọn, KHÔNG BẮT BUỘC) */}
              <View style={styles.modalFormSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Circle cx="12" cy="13" r="4" stroke="#059669" strokeWidth="2" />
                  </Svg>
                  <Text style={styles.modalFormLabel}>
                    {language === 'vi' ? 'Ảnh hóa đơn / khoảnh khắc (Tùy chọn)' : 'Photo Receipt (Optional)'}
                  </Text>
                </View>
                {isCompressingPhoto ? (
                  <View style={[styles.quickPhotoUploadBtn, { opacity: 0.85, borderColor: '#059669', backgroundColor: '#ECFDF5' }]}>
                    <Text style={{ fontSize: 16 }}>⏳</Text>
                    <Text style={[styles.quickPhotoUploadText, { color: '#047857', fontWeight: '700' }]}>
                      {language === 'vi' ? 'Đang nén và tối ưu ảnh...' : 'Compressing and optimizing photo...'}
                    </Text>
                  </View>
                ) : quickPhotoUri ? (
                  <View style={{ marginTop: 6 }}>
                    <View style={styles.quickPhotoThumbBox}>
                      <Image source={{ uri: quickPhotoUri }} style={styles.quickPhotoThumb} resizeMode="cover" />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                      <TouchableOpacity
                        style={styles.photoControlBtnChange}
                        onPress={handleUploadPhotoInQuickSave}
                      >
                        <Text style={styles.photoControlTextChange}>🔄 {language === 'vi' ? 'Đổi ảnh' : 'Change'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.photoControlBtnRemove}
                        onPress={() => setQuickPhotoUri('')}
                      >
                        <Text style={styles.photoControlTextRemove}>🗑️ {language === 'vi' ? 'Bỏ ảnh' : 'Remove'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.quickPhotoUploadBtn}
                    onPress={handleUploadPhotoInQuickSave}
                    activeOpacity={0.75}
                  >
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <Circle cx="12" cy="13" r="4" stroke="#059669" strokeWidth="2" />
                    </Svg>
                    <Text style={styles.quickPhotoUploadText}>
                      {language === 'vi' ? '+ Đính kèm ảnh nếu có (Không bắt buộc)' : '+ Attach photo if available (Optional)'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setQuickSaveModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>{language === 'vi' ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveQuickExpense}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="#FFFFFF">
                    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </Svg>
                  <Text style={styles.modalSaveBtnText}>
                    {language === 'vi' ? 'Lưu chi tiêu' : 'Save Expense'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== 2. MODAL XEM TẤT CẢ CHI TIÊU CỦA NGÀY (TIMELINE CHI TIẾT) ===================== */}
      <Modal
        visible={timelineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimelineModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalFormCard, { maxWidth: 620, maxHeight: '90vh' as any }]}>
            {/* Header: Date + Total */}
            <View style={styles.timelineModalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#059669" strokeWidth="2" />
                    <Line x1="16" y1="2" x2="16" y2="6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                    <Line x1="8" y1="2" x2="8" y2="6" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
                    <Line x1="3" y1="10" x2="21" y2="10" stroke="#059669" strokeWidth="2" />
                  </Svg>
                  <Text style={styles.timelineModalTitle}>
                    {language === 'vi'
                      ? `Chi tiêu ngày ${timelineDayNum < 10 ? '0' + timelineDayNum : timelineDayNum}/${currentMonth + 1}/${currentYear}`
                      : `Expenses on ${timelineDayNum < 10 ? '0' + timelineDayNum : timelineDayNum}/${currentMonth + 1}/${currentYear}`}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <View style={styles.timelineTotalPill}>
                    <Text style={styles.timelineTotalLabel}>{language === 'vi' ? 'Tổng chi:' : 'Total:'}</Text>
                    <Text style={styles.timelineTotalAmount}>
                      {(dayRecords[`${currentYear}-${currentMonth + 1}-${timelineDayNum}`]?.amount || 0).toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                  <Text style={styles.timelineCountText}>
                    {(dayRecords[`${currentYear}-${currentMonth + 1}-${timelineDayNum}`]?.items || []).length}{' '}
                    {language === 'vi' ? 'khoản chi' : 'records'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons: + Lưu nhanh & Đóng */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={styles.timelineAddBtn}
                  onPress={() => {
                    setTimelineModalVisible(false);
                    handleOpenQuickSave(timelineDayNum);
                  }}
                  activeOpacity={0.82}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="#FFFFFF">
                      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </Svg>
                    <Text style={styles.timelineAddBtnText}>
                      {language === 'vi' ? '+ Lưu nhanh' : '+ Add'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setTimelineModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Line x1="18" y1="6" x2="6" y2="18" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                    <Line x1="6" y1="6" x2="18" y2="18" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 490, marginVertical: 8 }}>
              {/* Cover Photo Bar on Top of Timeline (if any) */}
              {dayRecords[`${currentYear}-${currentMonth + 1}-${timelineDayNum}`]?.photoUri ? (
                <View style={styles.timelineCoverCard}>
                  <Image
                    source={{ uri: dayRecords[`${currentYear}-${currentMonth + 1}-${timelineDayNum}`]?.photoUri }}
                    style={styles.timelineCoverImg}
                    resizeMode="cover"
                  />
                  <View style={styles.timelineCoverOverlay}>
                    <Text style={styles.timelineCoverBadge}>
                      📷 {language === 'vi' ? 'Ảnh đại diện ô lịch' : 'Calendar Cell Cover'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.timelineCoverActionBtn}
                        onPress={() => handlePickCoverPhotoForDay(timelineDayNum)}
                      >
                        <Text style={styles.timelineCoverActionText}>🔄 {language === 'vi' ? 'Đổi ảnh' : 'Change'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.timelineCoverActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}
                        onPress={() => handleRemoveCoverPhotoForDay(timelineDayNum)}
                      >
                        <Text style={styles.timelineCoverActionText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.timelineAddCoverBtn}
                  onPress={() => handlePickCoverPhotoForDay(timelineDayNum)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 16 }}>📷</Text>
                  <Text style={styles.timelineAddCoverText}>
                    {language === 'vi' ? '+ Thêm ảnh đại diện cho ô lịch ngày này' : '+ Add photo cover for this day cell'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Timeline Items List */}
              {(!dayRecords[`${currentYear}-${currentMonth + 1}-${timelineDayNum}`]?.items ||
                dayRecords[`${currentYear}-${currentMonth + 1}-${timelineDayNum}`]!.items!.length === 0) ? (
                <View style={styles.timelineEmptyBox}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🍃</Text>
                  <Text style={styles.timelineEmptyTitle}>
                    {language === 'vi' ? 'Chưa có khoản chi nào trong ngày này' : 'No expenses recorded yet'}
                  </Text>
                  <Text style={styles.timelineEmptySubtitle}>
                    {language === 'vi'
                      ? 'Bấm nút "Lưu nhanh" ở trên để ghi chép chi tiêu với thời gian chính xác!'
                      : 'Tap "Quick Save" above to record expenses with precise time!'}
                  </Text>
                </View>
              ) : (
                <View style={styles.timelineList}>
                  {dayRecords[`${currentYear}-${currentMonth + 1}-${timelineDayNum}`]!.items!.map((it, idx) => (
                    <View key={it.id || idx} style={styles.timelineRow}>
                      {/* Left: Time indicator */}
                      <View style={styles.timelineTimeCol}>
                        <View style={styles.timelineTimeBadge}>
                          <Text style={styles.timelineTimeText}>{it.time || '12:00'}</Text>
                        </View>
                        {idx < dayRecords[`${currentYear}-${currentMonth + 1}-${timelineDayNum}`]!.items!.length - 1 && (
                          <View style={styles.timelineConnectorLine} />
                        )}
                      </View>

                      {/* Right: Expense Card */}
                      <View style={styles.timelineCard}>
                        <View style={styles.timelineCardTop}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                            <Text style={{ fontSize: 16 }}>{it.categoryIcon || '🍜'}</Text>
                            <Text style={styles.timelineCardCategory}>{it.category || 'Ăn uống'}</Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.timelineCardAmount}>
                              -{(it.amount || 0).toLocaleString('vi-VN')} đ
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteExpenseItem(timelineDayNum, it.id)}
                              style={styles.timelineItemDeleteBtn}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Text style={{ fontSize: 12 }}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Note (if any) */}
                        {it.note ? (
                          <Text style={styles.timelineCardNote}>
                            📝 {it.note}
                          </Text>
                        ) : null}

                        {/* Photo: nếu có ảnh thì hiển thị, nếu không có ảnh thì thôi */}
                        {it.photoUri ? (
                          <TouchableOpacity
                            style={styles.timelineItemPhotoWrapper}
                            onPress={() => setLightboxUri(it.photoUri!)}
                            activeOpacity={0.9}
                          >
                            <Image
                              source={{ uri: it.photoUri }}
                              style={styles.timelineItemPhoto}
                              resizeMode="cover"
                            />
                            <View style={styles.timelinePhotoZoomBadge}>
                              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>🔍 Phóng to</Text>
                            </View>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Close */}
            <View style={styles.timelineModalBottom}>
              <TouchableOpacity
                style={styles.timelineCloseBtn}
                onPress={() => setTimelineModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.timelineCloseBtnText}>{language === 'vi' ? 'Đóng' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================== 3. MODAL PHÓNG TO ẢNH (LIGHTBOX PREVIEW) ===================== */}
      <Modal
        visible={!!lightboxUri}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setLightboxUri(null)}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>✕</Text>
          </TouchableOpacity>
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#F5F0E8',
  },
  contentContainer: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    maxWidth: 1680,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  overviewSection: {
    width: '100%',
    gap: 14,
    paddingBottom: 6,
  },

  gridRow: {
    gap: 24,
  },
  rowDesktop: {
    flexDirection: 'row',
  },
  rowMobile: {
    flexDirection: 'column',
  },
  flex1: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: isDark ? '#000000' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 14,
    elevation: 3,
  },
  fullWidthCard: {
    width: '100%',
  },
  dashboardWidgetsRow: {
    width: '100%',
    flexDirection: 'column',
    gap: 20,
    marginBottom: 24,
  },
  dashboardWidgetsRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dashboardWidgetCard: {
    padding: 20,
    borderRadius: 22,
    marginBottom: 0,
  },

  // ==================== PROFILE CARD STYLES ====================
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#047857',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    fontSize: 11,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pioneerBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 14,
  },
  pioneerBadgeText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  userSubText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  userIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  activeDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: isDark ? '#334155' : '#EAE3D7',
  },
  uploadPhotoIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  uploadPhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  // Slogan box (Editorial Pullquote Style - No Enclosing Box)


  // ==================== CASHFLOW CARD STYLES ====================
  cashflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cashflowTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 6,
  },
  settingsIcon: {
    fontSize: 18,
  },
  salaryBox: {
    backgroundColor: isDark ? '#334155' : '#EAE3D7',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  salaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  salaryAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.5,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  updateSalaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? '#334155' : '#EAE3D7',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  updateSalaryIcon: {
    fontSize: 14,
  },
  updateSalaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  paydayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 18,
  },
  paydayNumberBox: {
    width: 44,
    height: 44,
    backgroundColor: '#FDE68A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paydayNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#92400E',
  },
  paydayInfo: {
    flex: 1,
  },
  paydayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  paydayCycle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  daysRemainingBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  daysRemainingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  safeBudgetSection: {
    gap: 8,
  },
  safeBudgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  safeBudgetTitle: {
    fontSize: 13,
    color: '#475569',
  },
  boldText: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#047857',
    borderRadius: 5,
  },

  // ==================== LỊCH TRÌNH CHI TIÊU STYLES ====================
  scheduleHeader: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerTotalSpentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#D1FAE5',
    borderWidth: 1,
    borderColor: isDark ? '#059669' : '#6EE7B7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  headerTotalSpentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: isDark ? '#A7F3D0' : '#065F46',
  },
  headerTotalSpentAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: isDark ? '#34D399' : '#047857',
  },
  monthlyStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: isDark ? '#1E293B' : '#F5F0E8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E8E0D5',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 12,
  },
  monthStatCol: {
    alignItems: 'center',
    gap: 3,
    minWidth: 100,
  },
  monthStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  monthStatValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#065F46',
  },
  monthStatCurrency: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  monthStatUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  monthStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: isDark ? '#334155' : '#D1D5DB',
  },
  streakJourneyBox: {
    backgroundColor: isDark ? '#334155' : '#EAE3D7',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  journeyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? '#1E293B' : '#E8E0D5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  monthArrowBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  monthArrowText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  todayPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: isDark ? '#334155' : '#F5F0E8',
    borderRadius: 6,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  dayOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 6,
  },
  dayOfWeekCell: {
    width: Platform.OS === 'web' ? ('calc((100% - 36px) / 7)' as any) : '13.2%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  weekendText: {
    color: '#EF4444',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calCell: {
    width: Platform.OS === 'web' ? ('calc((100% - 36px) / 7)' as any) : '13.2%',
    height: 138,
    backgroundColor: isDark ? '#1E293B' : '#FAF7F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 11,
    position: 'relative',
    overflow: 'hidden',
  },
  calCellPrevMonth: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    borderColor: 'transparent',
    opacity: 0.35,
  },
  prevMonthNum: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  calCellWithPhoto: {
    borderWidth: 1.5,
    borderColor: '#059669',
    backgroundColor: '#000',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  photoCellTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  photoDayPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  photoDayText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoBadgeMini: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  photoCellBottomRow: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cellAmountBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#FDE047',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  cellAmountBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.2,
  },
  cellPricePromptBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  cellPricePromptText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  noPhotoExpenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  noPhotoExpenseIcon: {
    fontSize: 10,
  },
  noPhotoExpenseText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#92400E',
  },
  cellTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayDotBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  cellActionArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  uploadMiniPlus: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  uploadMiniText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#92400E',
  },
  dayStatusIconPending: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  dayCellCompleted: {
    backgroundColor: isDark ? 'rgba(190, 227, 194, 0.25)' : '#BEE3C2',
    borderColor: isDark ? '#BEE3C2' : '#A0D6A6',
  },
  dayCellToday: {
    borderColor: '#D97706',
    borderWidth: 2,
    backgroundColor: '#FFFBEB',
  },
  dayCellSelected: {
    borderColor: '#059669',
    borderWidth: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  dayNumText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dayNumTextCompleted: {
    color: isDark ? '#A7F3D0' : '#064E3B',
    fontWeight: '800',
  },
  dayNumTextToday: {
    color: '#92400E',
    fontWeight: '900',
  },
  dayStatusIcon: {
    fontSize: 17,
  },
  calendarFooterTip: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  calendarFooterText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  modalFormCard: {
    backgroundColor: isDark ? '#1E293B' : '#F5F0E8',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 630,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E8E0D5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#334155' : '#E8E0D5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  modalFormSection: {
    marginBottom: 16,
  },
  modalFormLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalAmountFormatted: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  modalInput: {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    outlineStyle: 'none' as any,
  },
  modalAmountInput: {
    fontSize: 24,
    fontWeight: '900',
    color: '#059669',
    paddingVertical: 12,
  },
  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickAmountChip: {
    backgroundColor: isDark ? '#334155' : '#EAE3D7',
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    justifyContent: 'space-between',
  },
  categoryChip: {
    width: Platform.OS === 'web' ? ('calc((100% - 30px) / 4)' as any) : '22.8%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    cursor: 'pointer' as any,
  },
  categoryChipActive: {
    borderColor: '#059669',
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.18)' : '#ECFDF5',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryIconCircleActive: {
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.35)' : '#D1FAE5',
  },
  categoryBigIcon: {
    fontSize: 28,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryChipTextActive: {
    fontWeight: '900',
    color: '#065F46',
  },
  modalPreviewPhotoBox: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 8,
  },
  modalPreviewImage: {
    width: '100%',
    height: '100%',
  },
  modalPhotoControlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  photoControlBtnChange: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  photoControlTextChange: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  photoControlBtnRemove: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  photoControlTextRemove: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  uploadPromptCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#059669',
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.1)' : 'rgba(5, 150, 105, 0.05)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 14,
  },
  uploadPromptTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  uploadPromptSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalSaveBtn: {
    backgroundColor: '#059669',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalDeleteRecordBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  modalDeleteRecordText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  quickSaveModalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginTop: 4,
  },
  dateArrowMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDark ? '#334155' : '#EAE3D7',
  },
  dateSelectorCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
    cursor: 'pointer' as any,
  },
  dateSelectorIcon: {
    fontSize: 14,
  },
  dateSelectorText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  dateSelectorChevron: {
    fontSize: 9,
    color: '#64748B',
    marginLeft: 2,
  },
  miniCalDropdown: {
    marginTop: 8,
    width: '100%',
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  miniCalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#F1F5F9',
  },
  miniCalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  miniCalArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCalArrowText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  miniCalTodayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.25)' : '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  miniCalTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  miniCalDowRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  miniCalDowCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 2,
  },
  miniCalDowText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  miniCalWeekendText: {
    color: '#EF4444',
  },
  miniCalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniCalCell: {
    width: '14.28%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    marginVertical: 1,
  },
  miniCalCellToday: {
    borderWidth: 1.5,
    borderColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  miniCalCellSelected: {
    backgroundColor: '#059669',
  },
  miniCalCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  miniCalCellTextToday: {
    color: '#B45309',
    fontWeight: '800',
  },
  miniCalCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  quickPhotoThumbBox: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  quickPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  quickPhotoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#059669',
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.08)' : 'rgba(5, 150, 105, 0.05)',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 6,
  },
  quickPhotoUploadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  modalCancelBtn: {
    backgroundColor: isDark ? '#334155' : '#E2E8F0',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },

  // ==================== TIMELINE MODAL STYLES ====================
  timelineModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#E8E0D5',
  },
  timelineModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  timelineTotalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.25)' : '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timelineTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  timelineTotalAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803D',
  },
  timelineCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  timelineAddBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#34D399',
  },
  timelineAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  timelineCoverCard: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    backgroundColor: '#000',
  },
  timelineCoverImg: {
    width: '100%',
    height: '100%',
  },
  timelineCoverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineCoverBadge: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  timelineCoverActionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timelineCoverActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  timelineAddCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: isDark ? '#475569' : '#CBD5E1',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  timelineAddCoverText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timelineEmptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineEmptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  timelineEmptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
  },
  timelineList: {
    paddingVertical: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  timelineTimeCol: {
    width: 60,
    alignItems: 'center',
    position: 'relative',
    paddingTop: 2,
  },
  timelineTimeBadge: {
    backgroundColor: isDark ? '#334155' : '#EAE3D7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timelineTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  timelineConnectorLine: {
    position: 'absolute',
    top: 24,
    bottom: -10,
    width: 2,
    backgroundColor: isDark ? '#334155' : '#E2E8F0',
  },
  timelineCard: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E8E0D5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  timelineCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineCardCategory: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timelineCardAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#DC2626',
  },
  timelineItemDeleteBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: isDark ? '#1E293B' : '#FEE2E2',
  },
  timelineCardNote: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  timelineItemPhotoWrapper: {
    marginTop: 8,
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  timelineItemPhoto: {
    width: '100%',
    height: '100%',
  },
  timelinePhotoZoomBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineModalBottom: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#334155' : '#E8E0D5',
    alignItems: 'center',
  },
  timelineCloseBtn: {
    backgroundColor: isDark ? '#334155' : '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  timelineCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lightboxImage: {
    width: '94%',
    height: '84%',
  },

  // ============ NEW LAYOUT STYLES ============
  widgetsRow: {
    flexDirection: 'column',
    gap: 14,
    marginBottom: 20,
  },
  widgetsRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  widgetCol: {
    flex: 1,
  },
  reminderCardWrap: {
    backgroundColor: '#EDE9FE',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  reminderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  reminderCardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 1,
  },
  reminderCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4C1D95',
  },
});

