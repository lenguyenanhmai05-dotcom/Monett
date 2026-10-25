import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IReminder } from '@monett/shared';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  getRemindersApi,
  createReminderApi,
  toggleReminderApi,
  deleteReminderApi,
  updateReminderApi,
} from '../services/api';

interface RemindersWidgetProps {
  currentDateStr?: string; // YYYY-MM-DD
  noMargin?: boolean;
}

import {
  sendBrowserNotification,
  requestBrowserNotificationPermission,
} from '../utils/browserNotification';

// Gợi ý nhanh các việc cần làm phổ biến
const QUICK_REMINDER_TITLES = [
  '🛒 Đi chợ mua cá & rau tươi',
  '💡 Đóng tiền điện & nước',
  '🏠 Nộp tiền phòng trọ',
  '💊 Uống thuốc / vitamin',
  '☕ Cà phê với bạn bè',
];

// Dữ liệu mẫu ban đầu: để trống để người dùng tự tạo dữ liệu thật
const INITIAL_SAMPLE_REMINDERS: IReminder[] = [];

export const RemindersWidget: React.FC<RemindersWidgetProps> = ({ currentDateStr, noMargin }) => {
  const { language } = useLanguage();
  const { addNotification } = useNotifications();
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

  const nowInit = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return { h: d.getHours(), m: d.getMinutes() };
  }, []);

  // Form states
  const [newTitle, setNewTitle] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<number>(nowInit.h);
  const [selectedMinute, setSelectedMinute] = useState<number>(nowInit.m);
  const [newBeforeMinutes, setNewBeforeMinutes] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  // Nhập giờ & phút trực tiếp (Tối giản & Siêu nhanh)
  const hourInputRef = useRef<TextInput>(null);
  const minuteInputRef = useRef<TextInput>(null);
  const [hourInputText, setHourInputText] = useState<string>(String(nowInit.h).padStart(2, '0'));
  const [minuteInputText, setMinuteInputText] = useState<string>(String(nowInit.m).padStart(2, '0'));
  const [isHourFocused, setIsHourFocused] = useState<boolean>(false);
  const [isMinuteFocused, setIsMinuteFocused] = useState<boolean>(false);

  useEffect(() => {
    setHourInputText(String(selectedHour).padStart(2, '0'));
    setMinuteInputText(String(selectedMinute).padStart(2, '0'));
  }, [selectedHour, selectedMinute, isFormOpen]);

  const handleHourInputChange = (txt: string) => {
    const clean = txt.replace(/\D/g, '').slice(0, 2);
    setHourInputText(clean);
    if (clean.length > 0) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) {
        const validH = Math.min(23, Math.max(0, num));
        setSelectedHour(validH);
        if (clean.length === 2 || num > 2) {
          minuteInputRef.current?.focus();
        }
      }
    }
  };

  const handleHourInputBlur = () => {
    setIsHourFocused(false);
    const num = parseInt(hourInputText, 10);
    const validH = isNaN(num) ? 0 : Math.min(23, Math.max(0, num));
    setSelectedHour(validH);
    setHourInputText(String(validH).padStart(2, '0'));
  };

  const handleMinuteInputChange = (txt: string) => {
    const clean = txt.replace(/\D/g, '').slice(0, 2);
    setMinuteInputText(clean);
    if (clean.length > 0) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) {
        const validM = Math.min(59, Math.max(0, num));
        setSelectedMinute(validM);
      }
    }
  };

  const handleMinuteInputBlur = () => {
    setIsMinuteFocused(false);
    const num = parseInt(minuteInputText, 10);
    const validM = isNaN(num) ? 0 : Math.min(59, Math.max(0, num));
    setSelectedMinute(validM);
    setMinuteInputText(String(validM).padStart(2, '0'));
  };

  const formattedTime = useMemo(() => {
    return `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
  }, [selectedHour, selectedMinute]);

  // In-app alert banner
  const [activeAlert, setActiveAlert] = useState<{
    id: string;
    title: string;
    time: string;
    beforeMinutes: number;
  } | null>(null);

  // Lưu danh sách id đã thông báo để không lặp lại liên tục
  const alertedIdsRef = useRef<Set<string>>(new Set());
  const [pushedReminderId, setPushedReminderId] = useState<string | null>(null);

  // Thủ công đưa lời nhắc lên chuông thông báo (Bell Notification) và gửi Web Browser Notification
  const handlePushToBell = (item: IReminder) => {
    addNotification({
      id: `reminder-manual-${item.id}-${Date.now()}`,
      type: 'reminder',
      title: `Nhắc nhở: ${item.title} ⏰`,
      message: `Đã đến giờ nhắc nhở (${item.time || '17:30'} - Báo trước ${item.remindBeforeMinutes || 10} phút). Đừng quên công việc của bạn nhé!`,
      createdAt: new Date().toISOString(),
      read: false,
      iconBg: '#EDE9FE',
      iconColor: '#7C3AED',
      metadata: {
        targetTab: 'home',
      },
    });
    // Gửi trực tiếp popup ra ngoài màn hình máy tính
    sendBrowserNotification(`🔔 Nhắc nhở: ${item.title}`, {
      body: `Đã đến giờ nhắc nhở (${item.time || '17:30'} - Báo trước ${item.remindBeforeMinutes || 10} phút). Đừng quên việc này nhé!`,
      playSound: false,
    });
    setPushedReminderId(item.id);
    setTimeout(() => {
      setPushedReminderId(null);
    }, 2500);
  };

  // Mở form tạo mới nhắc nhở
  const handleOpenCreateForm = () => {
    setEditingReminderId(null);
    setNewTitle('');
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    setSelectedHour(d.getHours());
    setSelectedMinute(d.getMinutes());
    setNewBeforeMinutes(10);
    setIsFormOpen(true);
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
        const cleanData = data.filter((it) => it.id !== 'sample-1' && !it.title?.includes?.('mua cá & rau tươi'));
        setReminders(cleanData);
      } else {
        setReminders([]);
      }
    } catch {
      setReminders([]);
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

            // Đưa thông báo vào chuông thông báo (Bell Notification)
            addNotification({
              id: `reminder-alarm-${item.id}-${Date.now()}`,
              type: 'reminder',
              title: `Nhắc nhở: ${item.title} ⏰`,
              message: `Đã đến giờ nhắc nhở (${item.time} - Báo trước ${alertLeadMinutes} phút). Đừng quên công việc của bạn nhé!`,
              createdAt: new Date().toISOString(),
              read: false,
              iconBg: '#EDE9FE',
              iconColor: '#7C3AED',
              metadata: {
                targetTab: 'home',
              },
            });

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

    // Xin quyền thông báo ngay nếu người dùng chưa cấp quyền
    requestBrowserNotificationPermission();

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
    <View style={[styles.container, noMargin && { marginHorizontal: 0, marginBottom: 0, marginTop: 0 }]}>
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

      {/* KHUNG THẺ NHẮC NHỞ HIỆN ĐẠI, CAO CẤP */}
      <View style={[styles.cardContainer, noMargin && { minHeight: 220, flex: 1 }]}>
        {/* 1. Header Bar Màu Xanh Dương Pastel Sang Trọng */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            {/* White rounded square icon badge with notifications icon */}
            <View style={styles.iconBadge}>
              <Ionicons name="notifications" size={18} color="#0284C7" />
            </View>

            {/* Title */}
            <Text style={styles.headerTitle}>
              {isVi ? 'Nhắc nhở' : 'Reminders'}
            </Text>

            {/* White count badge */}
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {pendingCount} {isVi ? 'việc' : 'tasks'}
              </Text>
            </View>
          </View>

          {/* Nút Thêm lời nhắc dạng pill trắng cao cấp */}
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={handleOpenCreateForm}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={15} color="#0284C7" style={{ marginRight: 2 }} />
            <Text style={styles.viewAllText}>
              {isVi ? 'Thêm lời nhắc' : 'Add reminder'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerDivider} />

        {/* 2. Nội dung lời nhắc bên dưới trong cùng 1 khuôn trắng */}
        <View style={styles.bodyContent}>
          {isLoading && reminders.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#0284C7" />
            </View>
          ) : reminders.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={handleOpenCreateForm}
              activeOpacity={0.8}
            >
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-outline" size={26} color="#0284C7" />
              </View>
              <Text style={styles.emptyTitle}>
                {isVi ? 'Chưa có lời nhắc nào hôm nay' : 'No reminders for today'}
              </Text>
              <Text style={styles.emptySub}>
                {isVi
                  ? 'Bấm "+ Thêm lời nhắc" để không quên việc mua sắm, trả tiền phòng hay đi chợ nhé!'
                  : 'Tap "+ Add reminder" to schedule alerts for shopping, rent, or chores!'}
              </Text>
            </TouchableOpacity>
          ) : (
            reminders.map((item, idx) => {
              const isDone = item.isCompleted;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.reminderRow,
                    idx < reminders.length - 1 && styles.reminderRowBorder,
                    isDone && styles.reminderRowDone,
                  ]}
                >
                  {/* Ô TICK HOÀN THÀNH (✓) */}
                  <TouchableOpacity
                    style={[styles.tickBox, isDone && styles.tickBoxChecked]}
                    onPress={() => handleToggle(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                    ) : (
                      <View style={styles.tickBoxUncheckedDot} />
                    )}
                  </TouchableOpacity>

                  {/* NỘI DUNG NHẮC NHỞ */}
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
                      <View style={[styles.metaBadgeTime, isDone && styles.metaBadgeDone]}>
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color={isDone ? '#94A3B8' : '#D97706'}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.metaBadgeTimeText, isDone && styles.metaBadgeTextDone]}>
                          {item.time || '12:00'}
                        </Text>
                      </View>

                      {/* Badge Báo trước */}
                      <View style={[styles.metaBadgeLead, isDone && styles.metaBadgeDone]}>
                        <Ionicons
                          name="notifications-outline"
                          size={13}
                          color={isDone ? '#94A3B8' : '#7C3AED'}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.metaBadgeLeadText, isDone && styles.metaBadgeTextDone]}>
                          Báo trước {item.remindBeforeMinutes || 10}p
                        </Text>
                      </View>

                      {/* Trạng thái */}
                      {isDone && (
                        <Text style={styles.statusDoneText}>Đã hoàn thành</Text>
                      )}
                      {pushedReminderId === item.id && (
                        <Text style={styles.statusPushedText}>Đã rung chuông 🔔</Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* NÚT THAO TÁC BÊN PHẢI */}
                  <View style={styles.actionGroup}>
                    {/* NÚT CÀI THÔNG BÁO VÀO CHUÔNG / TEST (🔔) */}
                    <TouchableOpacity
                      style={[
                        styles.bellActionBtn,
                        pushedReminderId === item.id && styles.bellActionBtnActive,
                      ]}
                      onPress={() => handlePushToBell(item)}
                      activeOpacity={0.65}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      accessibilityLabel={isVi ? 'Gửi thông báo ra màn hình' : 'Trigger alert'}
                    >
                      <Ionicons
                        name={pushedReminderId === item.id ? 'notifications' : 'notifications-outline'}
                        size={15}
                        color={pushedReminderId === item.id ? '#FFFFFF' : '#7C3AED'}
                      />
                    </TouchableOpacity>

                    {/* NÚT CHỈNH SỬA (✏️) */}
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleStartEdit(item)}
                      activeOpacity={0.65}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Ionicons name="pencil" size={14} color="#0284C7" />
                    </TouchableOpacity>

                    {/* NÚT XÓA BỎ (✕) */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item.id)}
                      activeOpacity={0.65}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                    >
                      <Ionicons name="close" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>


      {/* MODAL TẠO / SỬA NHẮC NHỞ */}
      <Modal
        visible={isFormOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCancelForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          {/* Nền mờ bấm ngoài để đóng */}
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={handleCancelForm}
          />

          {/* Khung nội dung Modal giữa màn hình - Kích thước rộng rãi, chuyên nghiệp */}
          <View style={styles.modalContentCard}>
            {/* Header Modal */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={styles.modalHeaderIconBadge}>
                  <Ionicons
                    name={editingReminderId ? 'pencil' : 'notifications'}
                    size={20}
                    color="#047857"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitleText}>
                    {editingReminderId
                      ? (isVi ? 'Chỉnh sửa lời nhắc' : 'Edit Reminder')
                      : (isVi ? 'Đặt lịch nhắc nhở hôm nay' : 'Set a reminder today')}
                  </Text>
                  <Text style={styles.modalSubtitleText}>
                    {isVi
                      ? 'Monett sẽ gửi chuông & thông báo trình duyệt trước giờ hẹn'
                      : 'Monett will alert you with desktop popups before due time'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCancelForm}
                style={styles.modalCloseCircle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={19} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Thân Form */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {/* 1. Ô nhập nội dung */}
              <Text style={styles.modalFieldLabel}>
                {isVi ? 'Nội dung nhắc việc' : 'Reminder Title'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={[styles.inputWrap, isInputFocused && styles.inputWrapFocused]}>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={isInputFocused ? '#047857' : '#64748B'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={
                    isVi
                      ? 'Ví dụ: Xíu nữa đi chợ mua cá, nộp tiền phòng...'
                      : 'e.g. Buy groceries, pay electricity bill...'
                  }
                  placeholderTextColor="#94A3B8"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  autoFocus={true}
                  returnKeyType="done"
                />
                {newTitle.length > 0 && (
                  <TouchableOpacity onPress={() => setNewTitle('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="close-circle" size={17} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Các gợi ý nhanh nội dung nhắc việc */}
              <View style={styles.quickTitlesWrap}>
                {QUICK_REMINDER_TITLES.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.quickTitleChip,
                      newTitle === preset && styles.quickTitleChipActive,
                    ]}
                    onPress={() => setNewTitle(preset)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickTitleText,
                        newTitle === preset && styles.quickTitleTextActive,
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 2. Giờ hẹn thông báo (Tối giản: bấm vào số để nhập nhanh) */}
              <View style={styles.minimalTimeContainer}>
                <View style={styles.minimalTimeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <View style={styles.timeHeaderIconCircle}>
                      <Ionicons name="time" size={15} color="#059669" />
                    </View>
                    <Text style={styles.minimalTimeTitle}>
                      {isVi ? 'Giờ hẹn thông báo' : 'Scheduled Time'}
                    </Text>
                  </View>
                  <View style={styles.minimalTimeBadge}>
                    <Text style={styles.minimalTimeBadgeText}>{formattedTime}</Text>
                  </View>
                </View>

                {/* Hai ô nhập số trực tiếp: Giờ : Phút */}
                <View style={styles.minimalTimeInputRow}>
                  {/* Ô nhập Giờ */}
                  <View style={styles.minimalInputBoxWrap}>
                    <TextInput
                      ref={hourInputRef}
                      style={[
                        styles.minimalNumberInput,
                        isHourFocused && styles.minimalNumberInputFocused,
                      ]}
                      value={hourInputText}
                      onChangeText={handleHourInputChange}
                      onBlur={handleHourInputBlur}
                      onFocus={() => setIsHourFocused(true)}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus={true}
                      placeholder="12"
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.minimalInputSubLabel}>{isVi ? 'Giờ (0 - 23)' : 'Hour'}</Text>
                  </View>

                  {/* Dấu hai chấm phân cách */}
                  <Text style={styles.minimalColonText}>:</Text>

                  {/* Ô nhập Phút */}
                  <View style={styles.minimalInputBoxWrap}>
                    <TextInput
                      ref={minuteInputRef}
                      style={[
                        styles.minimalNumberInput,
                        isMinuteFocused && styles.minimalNumberInputFocused,
                      ]}
                      value={minuteInputText}
                      onChangeText={handleMinuteInputChange}
                      onBlur={handleMinuteInputBlur}
                      onFocus={() => setIsMinuteFocused(true)}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus={true}
                      placeholder="00"
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.minimalInputSubLabel}>{isVi ? 'Phút (0 - 59)' : 'Minute'}</Text>
                  </View>
                </View>
              </View>

              {/* 3. Chọn số phút báo trước */}
              <View style={styles.beforeRow}>
                <Text style={styles.formLabel}>
                  {isVi ? 'Báo trước bạn:' : 'Notify before:'}
                </Text>
                <View style={styles.beforeOptions}>
                  {[0, 5, 10, 15, 30].map((mins) => {
                    const isSelected = newBeforeMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        onPress={() => setNewBeforeMinutes(mins)}
                        style={[styles.beforeChip, isSelected && styles.beforeChipActive]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.beforeChipText, isSelected && styles.beforeChipTextActive]}>
                          {mins === 0 ? (isVi ? 'Đúng giờ' : 'On time') : `${mins} ${isVi ? 'phút' : 'min'}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Nút thao tác dưới Modal */}
              <View style={styles.modalFormFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={handleCancelForm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelBtnText}>{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, !newTitle.trim() && styles.modalSubmitBtnDisabled]}
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
                        size={17}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.modalSubmitBtnText}>
                        {editingReminderId
                          ? (isVi ? 'Cập nhật' : 'Update')
                          : (isVi ? 'Lưu nhắc nhở' : 'Save Reminder')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    width: '100%',
  },
  headerBar: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  countBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  reminderRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 4,
  },
  reminderRowDone: {
    opacity: 0.72,
    backgroundColor: '#F8FAFC',
  },
  tickBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tickBoxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  tickBoxUncheckedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  itemContent: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  itemTitleDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  metaBadgeTime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  metaBadgeTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  metaBadgeLead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  metaBadgeLeadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  metaBadgeDone: {
    backgroundColor: '#F1F5F9',
  },
  metaBadgeTextDone: {
    color: '#94A3B8',
  },
  statusDoneText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginLeft: 4,
  },
  statusPushedText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '700',
    marginLeft: 4,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
  },
  bellActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellActionBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#6D28D9',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
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

  // Modal Popup Đặt / Sửa nhắc nhở (Rộng rãi, thoáng và cực kỳ chuyên nghiệp)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdropTap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 12,
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  modalHeaderIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitleText: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitleText: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
  },
  inputWrapFocused: {
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
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14.5,
    color: '#1E293B',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0,
  },
  quickTitlesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  quickTitleChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickTitleChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  quickTitleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  quickTitleTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  minimalTimeContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  minimalTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeHeaderIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalTimeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  minimalTimeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  minimalTimeBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
  },
  minimalTimeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  minimalInputBoxWrap: {
    alignItems: 'center',
  },
  minimalNumberInput: {
    width: 94,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    paddingVertical: 0,
    outlineWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  minimalNumberInputFocused: {
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 0 3px rgba(5, 150, 105, 0.18)',
    } : {}),
  },
  minimalColonText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#059669',
    marginTop: -22,
  },
  minimalInputSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  beforeRow: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  beforeOptions: {
    flexDirection: 'row',
    gap: 6,
    height: 38,
    alignItems: 'center',
  },
  beforeChip: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  beforeChipActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  beforeChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  beforeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFormFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 46,
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  modalSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
});

