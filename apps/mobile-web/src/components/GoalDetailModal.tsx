import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
} from 'react-native';
import Svg, { Path, Rect, Circle, Line, Polyline, Polygon } from 'react-native-svg';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ISavingsGoal,
  SavingsDepositRecord,
  calculateGoalDaysRemaining,
} from '../services/savingsStorage';

// =========================================================================
// SVG VECTOR ICONS SẮC NÉT (100% THAY THẾ TOÀN BỘ EMOJI & ICON CŨ)
// =========================================================================
const SvgMoneyBag: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = '#059669' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 13.5C19 17.6421 15.866 21 12 21C8.13401 21 5 17.6421 5 13.5C5 10.5 7 8 10 7.5L9 4H15L14 7.5C17 8 19 10.5 19 13.5Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M10 4C10 4 10.5 3 12 3C13.5 3 14 4 14 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <Path
      d="M12 11V16M10.5 12.5C10.5 12 11 11.5 12 11.5C13 11.5 13.5 12 13.5 12.5C13.5 13.5 10.5 13.5 10.5 14.5C10.5 15 11 15.5 12 15.5C13 15.5 13.5 15 13.5 14.5"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SvgCalendar: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#78716C',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth="1.8" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.8" />
    </Svg>
  </View>
);

const SvgDocument: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#78716C',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M14 2V8H20" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Line x1="8" y1="17" x2="13" y2="17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  </View>
);

const SvgPencil: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#0284C7',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.5 3.5C16.8978 3.10217 17.4374 2.87868 18 2.87868C18.5626 2.87868 19.1022 3.10217 19.5 3.5C19.8978 3.89782 20.1213 4.43739 20.1213 5C20.1213 5.56261 19.8978 6.10217 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
);

const SvgTrash: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#EF4444',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <Line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  </View>
);

const SvgPlus: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#064E3B',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  </View>
);

const SvgClose: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 18,
  color = '#221D18',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  </View>
);

const SvgCheck: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#FFFFFF',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="20 6 9 17 4 12"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
);

const SvgClock: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#0284C7',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <Polyline
        points="12 7 12 12 15 15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
);

const SvgLayers: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#7C3AED',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon
        points="12 2 2 7 12 12 22 7 12 2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline points="2 17 12 22 22 17" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="2 12 12 17 22 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </View>
);

const SvgPieChart: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#78716C',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.21 15.89A10 10 0 1 1 8 2.83"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M22 12A10 10 0 0 0 12 2V12Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </View>
);

const SvgCoins: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 16,
  color = '#78716C',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="9" r="6" stroke={color} strokeWidth="1.8" />
      <Path d="M15 7.5A6 6 0 0 1 19 14.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M17.5 11.5A6 6 0 0 1 19 19.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  </View>
);

const SvgFlag: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 18,
  color = '#0284C7',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 15C4 15 5 14 8 14C11 14 13 16 16 16C19 16 20 15 20 15V3C20 3 19 4 16 4C13 4 11 2 8 2C5 2 4 3 4 3V22"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
);

const SvgWallet: React.FC<{ size?: number; color?: string; style?: any }> = ({
  size = 42,
  color = '#A8A29E',
  style,
}) => (
  <View style={style}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M16 7V5C16 3.89543 15.1046 3 14 3H6C4.89543 3 4 3.89543 4 5V7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="17" cy="14" r="1.5" fill={color} />
    </Svg>
  </View>
);

interface GoalDetailModalProps {
  visible: boolean;
  goal: ISavingsGoal | null;
  onClose: () => void;
  onOpenDeposit: (goal: ISavingsGoal) => void;
  onEditGoal: (goal: ISavingsGoal) => void;
  onDeleteGoal: (goalId: string, title: string) => void;
  onDeleteDeposit?: (goalId: string, depositId: string) => void;
  onEditDeposit?: (
    goalId: string,
    depositId: string,
    updated: { amount: number; note?: string; date?: string }
  ) => void;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  visible,
  goal,
  onClose,
  onOpenDeposit,
  onEditGoal,
  onDeleteGoal,
  onDeleteDeposit,
  onEditDeposit,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // Sub-tabs inside Detail Modal: 'info' (Chi tiết mục tiêu) vs 'deposits' (Lịch sử nạp tiền)
  const [activeTab, setActiveTab] = useState<'info' | 'deposits'>('info');

