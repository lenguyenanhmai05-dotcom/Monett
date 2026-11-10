import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import {
  createTransactionApi,
  updateTransactionApi,
  uploadReceiptApi,
  scanReceiptOcrApi,
  getBudgetApi,
} from '../../services/api';
import {
  getInitialDayRecordsFromLocalStorage,
  mergeTransactionsIntoDayRecords,
  saveDayRecordsToStorage,
  applyBudgetDelta,
  saveCachedBudget,
  notifyBudgetUpdated,
} from '../../services/calendarStorage';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { TransactionCategorySvgIcon } from '../../components/TransactionCategorySvgIcon';

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
  const amountInputRef = React.useRef<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialPhotoUrl || initialData?.photoUri);
  const [amountStr, setAmountStr] = useState(initialData?.amount ? String(Math.abs(initialData.amount)) : '0');
  const [title, setTitle] = useState(initialData?.title || '');
  const [selectedCategory, setSelectedCategory] = useState(initialData?.category || (isVi ? 'Ăn uống' : 'Food'));
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [scanType, setScanType] = useState<'bill' | 'food'>(initialMode === 'food' ? 'food' : 'bill');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>(
    initialPhotoUrl ? 'scanning' : 'idle'
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setScanType(initialMode === 'food' ? 'food' : 'bill');
    }
  }, [initialMode]);

  const categories = useMemo(() => [
    { id: 'food', name: isVi ? 'Ăn uống' : 'Food', icon: '🍜', color: '#059669', bg: '#ECFDF5' },
    { id: 'coffee', name: isVi ? 'Cà phê' : 'Coffee', icon: '☕', color: '#7C3AED', bg: '#F5F3FF' },
    { id: 'milktea', name: isVi ? 'Trà sữa' : 'Milk Tea', icon: '🧋', color: '#DB2777', bg: '#FDF2F8' },
    { id: 'gas', name: isVi ? 'Đổ xăng' : 'Gas/Fuel', icon: '🛵', color: '#2563EB', bg: '#EFF6FF' },
    { id: 'market', name: isVi ? 'Đi chợ' : 'Groceries', icon: '🛒', color: '#0D9488', bg: '#F0FDFA' },
    { id: 'shopping', name: isVi ? 'Mua sắm' : 'Shopping', icon: '🛍️', color: '#4F46E5', bg: '#EEF2FF' },
    { id: 'entertainment', name: isVi ? 'Giải trí' : 'Entertainment', icon: '🎮', color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'bills', name: isVi ? 'Hóa đơn' : 'Bills', icon: '⚡', color: '#EA580C', bg: '#FFF7ED' },
    { id: 'other', name: isVi ? 'Khác' : 'Other', icon: '📦', color: '#64748B', bg: '#F1F5F9' },
  ], [isVi]);

  // Quét AI và bóc tách thông tin trực tiếp từ ảnh hóa đơn hoặc ảnh món ăn
  const processReceipt = useCallback(async (targetUri: string, overrideType?: 'bill' | 'food') => {
    if (!targetUri) return;
    const activeType = overrideType || (initialMode === 'food' ? 'food' : 'bill');
    const isFood = activeType === 'food';
    setScanType(activeType);
    setIsScanning(true);
    setScanStatus('scanning');

    const loadingMsg = isFood
      ? (isVi ? 'Gemini AI đang nhận diện món ăn...' : 'Gemini AI is analyzing food...')
      : (isVi ? 'Gemini AI đang phân tích hóa đơn...' : 'Gemini AI is analyzing receipt...');
    setScanMessage(loadingMsg);

    let imageForScan = targetUri;
    let didUpload = false;

    // Nếu ảnh là URI cục bộ của thiết bị (file:/// hoặc ph://), tải lên server trước để backend có URL đọc được
    if (!imageForScan.startsWith('data:') && !imageForScan.startsWith('http')) {
      try {
        const uploadMsg = isFood
          ? (isVi ? 'Đang tải ảnh món ăn...' : 'Uploading food image...')
          : (isVi ? 'Đang tải ảnh hóa đơn...' : 'Uploading receipt image...');
        setScanMessage(uploadMsg);
        const uploadedUrl = await uploadReceiptApi(targetUri, 'image/jpeg', isFood ? 'food.jpg' : 'receipt.jpg');
        if (uploadedUrl) {
          imageForScan = uploadedUrl;
          setPhotoUrl(uploadedUrl);
          didUpload = true;
          setScanMessage(loadingMsg);
        }
      } catch (uploadErr) {
        console.warn('Pre-upload for OCR error:', uploadErr);
      }
    }

    // 1. Phân tích bằng Gemini Vision AI
    try {
      const ocrData = await scanReceiptOcrApi(imageForScan);
      if (ocrData) {
        const isDetectedFood = (ocrData as any).imageType === 'food' || isFood;
        setScanType(isDetectedFood ? 'food' : 'bill');

        if (typeof ocrData.amount === 'number' && ocrData.amount > 0) {
          setAmountStr(String(ocrData.amount));
        }
        if (ocrData.supplier && typeof ocrData.supplier === 'string' && ocrData.supplier.trim()) {
          setTitle(ocrData.supplier.trim());
        }
        if (ocrData.category && typeof ocrData.category === 'string') {
          const matched = categories.find(
            (c) =>
              c.name.toLowerCase() === ocrData.category.toLowerCase() ||
              ocrData.category.toLowerCase().includes(c.name.toLowerCase()) ||
              c.name.toLowerCase().includes(ocrData.category.toLowerCase())
          );
          setSelectedCategory(matched ? matched.name : ocrData.category);
        } else if (isDetectedFood) {
          setSelectedCategory(isVi ? 'Ăn uống' : 'Food');
        }

        const successMsg = isDetectedFood
          ? (ocrData.supplier && ocrData.supplier !== 'Món ăn ngon'
              ? (isVi ? `✓ Đã nhận diện món: ${ocrData.supplier}` : `✓ Food recognized: ${ocrData.supplier}`)
              : (isVi ? '✓ Đã nhận diện món ăn bằng Gemini AI' : '✓ Food recognized by Gemini AI'))
          : (isVi ? '✓ Đã nhận diện hóa đơn bằng Gemini AI' : '✓ Auto-extracted by Gemini AI');

        setScanStatus('success');
        setScanMessage(successMsg);
      } else {
        setScanStatus('failed');
        const failMsg = isFood
          ? (isVi ? 'Không nhận diện được món ăn từ ảnh này' : 'Could not recognize food from photo')
          : (isVi ? 'Không đọc được hóa đơn từ ảnh này' : 'Could not read receipt from photo');
        setScanMessage(failMsg);
      }
    } catch (ocrErr) {
      console.warn('AI OCR scan error:', ocrErr);
      setScanStatus('failed');
      const errFailMsg = isFood
        ? (isVi ? 'Lỗi nhận diện món ăn' : 'Food recognition error')
        : (isVi ? 'Lỗi phân tích hóa đơn' : 'OCR analysis error');
      setScanMessage(errFailMsg);
    } finally {
      setIsScanning(false);
    }

    // 2. Tải ảnh lên máy chủ ở chế độ nền nếu chưa tải
    if (!didUpload && targetUri.startsWith('data:')) {
      try {
        const uploadResponse = await uploadReceiptApi(targetUri, 'image/jpeg', isFood ? 'food.jpg' : 'receipt.jpg');
        if (uploadResponse) {
          setPhotoUrl(uploadResponse);
        }
      } catch (e: any) {
        console.warn('Background upload receipt warning:', e);
      }
    }
  }, [categories, initialMode, isVi]);

  useEffect(() => {
    if (initialPhotoUrl) {
      processReceipt(initialPhotoUrl);
    }
  }, [initialPhotoUrl, processReceipt]);

  // Chọn ảnh từ thư viện
  const handlePickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const uriToSend = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPhotoUrl(uriToSend);
        processReceipt(uriToSend);
      }
    } catch (err) {
      console.warn('Gallery pick error:', err);
    }
  };

  // Chụp ảnh bằng camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        const msg = isVi ? 'Cần cấp quyền camera để chụp ảnh hóa đơn' : 'Camera permission required';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert(isVi ? 'Quyền truy cập' : 'Permission', msg);
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const uriToSend = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPhotoUrl(uriToSend);
        processReceipt(uriToSend);
      }
    } catch (err) {
      console.warn('Camera snap error, fallback to gallery:', err);
      handlePickFromGallery();
    }
  };

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

      const now = new Date();
      let targetDateIso = now.toISOString();
      if (initialDate) {
        const parts = initialDate.split('-');
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
          targetDateIso = d.toISOString();
        } else {
          const parsed = new Date(initialDate);
          if (!isNaN(parsed.getTime())) {
            const d = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            targetDateIso = d.toISOString();
          }
        }
      }
      const uploadTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const catIcon = categories.find((c) => c.name === selectedCategory)?.icon || '🍜';
      const numAmount = Math.abs(parsedAmount);
      const payload = {
        title: title.trim() || selectedCategory,
        amount: -numAmount,
        type: 'expense' as const,
        category: selectedCategory,
        categoryIcon: catIcon,
        photoUri: finalPhotoUri,
        date: targetDateIso,
      };

      // 1. CẬP NHẬT NGAY LẬP TỨC SỐ DƯ KHẢ DỤNG (0ms Optimistic UI)
      if (!editingTransactionId) {
        applyBudgetDelta(numAmount);
      } else {
        const oldAmount = Math.abs(initialData?.rawAmount || initialData?.amount || 0);
        const diff = numAmount - oldAmount;
        if (diff !== 0) {
          applyBudgetDelta(diff);
        }
      }

      let savedTx: any = null;
      if (editingTransactionId && !editingTransactionId.startsWith('tx_')) {
        savedTx = await updateTransactionApi(editingTransactionId, payload);
      } else {
        savedTx = await createTransactionApi(payload);
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
            targetTab: 'photo_journal',
            amount: Math.abs(parsedAmount),
            category: selectedCategory,
          },
        });
      }

      // Đồng bộ tức thời vào dayRecords (IndexedDB & LocalStorage) để Web nhận diện ngay
      try {
        const curRecords = getInitialDayRecordsFromLocalStorage();
        const txObj = {
          ...payload,
          time: uploadTimeStr,
          createdAt: now.toISOString(),
          _id: savedTx?._id || savedTx?.id || editingTransactionId || `tx-${Date.now()}`,
        };
        const nextRecords = mergeTransactionsIntoDayRecords(curRecords, [txObj]);
        saveDayRecordsToStorage(nextRecords);
      } catch (storageErr) {
        console.warn('Lỗi đồng bộ local storage:', storageErr);
      }

      getBudgetApi()
        .then((fresh) => {
          if (fresh && fresh.limit) {
            saveCachedBudget(fresh);
            notifyBudgetUpdated(fresh);
          }
        })
        .catch(() => {});

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
          <TouchableOpacity
            style={styles.amountWrapper}
            activeOpacity={1}
            onPress={() => amountInputRef.current?.focus()}
          >
            <Text style={styles.amountLabel}>
              {isVi ? 'Số tiền chi (chạm để nhập)' : 'Expense Amount (tap to enter)'}
            </Text>

            <View style={styles.amountInputRow}>
              <TextInput
                ref={amountInputRef}
                value={amountStr === '0' ? '' : Number(amountStr).toLocaleString('vi-VN')}
                onChangeText={(val) => {
                  const raw = val.replace(/[^0-9]/g, '');
                  setAmountStr(raw || '0');
                }}
                placeholder="0"
                placeholderTextColor="#CBD5E1"
                keyboardType="numeric"
                style={[
                  styles.amountTextInput,
                  Platform.OS === 'web'
                    ? ({
                        width: `${Math.max(1, (amountStr === '0' ? '0' : Number(amountStr).toLocaleString('vi-VN')).length) + 0.3}ch`,
                        outlineStyle: 'none',
                      } as any)
                    : {},
                ]}
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
          </TouchableOpacity>

          {photoUrl ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUrl }} style={styles.photoThumb} />
              <View style={styles.photoOverlayBadge}>
                {isScanning ? (
                  <View style={styles.statusChipScanning}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={styles.statusChipScanningText}>
                      {isVi ? 'Đang đọc...' : 'Reading...'}
                    </Text>
                  </View>
                ) : scanStatus === 'success' ? (
                  <View style={styles.statusChipSuccess}>
                    <Ionicons name="sparkles" size={10} color="#059669" />
                    <Text style={styles.statusChipSuccessText}>AI OCR</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.removePhotoBadge}
                onPress={() => {
                  setPhotoUrl(undefined);
                  setScanStatus('idle');
                }}
              >
                <Ionicons name="close" size={13} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Thanh Chụp / Tải ảnh nếu chưa có ảnh */}
        {!photoUrl && (
          <View style={styles.attachReceiptRow}>
            <TouchableOpacity
              style={styles.attachActionBtn}
              onPress={handleTakePhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={17} color="#059669" />
              <Text style={styles.attachActionText}>
                {scanType === 'food' ? (isVi ? 'Chụp món ăn' : 'Snap food') : (isVi ? 'Chụp hóa đơn' : 'Snap receipt')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachActionBtn}
              onPress={handlePickFromGallery}
              activeOpacity={0.8}
            >
              <Ionicons name="images" size={17} color="#059669" />
              <Text style={styles.attachActionText}>
                {scanType === 'food' ? (isVi ? 'Tải ảnh món ăn' : 'Upload food') : (isVi ? 'Tải ảnh hóa đơn' : 'Upload receipt')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Thông báo trạng thái đọc AI khi có ảnh */}
        {photoUrl && (
          <View style={styles.aiStatusRow}>
            {isScanning ? (
              <View style={styles.aiStatusChip}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.aiStatusText}>
                  {scanMessage || (scanType === 'food'
                    ? (isVi ? 'Gemini AI đang nhận diện món ăn...' : 'Gemini AI analyzing food...')
                    : (isVi ? 'Gemini AI đang phân tích hóa đơn...' : 'Gemini AI analyzing receipt...'))}
                </Text>
              </View>
            ) : scanStatus === 'success' ? (
              <View style={[styles.aiStatusChip, styles.aiStatusSuccessChip]}>
                <Ionicons name="sparkles" size={15} color="#059669" />
                <Text style={styles.aiStatusSuccessText}>
                  {scanMessage || (scanType === 'food'
                    ? (isVi ? '✓ Đã nhận diện món ăn bằng Gemini AI' : '✓ Food recognized by Gemini AI')
                    : (isVi ? '✓ Đã nhận diện hóa đơn bằng Gemini AI' : '✓ Auto-extracted by Gemini AI'))}
                </Text>
                <TouchableOpacity
                  onPress={() => processReceipt(photoUrl, scanType)}
                  style={styles.rescanLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rescanLinkText}>{isVi ? 'Quét lại' : 'Re-scan'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.aiStatusChip}>
                <Ionicons name="image-outline" size={15} color="#64748B" />
                <Text style={styles.aiStatusNeutralText}>
                  {scanMessage || (isVi ? 'Đã đính kèm ảnh' : 'Photo attached')}
                </Text>
                <TouchableOpacity
                  onPress={() => processReceipt(photoUrl, scanType)}
                  style={styles.rescanLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rescanLinkText}>{isVi ? 'Thử quét AI' : 'Scan AI'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

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

        {/* 4. Chọn Danh Mục dạng Lưới 3 Cột (giống hình 2 "Lưu nhanh khoản chi tiêu") */}
        <View style={styles.inputGroup}>
          <Text style={styles.categoryHeaderTitle}>
            {isVi ? 'KHOẢN CHI NÀY CHO?' : 'WHAT IS THIS FOR?'}
          </Text>
          <View style={styles.catGrid}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catCard,
                    isSelected && {
                      borderColor: cat.color,
                      borderWidth: 2,
                      backgroundColor: cat.bg,
                      shadowColor: cat.color,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.18,
                      shadowRadius: 6,
                      elevation: 3,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.name)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.catIconBox,
                      { backgroundColor: isSelected ? '#FFFFFF' : cat.bg },
                    ]}
                  >
                    <TransactionCategorySvgIcon
                      category={cat.name}
                      categoryIcon={cat.icon}
                      size={24}
                      color={cat.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.catName,
                      isSelected && {
                        color: cat.color,
                        fontWeight: '800',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    backgroundColor: '#F5F0E8',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#F5F0E8',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
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
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  amountTextInput: {
    fontSize: 32,
    fontWeight: '900',
    color: '#047857',
    padding: 0,
    letterSpacing: -0.5,
    minWidth: 32,
    flexGrow: 0,
    flexShrink: 0,
  },
  currencySuffix: {
    fontSize: 22,
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
  attachReceiptRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  attachActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.2,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  attachActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  aiStatusRow: {
    marginBottom: 16,
  },
  aiStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  aiStatusSuccessChip: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  aiStatusText: {
    fontSize: 12.5,
    color: '#059669',
    fontWeight: '600',
    flex: 1,
  },
  aiStatusSuccessText: {
    fontSize: 12.5,
    color: '#065F46',
    fontWeight: '700',
    flex: 1,
  },
  aiStatusNeutralText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
  },
  rescanLink: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
  },
  rescanLinkText: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '700',
  },
  photoOverlayBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
  },
  statusChipScanning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusChipScanningText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  statusChipSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusChipSuccessText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
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
  categoryHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  catCard: {
    width: '31.5%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  catName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
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

