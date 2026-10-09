import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import {
  IRecurringBill,
  IDebtItem,
  IDebtSummary,
} from '@monett/shared';
import {
  getRecurringBillsApi,
  createRecurringBillApi,
  updateRecurringBillApi,
  toggleBillPaidApi,
  deleteRecurringBillApi,
  getDebtsApi,
  createDebtApi,
  updateDebtApi,
  toggleDebtSettledApi,
  deleteDebtApi,
} from '../services/api';

// Format tiền tệ VNĐ gọn gàng
const formatMoney = (amount: number): string => {
  if (!amount || isNaN(amount)) return '0 đ';
  return amount.toLocaleString('vi-VN') + ' đ';
};

const SAMPLE_BILLS: IRecurringBill[] = [
  {
    id: 'sample-bill-1',
    title: 'Tiền phòng trọ',
    amount: 2500000,
    dueDay: 5,
    remindBeforeDays: 3,
    isPaidThisMonth: false,
    category: 'Nhà cửa',
    note: 'Đóng trước ngày 5',
  },
  {
    id: 'sample-bill-2',
    title: 'Tiền điện nước & Internet',
    amount: 650000,
    dueDay: 15,
    remindBeforeDays: 3,
    isPaidThisMonth: true,
    category: 'Điện nước',
    note: '',
  },
];

const SAMPLE_DEBTS: IDebtItem[] = [
  {
    id: 'sample-debt-1',
    type: 'lend',
    personName: 'Anh Minh đồng nghiệp',
    amount: 500000,
    dueDate: '2026-10-15',
    isSettled: false,
    note: 'Tiền ăn trưa chung',
  },
];

