import React, { useState, useEffect, useRef } from 'react';
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
import { useTheme } from '../contexts/ThemeContext';
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

const CATEGORY_MAP: Record<string, string> = {
  'Ăn uống': '🍲',
  'Cà phê': '☕',
  'Mua sắm': '🛍️',
  'Di chuyển': '⛽',
  'Giải trí': '🎬',
  'Học tập': '📚',
  'Lương & Thưởng': '💵',
  'Thu nhập': '💰',
  'Khác': '📦',
};

const FILTER_CATEGORIES = [
  'Tất cả',
  'Ăn uống',
  'Cà phê',
  'Mua sắm',
  'Di chuyển',
  'Giải trí',
  'Học tập',
  'Lương & Thưởng',
  'Thu nhập',
  'Khác',
];

const FORM_CATEGORIES = [
  'Ăn uống',
  'Cà phê',
  'Mua sắm',
  'Di chuyển',
  'Giải trí',
  'Học tập',
  'Lương & Thưởng',
  'Thu nhập',
  'Khác',
];

interface TransactionTableWidgetProps {
  language?: 'vi' | 'en';
  onChanged?: () => void;
}

export const TransactionTableWidget: React.FC<TransactionTableWidgetProps> = ({
  language = 'vi',
  onChanged,
}) => {
  const isVi = language === 'vi';
  const { isDark, colors } = useTheme();

  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('Tất cả');
  const [sortOption, setSortOption] = useState<'date_desc' | 'amount_asc' | 'amount_desc'>('date_desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal Sửa/Thêm
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<TxItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formCategory, setFormCategory] = useState('Ăn uống');
  const [formDate, setFormDate] = useState('');
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Xác nhận xóa
  const [deletingTx, setDeletingTx] = useState<TxItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounced search timer
  const searchTimeoutRef = useRef<any>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await getTransactionsApi({
        page,
        limit: 10,
        category: selectedCat === 'Tất cả' ? undefined : selectedCat,
        search: debouncedSearch.trim() || undefined,
        sort: sortOption,
      });

      const rawItems = (res as any)?.items || (res as any)?.data?.items || [];
      const total = (res as any)?.total ?? rawItems.length;
      const pages = (res as any)?.totalPages ?? Math.max(1, Math.ceil(total / 10));

      setTransactions(rawItems);
      setTotalCount(total);
      setTotalPages(pages);
    } catch (e: any) {
      console.error('Fetch transactions error:', e);
      setErrorMessage(
        isVi
          ? 'Không thể tải danh sách giao dịch từ hệ thống. Vui lòng thử lại.'
          : 'Failed to load transactions. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedCat, sortOption, debouncedSearch, page]);

  const handleOpenAdd = () => {
    setEditingTx(null);
    setFormTitle('');
    setFormAmount('');
    setFormType('expense');
    setFormCategory('Ăn uống');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setFormError(null);
    setEditModalVisible(true);
  };

  const handleOpenEdit = (tx: TxItem) => {
    setEditingTx(tx);
    setFormTitle(tx.title);
    setFormAmount(String(Math.abs(tx.amount)));
    setFormType(tx.type === 'income' ? 'income' : 'expense');
    setFormCategory(tx.category || 'Ăn uống');
    const existingDate = tx.date || tx.createdAt;
    setFormDate(existingDate ? new Date(existingDate).toISOString().split('T')[0] : '');
    setFormNote(tx.note || '');
    setFormError(null);
    setEditModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    const txId = deletingTx.id || deletingTx._id;
    if (!txId) return;

    try {
      setIsDeleting(true);
      await deleteTransactionApi(txId);
      setDeletingTx(null);
      fetchTransactions();
      if (onChanged) onChanged();
    } catch (err: any) {
      console.error('Delete transaction failed:', err);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể xóa giao dịch này. Vui lòng thử lại.' : 'Failed to delete transaction.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveModal = async () => {
    const num = Math.abs(parseInt(formAmount.replace(/\D/g, '') || '0', 10));
    if (!formTitle.trim()) {
      setFormError(isVi ? 'Vui lòng nhập tên khoản giao dịch' : 'Please enter title');
      return;
    }
    if (num <= 0) {
      setFormError(isVi ? 'Vui lòng nhập số tiền lớn hơn 0' : 'Amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      title: formTitle.trim(),
      amount: formType === 'expense' ? -num : num,
      type: formType,
      category: formCategory,
      categoryIcon: CATEGORY_MAP[formCategory] || '💸',
      note: formNote.trim(),
      date: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
    };

    try {
      if (editingTx) {
        const id = editingTx.id || editingTx._id || '';
        await updateTransactionApi(id, payload);
      } else {
        await createTransactionApi(payload);
      }
      setEditModalVisible(false);
      fetchTransactions();
      if (onChanged) onChanged();
    } catch (e: any) {
      console.error('Save transaction error:', e);
      setFormError(
        isVi
          ? 'Lưu giao dịch thất bại. Vui lòng kiểm tra lại kết nối.'
          : 'Failed to save transaction. Please check your connection.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const yr = d.getFullYear();
      return `${h}:${m} · ${day}/${mo}/${yr}`;
    } catch {
      return dateStr;
    }
  };

  const dynamicStyles = getStyles(isDark);

  return (
    <View style={dynamicStyles.card}>
      {/* Header Table Widget */}
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerLeft}>
          <View style={dynamicStyles.headerIconWrap}>
            <Ionicons name="list-outline" size={20} color="#059669" />
          </View>
          <View>
            <Text style={dynamicStyles.title}>
              {isVi ? 'Bảng Danh Sách Giao Dịch Chi Tiết' : 'Transaction Master Table'}
            </Text>
            <Text style={dynamicStyles.subtitle}>
              {isVi
                ? `Tổng cộng ${totalCount} giao dịch thu chi trong hệ thống`
                : `${totalCount} total entries in system`}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={dynamicStyles.addBtn} onPress={handleOpenAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={dynamicStyles.addBtnText}>{isVi ? 'Thêm giao dịch' : 'New Entry'}</Text>
        </TouchableOpacity>
      </View>

      {/* Filter & Search Bar */}
      <View style={dynamicStyles.filterBar}>
        {/* Search Input */}
        <View style={dynamicStyles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={dynamicStyles.searchInput}
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
        <View style={dynamicStyles.sortRow}>
          <TouchableOpacity
            style={[dynamicStyles.sortChip, sortOption === 'date_desc' && dynamicStyles.sortChipActive]}
            onPress={() => setSortOption('date_desc')}
          >
            <Text style={[dynamicStyles.sortChipText, sortOption === 'date_desc' && dynamicStyles.sortChipTextActive]}>
              {isVi ? 'Mới nhất' : 'Latest'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.sortChip, sortOption === 'amount_desc' && dynamicStyles.sortChipActive]}
            onPress={() => setSortOption('amount_desc')}
          >
            <Text style={[dynamicStyles.sortChipText, sortOption === 'amount_desc' && dynamicStyles.sortChipTextActive]}>
              {isVi ? 'Tiền cao nhất' : 'Highest'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.sortChip, sortOption === 'amount_asc' && dynamicStyles.sortChipActive]}
            onPress={() => setSortOption('amount_asc')}
          >
            <Text style={[dynamicStyles.sortChipText, sortOption === 'amount_asc' && dynamicStyles.sortChipTextActive]}>
              {isVi ? 'Tiền thấp nhất' : 'Lowest'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dynamicStyles.catScroll}>
        {FILTER_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[dynamicStyles.catPill, selectedCat === cat && dynamicStyles.catPillActive]}
            onPress={() => {
              setSelectedCat(cat);
              setPage(1);
            }}
          >
            <Text style={[dynamicStyles.catPillText, selectedCat === cat && dynamicStyles.catPillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Error Banner */}
      {errorMessage && (
        <View style={dynamicStyles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={dynamicStyles.errorBannerText}>{errorMessage}</Text>
          <TouchableOpacity style={dynamicStyles.retryBtn} onPress={fetchTransactions}>
            <Text style={dynamicStyles.retryBtnText}>{isVi ? 'Thử lại' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* The Big Table */}
      <View style={dynamicStyles.tableWrapper}>
        {/* Table Header */}
        <View style={dynamicStyles.tableHead}>
          <Text style={[dynamicStyles.th, { flex: 2.6 }]}>{isVi ? 'Khoản thu chi' : 'Title'}</Text>
          <Text style={[dynamicStyles.th, { flex: 1.2 }]}>{isVi ? 'Danh mục' : 'Category'}</Text>
          <Text style={[dynamicStyles.th, { flex: 1.5 }]}>{isVi ? 'Thời gian' : 'Time'}</Text>
          <Text style={[dynamicStyles.th, { flex: 1.5, textAlign: 'right' }]}>{isVi ? 'Số tiền' : 'Amount'}</Text>
          <Text style={[dynamicStyles.th, { flex: 1.7, paddingLeft: 12 }]}>{isVi ? 'Ghi chú' : 'Note'}</Text>
          <Text style={[dynamicStyles.th, { flex: 1.1, textAlign: 'center' }]}>{isVi ? 'Thao tác' : 'Actions'}</Text>
        </View>

        {/* Table Rows */}
        {loading ? (
          <View style={dynamicStyles.loadingBox}>
            <ActivityIndicator size="small" color="#059669" />
            <Text style={dynamicStyles.loadingText}>
              {isVi ? 'Đang cập nhật dữ liệu...' : 'Loading records...'}
            </Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={dynamicStyles.emptyBox}>
            <Ionicons name="receipt-outline" size={36} color="#94A3B8" style={{ marginBottom: 8 }} />
            <Text style={dynamicStyles.emptyText}>
              {isVi ? 'Chưa có giao dịch nào phù hợp bộ lọc' : 'No transactions match current filter'}
            </Text>
          </View>
        ) : (
          transactions.map((tx, idx) => {
            const isExpense = tx.type === 'expense' || tx.amount < 0;
            const rowKey = tx.id || tx._id || String(idx);
            return (
              <View
                key={rowKey}
                style={[dynamicStyles.tableRow, idx % 2 === 1 && dynamicStyles.rowAlt]}
              >
                {/* Title + Icon */}
                <View style={[dynamicStyles.td, { flex: 2.6, flexDirection: 'row', alignItems: 'center' }]}>
                  <View
                    style={[
                      dynamicStyles.txIconSquare,
                      { backgroundColor: isExpense ? (isDark ? '#450A0A' : '#FEF2F2') : (isDark ? '#064E3B' : '#ECFDF5') },
                    ]}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {tx.categoryIcon || CATEGORY_MAP[tx.category] || (isExpense ? '💸' : '💰')}
                    </Text>
                  </View>
                  <Text style={dynamicStyles.rowTitle} numberOfLines={1}>
                    {tx.title}
                  </Text>
                </View>

                {/* Category */}
                <View style={[dynamicStyles.td, { flex: 1.2 }]}>
                  <View style={dynamicStyles.categoryBadge}>
                    <Text style={dynamicStyles.categoryBadgeText} numberOfLines={1}>
                      {tx.category}
                    </Text>
                  </View>
                </View>

                {/* Time */}
                <View style={[dynamicStyles.td, { flex: 1.5 }]}>
                  <Text style={dynamicStyles.timeText}>{formatDate(tx.date || tx.createdAt)}</Text>
                </View>

                {/* Amount */}
                <View style={[dynamicStyles.td, { flex: 1.5, alignItems: 'flex-end' }]}>
                  <Text
                    style={[
                      dynamicStyles.amountText,
                      { color: isExpense ? '#E11D48' : '#059669' },
                    ]}
                  >
                    {isExpense ? '-' : '+'}
                    {Math.abs(tx.amount).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                {/* Note */}
                <View style={[dynamicStyles.td, { flex: 1.7, paddingLeft: 12 }]}>
                  <Text style={dynamicStyles.noteText} numberOfLines={1}>
                    {tx.note || '--'}
                  </Text>
                </View>

                {/* Actions */}
                <View style={[dynamicStyles.td, { flex: 1.1, flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                  <TouchableOpacity
                    style={dynamicStyles.actionBtn}
                    onPress={() => handleOpenEdit(tx)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={14} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[dynamicStyles.actionBtn, dynamicStyles.deleteActionBtn]}
                    onPress={() => setDeletingTx(tx)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <View style={dynamicStyles.paginationRow}>
          <Text style={dynamicStyles.paginationText}>
            {isVi
              ? `Trang ${page} / ${totalPages} (${totalCount} mục)`
              : `Page ${page} of ${totalPages} (${totalCount} items)`}
          </Text>
          <View style={dynamicStyles.paginationBtnGroup}>
            <TouchableOpacity
              style={[dynamicStyles.pageBtn, page <= 1 && dynamicStyles.pageBtnDisabled]}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <Ionicons name="chevron-back" size={16} color={page <= 1 ? '#94A3B8' : '#059669'} />
              <Text style={[dynamicStyles.pageBtnText, page <= 1 && dynamicStyles.pageBtnTextDisabled]}>
                {isVi ? 'Trước' : 'Prev'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dynamicStyles.pageBtn, page >= totalPages && dynamicStyles.pageBtnDisabled]}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <Text style={[dynamicStyles.pageBtnText, page >= totalPages && dynamicStyles.pageBtnTextDisabled]}>
                {isVi ? 'Sau' : 'Next'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? '#94A3B8' : '#059669'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODAL THÊM / CHỈNH SỬA GIAO DỊCH */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalBox}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>
                {editingTx
                  ? isVi
                    ? 'Chỉnh Sửa Giao Dịch'
                    : 'Edit Transaction'
                  : isVi
                  ? 'Thêm Khoản Thu Chi Mới'
                  : 'Add New Transaction'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.modalBody}>
              {formError && (
                <View style={dynamicStyles.formErrorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={dynamicStyles.formErrorText}>{formError}</Text>
                </View>
              )}

              {/* Type Switch */}
              <View style={dynamicStyles.typeSwitchRow}>
                <TouchableOpacity
                  style={[dynamicStyles.typeOption, formType === 'expense' && dynamicStyles.typeExpenseActive]}
                  onPress={() => setFormType('expense')}
                >
                  <Text style={[dynamicStyles.typeText, formType === 'expense' && dynamicStyles.typeTextActive]}>
                    🔴 {isVi ? 'Khoản Chi' : 'Expense'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[dynamicStyles.typeOption, formType === 'income' && dynamicStyles.typeIncomeActive]}
                  onPress={() => setFormType('income')}
                >
                  <Text style={[dynamicStyles.typeText, formType === 'income' && dynamicStyles.typeTextActive]}>
                    🟢 {isVi ? 'Khoản Thu' : 'Income'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={dynamicStyles.formLabel}>{isVi ? 'Tên giao dịch' : 'Title'}:</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder={isVi ? 'VD: Ăn tối, Cà phê sáng, Lương tháng...' : 'e.g. Dinner, Coffee, Salary...'}
                placeholderTextColor="#94A3B8"
              />

              {/* Amount */}
              <Text style={dynamicStyles.formLabel}>{isVi ? 'Số tiền (VNĐ)' : 'Amount'}:</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={formAmount ? parseInt(formAmount.replace(/\D/g, '') || '0', 10).toLocaleString('vi-VN') : ''}
                onChangeText={(t) => setFormAmount(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="0 đ"
                placeholderTextColor="#94A3B8"
              />

              {/* Date */}
              <Text style={dynamicStyles.formLabel}>{isVi ? 'Ngày ghi nhận (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'}:</Text>
              <TextInput
                style={dynamicStyles.formInput}
                value={formDate}
                onChangeText={setFormDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />

              {/* Category */}
              <Text style={dynamicStyles.formLabel}>{isVi ? 'Danh mục' : 'Category'}:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {FORM_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[dynamicStyles.formCatChip, formCategory === c && dynamicStyles.formCatChipActive]}
                    onPress={() => setFormCategory(c)}
                  >
                    <Text style={{ marginRight: 4 }}>{CATEGORY_MAP[c] || '📦'}</Text>
                    <Text style={[dynamicStyles.formCatText, formCategory === c && dynamicStyles.formCatTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Note */}
              <Text style={dynamicStyles.formLabel}>{isVi ? 'Ghi chú thêm' : 'Note'}:</Text>
              <TextInput
                style={[dynamicStyles.formInput, { height: 56 }]}
                value={formNote}
                onChangeText={setFormNote}
                placeholder={isVi ? 'Địa điểm, người đi cùng, chi tiết...' : 'Location, companions...'}
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>

            <View style={dynamicStyles.modalFooter}>
              <TouchableOpacity
                style={dynamicStyles.modalCancelBtn}
                onPress={() => setEditModalVisible(false)}
                disabled={submitting}
              >
                <Text style={dynamicStyles.modalCancelText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={dynamicStyles.modalSubmitBtn}
                onPress={handleSaveModal}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={dynamicStyles.modalSubmitText}>
                    {editingTx ? (isVi ? 'Cập nhật' : 'Update') : (isVi ? 'Lưu giao dịch' : 'Save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL XÁC NHẬN XÓA */}
      <Modal visible={!!deletingTx} transparent animationType="fade">
        <View style={dynamicStyles.modalOverlay}>
          <View style={[dynamicStyles.modalBox, { maxWidth: 400 }]}>
            <View style={dynamicStyles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="trash-bin-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={dynamicStyles.modalTitle}>{isVi ? 'Xác Nhận Xóa' : 'Confirm Delete'}</Text>
              </View>
              <TouchableOpacity onPress={() => setDeletingTx(null)} disabled={isDeleting}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={dynamicStyles.modalBody}>
              <Text style={[dynamicStyles.formLabel, { fontSize: 13, color: isDark ? '#E2E8F0' : '#1E293B', marginBottom: 8 }]}>
                {isVi
                  ? `Bạn có chắc muốn xóa vĩnh viễn giao dịch "${deletingTx?.title}" không?`
                  : `Are you sure you want to permanently delete "${deletingTx?.title}"?`}
              </Text>
              <Text style={{ fontSize: 12, color: '#94A3B8' }}>
                {isVi
                  ? 'Hành động này sẽ cập nhật lại trực tiếp số dư và ngân sách tháng.'
                  : 'This will directly update your balance and monthly budget.'}
              </Text>
            </View>
            <View style={dynamicStyles.modalFooter}>
              <TouchableOpacity
                style={dynamicStyles.modalCancelBtn}
                onPress={() => setDeletingTx(null)}
                disabled={isDeleting}
              >
                <Text style={dynamicStyles.modalCancelText}>{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dynamicStyles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={dynamicStyles.modalSubmitText}>{isVi ? 'Xóa vĩnh viễn' : 'Delete'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
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
      flexWrap: 'wrap',
      gap: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: isDark ? '#047857' : '#A7F3D0',
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    subtitle: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#059669',
      paddingHorizontal: 14,
      paddingVertical: 9,
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
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
      borderWidth: 1.2,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 38,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    sortRow: {
      flexDirection: 'row',
      gap: 6,
    },
    sortChip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      justifyContent: 'center',
    },
    sortChipActive: {
      backgroundColor: '#059669',
      borderColor: '#047857',
    },
    sortChipText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#475569',
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
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      marginRight: 8,
    },
    catPillActive: {
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
      borderColor: '#059669',
    },
    catPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    catPillTextActive: {
      color: '#059669',
      fontWeight: '700',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? '#991B1B' : '#FECACA',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 14,
    },
    errorBannerText: {
      flex: 1,
      fontSize: 12.5,
      color: isDark ? '#FCA5A5' : '#DC2626',
      fontWeight: '600',
    },
    retryBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: '#DC2626',
      borderRadius: 6,
    },
    retryBtnText: {
      fontSize: 11,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    tableWrapper: {
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 12,
      overflow: 'hidden',
    },
    tableHead: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#E2E8F0',
    },
    th: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#F1F5F9',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    },
    rowAlt: {
      backgroundColor: isDark ? '#192333' : '#FAFAF9',
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
      color: isDark ? '#F1F5F9' : '#1E293B',
      flex: 1,
    },
    categoryBadge: {
      backgroundColor: isDark ? '#334155' : '#F1F5F9',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    categoryBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#CBD5E1' : '#475569',
    },
    timeText: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    amountText: {
      fontSize: 13.5,
      fontWeight: '800',
    },
    noteText: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      fontStyle: 'italic',
    },
    actionBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? '#3B82F6' : '#BFDBFE',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
    },
    deleteActionBtn: {
      borderColor: isDark ? '#EF4444' : '#FCA5A5',
    },
    loadingBox: {
      padding: 36,
      alignItems: 'center',
      gap: 8,
    },
    loadingText: {
      fontSize: 12,
      color: '#94A3B8',
    },
    emptyBox: {
      padding: 36,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: '#94A3B8',
    },
    paginationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#F1F5F9',
    },
    paginationText: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    paginationBtnGroup: {
      flexDirection: 'row',
      gap: 8,
    },
    pageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      gap: 4,
    },
    pageBtnDisabled: {
      opacity: 0.4,
    },
    pageBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#059669',
    },
    pageBtnTextDisabled: {
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
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      width: '100%',
      maxWidth: 480,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#F1F5F9',
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    modalBody: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    formErrorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? '#991B1B' : '#FCA5A5',
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    formErrorText: {
      fontSize: 12,
      color: isDark ? '#FCA5A5' : '#DC2626',
      fontWeight: '600',
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
      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    typeExpenseActive: {
      backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
      borderColor: '#F87171',
    },
    typeIncomeActive: {
      backgroundColor: isDark ? '#064E3B' : '#DCFCE7',
      borderColor: '#4ADE80',
    },
    typeText: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    typeTextActive: {
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    formLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#CBD5E1' : '#475569',
      marginBottom: 4,
    },
    formInput: {
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
      color: isDark ? '#F1F5F9' : '#0F172A',
      marginBottom: 10,
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
    },
    formCatChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
      marginRight: 6,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    formCatChipActive: {
      backgroundColor: '#059669',
      borderColor: '#047857',
    },
    formCatText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#475569',
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
      borderTopColor: isDark ? '#334155' : '#F1F5F9',
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
    },
    modalCancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    modalCancelText: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
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
