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
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';
import { IReminder } from '@monett/shared';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getRemindersApi,
  createReminderApi,
  toggleReminderApi,
  deleteReminderApi,
  updateReminderApi,
  getStoredUserId,
} from '../services/api';

interface RemindersWidgetProps {
  currentDateStr?: string; // YYYY-MM-DD
  noMargin?: boolean;
  onNavigateToRemindersTab?: () => void;
}

import {
  sendBrowserNotification,
  requestBrowserNotificationPermission,
} from '../utils/browserNotification';

// Gợi ý nhanh các việc cần làm phổ biến với biểu tượng SVG chuẩn Fintech
export interface QuickReminderPreset {
  id: string;
  title: string;
  iconType: 'market' | 'bulb' | 'housing' | 'pill' | 'coffee';
  color: string;
}

export const QUICK_REMINDER_PRESETS: QuickReminderPreset[] = [
  { id: 'market', title: 'Đi chợ mua cá & rau tươi', iconType: 'market', color: '#059669' },
  { id: 'bulb', title: 'Đóng tiền điện & nước', iconType: 'bulb', color: '#D97706' },
  { id: 'housing', title: 'Nộp tiền phòng trọ', iconType: 'housing', color: '#2563EB' },
  { id: 'pill', title: 'Uống thuốc / vitamin', iconType: 'pill', color: '#EF4444' },
  { id: 'coffee', title: 'Cà phê với bạn bè', iconType: 'coffee', color: '#854D0E' },
];

const QuickReminderSvgIcon: React.FC<{ type: string; color: string; size?: number }> = ({ type, color, size = 14 }) => {
  switch (type) {
    case 'market':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="8" cy="21" r="1.5" fill={color} />
          <Circle cx="19" cy="21" r="1.5" fill={color} />
          <Path
            d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'bulb':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M9 18h6m-5 3h4M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'housing':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'pill':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="8.5" y1="8.5" x2="15.5" y2="15.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'coffee':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M17 8h1a4 4 0 0 1 0 8h-1"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="6" y1="2" x2="6" y2="5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="10" y1="2" x2="10" y2="5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="14" y1="2" x2="14" y2="5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      );
    default:
      return null;
  }
};

// Dữ liệu mẫu ban đầu: để trống để người dùng tự tạo dữ liệu thật
const INITIAL_SAMPLE_REMINDERS: IReminder[] = [];

// Quản lý danh sách ID đã được báo hôm nay để KHÔNG BAO GIỜ lặp lại (theo từng user)
import {
  getAlertedReminderIds,
  markReminderAsAlerted,
  unmarkReminderAsAlerted,
  isReminderAlerted,
} from '../utils/reminderAlerts';

export {
  getAlertedReminderIds,
  markReminderAsAlerted,
  unmarkReminderAsAlerted,
  isReminderAlerted,
};