export const BillsAndDebtsWidget: React.FC = () => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  // Modal hiển thị chi tiết: null (chỉ hiện thanh capsule trên trang chủ), 'bills' hoặc 'debts'
  const [detailModal, setDetailModal] = useState<'bills' | 'debts' | null>(null);

  // =================== STATE HÓA ĐƠN ĐỊNH KỲ ===================
  const [bills, setBills] = useState<IRecurringBill[]>(SAMPLE_BILLS);
  const [isBillFormOpen, setIsBillFormOpen] = useState<boolean>(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [billTitle, setBillTitle] = useState<string>('');
  const [billAmount, setBillAmount] = useState<string>('');
  const [billDueDay, setBillDueDay] = useState<number>(5);
  const [billBeforeDays, setBillBeforeDays] = useState<number>(3);
  const [isBillSubmitting, setIsBillSubmitting] = useState<boolean>(false);

  // =================== STATE SỔ GHI NỢ ===================
  const [debts, setDebts] = useState<IDebtItem[]>(SAMPLE_DEBTS);
  const [debtFilter, setDebtFilter] = useState<'all' | 'lend' | 'borrow'>('all');
  const [isDebtFormOpen, setIsDebtFormOpen] = useState<boolean>(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [debtType, setDebtType] = useState<'lend' | 'borrow'>('lend');
  const [debtPerson, setDebtPerson] = useState<string>('');
  const [debtAmount, setDebtAmount] = useState<string>('');
  const [debtDueDate, setDebtDueDate] = useState<string>('');
  const [isDebtSubmitting, setIsDebtSubmitting] = useState<boolean>(false);

  // 1. Tải dữ liệu từ Backend
  const loadData = async () => {
    try {
      const [billsData, debtsData] = await Promise.all([
        getRecurringBillsApi().catch(() => []),
        getDebtsApi().catch(() => []),
      ]);

      if (Array.isArray(billsData) && billsData.length > 0) {
        setBills(billsData);
      }
      if (Array.isArray(debtsData) && debtsData.length > 0) {
        setDebts(debtsData);
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Tính số lượng tóm tắt
  const debtSummary: IDebtSummary = useMemo(() => {
    let lendCount = 0;
    let lendTotal = 0;
    let borrowCount = 0;
    let borrowTotal = 0;

    debts.forEach((d) => {
      if (!d.isSettled) {
        if (d.type === 'lend') {
          lendCount += 1;
          lendTotal += d.amount || 0;
        } else {
          borrowCount += 1;
          borrowTotal += d.amount || 0;
        }
      }
    });

    return { lendCount, lendTotal, borrowCount, borrowTotal };
  }, [debts]);

  const unpaidBillsCount = useMemo(() => {
    return bills.filter((b) => !b.isPaidThisMonth).length;
  }, [bills]);

  const todayDay = new Date().getDate();

  // =================== HÓA ĐƠN ACTIONS ===================
  const handleToggleBillPaid = async (item: IRecurringBill) => {
    const updated = !item.isPaidThisMonth;
    setBills((prev) =>
      prev.map((b) => (b.id === item.id ? { ...b, isPaidThisMonth: updated } : b)),
    );

    try {
      if (!item.id.startsWith('sample-')) {
        await toggleBillPaidApi(item.id);
      }
    } catch {}
  };

  const handleDeleteBill = async (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
    try {
      if (!id.startsWith('sample-')) {
        await deleteRecurringBillApi(id);
      }
    } catch {}
  };

  const handleStartEditBill = (item: IRecurringBill) => {
    setEditingBillId(item.id);
    setBillTitle(item.title);
    setBillAmount(String(item.amount || ''));
    setBillDueDay(item.dueDay || 5);
    setBillBeforeDays(item.remindBeforeDays || 3);
    setIsBillFormOpen(true);
  };

  const handleSaveBill = async () => {
    const trimmedTitle = billTitle.trim();
    if (!trimmedTitle) return;
    const parsedAmount = parseInt(billAmount.replace(/\D/g, ''), 10) || 0;

    setIsBillSubmitting(true);

    if (editingBillId) {
      const targetId = editingBillId;
      setBills((prev) =>
        prev.map((b) =>
          b.id === targetId
            ? {
                ...b,
                title: trimmedTitle,
                amount: parsedAmount,
                dueDay: billDueDay,
                remindBeforeDays: billBeforeDays,
              }
            : b,
        ),
      );
      setIsBillFormOpen(false);
      setEditingBillId(null);
      setBillTitle('');
      setBillAmount('');

      try {
        if (!targetId.startsWith('sample-')) {
          await updateRecurringBillApi(targetId, {
            title: trimmedTitle,
            amount: parsedAmount,
            dueDay: billDueDay,
            remindBeforeDays: billBeforeDays,
          });
        }
      } catch {}
      finally {
        setIsBillSubmitting(false);
      }
      return;
    }

    const optimisticId = 'bill-' + Date.now();
    const newBill: IRecurringBill = {
      id: optimisticId,
      title: trimmedTitle,
      amount: parsedAmount,
      dueDay: billDueDay,
      remindBeforeDays: billBeforeDays,
      isPaidThisMonth: false,
    };

    setBills((prev) => [newBill, ...prev]);
    setIsBillFormOpen(false);
    setBillTitle('');
    setBillAmount('');

    try {
      const created = await createRecurringBillApi({
        title: trimmedTitle,
        amount: parsedAmount,
        dueDay: billDueDay,
        remindBeforeDays: billBeforeDays,
      });
      if (created?.id) {
        setBills((prev) => prev.map((b) => (b.id === optimisticId ? created : b)));
      }
    } catch {}
    finally {
      setIsBillSubmitting(false);
    }
  };

  // =================== SỔ GHI NỢ ACTIONS ===================
  const handleToggleDebtSettled = async (item: IDebtItem) => {
    const updated = !item.isSettled;
    setDebts((prev) =>
      prev.map((d) => (d.id === item.id ? { ...d, isSettled: updated } : d)),
    );

    try {
      if (!item.id.startsWith('sample-')) {
        await toggleDebtSettledApi(item.id);
      }
    } catch {}
  };

  const handleDeleteDebt = async (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    try {
      if (!id.startsWith('sample-')) {
        await deleteDebtApi(id);
      }
    } catch {}
  };

  const handleStartEditDebt = (item: IDebtItem) => {
    setEditingDebtId(item.id);
    setDebtType(item.type);
    setDebtPerson(item.personName);
    setDebtAmount(String(item.amount || ''));
    setDebtDueDate(item.dueDate || '');
    setIsDebtFormOpen(true);
  };

  const handleSaveDebt = async () => {
    const trimmedPerson = debtPerson.trim();
    if (!trimmedPerson) return;
    const parsedAmount = parseInt(debtAmount.replace(/\D/g, ''), 10) || 0;

    setIsDebtSubmitting(true);

    if (editingDebtId) {
      const targetId = editingDebtId;
      setDebts((prev) =>
        prev.map((d) =>
          d.id === targetId
            ? {
                ...d,
                type: debtType,
                personName: trimmedPerson,
                amount: parsedAmount,
                dueDate: debtDueDate,
              }
            : d,
        ),
      );
      setIsDebtFormOpen(false);
      setEditingDebtId(null);
      setDebtPerson('');
      setDebtAmount('');
      setDebtDueDate('');

      try {
        if (!targetId.startsWith('sample-')) {
          await updateDebtApi(targetId, {
            type: debtType,
            personName: trimmedPerson,
            amount: parsedAmount,
            dueDate: debtDueDate,
          });
        }
      } catch {}
      finally {
        setIsDebtSubmitting(false);
      }
      return;
    }

    const optimisticId = 'debt-' + Date.now();
    const newDebt: IDebtItem = {
      id: optimisticId,
      type: debtType,
      personName: trimmedPerson,
      amount: parsedAmount,
      dueDate: debtDueDate,
      isSettled: false,
    };

    setDebts((prev) => [newDebt, ...prev]);
    setIsDebtFormOpen(false);
    setDebtPerson('');
    setDebtAmount('');
    setDebtDueDate('');

    try {
      const created = await createDebtApi({
        type: debtType,
        personName: trimmedPerson,
        amount: parsedAmount,
        dueDate: debtDueDate,
      });
      if (created?.id) {
        setDebts((prev) => prev.map((d) => (d.id === optimisticId ? created : d)));
      }
    } catch {}
    finally {
      setIsDebtSubmitting(false);
    }
  };

  const filteredDebts = useMemo(() => {
    if (debtFilter === 'all') return debts;
    return debts.filter((d) => d.type === debtFilter);
  }, [debts, debtFilter]);

  return (
    <View style={styles.container}>
      {/* 1. THANH CAPSULE DUY NHẤT Ở TRANG CHỦ (Giữ y hệt 100% ảnh mẫu, không chiếm diện tích) */}
      <View style={styles.tabCapsuleContainer}>
        {/* Nút 1: Hóa đơn định kỳ */}
        <TouchableOpacity
          style={styles.tabCapsule}
          onPress={() => setDetailModal('bills')}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={16} color="#1E3A2F" style={{ marginRight: 6 }} />
          <Text style={styles.tabText}>{isVi ? 'Hóa đơn định kỳ' : 'Recurring Bills'}</Text>
          {unpaidBillsCount > 0 && (
            <View style={styles.pillCountBadge}>
              <Text style={styles.pillCountText}>{unpaidBillsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Nút 2: Sổ ghi nợ */}
        <TouchableOpacity
          style={styles.tabCapsule}
          onPress={() => setDetailModal('debts')}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={16} color="#1E3A2F" style={{ marginRight: 6 }} />
          <Text style={styles.tabText}>{isVi ? 'Sổ ghi nợ' : 'Debt Book'}</Text>
          {(debtSummary.lendCount > 0 || debtSummary.borrowCount > 0) && (
            <View style={[styles.pillCountBadge, { backgroundColor: '#E0E7FF' }]}>
              <Text style={[styles.pillCountText, { color: '#3730A3' }]}>
                {debtSummary.lendCount + debtSummary.borrowCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ======================= MODAL BOTTOM SHEET CHI TIẾT KHI BẤM VÀO ======================= */}
      <Modal
        visible={detailModal !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModal(null)}
      >
        <View style={styles.modalOverlay}>
          {/* Nền mờ phía sau - bấm vào để đóng */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDetailModal(null)}
          />

          {/* Bảng Bottom Sheet chi tiết */}
          <View style={styles.bottomSheetContainer}>
            {/* Thanh gạt trang trí ở đầu modal */}
            <View style={styles.sheetHandle} />

            {/* Header của Modal */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleWrap}>
                <Ionicons
                  name={detailModal === 'bills' ? 'time' : 'people'}
                  size={18}
                  color="#047857"
                  style={{ marginRight: 7 }}
                />
                <Text style={styles.modalHeaderTitle}>
                  {detailModal === 'bills'
                    ? (isVi ? 'HÓA ĐƠN ĐỊNH KỲ HÀNG THÁNG' : 'MONTHLY RECURRING BILLS')
                    : (isVi ? 'SỔ GHI NỢ (CHO VAY & ĐI VAY)' : 'DEBT BOOK (LEND & BORROW)')}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setDetailModal(null)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Thanh chuyển đổi tab nhanh bên trong modal */}
            <View style={styles.innerTabRow}>
              <TouchableOpacity
                style={[styles.innerTabBtn, detailModal === 'bills' && styles.innerTabBtnActive]}
                onPress={() => setDetailModal('bills')}
              >
                <Text style={[styles.innerTabText, detailModal === 'bills' && styles.innerTabTextActive]}>
                  {isVi ? '🕒 Hóa đơn định kỳ' : '🕒 Recurring Bills'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.innerTabBtn, detailModal === 'debts' && styles.innerTabBtnActive]}
                onPress={() => setDetailModal('debts')}
              >
                <Text style={[styles.innerTabText, detailModal === 'debts' && styles.innerTabTextActive]}>
                  {isVi ? '👥 Sổ ghi nợ' : '👥 Debt Book'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* NỘI DUNG CUỘN CHI TIẾT */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* === NỘI DUNG 1: HÓA ĐƠN ĐỊNH KỲ === */}
              {detailModal === 'bills' && (
                <View>
                  <View style={styles.subHeader}>
                    <Text style={styles.subTitle}>DANH SÁCH HÓA ĐƠN</Text>
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => {
                        const next = !isBillFormOpen;
                        setIsBillFormOpen(next);
                        if (next) {
                          setEditingBillId(null);
                          setBillTitle('');
                          setBillAmount('');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isBillFormOpen ? 'chevron-up-outline' : 'add-circle-outline'}
                        size={14}
                        color="#047857"
                        style={{ marginRight: 3 }}
                      />
                      <Text style={styles.addBtnText}>
                        {isBillFormOpen ? 'Đóng lại' : 'Thêm hóa đơn'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Form thêm / sửa hóa đơn */}
                  {isBillFormOpen && (
                    <View style={styles.formCard}>
                      <View style={styles.formTitleRow}>
                        <Text style={styles.formTitle}>
                          {editingBillId ? '✏️ Sửa hóa đơn định kỳ' : 'Thêm hóa đơn hàng tháng'}
                        </Text>
                        {editingBillId && (
                          <View style={styles.badgeEditing}>
                            <Text style={styles.badgeEditingText}>Đang sửa</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.inputWrap}>
                        <Ionicons name="receipt-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ví dụ: Tiền phòng, tiền điện, tiền nước..."
                          placeholderTextColor="#94A3B8"
                          value={billTitle}
                          onChangeText={setBillTitle}
                          autoFocus
                        />
                      </View>

                      <View style={styles.inputWrap}>
                        <Ionicons name="cash-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Số tiền (ví dụ: 1500000)"
                          placeholderTextColor="#94A3B8"
                          value={billAmount}
                          onChangeText={setBillAmount}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.selectorBlock}>
                        <View style={styles.selectorHeader}>
                          <Text style={styles.selectorLabel}>Ngày đến hạn hàng tháng:</Text>
                          <View style={styles.daySelectedBadge}>
                            <Text style={styles.daySelectedText}>Ngày {billDueDay} hàng tháng</Text>
                          </View>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                            const isSelected = billDueDay === d;
                            return (
                              <TouchableOpacity
                                key={`day-${d}`}
                                style={[styles.dayChip, isSelected && styles.dayChipActive]}
                                onPress={() => setBillDueDay(d)}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                                  {d}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      <View style={styles.selectorBlock}>
                        <Text style={styles.selectorLabel}>Nhắc bạn trước:</Text>
                        <View style={styles.chipsRow}>
                          {[1, 3, 5, 7].map((days) => {
                            const isSelected = billBeforeDays === days;
                            return (
                              <TouchableOpacity
                                key={`before-${days}`}
                                style={[styles.beforeDayChip, isSelected && styles.beforeDayChipActive]}
                                onPress={() => setBillBeforeDays(days)}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.beforeDayChipText,
                                    isSelected && styles.beforeDayChipTextActive,
                                  ]}
                                >
                                  {days} ngày
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.formFooter}>
                        <TouchableOpacity
                          style={styles.btnCancel}
                          onPress={() => {
                            setIsBillFormOpen(false);
                            setEditingBillId(null);
                          }}
                        >
                          <Text style={styles.btnCancelText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btnSubmit, !billTitle.trim() && styles.btnDisabled]}
                          onPress={handleSaveBill}
                          disabled={!billTitle.trim() || isBillSubmitting}
                        >
                          {isBillSubmitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons
                                name={editingBillId ? 'save-outline' : 'checkmark-circle-outline'}
                                size={15}
                                color="#FFFFFF"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={styles.btnSubmitText}>
                                {editingBillId ? 'Cập nhật' : 'Lưu hóa đơn'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Danh sách các hóa đơn */}
                  <View style={styles.itemsList}>
                    {bills.map((item) => {
                      const isPaid = item.isPaidThisMonth;
                      const daysLeft = item.dueDay - todayDay;
                      const isComingSoon = daysLeft >= 0 && daysLeft <= (item.remindBeforeDays || 3) && !isPaid;

                      return (
                        <View
                          key={item.id}
                          style={[styles.billCard, isPaid && styles.billCardPaid]}
                        >
                          <TouchableOpacity
                            style={[styles.tickCircle, isPaid && styles.tickCirclePaid]}
                            onPress={() => handleToggleBillPaid(item)}
                            activeOpacity={0.7}
                          >
                            {isPaid ? (
                              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                            ) : (
                              <View style={styles.tickDot} />
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.cardContent}
                            onPress={() => handleToggleBillPaid(item)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text
                                style={[styles.cardTitle, isPaid && styles.cardTitlePaid]}
                                numberOfLines={1}
                              >
                                {item.title}
                              </Text>
                              <Text style={[styles.billAmount, isPaid && styles.billAmountPaid]}>
                                {formatMoney(item.amount)}
                              </Text>
                            </View>

                            <View style={styles.cardMetaRow}>
                              <View style={styles.badgeDate}>
                                <Ionicons name="calendar-outline" size={10.5} color="#D97706" style={{ marginRight: 3 }} />
                                <Text style={styles.badgeDateText}>Ngày {item.dueDay} hàng tháng</Text>
                              </View>

                              <View style={styles.badgeBefore}>
                                <Ionicons name="notifications-outline" size={10} color="#64748B" style={{ marginRight: 3 }} />
                                <Text style={styles.badgeBeforeText}>Báo trước {item.remindBeforeDays} ngày</Text>
                              </View>

                              {isComingSoon && (
                                <View style={styles.badgeWarning}>
                                  <Text style={styles.badgeWarningText}>
                                    {daysLeft === 0 ? 'Đến hạn hôm nay!' : `Còn ${daysLeft} ngày`}
                                  </Text>
                                </View>
                              )}

                              {isPaid && (
                                <Text style={styles.statusPaidText}>Đã đóng tháng này ✓</Text>
                              )}
                            </View>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.btnActionEdit}
                            onPress={() => handleStartEditBill(item)}
                            activeOpacity={0.6}
                          >
                            <Ionicons name="pencil" size={12} color="#047857" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.btnActionDelete}
                            onPress={() => handleDeleteBill(item.id)}
                            activeOpacity={0.6}
                          >
                            <Ionicons name="close" size={13} color="#94A3B8" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* === NỘI DUNG 2: SỔ GHI NỢ === */}
              {detailModal === 'debts' && (
                <View>
                  {/* 2 Thẻ tổng quan */}
                  <View style={styles.debtOverviewRow}>
                    <TouchableOpacity
                      style={[
                        styles.overviewCard,
                        debtFilter === 'lend' && styles.overviewCardFocused,
                      ]}
                      onPress={() => setDebtFilter(debtFilter === 'lend' ? 'all' : 'lend')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.overviewTopRow}>
                        <View style={styles.iconSquareGreen}>
                          <Ionicons name="arrow-up-outline" size={18} color="#059669" style={{ transform: [{ rotate: '45deg' }] }} />
                        </View>
                        <View style={styles.peopleBadgeGreen}>
                          <Text style={styles.peopleBadgeGreenText}>
                            {debtSummary.lendCount} người
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.overviewLabel}>Đang cho mượn</Text>
                      <Text style={styles.overviewAmountGreen}>
                        + {formatMoney(debtSummary.lendTotal)}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.overviewCard,
                        debtFilter === 'borrow' && styles.overviewCardFocused,
                      ]}
                      onPress={() => setDebtFilter(debtFilter === 'borrow' ? 'all' : 'borrow')}
                      activeOpacity={0.85}
                    >
                      <View style={styles.overviewTopRow}>
                        <View style={styles.iconSquareRed}>
                          <Ionicons name="arrow-down-outline" size={18} color="#DC2626" style={{ transform: [{ rotate: '45deg' }] }} />
                        </View>
                        <View style={styles.peopleBadgeRed}>
                          <Text style={styles.peopleBadgeRedText}>
                            {debtSummary.borrowCount} người
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.overviewLabel}>Đang đi vay</Text>
                      <Text style={styles.overviewAmountRed}>
                        - {formatMoney(debtSummary.borrowTotal)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Header danh sách */}
                  <View style={[styles.subHeader, { marginTop: 12 }]}>
                    <Text style={styles.subTitle}>
                      {debtFilter === 'all'
                        ? 'DANH SÁCH GHI NỢ'
                        : debtFilter === 'lend'
                        ? 'ĐANG CHO MƯỢN'
                        : 'ĐANG ĐI VAY'}
                    </Text>

                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => {
                        const next = !isDebtFormOpen;
                        setIsDebtFormOpen(next);
                        if (next) {
                          setEditingDebtId(null);
                          setDebtPerson('');
                          setDebtAmount('');
                          setDebtDueDate('');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isDebtFormOpen ? 'chevron-up-outline' : 'add-circle-outline'}
                        size={14}
                        color="#047857"
                        style={{ marginRight: 3 }}
                      />
                      <Text style={styles.addBtnText}>
                        {isDebtFormOpen ? 'Đóng lại' : 'Thêm khoản nợ'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Form thêm / sửa khoản nợ */}
                  {isDebtFormOpen && (
                    <View style={styles.formCard}>
                      <View style={styles.formTitleRow}>
                        <Text style={styles.formTitle}>
                          {editingDebtId ? '✏️ Chỉnh sửa ghi nợ' : 'Thêm khoản nợ / cho vay'}
                        </Text>
                        {editingDebtId && (
                          <View style={styles.badgeEditing}>
                            <Text style={styles.badgeEditingText}>Đang sửa</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.typeSelectorRow}>
                        <TouchableOpacity
                          style={[styles.typeBtn, debtType === 'lend' && styles.typeBtnLendActive]}
                          onPress={() => setDebtType('lend')}
                        >
                          <Text style={[styles.typeBtnText, debtType === 'lend' && styles.typeBtnTextLendActive]}>
                            ↗ Đang cho mượn
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.typeBtn, debtType === 'borrow' && styles.typeBtnBorrowActive]}
                          onPress={() => setDebtType('borrow')}
                        >
                          <Text style={[styles.typeBtnText, debtType === 'borrow' && styles.typeBtnTextBorrowActive]}>
                            ↙ Đang đi vay
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.inputWrap}>
                        <Ionicons name="person-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Tên người (vd: Anh Nam, Bạn Linh...)"
                          placeholderTextColor="#94A3B8"
                          value={debtPerson}
                          onChangeText={setDebtPerson}
                        />
                      </View>

                      <View style={styles.inputWrap}>
                        <Ionicons name="cash-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Số tiền (vd: 500000)"
                          placeholderTextColor="#94A3B8"
                          value={debtAmount}
                          onChangeText={setDebtAmount}
                          keyboardType="numeric"
                        />
                      </View>

                      <View style={styles.inputWrap}>
                        <Ionicons name="calendar-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Hạn trả (vd: 15/10/2026 hoặc cuối tháng)"
                          placeholderTextColor="#94A3B8"
                          value={debtDueDate}
                          onChangeText={setDebtDueDate}
                        />
                      </View>

                      <View style={styles.formFooter}>
                        <TouchableOpacity
                          style={styles.btnCancel}
                          onPress={() => {
                            setIsDebtFormOpen(false);
                            setEditingDebtId(null);
                          }}
                        >
                          <Text style={styles.btnCancelText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btnSubmit, !debtPerson.trim() && styles.btnDisabled]}
                          onPress={handleSaveDebt}
                          disabled={!debtPerson.trim() || isDebtSubmitting}
                        >
                          {isDebtSubmitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons
                                name={editingDebtId ? 'save-outline' : 'checkmark-circle-outline'}
                                size={15}
                                color="#FFFFFF"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={styles.btnSubmitText}>
                                {editingDebtId ? 'Cập nhật' : 'Lưu ghi nợ'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Danh sách items nợ */}
                  <View style={styles.itemsList}>
                    {filteredDebts.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>Chưa có khoản nợ nào trong mục này</Text>
                      </View>
                    ) : (
                      filteredDebts.map((item) => {
                        const isLend = item.type === 'lend';
                        const isSettled = item.isSettled;

                        return (
                          <View
                            key={item.id}
                            style={[styles.debtItemCard, isSettled && styles.debtItemCardSettled]}
                          >
                            <TouchableOpacity
                              style={[styles.tickCircle, isSettled && styles.tickCirclePaid]}
                              onPress={() => handleToggleDebtSettled(item)}
                              activeOpacity={0.7}
                            >
                              {isSettled ? (
                                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                              ) : (
                                <View style={styles.tickDot} />
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.cardContent}
                              onPress={() => handleToggleDebtSettled(item)}
                              activeOpacity={0.7}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text
                                  style={[styles.cardTitle, isSettled && styles.cardTitlePaid]}
                                  numberOfLines={1}
                                >
                                  {item.personName}
                                </Text>
                                <Text
                                  style={[
                                    styles.debtAmountItem,
                                    isLend ? styles.debtAmountItemLend : styles.debtAmountItemBorrow,
                                    isSettled && styles.cardTitlePaid,
                                  ]}
                                >
                                  {isLend ? '+' : '-'} {formatMoney(item.amount)}
                                </Text>
                              </View>

                              <View style={styles.cardMetaRow}>
                                <View
                                  style={[
                                    styles.badgeType,
                                    isLend ? styles.badgeTypeLend : styles.badgeTypeBorrow,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.badgeTypeText,
                                      isLend ? styles.badgeTypeTextLend : styles.badgeTypeTextBorrow,
                                    ]}
                                  >
                                    {isLend ? 'Đang cho mượn' : 'Đang đi vay'}
                                  </Text>
                                </View>

                                {item.dueDate ? (
                                  <View style={styles.badgeDate}>
                                    <Ionicons name="time-outline" size={10} color="#64748B" style={{ marginRight: 3 }} />
                                    <Text style={styles.badgeBeforeText}>Hạn: {item.dueDate}</Text>
                                  </View>
                                ) : null}

                                {isSettled && (
                                  <Text style={styles.statusPaidText}>Đã thanh toán xong ✓</Text>
                                )}
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.btnActionEdit}
                              onPress={() => handleStartEditDebt(item)}
                              activeOpacity={0.6}
                            >
                              <Ionicons name="pencil" size={12} color="#047857" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.btnActionDelete}
                              onPress={() => handleDeleteDebt(item.id)}
                              activeOpacity={0.6}
                            >
                              <Ionicons name="close" size={13} color="#94A3B8" />
                            </TouchableOpacity>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    marginBottom: 6,
  },
  // THANH CAPSULE DUY NHẤT Ở TRANG CHỦ (Y hệt ảnh bạn gửi, cực kỳ gọn gàng)
  tabCapsuleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EC',
    borderRadius: 22,
    padding: 4,
  },
  tabCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 18,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A2F',
  },
  pillCountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    marginLeft: 6,
  },
  pillCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },

  // MODAL BOTTOM SHEET
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '86%',
    minHeight: 400,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Thanh tab nhỏ bên trong modal
  innerTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  innerTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  innerTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  innerTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  innerTabTextActive: {
    color: '#047857',
    fontWeight: '700',
  },

  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },

  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  addBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#047857',
  },

  // 2 Thẻ lớn tổng quan sổ ghi nợ
  debtOverviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewCardFocused: {
    borderColor: '#059669',
    backgroundColor: '#F9FDFB',
  },
  overviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconSquareGreen: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E6F4EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  peopleBadgeGreen: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  peopleBadgeGreenText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  iconSquareRed: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  peopleBadgeRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  peopleBadgeRedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  overviewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  overviewAmountGreen: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  overviewAmountRed: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },

  // Form Card
  formCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  formTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  badgeEditing: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgeEditingText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#B45309',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#1E293B',
    paddingVertical: 0,
  },
  selectorBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  daySelectedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  daySelectedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#047857',
  },
  dayScroll: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  dayChip: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  dayChipActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
  },
  beforeDayChip: {
    flex: 1,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  beforeDayChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  beforeDayChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  beforeDayChipTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  btnCancel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnCancelText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  btnSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
  },
  btnSubmitText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Chọn loại Cho mượn vs Đi vay
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBtnLendActive: {
    backgroundColor: '#E6F4EA',
    borderColor: '#059669',
  },
  typeBtnBorrowActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  typeBtnTextLendActive: {
    color: '#059669',
    fontWeight: '800',
  },
  typeBtnTextBorrowActive: {
    color: '#DC2626',
    fontWeight: '800',
  },

  // Danh sách items
  itemsList: {
    gap: 7,
  },
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  billCardPaid: {
    backgroundColor: '#F8FAFC',
    opacity: 0.72,
  },
  tickCircle: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  tickCirclePaid: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tickDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'transparent',
  },
  cardContent: {
    flex: 1,
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardTitlePaid: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  billAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },
  billAmountPaid: {
    color: '#94A3B8',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 5,
    flexWrap: 'wrap',
  },
  badgeDate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  badgeDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  badgeBefore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  badgeBeforeText: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '600',
  },
  badgeWarning: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  badgeWarningText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  statusPaidText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#059669',
  },
  btnActionEdit: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  btnActionDelete: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Debt items
  debtItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  debtItemCardSettled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.72,
  },
  debtAmountItem: {
    fontSize: 13,
    fontWeight: '800',
  },
  debtAmountItemLend: {
    color: '#059669',
  },
  debtAmountItemBorrow: {
    color: '#DC2626',
  },
  badgeType: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  badgeTypeLend: {
    backgroundColor: '#E6F4EA',
  },
  badgeTypeBorrow: {
    backgroundColor: '#FEE2E2',
  },
  badgeTypeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  badgeTypeTextLend: {
    color: '#059669',
  },
  badgeTypeTextBorrow: {
    color: '#DC2626',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
});
