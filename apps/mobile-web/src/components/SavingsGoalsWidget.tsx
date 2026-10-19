import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

import {
  ISavingsGoal,
  loadSavingsGoals,
  saveSavingsGoals,
} from '../services/savingsStorage';

export { ISavingsGoal };

const PRESET_ICONS = ['📱', '🏖️', '💻', '🚗', '🏠', '🛡️', '💍', '🎓', '🎮', '🏍️', '✈️', '🎸'];
const PRESET_COLORS = ['#059669', '#0284C7', '#7C3AED', '#EA580C', '#DB2777', '#F59E0B'];

const SAMPLE_GOALS: ISavingsGoal[] = [
  {
    id: 'sample-goal-1',
    title: 'Đổi iPhone mới',
    targetAmount: 28000000,
    currentAmount: 18500000,
    icon: '📱',
    deadline: '2026-11-20',
    color: '#059669',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sample-goal-2',
    title: 'Du lịch Đà Lạt cùng bạn bè',
    targetAmount: 6000000,
    currentAmount: 4200000,
    icon: '🏖️',
    deadline: '2026-12-15',
    color: '#0284C7',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sample-goal-3',
    title: 'Quỹ khẩn cấp 3 tháng',
    targetAmount: 20000000,
    currentAmount: 15000000,
    icon: '🛡️',
    deadline: '2027-01-30',
    color: '#7C3AED',
    createdAt: new Date().toISOString(),
  },
];

// Đã tắt hoàn toàn âm thanh theo yêu cầu của người dùng
const playCoinSound = () => {
  return;
};

const formatMoney = (amount: number): string => {
  if (!amount || isNaN(amount)) return '0 đ';
  return amount.toLocaleString('vi-VN') + ' đ';
};

interface SavingsGoalsWidgetProps {
  noMargin?: boolean;
}