export const RemindersWidget: React.FC<RemindersWidgetProps> = ({ currentDateStr, noMargin, onNavigateToRemindersTab }) => {
  const { user } = useAuth();
  const currentUserId = user?.id || (user as any)?._id || getStoredUserId();
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
  const storageKey = `monett_reminders_cache_${currentUserId}_${effectiveDate}`;

  const [reminders, setReminders] = useState<IReminder[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = window.localStorage.getItem(`monett_reminders_cache_${currentUserId}_${effectiveDate}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return INITIAL_SAMPLE_REMINDERS;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Form states - Mặc định đúng giờ thực tế hiện tại
  const [newTitle, setNewTitle] = useState<string>('');
  const [selectedHour, setSelectedHour] = useState<number>(() => new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState<number>(() => new Date().getMinutes());
  const [newBeforeMinutes, setNewBeforeMinutes] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  // Nhập giờ & phút trực tiếp (Không giật, không tự ý nhảy số lung tung)
  const hourInputRef = useRef<any>(null);
  const minuteInputRef = useRef<any>(null);
  const [hourInputText, setHourInputText] = useState<string>(() => String(new Date().getHours()).padStart(2, '0'));
  const [minuteInputText, setMinuteInputText] = useState<string>(() => String(new Date().getMinutes()).padStart(2, '0'));
  const [isHourFocused, setIsHourFocused] = useState<boolean>(false);
  const [isMinuteFocused, setIsMinuteFocused] = useState<boolean>(false);

  // Tăng / giảm giờ (▲ / ▼)
  const handleStepHour = (step: number) => {
    let nextH = (selectedHour + step) % 24;
    if (nextH < 0) nextH += 24;
    setSelectedHour(nextH);
    setHourInputText(String(nextH).padStart(2, '0'));
  };

  // Tăng / giảm phút (▲ / ▼)
  const handleStepMinute = (step: number) => {
    let nextM = (selectedMinute + step) % 60;
    if (nextM < 0) nextM += 60;
    setSelectedMinute(nextM);
    setMinuteInputText(String(nextM).padStart(2, '0'));
  };

  const handleHourInputChange = (txt: string) => {
    const digits = txt.replace(/\D/g, '');
    const clean = digits.length > 2 ? digits.slice(-2) : digits;
    setHourInputText(clean);
    if (clean.length > 0) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) {
        setSelectedHour(Math.min(23, Math.max(0, num)));
      }
    }
  };

  const handleHourInputBlur = () => {
    setIsHourFocused(false);
    if (!hourInputText.trim()) {
      const curH = new Date().getHours();
      setSelectedHour(curH);
      setHourInputText(String(curH).padStart(2, '0'));
      return;
    }
    const num = parseInt(hourInputText, 10);
    const validH = isNaN(num) ? new Date().getHours() : Math.min(23, Math.max(0, num));
    setSelectedHour(validH);
    setHourInputText(String(validH).padStart(2, '0'));
  };

  const handleMinuteInputChange = (txt: string) => {
    const digits = txt.replace(/\D/g, '');
    const clean = digits.length > 2 ? digits.slice(-2) : digits;
    setMinuteInputText(clean);
    if (clean.length > 0) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) {
        setSelectedMinute(Math.min(59, Math.max(0, num)));
      }
    }
  };

  const handleMinuteInputBlur = () => {
    setIsMinuteFocused(false);
    if (!minuteInputText.trim()) {
      const curM = new Date().getMinutes();
      setSelectedMinute(curM);
      setMinuteInputText(String(curM).padStart(2, '0'));
      return;
    }
    const num = parseInt(minuteInputText, 10);
    const validM = isNaN(num) ? new Date().getMinutes() : Math.min(59, Math.max(0, num));
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

  // Thủ công đưa lời nhắc lên chuông thông báo (Bell Notification)
  const handlePushToBell = (item: IReminder) => {
    const leadMins = item.remindBeforeMinutes !== undefined ? item.remindBeforeMinutes : 10;
    const leadText = leadMins === 0 ? 'Đúng giờ' : `Báo trước ${leadMins} phút`;
    addNotification({
      id: `reminder-manual-${item.id}-${Date.now()}`,
      type: 'reminder',
      title: `Nhắc nhở: ${item.title} ⏰`,
      message: `Đã đến giờ nhắc nhở (${item.time || '17:30'} - ${leadText}). Đừng quên công việc của bạn nhé!`,
      createdAt: new Date().toISOString(),
      read: false,
      iconBg: '#EDE9FE',
      iconColor: '#7C3AED',
      metadata: {
        targetTab: 'home',
      },
    });
    setPushedReminderId(item.id);
    setTimeout(() => {
      setPushedReminderId(null);
    }, 2500);
  };

  // Mở form tạo mới nhắc nhở (Lấy đúng giờ thực tế hiện tại)
  const handleOpenCreateForm = () => {
    setEditingReminderId(null);
    setNewTitle('');
    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();
    setSelectedHour(curH);
    setSelectedMinute(curM);
    setHourInputText(String(curH).padStart(2, '0'));
    setMinuteInputText(String(curM).padStart(2, '0'));
    setNewBeforeMinutes(5);
    setIsFormOpen(true);
  };

  // Mở chế độ chỉnh sửa lời nhắc
  const handleStartEdit = (item: IReminder) => {
    setEditingReminderId(item.id);
    setNewTitle(item.title);
    const [hhStr, mmStr] = (item.time || '12:00').split(':');
    const h = parseInt(hhStr, 10);
    const m = parseInt(mmStr, 10);
    const validH = isNaN(h) ? 12 : Math.min(23, Math.max(0, h));
    const validM = isNaN(m) ? 0 : Math.min(59, Math.max(0, m));
    setSelectedHour(validH);
    setSelectedMinute(validM);
    setHourInputText(String(validH).padStart(2, '0'));
    setMinuteInputText(String(validM).padStart(2, '0'));
    setNewBeforeMinutes(item.remindBeforeMinutes !== undefined ? item.remindBeforeMinutes : 5);
    setIsFormOpen(true);
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingReminderId(null);
    setNewTitle('');
  };

  // 1. Tải danh sách nhắc nhở từ Backend
  const fetchReminders = async () => {
    // Tải trước từ LocalStorage của user hiện tại
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = window.localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setReminders(parsed);
          }
        } else {
          setReminders([]);
        }
      }
    } catch {}

    try {
      setIsLoading(true);
      const data = await getRemindersApi(effectiveDate);
      if (Array.isArray(data)) {
        const cleanData = data.filter((it) => it.id !== 'sample-1' && !it.title?.includes?.('mua cá & rau tươi'));
        setReminders(cleanData);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(storageKey, JSON.stringify(cleanData));
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách nhắc nhở từ server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    alertedIdsRef.current.clear();
    fetchReminders();
  }, [effectiveDate, currentUserId]);

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
      const persistedAlerted = getAlertedReminderIds(nowYMD, currentUserId);

      reminders.forEach((item) => {
        if (item.isCompleted || item.isDismissed) return;

        // Chỉ kiểm tra lời nhắc của ngày hôm nay
        const reminderDate = item.date || todayYMD;
        if (reminderDate !== nowYMD) return;

        // Nếu lời nhắc này đã từng được thông báo hôm nay (trong RAM hoặc localStorage), TUYỆT ĐỐI không báo lại
        if (alertedIdsRef.current.has(item.id) || persistedAlerted.has(item.id)) {
          alertedIdsRef.current.add(item.id);
          return;
        }

        const [hhStr, mmStr] = (item.time || '12:00').split(':');
        const targetHours = parseInt(hhStr, 10);
        const targetMinutes = parseInt(mmStr, 10);
        if (isNaN(targetHours) || isNaN(targetMinutes)) return;

        const targetDate = new Date();
        targetDate.setHours(targetHours, targetMinutes, 0, 0);

        // Thời điểm kích hoạt thông báo = Giờ hẹn - Số phút nhắc trước
        const alertLeadMinutes = item.remindBeforeMinutes !== undefined ? item.remindBeforeMinutes : 10;
        const triggerTime = targetDate.getTime() - alertLeadMinutes * 60 * 1000;
        // Chỉ kích hoạt trong vòng 10 phút kể từ mốc báo trước (tránh báo lại việc cũ quá hạn)
        const expireTime = triggerTime + 10 * 60 * 1000;

        const currentTimeMs = now.getTime();

        // Nếu hiện tại đã đến hoặc vừa qua mốc kích hoạt (trong vòng 10 phút)
        if (currentTimeMs >= triggerTime && currentTimeMs <= expireTime) {
          // Lưu vĩnh viễn vào cả RAM và localStorage để không bao giờ báo lại lần 2
          alertedIdsRef.current.add(item.id);
          markReminderAsAlerted(item.id, nowYMD, currentUserId);

          // Kích hoạt In-App Banner
          setActiveAlert({
            id: item.id,
            title: item.title,
            time: item.time,
            beforeMinutes: alertLeadMinutes,
          });

          // Đưa thông báo vào chuông thông báo (Bell Notification)
          // Lưu ý: addNotification đã tự động kích hoạt sendBrowserNotification nên không gọi trùng lặp
          const leadText = alertLeadMinutes === 0 ? 'Đúng giờ' : `Báo trước ${alertLeadMinutes} phút`;
          addNotification({
            id: `reminder-alarm-${item.id}-${Date.now()}`,
            type: 'reminder',
            title: `Nhắc nhở: ${item.title} ⏰`,
            message: `Đã đến giờ nhắc nhở (${item.time} - ${leadText}). Đừng quên công việc của bạn nhé!`,
            createdAt: new Date().toISOString(),
            read: false,
            iconBg: '#EDE9FE',
            iconColor: '#7C3AED',
            metadata: {
              targetTab: 'home',
            },
          });
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
    setReminders((prev) => {
      const next = prev.map((r) => (r.id === item.id ? { ...r, isCompleted: updatedStatus } : r));
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });

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
    setReminders((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
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
      // Khi người dùng chỉnh sửa giờ mới, reset trạng thái đã báo để giờ mới có thể kích hoạt
      unmarkReminderAsAlerted(targetId, effectiveDate);
      alertedIdsRef.current.delete(targetId);

      setReminders((prev) => {
        const next = prev.map((r) =>
          r.id === targetId
            ? { ...r, title: trimmed, time: formattedTime, remindBeforeMinutes: newBeforeMinutes }
            : r,
        );
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
        return next;
      });
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

    setReminders((prev) => {
      const next = [newReminderItem, ...prev];
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
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
        setReminders((prev) => {
          const next = prev.map((r) => (r.id === optimisticId ? serverItem : r));
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(storageKey, JSON.stringify(next));
          }
          return next;
        });
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
        {/* 1. Header Bar Màu Xanh Dương Pastel Khớp Phong Cách 3 Mục Ở Dưới */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={onNavigateToRemindersTab || handleOpenCreateForm}
            activeOpacity={0.75}
          >
            {/* White rounded square icon badge with notifications icon */}
            <View style={styles.iconBadge}>
              <Ionicons name="notifications-outline" size={17} color="#0369A1" />
            </View>

            {/* Title */}
            <Text style={styles.headerTitle}>
              {isVi ? 'Nhắc nhở' : 'Reminders'}
            </Text>

            {/* White count badge */}
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{reminders.length}</Text>
            </View>
          </TouchableOpacity>

          {/* Nút Xem tất cả dạng pill trắng */}
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={onNavigateToRemindersTab || handleOpenCreateForm}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.viewAllText}>
              {isVi ? 'Xem tất cả →' : 'View all →'}
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
              style={styles.emptyContainer}
              onPress={handleOpenCreateForm}
              activeOpacity={0.75}
            >
              <Ionicons name="notifications-outline" size={22} color="#94A3B8" />
              <Text style={styles.emptyText}>
                {isVi ? 'Chưa có lời nhắc nào' : 'No reminders available'}
              </Text>
            </TouchableOpacity>
          ) : (
            reminders.slice(0, 3).map((item, idx) => {
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
                          {item.remindBeforeMinutes === 0
                            ? (isVi ? 'Đúng giờ' : 'On time')
                            : `${isVi ? 'Báo trước' : 'Before'} ${item.remindBeforeMinutes !== undefined ? item.remindBeforeMinutes : 10}p`}
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

              {/* Các gợi ý nhanh nội dung nhắc việc với SVG icons chuẩn Fintech */}
              <View style={styles.quickTitlesWrap}>
                {QUICK_REMINDER_PRESETS.map((item) => {
                  const isActive = newTitle === item.title;
                  const iconColor = isActive ? '#047857' : item.color;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.quickTitleChip,
                        isActive && styles.quickTitleChipActive,
                      ]}
                      onPress={() => setNewTitle(item.title)}
                      activeOpacity={0.7}
                    >
                      <QuickReminderSvgIcon type={item.iconType} color={iconColor} size={14} />
                      <Text
                        style={[
                          styles.quickTitleText,
                          isActive && styles.quickTitleTextActive,
                        ]}
                      >
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 2. Giờ hẹn thông báo (Tối giản: hiển thị đúng giờ thực tế & nhập số mượt mà) */}
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

                {/* Hai ô nhập số trực tiếp kèm nút tăng giảm: Giờ : Phút */}
                <View style={styles.minimalTimeInputRow}>
                  {/* Cụm nhập Giờ */}
                  <View style={styles.minimalInputBoxWrap}>
                    <TouchableOpacity
                      style={styles.stepperArrowBtn}
                      onPress={() => handleStepHour(1)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="chevron-up" size={16} color="#047857" />
                    </TouchableOpacity>

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

                    <TouchableOpacity
                      style={styles.stepperArrowBtn}
                      onPress={() => handleStepHour(-1)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="chevron-down" size={16} color="#047857" />
                    </TouchableOpacity>
                    <Text style={styles.minimalInputSubLabel}>{isVi ? 'Giờ (0 - 23)' : 'Hour'}</Text>
                  </View>

                  {/* Dấu hai chấm phân cách */}
                  <Text style={styles.minimalColonText}>:</Text>

                  {/* Cụm nhập Phút */}
                  <View style={styles.minimalInputBoxWrap}>
                    <TouchableOpacity
                      style={styles.stepperArrowBtn}
                      onPress={() => handleStepMinute(1)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="chevron-up" size={16} color="#047857" />
                    </TouchableOpacity>

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

                    <TouchableOpacity
                      style={styles.stepperArrowBtn}
                      onPress={() => handleStepMinute(-1)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="chevron-down" size={16} color="#047857" />
                    </TouchableOpacity>
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
            </ScrollView>

            {/* Nút thao tác dưới Modal (Cố định ở đáy thẻ, luôn nhìn thấy nút Lưu) */}
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
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    width: '100%',
  },
  headerBar: {
    backgroundColor: '#E0F2FE', // Màu xanh dương pastel đồng bộ phong cách
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
  },
  viewAllBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
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

  // Modal Popup Đặt / Sửa nhắc nhở (Gọn gàng, cố định, không phải cuộn lướt)
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
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '92%',
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
    marginBottom: 12,
    paddingBottom: 10,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 6,
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
    height: 40,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0,
  },
  quickTitlesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  quickTitleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickTitleChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  quickTitleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickTitleTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  minimalTimeContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  minimalTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeHeaderIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalTimeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  minimalTimeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  minimalTimeBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#047857',
  },
  minimalTimeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  minimalInputBoxWrap: {
    alignItems: 'center',
  },
  minimalNumberInput: {
    width: 76,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    paddingVertical: 0,
    outlineWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
    fontSize: 24,
    fontWeight: '900',
    color: '#059669',
    marginTop: 0,
  },
  minimalInputSubLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  stepperArrowBtn: {
    width: 32,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 1,
  },
  beforeRow: {
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  beforeOptions: {
    flexDirection: 'row',
    gap: 5,
    height: 32,
    alignItems: 'center',
  },
  beforeChip: {
    flex: 1,
    height: 32,
    borderRadius: 8,
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
    fontSize: 11,
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
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 40,
    flexDirection: 'row',
    borderRadius: 12,
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

