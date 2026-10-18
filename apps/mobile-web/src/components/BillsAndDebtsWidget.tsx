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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export interface BillsAndDebtsWidgetProps {
  inline?: boolean;
  defaultTab?: 'bills' | 'debts';
  noMargin?: boolean;
}

export const BillsAndDebtsWidget: React.FC<BillsAndDebtsWidgetProps> = ({
  inline = false,
  defaultTab = 'bills',
  noMargin = false,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const [detailModal, setDetailModal] = useState<'bills' | 'debts' | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
  const [debtNote, setDebtNote] = useState<string>('');
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
    setDebtNote(item.note || '');
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
                note: debtNote,
              }
            : d,
        ),
      );
      setIsDebtFormOpen(false);
      setEditingDebtId(null);
      setDebtPerson('');
      setDebtAmount('');
      setDebtDueDate('');
      setDebtNote('');

      try {
        if (!targetId.startsWith('sample-')) {
          await updateDebtApi(targetId, {
            type: debtType,
            personName: trimmedPerson,
            amount: parsedAmount,
            dueDate: debtDueDate,
            note: debtNote,
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
      note: debtNote,
      isSettled: false,
    };

    setDebts((prev) => [newDebt, ...prev]);
    setIsDebtFormOpen(false);
    setDebtPerson('');
    setDebtAmount('');
    setDebtDueDate('');
    setDebtNote('');

    try {
      const created = await createDebtApi({
        type: debtType,
        personName: trimmedPerson,
        amount: parsedAmount,
        dueDate: debtDueDate,
        note: debtNote,
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

  const renderSegmentedControl = (
    activeTab: 'bills' | 'debts',
    onSelectTab: (tab: 'bills' | 'debts') => void
  ) => (
    <View style={styles.segmentedControl}>
      <TouchableOpacity
        style={[styles.segmentBtn, activeTab === 'bills' && styles.segmentBtnActive]}
        onPress={() => onSelectTab('bills')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="receipt-outline"
          size={16}
          color={activeTab === 'bills' ? '#047857' : '#64748B'}
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.segmentText, activeTab === 'bills' && styles.segmentTextActive]}>
          {isVi ? 'Hóa đơn định kỳ' : 'Recurring Bills'}
        </Text>
        {unpaidBillsCount > 0 && (
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{unpaidBillsCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segmentBtn, activeTab === 'debts' && styles.segmentBtnActive]}
        onPress={() => onSelectTab('debts')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="people-outline"
          size={16}
          color={activeTab === 'debts' ? '#047857' : '#64748B'}
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.segmentText, activeTab === 'debts' && styles.segmentTextActive]}>
          {isVi ? 'Sổ ghi nợ' : 'Debt Book'}
        </Text>
        {(debtSummary.lendCount > 0 || debtSummary.borrowCount > 0) && (
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>
              {debtSummary.lendCount + debtSummary.borrowCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderTabContent = (currentActiveTab: 'bills' | 'debts') => (
    <View>
      {/* ============================================================== */}
      {/* TAB 1: HÓA ĐƠN ĐỊNH KỲ */}
      {/* ============================================================== */}
      {currentActiveTab === 'bills' && (
        <View>
                {/* Form thêm/sửa hóa đơn to bản, tối giản, sang trọng */}
                {isBillFormOpen ? (
                  <View style={styles.formCard}>
                    <View style={styles.formCardHeader}>
                      <Text style={styles.formCardTitle}>
                        {editingBillId
                          ? (isVi ? '✏️ Chỉnh sửa hóa đơn' : 'Edit Bill')
                          : (isVi ? 'Thêm hóa đơn mới' : 'New Recurring Bill')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setIsBillFormOpen(false);
                          setEditingBillId(null);
                        }}
                      >
                        <Ionicons name="close" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>

                    {/* 1. Tên hóa đơn */}
                    <Text style={styles.inputLabel}>{isVi ? 'Tên hóa đơn / Khoản phí' : 'Bill Name'}</Text>
                    <View style={[styles.inputBox, focusedInput === 'billTitle' && styles.inputBoxFocused]}>
                      <Ionicons
                        name="receipt-outline"
                        size={18}
                        color={focusedInput === 'billTitle' ? '#047857' : '#94A3B8'}
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder={isVi ? 'Ví dụ: Tiền phòng trọ, Điện nước, Wifi...' : 'e.g. Rent, Electricity, Internet...'}
                        placeholderTextColor="#94A3B8"
                        value={billTitle}
                        onChangeText={setBillTitle}
                        onFocus={() => setFocusedInput('billTitle')}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </View>

                    {/* 2. Số tiền */}
                    <Text style={styles.inputLabel}>{isVi ? 'Số tiền định kỳ' : 'Amount'}</Text>
                    <View style={[styles.inputBox, focusedInput === 'billAmount' && styles.inputBoxFocused]}>
                      <TextInput
                        style={[styles.textInput, { fontSize: 18, fontWeight: '800', color: '#047857' }]}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={billAmount ? Number(billAmount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                        onChangeText={(val) => setBillAmount(val.replace(/\D/g, ''))}
                        onFocus={() => setFocusedInput('billAmount')}
                        onBlur={() => setFocusedInput(null)}
                      />
                      <Text style={[styles.currencyBadge, focusedInput === 'billAmount' && { color: '#047857' }]}>đ</Text>
                    </View>

                    {/* Nút gợi ý tiền nhanh */}
                    <View style={styles.presetsRow}>
                      {[200000, 500000, 1000000, 2000000, 3000000, 5000000].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={styles.presetChip}
                          onPress={() => setBillAmount(String(amt))}
                        >
                          <Text style={styles.presetChipText}>{amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 3. Ngày đến hạn hàng tháng */}
                    <View style={styles.dueDayHeaderRow}>
                      <Text style={styles.inputLabel}>{isVi ? 'Ngày đến hạn hàng tháng' : 'Due Day Each Month'}</Text>
                      <View style={styles.selectedDayBadge}>
                        <Text style={styles.selectedDayBadgeText}>
                          {isVi ? `Ngày ${billDueDay} hàng tháng` : `Day ${billDueDay}`}
                        </Text>
                      </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScrollRow}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                        const isSelected = billDueDay === d;
                        return (
                          <TouchableOpacity
                            key={`due-${d}`}
                            style={[styles.daySquare, isSelected && styles.daySquareActive]}
                            onPress={() => setBillDueDay(d)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.daySquareText, isSelected && styles.daySquareTextActive]}>
                              {d}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* 4. Nhắc trước */}
                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>{isVi ? 'Báo nhắc nhở trước' : 'Remind Before'}</Text>
                    <View style={styles.remindBeforeRow}>
                      {[1, 3, 5, 7].map((days) => {
                        const isSelected = billBeforeDays === days;
                        return (
                          <TouchableOpacity
                            key={`remind-${days}`}
                            style={[styles.remindChip, isSelected && styles.remindChipActive]}
                            onPress={() => setBillBeforeDays(days)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.remindChipText, isSelected && styles.remindChipTextActive]}>
                              {days} {isVi ? 'ngày' : 'days'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Nút hành động Lưu */}
                    <View style={styles.formBtnRow}>
                      <TouchableOpacity
                        style={styles.btnSecondary}
                        onPress={() => {
                          setIsBillFormOpen(false);
                          setEditingBillId(null);
                        }}
                      >
                        <Text style={styles.btnSecondaryText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnPrimary, !billTitle.trim() && styles.btnPrimaryDisabled]}
                        onPress={handleSaveBill}
                        disabled={!billTitle.trim() || isBillSubmitting}
                      >
                        {isBillSubmitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.btnPrimaryText}>
                            {editingBillId ? (isVi ? 'Cập nhật' : 'Update') : (isVi ? 'Lưu hóa đơn' : 'Save Bill')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* Nút to để mở form thêm hóa đơn */
                  <TouchableOpacity
                    style={styles.addNewCardBtn}
                    onPress={() => {
                      setIsBillFormOpen(true);
                      setEditingBillId(null);
                      setBillTitle('');
                      setBillAmount('');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.addNewIconCircle}>
                      <Ionicons name="add" size={22} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={styles.addNewTitle}>{isVi ? 'Thêm hóa đơn hàng tháng' : 'Add Recurring Bill'}</Text>
                      <Text style={styles.addNewSubtitle}>
                        {isVi ? 'Tiền phòng trọ, điện, nước, internet...' : 'Rent, bills, subscriptions...'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Danh sách các hóa đơn */}
                <View style={styles.listSection}>
                  <Text style={styles.listSectionTitle}>
                    {isVi ? 'Danh sách hóa đơn định kỳ' : 'Your Bills'} ({bills.length})
                  </Text>

                  {bills.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="receipt-outline" size={36} color="#CBD5E1" />
                      <Text style={styles.emptyCardText}>
                        {isVi ? 'Chưa có hóa đơn nào được thêm' : 'No recurring bills added yet'}
                      </Text>
                    </View>
                  ) : (
                    bills.map((item) => {
                      const isPaid = item.isPaidThisMonth;
                      const daysLeft = item.dueDay - todayDay;
                      const isComingSoon = daysLeft >= 0 && daysLeft <= (item.remindBeforeDays || 3) && !isPaid;

                      return (
                        <View key={item.id} style={[styles.cardItem, isPaid && styles.cardItemPaid]}>
                          <TouchableOpacity
                            style={[styles.checkboxCircle, isPaid && styles.checkboxCirclePaid]}
                            onPress={() => handleToggleBillPaid(item)}
                            activeOpacity={0.7}
                          >
                            {isPaid && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                          </TouchableOpacity>

                          <View style={styles.cardItemBody}>
                            <Text style={[styles.cardItemTitle, isPaid && styles.cardItemTitlePaid]}>
                              {item.title}
                            </Text>

                            <View style={styles.cardItemBadgesRow}>
                              <View style={styles.badgePillAmber}>
                                <Ionicons name="calendar-outline" size={11} color="#D97706" style={{ marginRight: 3 }} />
                                <Text style={styles.badgePillAmberText}>
                                  {isVi ? `Ngày ${item.dueDay} hàng tháng` : `Day ${item.dueDay}`}
                                </Text>
                              </View>

                              {isComingSoon && (
                                <View style={styles.badgePillRed}>
                                  <Text style={styles.badgePillRedText}>
                                    {daysLeft === 0 ? (isVi ? 'Đến hạn hôm nay!' : 'Due today!') : `${isVi ? 'Còn' : ''} ${daysLeft} ${isVi ? 'ngày' : 'days left'}`}
                                  </Text>
                                </View>
                              )}

                              {isPaid && (
                                <View style={styles.badgePillGreen}>
                                  <Text style={styles.badgePillGreenText}>{isVi ? 'Đã đóng ✓' : 'Paid ✓'}</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <View style={styles.cardItemRight}>
                            <Text style={[styles.cardItemAmount, isPaid && styles.cardItemAmountPaid]}>
                              {formatMoney(item.amount)}
                            </Text>

                            <View style={styles.cardActionsRow}>
                              <TouchableOpacity
                                style={styles.actionIconBtn}
                                onPress={() => handleStartEditBill(item)}
                                activeOpacity={0.6}
                              >
                                <Ionicons name="pencil" size={14} color="#047857" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.actionIconBtn}
                                onPress={() => handleDeleteBill(item.id)}
                                activeOpacity={0.6}
                              >
                                <Ionicons name="trash-outline" size={14} color="#94A3B8" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* ============================================================== */}
            {/* TAB 2: SỔ GHI NỢ (CHO VAY & ĐI VAY) */}
            {/* ============================================================== */}
            {currentActiveTab === 'debts' && (
              <View>
                {/* 2 Thẻ lớn tổng quan: Cho mượn & Đi vay */}
                <View style={styles.debtOverviewRow}>
                  <TouchableOpacity
                    style={[
                      styles.overviewCard,
                      styles.overviewCardGreen,
                      debtFilter === 'lend' && styles.overviewCardFocused,
                    ]}
                    onPress={() => setDebtFilter(debtFilter === 'lend' ? 'all' : 'lend')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.overviewIconBoxGreen}>
                      <Ionicons name="arrow-up" size={18} color="#059669" />
                    </View>
                    <Text style={styles.overviewLabelGreen}>{isVi ? 'ĐANG CHO MƯỢN' : 'YOU LENT'}</Text>
                    <Text style={styles.overviewAmountGreen}>
                      +{formatMoney(debtSummary.lendTotal)}
                    </Text>
                    <Text style={styles.overviewSubText}>
                      {debtSummary.lendCount} {isVi ? 'người đang mượn' : 'people'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.overviewCard,
                      styles.overviewCardRed,
                      debtFilter === 'borrow' && styles.overviewCardFocused,
                    ]}
                    onPress={() => setDebtFilter(debtFilter === 'borrow' ? 'all' : 'borrow')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.overviewIconBoxRed}>
                      <Ionicons name="arrow-down" size={18} color="#DC2626" />
                    </View>
                    <Text style={styles.overviewLabelRed}>{isVi ? 'ĐANG ĐI VAY' : 'YOU BORROWED'}</Text>
                    <Text style={styles.overviewAmountRed}>
                      -{formatMoney(debtSummary.borrowTotal)}
                    </Text>
                    <Text style={styles.overviewSubText}>
                      {debtSummary.borrowCount} {isVi ? 'khoản cần trả' : 'debts'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Form thêm khoản nợ to bản, đẹp, sang trọng */}
                {isDebtFormOpen ? (
                  <View style={styles.formCard}>
                    <View style={styles.formCardHeader}>
                      <Text style={styles.formCardTitle}>
                        {editingDebtId
                          ? (isVi ? '✏️ Chỉnh sửa khoản nợ' : 'Edit Debt')
                          : (isVi ? 'Thêm khoản nợ mới' : 'Add Debt Record')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setIsDebtFormOpen(false);
                          setEditingDebtId(null);
                        }}
                      >
                        <Ionicons name="close" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>

                    {/* Chọn loại: Cho mượn vs Đi vay */}
                    <View style={styles.typeToggleRow}>
                      <TouchableOpacity
                        style={[styles.typeToggleBtn, debtType === 'lend' && styles.typeToggleBtnLend]}
                        onPress={() => setDebtType('lend')}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="arrow-up"
                          size={16}
                          color={debtType === 'lend' ? '#FFFFFF' : '#059669'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.typeToggleText, debtType === 'lend' && styles.typeToggleTextActive]}>
                          {isVi ? 'Cho người khác mượn' : 'You Lent'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.typeToggleBtn, debtType === 'borrow' && styles.typeToggleBtnBorrow]}
                        onPress={() => setDebtType('borrow')}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="arrow-down"
                          size={16}
                          color={debtType === 'borrow' ? '#FFFFFF' : '#DC2626'}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.typeToggleText, debtType === 'borrow' && styles.typeToggleTextActive]}>
                          {isVi ? 'Mình đi vay tiền' : 'You Borrowed'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* 1. Tên người */}
                    <Text style={styles.inputLabel}>{isVi ? 'Tên người' : 'Person Name'}</Text>
                    <View style={[styles.inputBox, focusedInput === 'debtPerson' && styles.inputBoxFocused]}>
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={focusedInput === 'debtPerson' ? '#047857' : '#94A3B8'}
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder={isVi ? 'Ví dụ: Anh Nam, Bạn Linh đồng nghiệp...' : 'e.g. John, Alex...'}
                        placeholderTextColor="#94A3B8"
                        value={debtPerson}
                        onChangeText={setDebtPerson}
                        onFocus={() => setFocusedInput('debtPerson')}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </View>

                    {/* 2. Số tiền */}
                    <Text style={styles.inputLabel}>{isVi ? 'Số tiền' : 'Amount'}</Text>
                    <View style={[styles.inputBox, focusedInput === 'debtAmount' && styles.inputBoxFocused]}>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            fontSize: 18,
                            fontWeight: '800',
                            color: debtType === 'lend' ? '#059669' : '#DC2626',
                          },
                        ]}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={debtAmount ? Number(debtAmount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                        onChangeText={(val) => setDebtAmount(val.replace(/\D/g, ''))}
                        onFocus={() => setFocusedInput('debtAmount')}
                        onBlur={() => setFocusedInput(null)}
                      />
                      <Text style={[styles.currencyBadge, focusedInput === 'debtAmount' && { color: debtType === 'lend' ? '#059669' : '#DC2626' }]}>đ</Text>
                    </View>

                    {/* Nút gợi ý tiền nhanh */}
                    <View style={styles.presetsRow}>
                      {[100000, 200000, 500000, 1000000, 2000000, 5000000].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={styles.presetChip}
                          onPress={() => setDebtAmount(String(amt))}
                        >
                          <Text style={styles.presetChipText}>{amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* 3. Hạn trả / Ngày hẹn */}
                    <Text style={styles.inputLabel}>{isVi ? 'Hạn trả / Ngày hẹn' : 'Due Date'}</Text>
                    <View style={[styles.inputBox, focusedInput === 'debtDueDate' && styles.inputBoxFocused]}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={focusedInput === 'debtDueDate' ? '#047857' : '#94A3B8'}
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder={isVi ? 'Ví dụ: 15/10/2026 hoặc Cuối tuần này...' : 'e.g. 15/10/2026 or Next week...'}
                        placeholderTextColor="#94A3B8"
                        value={debtDueDate}
                        onChangeText={setDebtDueDate}
                        onFocus={() => setFocusedInput('debtDueDate')}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </View>

                    {/* 4. Ghi chú */}
                    <Text style={styles.inputLabel}>{isVi ? 'Ghi chú lý do' : 'Note'}</Text>
                    <View style={[styles.inputBox, focusedInput === 'debtNote' && styles.inputBoxFocused]}>
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={focusedInput === 'debtNote' ? '#047857' : '#94A3B8'}
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder={isVi ? 'Ví dụ: Tiền ăn trưa chung, mượn cọc phòng...' : 'e.g. Lunch, Deposit...'}
                        placeholderTextColor="#94A3B8"
                        value={debtNote}
                        onChangeText={setDebtNote}
                        onFocus={() => setFocusedInput('debtNote')}
                        onBlur={() => setFocusedInput(null)}
                      />
                    </View>

                    {/* Nút Lưu khoản nợ */}
                    <View style={styles.formBtnRow}>
                      <TouchableOpacity
                        style={styles.btnSecondary}
                        onPress={() => {
                          setIsDebtFormOpen(false);
                          setEditingDebtId(null);
                        }}
                      >
                        <Text style={styles.btnSecondaryText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.btnPrimary,
                          debtType === 'borrow' && { backgroundColor: '#DC2626' },
                          !debtPerson.trim() && styles.btnPrimaryDisabled,
                        ]}
                        onPress={handleSaveDebt}
                        disabled={!debtPerson.trim() || isDebtSubmitting}
                      >
                        {isDebtSubmitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.btnPrimaryText}>
                            {editingDebtId ? (isVi ? 'Cập nhật' : 'Update') : (isVi ? 'Lưu khoản nợ' : 'Save Record')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* Nút to để mở form thêm khoản nợ */
                  <TouchableOpacity
                    style={styles.addNewCardBtn}
                    onPress={() => {
                      setIsDebtFormOpen(true);
                      setEditingDebtId(null);
                      setDebtPerson('');
                      setDebtAmount('');
                      setDebtDueDate('');
                      setDebtNote('');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.addNewIconCircle, { backgroundColor: '#047857' }]}>
                      <Ionicons name="add" size={22} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={styles.addNewTitle}>{isVi ? 'Thêm khoản nợ / cho mượn' : 'Add Debt Record'}</Text>
                      <Text style={styles.addNewSubtitle}>
                        {isVi ? 'Ghi lại tiền cho mượn hoặc tiền đi vay' : 'Keep track of who owes you and what you owe'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Bộ lọc: Tất cả | Cho mượn | Đi vay */}
                <View style={styles.filterPillsRow}>
                  <TouchableOpacity
                    style={[styles.filterPill, debtFilter === 'all' && styles.filterPillActive]}
                    onPress={() => setDebtFilter('all')}
                  >
                    <Text style={[styles.filterPillText, debtFilter === 'all' && styles.filterPillTextActive]}>
                      {isVi ? 'Tất cả' : 'All'} ({debts.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterPill, debtFilter === 'lend' && styles.filterPillActive]}
                    onPress={() => setDebtFilter('lend')}
                  >
                    <Text style={[styles.filterPillText, debtFilter === 'lend' && styles.filterPillTextActive]}>
                      {isVi ? 'Đang cho mượn' : 'Lent'} ({debts.filter((d) => d.type === 'lend').length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.filterPill, debtFilter === 'borrow' && styles.filterPillActive]}
                    onPress={() => setDebtFilter('borrow')}
                  >
                    <Text style={[styles.filterPillText, debtFilter === 'borrow' && styles.filterPillTextActive]}>
                      {isVi ? 'Đang đi vay' : 'Borrowed'} ({debts.filter((d) => d.type === 'borrow').length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Danh sách các khoản nợ */}
                <View style={styles.listSection}>
                  {filteredDebts.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="people-outline" size={36} color="#CBD5E1" />
                      <Text style={styles.emptyCardText}>
                        {isVi ? 'Không có khoản nợ nào' : 'No records found'}
                      </Text>
                    </View>
                  ) : (
                    filteredDebts.map((item) => {
                      const isLend = item.type === 'lend';
                      const isSettled = item.isSettled;

                      return (
                        <View key={item.id} style={[styles.cardItem, isSettled && styles.cardItemPaid]}>
                          {/* Avatar tròn với chữ cái đầu */}
                          <View
                            style={[
                              styles.debtAvatar,
                              isLend ? styles.debtAvatarLend : styles.debtAvatarBorrow,
                              isSettled && { backgroundColor: '#E2E8F0' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.debtAvatarText,
                                isLend ? styles.debtAvatarTextLend : styles.debtAvatarTextBorrow,
                                isSettled && { color: '#94A3B8' },
                              ]}
                            >
                              {item.personName ? item.personName.charAt(0).toUpperCase() : '?'}
                            </Text>
                          </View>

                          <View style={styles.cardItemBody}>
                            <Text style={[styles.cardItemTitle, isSettled && styles.cardItemTitlePaid]}>
                              {item.personName}
                            </Text>

                            <View style={styles.cardItemBadgesRow}>
                              <View style={isLend ? styles.badgePillGreen : styles.badgePillRed}>
                                <Text style={isLend ? styles.badgePillGreenText : styles.badgePillRedText}>
                                  {isLend ? (isVi ? 'Cho mượn' : 'Lent') : (isVi ? 'Đi vay' : 'Borrowed')}
                                </Text>
                              </View>

                              {item.dueDate ? (
                                <View style={styles.badgePillAmber}>
                                  <Ionicons name="calendar-outline" size={10} color="#D97706" style={{ marginRight: 3 }} />
                                  <Text style={styles.badgePillAmberText}>{item.dueDate}</Text>
                                </View>
                              ) : null}

                              {isSettled && (
                                <View style={styles.badgePillGray}>
                                  <Text style={styles.badgePillGrayText}>{isVi ? 'Đã thanh toán ✓' : 'Settled ✓'}</Text>
                                </View>
                              )}
                            </View>

                            {item.note ? (
                              <Text style={styles.debtNoteText} numberOfLines={1}>
                                💬 {item.note}
                              </Text>
                            ) : null}
                          </View>

                          <View style={styles.cardItemRight}>
                            <Text
                              style={[
                                styles.cardItemAmount,
                                isLend ? styles.amountGreen : styles.amountRed,
                                isSettled && styles.cardItemAmountPaid,
                              ]}
                            >
                              {isLend ? `+${formatMoney(item.amount)}` : `-${formatMoney(item.amount)}`}
                            </Text>

                            <View style={styles.cardActionsRow}>
                              <TouchableOpacity
                                style={[styles.settleBtn, isSettled && styles.settleBtnSettled]}
                                onPress={() => handleToggleDebtSettled(item)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={isSettled ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                  size={18}
                                  color={isSettled ? '#059669' : '#94A3B8'}
                                />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.actionIconBtn}
                                onPress={() => handleStartEditDebt(item)}
                                activeOpacity={0.6}
                              >
                                <Ionicons name="pencil" size={14} color="#047857" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.actionIconBtn}
                                onPress={() => handleDeleteDebt(item.id)}
                                activeOpacity={0.6}
                              >
                                <Ionicons name="trash-outline" size={14} color="#94A3B8" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}
    </View>
  );

  return (
    <View style={[styles.container, noMargin && { marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>
      {/* Header Mục Hóa đơn định kỳ & Sổ ghi nợ */}
      <View style={styles.inlineHeaderRow}>
        <View style={styles.inlineHeaderLeft}>
          <Ionicons name="receipt-outline" size={16} color="#047857" style={{ marginRight: 6 }} />
          <Text style={styles.inlineHeaderTitle}>
            {isVi ? 'HÓA ĐƠN ĐỊNH KỲ & SỔ GHI NỢ' : 'RECURRING BILLS & DEBT BOOK'}
          </Text>
        </View>

        <View style={styles.inlineHeaderBadges}>
          {unpaidBillsCount > 0 && (
            <View style={styles.badgePillAmber}>
              <Text style={styles.badgePillAmberText}>
                {isVi ? `${unpaidBillsCount} cần đóng` : `${unpaidBillsCount} due`}
              </Text>
            </View>
          )}
          {(debtSummary.lendCount > 0 || debtSummary.borrowCount > 0) && (
            <View style={styles.badgePillGreen}>
              <Text style={styles.badgePillGreenText}>
                {isVi ? `${debtSummary.lendCount + debtSummary.borrowCount} khoản` : `${debtSummary.lendCount + debtSummary.borrowCount} debts`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Thanh 2 nút bấm: Hóa đơn định kỳ & Sổ ghi nợ (Bấm vào nút nào sẽ mở Modal chi tiết) */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, { backgroundColor: '#FFFFFF' }]}
          onPress={() => setDetailModal('bills')}
          activeOpacity={0.75}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color="#047857"
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentText, { color: '#047857', fontWeight: '800' }]}>
            {isVi ? 'Hóa đơn định kỳ' : 'Recurring Bills'}
          </Text>
          {unpaidBillsCount > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{unpaidBillsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, { backgroundColor: '#FFFFFF' }]}
          onPress={() => setDetailModal('debts')}
          activeOpacity={0.75}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color="#047857"
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentText, { color: '#047857', fontWeight: '800' }]}>
            {isVi ? 'Sổ ghi nợ' : 'Debt Book'}
          </Text>
          {(debtSummary.lendCount > 0 || debtSummary.borrowCount > 0) && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>
                {debtSummary.lendCount + debtSummary.borrowCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL TRƯỢT LÊN / BẬT MỞ CHI TIẾT (Cho cả Web & Mobile) */}
      <Modal
        visible={Boolean(detailModal)}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModal(null)}
      >
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Backdrop mờ phía sau - bấm vào tự đóng */}
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setDetailModal(null)}
            activeOpacity={1}
          />

          {/* Khung Bottom Sheet trượt lên từ dưới hoặc căn giữa màn hình trên Desktop */}
          <View style={styles.sheetContainer}>
            {/* Thanh kéo handle indicator */}
            <View style={styles.handleBar} />

            {/* Header của Sheet */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>
                  {detailModal === 'bills'
                    ? (isVi ? 'Hóa đơn định kỳ' : 'Recurring Bills')
                    : (isVi ? 'Sổ ghi nợ' : 'Debt Book')}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {detailModal === 'bills'
                    ? (isVi ? 'Quản lý các khoản chi định kỳ hàng tháng' : 'Manage monthly recurring bills')
                    : (isVi ? 'Theo dõi tiền cho mượn và các khoản đi vay' : 'Track money lent and borrowed')}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setDetailModal(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Thanh chuyển đổi tab bên trong sheet */}
            {detailModal && renderSegmentedControl(detailModal, (tab) => setDetailModal(tab))}

            {/* NỘI DUNG CUỘN CHI TIẾT */}
            <ScrollView
              style={styles.sheetScrollView}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {detailModal && renderTabContent(detailModal)}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    marginBottom: 6,
  },
  // THANH CAPSULE TRÊN TRANG CHỦ (Tối giản, đẹp mắt)
  tabCapsuleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2EC',
    borderRadius: 22,
    padding: 4,
    marginHorizontal: 16,
  },
  tabCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 18,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A2F',
  },
  pillCountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  pillCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  pillCountBadgeGreen: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  pillCountTextGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },

  // GIAO DIỆN HIỂN THỊ TRỰC TIẾP TRÊN TRANG TỔNG QUAN (INLINE)
  inlineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  inlineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: 0.5,
  },
  inlineHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineContentArea: {
    marginTop: 4,
  },

  // MODAL ĐẨY LÊN TỪ DƯỚI (BOTTOM SHEET SLIDE-UP Y HỆT TRANG LƯU NHANH)
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    ...(Platform.OS === 'web' ? { alignItems: 'center', padding: 16 } : {}),
  },
  sheetBackdrop: {
    ...(StyleSheet.absoluteFill as any),
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...(Platform.OS === 'web' ? {
      borderRadius: 28,
      width: '100%',
      maxWidth: 620,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 10,
    } : {}),
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
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
    marginBottom: 14,
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

  // Segmented Control to bản, cao cấp
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
  },
  sheetScrollView: {
    maxHeight: 520,
  },
  sheetScrollContent: {
    paddingBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 13,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    fontWeight: '800',
    color: '#047857',
  },
  badgeCount: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginLeft: 6,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Nút to bản mở form Thêm mới
  addNewCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  addNewIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  addNewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  addNewSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Form Card to bản, đẹp, tối giản
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  formCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 8,
  },
  inputBoxFocused: {
    borderColor: '#047857',
    backgroundColor: '#FFFFFF',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 0 3px rgba(4, 120, 87, 0.15)',
    } : {}),
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0,
  },
  currencyBadge: {
    fontSize: 16,
    fontWeight: '800',
    color: '#047857',
    marginLeft: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  dueDayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  selectedDayBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedDayBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  dayScrollRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  daySquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  daySquareActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  daySquareText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  daySquareTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  remindBeforeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  remindChip: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  remindChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#047857',
  },
  remindChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  remindChipTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  btnPrimary: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#047857',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  btnPrimaryDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Toggle Loại Nợ
  typeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeToggleBtnLend: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  typeToggleBtnBorrow: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  typeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  typeToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Danh sách cards
  listSection: {
    marginTop: 6,
  },
  listSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardItemPaid: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
  },
  checkboxCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCirclePaid: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  cardItemBody: {
    flex: 1,
    paddingRight: 10,
  },
  cardItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardItemTitlePaid: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  cardItemBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  badgePillAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillAmberText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  badgePillRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillRedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  badgePillGreen: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillGreenText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#047857',
  },
  badgePillGray: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillGrayText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  cardItemRight: {
    alignItems: 'flex-end',
  },
  cardItemAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardItemAmountPaid: {
    color: '#94A3B8',
  },
  amountGreen: {
    color: '#059669',
  },
  amountRed: {
    color: '#DC2626',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleBtn: {
    padding: 2,
  },
  settleBtnSettled: {
    opacity: 0.8,
  },

  // Sổ ghi nợ overview cards
  debtOverviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  overviewCardGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  overviewCardRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  overviewCardFocused: {
    transform: [{ scale: 1.02 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  overviewIconBoxGreen: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  overviewIconBoxRed: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  overviewLabelGreen: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  overviewLabelRed: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  overviewAmountGreen: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
    marginTop: 4,
    marginBottom: 2,
  },
  overviewAmountRed: {
    fontSize: 18,
    fontWeight: '900',
    color: '#DC2626',
    marginTop: 4,
    marginBottom: 2,
  },
  overviewSubText: {
    fontSize: 11,
    color: '#64748B',
  },

  // Bộ lọc pills
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // Debt card items
  debtAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  debtAvatarLend: {
    backgroundColor: '#ECFDF5',
  },
  debtAvatarBorrow: {
    backgroundColor: '#FEF2F2',
  },
  debtAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  debtAvatarTextLend: {
    color: '#059669',
  },
  debtAvatarTextBorrow: {
    color: '#DC2626',
  },
  debtNoteText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardText: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
});
