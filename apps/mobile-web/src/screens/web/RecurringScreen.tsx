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
import {
  RecurringItem,
  RecurringFrequency,
  RecurringType,
  loadRecurringItems,
  saveRecurringItems,
  getFrequencyLabel,
  getFrequencyPeriodSuffix,
  calculateMonthlyEquivalent,
} from '../../services/recurringStorage';

// =========================================================================
// SVG VECTOR ICONS
// =========================================================================
const SvgSync: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#221D18' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21.5 2V7H16.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2.5 22V17H7.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M20.49 15A9 9 0 0 1 5.64 19.36L2.5 17"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3.51 9A9 9 0 0 1 18.36 4.64L21.5 7"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

const SvgBill: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = '#1E3A8A' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.8" />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8" />
    <Line x1="6" y1="12" x2="6.01" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="18" y1="12" x2="18.01" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
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

const SvgChevronDown: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#57534E' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9L12 15L18 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface RecurringScreenProps {
  onNavigateToTab?: (tab: any) => void;
  onBack?: () => void;
}

export const RecurringScreen: React.FC<RecurringScreenProps> = ({ onNavigateToTab, onBack }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { user } = useAuth();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigateToTab) {
      onNavigateToTab('home');
    }
  };

  // Tab: 'expense' (Chi định kỳ) vs 'income' (Thu định kỳ)
  const [activeTab, setActiveTab] = useState<RecurringType>('expense');

  // Recurring Items State
  const [items, setItems] = useState<RecurringItem[]>(() => loadRecurringItems(user?.id));

  // Sync to localStorage
  useEffect(() => {
    saveRecurringItems(items, user?.id);
  }, [items, user?.id]);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formAmountStr, setFormAmountStr] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('monthly');
  const [formDayOfPayment, setFormDayOfPayment] = useState('1');
  const [isFreqDropdownOpen, setIsFreqDropdownOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<'title' | 'amount' | 'day' | null>('amount');

  const formatVND = (num: number) => {
    if (!num || isNaN(num)) return '0';
    return num.toLocaleString('vi-VN');
  };

  // Filter items according to active tab
  const currentTabItems = useMemo(() => {
    return items.filter((item) => item.type === activeTab);
  }, [items, activeTab]);

  // Active items count and calculations
  const activeItems = useMemo(() => {
    return currentTabItems.filter((i) => i.isActive);
  }, [currentTabItems]);

  const estimatedMonthly = useMemo(() => {
    return activeItems.reduce((acc, curr) => {
      return acc + calculateMonthlyEquivalent(curr.amount, curr.frequency);
    }, 0);
  }, [activeItems]);

  const estimatedYearly = useMemo(() => {
    return estimatedMonthly * 12;
  }, [estimatedMonthly]);

  // Toggle active status
  const handleToggleActive = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i))
    );
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormAmountStr('');
    setFormFrequency('monthly');
    setFormDayOfPayment('1');
    setIsFreqDropdownOpen(false);
    setFocusedField('amount');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: RecurringItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormAmountStr(item.amount.toLocaleString('vi-VN'));
    setFormFrequency(item.frequency);
    setFormDayOfPayment(String(item.dayOfPayment));
    setIsFreqDropdownOpen(false);
    setFocusedField('amount');
    setIsModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = () => {
    const cleanTitle = formTitle.trim();
    if (!cleanTitle) {
      alert(isVi ? 'Vui lòng nhập tên khoản định kỳ.' : 'Please enter a title.');
      return;
    }
    const numAmt = parseInt(formAmountStr.replace(/\D/g, ''), 10) || 0;
    if (numAmt <= 0) {
      alert(isVi ? 'Vui lòng nhập số tiền hợp lệ (> 0).' : 'Please enter a valid amount.');
      return;
    }

    if (editingItem) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
              ...i,
              title: cleanTitle,
              amount: numAmt,
              frequency: formFrequency,
              dayOfPayment: formDayOfPayment.trim() || '1',
            }
            : i
        )
      );
    } else {
      const newItem: RecurringItem = {
        id: `rec-${Date.now()}`,
        title: cleanTitle,
        amount: numAmt,
        type: activeTab,
        frequency: formFrequency,
        dayOfPayment: formDayOfPayment.trim() || '1',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
    }

    setIsModalOpen(false);
  };

  // Delete Item
  const handleDeleteItem = (id: string, title: string) => {
    const msg = isVi
      ? `Bạn có chắc muốn xóa khoản định kỳ "${title}" không?`
      : `Are you sure you want to delete "${title}"?`;
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(msg)) return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const frequencyOptions: { key: RecurringFrequency; label: string }[] = [
    { key: 'daily', label: isVi ? 'Hàng ngày' : 'Daily' },
    { key: 'weekly', label: isVi ? 'Hàng tuần' : 'Weekly' },
    { key: 'monthly', label: isVi ? 'Hàng tháng' : 'Monthly' },
    { key: 'yearly', label: isVi ? 'Hàng năm' : 'Yearly' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= 1. TIÊU ĐỀ TRANG ================= */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {(onBack || onNavigateToTab) && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={isVi ? 'Quay lại' : 'Go back'}
            >
              <Ionicons name="chevron-back" size={24} color="#221D18" />
            </TouchableOpacity>
          )}
          <Text style={styles.screenHeading}>
            {isVi ? 'Định kỳ' : 'Recurring'}
          </Text>
        </View>
      </View>

      {/* ================= 2. CỤM CHỌN TAB & NÚT THÊM KHOẢN ================= */}
      <View style={styles.tabBarControlsRow}>
        {/* Tab Switcher: Chi định kỳ vs Thu định kỳ */}
        <View style={styles.tabSwitcherBox}>
          <TouchableOpacity
            style={[styles.tabPillBtn, activeTab === 'expense' && styles.tabPillBtnActive]}
            onPress={() => setActiveTab('expense')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabPillBtnText,
                activeTab === 'expense' && styles.tabPillBtnTextActive,
              ]}
            >
              {isVi ? 'Chi định kỳ' : 'Recurring Expense'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPillBtn, activeTab === 'income' && styles.tabPillBtnActive]}
            onPress={() => setActiveTab('income')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.tabPillBtnText,
                activeTab === 'income' && styles.tabPillBtnTextActive,
              ]}
            >
              {isVi ? 'Thu định kỳ' : 'Recurring Income'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nút + Thêm khoản bên phải */}
        <TouchableOpacity
          style={styles.addRecurringBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.85}
        >
          <SvgPlus size={15} color="#064E3B" style={{ marginRight: 6 }} />
          <Text style={styles.addRecurringBtnText}>
            {isVi ? 'Thêm khoản' : 'Add Item'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= 3. NỘI DUNG CHÍNH ================= */}
      {currentTabItems.length === 0 ? (
        /* HÌNH 1: GIAO DIỆN KHI CHƯA CÓ KHOẢN NÀO (EMPTY STATE) */
        <View style={styles.emptyCardContainer}>
          <View style={styles.emptyIconBadge}>
            <SvgSync size={24} color="#221D18" />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'expense'
              ? isVi
                ? 'Chưa có khoản chi định kỳ'
                : 'No recurring expenses yet'
              : isVi
                ? 'Chưa có khoản thu định kỳ'
                : 'No recurring income yet'}
          </Text>
          <Text style={styles.emptySub}>
            {activeTab === 'expense'
              ? isVi
                ? 'Theo dõi các khoản trả định kỳ như Netflix, tiền nhà, internet...'
                : 'Track periodic bills like Netflix, rent, internet...'
              : isVi
                ? 'Theo dõi các khoản thu định kỳ như lương, tiền thuê nhà, cổ tức...'
                : 'Track periodic earnings like salary, rental income, dividends...'}
          </Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.85}
          >
            <SvgPlus size={15} color="#064E3B" style={{ marginRight: 6 }} />
            <Text style={styles.emptyAddBtnText}>
              {isVi ? 'Thêm khoản' : 'Add Item'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* HÌNH 3: GIAO DIỆN SAU KHI ĐÃ CÓ KHOẢN ĐỊNH KỲ */
        <View style={styles.activeContentContainer}>
          {/* Cụm 3 Thẻ Chỉ Số Thống Kê (Overview Stat Cards) */}
          <View style={[styles.statsRow, !isDesktop && styles.statsRowMobile]}>
            {/* Card 1: Ước tính tháng */}
            <View style={[styles.statCard, styles.statCardDark, !isDesktop && styles.statCardMobile]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabelDark}>
                  {isVi ? 'ƯỚC TÍNH THÁNG' : 'MONTHLY ESTIMATE'}
                </Text>
              </View>
              <Text style={styles.statCardValueDark} numberOfLines={1}>
                {formatVND(estimatedMonthly)} <Text style={styles.currencySubDark}>đ</Text>
              </Text>
              <View style={styles.cardDarkDivider} />
              <Text style={styles.statCardSubDark}>
                {activeItems.length} {isVi ? 'đang bật' : 'active'}
              </Text>
            </View>

            {/* Card 2: Ước tính năm (#BEE3C2 - Xanh mint giống Sự kiện) */}
            <View style={[styles.statCard, styles.statCardMint, !isDesktop && styles.statCardMobile]}>
              <View style={styles.statCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <SvgCalendar size={15} color="#047857" />
                  <Text style={styles.statCardLabelMint}>
                    {isVi ? 'Ước tính năm' : 'Yearly estimate'}
                  </Text>
                </View>
              </View>
              <Text style={styles.statCardValueMint} numberOfLines={1}>
                {formatVND(estimatedYearly)}
              </Text>
              <Text style={styles.statCardSubMint}>
                {isVi ? 'x12 từ mức tháng' : 'x12 from monthly'}
              </Text>
            </View>

            {/* Card 3: Số khoản (#B7D9F2 - Xanh trời Sky Blue giống Sự kiện) */}
            <View style={[styles.statCard, styles.statCardBlue, !isDesktop && styles.statCardMobile]}>
              <View style={styles.statCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <SvgBill size={15} color="#0369A1" />
                  <Text style={styles.statCardLabelBlue}>
                    {isVi ? 'Số khoản' : 'Items count'}
                  </Text>
                </View>
              </View>
              <Text style={styles.statCardValueBlue} numberOfLines={1}>
                {currentTabItems.length}
              </Text>
              <Text style={styles.statCardSubBlue}>
                {activeTab === 'expense'
                  ? isVi
                    ? 'chi định kỳ'
                    : 'recurring expenses'
                  : isVi
                    ? 'thu định kỳ'
                    : 'recurring income'}
              </Text>
            </View>
          </View>

          {/* Section: Danh sách chi / Danh sách thu */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {activeTab === 'expense'
                ? isVi
                  ? 'Danh sách chi'
                  : 'Expense List'
                : isVi
                  ? 'Danh sách thu'
                  : 'Income List'}
            </Text>
            <Text style={styles.sectionCountText}>
              {currentTabItems.length} {isVi ? 'mục' : 'items'}
            </Text>
          </View>

          {/* Danh sách các card khoản định kỳ */}
          <View style={styles.recurringList}>
            {currentTabItems.map((item) => {
              const freqText = getFrequencyLabel(item.frequency, isVi);
              const periodSuffix = getFrequencyPeriodSuffix(item.frequency, isVi);
              const dayStr = item.dayOfPayment ? ` • ngày ${item.dayOfPayment}` : '';

              return (
                <View key={item.id} style={styles.recurringItemCard}>
                  {/* Hàng trên: Icon + Tên + Tần suất và Switch Bật/Tắt */}
                  <View style={styles.itemTopRow}>
                    <View style={styles.itemLeftGroup}>
                      <View style={styles.itemBadgeCircle}>
                        <SvgSync size={17} color="#059669" />
                      </View>
                      <View>
                        <Text style={styles.itemTitleText}>{item.title}</Text>
                        <Text style={styles.itemSubtitleText}>
                          {freqText}
                          {dayStr}
                        </Text>
                      </View>
                    </View>

                    {/* Toggle Switch đẹp và mượt */}
                    <TouchableOpacity
                      onPress={() => handleToggleActive(item.id)}
                      activeOpacity={0.8}
                      style={[
                        styles.toggleTrack,
                        item.isActive ? styles.toggleTrackOn : styles.toggleTrackOff,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          item.isActive ? styles.toggleThumbOn : styles.toggleThumbOff,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Hàng dưới: Số tiền và Cụm Nút Sửa / Xóa */}
                  <View style={styles.itemBottomRow}>
                    <View style={styles.amountWrap}>
                      <Text style={styles.amountMainText}>
                        {formatVND(item.amount)} đ
                      </Text>
                      <Text style={styles.amountSuffixText}>
                        {periodSuffix}
                      </Text>
                    </View>

                    <View style={styles.itemActionsGroup}>
                      <TouchableOpacity
                        onPress={() => handleOpenEditModal(item)}
                        style={styles.itemActionBtn}
                        activeOpacity={0.7}
                        accessibilityLabel="Sửa"
                      >
                        <SvgPencil size={15} color="#0284C7" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteItem(item.id, item.title)}
                        style={[styles.itemActionBtn, styles.itemDeleteBtn]}
                        activeOpacity={0.7}
                        accessibilityLabel="Xóa"
                      >
                        <SvgTrash size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ================= 4. MODAL THÊM / SỬA KHOẢN ĐỊNH KỲ (HÌNH 2) ================= */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalDialogCard}>
                {/* Header Modal */}
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalHeading}>
                    {editingItem
                      ? isVi
                        ? activeTab === 'expense'
                          ? 'Sửa khoản chi định kỳ'
                          : 'Sửa khoản thu định kỳ'
                        : 'Edit Recurring'
                      : isVi
                        ? activeTab === 'expense'
                          ? 'Khoản chi định kỳ mới'
                          : 'Khoản thu định kỳ mới'
                        : 'New Recurring'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsModalOpen(false)}
                    style={styles.modalCloseBtn}
                    activeOpacity={0.7}
                  >
                    <SvgClose size={18} color="#221D18" />
                  </TouchableOpacity>
                </View>

                {/* Dark Divider Line */}
                <View style={styles.modalDivider} />

                {/* Form Body */}
                <View style={styles.modalFormBody}>
                  {/* Field 1: Tên khoản * */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      {isVi ? 'Tên khoản' : 'Title'} <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <TextInput
                      value={formTitle}
                      onChangeText={setFormTitle}
                      onFocus={() => setFocusedField('title')}
                      onBlur={() => setFocusedField(null)}
                      style={[
                        styles.inputBox,
                        focusedField === 'title' && styles.inputBoxFocused,
                      ]}
                      placeholder={isVi ? (activeTab === 'expense' ? 'Netflix, tiền nhà...' : 'Lương, tiền thuê...') : 'Title...'}
                      placeholderTextColor="#A8A29E"
                    />
                  </View>

                  {/* Field 2: Số tiền * */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      {isVi ? 'Số tiền' : 'Amount'} <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.inputBox,
                        styles.amountInputRow,
                        focusedField === 'amount' && styles.inputBoxFocused,
                      ]}
                    >
                      <TextInput
                        value={formAmountStr}
                        onChangeText={(val) => {
                          const raw = val.replace(/\D/g, '');
                          if (!raw) {
                            setFormAmountStr('');
                          } else {
                            setFormAmountStr(parseInt(raw, 10).toLocaleString('vi-VN'));
                          }
                        }}
                        onFocus={() => setFocusedField('amount')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="numeric"
                        style={styles.amountTextInput}
                        placeholder="0"
                        placeholderTextColor="#A8A29E"
                      />
                      <Text style={styles.amountCurrencySuffix}>đ</Text>
                    </View>
                  </View>

                  {/* Row 2 Cột: Tần suất & Ngày thanh toán */}
                  <View style={styles.formRowTwoCols}>
                    {/* Cột Trái: Tần suất */}
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>
                        {isVi ? 'Tần suất' : 'Frequency'}
                      </Text>
                      <TouchableOpacity
                        style={styles.dropdownBtn}
                        onPress={() => setIsFreqDropdownOpen(!isFreqDropdownOpen)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.dropdownBtnText}>
                          {getFrequencyLabel(formFrequency, isVi)}
                        </Text>
                        <SvgChevronDown size={16} color="#57534E" />
                      </TouchableOpacity>

                      {/* Dropdown Options List */}
                      {isFreqDropdownOpen && (
                        <View style={styles.dropdownMenu}>
                          {frequencyOptions.map((opt) => (
                            <TouchableOpacity
                              key={opt.key}
                              style={[
                                styles.dropdownOption,
                                formFrequency === opt.key && styles.dropdownOptionActive,
                              ]}
                              onPress={() => {
                                setFormFrequency(opt.key);
                                setIsFreqDropdownOpen(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownOptionText,
                                  formFrequency === opt.key && styles.dropdownOptionTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Cột Phải: Ngày thanh toán */}
                    <View style={styles.formCol}>
                      <Text style={styles.formLabel}>
                        {activeTab === 'expense'
                          ? isVi
                            ? 'Ngày thanh toán'
                            : 'Payment Day'
                          : isVi
                            ? 'Ngày nhận'
                            : 'Receive Day'}
                      </Text>
                      <TextInput
                        value={formDayOfPayment}
                        onChangeText={setFormDayOfPayment}
                        onFocus={() => setFocusedField('day')}
                        onBlur={() => setFocusedField(null)}
                        style={[
                          styles.inputBox,
                          focusedField === 'day' && styles.inputBoxFocused,
                        ]}
                        placeholder="1"
                        placeholderTextColor="#A8A29E"
                      />
                    </View>
                  </View>
                </View>

                {/* Dark Divider Line */}
                <View style={styles.modalDivider} />

                {/* Footer Modal Actions */}
                <View style={styles.modalFooterRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setIsModalOpen(false)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.modalCancelBtnText}>
                      {isVi ? 'Huỷ' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={handleSaveItem}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalSubmitBtnText}>
                      {editingItem
                        ? isVi
                          ? 'Cập nhật'
                          : 'Update'
                        : isVi
                          ? 'Thêm'
                          : 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScrollView>
  );
};

// =========================================================================
// STYLESHEET KHỚP 100% GIAO DIỆN HÌNH 1, HÌNH 2, HÌNH 3
// =========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140,
    width: '100%',
  },

  // 1. Header
  headerRow: {
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  screenHeading: {
    fontSize: 26,
    fontWeight: '900',
    color: '#221D18',
    letterSpacing: -0.4,
  },

  // 2. Tab Bar & Controls Row
  tabBarControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  tabSwitcherBox: {
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
  tabPillBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPillBtnActive: {
    backgroundColor: '#F5D25F',
  },
  tabPillBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#57534E',
  },
  tabPillBtnTextActive: {
    color: '#221D18',
    fontWeight: '800',
  },
  addRecurringBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#98E4B0',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#82D99E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addRecurringBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },

  // 3. Hình 1: Empty State
  emptyCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7DECF',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5D25F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#221D18',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    color: '#78716C',
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#98E4B0',
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  emptyAddBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#064E3B',
  },

  // 4. Hình 3: Active State
  activeContentContainer: {
    gap: 20,
    width: '100%',
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
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    justifyContent: 'space-between',
  },
  statCardMobile: {
    width: '100%',
    marginBottom: 12,
  },
  statCardDark: {
    backgroundColor: '#221D18',
    borderColor: '#221D18',
    flex: 1,
  },
  cardDarkDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 6,
  },
  statCardMint: {
    backgroundColor: '#BEE3C2',
    borderColor: '#A7F3D0',
    flex: 1,
  },
  statCardBlue: {
    backgroundColor: '#B7D9F2',
    borderColor: '#93C5FD',
    flex: 1,
  },
  statCardHeader: {
    marginBottom: 4,
  },
  statCardLabelDark: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#9E958A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statCardValueDark: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 6,
    marginBottom: 6,
  },
  currencySubDark: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statCardSubDark: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#9E958A',
  },
  statCardLabelMint: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  statCardValueMint: {
    fontSize: 30,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  statCardSubMint: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#065F46',
  },
  statCardLabelBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  statCardValueBlue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0369A1',
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  statCardSubBlue: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#075985',
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#221D18',
  },
  sectionCountText: {
    fontSize: 12.5,
    color: '#78716C',
    fontWeight: '600',
  },

  // Recurring List Items
  recurringList: {
    gap: 12,
  },
  recurringItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemBadgeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#221D18',
  },
  itemSubtitleText: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },

  // Switch Toggle
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: '#10B981',
  },
  toggleTrackOff: {
    backgroundColor: '#D6D3D1',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  toggleThumbOff: {
    alignSelf: 'flex-start',
  },

  // Item Bottom Row
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F4EFE6',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  amountMainText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#221D18',
  },
  amountSuffixText: {
    fontSize: 12.5,
    color: '#78716C',
    fontWeight: '500',
  },
  itemActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F4EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDeleteBtn: {
    backgroundColor: '#FEE2E2',
  },

  // 5. Hình 2: Modal Styles
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
    marginBottom: 14,
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
  modalDivider: {
    height: 1,
    backgroundColor: '#221D18',
    opacity: 0.25,
    marginVertical: 14,
  },
  modalFormBody: {
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#221D18',
  },
  asterisk: {
    color: '#EF4444',
  },
  inputBox: {
    backgroundColor: '#F4EFE6',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    fontWeight: '600',
    color: '#221D18',
    outlineStyle: 'none' as any,
  },
  inputBoxFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#059669',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#221D18',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  amountCurrencySuffix: {
    fontSize: 14,
    fontWeight: '800',
    color: '#221D18',
  },
  formRowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
    gap: 6,
    position: 'relative',
  },
  dropdownBtn: {
    backgroundColor: '#F4EFE6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#221D18',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 74,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 4,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  dropdownOption: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownOptionActive: {
    backgroundColor: '#ECFDF5',
  },
  dropdownOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#44403C',
  },
  dropdownOptionTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  modalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#221D18',
  },
  modalSubmitBtn: {
    backgroundColor: '#98E4B0',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
});
