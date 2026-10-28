import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { IncomeManagementScreen } from '../mobile/IncomeManagementScreen';
import {
  getTotalIncomeForMonth,
  subscribeIncomeUpdates,
  syncIncomeWithBudget,
  syncIncomesFromBackendTransactions,
} from '../../services/incomeStorage';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { AiReceiptScanModal, AiReceiptScanResult } from '../../components/AiReceiptScanModal';
import { loadRecurringItems, getFrequencyLabel } from '../../services/recurringStorage';
import {
  loadEventsFromStorage,
  saveEventsToStorage,
  MonettEvent,
} from '../../services/eventsStorage';
import {
  getBudgetApi,
  BudgetData,
  getTransactionsApi,
  createTransactionApi,
  updateTransactionApi,
  deleteTransactionApi,
  uploadReceiptApi,
  getEventsApi,
} from '../../services/api';
import {
  compressImageFile,
  saveDayRecordsToStorage,
  idbLoadRecords,
  getInitialDayRecordsFromLocalStorage,
  mergeTransactionsIntoDayRecords,
  buildDayRecordsFromTransactions,
  subscribeCalendarUpdates,
  getLatestPhotoFromItems,
  getCachedBudget,
  saveCachedBudget,
  notifyBudgetUpdated,
  subscribeBudgetUpdates,
  applyBudgetDelta,
  formatExpenseUploadTime,
} from '../../services/calendarStorage';

export interface ExpenseItem {
  id: string;
  time: string; // "14:30"
  amount: number;
  category: string;
  categoryIcon: string;
  title?: string;
  type?: 'expense' | 'income';
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
  housing: {
    primary: '#0D9488',
    bgLight: '#F0FDFA',
    bgDark: 'rgba(13, 148, 136, 0.16)',
    circleLight: '#CCFBF1',
    circleDark: 'rgba(13, 148, 136, 0.28)',
    textLight: '#0F766E',
    textDark: '#5EEAD4',
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
  health: {
    primary: '#10B981',
    bgLight: '#ECFDF5',
    bgDark: 'rgba(16, 185, 129, 0.16)',
    circleLight: '#D1FAE5',
    circleDark: 'rgba(16, 185, 129, 0.28)',
    textLight: '#047857',
    textDark: '#6EE7B7',
  },
  beauty: {
    primary: '#A855F7',
    bgLight: '#FAF5FF',
    bgDark: 'rgba(168, 85, 247, 0.16)',
    circleLight: '#F3E8FF',
    circleDark: 'rgba(168, 85, 247, 0.28)',
    textLight: '#7E22CE',
    textDark: '#D8B4FE',
  },
  education: {
    primary: '#3B82F6',
    bgLight: '#EFF6FF',
    bgDark: 'rgba(59, 130, 246, 0.16)',
    circleLight: '#DBEAFE',
    circleDark: 'rgba(59, 130, 246, 0.28)',
    textLight: '#1D4ED8',
    textDark: '#93C5FD',
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

export const resolveCategoryKey = (category?: string, categoryIcon?: string): string => {
  if (categoryIcon === '📸' || categoryIcon === '📷') return 'camera';
  if (category) {
    const catLower = category.toLowerCase().trim();
    if (catLower === 'food' || catLower.includes('ăn') || catLower.includes('uống') || catLower.includes('ẩm thực') || catLower.includes('phở') || catLower.includes('cơm') || catLower.includes('bún') || catLower.includes('lẩu') || catLower.includes('pizza') || catLower.includes('salad')) return 'food';
    if (catLower === 'coffee' || catLower.includes('cà phê') || catLower.includes('cafe') || catLower.includes('trà') || catLower.includes('nước') || catLower.includes('đồ uống')) return 'coffee';
    if (catLower === 'market' || catLower.includes('chợ') || catLower.includes('siêu thị') || catLower.includes('thực phẩm')) return 'market';
    if (catLower === 'shopping' || catLower.includes('mua sắm') || catLower.includes('sắm') || catLower.includes('quần áo')) return 'shopping';
    if (catLower === 'transport' || catLower.includes('di chuyển') || catLower.includes('xăng') || catLower.includes('xe') || catLower.includes('grab')) return 'transport';
    if (catLower === 'bills' || catLower.includes('hóa đơn') || catLower.includes('điện') || catLower.includes('tiền') || catLower.includes('bill')) return 'bills';
    if (catLower === 'housing' || catLower.includes('nhà') || catLower.includes('phòng') || catLower.includes('thuê') || catLower.includes('trọ')) return 'housing';
    if (catLower === 'entertainment' || catLower.includes('giải trí') || catLower.includes('phim') || catLower.includes('game') || catLower.includes('cinema')) return 'entertainment';
    if (catLower === 'health' || catLower.includes('y tế') || catLower.includes('thuốc') || catLower.includes('sức khỏe') || catLower.includes('khám')) return 'health';
    if (catLower === 'beauty' || catLower.includes('làm đẹp') || catLower.includes('mỹ phẩm') || catLower.includes('spa') || catLower.includes('tóc') || catLower.includes('skincare')) return 'beauty';
    if (catLower === 'education' || catLower.includes('học') || catLower.includes('sách') || catLower.includes('khóa học') || catLower.includes('trường')) return 'education';
    if (catLower.includes('khoảnh khắc') || catLower.includes('camera') || catLower.includes('ảnh')) return 'camera';
    if (catLower === 'other' || catLower.includes('khác')) return 'other';
  }
  if (categoryIcon) {
    if (categoryIcon === '🍜' || categoryIcon === '🍲' || categoryIcon === '🍚' || categoryIcon === '🍕') return 'food';
    if (categoryIcon === '☕' || categoryIcon === '🍹' || categoryIcon === '🍰') return 'coffee';
    if (categoryIcon === '🛒') return 'market';
    if (categoryIcon === '🛍️') return 'shopping';
    if (categoryIcon === '🛵' || categoryIcon === '🚗' || categoryIcon === '⛽') return 'transport';
    if (categoryIcon === '🧾' || categoryIcon === '💰') return 'bills';
    if (categoryIcon === '🏠' || categoryIcon === '🏡') return 'housing';
    if (categoryIcon === '🎬') return 'entertainment';
    if (categoryIcon === '💊' || categoryIcon === '🩺') return 'health';
    if (categoryIcon === '💅' || categoryIcon === '💄' || categoryIcon === '🧴') return 'beauty';
    if (categoryIcon === '📚' || categoryIcon === '🎓' || categoryIcon === '📖') return 'education';
    if (categoryIcon === '📸' || categoryIcon === '📷') return 'camera';
    if (categoryIcon === '✨') return 'other';
  }
  return 'other';
};

export const CategorySvgIcon: React.FC<{
  categoryId?: string;
  categoryIcon?: string;
  name?: string;
  size?: number;
  color?: string;
  isSelected?: boolean;
}> = ({ categoryId, categoryIcon, name, size = 28, color, isSelected = false }) => {
  const key = resolveCategoryKey(categoryId || name, categoryIcon);
  switch (key) {
    case 'food': {
      const strokeColor = color || '#E11D48';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 11h16a1 1 0 0 1 1 1c0 5-4 8-9 8s-9-3-9-8a1 1 0 0 1 1-1z"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(225, 29, 72, 0.28)' : 'rgba(225, 29, 72, 0.12)'}
          />
          <Path
            d="M7 8c1-1 1-2 1-3M12 8c1-1 1-2 1-3M17 8c1-1 1-2 1-3"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
          />
          <Line x1="3" y1="11" x2="21" y2="11" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} />
        </Svg>
      );
    }
    case 'coffee': {
      const strokeColor = color || '#8B5CF6';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M17 8h1a4 4 0 1 1 0 8h-1"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(139, 92, 246, 0.28)' : 'rgba(139, 92, 246, 0.12)'}
          />
          <Line x1="6" y1="2" x2="6" y2="4" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="10" y1="2" x2="10" y2="4" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="14" y1="2" x2="14" y2="4" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
        </Svg>
      );
    }
    case 'market': {
      const strokeColor = color || '#0EA5E9';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="8" cy="21" r="1.5" stroke={strokeColor} strokeWidth={1.5} fill={strokeColor} />
          <Circle cx="19" cy="21" r="1.5" stroke={strokeColor} strokeWidth={1.5} fill={strokeColor} />
          <Path
            d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(14, 165, 233, 0.28)' : 'rgba(14, 165, 233, 0.12)'}
          />
        </Svg>
      );
    }
    case 'shopping': {
      const strokeColor = color || '#EC4899';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(236, 72, 153, 0.28)' : 'rgba(236, 72, 153, 0.12)'}
          />
          <Line x1="3" y1="6" x2="21" y2="6" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} />
          <Path
            d="M16 10a4 4 0 0 1-8 0"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    case 'transport': {
      const strokeColor = color || '#F97316';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="6" cy="18" r="3" stroke={strokeColor} strokeWidth={2} fill={isSelected ? 'rgba(249, 115, 22, 0.28)' : 'rgba(249, 115, 22, 0.12)'} />
          <Circle cx="18" cy="18" r="3" stroke={strokeColor} strokeWidth={2} fill={isSelected ? 'rgba(249, 115, 22, 0.28)' : 'rgba(249, 115, 22, 0.12)'} />
          <Path
            d="M6 18h12M15 6h3l-3 6h-6l-2-4h-3M9 12l2 6"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    }
    case 'bills': {
      const strokeColor = color || '#6366F1';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.12)'}
          />
          <Line x1="8" y1="7" x2="16" y2="7" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="8" y1="12" x2="16" y2="12" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="8" y1="17" x2="12" y2="17" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
        </Svg>
      );
    }
    case 'housing': {
      const strokeColor = color || '#0D9488';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(13, 148, 136, 0.28)' : 'rgba(13, 148, 136, 0.12)'}
          />
          <Polyline points="9 22 9 12 15 12 15 22" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    }
    case 'entertainment': {
      const strokeColor = color || '#D97706';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="2"
            y="4"
            width="20"
            height="16"
            rx="2"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(217, 119, 6, 0.28)' : 'rgba(217, 119, 6, 0.12)'}
          />
          <Line x1="2" y1="9" x2="22" y2="9" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} />
          <Line x1="8" y1="4" x2="6" y2="9" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="14" y1="4" x2="12" y2="9" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
          <Line x1="20" y1="4" x2="18" y2="9" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} strokeLinecap="round" />
        </Svg>
      );
    }
    case 'health': {
      const strokeColor = color || '#10B981';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.12)'}
          />
          <Line x1="12" y1="8" x2="12" y2="16" stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" />
          <Line x1="8" y1="12" x2="16" y2="12" stroke={strokeColor} strokeWidth={2.4} strokeLinecap="round" />
        </Svg>
      );
    }
    case 'beauty': {
      const strokeColor = color || '#A855F7';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="8" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} fill={isSelected ? 'rgba(168, 85, 247, 0.28)' : 'rgba(168, 85, 247, 0.12)'} />
          <Path d="M12 4v4M12 16v4M4 12h4M16 12h4" stroke={strokeColor} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    }
    case 'education': {
      const strokeColor = color || '#3B82F6';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(59, 130, 246, 0.28)' : 'rgba(59, 130, 246, 0.12)'}
          />
          <Line x1="9" y1="7" x2="15" y2="7" stroke={strokeColor} strokeWidth={1.8} strokeLinecap="round" />
          <Line x1="9" y1="11" x2="15" y2="11" stroke={strokeColor} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      );
    }
    case 'camera': {
      const strokeColor = color || '#059669';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(5, 150, 105, 0.28)' : 'rgba(5, 150, 105, 0.12)'}
          />
          <Circle cx="12" cy="13" r="4" stroke={strokeColor} strokeWidth={isSelected ? 2.4 : 2} />
        </Svg>
      );
    }
    case 'other':
    default: {
      const strokeColor = color || '#64748B';
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3c0 4.5 3.5 8 8 8-4.5 0-8 3.5-8 8 0-4.5-3.5-8-8-8 4.5 0 8-3.5 8-8z"
            stroke={strokeColor}
            strokeWidth={isSelected ? 2.4 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={isSelected ? 'rgba(100, 116, 139, 0.28)' : 'rgba(100, 116, 139, 0.12)'}
          />
          <Path d="M5 3v4M3 5h4M19 17v4M17 19h4" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      );
    }
  }
};

