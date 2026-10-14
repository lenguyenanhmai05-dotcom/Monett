import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';

interface CategoriesScreenProps {
  onBack?: () => void;
  onAddCategory?: () => void;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  onBack,
  onAddCategory,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  const expenseCategories: {
    id: string;
    name: string;
    iconName: keyof typeof Ionicons.glyphMap;
    spent: string;
    limit: string;
    color: string;
    bg: string;
  }[] = [
    { id: 'c1', name: isVi ? 'Ăn uống' : 'Food & Dining', iconName: 'restaurant-outline', spent: '520.000 đ', limit: '1.500.000 đ', color: '#10B981', bg: '#ECFDF5' },
    { id: 'c2', name: isVi ? 'Cà phê & Đồ uống' : 'Coffee & Drinks', iconName: 'cafe-outline', spent: '145.000 đ', limit: '500.000 đ', color: '#F59E0B', bg: '#FEF3C7' },
    { id: 'c3', name: isVi ? 'Mua sắm cá nhân' : 'Shopping', iconName: 'bag-handle-outline', spent: '200.000 đ', limit: '800.000 đ', color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'c4', name: isVi ? 'Di chuyển & Xăng xe' : 'Transportation', iconName: 'car-outline', spent: '180.000 đ', limit: '600.000 đ', color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'c5', name: isVi ? 'Hóa đơn & Tiện ích' : 'Bills & Utilities', iconName: 'receipt-outline', spent: '0 đ', limit: '1.200.000 đ', color: '#EF4444', bg: '#FEF2F2' },
    { id: 'c6', name: isVi ? 'Giải trí & Phim ảnh' : 'Entertainment', iconName: 'film-outline', spent: '0 đ', limit: '400.000 đ', color: '#EC4899', bg: '#FDF2F8' },
  ];

  const incomeCategories: {
    id: string;
    name: string;
    iconName: keyof typeof Ionicons.glyphMap;
    spent: string;
    limit: string;
    color: string;
    bg: string;
  }[] = [
    { id: 'i1', name: isVi ? 'Tiền lương' : 'Salary', iconName: 'cash-outline', spent: '15.000.000 đ', limit: isVi ? 'Định kỳ' : 'Regular', color: '#10B981', bg: '#ECFDF5' },
    { id: 'i2', name: isVi ? 'Thưởng & Tip' : 'Bonus & Tips', iconName: 'gift-outline', spent: '1.200.000 đ', limit: isVi ? 'Phát sinh' : 'Occasional', color: '#F59E0B', bg: '#FEF3C7' },
    { id: 'i3', name: isVi ? 'Freelance & Dự án' : 'Freelance & Projects', iconName: 'laptop-outline', spent: '3.500.000 đ', limit: isVi ? 'Linh hoạt' : 'Flexible', color: '#3B82F6', bg: '#EFF6FF' },
  ];

  const list = tab === 'expense' ? expenseCategories : incomeCategories;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.headerBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{isVi ? 'Quản Lý Danh Mục' : 'Category Management'}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAddCategory} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>{isVi ? '+ Thêm' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Tabs Chi tiêu / Thu nhập */}
        <View style={styles.typeTabs}>
          <TouchableOpacity
            style={[styles.typeTab, tab === 'expense' && styles.typeTabActive]}
            onPress={() => setTab('expense')}
          >
            <Text style={[styles.typeTabText, tab === 'expense' && styles.typeTabTextActive]}>
              {isVi ? `Chi tiêu (${expenseCategories.length})` : `Expenses (${expenseCategories.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeTab, tab === 'income' && styles.typeTabActive]}
            onPress={() => setTab('income')}
          >
            <Text style={[styles.typeTabText, tab === 'income' && styles.typeTabTextActive]}>
              {isVi ? `Thu nhập (${incomeCategories.length})` : `Income (${incomeCategories.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Danh sách mục */}
        {list.map((cat) => (
          <TouchableOpacity key={cat.id} style={styles.catCard} activeOpacity={0.75}>
            <View style={[styles.iconBox, { backgroundColor: cat.bg }]}>
              <Ionicons name={cat.iconName} size={20} color={cat.color} />
            </View>

            <View style={styles.catDetails}>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catSub}>
                {tab === 'expense'
                  ? (isVi ? `Hạn mức: ${cat.limit}` : `Budget: ${cat.limit}`)
                  : (isVi ? `Loại: ${cat.limit}` : `Type: ${cat.limit}`)}
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
