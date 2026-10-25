import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  IncomeCategorySvgIcon,
  INCOME_CATEGORIES_LIST,
  PRESET_INCOME_TITLES,
} from './IncomeCategorySvgIcon';
import { addIncomeRecord, IncomeCategoryType } from '../services/incomeStorage';

export const PRESET_INCOME_AMOUNTS = [
  { label: '500K', value: 500000 },
  { label: '1Tr', value: 1000000 },
  { label: '2Tr', value: 2000000 },
  { label: '5Tr', value: 5000000 },
  { label: '10Tr', value: 10000000 },
  { label: '20Tr', value: 20000000 },
];

interface AddIncomeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultDate?: string;
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({
  visible,
  onClose,
  onSuccess,
  defaultDate,
}) => {
  const todayStr = defaultDate || new Date().toISOString().split('T')[0];

  const [rawAmount, setRawAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategoryType>('Lương');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(todayStr);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);

  const numericAmount = parseInt(rawAmount.replace(/\D/g, '') || '0', 10);
  const formattedDisplay = numericAmount > 0 ? numericAmount.toLocaleString('vi-VN') : '0';
  // Đảm bảo chiều rộng textinput ôm sát các chữ số để dấu + và chữ đ luôn sát bên cạnh
  const inputWidth = Math.max(38, formattedDisplay.length * 20 + 8);

  const handleSelectPresetAmount = (val: number) => {
    if (numericAmount === val) {
      setRawAmount('');
    } else {
      setRawAmount(String(val));
    }
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setRawAmount(cleaned);
  };

  const handleSelectPresetTitle = (preset: string) => {
    setTitle(preset);
    // Tự động gợi ý danh mục tương ứng cho tiện lợi
    if (preset.includes('Lương') || preset.includes('tăng ca')) {
      setSelectedCategory('Lương');
    } else if (preset.includes('KPI') || preset.includes('Thưởng')) {
      setSelectedCategory('Thưởng/KPI');
    } else if (preset.includes('thêm') || preset.includes('Dự án ngoài')) {
      setSelectedCategory('Freelance/Ngoài giờ');
    } else if (preset.includes('lì xì') || preset.includes('Quà biếu')) {
      setSelectedCategory('Được tặng/Lì xì');
    } else if (preset.includes('Thanh lý')) {
      setSelectedCategory('Kinh doanh/Bán hàng');
    }
  };

  const handleSubmit = async () => {
    if (numericAmount <= 0) {
      alert('Vui lòng nhập số tiền thu nhập hợp lệ');
      return;
    }
    const finalTitle = title.trim() || selectedCategory;

    setIsSubmitting(true);
    try {
      await addIncomeRecord({
        title: finalTitle,
        amount: numericAmount,
        category: selectedCategory,
        date: date || todayStr,
        note: note.trim() || undefined,
      });

      // Reset form
      setRawAmount('');
      setTitle('');
      setNote('');
      setSelectedCategory('Lương');

      onSuccess?.();
      onClose();
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu khoản thu nhập');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalCard}>
          {/* ================= HEADER ================= */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Thêm Khoản Thu Nhập</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ================= 1. SỐ TIỀN THU VÀO ================= */}
            <View style={styles.amountBox}>
              <Text style={styles.amountLabel}>SỐ TIỀN THU VÀO</Text>
              
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => inputRef.current?.focus()}
                style={styles.amountInputRow}
              >
                <Text style={styles.amountPlusSign}>+</Text>
                <TextInput
                  ref={inputRef}
                  style={[styles.amountInput, { width: inputWidth }]}
                  value={rawAmount ? numericAmount.toLocaleString('vi-VN') : ''}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  placeholderTextColor="#059669"
                  keyboardType="number-pad"
                  autoFocus={true}
                  selectTextOnFocus={true}
                />
                <Text style={styles.amountCurrency}>đ</Text>
              </TouchableOpacity>

              {/* Các nút chọn số tiền nhanh */}
              <View style={styles.presetAmountsRow}>
                {PRESET_INCOME_AMOUNTS.map((preset) => {
                  const isSelected = numericAmount === preset.value;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.presetAmountChip,
                        isSelected && styles.presetAmountChipSelected,
                      ]}
                      onPress={() => handleSelectPresetAmount(preset.value)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.presetAmountText,
                          isSelected && styles.presetAmountTextSelected,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {numericAmount > 0 && (
                  <TouchableOpacity
                    style={[styles.presetAmountChip, styles.presetAmountChipClear]}
                    onPress={() => setRawAmount('')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.presetAmountTextClear}>Xóa</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ================= 2. NGUỒN THU NHẬP (SVG ICONS HÀNG NGANG CHUẨN HÌNH 2) ================= */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>NGUỒN THU NHẬP</Text>
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScrollRow}
              >
                {INCOME_CATEGORIES_LIST.map((cat) => {
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[
                        styles.categoryItem,
                        isSelected && styles.categoryItemSelected,
                      ]}
                      onPress={() => setSelectedCategory(cat.name as IncomeCategoryType)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.categoryIconWrap}>
                        <IncomeCategorySvgIcon
                          category={cat.name}
                          size={20}
                          color={isSelected ? '#059669' : cat.accentColor}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryItemLabel,
                          isSelected && styles.categoryItemLabelSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {cat.labelVi}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ================= 3. TÊN KHOẢN THU ================= */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>TÊN KHOẢN THU</Text>
              <View style={styles.inputWithIconBox}>
                <Ionicons name="pricetag-outline" size={17} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInputField}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="VD: Lương công ty, Thưởng KPI, Dự án ngoài..."
                  placeholderTextColor="#94A3B8"
                />
                {title.length > 0 && (
                  <TouchableOpacity onPress={() => setTitle('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Các mục bấm sẵn ở tên khoản thu nhập theo yêu cầu người dùng */}
              <View style={styles.presetTitlesWrap}>
                {PRESET_INCOME_TITLES.map((preset) => {
                  const isPicked = title === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetTitleChip,
                        isPicked && styles.presetTitleChipActive,
                      ]}
                      onPress={() => handleSelectPresetTitle(preset)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetTitleText,
                          isPicked && styles.presetTitleTextActive,
                        ]}
                      >
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ================= 4. NGÀY NHẬN & GHI CHÚ (CHUẨN HÌNH 2) ================= */}
            <View style={styles.sectionBlock}>
              <View style={styles.rowTwoCols}>
                {/* Ngày nhận có icon calendar và mũi tên v */}
                <View style={[styles.inputWithIconBox, { flex: 1.15, marginRight: 8 }]}>
                  <Ionicons name="calendar-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.textInputField}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                  />
                  <Ionicons name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 4 }} />
                </View>

                {/* Ghi chú */}
                <View style={[styles.inputWithIconBox, { flex: 1.35 }]}>
                  <TextInput
                    style={styles.textInputField}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Ghi chú thêm..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>

            {/* ================= NÚT XÁC NHẬN ================= */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                numericAmount <= 0 && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || numericAmount <= 0}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Đang lưu...' : '+ Thêm Khoản Thu Nhập'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 22,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },

  // 1. Amount Box
  amountBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 2,
  },
  amountPlusSign: {
    fontSize: 28,
    fontWeight: '900',
    color: '#059669',
    marginRight: 6,
  },
  amountInput: {
    fontSize: 34,
    fontWeight: '900',
    color: '#047857',
    textAlign: 'center',
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    outlineStyle: 'none' as any,
    letterSpacing: -0.5,
  },
  amountCurrency: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 6,
    paddingBottom: 2,
  },
  presetAmountsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetAmountChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  presetAmountChipSelected: {
    backgroundColor: '#059669',
    borderColor: '#047857',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  presetAmountChipClear: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  presetAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  presetAmountTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  presetAmountTextClear: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  // 2. Section Block
  sectionBlock: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoriesScrollRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  categoryItemSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  categoryIconWrap: {
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryItemLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  categoryItemLabelSelected: {
    fontWeight: '800',
    color: '#059669',
  },

  // 3. Inputs
  inputWithIconBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textInputField: {
    flex: 1,
    fontSize: 13.5,
    color: '#1E293B',
    padding: 0,
    fontWeight: '500',
  },
  presetTitlesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  presetTitleChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetTitleChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  presetTitleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  presetTitleTextActive: {
    color: '#047857',
    fontWeight: '700',
  },

  // 4. Two columns row
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Submit Button
  submitBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