export const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Ăn uống', icon: '🍜' },
  { id: 'coffee', name: 'Cà phê & Nước', icon: '☕' },
  { id: 'market', name: 'Đi chợ & Siêu thị', icon: '🛒' },
  { id: 'shopping', name: 'Mua sắm', icon: '🛍️' },
  { id: 'transport', name: 'Di chuyển & Xăng', icon: '🛵' },
  { id: 'bills', name: 'Hóa đơn', icon: '🧾' },
  { id: 'housing', name: 'Nhà cửa & Phòng', icon: '🏠' },
  { id: 'entertainment', name: 'Giải trí', icon: '🎬' },
  { id: 'health', name: 'Y tế & Sức khỏe', icon: '💊' },
  { id: 'beauty', name: 'Làm đẹp & Bản thân', icon: '💅' },
  { id: 'education', name: 'Học tập & Sách', icon: '📚' },
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
// SUB-COMPONENT: WebEmeraldBalanceCard
// Đồng bộ 100% với mobile: 1 thanh xanh ngọc bích sang trọng (#064E3B) kèm mascot ếch 3D ôm lịch
// ============================================================
const WebEmeraldBalanceCard: React.FC<{
  availableBalance: number;
  totalMonthIncome: number;
  totalMonthSpent?: number;
  recordedDays?: number;
  dailyAvg?: number;
  budgetLimit?: number;
  budgetStatus: 'safe' | 'warning' | 'danger';
  safeDailySpend: number;
  language: 'vi' | 'en';
  onOpenIncome: () => void;
}> = ({
  availableBalance,
  totalMonthIncome,
  totalMonthSpent = 0,
  recordedDays = 0,
  dailyAvg = 0,
  budgetLimit = 0,
  budgetStatus,
  safeDailySpend,
  language,
  onOpenIncome,
}) => {
  const isVi = language === 'vi';
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  // Tính % ngân sách hoặc thu nhập đã sử dụng
  const effectiveBase = totalMonthIncome > 0 ? totalMonthIncome : budgetLimit;
  const spentPercent = effectiveBase > 0 ? Math.min(100, Math.round((totalMonthSpent / effectiveBase) * 100)) : 0;

  return (
    <View style={emeraldStyles.budgetCard}>
      {/* ZONE 1 (BÊN TRÁI): SỐ DƯ KHẢ DỤNG & CÔNG CỤ ĐIỀU KHIỂN */}
      <View style={emeraldStyles.zoneBalance}>
        {/* Hàng nhãn + Icon ví + Mắt ẩn hiện + Bút chỉnh sửa + Trạng thái */}
        <View style={emeraldStyles.cardHeaderRow}>
          <View style={emeraldStyles.walletIconBadge}>
            <Ionicons name="wallet" size={14} color="#34D399" />
          </View>
          <Text style={emeraldStyles.cardSubLabel}>
            {isVi ? 'Khả dụng' : 'Available'}
          </Text>

          {/* Nút ẩn/hiện số dư */}
          <TouchableOpacity
            style={emeraldStyles.cardEyeBtn}
            onPress={() => setIsBalanceHidden(!isBalanceHidden)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isBalanceHidden ? 'eye-off-outline' : 'eye-outline'}
              size={13}
              color="#A7F3D0"
            />
          </TouchableOpacity>

          {/* Bấm icon cây bút nhảy ra trang tổng thu nhập */}
          <TouchableOpacity
            style={emeraldStyles.cardEditBtn}
            onPress={onOpenIncome}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil" size={12} color="#A7F3D0" />
          </TouchableOpacity>

          {/* Badge trạng thái thu chi */}
          <View
            style={[
              emeraldStyles.cardStatusBadge,
              totalMonthIncome === 0
                ? { backgroundColor: 'rgba(255, 255, 255, 0.16)', borderColor: 'rgba(255, 255, 255, 0.28)' }
                : budgetStatus === 'danger'
                ? { backgroundColor: 'rgba(239, 68, 68, 0.25)', borderColor: '#EF4444' }
                : budgetStatus === 'warning'
                ? { backgroundColor: 'rgba(245, 158, 11, 0.25)', borderColor: '#F59E0B' }
                : { backgroundColor: 'rgba(16, 185, 129, 0.25)', borderColor: '#10B981' },
            ]}
          >
            <Text
              style={[
                emeraldStyles.cardStatusBadgeText,
                totalMonthIncome === 0
                  ? { color: '#E2E8F0' }
                  : budgetStatus === 'danger'
                  ? { color: '#FCA5A5' }
                  : budgetStatus === 'warning'
                  ? { color: '#FCD34D' }
                  : { color: '#6EE7B7' },
              ]}
            >
              {totalMonthIncome === 0
                ? (isVi ? 'Chưa có thu' : 'No Income')
                : budgetStatus === 'danger'
                ? (isVi ? 'Vượt hạn mức' : 'Exceeded')
                : budgetStatus === 'warning'
                ? (isVi ? 'Gần giới hạn' : 'Warning')
                : (isVi ? 'An toàn' : 'Safe')}
            </Text>
          </View>
        </View>

        {/* Số dư khả dụng cỡ lớn */}
        <TouchableOpacity activeOpacity={0.85} onPress={onOpenIncome}>
          <Text style={emeraldStyles.cardMainBalance}>
            {isBalanceHidden
              ? '•••••••• đ'
              : availableBalance >= 0
              ? `${availableBalance.toLocaleString('vi-VN')} đ`
              : `-${Math.abs(availableBalance).toLocaleString('vi-VN')} đ`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* VÁCH NGĂN TINH TẾ GIỮA ZONE 1 VÀ ZONE 2 */}
      <View style={emeraldStyles.zoneDivider} />

      {/* ZONE 2 (CHÍNH GIỮA): NHỊP ĐIỆU TÀI CHÍNH THÁNG NÀY (XÓA BỎ HOÀN TOÀN KHOẢNG TRỐNG) */}
      <View style={emeraldStyles.zoneVitals}>
        {/* 2 Thẻ Mini Thống Kê Glassmorphic: Thu nhập & Chi tiêu */}
        <View style={emeraldStyles.vitalsRow}>
          {/* Mini Card: Thu tháng */}
          <TouchableOpacity
            style={emeraldStyles.vitalCard}
            activeOpacity={0.82}
            onPress={onOpenIncome}
          >
            <View style={emeraldStyles.vitalIconThu}>
              <Ionicons name="arrow-up" size={13} color="#10B981" />
            </View>
            <View style={emeraldStyles.vitalTextCol}>
              <Text style={emeraldStyles.vitalLabel}>{isVi ? 'Tổng thu tháng' : 'Month Income'}</Text>
              <Text style={emeraldStyles.vitalThuValue}>
                {isBalanceHidden ? '••••••' : `+${totalMonthIncome.toLocaleString('vi-VN')} đ`}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Mini Card: Chi tháng */}
          <TouchableOpacity
            style={emeraldStyles.vitalCard}
            activeOpacity={0.82}
            onPress={onOpenIncome}
          >
            <View style={emeraldStyles.vitalIconChi}>
              <Ionicons name="arrow-down" size={13} color="#F87171" />
            </View>
            <View style={emeraldStyles.vitalTextCol}>
              <Text style={emeraldStyles.vitalLabel}>{isVi ? 'Tổng đã chi' : 'Total Spent'}</Text>
              <Text style={emeraldStyles.vitalChiValue}>
                {isBalanceHidden ? '••••••' : `-${totalMonthSpent.toLocaleString('vi-VN')} đ`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Hàng 2: Đã ghi nhận (Màu be) & Trung bình / ngày (Màu vàng) */}
        <View style={emeraldStyles.vitalsRow}>
          {/* Mini Card: Đã ghi nhận (Icon & Số màu be chuẩn theo yêu cầu) */}
          <View style={emeraldStyles.vitalCard}>
            <View style={emeraldStyles.vitalIconRecorded}>
              <Ionicons name="camera-outline" size={13} color="#F5E6CA" />
            </View>
            <View style={emeraldStyles.vitalTextCol}>
              <Text style={emeraldStyles.vitalLabel}>{isVi ? 'Đã ghi nhận' : 'Recorded'}</Text>
              <Text style={emeraldStyles.vitalRecordedValue}>
                {recordedDays} <Text style={emeraldStyles.vitalUnit}>{isVi ? 'ngày' : 'days'}</Text>
              </Text>
            </View>
          </View>

          {/* Mini Card: Trung bình / ngày */}
          <View style={emeraldStyles.vitalCard}>
            <View style={emeraldStyles.vitalIconAvg}>
              <Ionicons name="flash-outline" size={13} color="#FBBF24" />
            </View>
            <View style={emeraldStyles.vitalTextCol}>
              <Text style={emeraldStyles.vitalLabel}>{isVi ? 'Trung bình / ngày' : 'Daily Avg'}</Text>
              <Text style={emeraldStyles.vitalAvgValue}>
                {dailyAvg.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ZONE 3 (BÊN PHẢI): MASCOT ẾCH 3D VỚI ÁNH HÀO QUANG */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onOpenIncome}
        style={emeraldStyles.zoneMascot}
      >
        <View style={emeraldStyles.mascotAura} />
        <Image
          source={require('../../../assets/frogs/frog-calendar-mascot.png')}
          style={emeraldStyles.cardMascotImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

const emeraldStyles = StyleSheet.create({
  budgetCard: {
    backgroundColor: '#064E3B',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 20,
    minHeight: 140,
    marginBottom: 20,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 211, 153, 0.28)',
    overflow: 'visible',
    position: 'relative',
    gap: 16,
    flexWrap: 'wrap',
  },
  zoneBalance: {
    flex: 1.1,
    minWidth: 260,
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  walletIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSubLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardEyeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEditBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  cardStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardStatusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardMainBalance: {
    fontSize: 33,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
    letterSpacing: -0.6,
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cardStatusSubText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '500',
    flex: 1,
  },
  zoneDivider: {
    width: 1,
    height: 74,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 2,
  },
  zoneVitals: {
    flex: 1.9,
    minWidth: 320,
    justifyContent: 'center',
    gap: 10,
  },
  vitalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vitalCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  vitalIconThu: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  vitalIconChi: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  vitalTextCol: {
    flex: 1,
  },
  vitalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.72)',
    marginBottom: 2,
  },
  vitalThuValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6EE7B7',
  },
  vitalChiValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  vitalIconRecorded: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 230, 202, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 230, 202, 0.45)',
  },
  vitalRecordedValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F5E6CA',
  },
  vitalIconAvg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 191, 36, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  vitalUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  vitalAvgValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FDE68A',
  },
  zoneMascot: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    marginBottom: -10,
    position: 'relative',
    marginLeft: 4,
  },
  mascotAura: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
  },
  cardMascotImage: {
    width: 122,
    height: 122,
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
  const { isDark } = useTheme();
  const { user } = useAuth();
  const userEmail = (user as any)?.email || '';

  const recurringItems = React.useMemo(() => {
    return loadRecurringItems(userId, userEmail).filter(it => it.type === 'expense' && it.isActive).slice(0, 3);
  }, [userId, userEmail]);

  const totalMonthlyEstimated = React.useMemo(() => {
    return recurringItems.reduce((acc, it) => {
      if (it.frequency === 'daily') return acc + it.amount * 30;
      if (it.frequency === 'weekly') return acc + it.amount * 4;
      if (it.frequency === 'yearly') return acc + Math.round(it.amount / 12);
      return acc + it.amount;
    }, 0);
  }, [recurringItems]);

  const [events, setEvents] = useState<MonettEvent[]>(() => {
    return loadEventsFromStorage(userEmail, userId).slice(0, 3);
  });

  const fetchEvents = useCallback(async () => {
    try {
      const apiEvents = await getEventsApi();
      if (Array.isArray(apiEvents) && apiEvents.length > 0) {
        setEvents(apiEvents.slice(0, 3));
        saveEventsToStorage(apiEvents, userEmail, userId);
      } else {
        const local = loadEventsFromStorage(userEmail, userId);
        setEvents(local.slice(0, 3));
      }
    } catch {
      const local = loadEventsFromStorage(userEmail, userId);
      setEvents(local.slice(0, 3));
    }
  }, [userEmail, userId]);

  useEffect(() => {
    fetchEvents();

    const handleUpdate = () => {
      fetchEvents();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('monett:events_updated', handleUpdate);
      window.addEventListener('focus', handleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monett:events_updated', handleUpdate);
        window.removeEventListener('focus', handleUpdate);
      }
    };
  }, [fetchEvents]);

  const formatItemAmount = (amount: number) => {
    if (amount >= 1000 && amount % 1000 === 0 && amount < 1000000) {
      return `${amount / 1000}k`;
    }
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  const getDaysRemainingLabel = (dayOfPayment?: number | string) => {
    const today = new Date();
    const currentDay = today.getDate();
    const curMonth = today.getMonth();
    const curYear = today.getFullYear();

    let targetDay = typeof dayOfPayment === 'string' ? parseInt(dayOfPayment, 10) : dayOfPayment;
    if (!targetDay || isNaN(targetDay)) {
      targetDay = new Date(curYear, curMonth + 1, 0).getDate();
    }

    const daysLeft = targetDay - currentDay;
    if (daysLeft === 0) {
      return isVi ? 'Hôm nay' : 'Today';
    } else if (daysLeft > 0) {
      return isVi ? `Còn ${daysLeft} ngày` : `${daysLeft} days left`;
    } else {
      const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
      const totalDays = (daysInMonth - currentDay) + targetDay;
      return isVi ? `Còn ${totalDays} ngày` : `${totalDays} days left`;
    }
  };

  const getAvatarConfig = (title: string, index: number) => {
    const clean = title.trim();
    const initial = clean ? clean.charAt(0).toUpperCase() : 'R';
    const palettes = [
      { bg: '#DCFCE7', text: '#166534' }, // Mint
      { bg: '#EDE9FE', text: '#6B21A8' }, // Purple
      { bg: '#E0F2FE', text: '#0284C7' }, // Sky
      { bg: '#FEF3C7', text: '#B45309' }, // Amber
      { bg: '#FCE7F3', text: '#BE185D' }, // Rose
    ];
    return { initial, ...palettes[index % palettes.length] };
  };

  const statusLabel = (s: string) => {
    if (s === 'ongoing') return isVi ? 'Đang diễn ra' : 'Ongoing';
    if (s === 'upcoming') return isVi ? 'Sắp diễn ra' : 'Upcoming';
    return isVi ? 'Đã xong' : 'Completed';
  };

  return (
    <View style={[reStyles.row, isWide && reStyles.rowWide]}>
      {/* Panel trái: Chi định kỳ (khớp phong cách mobile & hình 1) */}
      <View style={[reStyles.panel, isWide && { flex: 1 }]}>
        <View
          style={[
            reStyles.recurringCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E5E7EB',
            },
          ]}
        >
          {/* Header Bar Màu Tím Pastel */}
          <View
            style={[
              reStyles.cardTopHeaderPurple,
              { backgroundColor: isDark ? '#2E1065' : '#F3E8FF' },
            ]}
          >
            <View style={reStyles.cardTopHeaderRow1}>
              <View style={reStyles.cardTopHeaderLeft}>
                <View
                  style={[
                    reStyles.headerIconSquare,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#FFFFFF' },
                  ]}
                >
                  <Ionicons name="swap-horizontal" size={19} color={isDark ? '#F3E8FF' : '#581C87'} />
                </View>
                <Text
                  style={[
                    reStyles.headerCardTitlePurple,
                    { color: isDark ? '#F3E8FF' : '#581C87' },
                  ]}
                >
                  {isVi ? 'Chi định kỳ' : 'Recurring'}
                </Text>
                {recurringItems.length > 0 && (
                  <View
                    style={[
                      reStyles.countBadgePurple,
                      { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#FFFFFF' },
                    ]}
                  >
                    <Text
                      style={[
                        reStyles.countBadgeTextPurple,
                        { color: isDark ? '#E9D5FF' : '#581C87' },
                      ]}
                    >
                      {recurringItems.length}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  reStyles.headerViewAllPill,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.18)' : '#FFFFFF' },
                ]}
                onPress={() => onNavigateToTab?.('recurring')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    reStyles.headerViewAllTextPurple,
                    { color: isDark ? '#E9D5FF' : '#581C87' },
                  ]}
                >
                  {isVi ? 'Xem tất cả →' : 'View all →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Thanh ngăn cách */}
          <View
            style={[
              reStyles.cardDivider,
              { backgroundColor: isDark ? '#475569' : 'rgba(147, 51, 234, 0.12)' },
            ]}
          />

          {/* Phần ở dưới màu trắng hiển thị các khoản định kỳ */}
          <View
            style={[
              reStyles.cardBottomWhite,
              { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
            ]}
          >
            {recurringItems.length === 0 ? (
              <View style={reStyles.emptyState}>
                <Ionicons name="repeat-outline" size={32} color="#A78BFA" />
                <Text style={reStyles.emptyText}>
                  {isVi ? 'Chưa có khoản định kỳ nào' : 'No recurring items yet'}
                </Text>
              </View>
            ) : (
              recurringItems.map((item, idx) => {
                const avatar = getAvatarConfig(item.title, idx);
                const isLast = idx === recurringItems.length - 1;
                return (
                  <View
                    key={item.id}
                    style={[
                      reStyles.recurringItemRow,
                      !isLast && [
                        reStyles.recurringItemBorderBottom,
                        { borderBottomColor: isDark ? '#334155' : '#F3F4F6' },
                      ],
                    ]}
                  >
                    {/* Avatar tròn màu tím pastel khớp hoàn toàn phong cách Chi định kỳ */}
                    <View style={[reStyles.recurringAvatar, { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.25)' : '#F3E8FF' }]}>
                      <Text style={[reStyles.recurringAvatarText, { color: isDark ? '#D8B4FE' : '#7C3AED' }]}>
                        {avatar.initial}
                      </Text>
                    </View>

                    {/* Tên khoản chi & chu kỳ */}
                    <View style={reStyles.recurringItemInfo}>
                      <Text
                        style={[
                          reStyles.recurringItemTitle,
                          { color: isDark ? '#F8FAFC' : '#111827' },
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[
                          reStyles.recurringItemSub,
                          { color: isDark ? '#94A3B8' : '#64748B' },
                        ]}
                      >
                        {getFrequencyLabel(item.frequency, isVi).toLowerCase()}
                      </Text>
                    </View>

                    {/* Số tiền & Huy hiệu Còn X ngày (Màu tím pastel đồng bộ) */}
                    <View style={reStyles.recurringItemRight}>
                      <Text
                        style={[
                          reStyles.recurringItemAmount,
                          { color: isDark ? '#F8FAFC' : '#111827' },
                        ]}
                      >
                        {formatItemAmount(item.amount)}
                      </Text>
                      <View
                        style={[
                          reStyles.dueBadge,
                          { backgroundColor: isDark ? 'rgba(147, 51, 234, 0.2)' : '#F3E8FF' },
                        ]}
                      >
                        <Text
                          style={[
                            reStyles.dueBadgeText,
                            { color: isDark ? '#D8B4FE' : '#6B21A8' },
                          ]}
                        >
                          {getDaysRemainingLabel(item.dayOfPayment)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </View>

      {/* Panel phải: Sự kiện (khớp phong cách mobile & hình 1) */}
      <View style={[reStyles.panel, isWide && { flex: 1 }]}>
        <View
          style={[
            reStyles.recurringCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E5E7EB',
            },
          ]}
        >
          {/* Header Bar Màu Xanh Mint Pastel Khớp Mobile */}
          <View
            style={[
              reStyles.cardTopHeaderMint,
              { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' },
            ]}
          >
            <View style={reStyles.cardTopHeaderRow1}>
              <View style={reStyles.cardTopHeaderLeft}>
                <View
                  style={[
                    reStyles.headerIconSquare,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#FFFFFF' },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={17} color={isDark ? '#A7F3D0' : '#065F46'} />
                </View>
                <Text
                  style={[
                    reStyles.headerCardTitleMint,
                    { color: isDark ? '#A7F3D0' : '#065F46' },
                  ]}
                >
                  {isVi ? 'Sự kiện' : 'Events'}
                </Text>
                {events.length > 0 && (
                  <View
                    style={[
                      reStyles.countBadgeMint,
                      { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#FFFFFF' },
                    ]}
                  >
                    <Text
                      style={[
                        reStyles.countBadgeTextMint,
                        { color: isDark ? '#A7F3D0' : '#065F46' },
                      ]}
                    >
                      {events.length}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  reStyles.headerViewAllPillMint,
                  { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.18)' : '#FFFFFF' },
                ]}
                onPress={() => onNavigateToTab?.('events')}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    reStyles.headerViewAllTextMint,
                    { color: isDark ? '#A7F3D0' : '#065F46' },
                  ]}
                >
                  {isVi ? 'Xem tất cả →' : 'View all →'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Thanh ngăn cách */}
          <View
            style={[
              reStyles.cardDividerMint,
              { backgroundColor: isDark ? '#334155' : 'rgba(5, 150, 105, 0.12)' },
            ]}
          />

          {/* Thân thẻ màu trắng chứa danh sách sự kiện */}
          <View
            style={[
              reStyles.cardBottomWhite,
              { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
            ]}
          >
            {events.length === 0 ? (
              <View style={reStyles.emptyState}>
                <Ionicons name="calendar-outline" size={32} color="#A7F3D0" />
                <Text style={reStyles.emptyText}>{isVi ? 'Chưa có sự kiện nào' : 'No events yet'}</Text>
              </View>
            ) : (
              events.map((ev, idx) => {
                const spent = ev.spentAmount || 0;
                const budget = ev.estimatedBudget || 0;
                const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
                const isOngoing = ev.status === 'ongoing';
                const isUpcoming = ev.status === 'upcoming';
                const isLast = idx === events.length - 1;

                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[
                      reStyles.eventItemInsideCard,
                      !isLast && [
                        reStyles.eventItemBorderBottom,
                        { borderBottomColor: isDark ? '#334155' : '#F3F4F6' },
                      ],
                    ]}
                    onPress={() => onNavigateToTab?.('events')}
                    activeOpacity={0.75}
                  >
                    {/* Top Row: Icon + Title/Date/Location + Status Badge */}
                    <View style={reStyles.eventCardTop}>
                      <View style={reStyles.eventCardIconWrap}>
                        <Ionicons name="calendar-outline" size={20} color="#059669" />
                      </View>
                      <View style={reStyles.eventCardInfo}>
                        <Text style={[reStyles.eventCardTitle, { color: isDark ? '#F8FAFC' : '#111827' }]} numberOfLines={1}>{ev.title}</Text>
                        <View style={reStyles.eventMetaRow}>
                          <Text style={[reStyles.eventMetaText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            {ev.startDate}{ev.endDate && ev.endDate !== ev.startDate ? ` - ${ev.endDate}` : ''}
                          </Text>
                          {ev.location ? (
                            <>
                              <Text style={reStyles.eventMetaDot}> · </Text>
                              <Ionicons name="location-outline" size={12} color="#64748B" style={{ marginRight: 2 }} />
                              <Text style={[reStyles.eventMetaText, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>{ev.location}</Text>
                            </>
                          ) : null}
                        </View>
                      </View>
                      <View style={[
                        reStyles.eventStatusBadge,
                        isOngoing ? reStyles.statusBadgeOngoing : isUpcoming ? reStyles.statusBadgeUpcoming : reStyles.statusBadgeCompleted
                      ]}>
                        <Text style={[
                          reStyles.eventStatusText,
                          isOngoing ? reStyles.statusTextOngoing : isUpcoming ? reStyles.statusTextUpcoming : reStyles.statusTextCompleted
                        ]}>
                          {statusLabel(ev.status)}
                        </Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={reStyles.progressBarTrack}>
                      <View style={[reStyles.progressBarFill, { width: `${percent}%` }]} />
                    </View>

                    {/* Bottom Row: Spent / Budget */}
                    <View style={reStyles.eventCardBottom}>
                      <Text style={[reStyles.eventSpentText, { color: isDark ? '#F8FAFC' : '#111827' }]}>{spent.toLocaleString('vi-VN')} đ</Text>
                      <Text style={[reStyles.eventBudgetText, { color: isDark ? '#94A3B8' : '#64748B' }]}>/ {budget.toLocaleString('vi-VN')} đ</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const reStyles = StyleSheet.create({
  row: {
    flexDirection: 'column',
    gap: 16,
    marginHorizontal: 0,
    marginBottom: 24,
  },
  rowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 20,
  },
  panel: {
    backgroundColor: 'transparent',
    padding: 0,
    minHeight: 220,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  viewAllBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllTextGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  // THẺ CHI ĐỊNH KỲ & SỰ KIỆN PHONG CÁCH MOBILE & HÌNH 1
  recurringCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    width: '100%',
    minHeight: 220,
    flex: 1,
  },
  cardTopHeaderPurple: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardTopHeaderMint: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardTopHeaderRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconSquare: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  headerCardTitlePurple: {
    fontSize: 16,
    fontWeight: '800',
    color: '#581C87',
    letterSpacing: -0.2,
  },
  headerCardTitleMint: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: -0.2,
  },
  countBadgePurple: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeTextPurple: {
    fontSize: 12,
    fontWeight: '800',
    color: '#581C87',
  },
  countBadgeMint: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeTextMint: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  headerViewAllPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#581C87',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerViewAllTextPurple: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#581C87',
  },
  headerViewAllPillMint: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  headerViewAllTextMint: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#065F46',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
  },
  cardDividerMint: {
    height: 1,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
  },
  cardBottomWhite: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flex: 1,
  },
  eventItemInsideCard: {
    width: '100%',
  },
  eventItemBorderBottom: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recurringItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  recurringItemBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recurringAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recurringAvatarText: {
    fontSize: 19,
    fontWeight: '800',
  },
  recurringItemInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  recurringItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  recurringItemSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },
  recurringItemRight: {
    alignItems: 'flex-end',
  },
  recurringItemAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  dueBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  dueBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B21A8',
  },
  eventsList: {
    gap: 0,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8E0D5',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCardInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  eventCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventMetaText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },
  eventMetaDot: {
    fontSize: 12.5,
    color: '#94A3B8',
  },
  eventStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeOngoing: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeUpcoming: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeCompleted: {
    backgroundColor: '#F1F5F9',
  },
  eventStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusTextOngoing: {
    color: '#166534',
  },
  statusTextUpcoming: {
    color: '#B45309',
  },
  statusTextCompleted: {
    color: '#64748B',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#EBE5DC',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  eventCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  eventSpentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  eventBudgetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
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

  const currentUserId = user?.id || (user as any)?._id;

  // Records map: key is `${year}-${month+1}-${day}` -> DayExpenseRecord (cô lập theo từng User)
  const [dayRecords, setDayRecords] = useState<Record<string, DayExpenseRecord>>(() => {
    const records: Record<string, DayExpenseRecord> = {};
    try {
      const raw = getInitialDayRecordsFromLocalStorage(currentUserId);
      Object.entries(raw).forEach(([key, val]: [string, any]) => {
        if (val) {
          // Nếu ô lịch rỗng không có chi tiêu và amount = 0 -> không giữ ảnh đại diện rác
          if (Array.isArray(val.items) && val.items.length === 0 && (!val.amount || val.amount === 0)) {
            return;
          }
          if (!val.items || !Array.isArray(val.items)) {
            if (val.amount > 0 || val.photoUri) {
              val.items = [
                {
                  id: `legacy-${key}`,
                  time: getCurrentFormattedTime(),
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
            val.photoUri = getLatestPhotoFromItems(val.items) || val.photoUri;
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
    idbLoadRecords<Record<string, DayExpenseRecord>>(currentUserId).then((stored) => {
      if (isMounted && stored && Object.keys(stored).length > 0) {
        setDayRecords(stored);
      }
    }).catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  // Đồng bộ hai chiều với Backend (giao dịch & hình ảnh từ Mobile và các thiết bị khác)
  const syncWithBackend = useCallback(async () => {
    try {
      getBudgetApi()
        .then((bData) => {
          if (bData && bData.limit) {
            setBudget(bData);
            saveCachedBudget(bData, currentUserId);
          }
        })
        .catch(() => {});

      const res: any = await getTransactionsApi({ limit: 500 });
      const txList = Array.isArray(res) ? res : (res?.data || res?.items || []);
      if (Array.isArray(txList)) {
        // Tự động đồng bộ các khoản thu nhập từ MongoDB vào incomeStorage
        syncIncomesFromBackendTransactions(txList, currentUserId);
        // Xây dựng tập dữ liệu chính xác 100% của riêng user này từ MongoDB
        const built = buildDayRecordsFromTransactions(txList);
        setDayRecords(built);
        saveDayRecordsToStorage(built, currentUserId);
      }
    } catch (e) {
      console.warn('[HomeScreen Web] Sync transactions error:', e);
    }
  }, [currentUserId]);

  // Khi tài khoản đăng nhập thay đổi hoặc chuyển đổi user -> reload sạch sẽ dữ liệu của user mới
  useEffect(() => {
    const userRecords = getInitialDayRecordsFromLocalStorage(currentUserId);
    setDayRecords(userRecords);
    syncWithBackend();
  }, [currentUserId, syncWithBackend]);

  useEffect(() => {
    syncWithBackend();

    // Lắng nghe cập nhật khi có giao dịch hoặc ảnh mới từ Mobile (trong cùng trình duyệt hoặc tab khác)
    const unsubscribe = subscribeCalendarUpdates((updated) => {
      setDayRecords(updated);
      getBudgetApi()
        .then((bData) => {
          if (bData && bData.limit) {
            setBudget(bData);
            saveCachedBudget(bData);
          }
        })
        .catch(() => {});
    });

    // Tự động đồng bộ khi người dùng quay lại tab Web
    const handleFocus = () => {
      syncWithBackend();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    // Định kỳ 10 giây tự động đồng bộ ngầm
    const interval = setInterval(syncWithBackend, 10000);

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
      clearInterval(interval);
    };
  }, [syncWithBackend]);

  // Calculate monthly stats from dayRecords
  const monthlyStats = useMemo(() => {
    let totalSpending = 0;
    let countDays = 0;

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const key = `${currentYear}-${currentMonth + 1}-${d}`;
      const paddedKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = dayRecords[key] || dayRecords[paddedKey];
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
      const paddedKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = dayRecords[key] || dayRecords[paddedKey];
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
  const [showAiScanModal, setShowAiScanModal] = useState<boolean>(false);

  // Day Timeline Modal State (Xem tất cả chi tiêu của ngày)
  const [timelineModalVisible, setTimelineModalVisible] = useState<boolean>(false);
  const [timelineDayNum, setTimelineDayNum] = useState<number>(todayDate > 0 ? todayDate : 1);
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<ExpenseItem | null>(null);

  // Full-image lightbox preview
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  // Modal xác nhận xóa chi tiêu và gỡ ảnh bìa ô lịch
  const [deletingExpense, setDeletingExpense] = useState<{
    dayNum: number;
    item: ExpenseItem;
  } | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState<boolean>(false);

  const [deletingCoverDay, setDeletingCoverDay] = useState<number | null>(null);
  const [isDeletingCover, setIsDeletingCover] = useState<boolean>(false);

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
    const photoKey = `${currentYear}-${currentMonth + 1}-${dayNum}`;
    const items = dayRecords[photoKey]?.items || [];
    const firstWithPhoto = items.find((it) => it.photoUri);
    setSelectedTimelineItem(firstWithPhoto || items[0] || null);
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
    const paddedKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(quickDayNum).padStart(2, '0')}`;
    const now = new Date();
    const timeToUse = quickTimeStr.trim() || getCurrentFormattedTime();
    const tempId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const newItem: ExpenseItem = {
      id: tempId,
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
          time: getCurrentFormattedTime(),
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

      // Ảnh hiển thị trên ô lịch: ưu tiên ảnh mới vừa tải lên, hoặc tự động lấy ảnh upload mới nhất
      const latestPhoto = quickPhotoUri || getLatestPhotoFromItems(updatedItems);

      const updatedRecord: DayExpenseRecord = {
        photoUri: latestPhoto,
        amount: totalAmount,
        category: quickCategory,
        categoryIcon: quickCategoryIcon,
        note: quickNote.trim() || existing?.note || '',
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(quickDayNum).padStart(2, '0')}`,
        items: updatedItems,
      };

      const next = { ...prev, [photoKey]: updatedRecord, [paddedKey]: updatedRecord };
      saveDayRecordsToStorage(next, currentUserId);
      return next;
    });

    // 1. CẬP NHẬT NGAY LẬP TỨC SỐ DƯ KHẢ DỤNG VÀ CHI TIÊU (0ms Optimistic UI)
    const updatedBudget = applyBudgetDelta(numericAmount, budget);
    setBudget(updatedBudget);

    // Đồng bộ tức thời lên Backend để Mobile ngay lập tức nhận được chi tiêu & ảnh
    let targetHour = now.getHours();
    let targetMin = now.getMinutes();
    if (timeToUse && timeToUse.includes(':')) {
      const [h, m] = timeToUse.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        targetHour = h;
        targetMin = m;
      }
    }
    const targetIsoDate = new Date(currentYear, currentMonth, quickDayNum, targetHour, targetMin, now.getSeconds()).toISOString();

    const syncTransactionToCloud = async () => {
      let finalPhotoUri = quickPhotoUri || undefined;
      // Nếu có ảnh Base64 nén từ máy, upload lên Cloudinary / Storage để lấy link ảnh CDN tối ưu WebP
      if (quickPhotoUri && quickPhotoUri.startsWith('data:')) {
        try {
          const uploadedUrl = await uploadReceiptApi(quickPhotoUri, 'image/jpeg', `receipt_${Date.now()}.jpg`);
          if (uploadedUrl) {
            finalPhotoUri = uploadedUrl;
          }
        } catch (uploadErr) {
          console.warn('[HomeScreen Web] Upload Cloudinary/Backend thất bại, giữ ảnh nén cục bộ:', uploadErr);
        }
      }

      try {
        const createdTx: any = await createTransactionApi({
          title: quickNote.trim() || quickCategory,
          amount: -Math.abs(numericAmount),
          type: 'expense',
          category: quickCategory,
          categoryIcon: quickCategoryIcon,
          note: quickNote.trim(),
          photoUri: finalPhotoUri,
          date: targetIsoDate,
        });

        if (createdTx && (createdTx._id || createdTx.id)) {
          const realId = String(createdTx._id || createdTx.id);
          setDayRecords((prev) => {
            const rec = prev[photoKey];
            if (!rec || !rec.items) return prev;
            const updatedItems = rec.items.map((it) => (it.id === tempId ? { ...it, id: realId, photoUri: finalPhotoUri || it.photoUri } : it));
            const next = { ...prev, [photoKey]: { ...rec, items: updatedItems, photoUri: finalPhotoUri || rec.photoUri }, [paddedKey]: { ...rec, items: updatedItems, photoUri: finalPhotoUri || rec.photoUri } };
            saveDayRecordsToStorage(next, currentUserId);
            return next;
          });
        }

        const fresh = await getBudgetApi();
        if (fresh && fresh.limit) {
          setBudget(fresh);
          saveCachedBudget(fresh, currentUserId);
          notifyBudgetUpdated(fresh);
        }
      } catch (err) {
        console.warn('[HomeScreen Web] Lưu giao dịch backend ngầm thất bại (tiếp tục dùng local):', err);
      }
    };

    syncTransactionToCloud();

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

  const handleApplyAiReceiptScan = (data: AiReceiptScanResult) => {
    if (data.amount > 0) {
      setQuickAmountStr(String(data.amount));
    }
    if (data.supplier) {
      setQuickNote(data.supplier);
    }
    if (data.category) {
      setQuickCategory(data.category);
    }
    if (data.categoryIcon) {
      setQuickCategoryIcon(data.categoryIcon);
    }
    if (data.photoUri) {
      setQuickPhotoUri(data.photoUri);
    }
    // Giữ nguyên ô ngày (quickDayNum) mà người dùng đã chọn trên lịch, không để ngày cũ trên hóa đơn ghi đè
    if (data.time) {
      setQuickTimeStr(data.time);
    }
  };

  const handleDeleteExpenseItem = async (dayNum: number, itemId: string) => {
    const photoKey = `${currentYear}-${currentMonth + 1}-${dayNum}`;
    const paddedKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    // Tìm khoản tiền chuẩn bị xóa để hoàn lại số dư khả dụng ngay lập tức (0ms Optimistic UI)
    const existingRec = dayRecords[photoKey] || dayRecords[paddedKey];
    const itemToDelete = existingRec?.items?.find((it) => it.id === itemId || (it as any)._id === itemId);
    const deletedAmount = itemToDelete ? (itemToDelete.amount || 0) : 0;
    if (deletedAmount > 0) {
      const updatedBudget = applyBudgetDelta(-deletedAmount, budget);
      setBudget(updatedBudget);
    }

    // Xóa trên backend nếu đây là transaction ID thực sự
    if (itemId && !itemId.startsWith('exp-') && !itemId.startsWith('legacy-')) {
      try {
        await deleteTransactionApi(itemId);
        getBudgetApi()
          .then((fresh) => {
            if (fresh && fresh.limit) {
              setBudget(fresh);
              saveCachedBudget(fresh);
              notifyBudgetUpdated(fresh);
            }
          })
          .catch(() => {});
      } catch (e) {
        console.warn('Lỗi xóa giao dịch backend:', e);
      }
    }

    setDayRecords((prev) => {
      const existing = prev[photoKey] || prev[paddedKey];
      if (!existing || !existing.items) return prev;

      const updatedItems = existing.items.filter((it) => it.id !== itemId && (it as any)._id !== itemId);
      const totalAmount = updatedItems.reduce((sum, it) => sum + (it.amount || 0), 0);

      let next: Record<string, DayExpenseRecord>;
      // Rule 1: Nếu xóa hết các khoản chi tiêu trong ngày -> Xóa luôn ảnh đại diện ô lịch
      if (updatedItems.length === 0) {
        next = { ...prev };
        delete next[photoKey];
        delete next[paddedKey];

        // Dọn dẹp cả trên backend nếu có transaction ảnh bìa/khoảnh khắc (amount 0) trên ngày này
        getTransactionsApi({ limit: 100 }).then((res: any) => {
          const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
          const targetDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          list.forEach((tx: any) => {
            if (tx.date && tx.date.startsWith(targetDateStr)) {
              if (tx._id) {
                deleteTransactionApi(tx._id).catch(() => {});
              }
            }
          });
        }).catch(() => {});
      } else {
        // Rule 2: Nếu vẫn còn các khoản chi tiêu khác -> Tự động lấy ảnh upload mới nhất
        const latestPhoto = getLatestPhotoFromItems(updatedItems);
        const updatedRecord: DayExpenseRecord = {
          ...existing,
          amount: totalAmount,
          photoUri: latestPhoto,
          items: updatedItems,
        };
        next = {
          ...prev,
          [photoKey]: updatedRecord,
          [paddedKey]: updatedRecord,
        };
      }

      saveDayRecordsToStorage(next);
      return next;
    });
  };

  const handleConfirmDeleteExpense = async () => {
    if (!deletingExpense) return;
    setIsDeletingExpense(true);
    try {
      await handleDeleteExpenseItem(deletingExpense.dayNum, deletingExpense.item.id);
    } catch (err) {
      console.error('Error confirming delete expense:', err);
    } finally {
      setIsDeletingExpense(false);
      setDeletingExpense(null);
    }
  };

  const handleConfirmRemoveCoverPhoto = async () => {
    if (deletingCoverDay === null) return;
    setIsDeletingCover(true);
    try {
      handleRemoveCoverPhotoForDay(deletingCoverDay);
    } catch (err) {
      console.error('Error removing cover photo:', err);
    } finally {
      setIsDeletingCover(false);
      setDeletingCoverDay(null);
    }
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
            const now = new Date();
            const targetIsoDate = new Date(currentYear, currentMonth, dayNum, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();

            setDayRecords((prev) => {
              const existing = prev[photoKey] || {
                amount: 0,
                category: 'Khoảnh khắc',
                categoryIcon: '📸',
                items: [],
                dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
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

            // Đồng bộ ảnh bìa này lên Backend để Mobile hiển thị đúng ô lịch ngày này
            const currentRec = dayRecords[photoKey];
            const firstValidItem = currentRec?.items?.find((it) => it.id && !it.id.startsWith('exp-') && !it.id.startsWith('legacy-'));
            if (firstValidItem) {
              updateTransactionApi(firstValidItem.id, { photoUri: compressedBase64 }).catch(() => {});
            } else {
              createTransactionApi({
                title: 'Khoảnh khắc chi tiêu',
                amount: 0,
                type: 'expense',
                category: 'Khoảnh khắc',
                categoryIcon: '📸',
                note: 'Ảnh đại diện lịch trình chi tiêu',
                photoUri: compressedBase64,
                date: targetIsoDate,
              }).catch(() => {});
            }
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
    const paddedKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const existing = dayRecords[photoKey] || dayRecords[paddedKey];

    setDayRecords((prev) => {
      const rec = prev[photoKey] || prev[paddedKey];
      if (!rec) return prev;

      let next: Record<string, DayExpenseRecord>;
      if (!rec.items || rec.items.length === 0) {
        next = { ...prev };
        delete next[photoKey];
        delete next[paddedKey];
      } else {
        const updated = { ...rec, photoUri: undefined };
        next = { ...prev, [photoKey]: updated, [paddedKey]: updated };
      }

      saveDayRecordsToStorage(next);
      return next;
    });

    if (existing?.items) {
      existing.items.forEach((it) => {
        if (it.id && !it.id.startsWith('exp-') && !it.id.startsWith('legacy-') && it.photoUri) {
          updateTransactionApi(it.id, { photoUri: '' }).catch(() => {});
        }
      });
    }
  };

  const handleSetCoverPhoto = (photoUri: string) => {
    if (!photoUri) return;
    const photoKey = `${currentYear}-${currentMonth + 1}-${timelineDayNum}`;
    const paddedKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(timelineDayNum).padStart(2, '0')}`;
    setDayRecords((prev) => {
      const existing = prev[photoKey] || prev[paddedKey] || {
        amount: 0,
        category: 'Khoảnh khắc',
        categoryIcon: '📸',
        items: [],
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(timelineDayNum).padStart(2, '0')}`,
      };
      const updated = { ...existing, photoUri };
      const next = { ...prev, [photoKey]: updated, [paddedKey]: updated };
      saveDayRecordsToStorage(next, currentUserId);
      return next;
    });

    addNotification({
      type: 'moment',
      title: language === 'vi' ? 'Đã đặt làm ảnh đại diện ô lịch ⭐' : 'Cover Photo Set ⭐',
      message: language === 'vi'
        ? `Đã đặt ảnh này làm ảnh đại diện cho ngày ${timelineDayNum}/${currentMonth + 1}.`
        : `Cover photo updated for ${timelineDayNum}/${currentMonth + 1}.`,
      iconBg: '#EDE9FE',
      iconColor: '#8B5CF6',
      metadata: { targetTab: 'home' },
    });
  };

  const handlePickPhotoForExpenseItem = (item: ExpenseItem) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          try {
            const compressedBase64 = await compressImageFile(file);
            const photoKey = `${currentYear}-${currentMonth + 1}-${timelineDayNum}`;
            const paddedKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(timelineDayNum).padStart(2, '0')}`;
            setDayRecords((prev) => {
              const existing = prev[photoKey] || prev[paddedKey];
              if (!existing || !existing.items) return prev;
              const updatedItems = existing.items.map((it) =>
                it.id === item.id ? { ...it, photoUri: compressedBase64 } : it
              );
              const next = {
                ...prev,
                [photoKey]: { ...existing, items: updatedItems },
                [paddedKey]: { ...existing, items: updatedItems },
              };
              saveDayRecordsToStorage(next, currentUserId);
              return next;
            });
            setSelectedTimelineItem((prev) => (prev && prev.id === item.id ? { ...prev, photoUri: compressedBase64 } : prev));
            if (item.id && !item.id.startsWith('exp-') && !item.id.startsWith('legacy-')) {
              updateTransactionApi(item.id, { photoUri: compressedBase64 }).catch(() => {});
            }
          } catch (err) {
            console.error('Error adding photo to expense item:', err);
          }
        }
      };
      input.click();
    }
  };

  const handleRemovePhotoFromExpenseItem = (item: ExpenseItem) => {
    const photoKey = `${currentYear}-${currentMonth + 1}-${timelineDayNum}`;
    const paddedKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(timelineDayNum).padStart(2, '0')}`;
    setDayRecords((prev) => {
      const existing = prev[photoKey] || prev[paddedKey];
      if (!existing || !existing.items) return prev;
      const updatedItems = existing.items.map((it) =>
        it.id === item.id ? { ...it, photoUri: undefined } : it
      );
      const wasCover = existing.photoUri === item.photoUri;
      const nextCover = wasCover ? updatedItems.find((it) => it.photoUri)?.photoUri : existing.photoUri;
      const next = {
        ...prev,
        [photoKey]: { ...existing, items: updatedItems, photoUri: nextCover },
        [paddedKey]: { ...existing, items: updatedItems, photoUri: nextCover },
      };
      saveDayRecordsToStorage(next, currentUserId);
      return next;
    });
    setSelectedTimelineItem((prev) => (prev && prev.id === item.id ? { ...prev, photoUri: undefined } : prev));
    if (item.id && !item.id.startsWith('exp-') && !item.id.startsWith('legacy-')) {
      updateTransactionApi(item.id, { photoUri: '' }).catch(() => {});
    }
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

  const [budget, setBudget] = useState<BudgetData>(() => {
    return (
      (getCachedBudget() as BudgetData) || {
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
      }
    );
  });

  const [isIncomeScreenOpen, setIsIncomeScreenOpen] = useState<boolean>(false);
  const [totalMonthIncome, setTotalMonthIncome] = useState<number>(() => {
    return getTotalIncomeForMonth(currentYear, currentMonth + 1);
  });

  useEffect(() => {
    setTotalMonthIncome(getTotalIncomeForMonth(currentYear, currentMonth + 1));
  }, [currentYear, currentMonth]);

  useEffect(() => {
    const unsub = subscribeIncomeUpdates(() => {
      setTotalMonthIncome(getTotalIncomeForMonth(currentYear, currentMonth + 1));
      try {
        syncIncomeWithBudget();
      } catch (_) {}
    });
    return unsub;
  }, [currentYear, currentMonth]);

  const realMonthSpent = useMemo(() => {
    return monthlyStats.totalSpending;
  }, [monthlyStats.totalSpending]);

  const availableBalance = useMemo(() => {
    if (totalMonthIncome === 0) {
      return realMonthSpent > 0 ? -realMonthSpent : 0;
    }
    return totalMonthIncome - realMonthSpent;
  }, [totalMonthIncome, realMonthSpent]);

  const budgetStatus = useMemo<'safe' | 'warning' | 'danger'>(() => {
    if (totalMonthIncome === 0) {
      return realMonthSpent > 0 ? 'danger' : 'safe';
    }
    if (availableBalance < 0) return 'danger';
    if (realMonthSpent / totalMonthIncome >= 0.8) return 'warning';
    return 'safe';
  }, [totalMonthIncome, realMonthSpent, availableBalance]);

  const remainingDaysInMonth = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const isCurrent = currentYear === now.getFullYear() && currentMonth === now.getMonth();
    const curDay = isCurrent ? now.getDate() : 1;
    return Math.max(1, lastDayOfMonth - curDay + 1);
  }, [currentYear, currentMonth]);

  const safeDailySpend = useMemo(() => {
    return Math.max(0, Math.round(Math.max(0, availableBalance) / remainingDaysInMonth));
  }, [availableBalance, remainingDaysInMonth]);

  useEffect(() => {
    let isMounted = true;
    getBudgetApi()
      .then((data) => {
        if (isMounted && data && data.limit) {
          setBudget(data);
          saveCachedBudget(data);
        }
      })
      .catch(() => { });

    const unsubscribe = subscribeBudgetUpdates((updatedBudget) => {
      if (isMounted && updatedBudget) {
        setBudget(updatedBudget as BudgetData);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
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
        <UserProfileHeader
          onQuickSave={() => handleOpenQuickSave(todayDate > 0 ? todayDate : 1)}
          onOpenIncome={() => setIsIncomeScreenOpen(true)}
        />

        {/* 2. THANH XANH EMERALD KÈM MASCOT (Đồng bộ 100% với mobile) */}
        <WebEmeraldBalanceCard
          availableBalance={availableBalance}
          totalMonthIncome={totalMonthIncome}
          totalMonthSpent={realMonthSpent}
          recordedDays={monthlyStats.countDays}
          dailyAvg={monthlyStats.avgPerDay}
          budgetLimit={budget?.limit || 0}
          budgetStatus={budgetStatus}
          safeDailySpend={safeDailySpend}
          language={language as any}
          onOpenIncome={() => setIsIncomeScreenOpen(true)}
        />
      </View>

      {/* ===================== ROW 2: LỊCH TÀI CHÍNH (FULL WIDTH) ===================== */}
      <View style={[styles.card, styles.fullWidthCard]} nativeID="financial-calendar-section" {...({ id: 'financial-calendar-section' } as any)}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>
            {language === 'vi' ? 'Lịch tài chính' : 'Financial Calendar'}
          </Text>
        </View>

        {/* Real Calendar Grid */}
        <View style={styles.streakJourneyBox}>
          {/* Calendar Header with Month Navigation */}
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
                <View style={[styles.legendDot, { backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#D97706' }]} />
                <Text style={styles.legendText}>
                  {language === 'vi' ? 'Hôm nay' : 'Today'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#059669', borderWidth: 1, borderColor: '#059669' }]} />
                <Text style={styles.legendText}>
                  {language === 'vi' ? 'Có ảnh hóa đơn' : 'Has photo'}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }]} />
                <Text style={styles.legendText}>
                  {language === 'vi' ? 'Có chi tiêu' : 'Has expense'}
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
              const category = record?.category;
              const categoryIcon = record?.categoryIcon;
              const isToday = isCurrentRealMonth && dayNum === todayDate;
              const isSelected = selectedDay === dayNum;

              return (
                <TouchableOpacity
                  key={`day-${dayNum}`}
                  style={[
                    styles.calCell,
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
                          <CategorySvgIcon
                            categoryId={category}
                            categoryIcon={categoryIcon || (amount > 0 ? undefined : '📸')}
                            size={16}
                          />
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
                            <View style={styles.noPhotoSvgWrap}>
                              <CategorySvgIcon
                                categoryId={category}
                                categoryIcon={categoryIcon}
                                size={15}
                              />
                            </View>
                            <Text style={styles.noPhotoExpenseText}>-{formatAmountShort(amount)}</Text>
                          </View>
                        ) : isToday ? (
                          <View style={styles.emptyCellFrogWrap}>
                            <Image
                              source={require('../../../assets/frogs/frog-calendar-mascot.png')}
                              style={styles.emptyCellFrogImage}
                              resizeMode="contain"
                            />
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
                          </View>
                        ) : (
                          <View style={styles.emptyCellFrogWrap}>
                            <Image
                              source={require('../../../assets/frogs/frog-calendar-mascot.png')}
                              style={styles.emptyCellFrogImage}
                              resizeMode="contain"
                            />
                          </View>
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
        {/* CỘT 1: MỤC NHẮC NHỞ */}
        <View style={[styles.widgetCol, width >= 900 && { flex: 1 }]}>
          <RemindersWidget
            noMargin={true}
            onNavigateToRemindersTab={() => onNavigateToTab?.('reminders')}
          />
        </View>

        {/* CỘT 2: GIAO DỊCH GẦN ĐÂY */}
        <View style={[styles.widgetCol, width >= 900 && { flex: 1 }]}>
          <RecentTransactionsWidget
            dayRecords={dayRecords}
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
          <View style={[styles.modalFormCard, isDesktop ? styles.quickSaveModalCardDesktop : styles.quickSaveModalCardMobile]}>
            {/* Header */}
            <View style={styles.quickSaveHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.quickSaveModalIconCircle}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#FFFFFF">
                    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </Svg>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={styles.quickSaveModalTitle}>
                      {language === 'vi' ? 'Lưu nhanh chi tiêu' : 'Quick Save Expense'}
                    </Text>
                    <View style={styles.quickSaveDateBadge}>
                      <Text style={styles.quickSaveDateBadgeText}>
                        📅 {quickDayNum < 10 ? '0' + quickDayNum : quickDayNum}/{pickerMonth + 1}/{pickerYear}
                      </Text>
                    </View>
                  </View>
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

            {/* Scrollable Container for Form (tight fit, no blank gap) */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexGrow: 0, maxHeight: isDesktop ? 540 : 480 }}
              contentContainerStyle={{ paddingBottom: 0 }}
            >
              <View style={[styles.quickSaveLayoutRow, !isDesktop && styles.quickSaveLayoutCol]}>
                
                {/* ========== CỘT TRÁI (LEFT COLUMN): SỐ TIỀN & DANH MỤC CHI TIÊU ========== */}
                <View style={[styles.quickSaveLeftCol, !isDesktop && { width: '100%' }]}>
                  {/* 1. Số tiền chi tiêu */}
                  <View style={styles.quickSaveSectionCard}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.sectionIconBadge, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7' }]}>
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                            <Circle cx="12" cy="12" r="10" stroke="#D97706" strokeWidth="2.2" />
                            <Path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 3 5 2 5 5a2.5 2.5 0 0 1-5 0" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
                          </Svg>
                        </View>
                        <Text style={styles.modalFormLabel}>
                          {language === 'vi' ? 'Số tiền (VNĐ)' : 'Amount (VND)'}
                        </Text>
                        <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 14 }}>*</Text>
                      </View>

                      {quickAmountStr && parseInt(quickAmountStr.replace(/\D/g, ''), 10) > 0 ? (
                        <View style={styles.amountLiveBadge}>
                          <Text style={styles.amountLiveBadgeText}>
                            = {parseInt(quickAmountStr.replace(/\D/g, ''), 10).toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Amount Input with Currency Symbol */}
                    <View style={styles.amountInputWrap}>
                      <Text style={styles.amountCurrencyPrefix}>₫</Text>
                      <TextInput
                        style={styles.amountLargeInput}
                        value={quickAmountStr}
                        onChangeText={setQuickAmountStr}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        autoFocus
                      />
                    </View>

                    {/* Quick Add Chips */}
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
                        style={styles.quickAmountClearChip}
                        onPress={() => setQuickAmountStr('')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickAmountClearText}>{language === 'vi' ? 'Xóa' : 'Clear'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 2. Danh mục chi tiêu */}
                  <View style={[styles.quickSaveSectionCard, { marginTop: 10 }]}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.sectionIconBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' }]}>
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                            <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            <Circle cx="7" cy="7" r="1.5" fill="#059669" />
                          </Svg>
                        </View>
                        <Text style={styles.modalFormLabel}>
                          {language === 'vi' ? 'Danh mục chi tiêu' : 'Expense Category'}
                        </Text>
                      </View>
                      <View style={styles.selectedCategoryPill}>
                        <Text style={styles.selectedCategoryPillText}>{quickCategory}</Text>
                      </View>
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
                                shadowOpacity: 0.25,
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
                              <CategorySvgIcon categoryId={cat.id} size={24} isSelected={isSelected} />
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
                </View>

                {/* ========== CỘT PHẢI (RIGHT COLUMN): NGÀY/GIỜ, GHI CHÚ, ẢNH HÓA ĐƠN ========== */}
                <View style={[styles.quickSaveRightCol, !isDesktop && { width: '100%', marginTop: 10 }]}>
                  {/* 3. Ngày & Giờ chi tiêu */}
                  <View style={styles.quickSaveSectionCard}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.sectionIconBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7' }]}>
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                            <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#059669" strokeWidth="2.2" />
                            <Line x1="16" y1="2" x2="16" y2="6" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
                            <Line x1="8" y1="2" x2="8" y2="6" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
                            <Line x1="3" y1="10" x2="21" y2="10" stroke="#059669" strokeWidth="2.2" />
                          </Svg>
                        </View>
                        <Text style={styles.modalFormLabel}>
                          {language === 'vi' ? 'Thời gian chi tiêu' : 'Expense Time'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      {/* Ngày chi tiêu */}
                      <View style={{ flex: 1.4 }}>
                        <View style={styles.dateSelectorRow}>
                          <TouchableOpacity
                            style={styles.dateArrowMiniBtn}
                            onPress={() => setQuickDayNum((d) => Math.max(1, d - 1))}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>‹</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.dateSelectorCenterBtn}
                            onPress={() => setShowMiniDatePicker((v) => !v)}
                            activeOpacity={0.75}
                          >
                            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
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
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>›</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Giờ chi tiêu */}
                      <View style={{ flex: 1 }}>
                        <View style={styles.timeInputBox}>
                          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                            <Circle cx="12" cy="12" r="10" stroke="#059669" strokeWidth="2" />
                            <Polyline points="12 6 12 12 16 14" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </Svg>
                          <TextInput
                            style={styles.timeInputField}
                            value={quickTimeStr}
                            onChangeText={setQuickTimeStr}
                            placeholder="12:00"
                            placeholderTextColor="#94A3B8"
                          />
                        </View>
                      </View>
                    </View>

                    {/* Dropdown Mini Lịch */}
                    {showMiniDatePicker && (
                      <View style={styles.miniCalDropdown}>
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

                        <View style={styles.miniCalDowRow}>
                          {(language === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((dow, idx) => (
                            <View key={dow + idx} style={styles.miniCalDowCell}>
                              <Text style={[styles.miniCalDowText, (idx === 5 || idx === 6) && styles.miniCalWeekendText]}>
                                {dow}
                              </Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.miniCalGrid}>
                          {(() => {
                            const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                            const firstDow = (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7;
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

                  {/* 4. Ghi chú / Tên món */}
                  <View style={[styles.quickSaveSectionCard, { marginTop: 10 }]}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.sectionIconBadge, { backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : '#F1F5F9' }]}>
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                            <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </Svg>
                        </View>
                        <Text style={styles.modalFormLabel}>
                          {language === 'vi' ? 'Ghi chú / Tên món' : 'Note / Description'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>
                        {language === 'vi' ? 'Tùy chọn' : 'Optional'}
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.modalInput, { marginTop: 8 }]}
                      value={quickNote}
                      onChangeText={setQuickNote}
                      placeholder={language === 'vi' ? 'Ví dụ: Cơm trưa, Cà phê Highland...' : 'E.g. Lunch, Coffee...'}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  {/* 5. Ảnh hóa đơn / khoảnh khắc */}
                  <View style={[styles.quickSaveSectionCard, { marginTop: 10 }]}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.sectionIconBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' }]}>
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                            <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            <Circle cx="12" cy="13" r="4" stroke="#059669" strokeWidth="2.2" />
                          </Svg>
                        </View>
                        <Text style={styles.modalFormLabel}>
                          {language === 'vi' ? 'Ảnh hóa đơn / khoảnh khắc' : 'Receipt / Moment Photo'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '600' }}>
                        {language === 'vi' ? 'Tùy chọn' : 'Optional'}
                      </Text>
                    </View>

                    {isCompressingPhoto ? (
                      <View style={styles.quickPhotoUploadingBox}>
                        <Text style={{ fontSize: 22 }}>⏳</Text>
                        <Text style={styles.quickPhotoUploadingText}>
                          {language === 'vi' ? 'Đang nén và tối ưu hóa ảnh...' : 'Compressing and optimizing photo...'}
                        </Text>
                      </View>
                    ) : quickPhotoUri ? (
                      <View style={{ marginTop: 8 }}>
                        <View style={styles.quickPhotoThumbBox}>
                          <Image source={{ uri: quickPhotoUri }} style={styles.quickPhotoThumb} resizeMode="cover" />
                          <View style={styles.quickPhotoOverlayBar}>
                            <View style={styles.quickPhotoBadge}>
                              <Text style={styles.quickPhotoBadgeText}>
                                {language === 'vi' ? '🖼️ Đã chọn ảnh bìa' : '🖼️ Cover Attached'}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TouchableOpacity
                                style={styles.photoControlBtnChange}
                                onPress={handleUploadPhotoInQuickSave}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.photoControlTextChange}>
                                  🔄 {language === 'vi' ? 'Đổi ảnh' : 'Change'}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.photoControlBtnRemove}
                                onPress={() => setQuickPhotoUri('')}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.photoControlTextRemove}>
                                  🗑️ {language === 'vi' ? 'Bỏ ảnh' : 'Remove'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.quickPhotoUploadCard}
                        onPress={handleUploadPhotoInQuickSave}
                        activeOpacity={0.75}
                      >
                        <View style={styles.quickPhotoUploadIconCircle}>
                          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            <Circle cx="12" cy="13" r="4" stroke="#059669" strokeWidth="2" />
                          </Svg>
                        </View>
                        <View style={{ alignItems: 'center', gap: 4 }}>
                          <Text style={styles.quickPhotoUploadCardTitle}>
                            {language === 'vi' ? '+ Đính kèm ảnh hóa đơn hoặc khoảnh khắc' : '+ Attach photo receipt or moment'}
                          </Text>
                          <Text style={styles.quickPhotoUploadCardSub}>
                            {language === 'vi'
                              ? 'Nhấn để chọn ảnh • Tự động hiển thị bìa ảnh trên ô lịch & lưu Cloud'
                              : 'Click to upload • Auto displays as day cover on calendar'}
                          </Text>
                        </View>
                        <View style={styles.quickPhotoFormatPill}>
                          <Text style={styles.quickPhotoFormatPillText}>
                            {language === 'vi' ? 'JPG, PNG, WebP • Tự động nén tối ưu' : 'JPG, PNG, WebP • Auto-optimized'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Nút Quét hóa đơn bằng AI */}
                    <TouchableOpacity
                      style={styles.quickSaveAiScanBtn}
                      onPress={() => setShowAiScanModal(true)}
                      activeOpacity={0.82}
                    >
                      <View style={styles.quickSaveAiScanIconWrap}>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
                            stroke="#059669"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <Line x1="7" y1="12" x2="17" y2="12" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
                          <Circle cx="12" cy="12" r="2" fill="#059669" />
                        </Svg>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.quickSaveAiScanTitle}>
                            {language === 'vi' ? 'Quét hóa đơn thông minh bằng AI' : 'Scan Receipt with Smart AI'}
                          </Text>
                          <View style={styles.quickSaveAiBadge}>
                            <Text style={styles.quickSaveAiBadgeText}>AI OCR</Text>
                          </View>
                        </View>
                        <Text style={styles.quickSaveAiScanSubtitle}>
                          {language === 'vi'
                            ? 'Tự động trích xuất tên quán, danh mục & tổng tiền'
                            : 'Auto-extract supplier, category & total amount'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, color: '#059669', fontWeight: '800' }}>›</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={[styles.quickSaveModalFooter, { justifyContent: 'flex-end' }]}>
              <View style={styles.quickSaveFooterBtnGroup}>
                <TouchableOpacity
                  style={styles.quickSaveCancelBtn}
                  onPress={() => setQuickSaveModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickSaveCancelBtnText}>{language === 'vi' ? 'Hủy' : 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickSaveSaveBtn}
                  onPress={handleSaveQuickExpense}
                  activeOpacity={0.85}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="#FFFFFF">
                      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </Svg>
                    <Text style={styles.quickSaveSaveBtnText}>
                      {language === 'vi' ? 'Lưu chi tiêu' : 'Save Expense'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      {/* Modal Quét hóa đơn thông minh bằng AI */}
      <AiReceiptScanModal
        visible={showAiScanModal}
        onClose={() => setShowAiScanModal(false)}
        onApply={handleApplyAiReceiptScan}
        initialPhotoUri={quickPhotoUri}
        targetDate={`${pickerYear}-${String(pickerMonth + 1).padStart(2, '0')}-${String(quickDayNum).padStart(2, '0')}`}
        targetDayNum={quickDayNum}
      />

      {/* ===================== 2. MODAL XEM TẤT CẢ CHI TIÊU CỦA NGÀY (SPLIT 2-COLUMN MASTER-DETAIL) ===================== */}
      {(() => {
        const photoKey = `${currentYear}-${currentMonth + 1}-${timelineDayNum}`;
        const paddedKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(timelineDayNum).padStart(2, '0')}`;
        const currentRecord = dayRecords[photoKey] || dayRecords[paddedKey];
        const dayItems = currentRecord?.items || [];
        const activeItem = dayItems.find((it) => it.id === selectedTimelineItem?.id) || dayItems.find((it) => it.photoUri) || dayItems[0] || null;

        return (
          <Modal
            visible={timelineModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setTimelineModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View
                style={[
                  styles.timelineMasterModalCard,
                  {
                    width: width >= 1100 ? 1040 : width >= 768 ? '94%' : '96%',
                    maxWidth: 1060,
                    height: width >= 768 ? 680 : undefined,
                    maxHeight: '92vh' as any,
                  },
                ]}
              >
                {/* Header: Date + Total + Add & Close */}
                <View style={styles.timelineModalHeader}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <View style={styles.timelineCalendarIconBadge}>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#059669" strokeWidth="2.2" />
                          <Line x1="16" y1="2" x2="16" y2="6" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
                          <Line x1="8" y1="2" x2="8" y2="6" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
                          <Line x1="3" y1="10" x2="21" y2="10" stroke="#059669" strokeWidth="2.2" />
                        </Svg>
                      </View>
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
                          {(currentRecord?.amount || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                      <View style={styles.timelineCountPill}>
                        <Text style={styles.timelineCountText}>
                          {dayItems.length} {language === 'vi' ? 'khoản chi tiêu' : 'records'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons: + Lưu nhanh & Đóng */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                      style={styles.timelineAddBtn}
                      onPress={() => {
                        setTimelineModalVisible(false);
                        handleOpenQuickSave(timelineDayNum);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="#FFFFFF">
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
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                        <Line x1="18" y1="6" x2="6" y2="18" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                        <Line x1="6" y1="6" x2="18" y2="18" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" />
                      </Svg>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* TWO-COLUMN BODY */}
                <View style={[styles.timelineSplitBody, width < 768 && { flexDirection: 'column', height: 'auto' }]}>
                  {/* LEFT COLUMN: LIST OF EXPENSES (ONLY LIST) */}
                  <View style={[styles.timelineLeftCol, width < 768 && { flex: undefined, width: '100%', maxHeight: 260 }]}>
                    {/* Subheading */}
                    <View style={styles.timelineListSubheader}>
                      <Text style={styles.timelineListSubheaderText}>
                        {language === 'vi' ? 'DANH SÁCH CHI TIÊU' : 'TRANSACTIONS'} ({dayItems.length})
                      </Text>
                      <Text style={styles.timelineListSubheaderHint}>
                        {language === 'vi' ? 'Ấn để xem chi tiết →' : 'Tap item to view →'}
                      </Text>
                    </View>

                    {/* Scrollable list */}
                    {dayItems.length === 0 ? (
                      <View style={styles.timelineEmptyBox}>
                        <Text style={{ fontSize: 32, marginBottom: 8 }}>🍃</Text>
                        <Text style={styles.timelineEmptyTitle}>
                          {language === 'vi' ? 'Chưa có khoản chi nào' : 'No expenses recorded yet'}
                        </Text>
                        <Text style={styles.timelineEmptySubtitle}>
                          {language === 'vi'
                            ? 'Bấm nút "+ Lưu nhanh" để ghi chép khoản chi đầu tiên!'
                            : 'Tap "+ Add" above to record an expense!'}
                        </Text>
                      </View>
                    ) : (
                      <ScrollView showsVerticalScrollIndicator={true} style={styles.timelineListScroll}>
                        {dayItems.map((it, idx) => {
                          const isSelected = activeItem?.id === it.id;
                          return (
                            <TouchableOpacity
                              key={it.id || idx}
                              style={[
                                styles.timelineInteractiveCard,
                                isSelected && styles.timelineInteractiveCardSelected,
                              ]}
                              onPress={() => setSelectedTimelineItem(it)}
                              activeOpacity={0.85}
                            >
                              {/* Top row: Time + Category + Amount */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 }}>
                                  <View style={[styles.timelineSmallTimeBadge, isSelected && styles.timelineSmallTimeBadgeSelected]}>
                                    <Text style={[styles.timelineSmallTimeText, isSelected && styles.timelineSmallTimeTextSelected]}>
                                      {formatExpenseUploadTime(it)}
                                    </Text>
                                  </View>
                                  <CategorySvgIcon categoryId={it.category} categoryIcon={it.categoryIcon} size={16} />
                                  <Text style={[styles.timelineItemCategoryName, isSelected && styles.timelineItemCategoryNameSelected]} numberOfLines={1}>
                                    {it.category || 'Ăn uống'}
                                  </Text>
                                </View>

                                <Text style={[styles.timelineItemAmountText, isSelected && styles.timelineItemAmountTextSelected]}>
                                  -{(it.amount || 0).toLocaleString('vi-VN')} đ
                                </Text>
                              </View>

                              {/* Bottom row: Note preview + Photo badge + Delete btn */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={[styles.timelineItemNotePreview, isSelected && { color: isDark ? '#E2E8F0' : '#1E293B' }]} numberOfLines={1}>
                                  {it.note ? `📝 ${it.note}` : (language === 'vi' ? 'Không có ghi chú' : 'No note')}
                                </Text>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                                  {it.photoUri ? (
                                    <View style={styles.timelineHasPhotoPill}>
                                      <Text style={styles.timelineHasPhotoText}>📷 {language === 'vi' ? 'Có ảnh' : 'Photo'}</Text>
                                    </View>
                                  ) : null}
                                  <TouchableOpacity
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      setDeletingExpense({ dayNum: timelineDayNum, item: it });
                                    }}
                                    style={styles.timelineItemQuickDeleteBtn}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  >
                                    <Text style={{ fontSize: 11 }}>🗑️</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {/* RIGHT COLUMN: SELECTED ITEM DETAILS */}
                  <View style={[styles.timelineRightCol, width < 768 && { flex: undefined, width: '100%', minHeight: 320 }]}>
                    {activeItem ? (
                      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        {/* Section Tag */}
                        <View style={styles.detailHeaderRow}>
                          <View style={styles.detailHeaderBadge}>
                            <Text style={styles.detailHeaderBadgeText}>
                              💎 {language === 'vi' ? 'CHI TIẾT KHOẢN TIỀN' : 'EXPENSE DETAILS'}
                            </Text>
                          </View>
                          <Text style={styles.detailTimeMeta}>
                            🕒 {formatExpenseUploadTime(activeItem)} • {timelineDayNum < 10 ? '0' + timelineDayNum : timelineDayNum}/{currentMonth + 1}/{currentYear}
                          </Text>
                        </View>

                        {/* Large Image Showcase (Ấn trực tiếp vào ảnh để mở to xem full) */}
                        {activeItem.photoUri ? (
                          <View style={{ marginBottom: 14 }}>
                            <TouchableOpacity
                              style={styles.detailPhotoShowcaseCard}
                              onPress={() => setLightboxUri(activeItem.photoUri!)}
                              activeOpacity={0.92}
                            >
                              <Image
                                source={{ uri: activeItem.photoUri }}
                                style={styles.detailShowcaseImage}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>

                            {/* Photo Actions Row: Đặt làm ảnh ô lịch + Đổi ảnh + Gỡ ảnh */}
                            <View style={styles.detailPhotoActionBar}>
                              <TouchableOpacity
                                style={[
                                  styles.detailPhotoActionBtn,
                                  currentRecord?.photoUri === activeItem.photoUri && styles.detailPhotoActionBtnActive,
                                ]}
                                onPress={() => handleSetCoverPhoto(activeItem.photoUri!)}
                                activeOpacity={0.85}
                              >
                                <Text style={[
                                  styles.detailPhotoActionBtnText,
                                  currentRecord?.photoUri === activeItem.photoUri && { color: '#059669', fontWeight: '800' },
                                ]}>
                                  {currentRecord?.photoUri === activeItem.photoUri
                                    ? (language === 'vi' ? '⭐ Đang là ảnh ô lịch' : '⭐ Cell cover')
                                    : (language === 'vi' ? '⭐ Đặt làm ảnh ô lịch' : '⭐ Set as cover')}
                                </Text>
                              </TouchableOpacity>

                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <TouchableOpacity
                                  style={styles.detailPhotoActionBtn}
                                  onPress={() => handlePickPhotoForExpenseItem(activeItem)}
                                  activeOpacity={0.85}
                                >
                                  <Text style={styles.detailPhotoActionBtnText}>
                                    🔄 {language === 'vi' ? 'Đổi ảnh' : 'Change'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.detailPhotoActionBtn, { backgroundColor: isDark ? '#334155' : '#FEE2E2', borderColor: isDark ? '#475569' : '#FECACA' }]}
                                  onPress={() => handleRemovePhotoFromExpenseItem(activeItem)}
                                  activeOpacity={0.85}
                                >
                                  <Text style={[styles.detailPhotoActionBtnText, { color: '#DC2626' }]}>
                                    🗑️ {language === 'vi' ? 'Gỡ ảnh' : 'Remove'}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        ) : (
                          /* Placeholder when no photo */
                          <View style={styles.detailNoPhotoBox}>
                            <View style={styles.detailNoPhotoIconWrap}>
                              <Text style={{ fontSize: 28 }}>🧾</Text>
                            </View>
                            <Text style={styles.detailNoPhotoTitle}>
                              {language === 'vi' ? 'Khoản chi tiêu này chưa có ảnh' : 'No receipt photo attached'}
                            </Text>
                            <Text style={styles.detailNoPhotoSubtitle}>
                              {language === 'vi'
                                ? 'Bạn có thể tải ảnh hóa đơn hoặc hình chụp sản phẩm để lưu giữ kỷ niệm'
                                : 'You can attach a receipt or moment photo for this record'}
                            </Text>
                            <TouchableOpacity
                              style={styles.detailAttachPhotoBtn}
                              onPress={() => handlePickPhotoForExpenseItem(activeItem)}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.detailAttachPhotoBtnText}>
                                📷 {language === 'vi' ? '+ Thêm ảnh hóa đơn cho khoản này' : '+ Attach Receipt Photo'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Financial Details Card */}
                        <View style={styles.detailMainInfoCard}>
                          {/* Category Row */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <View style={styles.detailCategoryIconWrap}>
                              <CategorySvgIcon categoryId={activeItem.category} categoryIcon={activeItem.categoryIcon} size={24} />
                            </View>
                            <View>
                              <Text style={styles.detailCategoryLabel}>
                                {language === 'vi' ? 'Danh mục chi tiêu' : 'Expense Category'}
                              </Text>
                              <Text style={styles.detailCategoryName}>
                                {activeItem.category || 'Ăn uống'}
                              </Text>
                            </View>
                          </View>

                          {/* Big Amount Box */}
                          <View style={styles.detailAmountBox}>
                            <Text style={styles.detailAmountLabel}>
                              {language === 'vi' ? 'Số tiền thanh toán' : 'Amount Paid'}
                            </Text>
                            <Text style={styles.detailAmountValue}>
                              -{(activeItem.amount || 0).toLocaleString('vi-VN')} <Text style={{ fontSize: 20 }}>đ</Text>
                            </Text>
                          </View>

                          {/* Full Note */}
                          <View style={styles.detailNoteCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <Text style={{ fontSize: 13 }}>📝</Text>
                              <Text style={styles.detailNoteHeading}>
                                {language === 'vi' ? 'Ghi chú chi tiết' : 'Detailed Note'}
                              </Text>
                            </View>
                            <Text style={styles.detailNoteContent}>
                              {activeItem.note || (language === 'vi' ? 'Khoản chi tiêu này không có ghi chú.' : 'No detailed note.')}
                            </Text>
                          </View>

                          {/* Bottom Action Buttons */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                            <TouchableOpacity
                              style={styles.detailDeleteBtn}
                              onPress={() => setDeletingExpense({ dayNum: timelineDayNum, item: activeItem })}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.detailDeleteBtnText}>
                                🗑️ {language === 'vi' ? 'Xóa khoản chi này' : 'Delete expense'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </ScrollView>
                    ) : (
                      /* When no item selected */
                      <View style={styles.detailSelectPromptBox}>
                        <Text style={{ fontSize: 44, marginBottom: 12 }}>👈</Text>
                        <Text style={styles.detailSelectPromptTitle}>
                          {language === 'vi' ? 'Chọn một khoản chi bên trái' : 'Select an expense on the left'}
                        </Text>
                        <Text style={styles.detailSelectPromptSubtitle}>
                          {language === 'vi'
                            ? 'Nội dung chi tiết, số tiền và hình ảnh hóa đơn sẽ hiển thị rõ ràng tại đây.'
                            : 'Details, amount and photo receipt will appear here.'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Modal Bottom Bar */}
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
        );
      })()}

      {/* ===================== 3. MODAL PHÓNG TO ẢNH (LIGHTBOX PREVIEW) ===================== */}
      <Modal
        visible={!!lightboxUri}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <TouchableOpacity
          style={styles.lightboxBackdrop}
          activeOpacity={1}
          onPress={() => setLightboxUri(null)}
        >
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
        </TouchableOpacity>
      </Modal>

      {/* ===================== 4. MODAL XÁC NHẬN XÓA CHI TIÊU ===================== */}
      <ConfirmDeleteModal
        visible={Boolean(deletingExpense)}
        itemTitle={
          deletingExpense?.item.note ||
          deletingExpense?.item.category ||
          (language === 'vi' ? 'Khoản chi' : 'Expense')
        }
        itemAmount={
          deletingExpense?.item.amount != null
            ? `-${deletingExpense.item.amount.toLocaleString('vi-VN')} đ`
            : undefined
        }
        itemImage={deletingExpense?.item.photoUri}
        itemCategory={deletingExpense?.item.category}
        isDeleting={isDeletingExpense}
        onConfirm={handleConfirmDeleteExpense}
        onCancel={() => setDeletingExpense(null)}
      />

      {/* ===================== 5. MODAL XÁC NHẬN GỠ ẢNH Ô LỊCH ===================== */}
      <ConfirmDeleteModal
        visible={deletingCoverDay !== null}
        title={language === 'vi' ? 'Gỡ ảnh đại diện ô lịch?' : 'Remove cover photo?'}
        message={
          language === 'vi'
            ? 'Ảnh đại diện của ô lịch ngày này sẽ bị gỡ bỏ khỏi giao diện lịch.'
            : 'The cover photo for this day cell will be removed from your calendar view.'
        }
        itemTitle={language === 'vi' ? 'Ảnh đại diện ô lịch' : 'Calendar Cell Cover'}
        itemImage={
          deletingCoverDay !== null
            ? dayRecords[`${currentYear}-${currentMonth + 1}-${deletingCoverDay}`]?.photoUri
            : undefined
        }
        itemCategory={language === 'vi' ? 'Hình ảnh' : 'Photo'}
        isDeleting={isDeletingCover}
        onConfirm={handleConfirmRemoveCoverPhoto}
        onCancel={() => setDeletingCoverDay(null)}
      />

      {/* ===================== 6. MODAL QUẢN LÝ THU NHẬP TRÊN WEB ===================== */}
      <Modal
        visible={isIncomeScreenOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsIncomeScreenOpen(false)}
      >
        <View style={styles.incomeModalBackdrop}>
          <View style={styles.incomeModalContent}>
            <IncomeManagementScreen onBack={() => setIsIncomeScreenOpen(false)} />
          </View>
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
  webSummaryCardsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  webSummaryCard: {
    flex: 1,
    backgroundColor: isDark ? '#1E293B' : '#FAF7F2',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#EDE7DC',
  },
  webSummaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  webSummaryCardLabelChi: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  webSummaryCardLabelThu: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  webSummaryCardAmountChi: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: -0.3,
  },
  webSummaryCardAmountThu: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -0.3,
  },
  incomeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  incomeModalContent: {
    width: '100%',
    maxWidth: 520,
    height: '86%',
    maxHeight: 680,
    backgroundColor: '#FAF7F2',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#EFE9DF',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  photoDayText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoBadgeMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 3,
  },
  photoCellBottomRow: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cellAmountBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderColor: '#FDE047',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  cellAmountBadgeText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.3,
  },
  cellPricePromptBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  cellPricePromptText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  noPhotoExpenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: isDark ? 'rgba(254, 243, 199, 0.16)' : '#FEF3C7',
    borderWidth: 1.2,
    borderColor: isDark ? '#D97706' : '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  noPhotoSvgWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoExpenseText: {
    fontSize: 12,
    fontWeight: '800',
    color: isDark ? '#FDE68A' : '#92400E',
    letterSpacing: 0.2,
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
  emptyCellFrogWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 4,
  },
  emptyCellFrogImage: {
    width: 46,
    height: 46,
    opacity: 0.88,
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
  dayCellToday: {
    borderColor: '#D97706',
    borderWidth: 2,
    backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : '#FFFBEB',
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
    fontSize: 13,
    fontWeight: '800',
    color: isDark ? '#E2E8F0' : '#334155',
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modalFormCard: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 630,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: isDark ? 0.4 : 0.16,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E2E8F0',
  },
  quickSaveModalCardDesktop: {
    maxWidth: 920,
    padding: 20,
    borderRadius: 22,
  },
  quickSaveModalCardMobile: {
    maxWidth: 520,
    padding: 16,
    borderRadius: 20,
  },
  quickSaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#F1F5F9',
  },
  quickSaveModalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  quickSaveModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  quickSaveDateBadge: {
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#059669' : '#86EFAC',
  },
  quickSaveDateBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: isDark ? '#6EE7B7' : '#15803D',
  },
  quickSaveModalSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
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
  quickSaveLayoutRow: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
  },
  quickSaveLayoutCol: {
    flexDirection: 'column',
  },
  quickSaveLeftCol: {
    flex: 1.15,
  },
  quickSaveRightCol: {
    flex: 1,
  },
  quickSaveSectionCard: {
    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: isDark ? '#1E293B' : '#EDF2F7',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFormLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  amountLiveBadge: {
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.25)' : '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#059669' : '#86EFAC',
  },
  amountLiveBadgeText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: isDark ? '#34D399' : '#15803D',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#059669',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  amountCurrencyPrefix: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
    marginRight: 8,
  },
  amountLargeInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: isDark ? '#F8FAFC' : '#0F172A',
    outlineStyle: 'none' as any,
    paddingVertical: 6,
  },
  modalAmountInput: {
    fontSize: 24,
    fontWeight: '900',
    color: '#059669',
    paddingVertical: 12,
  },
  modalAmountFormatted: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  modalInput: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.textPrimary,
    outlineStyle: 'none' as any,
  },
  modalFormSection: {
    marginBottom: 16,
  },
  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickAmountChip: {
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  quickAmountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  quickAmountClearChip: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    borderWidth: 1,
    borderColor: isDark ? '#991B1B' : '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  quickAmountClearText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  selectedCategoryPill: {
    backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedCategoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  categoryChip: {
    width: Platform.OS === 'web' ? ('calc((100% - 24px) / 4)' as any) : '23%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: isDark ? '#1E293B' : '#E2E8F0',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  categoryIconCircleActive: {
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.35)' : '#D1FAE5',
  },
  categoryBigIcon: {
    fontSize: 24,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 14,
  },
  categoryChipTextActive: {
    fontWeight: '900',
    color: '#065F46',
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dateArrowMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    cursor: 'pointer' as any,
  },
  dateSelectorCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'transparent',
    cursor: 'pointer' as any,
  },
  dateSelectorIcon: {
    fontSize: 14,
  },
  dateSelectorText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  dateSelectorChevron: {
    fontSize: 8,
    color: '#64748B',
    marginLeft: 2,
  },
  timeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 40,
  },
  timeInputField: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    outlineStyle: 'none' as any,
  },
  miniCalDropdown: {
    marginTop: 8,
    width: '100%',
    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
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
    fontSize: 12.5,
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
    cursor: 'pointer' as any,
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
    cursor: 'pointer' as any,
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
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginVertical: 1,
    cursor: 'pointer' as any,
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
  quickPhotoUploadCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: isDark ? '#059669' : '#10B981',
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.08)' : 'rgba(5, 150, 105, 0.035)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
    cursor: 'pointer' as any,
  },
  quickPhotoUploadIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.25)' : '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  quickPhotoUploadCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'center',
  },
  quickPhotoUploadCardSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  quickPhotoFormatPill: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  quickPhotoFormatPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  quickSaveAiScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: isDark ? '#059669' : '#10B981',
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
    cursor: 'pointer' as any,
  },
  quickSaveAiScanIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSaveAiScanTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: isDark ? '#34D399' : '#059669',
  },
  quickSaveAiBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  quickSaveAiBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  quickSaveAiScanSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  quickPhotoUploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#059669',
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5',
    borderRadius: 16,
    paddingVertical: 32,
    marginTop: 8,
  },
  quickPhotoUploadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  quickPhotoThumbBox: {
    width: '100%',
    height: 185,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  quickPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  quickPhotoOverlayBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickPhotoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickPhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
  photoControlBtnChange: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  photoControlTextChange: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  photoControlBtnRemove: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  photoControlTextRemove: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickSaveModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#334155' : '#F1F5F9',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickSaveFooterTip: {
    flex: 1,
    minWidth: 240,
  },
  quickSaveFooterTipText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  quickSaveFooterBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickSaveCancelBtn: {
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    cursor: 'pointer' as any,
  },
  quickSaveCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  quickSaveSaveBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
    cursor: 'pointer' as any,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quickSaveSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
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

  // ==================== TIMELINE MODAL STYLES (MASTER-DETAIL) ====================
  timelineMasterModalCard: {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E8E0D5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  timelineModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#E8E0D5',
  },
  timelineCalendarIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineModalTitle: {
    fontSize: 17,
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
  timelineCountPill: {
    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timelineCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  timelineAddBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#34D399',
  },
  timelineAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  timelineSplitBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 18,
    marginTop: 14,
    minHeight: 0,
  },
  timelineLeftCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  timelineCoverCardMini: {
    width: '100%',
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    marginBottom: 10,
  },
  timelineAddCoverText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timelineListSubheader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  timelineListSubheaderText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#64748B',
  },
  timelineListSubheaderHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  timelineListScroll: {
    flex: 1,
    paddingRight: 4,
  },
  timelineInteractiveCard: {
    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: isDark ? '#334155' : '#E2E8F0',
  },
  timelineInteractiveCardSelected: {
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.16)' : '#ECFDF5',
    borderColor: '#059669',
    borderLeftWidth: 4.5,
    borderLeftColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  timelineSmallTimeBadge: {
    backgroundColor: isDark ? '#334155' : '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timelineSmallTimeBadgeSelected: {
    backgroundColor: '#059669',
  },
  timelineSmallTimeText: {
    fontSize: 10,
    fontWeight: '800',
    color: isDark ? '#E2E8F0' : '#475569',
  },
  timelineSmallTimeTextSelected: {
    color: '#FFFFFF',
  },
  timelineItemCategoryName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  timelineItemCategoryNameSelected: {
    color: '#059669',
  },
  timelineItemAmountText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
  },
  timelineItemAmountTextSelected: {
    color: '#B91C1C',
    fontSize: 14,
  },
  timelineItemNotePreview: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    marginRight: 6,
  },
  timelineHasPhotoPill: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.25)' : '#EDE9FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: isDark ? '#8B5CF6' : '#C4B5FD',
  },
  timelineHasPhotoText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },
  timelineItemQuickDeleteBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: isDark ? '#334155' : '#FEE2E2',
  },
  timelineRightCol: {
    flex: 1.15,
    minWidth: 0,
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    display: 'flex',
    flexDirection: 'column',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#334155' : '#E2E8F0',
  },
  detailHeaderBadge: {
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  detailHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  detailTimeMeta: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  detailPhotoShowcaseCard: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  detailShowcaseImage: {
    width: '100%',
    height: '100%',
  },
  detailPhotoActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailPhotoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#CBD5E1',
  },
  detailPhotoActionBtnActive: {
    backgroundColor: isDark ? 'rgba(5, 150, 105, 0.25)' : '#DCFCE7',
    borderColor: '#059669',
  },
  detailPhotoActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailNoPhotoBox: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: isDark ? '#475569' : '#CBD5E1',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  detailNoPhotoIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  detailNoPhotoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  detailNoPhotoSubtitle: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 320,
  },
  detailAttachPhotoBtn: {
    backgroundColor: isDark ? '#334155' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? '#475569' : '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  detailAttachPhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  detailMainInfoCard: {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E2E8F0',
  },
  detailCategoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCategoryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  detailCategoryName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailAmountBox: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  detailAmountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  detailAmountValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#DC2626',
  },
  detailNoteCard: {
    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#E2E8F0',
    marginTop: 4,
  },
  detailNoteHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  detailNoteContent: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  detailChangePhotoBtn: {
    backgroundColor: isDark ? '#334155' : '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  detailChangePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  detailDeleteBtn: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  detailDeleteBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  detailSelectPromptBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  detailSelectPromptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  detailSelectPromptSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 16,
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
  timelineModalBottom: {
    paddingTop: 12,
    marginTop: 8,
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
    gap: 16,
    marginBottom: 24,
  },
  widgetsRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  widgetCol: {
    flex: 1,
  },
  reminderCardWrap: {
    backgroundColor: '#EDE9FE',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
    minHeight: 290,
  },
  reminderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#4C1D95',
  },
});

