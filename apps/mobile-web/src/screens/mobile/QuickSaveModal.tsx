import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface QuickSaveModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveQuick: (amount: number, category: string, date?: string) => void;
  onOpenFullCamera: () => void;
  targetDate?: string;
}

export const QuickSaveModal: React.FC<QuickSaveModalProps> = ({
  visible,
  onClose,
  onSaveQuick,
  onOpenFullCamera,
  targetDate,
}) => {
  const { language } = useLanguage();
  const { addNotification } = useNotifications();
  const isVi = language === 'vi';
  const [amountStr, setAmountStr] = useState<string>('50000');
  const [selectedCategory, setSelectedCategory] = useState<string>('Ăn uống');

  const selectedAmount = parseInt(amountStr, 10) || 0;

  const presetAmounts = [20000, 35000, 50000, 80000, 100000, 150000, 200000];

  const quickCategories: {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
  }[] = [
    { id: 'food', name: isVi ? 'Ăn uống' : 'Food', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5' },
    { id: 'coffee', name: isVi ? 'Cà phê' : 'Coffee', icon: 'cafe-outline', color: '#7C3AED', bg: '#F5F3FF' },
    { id: 'milktea', name: isVi ? 'Trà sữa' : 'Milk Tea', icon: 'ice-cream-outline', color: '#DB2777', bg: '#FDF2F8' },
    { id: 'breakfast', name: isVi ? 'Ăn sáng' : 'Breakfast', icon: 'sunny-outline', color: '#D97706', bg: '#FEF3C7' },
    { id: 'lunch', name: isVi ? 'Ăn trưa' : 'Lunch', icon: 'fast-food-outline', color: '#10B981', bg: '#ECFDF5' },
    { id: 'dinner', name: isVi ? 'Ăn tối' : 'Dinner', icon: 'pizza-outline', color: '#DC2626', bg: '#FEF2F2' },
    { id: 'gas', name: isVi ? 'Đổ xăng' : 'Gas/Fuel', icon: 'car-outline', color: '#2563EB', bg: '#EFF6FF' },
    { id: 'groceries', name: isVi ? 'Đi chợ' : 'Groceries', icon: 'cart-outline', color: '#0D9488', bg: '#F0FDFA' },
    { id: 'shopping', name: isVi ? 'Mua sắm' : 'Shopping', icon: 'bag-handle-outline', color: '#4F46E5', bg: '#EEF2FF' },
    { id: 'entertainment', name: isVi ? 'Giải trí' : 'Entertainment', icon: 'game-controller-outline', color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'bills', name: isVi ? 'Hóa đơn' : 'Bills', icon: 'flash-outline', color: '#EA580C', bg: '#FFF7ED' },
    { id: 'other', name: isVi ? 'Khác' : 'Other', icon: 'cube-outline', color: '#64748B', bg: '#F1F5F9' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheetContainer}>
          {/* Thanh kéo handle indicator */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>{isVi ? 'Lưu nhanh khoản chi tiêu' : 'Quick Save Expense'}</Text>
              <Text style={styles.sheetSubtitle}>{isVi ? 'Nhập số tiền hoặc chạm chọn nhanh trong 3 giây' : 'Enter amount or tap quick select'}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            {/* 1. Ô nhập số tiền trực tiếp */}
            <View style={styles.amountInputContainer}>
              <Text style={styles.sectionHeading}>{isVi ? 'Nhập số tiền chi' : 'Enter amount'}</Text>
              <View style={styles.amountInputBox}>
                <TextInput
                  value={amountStr === '0' ? '' : Number(amountStr).toLocaleString('vi-VN')}
                  onChangeText={(val) => {
                    const raw = val.replace(/[^0-9]/g, '');
                    setAmountStr(raw || '0');
                  }}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  style={styles.amountInput}
                  selectTextOnFocus
                />
                <Text style={styles.currencyBadge}>đ</Text>
              </View>
            </View>

            {/* 2. Mức tiền gợi ý nhanh */}
            <Text style={[styles.sectionHeading, { marginTop: 12 }]}>{isVi ? 'Gợi ý số tiền nhanh' : 'Quick amount presets'}</Text>
            <View style={styles.presetsGrid}>
              {presetAmounts.map((amt) => {
                const isSelected = selectedAmount === amt;
                return (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => setAmountStr(String(amt))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isSelected && styles.presetChipTextActive,
                      ]}
                    >
                      {amt.toLocaleString('vi-VN')} đ
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Danh mục 1-chạm phong phú */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>{isVi ? 'Khoản chi này cho?' : 'What is this for?'}</Text>
            <View style={styles.catGrid}>
              {quickCategories.map((item) => {
                const isSelected = selectedCategory === item.name;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.catCard,
                      isSelected && {
                        borderColor: item.color,
                        borderWidth: 2,
                        backgroundColor: item.bg,
                        shadowColor: item.color,
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.2,
                        shadowRadius: 6,
                        elevation: 3,
                      },
                    ]}
                    onPress={() => setSelectedCategory(item.name)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.catIconBox, { backgroundColor: item.bg }]}>
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.catName,
                        isSelected && {
                          color: item.color,
                          fontWeight: '800',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* 4. Action Buttons */}
          <View style={styles.actionsRow}>
            {/* Nút chụp ảnh kèm theo */}
            <TouchableOpacity
              style={styles.cameraActionBtn}
              onPress={() => {
                onClose();
                onOpenFullCamera();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={18} color="#374151" />
              <Text style={styles.cameraActionText}>{isVi ? 'Chụp ảnh' : 'Photo'}</Text>
            </TouchableOpacity>

            {/* Nút Lưu ngay */}
            <TouchableOpacity
              style={[styles.saveNowBtn, selectedAmount <= 0 && styles.saveNowBtnDisabled]}
              onPress={() => {
                if (selectedAmount > 0) {
                  onSaveQuick(selectedAmount, selectedCategory, targetDate);
                  addNotification({
                    type: 'expense',
                    title: 'Đã lưu chi tiêu nhanh 💸',
                    message: `Khoản chi "${selectedCategory}" (${selectedAmount.toLocaleString('vi-VN')} đ) đã được ghi nhận thành công.`,
                    iconBg: '#ECFDF5',
                    iconColor: '#059669',
                    metadata: { targetTab: 'home', amount: selectedAmount, category: selectedCategory },
                  });
                  onClose();
                }
              }}
              disabled={selectedAmount <= 0}
              activeOpacity={0.85}
            >
              <Text style={styles.saveNowBtnText}>
                {isVi ? `Lưu ngay (${selectedAmount.toLocaleString('vi-VN')} đ)` : `Save now (${selectedAmount.toLocaleString('vi-VN')} đ)`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#E8E0D5',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6CEBF',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE7DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountInputContainer: {
    marginBottom: 6,
  },
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8E0D5',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#047857',
    padding: 0,
  },
  currencyBadge: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 6,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  presetChipTextActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  catCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catCardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  catIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  catName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  catNameActive: {
    color: '#065F46',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  cameraActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  cameraActionIcon: {
    fontSize: 18,
  },
  cameraActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  saveNowBtn: {
    flex: 1,
    backgroundColor: '#047857',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveNowBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveNowBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
