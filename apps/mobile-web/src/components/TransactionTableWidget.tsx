import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getTransactionsApi,
  createTransactionApi,
  updateTransactionApi,
  deleteTransactionApi,
} from '../services/api';

export interface TxItem {
  id: string;
  _id?: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  categoryIcon?: string;
  note?: string;
  date?: string;
  createdAt?: string;
}

const DEFAULT_TXS: TxItem[] = [
  { id: '1', title: 'Lẩu Haidilao cuối tuần', amount: -320000, type: 'expense', category: 'Ăn uống', categoryIcon: '🍲', note: 'Ăn cùng gia đình', date: '2026-10-01T19:30:00Z' },
  { id: '2', title: 'Cà phê Highland sáng', amount: -45000, type: 'expense', category: 'Cà phê', categoryIcon: '☕', note: 'Bàn công việc', date: '2026-10-01T08:15:00Z' },
  { id: '3', title: 'Thu nhập hoàn tiền thẻ', amount: 150000, type: 'income', category: 'Thu nhập', categoryIcon: '💰', note: 'Cashback tháng 9', date: '2026-09-30T10:00:00Z' },
  { id: '4', title: 'Siêu thị WinMart', amount: -185000, type: 'expense', category: 'Mua sắm', categoryIcon: '🛍️', note: 'Rau củ quả tươi', date: '2026-09-29T17:45:00Z' },
  { id: '5', title: 'Đổ xăng xe máy', amount: -80000, type: 'expense', category: 'Di chuyển', categoryIcon: '⛽', note: 'Đầy bình xăng', date: '2026-09-28T12:00:00Z' },
  { id: '6', title: 'Tiền thưởng dự án', amount: 3500000, type: 'income', category: 'Lương & Thưởng', categoryIcon: '💵', note: 'Thưởng mốc sprint', date: '2026-09-25T09:00:00Z' },
];

const CATEGORIES = ['Tất cả', 'Ăn uống', 'Cà phê', 'Mua sắm', 'Di chuyển', 'Thu nhập', 'Khác'];