  // State for inline editing deposit item
  const [editingDepId, setEditingDepId] = useState<string | null>(null);
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');

  if (!visible || !goal) return null;

  const current = goal.currentAmount || 0;
  const target = goal.targetAmount || 1;
  const remaining = Math.max(0, target - current);
  const percent = Math.min(100, Math.round((current / target) * 100));
  const isCompleted = percent >= 100;
  const daysRemaining = calculateGoalDaysRemaining(goal.deadline);
  const deposits = goal.deposits || [];

  const formatVND = (amt: number) => {
    if (!amt || isNaN(amt)) return '0';
    return amt.toLocaleString('vi-VN');
  };

  const handleDeleteDepositConfirm = (depId: string, depAmount: number) => {
    const msg = isVi
      ? `Bạn có chắc muốn xóa lượt nạp ${formatVND(depAmount)} đ này không? Số tiền mục tiêu sẽ tự động trừ lại.`
      : `Are you sure you want to delete this ${formatVND(depAmount)} VND deposit? The goal amount will be deducted automatically.`;
    if (typeof window !== 'undefined' && window.confirm) {
      if (!window.confirm(msg)) return;
    }
    if (onDeleteDeposit) {
      onDeleteDeposit(goal.id, depId);
    }
  };

  const handleStartEdit = (dep: SavingsDepositRecord) => {
    setEditingDepId(dep.id);
    setEditAmountStr(dep.amount.toLocaleString('vi-VN'));
    setEditNote(dep.note || '');
    setEditDate(dep.date || '');
  };

  const handleCancelEdit = () => {
    setEditingDepId(null);
    setEditAmountStr('');
    setEditNote('');
    setEditDate('');
  };

