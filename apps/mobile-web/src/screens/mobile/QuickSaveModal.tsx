import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';

interface QuickSaveModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveQuick: (amount: number, category: string) => void;
  onOpenFullCamera: () => void;
}

export const QuickSaveModal: React.FC<QuickSaveModalProps> = ({
  visible,
  onClose,
  onSaveQuick,
  onOpenFullCamera,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(35000);
  const [selectedCategory, setSelectedCategory] = useState<string>('Cà phê');

  const presetAmounts = [20000, 35000, 50000, 80000, 100000, 150000];

  const quickCategories = [
    { name: 'Cà phê', icon: '☕' },
    { name: 'Ăn sáng', icon: '🍳' },
    { name: 'Ăn trưa', icon: '🍱' },
    { name: 'Đổ xăng', icon: '⛽' },
    { name: 'Đi chợ', icon: '🛒' },
    { name: 'Trà sữa', icon: '🧋' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheetContainer}>
          {/* Thanh kéo handle indicator */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Bạn vừa chi?</Text>
              <Text style={styles.sheetSubtitle}>Ghi chép nhanh 1 chạm chỉ trong 3 giây</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 1. Mức tiền gợi ý */}
          <Text style={styles.sectionHeading}>Chọn nhanh số tiền</Text>
          <View style={styles.presetsGrid}>
            {presetAmounts.map((amt) => {
              const isSelected = selectedAmount === amt;
              return (
                <TouchableOpacity
                  key={amt}
                  style={[styles.presetChip, isSelected && styles.presetChipActive]}
                  onPress={() => setSelectedAmount(amt)}
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

          {/* 2. Danh mục 1-chạm */}
          <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Khoản chi này cho?</Text>
          <View style={styles.catGrid}>
            {quickCategories.map((item) => {
              const isSelected = selectedCategory === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.catCard, isSelected && styles.catCardActive]}
                  onPress={() => setSelectedCategory(item.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.catIcon}>{item.icon}</Text>
                  <Text style={[styles.catName, isSelected && styles.catNameActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 3. Action Buttons */}
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
              <Text style={styles.cameraActionIcon}>📷</Text>
              <Text style={styles.cameraActionText}>Chụp ảnh</Text>
            </TouchableOpacity>

            {/* Nút Lưu ngay */}
            <TouchableOpacity
              style={styles.saveNowBtn}
              onPress={() => {
                onSaveQuick(selectedAmount, selectedCategory);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.saveNowBtnText}>
                Lưu ngay ({selectedAmount.toLocaleString('vi-VN')} đ)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
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
    backgroundColor: '#F3F4F6',
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
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  catIcon: {
    fontSize: 24,
    marginBottom: 4,
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
  saveNowBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
