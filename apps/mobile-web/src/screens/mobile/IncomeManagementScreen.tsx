import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getIncomeRecords,
  deleteIncomeRecord,
  subscribeIncomeUpdates,
  IncomeRecord,
} from '../../services/incomeStorage';
import { IncomeCategorySvgIcon, INCOME_CATEGORIES_LIST } from '../../components/IncomeCategorySvgIcon';
import { AddIncomeModal } from '../../components/AddIncomeModal';

interface IncomeManagementScreenProps {
  onBack: () => void;
}

export const IncomeManagementScreen: React.FC<IncomeManagementScreenProps> = ({ onBack }) => {
  const [incomes, setIncomes] = useState<IncomeRecord[]>(() => getIncomeRecords());
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  useEffect(() => {
    const unsub = subscribeIncomeUpdates((updated) => {
      setIncomes(updated);
    });
    return unsub;
  }, []);

  // Tổng thu nhập của tháng hiện tại
  const monthTotalIncome = useMemo(() => {
    return incomes.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [incomes]);

  const handleDelete = (id: string, title: string) => {
    const doDelete = async () => {
      setDeletingId(id);
      await deleteIncomeRecord(id);
      setDeletingId(null);
    };

    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`Bạn có chắc chắn muốn xóa khoản thu "${title}" không?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Xác nhận xóa',
        `Bạn có chắc chắn muốn xóa khoản thu "${title}" không?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color="#1E293B" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Quản Lý Thu Nhập</Text>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= 1. CARD TỔNG THU NHẬP (CHUẨN HÌNH 1) ================= */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.trendingIconBox}>
              <Ionicons name="trending-up" size={22} color="#059669" />
            </View>

            <View style={styles.summaryInfoCol}>
              <Text style={styles.summaryLabel}>
                TỔNG THU NHẬP (THÁNG {curMonth}/{curYear})
              </Text>
              <Text style={styles.summaryAmount} numberOfLines={1}>
                +{monthTotalIncome.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBottomRow}>
            <View>
              <Text style={styles.countSubText}>Số khoản thu</Text>
              <Text style={styles.countMainText}>{incomes.length} khoản</Text>
            </View>

            <TouchableOpacity
              style={styles.addIncomeBtn}
              onPress={() => setIsAddModalOpen(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={17} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addIncomeBtnText}>+ Thêm Thu Nhập</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 2. LỊCH SỬ THU NHẬP THÁNG NÀY ================= */}
        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>
            LỊCH SỬ THU NHẬP THÁNG NÀY ({incomes.length})
          </Text>
        </View>

        {incomes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="wallet-outline" size={36} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có khoản thu nhập nào</Text>
            <Text style={styles.emptySubtitle}>
              Ghi chép các nguồn thu lương, thưởng, freelance để quản lý dòng tiền chính xác hơn nhé!
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setIsAddModalOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyAddBtnText}>+ Thêm Khoản Thu Đầu Tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          incomes.map((item) => {
            const catMeta = INCOME_CATEGORIES_LIST.find((c) => c.name === item.category);
            const bgColor = catMeta?.bgColor || '#FEF3C7';

            return (
              <View key={item.id} style={styles.incomeItemCard}>
                {/* Icon Danh mục dạng SVG */}
                <View style={[styles.itemIconSquare, { backgroundColor: bgColor }]}>
                  <IncomeCategorySvgIcon
                    category={item.category}
                    size={24}
                    color={catMeta?.accentColor}
                  />
                </View>

                {/* Thông tin tên khoản thu, nguồn thu & ngày */}
                <View style={styles.itemCenterInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemCategoryBadge}>
                      {item.category}
                    </Text>
                    <Text style={styles.itemMetaDot}>•</Text>
                    <Ionicons name="calendar-outline" size={12} color="#64748B" style={{ marginRight: 3 }} />
                    <Text style={styles.itemDateText}>{item.date}</Text>
                  </View>
                </View>

                {/* Số tiền thu & Nút xóa */}
                <View style={styles.itemRightAction}>
                  <Text style={styles.itemAmountText}>
                    +{item.amount.toLocaleString('vi-VN')} đ
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id, item.title)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={deletingId === item.id}
                  >
                    <Ionicons name="trash-outline" size={17} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Khoảng cách đáy */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Thêm Thu Nhập */}
      <AddIncomeModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FAF7F2',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.3,
  },
  headerRightPlaceholder: {
    width: 38,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // 1. Thẻ tổng quan thu nhập (Chuẩn theo hình 1)
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFE9DF',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendingIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  summaryInfoCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.5,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F3EFE6',
    marginVertical: 14,
  },
  summaryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
  },
  countMainText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  addIncomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addIncomeBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // 2. Section Header
  listSectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },

  // 3. Item Card
  incomeItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFE9DF',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  itemIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemCenterInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCategoryBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  itemMetaDot: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 5,
  },
  itemDateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  itemRightAction: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  itemAmountText: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#047857',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  deleteBtn: {
    padding: 3,
  },

  // Empty state
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE9DF',
    marginTop: 8,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  emptyAddBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyAddBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
