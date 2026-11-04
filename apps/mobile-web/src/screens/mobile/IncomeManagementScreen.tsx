import { useLanguage } from '../../contexts/LanguageContext';
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
  syncIncomesFromBackendTransactions,
  extractIncomesFromTransactions,
  getDeletedIncomeIds,
  deduplicateIncomeRecords,
  IncomeRecord,
} from '../../services/incomeStorage';
import { getTransactionsApi } from '../../services/api';
import { IncomeCategorySvgIcon, INCOME_CATEGORIES_LIST } from '../../components/IncomeCategorySvgIcon';
import { AddIncomeModal } from '../../components/AddIncomeModal';

interface IncomeManagementScreenProps {
  onBack: () => void;
  transactions?: any[];
}

export const IncomeManagementScreen: React.FC<IncomeManagementScreenProps> = ({ onBack, transactions }) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'month' | 'all'>('month');

  // Khởi tạo state incomes thuần túy (không side effect), loại bỏ các mục đã bị xóa và khử trùng lặp
  const [incomes, setIncomes] = useState<IncomeRecord[]>(() => {
    const deletedIds = getDeletedIncomeIds();
    const fromStorage = getIncomeRecords().filter((r) => !deletedIds.has(r.id));
    if (Array.isArray(transactions) && transactions.length > 0) {
      const fromTx = extractIncomesFromTransactions(transactions);
      return deduplicateIncomeRecords([...fromTx, ...fromStorage]);
    }
    return deduplicateIncomeRecords(fromStorage);
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Đăng ký lắng nghe sự kiện cập nhật khoản thu
  useEffect(() => {
    const unsub = subscribeIncomeUpdates((updated) => {
      const valid = deduplicateIncomeRecords(updated);
      setIncomes((prev) => {
        if (
          prev.length === valid.length &&
          prev.every((p, i) => p.id === valid[i]?.id && p.amount === valid[i]?.amount)
        ) {
          return prev;
        }
        return valid;
      });
    });
    return unsub;
  }, []);

  // Đồng bộ ngầm khi prop transactions thay đổi
  useEffect(() => {
    if (Array.isArray(transactions) && transactions.length > 0) {
      const synced = syncIncomesFromBackendTransactions(transactions);
      if (synced && synced.length > 0) {
        const valid = deduplicateIncomeRecords(synced);
        setIncomes((prev) => {
          if (
            prev.length === valid.length &&
            prev.every((p, i) => p.id === valid[i]?.id && p.amount === valid[i]?.amount)
          ) {
            return prev;
          }
          return valid;
        });
      }
    }
  }, [transactions]);

  // Tự động đồng bộ các khoản thu nhập từ backend MongoDB
  useEffect(() => {
    let isMounted = true;
    const fetchBackendIncomes = async () => {
      try {
        const monthRes: any = await getTransactionsApi({ limit: 300 });
        const txList = Array.isArray(monthRes) ? monthRes : monthRes?.data || monthRes?.items || [];
        if (Array.isArray(txList) && txList.length > 0 && isMounted) {
          const synced = syncIncomesFromBackendTransactions(txList);
          const valid = deduplicateIncomeRecords(synced);
          setIncomes((prev) => {
            if (
              prev.length === valid.length &&
              prev.every((p, i) => p.id === valid[i]?.id && p.amount === valid[i]?.amount)
            ) {
              return prev;
            }
            return valid;
          });
        }
      } catch (err) {}
    };
    fetchBackendIncomes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Danh sách các khoản thu của tháng đang xem
  const monthIncomes = useMemo(() => {
    return incomes.filter((r) => {
      if (!r || !r.date) return false;
      const d = new Date(r.date);
      if (!isNaN(d.getTime())) {
        return d.getFullYear() === viewYear && d.getMonth() + 1 === viewMonth;
      }
      const parts = String(r.date).split('-');
      return Number(parts[0]) === viewYear && Number(parts[1]) === viewMonth;
    });
  }, [incomes, viewYear, viewMonth]);

  // Tổng thu nhập của tháng đang chọn xem
  const monthTotalIncome = useMemo(() => {
    return monthIncomes.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [monthIncomes]);

  // Danh sách hiển thị theo tab (Tháng đang chọn hoặc Tất cả)
  const displayedIncomes = activeTab === 'month' ? monthIncomes : incomes;

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDelete = (id: string, title: string) => {
    const doDelete = async () => {
      setDeletingId(id);
      // 1. Cập nhật lạc quan (Optimistic UI): Xóa ngay khỏi danh sách hiển thị
      setIncomes((prev) => prev.filter((r) => r.id !== id));
      // 2. Xóa vĩnh viễn trong Storage và MongoDB Backend
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

        <Text style={styles.headerTitle}>{isVi ? 'Ngân Sách' : 'Budget'}</Text>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= THANH ĐIỀU HƯỚNG THÁNG/NĂM ================= */}
        <View style={styles.monthNavRow}>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color="#064E3B" />
          </TouchableOpacity>

          <Text style={styles.monthNavTitle}>
            {isVi ? `Thg ${viewMonth}, ${viewYear}` : `${viewMonth}/${viewYear}`}
          </Text>

          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={handleNextMonth}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={18} color="#064E3B" />
          </TouchableOpacity>
        </View>

        {/* ================= 1. CARD TỔNG THU NHẬP THEO THÁNG ================= */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.trendingIconBox}>
              <Ionicons name="trending-up" size={22} color="#059669" />
            </View>

            <View style={styles.summaryInfoCol}>
              <Text style={styles.summaryLabel}>
                TỔNG THU NHẬP (THÁNG {viewMonth}/{viewYear})
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
              <Text style={styles.countMainText}>{monthIncomes.length} khoản</Text>
            </View>

            <TouchableOpacity
              style={styles.addIncomeBtn}
              onPress={() => setIsAddModalOpen(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={17} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addIncomeBtnText}>{isVi ? 'Thêm Thu Nhập' : 'Add Income'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 2. TAB CHUYỂN ĐỔI: THÁNG NÀY VS TẤT CẢ ================= */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'month' && styles.tabBtnActive]}
            onPress={() => setActiveTab('month')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'month' && styles.tabBtnTextActive]}>
              Tháng {viewMonth} ({monthIncomes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]}>
              Tất cả lịch sử ({incomes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= 3. DANH SÁCH CÁC KHOẢN THU ================= */}
        {displayedIncomes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="wallet-outline" size={36} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'month'
                ? `Chưa có khoản thu nào trong Tháng ${viewMonth}/${viewYear}`
                : 'Chưa có khoản thu nhập nào'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Ghi chép các nguồn thu lương, thưởng, freelance để quản lý dòng tiền chính xác hơn nhé!
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setIsAddModalOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyAddBtnText}>+ Thêm Thu Nhập</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedIncomes.map((item) => {
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
        defaultDate={`${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(Math.min(now.getDate(), 28)).padStart(2, '0')}`}
        onSuccess={async () => {
          setIncomes(getIncomeRecords());
          try {
            const monthRes: any = await getTransactionsApi({ limit: 300 });
            const txList = Array.isArray(monthRes) ? monthRes : monthRes?.data || monthRes?.items || [];
            if (Array.isArray(txList) && txList.length > 0) {
              const synced = syncIncomesFromBackendTransactions(txList);
              setIncomes(synced);
            }
          } catch (_) {}
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#F5F0E8',
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
  closeBtn: {
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
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Thanh điều hướng tháng
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#ECE5D8',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  monthNavBtn: {
    padding: 6,
  },
  monthNavTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
    marginHorizontal: 12,
    letterSpacing: -0.2,
  },

  // 1. Thẻ tổng quan thu nhập
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
    marginBottom: 16,
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

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EBE5D8',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#064E3B',
    fontWeight: '800',
  },

  // Item Card
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
    marginTop: 4,
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
    textAlign: 'center',
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
