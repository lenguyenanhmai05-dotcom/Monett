import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IReminder } from '@monett/shared';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getRemindersApi,
  createReminderApi,
  toggleReminderApi,
  deleteReminderApi,
  updateReminderApi,
} from '../services/api';

interface RemindersWidgetProps {
  currentDateStr?: string; // YYYY-MM-DD
}

// Hàm phát chuông thông báo nhẹ nhàng bằng Web Audio API không phụ thuộc file âm thanh bên ngoài
const playNotificationSound = () => {
  if (typeof window !== 'undefined' && ((window as any).AudioContext || (window as any).webkitAudioContext)) {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      // Âm điệu vui tươi Đô - Mi - Sol (C5 - E5 - G5)
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Ignored if browser restricts autoplay audio
    }
  }
};

// Dữ liệu mẫu ban đầu để giao diện không bị trống nếu chưa có mạng
const INITIAL_SAMPLE_REMINDERS: IReminder[] = [
  {
    id: 'sample-1',
    title: 'Xíu nữa đi chợ mua cá & rau tươi',
    date: new Date().toISOString().split('T')[0],
    time: '17:30',
    remindBeforeMinutes: 10,
    isCompleted: false,
    isDismissed: false,
    note: '',
  },
];

export const RemindersWidget: React.FC<RemindersWidgetProps> = ({ currentDateStr }) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const todayYMD = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const effectiveDate = currentDateStr || todayYMD;

  const [reminders, setReminders] = useState<IReminder[]>(INITIAL_SAMPLE_REMINDERS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Danh sách 24 giờ và 60 phút để cuộn lướt
  const HOURS = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const MINUTES = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const nowInit = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return { h: d.getHours(), m: d.getMinutes() };
  }, []);

  const NOTCH_H = 26;

  // Form states
  const [newTitle, setNewTitle] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<number>(nowInit.h);
  const [selectedMinute, setSelectedMinute] = useState<number>(nowInit.m);
  const [newBeforeMinutes, setNewBeforeMinutes] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  const formattedTime = useMemo(() => {
    return `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
  }, [selectedHour, selectedMinute]);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  // In-app alert banner
  const [activeAlert, setActiveAlert] = useState<{
    id: string;
    title: string;
    time: string;
    beforeMinutes: number;
  } | null>(null);

  // Lưu danh sách id đã thông báo để không lặp lại liên tục
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // Tự động cuộn đến giờ & phút đã chọn khi mở form
  useEffect(() => {
    if (isFormOpen) {
      const timer = setTimeout(() => {
        hourScrollRef.current?.scrollTo({ y: Math.max(0, selectedHour * NOTCH_H), animated: true });
        minuteScrollRef.current?.scrollTo({ y: Math.max(0, selectedMinute * NOTCH_H), animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFormOpen, selectedHour, selectedMinute]);

  const selectHour = (h: number) => {
    setSelectedHour(h);
    hourScrollRef.current?.scrollTo({ y: h * NOTCH_H, animated: true });
  };

  const selectMinute = (m: number) => {
    setSelectedMinute(m);
    minuteScrollRef.current?.scrollTo({ y: m * NOTCH_H, animated: true });
  };

  const stepHour = (delta: number) => {
    const nextH = (selectedHour + delta + 24) % 24;
    selectHour(nextH);
  };

  const stepMinute = (delta: number) => {
    const nextM = (selectedMinute + delta + 60) % 60;
    selectMinute(nextM);
  };

  // Mở chế độ chỉnh sửa lời nhắc
  const handleStartEdit = (item: IReminder) => {
    setEditingReminderId(item.id);
    setNewTitle(item.title);
    const [hhStr, mmStr] = (item.time || '12:00').split(':');
    const h = parseInt(hhStr, 10);
    const m = parseInt(mmStr, 10);
    setSelectedHour(isNaN(h) ? 12 : h);
    setSelectedMinute(isNaN(m) ? 0 : m);
    setNewBeforeMinutes(item.remindBeforeMinutes ?? 10);
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingReminderId(null);
    setNewTitle('');
  };

  // 1. Tải danh sách nhắc nhở từ Backend
  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      const data = await getRemindersApi(effectiveDate);
      if (Array.isArray(data) && data.length > 0) {
        setReminders(data);
      } else {
        // Nếu ngày hôm nay chưa có, giữ sample để trải nghiệm mượt mà
        if (effectiveDate === todayYMD) {
          setReminders(INITIAL_SAMPLE_REMINDERS);
        } else {
          setReminders([]);
        }
      }
    } catch {
      // Offline fallback
      if (effectiveDate === todayYMD) {
        setReminders(INITIAL_SAMPLE_REMINDERS);
      } else {
        setReminders([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [effectiveDate]);

  // 2. Yêu cầu quyền thông báo của trình duyệt
  const requestBrowserNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        await Notification.requestPermission();
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
  };

  // 3. Hệ thống đếm thời gian kiểm tra lời nhắc (mỗi 10 giây)
  useEffect(() => {
    const checkUpcomingReminders = () => {
      const now = new Date();
      const nowYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      reminders.forEach((item) => {
        if (item.isCompleted || item.isDismissed) return;

        // Chỉ kiểm tra lời nhắc của ngày hôm nay
        const reminderDate = item.date || todayYMD;
        if (reminderDate !== nowYMD) return;

        const [hhStr, mmStr] = (item.time || '12:00').split(':');
        const targetHours = parseInt(hhStr, 10);
        const targetMinutes = parseInt(mmStr, 10);
        if (isNaN(targetHours) || isNaN(targetMinutes)) return;

        const targetDate = new Date();
        targetDate.setHours(targetHours, targetMinutes, 0, 0);

        // Thời điểm kích hoạt thông báo = Giờ hẹn - Số phút nhắc trước
        const alertLeadMinutes = item.remindBeforeMinutes ?? 10;
        const triggerTime = targetDate.getTime() - alertLeadMinutes * 60 * 1000;
        const expireTime = targetDate.getTime() + 60 * 60 * 1000; // Hết hạn sau 1 tiếng

        const currentTimeMs = now.getTime();

        // Nếu hiện tại đã đến hoặc qua giờ kích hoạt và chưa quá giờ hẹn quá 60 phút
        if (currentTimeMs >= triggerTime && currentTimeMs <= expireTime) {
          if (!alertedIdsRef.current.has(item.id)) {
            alertedIdsRef.current.add(item.id);

            // Kích hoạt In-App Banner
            setActiveAlert({
              id: item.id,
              title: item.title,
              time: item.time,
              beforeMinutes: alertLeadMinutes,
            });

            // Phát âm thanh chuông
            playNotificationSound();

            // Kích hoạt Web Notification (nếu người dùng cấp quyền)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('🔔 Lời nhắc Monett!', {
                  body: `${item.title} (Còn ${alertLeadMinutes} phút nữa đến ${item.time})`,
                  icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
                });
              } catch {
                // Ignore web notification error
              }
            }
          }
        }
      });
    };

    // Kiểm tra ngay lập tức và sau đó mỗi 10 giây
    checkUpcomingReminders();
    const timer = setInterval(checkUpcomingReminders, 10000);
    return () => clearInterval(timer);
  }, [reminders, todayYMD]);

  // 4. Đánh dấu hoàn thành (Tick ✓)
  const handleToggle = async (item: IReminder) => {
    const updatedStatus = !item.isCompleted;

    // Cập nhật UI ngay lập tức
    setReminders((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, isCompleted: updatedStatus } : r)),
    );

    // Nếu vừa hoàn thành món đang hiện banner thông báo thì tắt banner
    if (activeAlert?.id === item.id && updatedStatus) {
      setActiveAlert(null);
    }

    try {
      if (!item.id.startsWith('sample-')) {
        await toggleReminderApi(item.id);
      }
    } catch {
      // Silently keep optimistic UI
    }
  };

  // 5. Xóa bỏ nhắc nhở (x)
  const handleDelete = async (id: string) => {
    // Xóa ngay trên UI
    setReminders((prev) => prev.filter((r) => r.id !== id));
    if (activeAlert?.id === id) {
      setActiveAlert(null);
    }

    try {
      if (!id.startsWith('sample-')) {
        await deleteReminderApi(id);
      }
    } catch {
      // Silently keep optimistic UI
    }
  };

  // 6. Lưu lời nhắc (Tạo mới hoặc Cập nhật khi Edit)
  const handleSave = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setIsSubmitting(true);

    if (editingReminderId) {
      const targetId = editingReminderId;
      setReminders((prev) =>
        prev.map((r) =>
          r.id === targetId
            ? { ...r, title: trimmed, time: formattedTime, remindBeforeMinutes: newBeforeMinutes }
            : r,
        ),
      );
      setIsFormOpen(false);
      setEditingReminderId(null);
      setNewTitle('');

      try {
        if (!targetId.startsWith('sample-')) {
          await updateReminderApi(targetId, {
            title: trimmed,
            date: effectiveDate,
            time: formattedTime,
            remindBeforeMinutes: newBeforeMinutes,
          });
        }
      } catch {
        // Silently keep optimistic UI
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const optimisticId = 'remind-' + Date.now();
    const newReminderItem: IReminder = {
      id: optimisticId,
      title: trimmed,
      date: effectiveDate,
      time: formattedTime,
      remindBeforeMinutes: newBeforeMinutes,
      isCompleted: false,
      isDismissed: false,
      note: '',
    };

    setReminders((prev) => [newReminderItem, ...prev]);
    setNewTitle('');
    setIsFormOpen(false);

    // Xin quyền thông báo ngay nếu người dùng chưa bật
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      requestBrowserNotification();
    }

    try {
      const serverItem = await createReminderApi({
        title: trimmed,
        date: effectiveDate,
        time: formattedTime,
        remindBeforeMinutes: newBeforeMinutes,
      });

      if (serverItem && serverItem.id) {
        setReminders((prev) =>
          prev.map((r) => (r.id === optimisticId ? serverItem : r)),
        );
      }
    } catch {
      // Giữ bản optimistic
    } finally {
      setIsSubmitting(false);
    }
  };


  // Tính số lượng việc chưa xong
  const pendingCount = reminders.filter((r) => !r.isCompleted).length;

  return (
    <View style={styles.container}>
      {/* BANNER THÔNG BÁO NỔI BẬT KHI ĐẾN GIỜ (In-App Toast) */}
      {activeAlert && (
        <View style={styles.alertBanner}>
          <View style={styles.alertIconWrap}>
            <Ionicons name="notifications" size={20} color="#D97706" />
          </View>
          <View style={styles.alertContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.alertBadge}>ĐẾN GIỜ NHẮC NHỞ</Text>
              <Text style={styles.alertTimeText}>lúc {activeAlert.time}</Text>
            </View>
            <Text style={styles.alertTitle} numberOfLines={2}>
              {activeAlert.title}
            </Text>
            <Text style={styles.alertSub}>
              🔔 Đã báo trước {activeAlert.beforeMinutes} phút cho bạn!
            </Text>
          </View>
          <View style={styles.alertActions}>
            <TouchableOpacity
              style={styles.alertCheckBtn}
              onPress={() => {
                const target = reminders.find((r) => r.id === activeAlert.id);
                if (target) handleToggle(target);
                setActiveAlert(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              <Text style={styles.alertCheckText}>Xong</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.alertDismissBtn}
              onPress={() => setActiveAlert(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* HEADER MỤC NHẮC NHỞ (Đúng kiểu dáng & kích thước của HomeScreen) */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="notifications-outline" size={15} color="#047857" style={{ marginRight: 5 }} />
          <Text style={styles.sectionTitle}>{isVi ? 'MỤC NHẮC NHỞ' : 'REMINDERS'}</Text>
          {pendingCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{isVi ? `${pendingCount} việc` : `${pendingCount} pending`}</Text>
            </View>
          ) : (
            <View style={[styles.countBadge, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.countBadgeText, { color: '#059669' }]}>{isVi ? 'Đã xong ✓' : 'All done ✓'}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => {
            const nextState = !isFormOpen;
            setIsFormOpen(nextState);
            if (nextState) {
              setEditingReminderId(null);
              setNewTitle('');
              const d = new Date();
              d.setMinutes(d.getMinutes() + 30);
              setSelectedHour(d.getHours());
              setSelectedMinute(d.getMinutes());
            }
          }}
          activeOpacity={0.7}
          style={styles.toggleFormBtn}
        >
          <Ionicons
            name={isFormOpen ? 'chevron-up-outline' : 'add-circle-outline'}
            size={14}
            color="#047857"
            style={{ marginRight: 3 }}
          />
          <Text style={styles.viewAllText}>{isFormOpen ? (isVi ? 'Đóng lại' : 'Close') : (isVi ? 'Thêm lời nhắc' : 'Add reminder')}</Text>
        </TouchableOpacity>
      </View>

      {/* KHUNG TẠO / SỬA NHẮC NHỞ */}
      {isFormOpen && (
        <View style={styles.formCard}>
          <View style={styles.formHeadingRow}>
            <Text style={styles.formHeading}>
              {editingReminderId ? (isVi ? '✏️ Chỉnh sửa lời nhắc' : '✏️ Edit Reminder') : (isVi ? 'Đặt lịch nhắc nhở hôm nay' : 'Set a reminder today')}
            </Text>
            {editingReminderId && (
              <View style={styles.editingBadge}>
                <Text style={styles.editingBadgeText}>{isVi ? 'Đang sửa' : 'Editing'}</Text>
              </View>
            )}
          </View>

          {/* Ô nhập nội dung */}
          <View style={styles.inputWrap}>
            <Ionicons name="create-outline" size={17} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={isVi ? 'Ví dụ: Xíu nữa đi chợ mua cá, nộp tiền phòng...' : 'e.g. Buy groceries, pay electricity bill...'}
              placeholderTextColor="#94A3B8"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              returnKeyType="done"
            />
          </View>

          {/* Bộ chọn giờ & phút dạng nấc ô vuông nhỏ gọn chuyên nghiệp */}
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="time" size={14} color="#047857" />
                <Text style={styles.timePickerLabel}>Giờ hẹn (24h : 60p):</Text>
              </View>
              <View style={styles.timePreviewBadge}>
                <Text style={styles.timePreviewText}>{formattedTime}</Text>
              </View>
            </View>

            <View style={styles.compactWheelsCenter}>
              {/* Cột nấc Giờ (0 - 23h) */}
              <View style={styles.wheelColCompact}>
                <TouchableOpacity
                  style={styles.stepArrowBtn}
                  onPress={() => stepHour(-1)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-up" size={13} color="#047857" />
                </TouchableOpacity>

                <View style={styles.wheelBoxCompact}>
                  <ScrollView
                    ref={hourScrollRef}
                    style={styles.wheelScrollViewCompact}
                    contentContainerStyle={styles.wheelScrollContentCompact}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    snapToInterval={26}
                    decelerationRate="fast"
                    onScroll={(e) => {
                      const y = e.nativeEvent.contentOffset.y;
                      const idx = Math.round(y / 26);
                      if (idx >= 0 && idx < 24 && idx !== selectedHour) {
                        setSelectedHour(idx);
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {HOURS.map((h) => {
                      const isSelected = selectedHour === h;
                      return (
                        <TouchableOpacity
                          key={`hour-${h}`}
                          style={[styles.notchSquare, isSelected && styles.notchSquareSelected]}
                          onPress={() => selectHour(h)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.notchText, isSelected && styles.notchTextSelected]}>
                            {String(h).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  style={styles.stepArrowBtn}
                  onPress={() => stepHour(1)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-down" size={13} color="#047857" />
                </TouchableOpacity>
                <Text style={styles.unitSmallLabel}>Giờ</Text>
              </View>

              {/* Phân cách hai chấm */}
              <View style={styles.colonDividerCompact}>
                <Text style={styles.colonTextCompact}>:</Text>
              </View>

              {/* Cột nấc Phút (0 - 59p) */}
              <View style={styles.wheelColCompact}>
                <TouchableOpacity
                  style={styles.stepArrowBtn}
                  onPress={() => stepMinute(-1)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-up" size={13} color="#047857" />
                </TouchableOpacity>

                <View style={styles.wheelBoxCompact}>
                  <ScrollView
                    ref={minuteScrollRef}
                    style={styles.wheelScrollViewCompact}
                    contentContainerStyle={styles.wheelScrollContentCompact}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    snapToInterval={26}
                    decelerationRate="fast"
                    onScroll={(e) => {
                      const y = e.nativeEvent.contentOffset.y;
                      const idx = Math.round(y / 26);
                      if (idx >= 0 && idx < 60 && idx !== selectedMinute) {
                        setSelectedMinute(idx);
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {MINUTES.map((m) => {
                      const isSelected = selectedMinute === m;
                      return (
                        <TouchableOpacity
                          key={`minute-${m}`}
                          style={[styles.notchSquare, isSelected && styles.notchSquareSelected]}
                          onPress={() => selectMinute(m)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.notchText, isSelected && styles.notchTextSelected]}>
                            {String(m).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  style={styles.stepArrowBtn}
                  onPress={() => stepMinute(1)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-down" size={13} color="#047857" />
                </TouchableOpacity>
                <Text style={styles.unitSmallLabel}>Phút</Text>
              </View>
            </View>
          </View>

          {/* Chọn số phút báo trước */}
          <View style={styles.beforeRow}>
            <Text style={styles.formLabel}>Báo trước bạn:</Text>
            <View style={styles.beforeOptions}>
              {[5, 10, 15, 30].map((mins) => {
                const isSelected = newBeforeMinutes === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    onPress={() => setNewBeforeMinutes(mins)}
                    style={[styles.beforeChip, isSelected && styles.beforeChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.beforeChipText, isSelected && styles.beforeChipTextActive]}>
                      {mins} phút
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Nút lưu */}
          <View style={styles.formFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelForm}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !newTitle.trim() && styles.submitBtnDisabled]}
              onPress={handleSave}
              disabled={!newTitle.trim() || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={editingReminderId ? 'save-outline' : 'checkmark-circle-outline'}
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.submitBtnText}>
                    {editingReminderId ? 'Cập nhật' : 'Lưu nhắc nhở'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}


      {/* DANH SÁCH LỜI NHẮC */}
      <View style={styles.listContainer}>
        {isLoading && reminders.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#047857" />
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={24} color="#94A3B8" style={{ marginBottom: 4 }} />
            <Text style={styles.emptyTitle}>Chưa có nhắc nhở nào</Text>
            <Text style={styles.emptySub}>
              Nhấn "+ Thêm lời nhắc" để không quên việc mua sắm, trả tiền hay đi chợ nhé!
            </Text>
          </View>
        ) : (
          reminders.map((item) => {
            const isDone = item.isCompleted;

            return (
              <View
                key={item.id}
                style={[
                  styles.reminderItem,
                  isDone && styles.reminderItemDone,
                ]}
              >
                {/* 1. Ô TICK HOÀN THÀNH (✓) */}
                <TouchableOpacity
                  style={[styles.tickBox, isDone && styles.tickBoxChecked]}
                  onPress={() => handleToggle(item)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <View style={styles.tickBoxUncheckedDot} />
                  )}
                </TouchableOpacity>

                {/* 2. NỘI DUNG NHẮC NHỞ */}
                <TouchableOpacity
                  style={styles.itemContent}
                  onPress={() => handleToggle(item)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.itemTitle,
                      isDone && styles.itemTitleDone,
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>

                  <View style={styles.itemMetaRow}>
                    {/* Badge Giờ hẹn */}
                    <View style={[styles.metaBadge, isDone && styles.metaBadgeDone]}>
                      <Ionicons
                        name="time-outline"
                        size={11}
                        color={isDone ? '#94A3B8' : '#D97706'}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.metaBadgeText, isDone && styles.metaBadgeTextDone]}>
                        {item.time || '12:00'}
                      </Text>
                    </View>

                    {/* Badge Báo trước */}
                    <View style={[styles.metaBadge, { backgroundColor: '#F1F5F9' }]}>
                      <Ionicons
                        name="notifications-outline"
                        size={10}
                        color={isDone ? '#94A3B8' : '#475569'}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.metaBadgeText, { color: '#475569' }]}>
                        Báo trước {item.remindBeforeMinutes || 10}p
                      </Text>
                    </View>

                    {/* Trạng thái */}
                    {isDone && (
                      <Text style={styles.statusDoneText}>Đã hoàn thành</Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* 2.5 NÚT CHỈNH SỬA (✏️) */}
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => handleStartEdit(item)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                >
                  <Ionicons name="pencil" size={12} color="#047857" />
                </TouchableOpacity>

                {/* 3. NÚT XÓA BỎ (✕) */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
                >
                  <Ionicons name="close" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 7,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  toggleFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },

  // Banner thông báo sắp đến giờ
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  alertContent: {
    flex: 1,
  },
  alertBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  alertTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  alertSub: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 2,
    fontWeight: '500',
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 6,
  },
  alertCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  alertCheckText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 3,
  },
  alertDismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Form tạo nhắc nhở
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  formHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
  },
  // Bộ cuộn giờ và phút nhỏ gọn chuyên nghiệp dạng nấc ô vuông
  timePickerContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timePickerLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  timePreviewBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  timePreviewText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#047857',
  },
  compactWheelsCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  wheelColCompact: {
    alignItems: 'center',
  },
  stepArrowBtn: {
    width: 32,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelBoxCompact: {
    width: 52,
    height: 78,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  wheelScrollViewCompact: {
    height: 78,
  },
  wheelScrollContentCompact: {
    paddingTop: 26,
    paddingBottom: 26,
    alignItems: 'center',
  },
  notchSquare: {
    width: 44,
    height: 24,
    marginVertical: 1,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notchSquareSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1.5,
  },
  notchText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },
  notchTextSelected: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#047857',
  },
  unitSmallLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  colonDividerCompact: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 14,
  },
  colonTextCompact: {
    fontSize: 18,
    fontWeight: '800',
    color: '#047857',
  },
  formHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  editingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  editBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },

  beforeRow: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 5,
  },
  beforeOptions: {
    flexDirection: 'row',
    gap: 6,
    height: 36,
    alignItems: 'center',
  },
  beforeChip: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  beforeChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  beforeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  beforeChipTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Danh sách items
  listContainer: {
    gap: 8,
  },
  loadingBox: {
    padding: 16,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  emptySub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 280,
  },

  // Từng thẻ nhắc nhở
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  reminderItemDone: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.75,
  },
  tickBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tickBoxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tickBoxUncheckedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  itemContent: {
    flex: 1,
    marginRight: 6,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },
  itemTitleDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  metaBadgeDone: {
    backgroundColor: '#F1F5F9',
  },
  metaBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  metaBadgeTextDone: {
    color: '#94A3B8',
  },
  statusDoneText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