  const handleSaveEdit = (depId: string) => {
    const numAmt = parseInt(editAmountStr.replace(/\D/g, ''), 10) || 0;
    if (numAmt <= 0) {
      alert(isVi ? 'Vui lòng nhập số tiền hợp lệ (> 0).' : 'Please enter a valid amount.');
      return;
    }
    if (onEditDeposit) {
      onEditDeposit(goal.id, depId, {
        amount: numAmt,
        note: editNote.trim() || undefined,
        date: editDate.trim() || undefined,
      });
    }
    handleCancelEdit();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDialogCard}>
              {/* ================= HEADER ================= */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.headerLeftGroup}>
                  <View style={styles.goalIconSquare}>
                    <SvgFlag size={18} color="#0284C7" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDialogTitle} numberOfLines={1}>
                      {goal.title}
                    </Text>
                    <View style={styles.headerSubtitleRow}>
                      <SvgCalendar size={13} color="#78716C" style={{ marginRight: 4 }} />
                      <Text style={styles.modalDialogSubtitle}>{daysRemaining.text}</Text>
                      <View style={styles.badgeStatus}>
                        <Text style={styles.badgeStatusText}>
                          {isCompleted
                            ? isVi
                              ? 'Hoàn thành 🎉'
                              : 'Done 🎉'
                            : `${isVi ? 'Đang tích' : 'Saved'} ${percent}%`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseCircle}
                  activeOpacity={0.7}
                  accessibilityLabel="Đóng modal"
                >
                  <SvgClose size={18} color="#221D18" />
                </TouchableOpacity>
              </View>

              {/* Dark Charcoal Separator */}
              <View style={styles.modalDarkDivider} />

              {/* ================= TAB SWITCHER ================= */}
              <View style={styles.tabSwitcherRow}>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'info' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('info')}
                  activeOpacity={0.8}
                >
                  <SvgPieChart
                    size={16}
                    color={activeTab === 'info' ? '#FFFFFF' : '#78716C'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[styles.tabButtonText, activeTab === 'info' && styles.tabButtonTextActive]}
                  >
                    {isVi ? 'Chi tiết mục tiêu' : 'Goal Details'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'deposits' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('deposits')}
                  activeOpacity={0.8}
                >
                  <SvgCoins
                    size={16}
                    color={activeTab === 'deposits' ? '#FFFFFF' : '#78716C'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === 'deposits' && styles.tabButtonTextActive,
                    ]}
                  >
                    {isVi ? `Lịch sử nạp (${deposits.length})` : `Deposits (${deposits.length})`}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ================= CONTENT BODY ================= */}
              <ScrollView
                style={styles.modalScrollBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {/* ---------- TAB 1: CHI TIẾT MỤC TIÊU ---------- */}
                {activeTab === 'info' && (
                  <View style={styles.infoTabContainer}>
                    {/* Progress Track */}
                    <View style={styles.progressSectionCard}>
                      <View style={styles.progressHeaderRow}>
                        <Text style={styles.progressTitle}>
                          {isVi ? 'Tiến độ hoàn thành' : 'Completion Progress'}
                        </Text>
                        <Text style={styles.progressPercentText}>{percent}%</Text>
                      </View>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                      </View>
                      <View style={styles.progressFractionRow}>
                        <Text style={styles.fractionText}>
                          {formatVND(current)} đ / {formatVND(target)} đ
                        </Text>
                        <Text style={styles.fractionRemainText}>
                          {remaining > 0
                            ? isVi
                              ? `Còn thiếu ${formatVND(remaining)} đ`
                              : `Missing ${formatVND(remaining)} VND`
                            : isVi
                            ? 'Đã hoàn thành xuất sắc! 🌟'
                            : 'Goal fully achieved! 🌟'}
                        </Text>
                      </View>
                    </View>

                    {/* Timeline & Metadata Info */}
                    <View style={styles.metaInfoCard}>
                      <View style={styles.metaRow}>
                        <View style={styles.metaLabelGroup}>
                          <SvgCalendar size={16} color="#059669" />
                          <Text style={styles.metaLabelText}>
                            {isVi ? 'Hạn hoàn thành:' : 'Target Deadline:'}
                          </Text>
                        </View>
                        <Text style={styles.metaValueText}>
                          {goal.deadline || (isVi ? 'Không thời hạn' : 'No deadline')}
                        </Text>
                      </View>

                      <View style={styles.metaDivider} />

                      <View style={styles.metaRow}>
                        <View style={styles.metaLabelGroup}>
                          <SvgClock size={16} color="#0284C7" />
                          <Text style={styles.metaLabelText}>
                            {isVi ? 'Thời gian còn lại:' : 'Time Remaining:'}
                          </Text>
                        </View>
                        <Text style={[styles.metaValueText, { fontWeight: '700' }]}>
                          {daysRemaining.text}
                        </Text>
                      </View>

                      <View style={styles.metaDivider} />

                      <View style={styles.metaRow}>
                        <View style={styles.metaLabelGroup}>
                          <SvgLayers size={16} color="#7C3AED" />
                          <Text style={styles.metaLabelText}>
                            {isVi ? 'Số lần đã nạp:' : 'Deposits Count:'}
                          </Text>
                        </View>
                        <Text style={styles.metaValueText}>
                          {deposits.length} {isVi ? 'lần' : 'times'}
                        </Text>
                      </View>

                      {goal.note ? (
                        <>
                          <View style={styles.metaDivider} />
                          <View style={{ paddingTop: 6 }}>
                            <View style={[styles.metaLabelGroup, { marginBottom: 6 }]}>
                              <SvgDocument size={16} color="#D97706" />
                              <Text style={styles.metaLabelText}>
                                {isVi ? 'Ghi chú mục tiêu:' : 'Goal Note:'}
                              </Text>
                            </View>
                            <Text style={styles.metaNoteContent}>{goal.note}</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* ---------- TAB 2: LỊCH SỬ NẠP TIỀN ---------- */}
                {activeTab === 'deposits' && (
                  <View style={styles.depositsTabContainer}>
                    {/* Header Summary Row */}
                    <View style={styles.depositsSummaryBox}>
                      <View>
                        <Text style={styles.summaryLabel}>
                          {isVi ? 'Tổng tiền đã nạp vào hũ' : 'Total Deposited'}
                        </Text>
                        <Text style={styles.summaryValue}>{formatVND(current)} đ</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.quickAddDepBtn}
                        onPress={() => {
                          onOpenDeposit(goal);
                        }}
                        activeOpacity={0.85}
                      >
                        <SvgPlus size={14} color="#064E3B" style={{ marginRight: 4 }} />
                        <Text style={styles.quickAddDepText}>{isVi ? 'Nạp thêm' : 'Add Deposit'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Deposit Transactions List */}
                    {deposits.length === 0 ? (
                      <View style={styles.emptyDepositsBox}>
                        <SvgWallet size={44} color="#A8A29E" />
                        <Text style={styles.emptyDepTitle}>
                          {isVi ? 'Chưa có lượt nạp tiền nào' : 'No deposits recorded yet'}
                        </Text>
                        <Text style={styles.emptyDepSub}>
                          {isVi
                            ? 'Bấm nút "Nạp thêm" để lưu lại khoản tiền bạn vừa tích lũy được.'
                            : 'Click "Add Deposit" to record your savings into this goal.'}
                        </Text>
                        <TouchableOpacity
                          style={styles.emptyAddBtn}
                          onPress={() => onOpenDeposit(goal)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.emptyAddBtnText}>
                            + {isVi ? 'Nạp tiền ngay' : 'Deposit Now'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.depositsList}>
                        {deposits.map((dep, idx) => {
                          const isEditingThis = editingDepId === dep.id;

                          if (isEditingThis) {
                            return (
                              <View key={dep.id || `dep-${idx}`} style={styles.depEditCard}>
                                <View style={styles.depEditHeader}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <SvgPencil size={15} color="#047857" />
                                    <Text style={styles.depEditTitle}>
                                      {isVi ? 'Sửa thông tin nạp tiền' : 'Edit Deposit'}
                                    </Text>
                                  </View>
                                  <TouchableOpacity
                                    onPress={handleCancelEdit}
                                    style={styles.depEditCloseBtn}
                                    activeOpacity={0.7}
                                  >
                                    <SvgClose size={15} color="#78716C" />
                                  </TouchableOpacity>
                                </View>

                                {/* Input Số tiền */}
                                <View style={styles.depEditField}>
                                  <Text style={styles.depEditLabel}>
                                    {isVi ? 'Số tiền nạp:' : 'Deposit Amount:'}
                                  </Text>
                                  <View style={styles.depEditInputBox}>
                                    <TextInput
                                      value={editAmountStr}
                                      onChangeText={(val) => {
                                        const raw = val.replace(/\D/g, '');
                                        if (!raw) {
                                          setEditAmountStr('');
                                        } else {
                                          setEditAmountStr(parseInt(raw, 10).toLocaleString('vi-VN'));
                                        }
                                      }}
                                      keyboardType="numeric"
                                      style={styles.depEditInput}
                                      placeholder="0"
                                      placeholderTextColor="#A8A29E"
                                    />
                                    <Text style={styles.depEditCurrency}>đ</Text>
                                  </View>
                                </View>

                                {/* Input Ngày nạp */}
                                <View style={styles.depEditField}>
                                  <Text style={styles.depEditLabel}>
                                    {isVi ? 'Ngày nạp (dd/mm/yyyy):' : 'Date (dd/mm/yyyy):'}
                                  </Text>
                                  <View style={styles.depEditInputBox}>
                                    <TextInput
                                      value={editDate}
                                      onChangeText={setEditDate}
                                      style={styles.depEditInput}
                                      placeholder="dd/mm/yyyy"
                                      placeholderTextColor="#A8A29E"
                                    />
                                    <SvgCalendar size={15} color="#78716C" />
                                  </View>
                                </View>

                                {/* Input Ghi chú */}
                                <View style={styles.depEditField}>
                                  <Text style={styles.depEditLabel}>
                                    {isVi ? 'Ghi chú nạp:' : 'Deposit Note:'}
                                  </Text>
                                  <View style={styles.depEditInputBox}>
                                    <TextInput
                                      value={editNote}
                                      onChangeText={setEditNote}
                                      style={styles.depEditInput}
                                      placeholder={isVi ? 'Thêm ghi chú...' : 'Add a note...'}
                                      placeholderTextColor="#A8A29E"
                                    />
                                    <SvgDocument size={15} color="#78716C" />
                                  </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.depEditActionsRow}>
                                  <TouchableOpacity
                                    style={styles.depEditCancelBtn}
                                    onPress={handleCancelEdit}
                                    activeOpacity={0.8}
                                  >
                                    <Text style={styles.depEditCancelText}>
                                      {isVi ? 'Hủy' : 'Cancel'}
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.depEditSaveBtn}
                                    onPress={() => handleSaveEdit(dep.id)}
                                    activeOpacity={0.85}
                                  >
                                    <SvgCheck size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                                    <Text style={styles.depEditSaveText}>
                                      {isVi ? 'Lưu thay đổi' : 'Save Changes'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          }

                          return (
                            <View key={dep.id || `dep-${idx}`} style={styles.depItemCard}>
                              <View style={styles.depItemTop}>
                                <View style={styles.depItemLeft}>
                                  <View style={styles.depCoinBadge}>
                                    <SvgMoneyBag size={18} color="#059669" />
                                  </View>
                                  <View>
                                    <Text style={styles.depAmountText}>
                                      +{formatVND(dep.amount)} đ
                                    </Text>
                                    <View style={styles.depDateRow}>
                                      <SvgCalendar size={12} color="#78716C" />
                                      <Text style={styles.depDateText}>{dep.date}</Text>
                                    </View>
                                  </View>
                                </View>

                                <View style={styles.depActionsRow}>
                                  {/* Nút sửa lượt nạp */}
                                  <TouchableOpacity
                                    onPress={() => handleStartEdit(dep)}
                                    style={styles.depActionBtn}
                                    activeOpacity={0.7}
                                    accessibilityLabel="Sửa lượt nạp này"
                                  >
                                    <SvgPencil size={14} color="#0284C7" />
                                  </TouchableOpacity>

                                  {/* Nút xóa lượt nạp */}
                                  {onDeleteDeposit && (
                                    <TouchableOpacity
                                      onPress={() => handleDeleteDepositConfirm(dep.id, dep.amount)}
                                      style={[styles.depActionBtn, styles.depDeleteBtn]}
                                      activeOpacity={0.7}
                                      accessibilityLabel="Xóa lượt nạp này"
                                    >
                                      <SvgTrash size={14} color="#EF4444" />
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>

                              {dep.note ? (
                                <View style={styles.depNoteRow}>
                                  <SvgDocument size={12} color="#78716C" style={{ marginRight: 4 }} />
                                  <Text style={styles.depNoteText}>"{dep.note}"</Text>
                                </View>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Dark Charcoal Separator */}
              <View style={styles.modalDarkDivider} />

              {/* ================= FOOTER ACTIONS ================= */}
              <View style={styles.modalFooterRow}>
                <View style={styles.footerLeftActions}>
                  <TouchableOpacity
                    onPress={() => {
                      onEditGoal(goal);
                      onClose();
                    }}
                    style={styles.footerMiniBtn}
                    activeOpacity={0.7}
                  >
                    <SvgPencil size={14} color="#221D18" style={{ marginRight: 4 }} />
                    <Text style={styles.footerMiniBtnText}>{isVi ? 'Sửa' : 'Edit'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      onDeleteGoal(goal.id, goal.title);
                    }}
                    style={styles.footerMiniBtn}
                    activeOpacity={0.7}
                  >
                    <SvgTrash size={14} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={[styles.footerMiniBtnText, { color: '#EF4444' }]}>
                      {isVi ? 'Xóa' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.footerRightActions}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.footerCloseBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.footerCloseBtnText}>{isVi ? 'Đóng' : 'Close'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      onOpenDeposit(goal);
                    }}
                    style={styles.footerDepositBtn}
                    activeOpacity={0.85}
                  >
                    <SvgPlus size={15} color="#064E3B" style={{ marginRight: 6 }} />
                    <Text style={styles.footerDepositBtnText}>{isVi ? 'Nạp tiền' : 'Deposit'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDialogCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#F5F0E8',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E7DECF',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },

  // Header
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  goalIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#221D18',
    letterSpacing: -0.2,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
    gap: 6,
  },
  modalDialogSubtitle: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
  },
  badgeStatus: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAE3D7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalDarkDivider: {
    height: 1,
    backgroundColor: '#E7DECF',
    marginVertical: 14,
  },

  // Tab Switcher
  tabSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: '#EAE3D7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#221D18',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#78716C',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  modalScrollBody: {
    maxHeight: 420,
  },

  // Tab 1: Info Styles
  infoTabContainer: {
    gap: 12,
  },

  // Progress Card
  progressSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 16,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#221D18',
  },
  progressPercentText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 5,
  },
  progressFractionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  fractionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#44403C',
  },
  fractionRemainText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78716C',
  },

  // Meta Info Card
  metaInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metaLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#57534E',
  },
  metaValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#221D18',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F4EFE6',
    marginVertical: 8,
  },
  metaNoteContent: {
    fontSize: 12.5,
    color: '#57534E',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Tab 2: Deposits History
  depositsTabContainer: {
    gap: 12,
  },
  depositsSummaryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78716C',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#221D18',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  quickAddDepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#98E4B0',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  quickAddDepText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064E3B',
  },

  emptyDepositsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 28,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyDepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#221D18',
    marginTop: 10,
  },
  emptyDepSub: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    maxWidth: 320,
  },
  emptyAddBtn: {
    backgroundColor: '#98E4B0',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
  },

  depositsList: {
    gap: 8,
  },
  depItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7DECF',
    padding: 12,
  },
  depItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  depCoinBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  depDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  depDateText: {
    fontSize: 11,
    color: '#78716C',
  },
  depActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  depActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F4EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depDeleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  depNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F4EFE6',
  },
  depNoteText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
  },

  // Inline Edit Deposit Card
  depEditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#059669',
    padding: 14,
    gap: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  depEditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  depEditTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
  },
  depEditCloseBtn: {
    padding: 2,
  },
  depEditField: {
    gap: 4,
  },
  depEditLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#57534E',
  },
  depEditInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4EFE6',
    borderWidth: 1,
    borderColor: '#E7DECF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  depEditInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#221D18',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  depEditCurrency: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  depEditActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  depEditCancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6D3D1',
    backgroundColor: '#FFFFFF',
  },
  depEditCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  depEditSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#047857',
  },
  depEditSaveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Footer Actions
  modalFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F4EFE6',
  },
  footerMiniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#221D18',
  },
  footerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerCloseBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  footerCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78716C',
  },
  footerDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#98E4B0',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  footerDepositBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
});
