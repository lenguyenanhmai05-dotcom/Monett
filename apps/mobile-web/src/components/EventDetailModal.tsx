import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MonettEvent } from '../services/eventsStorage';

interface EventDetailModalProps {
  visible: boolean;
  event: MonettEvent | null;
  onClose: () => void;
  onEdit: (event: MonettEvent) => void;
  onDelete: (eventId: string, eventTitle: string) => void;
  onToggleStatus: (eventId: string) => void;
  onAddExpense: (event: MonettEvent) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  visible,
  event,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddExpense,
}) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  if (!visible || !event) return null;

  const percentSpent =
    event.estimatedBudget > 0
      ? Math.min(Math.round((event.spentAmount / event.estimatedBudget) * 100), 200)
      : 0;

  const remaining = event.estimatedBudget - event.spentAmount;
  const isOverBudget = remaining < 0;

  // Status configuration
  const statusConfig = {
    ongoing: {
      labelVi: 'Đang diễn ra',
      labelEn: 'Ongoing',
      bg: isDark ? 'rgba(5, 150, 105, 0.2)' : '#DCFCE7',
      color: '#059669',
      icon: 'radio-button-on' as const,
    },
    upcoming: {
      labelVi: 'Sắp tới',
      labelEn: 'Upcoming',
      bg: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
      color: '#B45309',
      icon: 'time-outline' as const,
    },
    completed: {
      labelVi: 'Đã hoàn thành',
      labelEn: 'Completed',
      bg: isDark ? '#334155' : '#F1F5F9',
      color: '#64748B',
      icon: 'checkmark-circle-outline' as const,
    },
  }[event.status];

  // Color tokens
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const dividerColor = isDark ? '#334155' : '#E8E2D9';
  const textPrimary = isDark ? '#F8FAFC' : '#111827';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const boxBg = isDark ? '#0F172A' : '#F8FAFC';
  const tagBg = isDark ? '#334155' : '#F1F5F9';

  // Progress bar color
  let progressColor = '#10B981';
  if (percentSpent >= 100) progressColor = '#EF4444';
  else if (percentSpent >= 80) progressColor = '#F59E0B';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.dialogCard, { backgroundColor: cardBg }]}>
              {/* ================= HEADER ================= */}
              <View style={[styles.dialogHeader, { borderBottomColor: dividerColor }]}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity
                    onPress={() => onToggleStatus(event.id)}
                    style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
                    activeOpacity={0.7}
                    accessibilityLabel="Bấm để đổi trạng thái"
                  >
                    <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
                    <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                      {isVi ? statusConfig.labelVi : statusConfig.labelEn}
                    </Text>
                    <Ionicons name="swap-horizontal" size={12} color={statusConfig.color} style={{ marginLeft: 3 }} />
                  </TouchableOpacity>
                  <Text style={[styles.dialogTitle, { color: textPrimary }]} numberOfLines={1}>
                    {event.title}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeCircleBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={textSecondary} />
                </TouchableOpacity>
              </View>

              {/* ================= BODY ================= */}
              <ScrollView
                style={styles.dialogBody}
                contentContainerStyle={styles.dialogBodyContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Meta details (Dates & Location) */}
                <View style={styles.metaRow}>
                  {/* Dates */}
                  <View style={[styles.metaPill, { backgroundColor: tagBg }]}>
                    <Ionicons name="calendar-outline" size={16} color="#059669" />
                    <Text style={[styles.metaText, { color: textPrimary }]}>
                      {event.startDate}
                      {event.endDate ? ` → ${event.endDate}` : ''}
                    </Text>
                  </View>

                  {/* Location */}
                  {event.location ? (
                    <View style={[styles.metaPill, { backgroundColor: tagBg }]}>
                      <Ionicons name="location-outline" size={16} color="#EA580C" />
                      <Text style={[styles.metaText, { color: textPrimary }]}>{event.location}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Description */}
                {event.description ? (
                  <View style={[styles.descBox, { backgroundColor: boxBg, borderColor: dividerColor }]}>
                    <Text style={[styles.descTitle, { color: textSecondary }]}>
                      {isVi ? 'Mô tả & Kế hoạch' : 'Notes & Itinerary'}
                    </Text>
                    <Text style={[styles.descContent, { color: textPrimary }]}>
                      {event.description}
                    </Text>
                  </View>
                ) : null}

                {/* Budget Progress Box */}
                <View style={[styles.budgetBox, { backgroundColor: boxBg, borderColor: dividerColor }]}>
                  <View style={styles.budgetHeader}>
                    <Text style={[styles.budgetLabel, { color: textSecondary }]}>
                      {isVi ? 'Theo dõi ngân sách sự kiện' : 'Event Budget Tracking'}
                    </Text>
                    <Text style={[styles.budgetPercent, { color: progressColor }]}>
                      {percentSpent}%
                    </Text>
                  </View>

                  {/* Progress bar track */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(percentSpent, 100)}%`,
                          backgroundColor: progressColor,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.budgetMetricsRow}>
                    <View style={styles.metricCol}>
                      <Text style={[styles.metricLabel, { color: textSecondary }]}>
                        {isVi ? 'Ngân sách' : 'Budget'}
                      </Text>
                      <Text style={[styles.metricValue, { color: textPrimary }]}>
                        {event.estimatedBudget.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>

                    <View style={styles.metricCol}>
                      <Text style={[styles.metricLabel, { color: textSecondary }]}>
                        {isVi ? 'Đã chi tiêu' : 'Spent'}
                      </Text>
                      <Text style={[styles.metricValue, { color: textPrimary }]}>
                        {event.spentAmount.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>

                    <View style={[styles.metricCol, { alignItems: 'flex-end' }]}>
                      <Text style={[styles.metricLabel, { color: textSecondary }]}>
                        {isOverBudget
                          ? isVi
                            ? 'Vượt chi'
                            : 'Over Budget'
                          : isVi
                          ? 'Còn lại'
                          : 'Remaining'}
                      </Text>
                      <Text
                        style={[
                          styles.metricValue,
                          { color: isOverBudget ? '#EF4444' : '#059669' },
                        ]}
                      >
                        {Math.abs(remaining).toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Expenses List & Add Expense Button */}
                <View style={styles.expensesSection}>
                  <View style={styles.expensesSectionHeader}>
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                      {isVi
                        ? `Danh sách chi tiêu (${event.expenses.length})`
                        : `Expenses Breakdown (${event.expenses.length})`}
                    </Text>

                    <TouchableOpacity
                      style={[styles.addExpenseBtn, { backgroundColor: '#98E4B0' }]}
                      onPress={() => onAddExpense(event)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#064E3B" />
                      <Text style={styles.addExpenseBtnText}>
                        {isVi ? '+ Thêm chi tiêu' : '+ Add Expense'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {event.expenses.length === 0 ? (
                    <View style={[styles.emptyExpenseBox, { backgroundColor: boxBg }]}>
                      <Ionicons name="receipt-outline" size={32} color={textSecondary} />
                      <Text style={[styles.emptyExpenseText, { color: textSecondary }]}>
                        {isVi
                          ? 'Chưa có khoản chi tiêu nào cho sự kiện này.'
                          : 'No expenses recorded for this event yet.'}
                      </Text>
                      <Text style={[styles.emptyExpenseSub, { color: textSecondary }]}>
                        {isVi
                          ? 'Bấm "+ Thêm chi tiêu" để ghi lại chi phí vé xe, ăn uống, khách sạn...'
                          : 'Tap "+ Add Expense" to record tickets, food, hotel...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.expenseList}>
                      {event.expenses.map((item) => (
                        <View
                          key={item.id}
                          style={[styles.expenseItemRow, { backgroundColor: boxBg, borderColor: dividerColor }]}
                        >
                          <View style={styles.expenseItemLeft}>
                            <View style={styles.expenseIconWrap}>
                              <Text style={{ fontSize: 20 }}>{item.categoryIcon || '💸'}</Text>
                            </View>
                            <View>
                              <Text style={[styles.expenseTitle, { color: textPrimary }]}>
                                {item.title}
                              </Text>
                              <Text style={[styles.expenseSub, { color: textSecondary }]}>
                                {item.date} {item.category ? `• ${item.category}` : ''}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.expenseAmount, { color: textPrimary }]}>
                            {item.amount.toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* ================= FOOTER ================= */}
              <View style={[styles.dialogFooter, { borderTopColor: dividerColor }]}>
                {/* Delete button */}
                <TouchableOpacity
                  onPress={() => onDelete(event.id, event.title)}
                  style={[styles.deleteBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>
                    {isVi ? 'Xóa sự kiện' : 'Delete'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.footerRight}>
                  {/* Edit button */}
                  <TouchableOpacity
                    onPress={() => onEdit(event)}
                    style={[styles.editBtn, { backgroundColor: tagBg }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={16} color={textPrimary} />
                    <Text style={[styles.editBtnText, { color: textPrimary }]}>
                      {isVi ? 'Chỉnh sửa' : 'Edit'}
                    </Text>
                  </TouchableOpacity>

                  {/* Close button */}
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.closeBtnText}>
                      {isVi ? 'Đóng' : 'Close'}
                    </Text>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 620,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 12,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    flex: 1,
  },
  closeCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBody: {
    maxHeight: 560,
  },
  dialogBodyContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  descBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  descTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  descContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  budgetBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  budgetPercent: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  expensesSection: {
    gap: 12,
  },
  expensesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  addExpenseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
  },
  emptyExpenseBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyExpenseText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyExpenseSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  expenseList: {
    gap: 8,
  },
  expenseItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  expenseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expenseIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  expenseSub: {
    fontSize: 12,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  footerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
