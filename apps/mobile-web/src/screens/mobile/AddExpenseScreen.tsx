import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';

interface AddExpenseScreenProps {
  initialPhotoUrl?: string;
  onBack?: () => void;
  onSaveSuccess?: () => void;
}

export const AddExpenseScreen: React.FC<AddExpenseScreenProps> = ({
  initialPhotoUrl,
  onBack,
  onSaveSuccess,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    initialPhotoUrl ||
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80'
  );
  const [amountStr, setAmountStr] = useState('85000');
  const [title, setTitle] = useState('Bún bò Huế');
  const [selectedCategory, setSelectedCategory] = useState('Ăn uống');
  const [selectedWallet, setSelectedWallet] = useState('Tiền mặt');

  const categories = [
    { id: '1', name: 'Ăn uống', icon: '🍜' },
    { id: '2', name: 'Cà phê', icon: '☕' },
    { id: '3', name: 'Mua sắm', icon: '🛍️' },
    { id: '4', name: 'Di chuyển', icon: '🚗' },
    { id: '5', name: 'Hóa đơn', icon: '🧾' },
    { id: '6', name: 'Khác', icon: '📦' },
  ];

  const wallets = [
    { id: 'w1', name: 'Tiền mặt', icon: '💵' },
    { id: 'w2', name: 'TPBank', icon: '💳' },
    { id: 'w3', name: 'MoMo', icon: '📱' },
  ];

  // Xử lý bàn phím số numpad
  const handleNumPress = (val: string) => {
    if (val === 'DEL') {
      setAmountStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else if (val === '000') {
      if (amountStr !== '0') setAmountStr((prev) => prev + '000');
    } else {
      setAmountStr((prev) => (prev === '0' ? val : prev + val));
    }
  };

  // Định dạng hiển thị tiền tệ VND
  const formattedAmount = Number(amountStr || '0').toLocaleString('vi-VN') + ' đ';

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm Chi Tiêu</Text>
        <TouchableOpacity
          style={styles.saveHeaderBtn}
          onPress={onSaveSuccess}
          activeOpacity={0.8}
        >
          <Text style={styles.saveHeaderBtnText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Hiển thị số tiền & ảnh thumbnail */}
        <View style={styles.amountHeroCard}>
          <View style={styles.amountWrapper}>
            <Text style={styles.amountLabel}>Số tiền chi</Text>
            <Text style={styles.amountText}>-{formattedAmount}</Text>
          </View>

          {photoUrl ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUrl }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.removePhotoBadge}
                onPress={() => setPhotoUrl(undefined)}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoPlaceholder}
              onPress={() =>
                setPhotoUrl(
                  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80'
                )
              }
            >
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoText}>Thêm ảnh</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Tên món / Ghi chú */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tên khoản chi</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>✏️</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="VD: Bún bò, Cà phê sáng..."
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
          </View>
        </View>

        {/* 4. Chọn Danh Mục */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Danh mục</Text>
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

        {/* 5. Chọn Nguồn Ví */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nguồn tiền</Text>
          <View style={styles.walletsRow}>
            {wallets.map((w) => {
              const isSelected = selectedWallet === w.name;
              return (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.walletItem, isSelected && styles.walletItemActive]}
                  onPress={() => setSelectedWallet(w.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.walletIcon}>{w.icon}</Text>
                  <Text
                    style={[styles.walletText, isSelected && styles.walletTextActive]}
                  >
                    {w.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 6. Bàn phím số NumPad */}
        <View style={styles.numpadContainer}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['000', '0', 'DEL'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.numpadRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.numKey,
                    key === 'DEL' && styles.delKey,
                    key === '000' && styles.tripleKey,
                  ]}
                  onPress={() => handleNumPress(key)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.numKeyText,
                      key === 'DEL' && styles.delKeyText,
                    ]}
                  >
                    {key === 'DEL' ? '⌫' : key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* 7. Nút Xác nhận lưu */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={onSaveSuccess}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>Xác nhận lưu khoản chi</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnIcon: {
    fontSize: 24,
    color: '#374151',
    marginTop: -2,
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
  amountText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#E11D48',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  photoContainer: {
    width: 72,
    height: 72,
    borderRadius: 14,
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  addPhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addPhotoIcon: {
    fontSize: 22,
  },
  addPhotoText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
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
    fontSize: 16,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  walletsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  walletItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  walletItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  walletIcon: {
    fontSize: 16,
  },
  walletText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  walletTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  numpadContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  numKey: {
    flex: 1,
    height: 48,
    marginHorizontal: 3,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numKeyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  delKey: {
    backgroundColor: '#FEE2E2',
  },
  delKeyText: {
    color: '#DC2626',
  },
  tripleKey: {
    backgroundColor: '#F3F4F6',
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
