import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';

interface CategoriesScreenProps {
  onBack?: () => void;
  onAddCategory?: () => void;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  onBack,
  onAddCategory,
}) => {
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  const expenseCategories = [
    { id: 'c1', name: 'Ăn uống', icon: '🍜', spent: '520.000 đ', limit: '1.500.000 đ', color: '#10B981', bg: '#ECFDF5' },
    { id: 'c2', name: 'Cà phê & Đồ uống', icon: '☕', spent: '145.000 đ', limit: '500.000 đ', color: '#F59E0B', bg: '#FEF3C7' },
    { id: 'c3', name: 'Mua sắm cá nhân', icon: '🛍️', spent: '200.000 đ', limit: '800.000 đ', color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'c4', name: 'Di chuyển & Xăng xe', icon: '🚗', spent: '180.000 đ', limit: '600.000 đ', color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'c5', name: 'Hóa đơn & Tiện ích', icon: '🧾', spent: '0 đ', limit: '1.200.000 đ', color: '#EF4444', bg: '#FEF2F2' },
    { id: 'c6', name: 'Giải trí & Phim ảnh', icon: '🎬', spent: '0 đ', limit: '400.000 đ', color: '#EC4899', bg: '#FDF2F8' },
  ];

  const incomeCategories = [
    { id: 'i1', name: 'Tiền lương', icon: '💰', spent: '15.000.000 đ', limit: 'Định kỳ', color: '#10B981', bg: '#ECFDF5' },
    { id: 'i2', name: 'Thưởng & Tip', icon: '🎁', spent: '1.200.000 đ', limit: 'Phát sinh', color: '#F59E0B', bg: '#FEF3C7' },
    { id: 'i3', name: 'Freelance & Dự án', icon: '💻', spent: '3.500.000 đ', limit: 'Linh hoạt', color: '#3B82F6', bg: '#EFF6FF' },
  ];

  const list = tab === 'expense' ? expenseCategories : incomeCategories;

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <Text style={styles.headerBtnIcon}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Quản Lý Danh Mục</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAddCategory} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Tabs Chi tiêu / Thu nhập */}
        <View style={styles.typeTabs}>
          <TouchableOpacity
            style={[styles.typeTab, tab === 'expense' && styles.typeTabActive]}
            onPress={() => setTab('expense')}
          >
            <Text style={[styles.typeTabText, tab === 'expense' && styles.typeTabTextActive]}>
              Chi tiêu ({expenseCategories.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeTab, tab === 'income' && styles.typeTabActive]}
            onPress={() => setTab('income')}
          >
            <Text style={[styles.typeTabText, tab === 'income' && styles.typeTabTextActive]}>
              Thu nhập ({incomeCategories.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Danh sách mục */}
        {list.map((cat) => (
          <TouchableOpacity key={cat.id} style={styles.catCard} activeOpacity={0.75}>
            <View style={[styles.iconBox, { backgroundColor: cat.bg }]}>
              <Text style={styles.catEmoji}>{cat.icon}</Text>
            </View>

            <View style={styles.catDetails}>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catSub}>
                {tab === 'expense' ? `Hạn mức: ${cat.limit}` : `Loại: ${cat.limit}`}
              </Text>
            </View>

            <View style={styles.amountCol}>
              <Text
                style={[
                  styles.spentValue,
                  tab === 'income' ? { color: '#059669' } : { color: '#111827' },
                ]}
              >
                {tab === 'income' ? `+${cat.spent}` : cat.spent}
              </Text>
              <Text style={styles.arrowIcon}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnIcon: {
    fontSize: 24,
    color: '#374151',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  typeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeTabTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catEmoji: {
    fontSize: 22,
  },
  catDetails: {
    flex: 1,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  catSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  amountCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spentValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#D1D5DB',
  },
});
