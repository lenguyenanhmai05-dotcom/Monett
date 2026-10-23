import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MonettEvent } from '../services/eventsStorage';

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (eventData: {
    title: string;
    startDate: string;
    endDate?: string;
    location?: string;
    estimatedBudget: number;
    description?: string;
    status?: 'upcoming' | 'ongoing' | 'completed';
  }) => void;
  editingEvent?: MonettEvent | null;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  visible,
  onClose,
  onSave,
  editingEvent,
}) => {
  const { isDark } = useTheme();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // Form State
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'ongoing' | 'completed'>('ongoing');

  // Mini Calendar Picker State
  const [activePickerField, setActivePickerField] = useState<'start' | 'end' | null>(null);
  const [pickerDate, setPickerDate] = useState<Date>(() => new Date());

  // Focus state for active green outline effect matching the screenshot
  const [isTitleFocused, setIsTitleFocused] = useState(true);

  // Sync when opening or editing
  useEffect(() => {
    if (visible) {
      if (editingEvent) {
        setTitle(editingEvent.title || '');
        setStartDate(editingEvent.startDate || '');
        setEndDate(editingEvent.endDate || '');
        setLocation(editingEvent.location || '');
        setBudgetStr(editingEvent.estimatedBudget > 0 ? String(editingEvent.estimatedBudget) : '');
        setDescription(editingEvent.description || '');
        setStatus(editingEvent.status || 'ongoing');
      } else {
        // Default today's date formatted dd/mm/yyyy
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();

        setTitle('');
        setStartDate(`${dd}/${mm}/${yyyy}`);
        setEndDate('');
        setLocation('');
        setBudgetStr('');
        setDescription('');
        setStatus('ongoing');
      }
      setActivePickerField(null);
      setIsTitleFocused(true);
    }
  }, [visible, editingEvent]);

  const handleAmountChange = (text: string) => {
    const raw = text.replace(/[^0-9]/g, '');
    setBudgetStr(raw);
  };

  const formattedBudgetDisplay = () => {
    if (!budgetStr) return '';
    const num = parseInt(budgetStr, 10);
    return isNaN(num) ? '' : num.toLocaleString('vi-VN');
  };

  const handleSelectCalendarDay = (day: number) => {
    const mm = String(pickerDate.getMonth() + 1).padStart(2, '0');
    const yyyy = pickerDate.getFullYear();
    const dd = String(day).padStart(2, '0');
    const formatted = `${dd}/${mm}/${yyyy}`;

    if (activePickerField === 'start') {
      setStartDate(formatted);
    } else if (activePickerField === 'end') {
      setEndDate(formatted);
    }
    setActivePickerField(null);
  };

  const handlePrevPickerMonth = () => {
    setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1));
  };

  const handleNextPickerMonth = () => {
    setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1));
  };

  const handleSubmit = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      alert(isVi ? 'Vui lòng nhập tên sự kiện.' : 'Please enter event title.');
      return;
    }

    const cleanStart = startDate.trim();
    if (!cleanStart) {
      alert(isVi ? 'Vui lòng nhập ngày bắt đầu.' : 'Please enter start date.');
      return;
    }

    const estimatedBudget = parseInt(budgetStr.replace(/\D/g, ''), 10) || 0;

    onSave({
      title: cleanTitle,
      startDate: cleanStart,
      endDate: endDate.trim() || undefined,
      location: location.trim() || undefined,
      estimatedBudget,
      description: description.trim() || undefined,
      status,
    });

    onClose();
  };

  if (!visible) return null;

  // Calendar matrix calculation for date picker
  const pickerYear = pickerDate.getFullYear();
  const pickerMonth = pickerDate.getMonth();
  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const firstDow = (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7; // Monday = 0
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  // Background and border tokens matching the design
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const inputBg = isDark ? '#0F172A' : '#F3EEEA';
  const dividerColor = isDark ? '#334155' : '#E8E2D9';
  const textColor = isDark ? '#F8FAFC' : '#111827';
  const labelColor = isDark ? '#E2E8F0' : '#1F2937';
  const placeholderColor = '#94A3B8';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardView}
            >
              <View style={[styles.dialogCard, { backgroundColor: cardBg }]}>
                {/* ================= HEADER ================= */}
                <View style={[styles.dialogHeader, { borderBottomColor: dividerColor }]}>
                  <Text style={[styles.dialogTitle, { color: textColor }]}>
                    {editingEvent
                      ? (isVi ? 'Chỉnh sửa sự kiện' : 'Edit Event')
                      : (isVi ? 'Sự kiện mới' : 'New Event')}
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={[styles.closeCircleBtn, { backgroundColor: isDark ? '#334155' : '#F8FAFC' }]}
                    activeOpacity={0.7}
                    accessibilityLabel="Đóng"
                  >
                    <Ionicons name="close" size={18} color={isDark ? '#CBD5E1' : '#475569'} />
                  </TouchableOpacity>
                </View>

                {/* ================= BODY ================= */}
                <ScrollView
                  style={styles.dialogBody}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.dialogBodyContent}
                >
                  {/* 1. Tên sự kiện * */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: labelColor }]}>
                      {isVi ? 'Tên sự kiện' : 'Event Title'} <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.titleInputContainer,
                        isTitleFocused && styles.titleInputContainerFocused,
                        { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
                      ]}
                    >
                      <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder={isVi ? 'Du lịch Đà Lạt' : 'Trip to Da Lat'}
                        placeholderTextColor={placeholderColor}
                        style={[styles.titleTextInput, { color: textColor }]}
                        onFocus={() => setIsTitleFocused(true)}
                        onBlur={() => setIsTitleFocused(false)}
                        autoFocus
                      />
                    </View>
                  </View>

                  {/* 2. Hai cột: Bắt đầu * & Kết thúc */}
                  <View style={styles.twoColRow}>
                    {/* Bắt đầu * */}
                    <View style={styles.colHalf}>
                      <Text style={[styles.formLabel, { color: labelColor }]}>
                        {isVi ? 'Bắt đầu' : 'Start'} <Text style={styles.asterisk}>*</Text>
                      </Text>
                      <View style={[styles.boxInputContainer, { backgroundColor: inputBg }]}>
                        <TextInput
                          value={startDate}
                          onChangeText={setStartDate}
                          placeholder="dd/mm/yyyy"
                          placeholderTextColor={placeholderColor}
                          style={[styles.boxTextInput, { color: textColor }]}
                        />
                        <TouchableOpacity
                          onPress={() => {
                            setActivePickerField((prev) => (prev === 'start' ? null : 'start'));
                          }}
                          style={styles.calendarIconBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="calendar-outline" size={18} color={isDark ? '#CBD5E1' : '#111827'} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Kết thúc */}
                    <View style={styles.colHalf}>
                      <Text style={[styles.formLabel, { color: labelColor }]}>
                        {isVi ? 'Kết thúc' : 'End'}
                      </Text>
                      <View style={[styles.boxInputContainer, { backgroundColor: inputBg }]}>
                        <TextInput
                          value={endDate}
                          onChangeText={setEndDate}
                          placeholder="dd/mm/yyyy"
                          placeholderTextColor={placeholderColor}
                          style={[styles.boxTextInput, { color: textColor }]}
                        />
                        <TouchableOpacity
                          onPress={() => {
                            setActivePickerField((prev) => (prev === 'end' ? null : 'end'));
                          }}
                          style={styles.calendarIconBtn}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="calendar-outline" size={18} color={isDark ? '#CBD5E1' : '#111827'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Dropdown Mini Lịch khi người dùng nhấn icon lịch */}
                  {activePickerField && (
                    <View style={[styles.miniDatePickerBox, { backgroundColor: cardBg, borderColor: dividerColor }]}>
                      <View style={styles.miniDateHeader}>
                        <TouchableOpacity onPress={handlePrevPickerMonth} style={styles.arrowMiniBtn}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: textColor }}>‹</Text>
                        </TouchableOpacity>
                        <Text style={[styles.miniDateTitle, { color: textColor }]}>
                          {isVi
                            ? `Tháng ${pickerMonth + 1}, ${pickerYear}`
                            : `${new Date(pickerYear, pickerMonth).toLocaleString('en-US', { month: 'short' })} ${pickerYear}`}
                        </Text>
                        <TouchableOpacity onPress={handleNextPickerMonth} style={styles.arrowMiniBtn}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: textColor }}>›</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.dowRow}>
                        {(isVi ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']).map((dow, idx) => (
                          <View key={dow + idx} style={styles.dowCell}>
                            <Text style={styles.dowText}>{dow}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.dayGrid}>
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
                              <Text style={[styles.dayCellText, { color: textColor }]}>{day}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* 3. Hai cột: Địa điểm & Ngân sách dự kiến */}
                  <View style={styles.twoColRow}>
                    {/* Địa điểm */}
                    <View style={styles.colHalf}>
                      <Text style={[styles.formLabel, { color: labelColor }]}>
                        {isVi ? 'Địa điểm' : 'Location'}
                      </Text>
                      <View style={[styles.boxInputContainer, { backgroundColor: inputBg }]}>
                        <Ionicons
                          name="location-outline"
                          size={18}
                          color="#94A3B8"
                          style={{ marginRight: 6 }}
                        />
                        <TextInput
                          value={location}
                          onChangeText={setLocation}
                          placeholder={isVi ? 'Đà Lạt' : 'Da Lat'}
                          placeholderTextColor={placeholderColor}
                          style={[styles.boxTextInput, { color: textColor }]}
                        />
                      </View>
                    </View>

                    {/* Ngân sách dự kiến */}
                    <View style={styles.colHalf}>
                      <Text style={[styles.formLabel, { color: labelColor }]}>
                        {isVi ? 'Ngân sách dự kiến' : 'Estimated Budget'}
                      </Text>
                      <View style={[styles.boxInputContainer, { backgroundColor: inputBg }]}>
                        <TextInput
                          value={formattedBudgetDisplay()}
                          onChangeText={handleAmountChange}
                          placeholder="0"
                          placeholderTextColor={placeholderColor}
                          keyboardType="numeric"
                          style={[styles.boxTextInput, { color: textColor }]}
                        />
                        <Text style={styles.currencyBadge}>đ</Text>
                      </View>
                    </View>
                  </View>

                  {/* 4. Trạng thái sự kiện */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: labelColor }]}>
                      {isVi ? 'Trạng thái sự kiện' : 'Event Status'}
                    </Text>
                    <View style={styles.statusOptionsRow}>
                      {[
                        { key: 'ongoing', label: isVi ? 'Đang diễn ra' : 'Ongoing', color: '#166534', bg: '#D2EADA' },
                        { key: 'upcoming', label: isVi ? 'Sắp tới' : 'Upcoming', color: '#0284C7', bg: '#D4E5F7' },
                        { key: 'completed', label: isVi ? 'Hoàn thành' : 'Completed', color: '#6B21A8', bg: '#E3E1EB' },
                      ].map((item) => {
                        const isSelected = status === item.key;
                        return (
                          <TouchableOpacity
                            key={item.key}
                            onPress={() => setStatus(item.key as 'upcoming' | 'ongoing' | 'completed')}
                            style={[
                              styles.statusOptionPill,
                              {
                                backgroundColor: isSelected ? item.bg : isDark ? '#0F172A' : '#F8FAFC',
                                borderColor: isSelected ? item.color : isDark ? '#334155' : '#E2E8F0',
                                borderWidth: isSelected ? 1.5 : 1,
                              },
                            ]}
                            activeOpacity={0.75}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                { backgroundColor: isSelected ? item.color : '#94A3B8' },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusOptionText,
                                {
                                  color: isSelected ? item.color : isDark ? '#94A3B8' : '#64748B',
                                  fontWeight: isSelected ? '700' : '600',
                                },
                              ]}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* 5. Mô tả */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: labelColor }]}>
                      {isVi ? 'Mô tả' : 'Description'}
                    </Text>
                    <View style={[styles.descInputContainer, { backgroundColor: inputBg }]}>
                      <TextInput
                        value={description}
                        onChangeText={setDescription}
                        placeholder={
                          isVi
                            ? 'Ghi chú lịch trình, kế hoạch ăn uống, danh sách bạn bè tham gia...'
                            : 'Itinerary notes, places to visit, friends joining...'
                        }
                        placeholderTextColor={placeholderColor}
                        multiline
                        textAlignVertical="top"
                        style={[styles.descTextInput, { color: textColor }]}
                      />
                    </View>
                  </View>
                </ScrollView>

                {/* ================= FOOTER ================= */}
                <View style={[styles.dialogFooter, { borderTopColor: dividerColor }]}>
                  <TouchableOpacity onPress={onClose} style={styles.cancelTextBtn} activeOpacity={0.7}>
                    <Text style={[styles.cancelBtnText, { color: isDark ? '#E2E8F0' : '#1F2937' }]}>
                      {isVi ? 'Huỷ' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={styles.submitPillBtn}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.submitBtnText}>
                      {editingEvent
                        ? (isVi ? 'Lưu' : 'Save')
                        : (isVi ? 'Tạo' : 'Create')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
  },
  dialogCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
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
  dialogTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBody: {
    maxHeight: 520,
  },
  dialogBodyContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 16,
  },
  formGroup: {
    width: '100%',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  asterisk: {
    color: '#EF4444',
    fontWeight: '800',
  },
  // Khung viền xanh lá bo góc nổi bật khớp 100% ảnh người dùng
  titleInputContainer: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleInputContainerFocused: {
    borderColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  titleTextInput: {
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  colHalf: {
    flex: 1,
    minWidth: 0,
  },
  // Ô nhập bo tròn màu kem be khớp ảnh
  boxInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  boxTextInput: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  calendarIconBtn: {
    padding: 2,
    marginLeft: 6,
    flexShrink: 0,
  },
  currencyBadge: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 6,
    flexShrink: 0,
  },
  descInputContainer: {
    width: '100%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 100,
  },
  descTextInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 76,
    padding: 0,
    outlineStyle: 'none' as any,
  },
  // Mini Date Picker
  miniDatePickerBox: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: -4,
  },
  miniDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  arrowMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  miniDateTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  dowRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dowCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 2,
  },
  dowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dayGrid: {
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
    fontWeight: '700',
  },
  // Status selector pills
  statusOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  statusOptionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusOptionText: {
    fontSize: 13,
  },
  // Footer
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 18,
  },
  cancelTextBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Nút Tạo màu xanh pastel khớp hoàn toàn với ảnh
  submitPillBtn: {
    backgroundColor: '#98E4B0',
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
});
