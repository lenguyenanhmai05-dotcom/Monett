import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  createTransactionApi,
  updateTransactionApi,
  uploadReceiptApi,
  scanReceiptOcrApi,
} from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface AddExpenseScreenProps {
  initialDate?: string;
  editingTransactionId?: string;
  initialData?: any;
  initialPhotoUrl?: string;
  initialMode?: 'bill' | 'food' | 'auto';
  onBack?: () => void;
  onSaveSuccess?: () => void;
}

export const AddExpenseScreen: React.FC<AddExpenseScreenProps> = ({
  initialPhotoUrl,
  initialMode = 'bill',
  initialDate,
  editingTransactionId,
  initialData,
  onBack,
  onSaveSuccess,
}) => {
  const { language } = useLanguage();
  const { addNotification } = useNotifications();
  const isVi = language === 'vi';
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialPhotoUrl || initialData?.photoUri);
  const [amountStr, setAmountStr] = useState(initialData?.amount ? String(Math.abs(initialData.amount)) : '0');
  const [title, setTitle] = useState(initialData?.title || '');
  const [selectedCategory, setSelectedCategory] = useState(initialData?.category || (isVi ? 'Ăn uống' : 'Food'));
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const processReceipt = async () => {
      if (!initialPhotoUrl) return;

      setIsScanning(true);
      setScanMessage(isVi ? 'Đang tải ảnh lên máy chủ...' : 'Uploading photo to server...');

      try {
        const uploadResponse = await uploadReceiptApi(initialPhotoUrl, 'image/jpeg', 'receipt.jpg');
        if (uploadResponse && isMounted) {
          setPhotoUrl(uploadResponse);
          setScanMessage(isVi ? 'AI đang phân tích hóa đơn...' : 'AI is analyzing receipt...');
          try {
            const ocrData = await scanReceiptOcrApi(uploadResponse);
            if (ocrData?.amount && isMounted) {
              setAmountStr(String(ocrData.amount));
            }
            if (ocrData?.supplier && isMounted) {
              setTitle(ocrData.supplier);
            }
          } catch (ocrErr) {
            console.log('OCR analysis skipped:', ocrErr);
          }
        }
      } catch (e: any) {
        console.warn('Upload receipt error:', e);
        if (isMounted) {
          setPhotoUrl(initialPhotoUrl);
        }
      } finally {
        if (isMounted) {
          setIsScanning(false);
        }
      }
    };

    processReceipt();
    return () => {
      isMounted = false;
    };
  }, [initialPhotoUrl]);

  const categories = [
    { id: '1', name: isVi ? 'Ăn uống' : 'Food', icon: '🍜' },
    { id: '2', name: isVi ? 'Cà phê' : 'Coffee', icon: '☕' },
    { id: '3', name: isVi ? 'Trà sữa' : 'Milk Tea', icon: '🧋' },
    { id: '4', name: isVi ? 'Ăn sáng' : 'Breakfast', icon: '🥪' },
    { id: '5', name: isVi ? 'Ăn trưa' : 'Lunch', icon: '🍱' },
    { id: '6', name: isVi ? 'Ăn tối' : 'Dinner', icon: '🍲' },
    { id: '7', name: isVi ? 'Đổ xăng' : 'Gas/Fuel', icon: '🛵' },
    { id: '8', name: isVi ? 'Đi chợ' : 'Groceries', icon: '🛒' },
    { id: '9', name: isVi ? 'Mua sắm' : 'Shopping', icon: '🛍️' },
    { id: '10', name: isVi ? 'Giải trí' : 'Entertainment', icon: '🎮' },
    { id: '11', name: isVi ? 'Hóa đơn' : 'Bills', icon: '⚡' },
    { id: '12', name: isVi ? 'Khác' : 'Other', icon: '📦' },
  ];

  // Định dạng hiển thị tiền tệ VND
  const formattedAmount = Number(amountStr || '0').toLocaleString('vi-VN') + ' đ';

  // Lưu giao dịch
  const handleSaveTransaction = async () => {
    const parsedAmount = parseInt(amountStr, 10);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      const msg = isVi ? 'Vui lòng nhập số tiền chi tiêu lớn hơn 0đ.' : 'Please enter an expense amount greater than 0.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert(isVi ? 'Chưa nhập số tiền' : 'Amount Required', msg);
      }
      return;
    }

    try {
      setIsSaving(true);

      // Nếu photoUrl là local blob chưa tải lên kịp, tải lên ngay
      let finalPhotoUri = photoUrl;
      if (
        finalPhotoUri &&
        (finalPhotoUri.startsWith('blob:') ||
          finalPhotoUri.startsWith('data:') ||
          finalPhotoUri.startsWith('file:') ||
          finalPhotoUri.startsWith('ph://'))
      ) {
        try {
          const upRes = await uploadReceiptApi(finalPhotoUri, 'image/jpeg', 'receipt.jpg');
          if (upRes) finalPhotoUri = upRes;
        } catch (upErr) {
          console.warn('Background upload during save warning:', upErr);
        }
      }

      const catIcon = categories.find((c) => c.name === selectedCategory)?.icon || '🍜';
      const payload = {
        title: title.trim() || selectedCategory,
        amount: -Math.abs(parsedAmount),
        type: 'expense' as const,
        category: selectedCategory,
        categoryIcon: catIcon,
        photoUri: finalPhotoUri,
        date: initialDate ? new Date(initialDate).toISOString() : new Date().toISOString(),
      };

      if (editingTransactionId && !editingTransactionId.startsWith('tx_')) {
        await updateTransactionApi(editingTransactionId, payload);
      } else {
        await createTransactionApi(payload);
        const formattedAmount = Math.abs(parsedAmount).toLocaleString('vi-VN');
        addNotification({
          type: 'expense',
          title: isVi ? 'Đã lưu chi tiêu mới 💰' : 'New expense recorded 💰',
          message: isVi
            ? `Khoản chi "${title.trim() || selectedCategory}" (${formattedAmount} đ) đã được ghi nhận vào sổ chi tiêu.`
            : `Expense "${title.trim() || selectedCategory}" (${formattedAmount} đ) has been recorded.`,
          iconBg: '#FFF1F2',
          iconColor: '#E11D48',
          metadata: {
            targetTab: 'home',
            amount: Math.abs(parsedAmount),
            category: selectedCategory,
          },
        });
      }

      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (err: any) {
      console.warn('Lỗi lưu giao dịch backend:', err);
      // Fallback vẫn cho đóng thành công nếu lỗi mạng để không chặn luồng người dùng
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {isScanning && (
        <View style={scanningStyles.scanningOverlay}>
          <View style={scanningStyles.scanningBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={scanningStyles.scanningText}>{scanMessage}</Text>
          </View>
        </View>
      )}

      {/* 1. Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingTransactionId ? (isVi ? 'Chỉnh Sửa Chi Tiêu' : 'Edit Expense') : (isVi ? 'Thêm Chi Tiêu' : 'Add Expense')}
        </Text>
        <TouchableOpacity
          style={styles.saveHeaderBtn}
          onPress={handleSaveTransaction}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveHeaderBtnText}>{isVi ? 'Lưu' : 'Save'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Hiển thị số tiền & ảnh thumbnail */}
        <View style={styles.amountHeroCard}>
          <View style={styles.amountWrapper}>
            <Text style={styles.amountLabel}>{isVi ? 'Số tiền chi (chạm để nhập)' : 'Expense Amount (tap to enter)'}</Text>
            
            <View style={styles.amountInputRow}>
              <TextInput
                value={amountStr === '0' ? '' : Number(amountStr).toLocaleString('vi-VN')}
                onChangeText={(val) => {
                  const raw = val.replace(/[^0-9]/g, '');
                  setAmountStr(raw || '0');
                }}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                style={styles.amountTextInput}
                selectTextOnFocus
                autoFocus={!photoUrl}
              />
              <Text style={styles.currencySuffix}>đ</Text>
            </View>

            {/* Các nút cộng nhanh tiền */}
            <View style={styles.quickAddRow}>
              {[10000, 20000, 50000, 100000].map((addVal) => (
                <TouchableOpacity
                  key={addVal}
                  style={styles.quickAddBtn}
                  onPress={() => {
                    const curr = parseInt(amountStr, 10) || 0;
                    setAmountStr(String(curr + addVal));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickAddBtnText}>+{addVal / 1000}k</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {photoUrl ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUrl }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.removePhotoBadge}
                onPress={() => setPhotoUrl(undefined)}
              >
                <Ionicons name="close" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* 3. Tên món / Ghi chú */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{isVi ? 'Tên khoản chi' : 'Expense Title'}</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="pencil-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={isVi ? 'VD: Bún bò, Cà phê sáng...' : 'e.g. Lunch, Morning coffee...'}
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
          </View>
        </View>

        {/* 4. Chọn Danh Mục */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{isVi ? 'Danh mục chi tiêu' : 'Category'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipIcon}>{cat.icon}</Text>
                  <Text
                    style={[styles.chipText, isSelected && styles.chipTextActive]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 5. Nút Xác nhận lưu */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSaveTransaction}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {isVi ? `Lưu chi tiêu (${formattedAmount})` : `Save Expense (${formattedAmount})`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  saveHeaderBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  amountHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  amountWrapper: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  amountTextInput: {
    fontSize: 32,
    fontWeight: '900',
    color: '#047857',
    padding: 0,
    letterSpacing: -0.5,
    minWidth: 80,
  },
  currencySuffix: {
    fontSize: 24,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 6,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  quickAddBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  photoContainer: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#047857',
  },
  chipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#047857',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

const scanningStyles = StyleSheet.create({
  scanningOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  scanningBox: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  scanningText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
});

Object.assign(styles, scanningStyles);

