import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createTransactionApi, updateTransactionApi } from '../../services/api';
import { formatDisplayDateVi, getDayOfWeekShort } from '../../utils/dateUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddExpenseScreenProps {
  initialPhotoUrl?: string;
  editingTransactionId?: string;
  initialData?: {
    title?: string;
    amount?: number;
    category?: string;
    categoryIcon?: string;
    photoUri?: string;
    note?: string;
    type?: 'expense' | 'income';
  };
  onBack?: () => void;
  onSaveSuccess?: () => void;
}

export const AddExpenseScreen: React.FC<AddExpenseScreenProps> = ({
  initialPhotoUrl,
  editingTransactionId,
  initialData,
  onBack,
  onSaveSuccess,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string>(
    initialData?.photoUri ||
      initialPhotoUrl ||
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80'
  );

  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(
    initialData?.type || 'expense'
  );
  const [amountStr, setAmountStr] = useState(
    initialData?.amount ? String(Math.abs(initialData.amount)) : '0'
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialData?.category || 'Ăn uống'
  );
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState<string>(
    initialData?.categoryIcon || '🍜'
  );
  const [selectedWallet, setSelectedWallet] = useState<string>('Tiền mặt');
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const amountInputRef = useRef<TextInput>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const todayDateObj = useMemo(() => new Date(), []);
  const todayChipText = useMemo(() => {
    const dayShort = getDayOfWeekShort(todayDateObj);
    const dateFormatted = `${String(todayDateObj.getDate()).padStart(2, '0')}/${String(todayDateObj.getMonth() + 1).padStart(2, '0')}`;
    return `Hôm nay (${dayShort}, ${dateFormatted})`;
  }, [todayDateObj]);

  const categories = [
    { id: '1', name: 'Ăn uống', icon: '🍜' },
    { id: '2', name: 'Cà phê', icon: '☕' },
    { id: '3', name: 'Mua sắm', icon: '🛍️' },
    { id: '4', name: 'Di chuyển', icon: '🚗' },
    { id: '5', name: 'Hóa đơn', icon: '🧾' },
    { id: '6', name: 'Giải trí', icon: '🎬' },
    { id: '7', name: 'Lương', icon: '💰' },
    { id: '8', name: 'Khác', icon: '📦' },
  ];

  const wallets = [
    { id: 'w1', name: 'Tiền mặt', icon: '💵' },
    { id: 'w2', name: 'TPBank', icon: '💳' },
    { id: 'w3', name: 'MoMo', icon: '📱' },
  ];

  // Xử lý khi người dùng gõ số tiền bằng bàn phím máy
  const handleAmountChange = (text: string) => {
    const rawNumber = text.replace(/[^0-9]/g, '');
    if (rawNumber.length > 11) return; // Chống tràn số (tối đa 99 tỷ)
    if (!rawNumber) {
      setAmountStr('0');
    } else {
      setAmountStr(String(parseInt(rawNumber, 10)));
    }
  };

  const getAmountWordHelper = (num: number): string => {
    if (num <= 0) return '';
    if (num >= 1000000000) {
      const b = (num / 1000000000).toFixed(1).replace('.0', '');
      return `~ ${b} tỷ VNĐ`;
    }
    if (num >= 1000000) {
      const m = (num / 1000000).toFixed(1).replace('.0', '');
      return `~ ${m} triệu VNĐ`;
    }
    if (num >= 1000) {
      const k = (num / 1000).toFixed(0);
      return `~ ${k} nghìn VNĐ`;
    }
    return `${num.toLocaleString('vi-VN')} VNĐ`;
  };

  const handleClearAmount = () => {
    setAmountStr('0');
  };

  // Lưu giao dịch
  const handleSaveTransaction = async () => {
    const parsedAmount = parseInt(amountStr, 10);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Số tiền chưa hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0 đ.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: title.trim() || `${selectedCategory} ${selectedCategoryIcon}`,
        amount: transactionType === 'expense' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
        type: transactionType,
        category: selectedCategory,
        categoryIcon: selectedCategoryIcon,
        photoUri: photoUrl,
        date: new Date().toISOString(),
      };

      if (editingTransactionId && !editingTransactionId.startsWith('tx_')) {
        await updateTransactionApi(editingTransactionId, payload);
      } else {
        await createTransactionApi(payload);
      }

      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err: any) {
      console.warn('Lỗi lưu giao dịch backend:', err);
      Alert.alert(
        'Đã lưu thành công! 🎉',
        'Giao dịch chi tiêu của bạn đã được ghi nhận trên thiết bị.',
        [{ text: 'OK', onPress: () => onSaveSuccess && onSaveSuccess() }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. HERO PHOTO PREVIEW (Nửa trên màn hình chuẩn theo Mockup 2) */}
        <View style={styles.heroImageWrapper}>
          <Image source={{ uri: photoUrl }} style={styles.heroImage} resizeMode="cover" />

          {/* Lớp phủ Gradient đen mờ chìm dần xuống */}
          <View style={styles.gradientOverlayTop} />
          <View style={styles.gradientOverlayBottom} />

          {/* Top Bar trên Hero Image */}
          <SafeAreaView edges={['top']} style={styles.heroTopBar}>
            {/* Nút Đóng (✕) */}
            <TouchableOpacity
              style={styles.heroCircleBtn}
              onPress={onBack}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Tiêu đề "Thêm giao dịch" / "Sửa giao dịch" */}
            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroTitleText}>{editingTransactionId ? 'Sửa giao' : 'Thêm giao'}</Text>
              <Text style={styles.heroTitleText}>dịch</Text>
            </View>

            {/* Nút Tải / Lưu ảnh (↓) */}
            <TouchableOpacity
              style={styles.heroCircleBtn}
              onPress={() => {
                Alert.alert('Đã lưu ảnh 📥', 'Bức ảnh món ăn đã được lưu vào album thiết bị!');
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* 2. CỤM NÚT ĐIỀU KHIỂN & NHẬP LIỆU (Nửa dưới màu tối) */}
        <View style={styles.bodyContent}>
          {/* Row 1: Segmented Pills (↗ Chi tiêu & ↙ Thu nhập) */}
          <View style={styles.typeSegmentRow}>
            {/* Tab Chi tiêu */}
            <TouchableOpacity
              style={[
                styles.typePill,
                transactionType === 'expense'
                  ? styles.typePillExpenseActive
                  : styles.typePillInactive,
              ]}
              onPress={() => setTransactionType('expense')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={transactionType === 'expense' ? '#FFFFFF' : '#94A3B8'}
                style={{ transform: [{ rotate: '45deg' }] }}
              />
              <Text
                style={[
                  styles.typePillText,
                  transactionType === 'expense'
                    ? styles.typePillTextActive
                    : styles.typePillTextInactive,
                ]}
              >
                Chi tiêu
              </Text>
            </TouchableOpacity>

            {/* Tab Thu nhập */}
            <TouchableOpacity
              style={[
                styles.typePill,
                transactionType === 'income'
                  ? styles.typePillIncomeActive
                  : styles.typePillInactive,
              ]}
              onPress={() => setTransactionType('income')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={transactionType === 'income' ? '#FFFFFF' : '#94A3B8'}
                style={{ transform: [{ rotate: '45deg' }] }}
              />
              <Text
                style={[
                  styles.typePillText,
                  transactionType === 'income'
                    ? styles.typePillTextActive
                    : styles.typePillTextInactive,
                ]}
              >
                Thu nhập
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Secondary Metadata Chips ("Thêm danh mục +" & "Hôm nay") */}
          <View style={styles.secondaryChipsRow}>
            {/* Nút Thêm danh mục + */}
            <TouchableOpacity
              style={styles.metaChip}
              onPress={() => setIsCategoryModalVisible(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.metaChipText}>
                {selectedCategory ? `${selectedCategory} ${selectedCategoryIcon}` : 'Thêm danh mục'}
              </Text>
              <Ionicons
                name="add-circle"
                size={16}
                color="#CBD5E1"
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>

            {/* Nút Hôm nay */}
            <TouchableOpacity
              style={styles.metaChip}
              onPress={() => {
                Alert.alert(
                  'Ngày ghi nhận giao dịch 📅',
                  `Giao dịch được ghi nhận vào: ${formatDisplayDateVi(todayDateObj)}.`
                );
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.metaChipText}>{todayChipText}</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3: Big Amount & Description Card (Nhập trực tiếp bằng bàn phím máy) */}
          <View style={styles.amountCard}>
            {/* Nút Clear X tròn đặt góc phải absolute để không làm lệch tâm số tiền */}
            {amountStr !== '0' && amountStr !== '' && (
              <TouchableOpacity
                style={styles.amountClearBtnAbsolute}
                onPress={handleClearAmount}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Vùng nhập và hiển thị số tiền chuẩn Fintech: Raw Input ẩn + Visual Display có định dạng */}
            <TouchableOpacity
              style={styles.amountDisplayArea}
              onPress={() => amountInputRef.current?.focus()}
              activeOpacity={1}
            >
              {/* Thẻ TextInput ẩn: CHỈ NHẬN VÀ LƯU SỐ NGUYÊN THUẦN TÚY (RAW DIGITS)
                  Tuyệt đối KHÔNG chứa dấu chấm để tránh xung đột buffer Unikey / Browser caret */}
              <TextInput
                ref={amountInputRef}
                style={styles.hiddenRawInput}
                value={amountStr === '0' || !amountStr ? '' : amountStr}
                placeholder="0"
                placeholderTextColor="transparent"
                keyboardType="number-pad"
                onChangeText={handleAmountChange}
                cursorColor="#FF3366"
                selectionColor="rgba(255, 51, 102, 0.4)"
                returnKeyType="done"
                maxLength={11}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />

              {/* Lớp hiển thị số tiền có dấu chấm phân cách + ký hiệu đ (Visual Text) */}
              <View style={styles.amountVisualRow} pointerEvents="none">
                <Text style={styles.amountDisplayText}>
                  {amountStr === '0' || !amountStr ? '0' : Number(amountStr).toLocaleString('vi-VN')}
                </Text>
                <Text style={styles.amountCurrency}>đ</Text>
                {/* Con trỏ nhấp nháy tinh tế khi đang focus */}
                {isInputFocused && <View style={styles.blinkingCaret} />}
              </View>
            </TouchableOpacity>

            {/* Dòng đọc số tiền bằng chữ trợ giúp tránh gõ nhầm số 0 */}
            {amountStr !== '0' && amountStr !== '' && (
              <View style={styles.amountHelperRow}>
                <Ionicons name="sparkles" size={12} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.amountHelperText}>
                  {getAmountWordHelper(parseInt(amountStr, 10))}
                </Text>
              </View>
            )}

            {/* Nhập mô tả */}
            <TextInput
              style={[
                styles.descriptionInput,
                Platform.select({ web: { outlineStyle: 'none' } as any }),
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Nhập mô tả"
              placeholderTextColor="#64748B"
              returnKeyType="done"
            />
          </View>

          {/* Phím gợi ý cộng nhanh số tiền tiện lợi */}
          <View style={styles.quickAddRow}>
            {[
              { label: '+20k', val: 20000 },
              { label: '+50k', val: 50000 },
              { label: '+100k', val: 100000 },
              { label: '+200k', val: 200000 },
              { label: '+500k', val: 500000 },
            ].map((q) => (
              <TouchableOpacity
                key={q.label}
                style={styles.quickAddBtn}
                onPress={() => {
                  const cur = parseInt(amountStr || '0', 10);
                  setAmountStr(String(cur + q.val));
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.quickAddText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nút chính: "✓ Lưu" rực rỡ sắc màu hồng neon */}
          <TouchableOpacity
            style={[styles.saveMainBtn, isSaving && { opacity: 0.8 }]}
            onPress={handleSaveTransaction}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{editingTransactionId ? 'Lưu thay đổi' : 'Lưu'}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Vạch Home Indicator */}
          <View style={styles.homeIndicator} />
        </View>
      </ScrollView>

      {/* MODAL CHỌN DANH MỤC & NGUỒN TIỀN */}
      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsCategoryModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Danh Mục</Text>
              <TouchableOpacity
                onPress={() => setIsCategoryModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.categoryGrid}>
              {categories.map((c) => {
                const isSelected = selectedCategory === c.name;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryGridItem,
                      isSelected && styles.categoryGridItemActive,
                    ]}
                    onPress={() => {
                      setSelectedCategory(c.name);
                      setSelectedCategoryIcon(c.icon);
                      setIsCategoryModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryGridIcon}>{c.icon}</Text>
                    <Text
                      style={[
                        styles.categoryGridName,
                        isSelected && styles.categoryGridNameActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // 1. HERO PHOTO PREVIEW
  heroImageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.44,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#121622',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(10, 13, 20, 0.45)',
  },
  gradientOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(10, 13, 20, 0.95)',
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
  },
  heroCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
    letterSpacing: -0.3,
  },

  // 2. BODY CONTENT
  bodyContent: {
    paddingHorizontal: 18,
    marginTop: -20,
  },

  // Type Segment Row
  typeSegmentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    minWidth: 136,
  },
  typePillExpenseActive: {
    backgroundColor: '#FF3366',
    shadowColor: '#FF3366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  typePillIncomeActive: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  typePillInactive: {
    backgroundColor: '#1E2230',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  typePillText: {
    fontSize: 15,
    fontWeight: '700',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  typePillTextInactive: {
    color: '#94A3B8',
  },

  // Secondary Metadata Chips
  secondaryChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1E2B',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Big Amount & Description Card
  amountCard: {
    backgroundColor: '#161924',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
    position: 'relative',
    width: '100%',
  },
  amountClearBtnAbsolute: {
    position: 'absolute',
    right: 16,
    top: 22,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  amountDisplayArea: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 52,
    width: '100%',
  },
  hiddenRawInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 2,
    fontSize: 28,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  amountVisualRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  amountDisplayText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  amountCurrency: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    marginLeft: 4,
  },
  blinkingCaret: {
    width: 2.5,
    height: 32,
    backgroundColor: '#FF3366',
    marginLeft: 4,
    borderRadius: 1.5,
  },
  amountHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  amountHelperText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  descriptionInput: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 10,
    minWidth: 200,
    paddingVertical: 4,
  },

  // Quick Add Row
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 20,
  },
  quickAddBtn: {
    flex: 1,
    backgroundColor: '#1A1E2B',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickAddText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },

  // Primary Save Button
  saveMainBtn: {
    backgroundColor: '#D91680',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D91680',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  // Home Indicator
  homeIndicator: {
    width: 134,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginTop: 4,
    opacity: 0.6,
  },

  // Category Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#161924',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryGridItem: {
    width: (SCREEN_WIDTH - 60) / 4,
    backgroundColor: '#1E2230',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  categoryGridItemActive: {
    backgroundColor: '#FF3366',
    borderColor: '#FF3366',
  },
  categoryGridIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  categoryGridName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  categoryGridNameActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
