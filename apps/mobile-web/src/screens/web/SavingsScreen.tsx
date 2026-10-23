import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  ISavingsGoal,
  loadSavingsGoals,
  saveSavingsGoals,
  calculateGoalDaysRemaining,
  getFutureDateFormatted,
} from '../../services/savingsStorage';
import { GoalDetailModal } from '../../components/GoalDetailModal';

interface SavingsScreenProps {
  onNavigateToTab?: (tab: any) => void;
  onBack?: () => void;
}

export const SavingsScreen: React.FC<SavingsScreenProps> = ({
  onNavigateToTab,
  onBack,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { addNotification, toggleNotifications, unreadCount } = useNotifications();
  const isVi = language === 'vi';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigateToTab) {
      onNavigateToTab('home');
    }
  };

  // Goals state
  const [goals, setGoals] = useState<ISavingsGoal[]>(() => loadSavingsGoals(user?.id));

  // Sync to local storage
  useEffect(() => {
    saveSavingsGoals(goals, user?.id);
  }, [goals, user?.id]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [depositingGoal, setDepositingGoal] = useState<ISavingsGoal | null>(null);
  const [selectedDetailGoal, setSelectedDetailGoal] = useState<ISavingsGoal | null>(null);

  // Sync selectedDetailGoal when goals list updates
  useEffect(() => {
    if (selectedDetailGoal) {
      const updated = goals.find((g) => g.id === selectedDetailGoal.id);
      if (updated) setSelectedDetailGoal(updated);
    }
  }, [goals]);

  // Form states for Create / Edit Goal
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formTargetStr, setFormTargetStr] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formNote, setFormNote] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(() => new Date());

  // Form states for Deposit Modal
  const [depositAmountStr, setDepositAmountStr] = useState('');
  const [depositNote, setDepositNote] = useState('');

  // Active focus tracking for white bg + green border matching Image 2
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Calculations for Overview
  const totalSaved = useMemo(
    () => goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0),
    [goals]
  );
  const totalTarget = useMemo(
    () => goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0),
    [goals]
  );
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const completedCount = useMemo(
    () => goals.filter((g) => (g.currentAmount || 0) >= (g.targetAmount || 1)).length,
    [goals]
  );
  const overallPercent =
    totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Format currency
  const formatVND = (amount: number) => {
    if (!amount || isNaN(amount)) return '0';
    return amount.toLocaleString('vi-VN');
  };

  const handleAmountInputChange = (text: string, setter: (val: string) => void) => {
    const raw = text.replace(/\D/g, '');
    if (!raw) {
      setter('');
      return;
    }
    const num = parseInt(raw, 10);
    setter(num.toLocaleString('vi-VN'));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingGoalId(null);
    setFormTitle('');
    setFormTargetStr('');
    setFormDeadline(getFutureDateFormatted(30));
    setFormNote('');
    setIsDatePickerOpen(false);
    setFocusedField('formTitle');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (goal: ISavingsGoal) => {
    setEditingGoalId(goal.id);
    setFormTitle(goal.title);
    setFormTargetStr(formatVND(goal.targetAmount));
    setFormDeadline(goal.deadline || '');
    setFormNote(goal.note || '');
    setIsDatePickerOpen(false);
    setFocusedField('formTitle');
    setIsCreateModalOpen(true);
  };

  // Delete Goal
  const handleDeleteGoal = (goalId: string, title: string) => {
    const msg = isVi
      ? `Bạn có chắc muốn xóa mục tiêu "${title}" không?`
      : `Are you sure you want to delete goal "${title}"?`;
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(msg)) return;
    }
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  // Save Goal (Create or Edit)
  const handleSaveGoal = () => {
    const cleanTitle = formTitle.trim();
    if (!cleanTitle) {
      alert(isVi ? 'Vui lòng nhập tên mục tiêu tích lũy.' : 'Please enter goal title.');
      return;
    }
    const targetAmt = parseInt(formTargetStr.replace(/\D/g, ''), 10) || 0;
    if (targetAmt <= 0) {
      alert(isVi ? 'Vui lòng nhập số tiền mục tiêu.' : 'Please enter target amount.');
      return;
    }

    if (editingGoalId) {
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === editingGoalId) {
            return {
              ...g,
              title: cleanTitle,
              targetAmount: targetAmt,
              deadline: formDeadline.trim() || undefined,
              note: formNote.trim() || undefined,
            };
          }
          return g;
        })
      );
      addNotification({
        type: 'moment',
        title: isVi ? 'Đã cập nhật tích lũy 🎯' : 'Savings Goal Updated 🎯',
        message: isVi
          ? `Mục tiêu "${cleanTitle}" đã được cập nhật.`
          : `Goal "${cleanTitle}" has been updated.`,
        iconBg: '#DCFCE7',
        iconColor: '#059669',
      });
    } else {
      const newGoal: ISavingsGoal = {
        id: `goal-${Date.now()}`,
        title: cleanTitle,
        targetAmount: targetAmt,
        currentAmount: 0,
        deadline: formDeadline.trim() || undefined,
        note: formNote.trim() || undefined,
        icon: 'flag-outline',
        color: '#0284C7',
        createdAt: new Date().toISOString(),
        deposits: [],
      };
      setGoals((prev) => [newGoal, ...prev]);
      addNotification({
        type: 'moment',
        title: isVi ? 'Mục tiêu tích lũy mới 🎯' : 'New Savings Goal 🎯',
        message: isVi
          ? `Đã tạo mục tiêu tích lũy "${cleanTitle}" với số tiền ${formatVND(targetAmt)} đ.`
          : `Created savings goal "${cleanTitle}" for ${formatVND(targetAmt)} VND.`,
        iconBg: '#DCFCE7',
        iconColor: '#059669',
      });
    }

    setIsCreateModalOpen(false);
    setFocusedField(null);
  };

  // Open Deposit Modal
  const handleOpenDepositModal = (goal: ISavingsGoal) => {
    setDepositingGoal(goal);
    setDepositAmountStr('');
    setDepositNote('');
    setFocusedField('depositAmount');
  };

  // Confirm Deposit
  const handleConfirmDeposit = () => {
    if (!depositingGoal) return;
    const addAmt = parseInt(depositAmountStr.replace(/\D/g, ''), 10) || 0;
    if (addAmt <= 0) {
      alert(isVi ? 'Vui lòng nhập số tiền hợp lệ.' : 'Please enter a valid amount.');
      return;
    }

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const depositDate = `${dd}/${mm}/${yyyy}`;

    const newDeposit = {
      id: `dep-${Date.now()}`,
      amount: addAmt,
      note: depositNote.trim() || undefined,
      date: depositDate,
      createdAt: new Date().toISOString(),
    };

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === depositingGoal.id) {
          const nextAmt = (g.currentAmount || 0) + addAmt;
          return {
            ...g,
            currentAmount: nextAmt,
            deposits: [newDeposit, ...(g.deposits || [])],
          };
        }
        return g;
      })
    );

    addNotification({
      type: 'budget',
      title: isVi ? 'Nạp tiền tích lũy thành công 💰' : 'Deposit Successful 💰',
      message: isVi
        ? `Đã nạp ${formatVND(addAmt)} đ vào mục tiêu "${depositingGoal.title}".`
        : `Deposited ${formatVND(addAmt)} VND into "${depositingGoal.title}".`,
      iconBg: '#DCFCE7',
      iconColor: '#059669',
    });

    setDepositingGoal(null);
  };

  // Delete a deposit from a goal and deduct amount
  const handleDeleteDeposit = (goalId: string, depositId: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const dep = g.deposits?.find((d) => d.id === depositId);
        const depAmt = dep?.amount || 0;
        const remainingDeps = (g.deposits || []).filter((d) => d.id !== depositId);
        return {
          ...g,
          currentAmount: Math.max(0, (g.currentAmount || 0) - depAmt),
          deposits: remainingDeps,
        };
      })
    );
  };

  // Edit a deposit in a goal and adjust currentAmount by difference
  const handleEditDeposit = (
    goalId: string,
    depositId: string,
    updated: { amount: number; note?: string; date?: string }
  ) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const oldDep = g.deposits?.find((d) => d.id === depositId);
        const oldAmt = oldDep?.amount || 0;
        const diff = updated.amount - oldAmt;
        const newDeps = (g.deposits || []).map((d) =>
          d.id === depositId
            ? {
                ...d,
                amount: updated.amount,
                note: updated.note,
                date: updated.date || d.date,
              }
            : d
        );
        return {
          ...g,
          currentAmount: Math.max(0, (g.currentAmount || 0) + diff),
          deposits: newDeps,
        };
      })
    );
  };

  // Mini Calendar logic for Date Picker
  const pickerYear = pickerDate.getFullYear();
  const pickerMonth = pickerDate.getMonth();
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const firstDow = (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7; // Monday = 0
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const handleSelectCalendarDay = (day: number) => {
    const dd = String(day).padStart(2, '0');
    const mm = String(pickerMonth + 1).padStart(2, '0');
    const yyyy = pickerYear;
    setFormDeadline(`${dd}/${mm}/${yyyy}`);
    setIsDatePickerOpen(false);
  };

  const handlePrevPickerMonth = () => {
    setPickerDate(new Date(pickerYear, pickerMonth - 1, 1));
  };

  const handleNextPickerMonth = () => {
    setPickerDate(new Date(pickerYear, pickerMonth + 1, 1));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= 1. TOP HEADER ROW ================= */}
      <View style={styles.topHeaderRow}>
        <View style={styles.topHeaderLeft}>
          {(onBack || onNavigateToTab) && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={isVi ? 'Quay lại' : 'Go back'}
            >
              <Ionicons name="chevron-back" size={24} color="#221D18" />
            </TouchableOpacity>
          )}
          <Text style={styles.topHeaderTitle}>{isVi ? 'Tích lũy' : 'Savings'}</Text>
        </View>
      </View>

      {/* ================= 2. SECTION SUBHEADER ================= */}
      <View style={styles.subHeaderRow}>
        <View>
          <Text style={styles.subHeaderDesc}>
            {isVi ? 'Mục tiêu tích lũy của sổ' : 'Savings goals of your wallet'}
          </Text>
          <Text style={styles.subHeaderMainTitle}>
            {isVi ? 'Tích lũy' : 'Savings'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.mainAddBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.85}
        >
          <Text style={styles.mainAddBtnText}>+ {isVi ? 'Thêm' : 'New'}</Text>
        </TouchableOpacity>
      </View>

      {/* ================= 3. OVERVIEW STATS CARDS (ĐỒNG BỘ MÀU 100% VỚI SỰ KIỆN: 221D18, BEE3C2, B7D9F2) ================= */}
      <View style={[styles.statsRow, !isDesktop && styles.statsRowMobile]}>
        {/* Card 1: Tổng đã tích (#221D18) */}
        <View style={[styles.statCard, styles.cardDark, !isDesktop && styles.statCardMobile]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardDarkLabel}>
              {isVi ? 'TỔNG ĐÃ TÍCH' : 'TOTAL SAVED'}
            </Text>
            <View style={styles.percentBadge}>
              <Text style={styles.percentBadgeText}>{overallPercent}%</Text>
            </View>
          </View>

          <Text style={styles.cardDarkAmount}>{formatVND(totalSaved)} đ</Text>

          <View style={styles.cardDarkDivider} />

          <Text style={styles.cardDarkSub}>
            {isVi
              ? `${completedCount}/${goals.length} mục tiêu hoàn thành · mục tiêu ${formatVND(totalTarget)}`
              : `${completedCount}/${goals.length} completed · target ${formatVND(totalTarget)}`}
          </Text>
        </View>

        {/* Card 2: Mục tiêu (#BEE3C2) */}
        <View style={[styles.statCard, styles.cardMint, !isDesktop && styles.statCardMobile]}>
          <View style={styles.cardHeaderRowLeft}>
            <Ionicons name="flag-outline" size={17} color="#047857" style={{ marginRight: 6 }} />
            <Text style={styles.cardMintLabel}>{isVi ? 'Mục tiêu' : 'Target'}</Text>
          </View>

          <Text style={styles.cardMintAmount}>{formatVND(totalTarget)}</Text>

          <Text style={styles.cardMintSub}>
            {isVi ? `${goals.length} kế hoạch` : `${goals.length} plans`}
          </Text>
        </View>

        {/* Card 3: Còn cần (#B7D9F2) */}
        <View style={[styles.statCard, styles.cardSky, !isDesktop && styles.statCardMobile]}>
          <View style={styles.cardHeaderRowLeft}>
            <Ionicons name="cash-outline" size={18} color="#0369A1" style={{ marginRight: 6 }} />
            <Text style={styles.cardSkyLabel}>{isVi ? 'Còn cần' : 'Remaining'}</Text>
          </View>

          <Text style={styles.cardSkyAmount}>{formatVND(totalRemaining)}</Text>

          <Text style={styles.cardSkySub}>
            {isVi ? 'để chạm mục tiêu' : 'to reach goal'}
          </Text>
        </View>
      </View>

      {/* ================= 4. SECTION GOALS LIST HEADER ================= */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{isVi ? 'Mục tiêu' : 'Goals'}</Text>
        <Text style={styles.sectionCountText}>
          {goals.length} {isVi ? 'mục' : 'items'}
        </Text>
      </View>

      {/* ================= 5. GOALS CARDS GRID ================= */}
      {goals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="flag-outline" size={48} color="#9E958A" />
          <Text style={styles.emptyTitle}>
            {isVi ? 'Chưa có mục tiêu tích lũy nào' : 'No savings goals yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isVi
              ? 'Tạo mục tiêu tích lũy đầu tiên để bắt đầu theo dõi tiến độ nuôi heo của bạn!'
              : 'Create your first goal to track your dream piggy bank!'}
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyActionBtnText}>
              + {isVi ? 'Tạo tích lũy mới' : 'Create New Goal'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.goalsGrid}>
          {goals.map((goal) => {
            const current = goal.currentAmount || 0;
            const target = goal.targetAmount || 1;
            const remaining = Math.max(0, target - current);
            const percent = Math.min(100, Math.round((current / target) * 100));
            const isCompleted = percent >= 100;
            const daysRemaining = calculateGoalDaysRemaining(goal.deadline);

            return (
              <View key={goal.id} style={[styles.goalCard, isDesktop && styles.goalCardDesktop]}>
                {/* Top Row: Icon + Title + Days + Badge */}
                <TouchableOpacity
                  style={styles.goalCardTopRow}
                  onPress={() => setSelectedDetailGoal(goal)}
                  activeOpacity={0.8}
                >
                  <View style={styles.goalCardLeftInfo}>
                    <View style={styles.goalIconSquare}>
                      <Ionicons name="flag" size={18} color="#0284C7" />
                    </View>
                    <View style={styles.goalTitleWrap}>
                      <Text style={styles.goalTitle} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      <View style={styles.goalDaysRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={13}
                          color="#78716C"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.goalDaysText}>{daysRemaining.text}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.goalStatusBadge}>
                    <Text style={styles.goalStatusBadgeText}>
                      {isCompleted ? (isVi ? 'Hoàn thành' : 'Done') : `${isVi ? 'Đang tích' : 'Saved'} ${percent}%`}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Remaining Amount */}
                <Text style={styles.goalRemainLabel}>
                  {isVi ? 'CÒN CẦN' : 'REMAINING'}
                </Text>
                <Text style={styles.goalRemainAmount}>
                  {formatVND(remaining)}{' '}
                  <Text style={styles.goalRemainCurrency}>đ</Text>
                </Text>

                {/* Progress Bar */}
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                </View>

                {/* Progress numbers */}
                <Text style={styles.progressFractionText}>
                  {formatVND(current)} / {formatVND(target)}
                </Text>

                {/* Bottom Deposit Button */}
                <TouchableOpacity
                  style={styles.depositBtn}
                  onPress={() => handleOpenDepositModal(goal)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.depositBtnText}>+ {isVi ? 'Nạp tiền' : 'Deposit'}</Text>
                </TouchableOpacity>

                {/* Card Context Menu / Actions (Chi tiết / Sửa / Xóa) */}
                <View style={styles.goalCardActionsRow}>
                  <TouchableOpacity
                    onPress={() => setSelectedDetailGoal(goal)}
                    style={styles.cardMiniAction}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={13} color="#059669" />
                    <Text style={[styles.cardMiniActionText, { color: '#059669', fontWeight: '700' }]}>
                      {isVi ? 'Chi tiết' : 'Details'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleOpenEditModal(goal)}
                    style={styles.cardMiniAction}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={13} color="#78716C" />
                    <Text style={styles.cardMiniActionText}>{isVi ? 'Sửa' : 'Edit'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteGoal(goal.id, goal.title)}
                    style={styles.cardMiniAction}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={13} color="#EF4444" />
                    <Text style={[styles.cardMiniActionText, { color: '#EF4444' }]}>
                      {isVi ? 'Xóa' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ================= 6. MODAL NẠP TIỀN TÍCH LŨY (SCREENSHOT 2) ================= */}
      <Modal
        visible={!!depositingGoal}
        transparent
        animationType="fade"
        onRequestClose={() => setDepositingGoal(null)}
      >
        <TouchableWithoutFeedback onPress={() => setDepositingGoal(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardAvoid}
              >
                <View style={styles.modalDialogCard}>
                  {/* Header */}
                  <View style={styles.modalHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalDialogTitle}>
                        {isVi ? 'Nạp tiền tích lũy' : 'Deposit to Goal'}
                      </Text>
                      <Text style={styles.modalDialogSubtitle}>
                        {depositingGoal?.title}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setDepositingGoal(null)}
                      style={styles.modalCloseCircle}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={20} color="#221D18" />
                    </TouchableOpacity>
                  </View>

                  {/* Dark Charcoal Separator */}
                  <View style={styles.modalDarkDivider} />

                  {/* Form Field: Số tiền * */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      {isVi ? 'Số tiền' : 'Amount'} <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.boxInputContainer,
                        focusedField === 'depositAmount' && styles.boxInputContainerFocused,
                      ]}
                    >
                      <TextInput
                        value={depositAmountStr}
                        onChangeText={(txt) => handleAmountInputChange(txt, setDepositAmountStr)}
                        placeholder="0"
                        placeholderTextColor="#A8A29E"
                        keyboardType="numeric"
                        style={styles.boxTextInput}
                        onFocus={() => setFocusedField('depositAmount')}
                        onBlur={() => setFocusedField(null)}
                        autoFocus
                      />
                      <Text style={styles.currencyBadge}>đ</Text>
                    </View>
                  </View>

                  {/* Form Field: Ghi chú */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{isVi ? 'Ghi chú' : 'Note'}</Text>
                    <View
                      style={[
                        styles.textareaContainer,
                        focusedField === 'depositNote' && styles.textareaContainerFocused,
                      ]}
                    >
                      <TextInput
                        value={depositNote}
                        onChangeText={setDepositNote}
                        placeholder={
                          isVi
                            ? 'VD: Thưởng dự án, tiết kiệm tiền ăn trưa...'
                            : 'e.g. Project bonus, lunch savings...'
                        }
                        placeholderTextColor="#A8A29E"
                        multiline
                        numberOfLines={3}
                        style={styles.textareaInput}
                        onFocus={() => setFocusedField('depositNote')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                  </View>

                  {/* Dark Charcoal Separator */}
                  <View style={styles.modalDarkDivider} />

                  {/* Footer Actions */}
                  <View style={styles.modalFooterRow}>
                    <TouchableOpacity
                      onPress={() => setDepositingGoal(null)}
                      style={styles.modalCancelBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCancelBtnText}>{isVi ? 'Huỷ' : 'Cancel'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleConfirmDeposit}
                      style={styles.modalSubmitBtn}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.modalSubmitBtnText}>{isVi ? 'Nạp' : 'Deposit'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ================= 7. MODAL TẠO TÍCH LŨY MỚI / SỬA ================= */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsCreateModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardAvoid}
              >
                <View style={styles.modalDialogCard}>
                  {/* Header */}
                  <View style={styles.modalHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalDialogTitle}>
                        {editingGoalId
                          ? isVi
                            ? 'Chỉnh sửa tích lũy'
                            : 'Edit Goal'
                          : isVi
                          ? 'Tạo tích lũy mới'
                          : 'Create Savings Goal'}
                      </Text>
                      <Text style={styles.modalDialogSubtitle}>
                        {isVi
                          ? 'Thiết lập mục tiêu và kế hoạch tích lũy'
                          : 'Set your savings targets and deadlines'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setIsCreateModalOpen(false)}
                      style={styles.modalCloseCircle}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close" size={20} color="#221D18" />
                    </TouchableOpacity>
                  </View>

                  {/* Dark Charcoal Separator */}
                  <View style={styles.modalDarkDivider} />

                  {/* 1. Tên mục tiêu tích lũy * */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      {isVi ? 'Tên' : 'Title'} <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.boxInputContainer,
                        focusedField === 'formTitle' && styles.boxInputContainerFocused,
                      ]}
                    >
                      <TextInput
                        value={formTitle}
                        onChangeText={setFormTitle}
                        placeholder={
                          isVi
                            ? 'VD: Du văn lịch, Mua xe mới, Đổi laptop...'
                            : 'e.g. Vacation trip, New motorbike, Laptop...'
                        }
                        placeholderTextColor="#A8A29E"
                        style={styles.boxTextInput}
                        onFocus={() => setFocusedField('formTitle')}
                        onBlur={() => setFocusedField(null)}
                        autoFocus
                      />
                    </View>
                  </View>

                  {/* 2. Số tiền mục tiêu * */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      {isVi ? 'Số tiền' : 'Amount'} <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.boxInputContainer,
                        focusedField === 'formTarget' && styles.boxInputContainerFocused,
                      ]}
                    >
                      <TextInput
                        value={formTargetStr}
                        onChangeText={(txt) => handleAmountInputChange(txt, setFormTargetStr)}
                        placeholder="2.000.000"
                        placeholderTextColor="#A8A29E"
                        keyboardType="numeric"
                        style={styles.boxTextInput}
                        onFocus={() => setFocusedField('formTarget')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <Text style={styles.currencyBadge}>đ</Text>
                    </View>
                  </View>

                  {/* 3. Ngày hoàn thành * */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      {isVi ? 'Ngày hoàn thành' : 'Completion Date'}{' '}
                      <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.boxInputContainer,
                        focusedField === 'formDeadline' && styles.boxInputContainerFocused,
                      ]}
                    >
                      <TextInput
                        value={formDeadline}
                        onChangeText={setFormDeadline}
                        placeholder="dd/mm/yyyy"
                        placeholderTextColor="#A8A29E"
                        style={styles.boxTextInput}
                        onFocus={() => setFocusedField('formDeadline')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <TouchableOpacity
                        onPress={() => setIsDatePickerOpen((prev) => !prev)}
                        style={styles.calendarIconBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="calendar-outline" size={18} color="#221D18" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Dropdown Mini Calendar */}
                  {isDatePickerOpen && (
                    <View style={styles.miniCalendarBox}>
                      <View style={styles.miniCalendarHeader}>
                        <TouchableOpacity onPress={handlePrevPickerMonth} style={styles.miniCalNavBtn}>
                          <Text style={styles.miniCalNavText}>‹</Text>
                        </TouchableOpacity>
                        <Text style={styles.miniCalendarTitle}>
                          {isVi
                            ? `Tháng ${pickerMonth + 1}, ${pickerYear}`
                            : `${new Date(pickerYear, pickerMonth).toLocaleString('en-US', {
                                month: 'short',
                              })} ${pickerYear}`}
                        </Text>
                        <TouchableOpacity onPress={handleNextPickerMonth} style={styles.miniCalNavBtn}>
                          <Text style={styles.miniCalNavText}>›</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.dowRow}>
                        {(isVi
                          ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
                          : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
                        ).map((dow, idx) => (
                          <View key={dow + idx} style={styles.dowCell}>
                            <Text style={styles.dowText}>{dow}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.daysGrid}>
                        {calendarCells.map((day, idx) => {
                          if (day === null) {
                            return <View key={`empty-${idx}`} style={styles.dayCell} />;
                          }
                          return (
                            <TouchableOpacity
                              key={`d-${day}`}
                              style={styles.dayCell}
                              onPress={() => handleSelectCalendarDay(day)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.dayCellText}>{day}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* 4. Ghi chú */}
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>{isVi ? 'Ghi chú' : 'Note'}</Text>
                    <View
                      style={[
                        styles.textareaContainer,
                        focusedField === 'formNote' && styles.textareaContainerFocused,
                      ]}
                    >
                      <TextInput
                        value={formNote}
                        onChangeText={setFormNote}
                        placeholder={
                          isVi
                            ? 'Mô tả chi tiết hoặc lý do bạn muốn đạt mục tiêu này...'
                            : 'Notes or reasons for this goal...'
                        }
                        placeholderTextColor="#A8A29E"
                        multiline
                        numberOfLines={3}
                        style={styles.textareaInput}
                        onFocus={() => setFocusedField('formNote')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                  </View>

                  {/* Dark Charcoal Separator */}
                  <View style={styles.modalDarkDivider} />

                  {/* Footer Actions */}
                  <View style={styles.modalFooterRow}>
                    <TouchableOpacity
                      onPress={() => setIsCreateModalOpen(false)}
                      style={styles.modalCancelBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCancelBtnText}>{isVi ? 'Huỷ' : 'Cancel'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSaveGoal}
                      style={styles.modalSubmitBtn}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.modalSubmitBtnText}>
                        {editingGoalId ? (isVi ? 'Lưu' : 'Save') : isVi ? 'Tạo' : 'Create'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ================= 8. MODAL CHI TIẾT MỤC TIÊU & LỊCH SỬ NẠP TIỀN ================= */}
      <GoalDetailModal
        visible={!!selectedDetailGoal}
        goal={goals.find((g) => g.id === selectedDetailGoal?.id) || selectedDetailGoal}
        onClose={() => setSelectedDetailGoal(null)}
        onOpenDeposit={(g) => handleOpenDepositModal(g)}
        onEditGoal={(g) => handleOpenEditModal(g)}
        onDeleteGoal={(gId, gTitle) => handleDeleteGoal(gId, gTitle)}
        onDeleteDeposit={handleDeleteDeposit}
        onEditDeposit={handleEditDeposit}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140, // Đảm bảo không bị thanh bottom tab che ("cụt ngủn")
  },

  // 1. Top Header Row
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  topHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#221D18',
    letterSpacing: -0.3,
  },
  subTabLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(34, 29, 24, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  subTabLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topAddBtn: {
    backgroundColor: '#D2EADA',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 29, 24, 0.06)',
  },
  topAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#221D18',
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DECF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },

  // 2. Subheader Row
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  subHeaderDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716C',
    marginBottom: 4,
  },
  subHeaderMainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#221D18',
    letterSpacing: -0.5,
  },
  mainAddBtn: {
    backgroundColor: '#98E4B0',
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: 22,
    shadowColor: '#98E4B0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  mainAddBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#221D18',
  },

  // 3. Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  statsRowMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    padding: 22,
    minHeight: 155,
    justifyContent: 'space-between',
  },
  statCardMobile: {
    width: '100%',
    marginBottom: 12,
  },

  // Card Dark (Tổng đã tích - đồng bộ với Sự kiện)
  cardDark: {
    backgroundColor: '#221D18',
    borderColor: '#221D18',
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDarkLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9E958A',
    letterSpacing: 0.6,
  },
  percentBadge: {
    backgroundColor: '#D9F99D',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardDarkAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 6,
    marginBottom: 8,
  },
  cardDarkDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 6,
  },
  cardDarkSub: {
    fontSize: 12,
    color: '#9E958A',
    fontWeight: '500',
  },

  // Card Mint Green (Mục tiêu - đồng bộ với Sự kiện)
  cardMint: {
    backgroundColor: '#BEE3C2',
    borderColor: '#A7F3D0',
    flex: 1,
  },
  cardMintLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  cardMintAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  cardMintSub: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#065F46',
  },

  // Card Sky Blue (Còn cần - đồng bộ với Sự kiện)
  cardSky: {
    backgroundColor: '#B7D9F2',
    borderColor: '#93C5FD',
    flex: 1,
  },
  cardSkyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  cardSkyAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0369A1',
    letterSpacing: -0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  cardSkySub: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#075985',
  },
  cardHeaderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // 4. Section Header Row
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#221D18',
  },
  sectionCountText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#78716C',
  },

  // 5. Goals Grid & Card
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  goalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 20,
    position: 'relative',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  goalCardDesktop: {
    width: 350,
  },
  goalCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalCardLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  goalIconSquare: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalTitleWrap: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#221D18',
    marginBottom: 2,
  },
  goalDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalDaysText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78716C',
  },
  goalStatusBadge: {
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  goalStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  goalRemainLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    letterSpacing: 0.6,
    marginTop: 16,
  },
  goalRemainAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#221D18',
    marginTop: 2,
  },
  goalRemainCurrency: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78716C',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3EFEA',
    overflow: 'hidden',
    marginTop: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#221D18',
  },
  progressFractionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
    marginTop: 6,
  },
  depositBtn: {
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DECF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  depositBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#221D18',
  },
  goalCardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F0E8',
  },
  cardMiniAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMiniActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#221D18',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    maxWidth: 380,
  },
  emptyActionBtn: {
    backgroundColor: '#98E4B0',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 18,
  },
  emptyActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#221D18',
  },

  // Modal Styles (Matches Screenshot 2)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 460,
  },
  modalDialogCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalDialogTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#221D18',
  },
  modalDialogSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#78716C',
    marginTop: 3,
  },
  modalCloseCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DECF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDarkDivider: {
    height: 1,
    backgroundColor: '#221D18',
    marginVertical: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#221D18',
    marginBottom: 8,
  },
  asterisk: {
    color: '#DC2626',
    fontWeight: '800',
  },
  boxInputContainer: {
    backgroundColor: '#F4EFE6',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  boxInputContainerFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  boxTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#221D18',
    backgroundColor: 'transparent',
    outlineStyle: 'none' as any,
  },
  currencyBadge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78716C',
    marginLeft: 8,
  },
  calendarIconBtn: {
    padding: 4,
  },
  textareaContainer: {
    backgroundColor: '#F4EFE6',
    borderRadius: 16,
    minHeight: 88,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  textareaContainerFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  textareaInput: {
    fontSize: 14,
    color: '#221D18',
    textAlignVertical: 'top',
    backgroundColor: 'transparent',
    outlineStyle: 'none' as any,
  },
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#221D18',
  },
  modalSubmitBtn: {
    backgroundColor: '#98E4B0',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },

  // Mini Calendar
  miniCalendarBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 12,
    marginBottom: 16,
  },
  miniCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  miniCalNavBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  miniCalNavText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#221D18',
  },
  miniCalendarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#221D18',
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dowCell: {
    flex: 1,
    alignItems: 'center',
  },
  dowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#221D18',
  },
});