export const SavingsGoalsWidget: React.FC<SavingsGoalsWidgetProps> = ({ noMargin }) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;

  const storageKey = useMemo(() => {
    return `@monett_savings_goals_${user?.id || 'guest'}`;
  }, [user?.id]);

  const [goals, setGoals] = useState<ISavingsGoal[]>(() => loadSavingsGoals(user?.id));

  // Modal nạp thêm tiền vào hũ
  const [depositingGoal, setDepositingGoal] = useState<ISavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');

  // Modal tạo / sửa mục tiêu
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formTarget, setFormTarget] = useState<string>('');
  const [formCurrent, setFormCurrent] = useState<string>('');
  const [formIcon, setFormIcon] = useState<string>('📱');
  const [formColor, setFormColor] = useState<string>('#059669');
  const [formDeadline, setFormDeadline] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Tải từ LocalStorage khi khởi động
  useEffect(() => {
    setGoals(loadSavingsGoals(user?.id));
  }, [user?.id]);

  // Lưu vào LocalStorage khi goals thay đổi
  const saveGoals = (updated: ISavingsGoal[]) => {
    setGoals(updated);
    saveSavingsGoals(updated, user?.id);
  };

  // Tính toán tổng số tiền đã gom & mục tiêu
  const totalSaved = useMemo(() => goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0), [goals]);
  const overallPercent = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Xử lý nạp tiền vào hũ
  const handleConfirmDeposit = () => {
    if (!depositingGoal) return;
    const addAmt = Number(depositAmount.replace(/\D/g, '')) || 0;
    if (addAmt <= 0) return;

    playCoinSound();

    const updated = goals.map((g) => {
      if (g.id === depositingGoal.id) {
        return {
          ...g,
          currentAmount: (g.currentAmount || 0) + addAmt,
        };
      }
      return g;
    });

    saveGoals(updated);
    setDepositingGoal(null);
    setDepositAmount('');
  };

  // Xử lý lưu mục tiêu mới / sửa
  const handleSaveForm = () => {
    const titleTrim = formTitle.trim();
    const targetNum = Number(formTarget.replace(/\D/g, '')) || 0;
    const currentNum = Number(formCurrent.replace(/\D/g, '')) || 0;

    if (!titleTrim || targetNum <= 0) return;

    playCoinSound();

    if (editingGoalId) {
      const updated = goals.map((g) => {
        if (g.id === editingGoalId) {
          return {
            ...g,
            title: titleTrim,
            targetAmount: targetNum,
            currentAmount: currentNum,
            icon: formIcon,
            color: formColor,
            deadline: formDeadline.trim() || undefined,
          };
        }
        return g;
      });
      saveGoals(updated);
    } else {
      const newGoal: ISavingsGoal = {
        id: `goal-${Date.now()}`,
        title: titleTrim,
        targetAmount: targetNum,
        currentAmount: currentNum,
        icon: formIcon,
        color: formColor,
        deadline: formDeadline.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      saveGoals([newGoal, ...goals]);
    }

    setIsFormOpen(false);
    setEditingGoalId(null);
  };

  // Mở form chỉnh sửa
  const handleStartEdit = (goal: ISavingsGoal) => {
    setEditingGoalId(goal.id);
    setFormTitle(goal.title);
    setFormTarget(String(goal.targetAmount));
    setFormCurrent(String(goal.currentAmount || 0));
    setFormIcon(goal.icon || '📱');
    setFormColor(goal.color || '#059669');
    setFormDeadline(goal.deadline || '');
    setIsFormOpen(true);
  };

  // Xóa mục tiêu
  const handleDeleteGoal = (goalId: string) => {
    const updated = goals.filter((g) => g.id !== goalId);
    saveGoals(updated);
  };

  return (
    <View style={[styles.container, noMargin && { marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>
      {/* 1. Header Mục tiêu tiết kiệm */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Text style={{ fontSize: 16 }}>🎯</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>
                {isVi ? 'HŨ TIẾT KIỆM & MỤC TIÊU' : 'SAVINGS GOALS & PIGGY BANK'}
              </Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{goals.length} {isVi ? 'mục tiêu' : 'goals'}</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              {isVi
                ? `Đã tích lũy ${formatMoney(totalSaved)} / ${formatMoney(totalTarget)} (${overallPercent}%)`
                : `Accumulated ${formatMoney(totalSaved)} / ${formatMoney(totalTarget)} (${overallPercent}%)`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setEditingGoalId(null);
            setFormTitle('');
            setFormTarget('');
            setFormCurrent('');
            setFormIcon('📱');
            setFormColor('#059669');
            setFormDeadline('');
            setIsFormOpen(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>{isVi ? 'Thêm mục tiêu' : 'New Goal'}</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Thanh tiến độ tổng hợp các hũ */}
      <View style={styles.overallProgressTrack}>
        <View style={[styles.overallProgressFill, { width: `${overallPercent}%` }]} />
      </View>

      {/* 3. Danh sách các hũ tiết kiệm */}
      <View style={[styles.goalsGrid, isWide && styles.goalsGridWide]}>
        {goals.map((goal) => {
          const current = goal.currentAmount || 0;
          const target = goal.targetAmount || 1;
          const pct = Math.min(100, Math.round((current / target) * 100));
          const remaining = Math.max(0, target - current);
          const isFinished = pct >= 100;
          const primaryColor = goal.color || '#059669';

          return (
            <View key={goal.id} style={[styles.goalCard, isWide && styles.goalCardWide]}>
              {/* Hàng trên: Icon + Tên + Badge % */}
              <View style={styles.goalCardHeader}>
                <View style={[styles.goalIconCircle, { backgroundColor: `${primaryColor}15` }]}>
                  <Text style={{ fontSize: 24 }}>{goal.icon || '🎯'}</Text>
                </View>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.goalCardTitle} numberOfLines={1}>
                    {goal.title}
                  </Text>
                  {goal.deadline ? (
                    <Text style={styles.goalDeadlineText}>
                      ⏳ {isVi ? 'Hạn đến:' : 'Due:'} {goal.deadline}
                    </Text>
                  ) : (
                    <Text style={styles.goalDeadlineText}>
                      🌱 {isVi ? 'Tích lũy linh hoạt' : 'Flexible saving'}
                    </Text>
                  )}
                </View>

                <View style={[styles.pctBadge, { backgroundColor: isFinished ? '#ECFDF5' : `${primaryColor}15` }]}>
                  <Text style={[styles.pctBadgeText, { color: isFinished ? '#059669' : primaryColor }]}>
                    {isFinished ? '100% 🎉' : `${pct}%`}
                  </Text>
                </View>
              </View>

              {/* Hàng số tiền: Đã tích lũy / Mục tiêu */}
              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>{isVi ? 'Đã gom được' : 'Saved'}</Text>
                  <Text style={[styles.currentAmountText, { color: primaryColor }]}>
                    {formatMoney(current)}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amountLabel}>{isVi ? 'Mục tiêu' : 'Target'}</Text>
                  <Text style={styles.targetAmountText}>{formatMoney(target)}</Text>
                </View>
              </View>

              {/* Thanh tiến độ phần trăm % */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: primaryColor,
                    },
                  ]}
                />
              </View>

              {/* Hàng đáy: Còn thiếu & Nút Bỏ ống heo */}
              <View style={styles.cardBottomRow}>
                <Text style={styles.remainingText}>
                  {isFinished
                    ? (isVi ? 'Đã hoàn thành xuất sắc! 🥳' : 'Goal achieved!')
                    : `${isVi ? 'Còn thiếu:' : 'Remaining:'} ${formatMoney(remaining)}`}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {/* Nút sửa */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleStartEdit(goal)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="pencil" size={14} color="#64748B" />
                  </TouchableOpacity>

                  {/* Nút xóa */}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDeleteGoal(goal.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={14} color="#94A3B8" />
                  </TouchableOpacity>

                  {/* Nút Bỏ ống heo */}
                  <TouchableOpacity
                    style={[styles.depositBtn, { backgroundColor: primaryColor }]}
                    onPress={() => {
                      setDepositingGoal(goal);
                      setDepositAmount('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.depositBtnText}>🐷 {isVi ? '+ Nạp tiền' : '+ Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* ===================== MODAL 1: NẠP TIỀN / BỎ ỐNG HEO ===================== */}
      <Modal
        visible={Boolean(depositingGoal)}
        transparent
        animationType="fade"
        onRequestClose={() => setDepositingGoal(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setDepositingGoal(null)}
            activeOpacity={1}
          />

          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>{depositingGoal?.icon || '🐷'}</Text>
                <View>
                  <Text style={styles.modalTitle}>
                    {isVi ? 'Bỏ tiền vào hũ' : 'Add to Piggy Bank'}
                  </Text>
                  <Text style={styles.modalSubtitle}>{depositingGoal?.title}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setDepositingGoal(null)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Thông tin hiện tại */}
            <View style={styles.modalCurrentStats}>
              <View>
                <Text style={styles.statsLabel}>{isVi ? 'Hiện có:' : 'Current:'}</Text>
                <Text style={styles.statsValue}>{formatMoney(depositingGoal?.currentAmount || 0)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.statsLabel}>{isVi ? 'Cần gom thêm:' : 'Needs more:'}</Text>
                <Text style={[styles.statsValue, { color: '#059669' }]}>
                  {formatMoney(Math.max(0, (depositingGoal?.targetAmount || 0) - (depositingGoal?.currentAmount || 0)))}
                </Text>
              </View>
            </View>

            {/* Ô nhập số tiền */}
            <Text style={styles.inputLabel}>{isVi ? 'Số tiền muốn bỏ thêm vào hũ' : 'Amount to save'}</Text>
            <View style={[styles.inputWrapper, focusedField === 'deposit' && styles.inputWrapperFocused]}>
              <TextInput
                style={styles.moneyInput}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                autoFocus={true}
                value={depositAmount ? Number(depositAmount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                onChangeText={(val) => setDepositAmount(val.replace(/\D/g, ''))}
                onFocus={() => setFocusedField('deposit')}
                onBlur={() => setFocusedField(null)}
              />
              <Text style={[styles.currencyBadge, focusedField === 'deposit' && { color: '#059669' }]}>đ</Text>
            </View>

            {/* Chip gợi ý tiền nhanh */}
            <View style={styles.presetChipsRow}>
              {[50000, 100000, 200000, 500000, 1000000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.presetChip}
                  onPress={() => setDepositAmount(String(amt))}
                >
                  <Text style={styles.presetChipText}>
                    +{amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nút hành động */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDepositingGoal(null)}
              >
                <Text style={styles.cancelBtnText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, !depositAmount && styles.saveBtnDisabled]}
                onPress={handleConfirmDeposit}
                disabled={!depositAmount}
              >
                <Text style={styles.saveBtnText}>
                  🐷 {isVi ? 'Cho vào hũ ngay' : 'Save to Piggy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===================== MODAL 2: TẠO / SỬA MỤC TIÊU ===================== */}
      <Modal
        visible={isFormOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setIsFormOpen(false)}
            activeOpacity={1}
          />

          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGoalId
                  ? (isVi ? '✏️ Chỉnh sửa mục tiêu' : 'Edit Goal')
                  : (isVi ? '🎯 Tạo hũ tiết kiệm mới' : 'New Savings Goal')}
              </Text>
              <TouchableOpacity
                onPress={() => setIsFormOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* 1. Chọn icon */}
              <Text style={styles.inputLabel}>{isVi ? 'Chọn biểu tượng' : 'Choose Icon'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {PRESET_ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconChip, formIcon === ic && styles.iconChipActive]}
                    onPress={() => setFormIcon(ic)}
                  >
                    <Text style={{ fontSize: 22 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 2. Tên mục tiêu */}
              <Text style={styles.inputLabel}>{isVi ? 'Tên mục tiêu / Món đồ' : 'Goal Title'}</Text>
              <View style={[styles.inputWrapper, focusedField === 'title' && styles.inputWrapperFocused]}>
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  color={focusedField === 'title' ? '#059669' : '#94A3B8'}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={isVi ? 'Ví dụ: Mua iPhone mới, Đi du lịch...' : 'e.g. New Phone, Vacation...'}
                  placeholderTextColor="#94A3B8"
                  value={formTitle}
                  onChangeText={setFormTitle}
                  onFocus={() => setFocusedField('title')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* 3. Số tiền mục tiêu */}
              <Text style={styles.inputLabel}>{isVi ? 'Số tiền mục tiêu cần gom' : 'Target Amount'}</Text>
              <View style={[styles.inputWrapper, focusedField === 'target' && styles.inputWrapperFocused]}>
                <TextInput
                  style={[styles.textInput, { fontWeight: '800', color: formColor }]}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={formTarget ? Number(formTarget.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                  onChangeText={(val) => setFormTarget(val.replace(/\D/g, ''))}
                  onFocus={() => setFocusedField('target')}
                  onBlur={() => setFocusedField(null)}
                />
                <Text style={[styles.currencyBadge, focusedField === 'target' && { color: '#059669' }]}>đ</Text>
              </View>

              {/* 4. Số tiền đã có sẵn (nếu có) */}
              <Text style={styles.inputLabel}>{isVi ? 'Số tiền đã có ban đầu (Tùy chọn)' : 'Starting Amount'}</Text>
              <View style={[styles.inputWrapper, focusedField === 'current' && styles.inputWrapperFocused]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={formCurrent ? Number(formCurrent.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                  onChangeText={(val) => setFormCurrent(val.replace(/\D/g, ''))}
                  onFocus={() => setFocusedField('current')}
                  onBlur={() => setFocusedField(null)}
                />
                <Text style={[styles.currencyBadge, focusedField === 'current' && { color: '#059669' }]}>đ</Text>
              </View>

              {/* 5. Hạn chót hoàn thành */}
              <Text style={styles.inputLabel}>{isVi ? 'Hạn chót dự kiến (Tùy chọn)' : 'Deadline'}</Text>
              <View style={[styles.inputWrapper, focusedField === 'deadline' && styles.inputWrapperFocused]}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={focusedField === 'deadline' ? '#059669' : '#94A3B8'}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={isVi ? 'Ví dụ: 31/12/2026 hoặc Cuối năm nay...' : 'e.g. 31/12/2026...'}
                  placeholderTextColor="#94A3B8"
                  value={formDeadline}
                  onChangeText={setFormDeadline}
                  onFocus={() => setFocusedField('deadline')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* 6. Chọn màu chủ đề */}
              <Text style={styles.inputLabel}>{isVi ? 'Màu chủ đề thanh tiến độ' : 'Color Theme'}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {PRESET_COLORS.map((clr) => (
                  <TouchableOpacity
                    key={clr}
                    style={[styles.colorChip, { backgroundColor: clr }, formColor === clr && styles.colorChipActive]}
                    onPress={() => setFormColor(clr)}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsFormOpen(false)}
              >
                <Text style={styles.cancelBtnText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, (!formTitle.trim() || !formTarget) && styles.saveBtnDisabled]}
                onPress={handleSaveForm}
                disabled={!formTitle.trim() || !formTarget}
              >
                <Text style={styles.saveBtnText}>
                  {editingGoalId ? (isVi ? 'Cập nhật' : 'Update') : (isVi ? 'Tạo mục tiêu' : 'Create Goal')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: 0.5,
  },
  badgeCount: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Thanh tiến độ tổng hợp
  overallProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },

  // Grid chứa các thẻ hũ
  goalsGrid: {
    gap: 12,
  },
  goalsGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  goalCardWide: {
    flex: 1,
    minWidth: 260,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  goalDeadlineText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  currentAmountText: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  targetAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },

  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  remainingText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  depositBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  depositBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdrop: {
    ...(StyleSheet.absoluteFill as any),
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  modalCurrentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  statsLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  inputWrapperFocused: {
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 0 3px rgba(5, 150, 105, 0.15)',
    } : {}),
  },
  moneyInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 6,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconChipActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  colorChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorChipActive: {
    borderColor: '#0F172A',
    transform: [{ scale: 1.15 }],
  },
});