export const TransactionTableWidget: React.FC<{ language?: 'vi' | 'en' }> = ({ language = 'vi' }) => {
  const isVi = language === 'vi';
  const [transactions, setTransactions] = useState<TxItem[]>(DEFAULT_TXS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('Tất cả');
  const [sortOption, setSortOption] = useState<'date_desc' | 'amount_asc' | 'amount_desc'>('date_desc');

  // Modal Sửa/Thêm
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<TxItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formCategory, setFormCategory] = useState('Ăn uống');
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await getTransactionsApi({
        category: selectedCat === 'Tất cả' ? undefined : selectedCat,
        search: searchTerm ? searchTerm : undefined,
        sort: sortOption,
      });
      const rawItems = (res as any)?.items || (res as any)?.data?.items;
      if (rawItems && Array.isArray(rawItems) && rawItems.length > 0) {
        setTransactions(rawItems);
      }
    } catch (e) {
      console.log('Using default mock transactions table:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedCat, sortOption]);

  // Lọc local nếu API offline hoặc fallback
  const filteredTxs = transactions.filter((tx) => {
    const matchCat = selectedCat === 'Tất cả' || tx.category === selectedCat;
    const matchSearch =
      !searchTerm ||
      tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchCat && matchSearch;
  }).sort((a, b) => {
    if (sortOption === 'amount_asc') return Math.abs(a.amount) - Math.abs(b.amount);
    if (sortOption === 'amount_desc') return Math.abs(b.amount) - Math.abs(a.amount);
    const dateA = new Date(a.date || a.createdAt || 0).getTime();
    const dateB = new Date(b.date || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const handleOpenAdd = () => {
    setEditingTx(null);
    setFormTitle('');
    setFormAmount('');
    setFormType('expense');
    setFormCategory('Ăn uống');
    setFormNote('');
    setEditModalVisible(true);
  };

  const handleOpenEdit = (tx: TxItem) => {
    setEditingTx(tx);
    setFormTitle(tx.title);
    setFormAmount(String(Math.abs(tx.amount)));
    setFormType(tx.type);
    setFormCategory(tx.category);
    setFormNote(tx.note || '');
    setEditModalVisible(true);
  };

  const handleDelete = (tx: TxItem) => {
    const txId = tx.id || tx._id || '';
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(isVi ? `Bạn có chắc muốn xóa "${tx.title}"?` : `Delete "${tx.title}"?`)) return;
    }

    setTransactions((prev) => prev.filter((item) => (item.id || item._id) !== txId));
    deleteTransactionApi(txId).catch((err) => console.log('Delete API offline fallback:', err));
  };

  const handleSaveModal = async () => {
    const num = Math.abs(parseInt(formAmount.replace(/\D/g, '') || '0', 10));
    if (!formTitle.trim()) {
      Alert.alert('Lỗi', isVi ? 'Vui lòng nhập tên khoản giao dịch' : 'Please enter title');
      return;
    }
    if (num <= 0) {
      Alert.alert('Lỗi', isVi ? 'Vui lòng nhập số tiền lớn hơn 0' : 'Amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    const payload = {
      title: formTitle.trim(),
      amount: formType === 'expense' ? -num : num,
      type: formType,
      category: formCategory,
      note: formNote.trim(),
    };

    try {
      if (editingTx) {
        const id = editingTx.id || editingTx._id || '';
        await updateTransactionApi(id, payload);
        setTransactions((prev) =>
          prev.map((item) => ((item.id || item._id) === id ? { ...item, ...payload } : item))
        );
      } else {
        const res: any = await createTransactionApi(payload);
        const newTx: TxItem = {
          id: res?.id || res?._id || String(Date.now()),
          ...payload,
          date: new Date().toISOString(),
        };
        setTransactions((prev) => [newTx, ...prev]);
      }
      setEditModalVisible(false);
    } catch (e) {
      // Fallback local update
      if (editingTx) {
        const id = editingTx.id || editingTx._id || '';
        setTransactions((prev) =>
          prev.map((item) => ((item.id || item._id) === id ? { ...item, ...payload } : item))
        );
      } else {
        const newTx: TxItem = {
          id: String(Date.now()),
          ...payload,
          date: new Date().toISOString(),
        };
        setTransactions((prev) => [newTx, ...prev]);
      }
      setEditModalVisible(false);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    try {
      const d = new Date(dateStr);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      return `${h}:${m} · ${day}/${mo}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.card}>
      {/* Header Table Widget */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="list-outline" size={20} color="#059669" />
          </View>
          <View>
            <Text style={styles.title}>{isVi ? 'Bảng Danh Sách Giao Dịch' : 'Transaction Master Table'}</Text>
            <Text style={styles.subtitle}>
              {isVi ? `Hiển thị ${filteredTxs.length} giao dịch thu chi gần đây` : `Showing ${filteredTxs.length} recent transactions`}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>{isVi ? 'Thêm giao dịch' : 'New Entry'}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter & Search Bar */}
      <View style={styles.filterBar}>
        {/* Search Input */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={isVi ? 'Tìm kiếm theo tên món, ghi chú...' : 'Search by title or note...'}
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Sort Options */}
        <View style={styles.sortRow}>
          <TouchableOpacity
            style={[styles.sortChip, sortOption === 'date_desc' && styles.sortChipActive]}
            onPress={() => setSortOption('date_desc')}
          >
            <Text style={[styles.sortChipText, sortOption === 'date_desc' && styles.sortChipTextActive]}>
              {isVi ? 'Mới nhất' : 'Latest'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sortOption === 'amount_desc' && styles.sortChipActive]}
            onPress={() => setSortOption('amount_desc')}
          >
            <Text style={[styles.sortChipText, sortOption === 'amount_desc' && styles.sortChipTextActive]}>
              {isVi ? 'Tiền cao nhất' : 'Highest'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sortOption === 'amount_asc' && styles.sortChipActive]}
            onPress={() => setSortOption('amount_asc')}
          >
            <Text style={[styles.sortChipText, sortOption === 'amount_asc' && styles.sortChipTextActive]}>
              {isVi ? 'Tiền thấp nhất' : 'Lowest'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catPill, selectedCat === cat && styles.catPillActive]}
            onPress={() => setSelectedCat(cat)}
          >
            <Text style={[styles.catPillText, selectedCat === cat && styles.catPillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* The Big Table */}
      <View style={styles.tableWrapper}>
        {/* Table Header */}
        <View style={styles.tableHead}>
          <Text style={[styles.th, { flex: 2.5 }]}>{isVi ? 'Khoản thu chi' : 'Title'}</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>{isVi ? 'Danh mục' : 'Category'}</Text>
          <Text style={[styles.th, { flex: 1.4 }]}>{isVi ? 'Thời gian' : 'Time'}</Text>
          <Text style={[styles.th, { flex: 1.6, textAlign: 'right' }]}>{isVi ? 'Số tiền' : 'Amount'}</Text>
          <Text style={[styles.th, { flex: 1.8, paddingLeft: 12 }]}>{isVi ? 'Ghi chú' : 'Note'}</Text>
          <Text style={[styles.th, { flex: 1.2, textAlign: 'center' }]}>{isVi ? 'Thao tác' : 'Actions'}</Text>
        </View>

        {/* Table Rows */}
        {loading ? (
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#059669" />
          </View>
        ) : filteredTxs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {isVi ? 'Không tìm thấy giao dịch nào phù hợp' : 'No transactions found'}
            </Text>
          </View>
        ) : (
          filteredTxs.map((tx, idx) => {
            const isExpense = tx.type === 'expense' || tx.amount < 0;
            return (
              <View key={tx.id || tx._id || idx} style={[styles.tableRow, idx % 2 === 1 && styles.rowAlt]}>
                {/* Title + Icon */}
                <View style={[styles.td, { flex: 2.5, flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={[styles.txIconSquare, { backgroundColor: isExpense ? '#FEF2F2' : '#ECFDF5' }]}>
                    <Text style={{ fontSize: 13 }}>{tx.categoryIcon || (isExpense ? '💸' : '💰')}</Text>
                  </View>
                  <Text style={styles.rowTitle} numberOfLines={1}>{tx.title}</Text>
                </View>

                {/* Category */}
                <View style={[styles.td, { flex: 1.2 }]}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText} numberOfLines={1}>{tx.category}</Text>
                  </View>
                </View>

                {/* Time */}
                <View style={[styles.td, { flex: 1.4 }]}>
                  <Text style={styles.timeText}>{formatDate(tx.date || tx.createdAt)}</Text>
                </View>

                {/* Amount */}
                <View style={[styles.td, { flex: 1.6, alignItems: 'flex-end' }]}>
                  <Text
                    style={[
                      styles.amountText,
                      { color: isExpense ? '#E11D48' : '#059669' },
                    ]}
                  >
                    {isExpense ? '-' : '+'}
                    {Math.abs(tx.amount).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                {/* Note */}
                <View style={[styles.td, { flex: 1.8, paddingLeft: 12 }]}>
                  <Text style={styles.noteText} numberOfLines={1}>
                    {tx.note || '--'}
                  </Text>
                </View>

                {/* Actions */}
                <View style={[styles.td, { flex: 1.2, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenEdit(tx)}
                  >
                    <Ionicons name="pencil-outline" size={15} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#FCA5A5' }]}
                    onPress={() => handleDelete(tx)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* MODAL THÊM / CHỈNH SỬA GIAO DỊCH */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTx ? (isVi ? 'Chỉnh Sửa Giao Dịch' : 'Edit Transaction') : (isVi ? 'Thêm Khoản Thu Chi Mới' : 'Add New Transaction')}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Type Switch */}
              <View style={styles.typeSwitchRow}>
                <TouchableOpacity
                  style={[styles.typeOption, formType === 'expense' && styles.typeExpenseActive]}
                  onPress={() => setFormType('expense')}
                >
                  <Text style={[styles.typeText, formType === 'expense' && styles.typeTextActive]}>
                    🔴 {isVi ? 'Khoản Chi' : 'Expense'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeOption, formType === 'income' && styles.typeIncomeActive]}
                  onPress={() => setFormType('income')}
                >
                  <Text style={[styles.typeText, formType === 'income' && styles.typeTextActive]}>
                    🟢 {isVi ? 'Khoản Thu' : 'Income'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.formLabel}>{isVi ? 'Tên giao dịch' : 'Title'}:</Text>
              <TextInput
                style={styles.formInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder={isVi ? 'VD: Ăn tối, Cà phê sáng...' : 'e.g. Dinner, Coffee...'}
                placeholderTextColor="#94A3B8"
              />

              {/* Amount */}
              <Text style={styles.formLabel}>{isVi ? 'Số tiền (VNĐ)' : 'Amount'}:</Text>
              <TextInput
                style={styles.formInput}
                value={formAmount ? parseInt(formAmount.replace(/\D/g, '') || '0', 10).toLocaleString('vi-VN') : ''}
                onChangeText={(t) => setFormAmount(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="0 đ"
                placeholderTextColor="#94A3B8"
              />

              {/* Category */}
              <Text style={styles.formLabel}>{isVi ? 'Danh mục' : 'Category'}:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {['Ăn uống', 'Cà phê', 'Mua sắm', 'Di chuyển', 'Giải trí', 'Lương & Thưởng', 'Khác'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.formCatChip, formCategory === c && styles.formCatChipActive]}
                    onPress={() => setFormCategory(c)}
                  >
                    <Text style={[styles.formCatText, formCategory === c && styles.formCatTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Note */}
              <Text style={styles.formLabel}>{isVi ? 'Ghi chú thêm' : 'Note'}:</Text>
              <TextInput
                style={[styles.formInput, { height: 60 }]}
                value={formNote}
                onChangeText={setFormNote}
                placeholder={isVi ? 'Địa điểm, ai ăn cùng, chi tiết...' : 'Location, companions...'}
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveModal}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>{isVi ? 'Lưu giao dịch' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  sortChipActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  catScroll: {
    marginBottom: 16,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  catPillTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  rowAlt: {
    backgroundColor: '#FAFAF9',
  },
  td: {
    justifyContent: 'center',
  },
  txIconSquare: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
  },
  amountText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  noteText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  typeSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeExpenseActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  typeIncomeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#4ADE80',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  typeTextActive: {
    color: '#0F172A',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  formCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formCatChipActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  formCatText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  formCatTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
