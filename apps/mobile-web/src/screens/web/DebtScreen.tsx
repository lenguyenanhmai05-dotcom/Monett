import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  DebtItem,
  DebtType,
  loadDebtItems,
  saveDebtItems,
  preloadDebtFromAsyncStorage,
  subscribeDebtUpdates,
  calculateDebtDaysRemaining,
} from '../../services/debtStorage';

// =========================================================================
// SVG VECTOR ICONS (Zero emojis, pristine vector design)
// =========================================================================
const SvgBook: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#221D18' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20V22H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SvgArrowUpRight: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#064E3B' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7 17L17 7M17 7H7M17 7V17" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SvgArrowDownLeft: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#991B1B' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17 7L7 17M7 17H17M7 17V7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SvgPlus: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#064E3B',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  </View>
);

const SvgClose: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 18,
  color = '#221D18',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  </View>
);

const SvgCalendar: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = '#78716C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth="1.8" />
    <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.8" />
  </Svg>
);

const SvgCheckCircle: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#059669' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <Path d="M9 12L11 14L15 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SvgCheck: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#059669' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 13L9 17L19 7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SvgTrash: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = '#EF4444' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <Path
      d="M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SvgPencil: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#0284C7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M16.5 3.5C16.8978 3.10217 17.4374 2.87868 18 2.87868C18.5626 2.87868 19.1022 3.10217 19.5 3.5C19.8978 3.89782 20.1213 4.43739 20.1213 5C20.1213 5.56261 19.8978 6.10217 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SvgCash: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#854D0E' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="6" width="20" height="12" rx="2" stroke={color} strokeWidth="1.8" />
    <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth="1.8" />
    <Line x1="6" y1="12" x2="6.01" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="18" y1="12" x2="18.01" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const SvgHandshake: React.FC<{ size?: number; color?: string }> = ({ size = 28, color = '#221D18' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 15H6L2 11L7 6L12 11"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13 9H18L22 13L17 18L12 13"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AVATAR_PALETTE = [
  { bg: '#DCFCE7', text: '#065F46' }, // Mint
  { bg: '#FEF3C7', text: '#92400E' }, // Amber
  { bg: '#E0F2FE', text: '#075985' }, // Sky
  { bg: '#FCE7F3', text: '#9D174D' }, // Rose
  { bg: '#EDE9FE', text: '#5B21B6' }, // Purple
  { bg: '#FFEDD5', text: '#9A3412' }, // Orange
];

interface DebtScreenProps {
  onNavigateToTab?: (tab: any) => void;
  onBack?: () => void;
}

export const DebtScreen: React.FC<DebtScreenProps> = ({ onNavigateToTab, onBack }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const { addNotification } = useNotifications();
  const isVi = language === 'vi';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigateToTab) {
      onNavigateToTab('home');
    }
  };

  // Sub-tab: 'lent' (Cho mượn / người khác nợ mình) vs 'borrowed' (Đang vay / mình nợ người khác)
  const [activeTab, setActiveTab] = useState<DebtType>('lent');
  // Filter within tab: 'all' | 'unsettled' | 'settled'
  const [filterMode, setFilterMode] = useState<'all' | 'unsettled' | 'settled'>('all');

  const userEmail = (user as any)?.email || '';
  const userId = user?.id || (user as any)?._id || '';

  // Debt items state
  const [debts, setDebts] = useState<DebtItem[]>(() => loadDebtItems(userId, userEmail));

  // Khi đổi tài khoản hoặc màn hình mở lên, nạp đồng bộ & nạp bất đồng bộ từ AsyncStorage
  useEffect(() => {
    const loaded = loadDebtItems(userId, userEmail);
    if (loaded && loaded.length > 0) {
      setDebts(loaded);
    }
    preloadDebtFromAsyncStorage(userId, userEmail).then((res) => {
      if (res && res.length > 0) {
        setDebts(res);
      }
    });
  }, [userId, userEmail]);

  // Lắng nghe sự kiện cập nhật tức thì từ storage
  useEffect(() => {
    const unsubscribe = subscribeDebtUpdates(() => {
      setDebts(loadDebtItems(userId, userEmail));
    });
    return unsubscribe;
  }, [userId, userEmail]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);

  // Form Fields
  const [formPersonName, setFormPersonName] = useState('');
  const [formAmountStr, setFormAmountStr] = useState('');
  const [formPaidStr, setFormPaidStr] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formType, setFormType] = useState<DebtType>('lent');
  const [focusedField, setFocusedField] = useState<string | null>('personName');

  // Repayment / Collection Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState<DebtItem | null>(null);
  const [payAmountStr, setPayAmountStr] = useState('');
  const [payNoteStr, setPayNoteStr] = useState('');
  const [payFocusedField, setPayFocusedField] = useState<string | null>('payAmount');

  // Mini Calendar Date Picker State
  const [pickerDate, setPickerDate] = useState<Date>(new Date());
  const [activeDatePickerField, setActiveDatePickerField] = useState<'startDate' | 'dueDate' | null>(null);

  const pickerYear = pickerDate.getFullYear();
  const pickerMonth = pickerDate.getMonth();
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const firstDow = (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7; // Monday = 0
  const calendarCells: (number | null)[] = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [firstDow, daysInMonth]);

  const parseDateStr = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1900 && y < 2100) {
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return dt;
      }
    }
    return null;
  };

  const toggleDatePicker = (field: 'startDate' | 'dueDate') => {
    if (activeDatePickerField === field) {
      setActiveDatePickerField(null);
    } else {
      const val = field === 'startDate' ? formStartDate : formDueDate;
      const parsed = parseDateStr(val);
      setPickerDate(parsed || new Date());
      setActiveDatePickerField(field);
    }
  };

  const handleSelectCalendarDay = (day: number) => {
    const mm = String(pickerDate.getMonth() + 1).padStart(2, '0');
    const yyyy = pickerDate.getFullYear();
    const dd = String(day).padStart(2, '0');
    const formatted = `${dd}/${mm}/${yyyy}`;

    if (activeDatePickerField === 'dueDate') {
      setFormDueDate(formatted);
    } else if (activeDatePickerField === 'startDate') {
      setFormStartDate(formatted);
    }
    setActiveDatePickerField(null);
  };

  const handlePrevPickerMonth = () => {
    setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1));
  };

  const handleNextPickerMonth = () => {
    setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1));
  };

  const handleAmountInputChange = (text: string, setter: (val: string) => void) => {
    const raw = text.replace(/\D/g, '');
    if (!raw) {
      setter('');
      return;
    }
    const num = parseInt(raw, 10);
    setter(num.toLocaleString('vi-VN'));
  };

  const formatVND = (num: number) => {
    if (!num || isNaN(num)) return '0';
    return Math.round(num).toLocaleString('vi-VN');
  };

  const getTodayStr = () => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  };

  // Debts filtered by active type
  const currentTabDebts = useMemo(() => {
    return debts.filter((d) => d.type === activeTab);
  }, [debts, activeTab]);

  // Statistics calculation for the current active tab
  const stats = useMemo(() => {
    const totalAmount = currentTabDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalPaid = currentTabDebts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
    const totalRemaining = Math.max(0, totalAmount - totalPaid);
    const unsettledCount = currentTabDebts.filter((d) => !d.isSettled).length;
    const settledCount = currentTabDebts.filter((d) => d.isSettled).length;
    const completionPercent = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

    return {
      totalAmount,
      totalPaid,
      totalRemaining,
      unsettledCount,
      settledCount,
      completionPercent,
    };
  }, [currentTabDebts]);

  // Items filtered by sub-filter mode
  const displayedDebts = useMemo(() => {
    if (filterMode === 'unsettled') return currentTabDebts.filter((d) => !d.isSettled);
    if (filterMode === 'settled') return currentTabDebts.filter((d) => d.isSettled);
    return currentTabDebts;
  }, [currentTabDebts, filterMode]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingDebt(null);
    setFormType(activeTab);
    setFormPersonName('');
    setFormAmountStr('');
    setFormPaidStr('');
    setFormStartDate(getTodayStr());
    setFormDueDate('');
    setFormNote('');
    setActiveDatePickerField(null);
    setFocusedField('personName');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (debt: DebtItem) => {
    setEditingDebt(debt);
    setFormType(debt.type);
    setFormPersonName(debt.personName);
    setFormAmountStr(debt.amount ? Number(debt.amount).toLocaleString('vi-VN') : '');
    setFormPaidStr(debt.paidAmount ? Number(debt.paidAmount).toLocaleString('vi-VN') : '');
    setFormStartDate(debt.startDate || getTodayStr());
    setFormDueDate(debt.dueDate || '');
    setFormNote(debt.note || '');
    setActiveDatePickerField(null);
    setFocusedField('personName');
    setIsFormModalOpen(true);
  };

  // Save Debt (Create or Update)
  const handleSaveDebt = () => {
    const name = formPersonName.trim();
    if (!name) {
      alert(isVi ? 'Vui lòng nhập tên người vay / cho mượn' : 'Please enter person name');
      return;
    }

    const cleanAmountStr = formAmountStr.replace(/\D/g, '');
    const amountNum = parseInt(cleanAmountStr, 10);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      alert(isVi ? 'Vui lòng nhập số tiền nợ hợp lệ' : 'Please enter a valid amount');
      return;
    }

    const cleanPaidStr = formPaidStr.replace(/\D/g, '');
    const paidNum = cleanPaidStr ? parseInt(cleanPaidStr, 10) : 0;
    const isSettled = paidNum >= amountNum;

    if (editingDebt) {
      // Update existing
      const next = debts.map((item) =>
        item.id === editingDebt.id
          ? {
              ...item,
              personName: name,
              amount: amountNum,
              paidAmount: paidNum,
              type: formType,
              startDate: formStartDate || getTodayStr(),
              dueDate: formDueDate ? formDueDate.trim() : undefined,
              note: formNote.trim(),
              isSettled,
            }
          : item
      );
      setDebts(next);
      saveDebtItems(next, userId, userEmail);
      addNotification({
        type: 'moment',
        title: isVi ? 'Cập nhật sổ ghi nợ 📝' : 'Debt Updated 📝',
        message: isVi
          ? `Đã cập nhật khoản nợ của "${name}" (${amountNum.toLocaleString('vi-VN')} đ)`
          : `Updated debt record for "${name}" (${amountNum.toLocaleString('vi-VN')} VND)`,
        iconBg: '#EDE9FE',
        iconColor: '#7C3AED',
        metadata: { targetTab: 'debt' },
      });
    } else {
      // Create new
      const newDebt: DebtItem = {
        id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        personName: name,
        amount: amountNum,
        paidAmount: paidNum,
        type: formType,
        startDate: formStartDate || getTodayStr(),
        dueDate: formDueDate ? formDueDate.trim() : undefined,
        note: formNote.trim(),
        isSettled,
        createdAt: new Date().toISOString(),
        payments: paidNum > 0 ? [{ id: `pay_${Date.now()}`, amount: paidNum, date: getTodayStr(), note: 'Khoản đã trả ban đầu' }] : [],
      };
      const next = [newDebt, ...debts.filter((d) => d.id !== newDebt.id)];
      setDebts(next);
      saveDebtItems(next, userId, userEmail);
      addNotification({
        type: 'moment',
        title: isVi
          ? (formType === 'lent' ? 'Ghi khoản cho mượn mới 🤝' : 'Ghi khoản vay mới 📝')
          : (formType === 'lent' ? 'New Loan Added 🤝' : 'New Debt Added 📝'),
        message: isVi
          ? `${formType === 'lent' ? 'Cho' : 'Vay từ'} ${name} số tiền ${amountNum.toLocaleString('vi-VN')} đ`
          : `${formType === 'lent' ? 'Lent to' : 'Borrowed from'} ${name} ${amountNum.toLocaleString('vi-VN')} VND`,
        iconBg: formType === 'lent' ? '#DCFCE7' : '#FEF3C7',
        iconColor: formType === 'lent' ? '#059669' : '#D97706',
        metadata: { targetTab: 'debt' },
      });
    }

    setIsFormModalOpen(false);
  };

  // Toggle settled status directly
  const handleToggleSettled = (debt: DebtItem) => {
    const next = debts.map((item) => {
      if (item.id === debt.id) {
        const nextSettled = !item.isSettled;
        return {
          ...item,
          isSettled: nextSettled,
          paidAmount: nextSettled ? item.amount : 0,
        };
      }
      return item;
    });
    setDebts(next);
    saveDebtItems(next, userId, userEmail);
  };

  // Delete debt
  const handleDeleteDebt = (id: string) => {
    const confirmMsg = isVi ? 'Bạn có chắc chắn muốn xóa khoản nợ này?' : 'Delete this debt item?';
    const doDelete = () => {
      const next = debts.filter((d) => d.id !== id);
      setDebts(next);
      saveDebtItems(next, userId, userEmail);
    };
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        doDelete();
      }
    } else {
      doDelete();
    }
  };

  // Open Repayment / Collection modal
  const handleOpenPayModal = (debt: DebtItem) => {
    setPayingDebt(debt);
    const remaining = Math.max(0, debt.amount - debt.paidAmount);
    setPayAmountStr(remaining > 0 ? Number(remaining).toLocaleString('vi-VN') : '');
    setPayNoteStr(debt.type === 'lent' ? 'Thu nợ tiền mặt' : 'Chuyển khoản thanh toán');
    setPayFocusedField('payAmount');
    setIsPayModalOpen(true);
  };

  // Submit Repayment / Collection
  const handleSubmitPayment = () => {
    if (!payingDebt) return;
    const cleanStr = payAmountStr.replace(/\D/g, '');
    const amountNum = parseInt(cleanStr, 10);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      alert(isVi ? 'Vui lòng nhập số tiền thanh toán hợp lệ' : 'Please enter a valid amount');
      return;
    }

    const next = debts.map((item) => {
      if (item.id === payingDebt.id) {
        const newPaid = item.paidAmount + amountNum;
        const isSettled = newPaid >= item.amount;
        const newPayment = {
          id: `pay_${Date.now()}`,
          amount: amountNum,
          date: getTodayStr(),
          note: payNoteStr.trim(),
        };
        return {
          ...item,
          paidAmount: newPaid,
          isSettled,
          payments: [...(item.payments || []), newPayment],
        };
      }
      return item;
    });
    setDebts(next);
    saveDebtItems(next, userId, userEmail);

    addNotification({
      type: 'moment',
      title: isVi
        ? (payingDebt.type === 'lent' ? 'Thu hồi nợ thành công 💵' : 'Đã trả bớt nợ 💳')
        : 'Debt Payment Recorded 💳',
      message: isVi
        ? `Đã ghi nhận ${amountNum.toLocaleString('vi-VN')} đ từ "${payingDebt.personName}"`
        : `Recorded ${amountNum.toLocaleString('vi-VN')} VND for "${payingDebt.personName}"`,
      iconBg: '#DCFCE7',
      iconColor: '#059669',
      metadata: { targetTab: 'debt' },
    });

    setIsPayModalOpen(false);
  };

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: isDark ? '#0B0F17' : '#F5F0E8' }]}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        <View style={styles.headerRow}>
          <Text style={[styles.screenHeading, isDark && { color: '#F8FAFC' }]}>
            {isVi ? 'Sổ ghi nợ' : 'Debt Book'}
          </Text>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={isDark ? '#F8FAFC' : '#221D18'} />
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* 2. TOP BAR: SUB-TABS (Cho mượn / Đang vay) & ACTION BUTTON */}
        {/* ========================================================================= */}
        <View style={styles.topControlRow}>
          {/* Sub-tab Switcher: Cho mượn (Lent) vs Đang vay (Borrowed) */}
          <View style={styles.tabSwitchGroup}>
            <TouchableOpacity
              style={[styles.tabSwitchPill, activeTab === 'lent' && styles.tabSwitchPillActive]}
              onPress={() => setActiveTab('lent')}
              activeOpacity={0.8}
            >
              <SvgArrowUpRight size={15} color={activeTab === 'lent' ? '#FFFFFF' : '#78716C'} />
              <Text
                style={[
                  styles.tabSwitchText,
                  activeTab === 'lent' && styles.tabSwitchTextActive,
                ]}
              >
                {isVi ? 'Cho mượn' : 'Lent (Receivable)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabSwitchPill, activeTab === 'borrowed' && styles.tabSwitchPillActive]}
              onPress={() => setActiveTab('borrowed')}
              activeOpacity={0.8}
            >
              <SvgArrowDownLeft size={15} color={activeTab === 'borrowed' ? '#FFFFFF' : '#78716C'} />
              <Text
                style={[
                  styles.tabSwitchText,
                  activeTab === 'borrowed' && styles.tabSwitchTextActive,
                ]}
              >
                {isVi ? 'Đang vay' : 'Borrowed (Payable)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Button: + Ghi nợ mới */}
          <TouchableOpacity
            style={styles.createDebtBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.85}
          >
            <SvgPlus size={16} color="#064E3B" style={{ marginRight: 6 }} />
            <Text style={styles.createDebtBtnText}>
              {activeTab === 'lent'
                ? isVi
                  ? 'Ghi khoản mượn'
                  : 'Add Lent'
                : isVi
                  ? 'Ghi khoản vay'
                  : 'Add Borrowed'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* 2. OVERVIEW STAT CARDS (GIỐNG TRANG SỰ KIỆN) */}
        {/* ========================================================================= */}
        {isDesktop ? (
          /* ================= GIAO DIỆN WEB: 3 Ô NGANG HÀNG ================= */
          <View style={styles.statsGrid}>
            {/* Card 1: Tổng đang cho mượn / Tổng nợ cần trả (#064E3B) */}
            <View
              style={[
                styles.statCard,
                styles.statCardDark,
                isDark && {
                  backgroundColor: '#0D2018',
                  borderColor: 'rgba(16, 185, 129, 0.35)',
                  shadowColor: '#000',
                },
              ]}
            >
              <View style={[styles.statCardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={styles.statCardLabelDark}>
                  {activeTab === 'lent'
                    ? isVi
                      ? 'TỔNG ĐANG CHO MƯỢN'
                      : 'TOTAL RECEIVABLE'
                    : isVi
                      ? 'TỔNG NỢ CẦN TRẢ'
                      : 'TOTAL PAYABLE'}
                </Text>
                <View style={[styles.percentBadge, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.2)' }]}>
                  <Text style={[styles.percentBadgeText, isDark && { color: '#34D399' }]}>{stats.completionPercent}%</Text>
                </View>
              </View>

              <Text style={styles.statCardValueDark} numberOfLines={1}>
                {formatVND(stats.totalRemaining)} <Text style={styles.currencySubDark}>đ</Text>
              </Text>

              <View style={styles.cardDarkDivider} />

              <Text style={styles.statCardSubDark}>
                {stats.unsettledCount}{' '}
                {activeTab === 'lent'
                  ? isVi
                    ? `người chưa trả · Tổng: ${formatVND(stats.totalAmount)} đ`
                    : `unpaid · Total: ${formatVND(stats.totalAmount)} đ`
                  : isVi
                    ? `khoản chưa trả · Tổng: ${formatVND(stats.totalAmount)} đ`
                    : `unpaid · Total: ${formatVND(stats.totalAmount)} đ`}
              </Text>
            </View>

            {/* Card 2: Đã thu hồi / Đã trả bớt (thẻ mint giống Sự kiện) */}
            <View
              style={[
                styles.statCard,
                styles.statCardMint,
                isDark && {
                  backgroundColor: '#0F261D',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                },
              ]}
            >
              <View style={styles.cardHeaderLeftWrap}>
                <Ionicons name="sparkles" size={17} color={isDark ? '#34D399' : '#047857'} style={{ marginRight: 6 }} />
                <Text
                  style={[
                    styles.statCardLabelPastel,
                    { color: isDark ? '#34D399' : '#047857' },
                  ]}
                  numberOfLines={1}
                >
                  {activeTab === 'lent'
                    ? isVi
                      ? 'Đã thu hồi'
                      : 'Recovered'
                    : isVi
                      ? 'Đã trả bớt'
                      : 'Repaid'}
                </Text>
              </View>

              <Text
                style={[
                  styles.cardMintAmount,
                  { color: isDark ? '#F8FAFC' : '#047857' },
                ]}
                numberOfLines={1}
              >
                {formatVND(stats.totalPaid)} <Text style={{ fontSize: 16, fontWeight: '700' }}>đ</Text>
              </Text>

              <Text
                style={[
                  styles.statCardSubPastel,
                  { color: isDark ? '#6EE7B7' : '#065F46' },
                ]}
                numberOfLines={1}
              >
                {stats.completionPercent}%{' '}
                {activeTab === 'lent'
                  ? isVi
                    ? 'thu hồi xong'
                    : 'collected'
                  : isVi
                    ? 'đã thanh toán'
                    : 'paid off'}
              </Text>
            </View>

            {/* Card 3: Số khoản (thẻ vàng pastel giống Sự kiện) */}
            <View
              style={[
                styles.statCard,
                styles.statCardBlue,
                isDark && { backgroundColor: '#241B0E', borderColor: 'rgba(245, 158, 11, 0.3)' },
              ]}
            >
              <View style={styles.cardHeaderLeftWrap}>
                <Ionicons name="time-outline" size={17} color={isDark ? '#FBBF24' : '#B45309'} style={{ marginRight: 6 }} />
                <Text
                  style={[styles.statCardLabelBlue, isDark && { color: '#FBBF24' }]}
                  numberOfLines={1}
                >
                  {isVi ? 'Số khoản' : 'Debts count'}
                </Text>
              </View>

              <Text
                style={[styles.cardSkyAmount, isDark && { color: '#F8FAFC' }]}
                numberOfLines={1}
              >
                {currentTabDebts.length}
              </Text>

              <Text
                style={[styles.statCardSubBlue, isDark && { color: '#FDE68A' }]}
                numberOfLines={1}
              >
                {stats.unsettledCount}{' '}
                {activeTab === 'lent'
                  ? isVi
                    ? 'khoản theo dõi'
                    : 'active lent'
                  : isVi
                    ? 'khoản đang nợ'
                    : 'active debts'}
              </Text>
            </View>
          </View>
        ) : (
          /* ================= GIAO DIỆN MOBILE: (1 Ô TRÊN + 2 Ô DƯỚI) ================= */
          <View style={styles.statsContainer}>
            {/* Card 1: Tổng đang cho mượn / Tổng nợ cần trả (#221D18 - Hẹp lại / thon gọn) */}
            <View style={[styles.statCard, styles.statCardDark, styles.statCardDarkSlim]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabelDark}>
                  {activeTab === 'lent'
                    ? isVi
                      ? 'TỔNG ĐANG CHO MƯỢN'
                      : 'TOTAL RECEIVABLE'
                    : isVi
                      ? 'TỔNG NỢ CẦN TRẢ'
                      : 'TOTAL PAYABLE'}
                </Text>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentBadgeText}>{stats.completionPercent}%</Text>
                </View>
              </View>

              <Text style={styles.statCardValueDark} numberOfLines={1}>
                {formatVND(stats.totalRemaining)} <Text style={styles.currencySubDark}>đ</Text>
              </Text>

              <View style={styles.cardDarkDivider} />

              <Text style={styles.statCardSubDark}>
                {stats.unsettledCount}{' '}
                {activeTab === 'lent'
                  ? isVi
                    ? `người chưa trả · Tổng: ${formatVND(stats.totalAmount)} đ`
                    : `unpaid · Total: ${formatVND(stats.totalAmount)} đ`
                  : isVi
                    ? `khoản chưa trả · Tổng: ${formatVND(stats.totalAmount)} đ`
                    : `unpaid · Total: ${formatVND(stats.totalAmount)} đ`}
              </Text>
            </View>

            {/* Gộp Tab 2 & Tab 3: Bên trái là Tab 3 (Số khoản), bên phải là Tab 2 (Đã thu hồi / Đã trả bớt) */}
            <View style={styles.twoCardsRow}>
              {/* Bên trái: Tab 3 (Số khoản - thẻ vàng) */}
              <View
                style={[
                  styles.statCard,
                  styles.statCardBlue,
                  styles.halfCard,
                  isDark && { backgroundColor: '#241B0E', borderColor: 'rgba(245, 158, 11, 0.3)' },
                ]}
              >
                <View style={styles.statCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <SvgBook size={15} color={isDark ? '#FBBF24' : '#B45309'} />
                    <Text
                      style={[styles.statCardLabelBlue, isDark && { color: '#FBBF24' }]}
                      numberOfLines={1}
                    >
                      {isVi ? 'Số khoản' : 'Debts count'}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.halfCardAmountBlue, isDark && { color: '#F8FAFC' }]}
                  numberOfLines={1}
                >
                  {currentTabDebts.length}
                </Text>

                <Text
                  style={[styles.statCardSubBlue, isDark && { color: '#FDE68A' }]}
                  numberOfLines={1}
                >
                  {stats.unsettledCount}{' '}
                  {activeTab === 'lent'
                    ? isVi
                      ? 'khoản theo dõi'
                      : 'active lent'
                    : isVi
                      ? 'khoản đang nợ'
                      : 'active debts'}
                </Text>
              </View>

              {/* Bên phải: Tab 2 (Đã thu hồi / Đã trả bớt - thẻ mint / pink) */}
              <View
                style={[
                  styles.statCard,
                  activeTab === 'lent' ? styles.statCardMint : styles.statCardPink,
                  styles.halfCard,
                  isDark && {
                    backgroundColor: activeTab === 'lent' ? '#0F261D' : '#2A1215',
                    borderColor: activeTab === 'lent' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  },
                ]}
              >
                <View style={styles.statCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <SvgCheckCircle
                      size={15}
                      color={isDark ? (activeTab === 'lent' ? '#34D399' : '#F87171') : (activeTab === 'lent' ? '#065F46' : '#7F1D1D')}
                    />
                    <Text
                      style={[
                        styles.statCardLabelPastel,
                        { color: isDark ? (activeTab === 'lent' ? '#34D399' : '#F87171') : (activeTab === 'lent' ? '#065F46' : '#7F1D1D') },
                      ]}
                      numberOfLines={1}
                    >
                      {activeTab === 'lent'
                        ? isVi
                          ? 'Đã thu hồi'
                          : 'Recovered'
                        : isVi
                          ? 'Đã trả bớt'
                          : 'Repaid'}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.halfCardAmountPastel,
                    { color: isDark ? '#F8FAFC' : (activeTab === 'lent' ? '#065F46' : '#7F1D1D') },
                  ]}
                  numberOfLines={1}
                >
                  {formatVND(stats.totalPaid)} <Text style={{ fontSize: 13, fontWeight: '700' }}>đ</Text>
                </Text>

                <Text
                  style={[
                    styles.statCardSubPastel,
                    { color: isDark ? (activeTab === 'lent' ? '#6EE7B7' : '#FCA5A5') : (activeTab === 'lent' ? '#065F46' : '#7F1D1D') },
                  ]}
                  numberOfLines={1}
                >
                  {stats.completionPercent}%{' '}
                  {activeTab === 'lent'
                    ? isVi
                      ? 'thu hồi xong'
                      : 'collected'
                    : isVi
                      ? 'đã thanh toán'
                      : 'paid off'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 3. LIST SECTION HEADER & FILTER PILLS */}
        {/* ========================================================================= */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'lent'
                ? isVi
                  ? 'Danh sách cho mượn'
                  : 'Lent List'
                : isVi
                  ? 'Danh sách đang vay'
                  : 'Borrowed List'}
            </Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {displayedDebts.length} {isVi ? 'mục' : 'items'}
              </Text>
            </View>
          </View>

          {/* Filter Pills: Tất cả / Chưa trả / Đã xong */}
          <View style={styles.filterPillsGroup}>
            <TouchableOpacity
              style={[styles.filterPill, filterMode === 'all' && styles.filterPillActive]}
              onPress={() => setFilterMode('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, filterMode === 'all' && styles.filterPillTextActive]}>
                {isVi ? 'Tất cả' : 'All'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filterMode === 'unsettled' && styles.filterPillActive]}
              onPress={() => setFilterMode('unsettled')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, filterMode === 'unsettled' && styles.filterPillTextActive]}>
                {isVi ? 'Chưa trả' : 'Unpaid'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filterMode === 'settled' && styles.filterPillActive]}
              onPress={() => setFilterMode('settled')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, filterMode === 'settled' && styles.filterPillTextActive]}>
                {isVi ? 'Đã xong' : 'Settled'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 4. MAIN DEBT LIST OR EMPTY STATE */}
        {/* ========================================================================= */}
        {displayedDebts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <SvgHandshake size={34} color="#221D18" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'lent'
                ? isVi
                  ? 'Chưa có khoản cho mượn nào'
                  : 'No lent debts recorded'
                : isVi
                  ? 'Chưa có khoản vay nào'
                  : 'No borrowed debts recorded'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'lent'
                ? isVi
                  ? 'Ghi lại các khoản tiền bạn cho bạn bè, người thân vay mượn để quản lý thu hồi dễ dàng.'
                  : 'Track money you lend to friends or family to stay on top of receivables.'
                : isVi
                  ? 'Ghi lại các khoản tiền bạn đang vay để theo dõi hạn trả và chủ động ngân sách.'
                  : 'Track money you borrow to ensure timely repayments and clear budgeting.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.85}
            >
              <SvgPlus size={16} color="#064E3B" style={{ marginRight: 6 }} />
              <Text style={styles.emptyAddBtnText}>
                {activeTab === 'lent'
                  ? isVi
                    ? 'Ghi cho mượn mới'
                    : 'Add Lent Item'
                  : isVi
                    ? 'Ghi khoản vay mới'
                    : 'Add Borrowed Item'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.debtList, isDesktop && styles.debtListDesktop]}>
            {displayedDebts.map((debt) => {
              const remaining = Math.max(0, debt.amount - debt.paidAmount);
              const percent = debt.amount > 0 ? Math.min(100, Math.round((debt.paidAmount / debt.amount) * 100)) : 0;
              const daysInfo = calculateDebtDaysRemaining(debt.dueDate);
              const avatarColor = getAvatarColor(debt.personName);

              return (
                <View key={debt.id} style={[styles.debtCard, isDesktop && styles.debtCardDesktop]}>
                  {/* Card Top Row */}
                  <View style={styles.debtCardTop}>
                    <View style={styles.personGroup}>
                      <View style={[styles.avatarCircle, { backgroundColor: avatarColor.bg }]}>
                        <Text style={[styles.avatarText, { color: avatarColor.text }]}>
                          {debt.personName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.personNameText} numberOfLines={1}>
                          {debt.personName}
                        </Text>
                        <Text style={styles.noteText} numberOfLines={1}>
                          {debt.note || (isVi ? 'Không có ghi chú' : 'No note')}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View style={styles.badgeWrapper}>
                      {debt.isSettled ? (
                        <View style={[styles.statusBadge, styles.statusBadgeSettled]}>
                          <SvgCheck size={12} color="#047857" />
                          <Text style={styles.statusBadgeSettledText}>
                            {isVi ? 'Đã xong' : 'Settled'}
                          </Text>
                        </View>
                      ) : daysInfo.isPast ? (
                        <View style={[styles.statusBadge, styles.statusBadgePast]}>
                          <Text style={styles.statusBadgePastText}>{daysInfo.text}</Text>
                        </View>
                      ) : daysInfo.isToday ? (
                        <View style={[styles.statusBadge, styles.statusBadgeToday]}>
                          <Text style={styles.statusBadgeTodayText}>{daysInfo.text}</Text>
                        </View>
                      ) : debt.dueDate ? (
                        <View style={[styles.statusBadge, styles.statusBadgeNormal]}>
                          <Text style={styles.statusBadgeNormalText}>{daysInfo.text}</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, styles.statusBadgeNeutral]}>
                          <Text style={styles.statusBadgeNeutralText}>
                            {isVi ? 'Không hạn' : 'No due'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Card Middle: Balance & Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.balanceRow}>
                      <View>
                        <Text style={styles.balanceLabel}>
                          {debt.isSettled
                            ? isVi
                              ? 'ĐÃ THANH TOÁN ĐỦ'
                              : 'FULLY SETTLED'
                            : activeTab === 'lent'
                              ? isVi
                                ? 'CÒN CẦN THU'
                                : 'REMAINING'
                              : isVi
                                ? 'CÒN NỢ'
                                : 'REMAINING'}
                        </Text>
                        <Text style={styles.balanceValue}>
                          {formatVND(remaining)} <Text style={styles.currencySmall}>đ</Text>
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.totalLabel}>
                          {isVi ? 'Tổng tiền' : 'Total'}: {formatVND(debt.amount)} đ
                        </Text>
                        <Text style={styles.paidLabel}>
                          {isVi ? 'Đã trả' : 'Paid'}: {formatVND(debt.paidAmount)} đ ({percent}%)
                        </Text>
                      </View>
                    </View>

                    {/* Progress Track */}
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percent}%`,
                            backgroundColor: debt.isSettled
                              ? '#10B981'
                              : activeTab === 'lent'
                                ? '#059669'
                                : '#F59E0B',
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Card Bottom: Dates & Action Buttons */}
                  <View style={styles.debtCardBottom}>
                    <View style={styles.datesRow}>
                      <View style={styles.dateCol}>
                        <SvgCalendar size={13} color="#78716C" />
                        <Text style={styles.dateText}>
                          {isVi ? 'Bắt đầu' : 'Start'}: {debt.startDate}
                        </Text>
                      </View>

                      {debt.dueDate && (
                        <View style={styles.dateCol}>
                          <Text style={styles.dateText}>
                            {isVi ? 'Hạn' : 'Due'}: {debt.dueDate}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardActionsGroup}>
                      {/* Repayment / Partial payment button */}
                      {!debt.isSettled && (
                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() => handleOpenPayModal(debt)}
                          activeOpacity={0.8}
                        >
                          <SvgCash size={14} color="#854D0E" />
                          <Text style={styles.payBtnText}>
                            {activeTab === 'lent'
                              ? isVi
                                ? 'Thu nợ'
                                : 'Collect'
                              : isVi
                                ? 'Trả bớt'
                                : 'Pay'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Toggle complete button */}
                      <TouchableOpacity
                        style={[
                          styles.toggleSettleBtn,
                          debt.isSettled && styles.toggleSettleBtnDone,
                        ]}
                        onPress={() => handleToggleSettled(debt)}
                        activeOpacity={0.8}
                      >
                        <SvgCheck
                          size={14}
                          color={debt.isSettled ? '#047857' : '#78716C'}
                        />
                        <Text
                          style={[
                            styles.toggleSettleBtnText,
                            debt.isSettled && styles.toggleSettleBtnDoneText,
                          ]}
                        >
                          {debt.isSettled
                            ? isVi
                              ? 'Đã tất toán'
                              : 'Done'
                            : isVi
                              ? 'Tất toán'
                              : 'Mark Done'}
                        </Text>
                      </TouchableOpacity>

                      {/* Edit button */}
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => handleOpenEditModal(debt)}
                        activeOpacity={0.7}
                      >
                        <SvgPencil size={14} color="#0284C7" />
                      </TouchableOpacity>

                      {/* Delete button */}
                      <TouchableOpacity
                        style={[styles.iconBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteDebt(debt.id)}
                        activeOpacity={0.7}
                      >
                        <SvgTrash size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* 5. MODAL: ADD / EDIT DEBT ITEM */}
      {/* ========================================================================= */}
      <Modal
        visible={isFormModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setActiveDatePickerField(null);
          setIsFormModalOpen(false);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setActiveDatePickerField(null);
            setIsFormModalOpen(false);
          }}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.modalDialogCard,
                  isDark && { backgroundColor: '#1E293B', borderColor: '#334155' },
                ]}
              >
                {/* Modal Header */}
                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.modalHeading, isDark && { color: '#F8FAFC' }]}>
                    {editingDebt
                      ? isVi
                        ? 'Chỉnh sửa khoản nợ'
                        : 'Edit Debt Item'
                      : formType === 'lent'
                        ? isVi
                          ? 'Ghi khoản cho mượn mới'
                          : 'Record New Lent Item'
                        : isVi
                          ? 'Ghi khoản vay mới'
                          : 'Record New Borrowed Item'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.modalCloseBtn, isDark && { backgroundColor: '#334155' }]}
                    onPress={() => {
                      setActiveDatePickerField(null);
                      setIsFormModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <SvgClose size={16} color={isDark ? '#CBD5E1' : '#78716C'} />
                  </TouchableOpacity>
                </View>

                {/* Type Switcher inside Modal */}
                <View style={[styles.modalTypeSwitchRow, isDark && { backgroundColor: '#0F172A' }]}>
                  <TouchableOpacity
                    style={[
                      styles.modalTypePill,
                      formType === 'lent' && styles.modalTypePillActive,
                      formType === 'lent' && isDark && { backgroundColor: '#1E293B' },
                    ]}
                    onPress={() => setFormType('lent')}
                  >
                    <Text
                      style={[
                        styles.modalTypePillText,
                        isDark && { color: '#94A3B8' },
                        formType === 'lent' && styles.modalTypePillTextActive,
                        formType === 'lent' && isDark && { color: '#F8FAFC' },
                      ]}
                    >
                      {isVi ? 'Cho mượn (Người khác nợ)' : 'Lent (Receivable)'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalTypePill,
                      formType === 'borrowed' && styles.modalTypePillActive,
                      formType === 'borrowed' && isDark && { backgroundColor: '#1E293B' },
                    ]}
                    onPress={() => setFormType('borrowed')}
                  >
                    <Text
                      style={[
                        styles.modalTypePillText,
                        isDark && { color: '#94A3B8' },
                        formType === 'borrowed' && styles.modalTypePillTextActive,
                        formType === 'borrowed' && isDark && { color: '#F8FAFC' },
                      ]}
                    >
                      {isVi ? 'Đang vay (Mình nợ)' : 'Borrowed (Payable)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Scrollable Form Body */}
                <ScrollView
                  style={{ maxHeight: 420 }}
                  contentContainerStyle={{ paddingBottom: 6 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Form Inputs with Custom Focus styling (White bg + Green #059669 border) */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>
                      {formType === 'lent'
                        ? isVi
                          ? 'Tên người mượn *'
                          : 'Borrower Name *'
                        : isVi
                          ? 'Tên chủ nợ (Người cho vay) *'
                          : 'Lender Name *'}
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        isDark && { backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' },
                        focusedField === 'personName' && styles.textInputFocused,
                        focusedField === 'personName' && isDark && { backgroundColor: '#1E293B', borderColor: '#059669' },
                      ]}
                      value={formPersonName}
                      onChangeText={setFormPersonName}
                      placeholder={
                        formType === 'lent'
                          ? isVi
                            ? 'Ví dụ: Anh Tuấn, Bạn Mai...'
                            : 'e.g. John Doe'
                          : isVi
                            ? 'Ví dụ: Chị Lan, Ngân hàng...'
                            : 'e.g. Jane Smith'
                      }
                      placeholderTextColor="#A8A29E"
                      onFocus={() => {
                        setFocusedField('personName');
                        setActiveDatePickerField(null);
                      }}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>
                        {isVi ? 'Số tiền nợ (VNĐ) *' : 'Amount (VND) *'}
                      </Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          isDark && { backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' },
                          focusedField === 'amount' && styles.textInputFocused,
                          focusedField === 'amount' && isDark && { backgroundColor: '#1E293B', borderColor: '#059669' },
                        ]}
                        value={formAmountStr}
                        onChangeText={(text) => handleAmountInputChange(text, setFormAmountStr)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#A8A29E"
                        onFocus={() => {
                          setFocusedField('amount');
                          setActiveDatePickerField(null);
                        }}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>
                        {isVi ? 'Đã trả trước' : 'Initial Paid'}
                      </Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          isDark && { backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' },
                          focusedField === 'paid' && styles.textInputFocused,
                          focusedField === 'paid' && isDark && { backgroundColor: '#1E293B', borderColor: '#059669' },
                        ]}
                        value={formPaidStr}
                        onChangeText={(text) => handleAmountInputChange(text, setFormPaidStr)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#A8A29E"
                        onFocus={() => {
                          setFocusedField('paid');
                          setActiveDatePickerField(null);
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>
                        {isVi ? 'Ngày vay / mượn' : 'Start Date'}
                      </Text>
                      <View
                        style={[
                          styles.datePickerInputWrap,
                          isDark && { backgroundColor: '#0F172A', borderColor: '#334155' },
                          (focusedField === 'startDate' || activeDatePickerField === 'startDate') && styles.textInputFocused,
                          (focusedField === 'startDate' || activeDatePickerField === 'startDate') && isDark && { backgroundColor: '#1E293B', borderColor: '#059669' },
                        ]}
                      >
                        <TextInput
                          style={[
                            styles.datePickerInput,
                            isDark && { color: '#F8FAFC' },
                          ]}
                          value={formStartDate}
                          onChangeText={setFormStartDate}
                          placeholder="dd/mm/yyyy"
                          placeholderTextColor="#A8A29E"
                          onFocus={() => setFocusedField('startDate')}
                        />
                        <TouchableOpacity
                          style={styles.calendarIconBtn}
                          onPress={() => toggleDatePicker('startDate')}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={18}
                            color={activeDatePickerField === 'startDate' ? '#059669' : (isDark ? '#94A3B8' : '#78716C')}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>
                        {isVi ? 'Hạn trả nợ (Tùy chọn)' : 'Due Date (Optional)'}
                      </Text>
                      <View
                        style={[
                          styles.datePickerInputWrap,
                          isDark && { backgroundColor: '#0F172A', borderColor: '#334155' },
                          (focusedField === 'dueDate' || activeDatePickerField === 'dueDate') && styles.textInputFocused,
                          (focusedField === 'dueDate' || activeDatePickerField === 'dueDate') && isDark && { backgroundColor: '#1E293B', borderColor: '#059669' },
                        ]}
                      >
                        <TextInput
                          style={[
                            styles.datePickerInput,
                            isDark && { color: '#F8FAFC' },
                          ]}
                          value={formDueDate}
                          onChangeText={setFormDueDate}
                          placeholder="dd/mm/yyyy"
                          placeholderTextColor="#A8A29E"
                          onFocus={() => setFocusedField('dueDate')}
                        />
                        <TouchableOpacity
                          style={styles.calendarIconBtn}
                          onPress={() => toggleDatePicker('dueDate')}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={18}
                            color={activeDatePickerField === 'dueDate' ? '#059669' : (isDark ? '#94A3B8' : '#78716C')}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Dropdown Mini Calendar khi chọn lịch */}
                  {activeDatePickerField && (
                    <View style={[styles.miniDatePickerBox, isDark && { backgroundColor: '#0F172A', borderColor: '#334155' }]}>
                      <View style={styles.miniDateHeader}>
                        <TouchableOpacity
                          onPress={handlePrevPickerMonth}
                          style={[styles.arrowMiniBtn, isDark && { backgroundColor: '#1E293B' }]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.arrowMiniBtnText, isDark && { color: '#F8FAFC' }]}>‹</Text>
                        </TouchableOpacity>
                        <Text style={[styles.miniDateTitle, isDark && { color: '#F8FAFC' }]}>
                          {isVi
                            ? `Tháng ${pickerMonth + 1}, ${pickerYear} (${activeDatePickerField === 'dueDate' ? 'Hạn trả nợ' : 'Ngày vay'})`
                            : `${new Date(pickerYear, pickerMonth).toLocaleString('en-US', { month: 'short' })} ${pickerYear}`}
                        </Text>
                        <TouchableOpacity
                          onPress={handleNextPickerMonth}
                          style={[styles.arrowMiniBtn, isDark && { backgroundColor: '#1E293B' }]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.arrowMiniBtnText, isDark && { color: '#F8FAFC' }]}>›</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.dowRow}>
                        {(isVi
                          ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
                          : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
                        ).map((dow, idx) => (
                          <View key={dow + idx} style={styles.dowCell}>
                            <Text style={[styles.dowText, isDark && { color: '#94A3B8' }]}>{dow}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.dayGrid}>
                        {calendarCells.map((day, idx) => {
                          if (day === null) {
                            return <View key={`empty-${idx}`} style={styles.dayCell} />;
                          }
                          const currentVal = activeDatePickerField === 'dueDate' ? formDueDate : formStartDate;
                          const parsed = parseDateStr(currentVal);
                          const isSelected = !!(
                            parsed &&
                            parsed.getDate() === day &&
                            parsed.getMonth() === pickerMonth &&
                            parsed.getFullYear() === pickerYear
                          );

                          return (
                            <TouchableOpacity
                              key={`d-${day}`}
                              style={[
                                styles.dayCell,
                                isSelected && styles.dayCellSelected,
                              ]}
                              onPress={() => handleSelectCalendarDay(day)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.dayCellText,
                                  isDark && { color: '#F8FAFC' },
                                  isSelected && styles.dayCellTextSelected,
                                ]}
                              >
                                {day}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Quick options: Hôm nay / Không đặt hạn */}
                      <View style={[styles.miniDateFooter, isDark && { borderTopColor: '#334155' }]}>
                        {activeDatePickerField === 'dueDate' && (
                          <TouchableOpacity
                            onPress={() => {
                              setFormDueDate('');
                              setActiveDatePickerField(null);
                            }}
                            style={[styles.miniDateActionBtn, isDark && { backgroundColor: '#1E293B' }]}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.miniDateActionBtnText, isDark && { color: '#CBD5E1' }]}>
                              {isVi ? 'Không đặt hạn' : 'No due date'}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => {
                            const today = new Date();
                            const dd = String(today.getDate()).padStart(2, '0');
                            const mm = String(today.getMonth() + 1).padStart(2, '0');
                            const yyyy = today.getFullYear();
                            const formatted = `${dd}/${mm}/${yyyy}`;
                            if (activeDatePickerField === 'dueDate') {
                              setFormDueDate(formatted);
                            } else {
                              setFormStartDate(formatted);
                            }
                            setActiveDatePickerField(null);
                          }}
                          style={[styles.miniDateActionBtn, { backgroundColor: '#059669' }]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.miniDateActionBtnText, { color: '#FFFFFF' }]}>
                            {isVi ? 'Hôm nay' : 'Today'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>
                      {isVi ? 'Ghi chú / Mục đích vay' : 'Note / Reason'}
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        isDark && { backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' },
                        focusedField === 'note' && styles.textInputFocused,
                        focusedField === 'note' && isDark && { backgroundColor: '#1E293B', borderColor: '#059669' },
                      ]}
                      value={formNote}
                      onChangeText={setFormNote}
                      placeholder={
                        isVi
                          ? 'Ví dụ: Mượn mua điện thoại, cọc tiền nhà...'
                          : 'e.g. Rent deposit, laptop purchase'
                      }
                      placeholderTextColor="#A8A29E"
                      onFocus={() => {
                        setFocusedField('note');
                        setActiveDatePickerField(null);
                      }}
                    />
                  </View>
                </ScrollView>

                {/* Modal Footer Actions */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, isDark && { backgroundColor: '#334155' }]}
                    onPress={() => {
                      setActiveDatePickerField(null);
                      setIsFormModalOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cancelBtnText, isDark && { color: '#E2E8F0' }]}>
                      {isVi ? 'Hủy' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSaveDebt}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>
                      {editingDebt
                        ? isVi
                          ? 'Cập nhật'
                          : 'Update'
                        : isVi
                          ? 'Lưu khoản nợ'
                          : 'Save Debt'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. MODAL: REPAYMENT / COLLECTION (THU NỢ / TRẢ BỚT) */}
      {/* ========================================================================= */}
      <Modal
        visible={isPayModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPayModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsPayModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalDialogCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalHeading}>
                    {payingDebt?.type === 'lent'
                      ? isVi
                        ? 'Ghi nhận thu tiền nợ'
                        : 'Record Debt Collection'
                      : isVi
                        ? 'Ghi nhận trả nợ'
                        : 'Record Debt Repayment'}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setIsPayModalOpen(false)}
                    activeOpacity={0.7}
                  >
                    <SvgClose size={16} color="#78716C" />
                  </TouchableOpacity>
                </View>

                {payingDebt && (
                  <View style={styles.payTargetCard}>
                    <Text style={styles.payTargetName}>{payingDebt.personName}</Text>
                    <Text style={styles.payTargetRemaining}>
                      {isVi ? 'Còn nợ' : 'Remaining'}:{' '}
                      <Text style={{ fontWeight: '800', color: '#B91C1C' }}>
                        {formatVND(Math.max(0, payingDebt.amount - payingDebt.paidAmount))} đ
                      </Text>{' '}
                      / {formatVND(payingDebt.amount)} đ
                    </Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>
                    {isVi ? 'Số tiền thanh toán (VNĐ) *' : 'Payment Amount (VND) *'}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      isDark && { backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' },
                      payFocusedField === 'payAmount' && styles.textInputFocused,
                      payFocusedField === 'payAmount' && isDark && { backgroundColor: '#1E293B', borderColor: '#059669' },
                    ]}
                    value={payAmountStr}
                    onChangeText={(text) => handleAmountInputChange(text, setPayAmountStr)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#A8A29E"
                    onFocus={() => setPayFocusedField('payAmount')}
                  />
                </View>

                {/* Quick amount chips */}
                {payingDebt && (
                  <View style={styles.quickChipsRow}>
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={() => setPayAmountStr((500000).toLocaleString('vi-VN'))}
                    >
                      <Text style={styles.quickChipText}>+500.000</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={() => setPayAmountStr((1000000).toLocaleString('vi-VN'))}
                    >
                      <Text style={styles.quickChipText}>+1.000.000</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={() => {
                        const rem = Math.max(0, payingDebt.amount - payingDebt.paidAmount);
                        setPayAmountStr(rem > 0 ? rem.toLocaleString('vi-VN') : '');
                      }}
                    >
                      <Text style={styles.quickChipText}>
                        {isVi ? 'Toàn bộ còn lại' : 'All Remaining'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, isDark && { color: '#E2E8F0' }]}>
                    {isVi ? 'Ghi chú thanh toán' : 'Payment Note'}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      isDark && { backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' },
                      payFocusedField === 'payNote' && styles.textInputFocused,
                      payFocusedField === 'payNote' && isDark && { backgroundColor: '#1E293B', borderColor: '#059669' },
                    ]}
                    value={payNoteStr}
                    onChangeText={setPayNoteStr}
                    placeholder={
                      isVi
                        ? 'Ví dụ: Tiền mặt, Chuyển khoản Techcombank...'
                        : 'e.g. Bank transfer, Cash'
                    }
                    placeholderTextColor="#A8A29E"
                    onFocus={() => setPayFocusedField('payNote')}
                  />
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, isDark && { backgroundColor: '#334155' }]}
                    onPress={() => setIsPayModalOpen(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.cancelBtnText, isDark && { color: '#E2E8F0' }]}>{isVi ? 'Hủy' : 'Cancel'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSubmitPayment}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>
                      {isVi ? 'Xác nhận ghi nhận' : 'Confirm Payment'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// =========================================================================
// STYLESHEET (Following exact Monett Tích lũy & Định kỳ aesthetics)
// =========================================================================
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140, // Đảm bảo không bị thanh bottom tab che ("cụt ngủn")
    width: '100%',
  },

  // 0. Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  screenHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#221D18',
    letterSpacing: -0.4,
  },

  // 1. Top Bar Controls
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  tabSwitchGroup: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 5,
    borderWidth: 1.5,
    borderColor: '#E7DECF',
    width: 480,
    maxWidth: '100%',
    gap: 4,
  },
  tabSwitchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  tabSwitchPillActive: {
    backgroundColor: '#064E3B',
  },
  tabSwitchText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#57534E',
  },
  tabSwitchTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  createDebtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#98E4B0',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#82D99E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  createDebtBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },

  // 2. Stat Cards Row (Giống trang Tích Lũy)
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    width: '100%',
  },
  cardHeaderLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardMintAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.5,
    marginTop: 2,
    marginBottom: 4,
  },
  cardSkyAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: -0.5,
    marginTop: 2,
    marginBottom: 4,
  },
  statsContainer: {
    marginBottom: 20,
    gap: 12,
  },
  statCardDarkSlim: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    minHeight: 96,
    width: '100%',
  },
  twoCardsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  halfCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  halfCardAmountBlue: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1E3A8A',
    letterSpacing: -0.4,
    marginTop: 6,
    marginBottom: 2,
  },
  halfCardAmountPastel: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 6,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
    width: '100%',
  },
  statsRowMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    minHeight: 96,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statCardMobile: {
    width: '100%',
    marginBottom: 12,
  },
  statCardDark: {
    backgroundColor: '#064E3B',
    borderColor: '#065F46',
    flex: 1,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  cardDarkDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginVertical: 4,
  },
  statCardMint: {
    backgroundColor: '#BEE3C2',
    borderColor: '#A7F3D0',
    flex: 1,
  },
  statCardPink: {
    backgroundColor: '#FFC5C5',
    borderColor: '#FFC5C5',
    flex: 1,
  },
  statCardBlue: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    flex: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statCardLabelDark: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A7F3D0',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  percentBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064E3B',
  },
  statCardValueDark: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 4,
  },
  currencySubDark: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statCardSubDark: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  statCardLabelPastel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  statCardValuePastel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 2,
  },
  currencySubPastel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#047857',
  },
  statCardSubPastel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  statCardLabelBlue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B45309',
  },
  statCardValueBlue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 2,
  },
  statCardSubBlue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#B45309',
  },

  // 3. Section Header & Filters
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#221D18',
  },
  sectionBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7DECF',
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  filterPillsGroup: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E7DECF',
    gap: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 11,
  },
  filterPillActive: {
    backgroundColor: '#064E3B',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // 4. Empty State
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F5D25F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#221D18',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: '#78716C',
    textAlign: 'center',
    maxWidth: 460,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#98E4B0',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#82D99E',
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },

  // 5. Debt Item Cards
  debtList: {
    gap: 14,
    width: '100%',
  },
  debtListDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  debtCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 14,
    width: '100%',
  },
  debtCardDesktop: {
    width: 'calc((100% - 48px) / 4)' as any,
    maxWidth: 'calc((100% - 48px) / 4)' as any,
  },
  debtCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  personNameText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#221D18',
  },
  noteText: {
    fontSize: 12.5,
    color: '#78716C',
    marginTop: 2,
  },
  badgeWrapper: {
    marginLeft: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusBadgeSettled: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeSettledText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
  },
  statusBadgePast: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgePastText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
  statusBadgeToday: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeTodayText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  statusBadgeNormal: {
    backgroundColor: '#E0F2FE',
  },
  statusBadgeNormalText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  statusBadgeNeutral: {
    backgroundColor: '#F4EFE6',
  },
  statusBadgeNeutralText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78716C',
  },

  // Progress Bar
  progressContainer: {
    backgroundColor: '#FAF7F2',
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#221D18',
    marginTop: 2,
  },
  currencySmall: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#57534E',
  },
  paidLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#E7DECF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Card Bottom
  debtCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F4EFE6',
    flexWrap: 'wrap',
    gap: 10,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF08A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  payBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#854D0E',
  },
  toggleSettleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4EFE6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  toggleSettleBtnDone: {
    backgroundColor: '#DCFCE7',
  },
  toggleSettleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#57534E',
  },
  toggleSettleBtnDoneText: {
    color: '#047857',
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F4EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
  },

  // 6. Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDialogCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#221D18',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTypeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: '#F4EFE6',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    gap: 4,
  },
  modalTypePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
  },
  modalTypePillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modalTypePillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#78716C',
  },
  modalTypePillTextActive: {
    color: '#221D18',
    fontWeight: '800',
  },
  formGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#44403C',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F7F4EE',
    borderWidth: 1.5,
    borderColor: '#E7DECF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#221D18',
    fontWeight: '600',
  },
  textInputFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#059669',
  },
  datePickerInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4EE',
    borderWidth: 1.5,
    borderColor: '#E7DECF',
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 6,
    minHeight: 44,
  },
  datePickerInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#221D18',
    fontWeight: '600',
  },
  calendarIconBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDatePickerBox: {
    width: '100%',
    backgroundColor: '#FAF7F2',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E7DECF',
    padding: 12,
    marginBottom: 14,
  },
  miniDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  arrowMiniBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EAE3D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowMiniBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#221D18',
    marginTop: -2,
  },
  miniDateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#221D18',
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dowCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 2,
  },
  dowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#059669',
  },
  dayCellText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#221D18',
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  miniDateFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E7DECF',
  },
  miniDateActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F4EFE6',
  },
  miniDateActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#57534E',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F4EFE6',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#57534E',
  },
  submitBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#98E4B0',
    borderWidth: 1,
    borderColor: '#82D99E',
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#064E3B',
  },
  payTargetCard: {
    backgroundColor: '#FAF7F2',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7DECF',
    marginBottom: 14,
  },
  payTargetName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#221D18',
    marginBottom: 2,
  },
  payTargetRemaining: {
    fontSize: 12.5,
    color: '#78716C',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  quickChip: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#854D0E',
  },
});
