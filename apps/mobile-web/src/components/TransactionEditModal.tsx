import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { EventExpenseItem } from '../services/eventsStorage';
import { CategorySvgIcon } from './CategorySvgIcon';

interface TransactionEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (txData: {
    title: string;
    amount: number;
    type: 'expense' | 'income';
    category: string;
    categoryIcon: string;
    date: string;
    note?: string;
    payer?: string;
  }) => void;
  onDelete?: () => void;
  initialData?: EventExpenseItem | null;
  eventName?: string;
}

// Danh mục Khoản chi — Di chuyển và Xăng dầu là 2 danh mục riêng biệt
const EXPENSE_CATEGORIES = [
  'Ăn uống',
  'Cafe',
  'Di chuyển',
  'Xăng dầu',
  'Du lịch',
  'Mua sắm',
  'Giải trí',
  'Làm đẹp',
  'Sức khỏe',
  'Học tập',
  'Điện nước',
  'Internet',
  'Quà tặng',
  'Hóa đơn',
  'Khác',
];

// Danh mục Khoản thu chỉ gồm Lương và Tiết kiệm
const INCOME_CATEGORIES = [
  'Lương',
  'Tiết kiệm',
];

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  initialData,
  eventName = '111',
}) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // Form State
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('20000');
  const [date, setDate] = useState('18/10/2026');
  const [category, setCategory] = useState('Ăn uống');
  const [note, setNote] = useState('');
  const [payer, setPayer] = useState(isVi ? 'Tôi' : 'Me');

  // Dropdown open/close
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Active focused field for highlighting ('amount', 'date', 'category', 'payer', 'event', 'note')
  const [focusedField, setFocusedField] = useState<'amount' | 'date' | 'category' | 'payer' | 'event' | 'note' | null>('amount');

  // Hover state for category items
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Mini Calendar Picker
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(() => new Date());

  // Sync state when modal opens
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setTxType(initialData.type || 'expense');
        setAmountStr(initialData.amount ? String(initialData.amount) : '');
        setDate(initialData.date || '18/10/2026');
        setCategory(initialData.category || (initialData.type === 'income' ? 'Tiết kiệm' : 'Ăn uống'));
        setNote(initialData.note || '');
        setPayer(initialData.payer || (isVi ? 'Tôi' : 'Me'));
      } else {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();

        setTxType('expense');
        setAmountStr('');
        setDate(`${dd}/${mm}/${yyyy}`);
        setCategory('Ăn uống');
        setNote('');
        setPayer(isVi ? 'Tôi' : 'Me');
      }
      setIsCategoryDropdownOpen(false);
      setIsDatePickerOpen(false);
      setHoveredCategory(null);
      setFocusedField('amount');
    }
  }, [visible, initialData]);

  // Switch between Khoản chi and Khoản thu
  const handleSelectType = (newType: 'expense' | 'income') => {
    setTxType(newType);
    if (newType === 'income') {
      if (category !== 'Lương' && category !== 'Tiết kiệm') {
        setCategory('Lương');
      }
    } else {
      if (category === 'Lương' || category === 'Tiết kiệm') {
        setCategory('Ăn uống');
      }
    }
  };

  const handleAmountChange = (text: string) => {
    const raw = text.replace(/[^0-9]/g, '');
    setAmountStr(raw);
  };

  const formattedAmountDisplay = () => {
    if (!amountStr) return '';
    const num = parseInt(amountStr, 10);
    return isNaN(num) ? '' : num.toLocaleString('vi-VN');
  };

  const handleSelectCategory = (catName: string) => {
    setCategory(catName);
  };

  // Mini Calendar methods
  const handleSelectCalendarDay = (day: number) => {
    const mm = String(pickerDate.getMonth() + 1).padStart(2, '0');
    const yyyy = pickerDate.getFullYear();
    const dd = String(day).padStart(2, '0');
    setDate(`${dd}/${mm}/${yyyy}`);
    setIsDatePickerOpen(false);
  };

  const handleSubmit = () => {
    const rawNum = parseInt(amountStr.replace(/\D/g, ''), 10);
    if (!rawNum || rawNum <= 0) {
      alert(isVi ? 'Vui lòng nhập số tiền hợp lệ.' : 'Please enter a valid amount.');
      return;
    }

    onSave({
      title: category,
      amount: rawNum,
      type: txType,
      category,
      categoryIcon: txType === 'income' ? '💰' : category,
      date: date.trim() || '18/10/2026',
      note: note.trim() || undefined,
      payer: payer.trim() || 'Tôi',
    });

    onClose();
  };

  if (!visible) return null;

  // Colors matching the user's screenshots
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const inputBg = isDark ? '#0F172A' : '#F4EFE6'; // Màu be chuẩn khi không chọn
  const activeInputBg = isDark ? '#1E293B' : '#FFFFFF'; // Màu trắng nổi bật khi ô được chọn
  const activeInputBorder = '#2E9E5B'; // Màu xanh lá nổi bật viền và icon
  const selectedCatRowBg = '#D5ECDE'; // Màu D5ECDE cho hàng danh mục đã chọn
  const circleBadgeBg = isDark ? '#334155' : '#EDE6DC'; // Nền tròn màu be quanh icon
  const dividerColor = isDark ? '#334155' : '#E8E2D9';
  const textPrimary = isDark ? '#F8FAFC' : '#111827';
  const textSecondary = isDark ? '#94A3B8' : '#78716C';

  // Calendar cells
  const pickerYear = pickerDate.getFullYear();
  const pickerMonth = pickerDate.getMonth();
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const firstDow = (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7;
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const activeCategories = txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.dialogCard, { backgroundColor: cardBg }]}>
              {/* ================= HEADER ================= */}
              <View style={[styles.dialogHeader, { borderBottomColor: dividerColor }]}>
                <Text style={[styles.dialogTitle, { color: textPrimary }]}>
                  {isVi ? 'Sửa giao dịch' : 'Edit transaction'}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeCircleBtn, { backgroundColor: isDark ? '#334155' : '#F8FAFC' }]}
                  activeOpacity={0.7}
                  accessibilityLabel="Đóng"
                >
                  <Ionicons name="close" size={18} color={isDark ? '#CBD5E1' : '#475569'} />
                </TouchableOpacity>
              </View>

              {/* ================= BODY ================= */}
              <ScrollView
                style={styles.dialogBody}
                contentContainerStyle={styles.dialogBodyContent}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Type Switcher: ↘ Khoản chi vs ↗ Khoản thu */}
                <View style={[styles.typeSwitcherWrap, { backgroundColor: inputBg }]}>
                  {/* Tab Khoản chi */}
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      txType === 'expense' && styles.typeBtnExpenseActive,
                    ]}
                    onPress={() => handleSelectType('expense')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="trending-down"
                      size={17}
                      color={txType === 'expense' ? '#DC2626' : '#78716C'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.typeBtnText,
                        txType === 'expense' && styles.typeBtnTextExpenseActive,
                      ]}
                    >
                      {isVi ? 'Khoản chi' : 'Expense'}
                    </Text>
                  </TouchableOpacity>

                  {/* Tab Khoản thu */}
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      txType === 'income' && styles.typeBtnIncomeActive,
                    ]}
                    onPress={() => handleSelectType('income')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="trending-up"
                      size={17}
                      color={txType === 'income' ? '#16A34A' : '#78716C'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.typeBtnText,
                        txType === 'income' && styles.typeBtnTextIncomeActive,
                      ]}
                    >
                      {isVi ? 'Khoản thu' : 'Income'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 2. Row: Số tiền * & Ngày */}
                <View style={styles.twoColRow}>
                  {/* Số tiền * - Nổi bật màu trắng khi được chọn */}
                  <View style={styles.colHalf}>
                    <Text style={[styles.formLabel, { color: textPrimary }]}>
                      {isVi ? 'Số tiền' : 'Amount'} <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.boxInputContainer,
                        {
                          backgroundColor: focusedField === 'amount' ? activeInputBg : inputBg,
                          borderColor: focusedField === 'amount' ? activeInputBorder : 'transparent',
                        },
                      ]}
                    >
                      <TextInput
                        value={formattedAmountDisplay()}
                        onChangeText={handleAmountChange}
                        onFocus={() => {
                          setFocusedField('amount');
                          setIsCategoryDropdownOpen(false);
                          setIsDatePickerOpen(false);
                        }}
                        placeholder="0"
                        placeholderTextColor={textSecondary}
                        keyboardType="numeric"
                        style={[styles.amountTextInput, { color: textPrimary }]}
                      />
                      <Text style={styles.currencyBadge}>đ</Text>
                    </View>
                  </View>

                  {/* Ngày */}
                  <View style={styles.colHalf}>
                    <Text style={[styles.formLabel, { color: textPrimary }]}>
                      {isVi ? 'Ngày' : 'Date'}
                    </Text>
                    <View
                      style={[
                        styles.boxInputContainer,
                        {
                          backgroundColor: (focusedField === 'date' || isDatePickerOpen) ? activeInputBg : inputBg,
                          borderColor: (focusedField === 'date' || isDatePickerOpen) ? activeInputBorder : 'transparent',
                        },
                      ]}
                    >
                      <TextInput
                        value={date}
                        onChangeText={setDate}
                        onFocus={() => {
                          setFocusedField('date');
                          setIsCategoryDropdownOpen(false);
                        }}
                        placeholder="dd/mm/yyyy"
                        placeholderTextColor={textSecondary}
                        style={[styles.boxTextInput, { color: textPrimary }]}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          setFocusedField('date');
                          setIsDatePickerOpen((prev) => !prev);
                          setIsCategoryDropdownOpen(false);
                        }}
                        style={styles.calendarIconBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="calendar-outline" size={18} color={textPrimary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Dropdown Mini Lịch (nếu mở) */}
                {isDatePickerOpen && (
                  <View style={[styles.miniDatePickerBox, { backgroundColor: cardBg, borderColor: dividerColor }]}>
                    <View style={styles.miniDateHeader}>
                      <TouchableOpacity
                        onPress={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1))}
                        style={{ padding: 4 }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>‹</Text>
                      </TouchableOpacity>
                      <Text style={[styles.miniDateTitle, { color: textPrimary }]}>
                        {`Tháng ${pickerMonth + 1}, ${pickerYear}`}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1))}
                        style={{ padding: 4 }}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>›</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.dayGrid}>
                      {calendarCells.map((day, idx) => {
                        if (day === null) return <View key={`empty-${idx}`} style={styles.dayCell} />;
                        return (
                          <TouchableOpacity
                            key={`d-${day}`}
                            style={styles.dayCell}
                            onPress={() => handleSelectCalendarDay(day)}
                          >
                            <Text style={[styles.dayCellText, { color: textPrimary }]}>{day}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* 3. Danh mục * (Nổi bật màu trắng khi chọn và mở danh sách đầy đủ) */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: textPrimary }]}>
                    {isVi ? 'Danh mục' : 'Category'} <Text style={styles.asterisk}>*</Text>
                  </Text>

                  {/* Form Danh mục: Màu trắng và viền xanh khi mở hoặc được chọn */}
                  <TouchableOpacity
                    style={[
                      styles.selectedCategoryBox,
                      {
                        backgroundColor: (isCategoryDropdownOpen || focusedField === 'category')
                          ? activeInputBg
                          : inputBg,
                        borderColor: (isCategoryDropdownOpen || focusedField === 'category')
                          ? activeInputBorder
                          : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setFocusedField('category');
                      setIsCategoryDropdownOpen((prev) => !prev);
                      setIsDatePickerOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.selectedCategoryLeft}>
                      {/* Icon SVG danh mục đã chọn LUÔN LÀ MÀU XANH theo yêu cầu (cả khoản chi và khoản thu) */}
                      <CategorySvgIcon
                        name={category}
                        size={20}
                        color={activeInputBorder}
                      />
                      <Text style={[styles.selectedCategoryText, { color: textPrimary }]}>
                        {category}
                      </Text>
                    </View>

                    <Ionicons
                      name={isCategoryDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={isDark ? '#CBD5E1' : '#334155'}
                    />
                  </TouchableOpacity>

                  {/* Dropdown danh sách các mục: Nền TRẮNG (#FFFFFF) theo Hình 1 & Hình 2 */}
                  {isCategoryDropdownOpen && (
                    <View
                      style={[
                        styles.categoryDropdownListCard,
                        {
                          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                          borderColor: dividerColor,
                        },
                      ]}
                    >
                      <ScrollView
                        style={styles.categoryScrollList}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                      >
                        {activeCategories.map((catName) => {
                          const isSelected = category === catName;
                          const isHovered = hoveredCategory === catName;

                          return (
                            <TouchableOpacity
                              key={catName}
                              style={[
                                styles.categoryItemRow,
                                isSelected && { backgroundColor: selectedCatRowBg }, // Màu D5ECDE
                                isHovered && !isSelected && styles.categoryItemRowHovered,
                              ]}
                              onPress={() => handleSelectCategory(catName)}
                              activeOpacity={0.7}
                              {...{
                                onMouseEnter: () => setHoveredCategory(catName),
                                onMouseLeave: () => setHoveredCategory(null),
                              } as any}
                            >
                              <View style={styles.categoryItemLeft}>
                                {/* Icon tròn SVG — icon của danh mục đã chọn là màu xanh */}
                                <View
                                  style={[
                                    styles.categoryIconCircle,
                                    { backgroundColor: circleBadgeBg },
                                  ]}
                                >
                                  <CategorySvgIcon
                                    name={catName}
                                    size={17}
                                    color={isSelected ? activeInputBorder : (isDark ? '#F8FAFC' : '#1E293B')}
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.categoryItemName,
                                    isSelected && styles.categoryItemNameSelected,
                                    { color: textPrimary },
                                  ]}
                                >
                                  {catName}
                                </Text>
                              </View>

                              {/* Dấu tích xanh khi được chọn theo yêu cầu */}
                              {isSelected && (
                                <Ionicons name="checkmark" size={19} color={activeInputBorder} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* 4. Người chi (khớp Ảnh 2) */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: textPrimary }]}>
                    {isVi ? 'Người chi' : 'Payer'}
                  </Text>
                  <View
                    style={[
                      styles.boxInputContainer,
                      {
                        backgroundColor: focusedField === 'payer' ? activeInputBg : inputBg,
                        borderColor: focusedField === 'payer' ? activeInputBorder : 'transparent',
                      },
                    ]}
                  >
                    <TextInput
                      value={payer}
                      onChangeText={setPayer}
                      onFocus={() => {
                        setFocusedField('payer');
                        setIsCategoryDropdownOpen(false);
                        setIsDatePickerOpen(false);
                      }}
                      placeholder={isVi ? 'Tên người chi' : 'Payer name'}
                      placeholderTextColor={textSecondary}
                      style={[styles.boxTextInput, { color: textPrimary }]}
                    />
                    <Ionicons name="chevron-down" size={16} color={textSecondary} />
                  </View>
                </View>

                {/* 5. Sự kiện (tuỳ chọn) (khớp Ảnh 2) */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: textPrimary }]}>
                    {isVi ? 'Sự kiện (tuỳ chọn)' : 'Event (optional)'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.eventSelectBox,
                      {
                        backgroundColor: focusedField === 'event' ? activeInputBg : inputBg,
                        borderColor: focusedField === 'event' ? activeInputBorder : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setFocusedField('event');
                      setIsCategoryDropdownOpen(false);
                      setIsDatePickerOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.eventSelectLeft}>
                      <Ionicons name="calendar-outline" size={18} color={activeInputBorder} />
                      <Text style={[styles.eventSelectText, { color: textPrimary }]}>
                        {eventName}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={16} color={textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* 6. Ghi chú (khớp Ảnh 2) */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: textPrimary }]}>
                    {isVi ? 'Ghi chú' : 'Note'}
                  </Text>
                  <View
                    style={[
                      styles.noteInputContainer,
                      {
                        backgroundColor: focusedField === 'note' ? activeInputBg : inputBg,
                        borderColor: focusedField === 'note' ? activeInputBorder : 'transparent',
                      },
                    ]}
                  >
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      onFocus={() => {
                        setFocusedField('note');
                        setIsCategoryDropdownOpen(false);
                        setIsDatePickerOpen(false);
                      }}
                      placeholder={isVi ? 'VD: Đi chợ cuối tuần' : 'e.g., Weekend shopping'}
                      placeholderTextColor={textSecondary}
                      multiline
                      textAlignVertical="top"
                      style={[styles.noteTextInput, { color: textPrimary }]}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* ================= FOOTER ================= */}
              <View style={[styles.dialogFooter, { borderTopColor: dividerColor }]}>
                {/* Nút Xoá bên trái */}
                {onDelete ? (
                  <TouchableOpacity
                    onPress={onDelete}
                    style={styles.deleteTextBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.deleteTextBtnText, { color: isDark ? '#F87171' : '#111827' }]}>
                      {isVi ? 'Xoá' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}

                {/* Cụm nút bên phải: Huỷ và Lưu */}
                <View style={styles.footerRight}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.cancelTextBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, { color: textPrimary }]}>
                      {isVi ? 'Huỷ' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={styles.submitPillBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>
                      {isVi ? 'Lưu' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBody: {
    maxHeight: 560,
  },
  dialogBodyContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 16,
  },
  typeSwitcherWrap: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 6,
    gap: 6,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  typeBtnExpenseActive: {
    backgroundColor: '#FDE6DE', // Nền hồng đào pastel khớp Ảnh 1
  },
  typeBtnIncomeActive: {
    backgroundColor: '#D1FAE5', // Nền xanh lá pastel khớp Ảnh 2
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78716C',
  },
  typeBtnTextExpenseActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  typeBtnTextIncomeActive: {
    color: '#15803D',
    fontWeight: '800',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  colHalf: {
    flex: 1,
    minWidth: 0,
  },
  formGroup: {
    width: '100%',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  asterisk: {
    color: '#EF4444',
    fontWeight: '800',
  },
  boxInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  amountTextInput: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '800',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  boxTextInput: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  currencyBadge: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 6,
    flexShrink: 0,
  },
  calendarIconBtn: {
    padding: 2,
    marginLeft: 6,
    flexShrink: 0,
  },
  // Ô Danh mục nổi bật khi mở/chọn
  selectedCategoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  selectedCategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedCategoryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Danh sách thả xuống - nền trắng
  categoryDropdownListCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    maxHeight: 250,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  categoryScrollList: {
    maxHeight: 238,
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
  },
  categoryItemRowSelected: {
    backgroundColor: '#D5ECDE', // Màu D5ECDE theo yêu cầu người dùng
  },
  categoryItemRowHovered: {
    backgroundColor: '#EBF6EF', // Hover xanh nhẹ nhàng hài hòa
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Vòng tròn màu be bao quanh SVG icon khớp ảnh 1 & ảnh 2
  categoryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryItemName: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  categoryItemNameSelected: {
    fontWeight: '700',
    color: '#111827',
  },
  eventSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eventSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventSelectText: {
    fontSize: 15,
    fontWeight: '700',
  },
  noteInputContainer: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 74,
  },
  noteTextInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 50,
    padding: 0,
    outlineStyle: 'none' as any,
  },
  miniDatePickerBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: -6,
    marginBottom: 6,
  },
  miniDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniDateTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  deleteTextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  deleteTextBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cancelTextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  submitPillBtn: {
    backgroundColor: '#98E4B0',
    paddingHorizontal: 26,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
});
