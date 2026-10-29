import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IReminder } from '@monett/shared';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getRemindersApi,
  createReminderApi,
  toggleReminderApi,
  deleteReminderApi,
  updateReminderApi,
} from '../../services/api';
import {
  PersonalNote,
  NOTE_COLORS,
  loadNotesFromStorage,
  saveNotesToStorage,
} from '../../services/notesStorage';
import { unmarkReminderAsAlerted } from '../../components/RemindersWidget';

interface RemindersScreenProps {
  onNavigateToTab?: (tab: any) => void;
  onBack?: () => void;
}

export const RemindersScreen: React.FC<RemindersScreenProps> = ({ onNavigateToTab, onBack }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const isVi = language === 'vi';

  const userId = user?.id || (user as any)?._id;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigateToTab) {
      onNavigateToTab('home');
    }
  };

  // Subtab: 'reminders' | 'notes'
  const [activeSubTab, setActiveSubTab] = useState<'reminders' | 'notes'>('reminders');

  // ==========================================
  // SECTION 1: LỜI NHẮC (REMINDERS)
  // ==========================================
  const [reminders, setReminders] = useState<IReminder[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState<boolean>(true);
  const [reminderFilter, setReminderFilter] = useState<'all' | 'today' | 'pending' | 'completed'>('all');
  const [reminderSearch, setReminderSearch] = useState<string>('');
  const [pushedReminderId, setPushedReminderId] = useState<string | null>(null);

  // Modal Thêm / Sửa Nhắc nhở - Mặc định đúng thời gian thực tế hiện tại
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<IReminder | null>(null);
  const [reminderFormTitle, setReminderFormTitle] = useState('');
  const [reminderFormDate, setReminderFormDate] = useState('');
  const [reminderFormHour, setReminderFormHour] = useState<number>(() => new Date().getHours());
  const [reminderFormMinute, setReminderFormMinute] = useState<number>(() => new Date().getMinutes());
  const [reminderHourText, setReminderHourText] = useState<string>(() => String(new Date().getHours()).padStart(2, '0'));
  const [reminderMinuteText, setReminderMinuteText] = useState<string>(() => String(new Date().getMinutes()).padStart(2, '0'));
  const [reminderFormBefore, setReminderFormBefore] = useState(5);
  const [reminderFormNote, setReminderFormNote] = useState('');
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

  // Tăng / giảm giờ (▲ / ▼)
  const handleStepHour = (step: number) => {
    let nextH = (reminderFormHour + step) % 24;
    if (nextH < 0) nextH += 24;
    setReminderFormHour(nextH);
    setReminderHourText(String(nextH).padStart(2, '0'));
  };

  // Tăng / giảm phút (▲ / ▼)
  const handleStepMinute = (step: number) => {
    let nextM = (reminderFormMinute + step) % 60;
    if (nextM < 0) nextM += 60;
    setReminderFormMinute(nextM);
    setReminderMinuteText(String(nextM).padStart(2, '0'));
  };

  const handleHourInputChange = (txt: string) => {
    const digits = txt.replace(/\D/g, '');
    const clean = digits.length > 2 ? digits.slice(-2) : digits;
    setReminderHourText(clean);
    if (clean.length > 0) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) {
        setReminderFormHour(Math.min(23, Math.max(0, num)));
      }
    }
  };

  const handleHourInputBlur = () => {
    if (!reminderHourText.trim()) {
      const curH = new Date().getHours();
      setReminderFormHour(curH);
      setReminderHourText(String(curH).padStart(2, '0'));
      return;
    }
    const num = parseInt(reminderHourText, 10);
    const validH = isNaN(num) ? new Date().getHours() : Math.min(23, Math.max(0, num));
    setReminderFormHour(validH);
    setReminderHourText(String(validH).padStart(2, '0'));
  };

  const handleMinuteInputChange = (txt: string) => {
    const digits = txt.replace(/\D/g, '');
    const clean = digits.length > 2 ? digits.slice(-2) : digits;
    setReminderMinuteText(clean);
    if (clean.length > 0) {
      const num = parseInt(clean, 10);
      if (!isNaN(num)) {
        setReminderFormMinute(Math.min(59, Math.max(0, num)));
      }
    }
  };

  const handleMinuteInputBlur = () => {
    if (!reminderMinuteText.trim()) {
      const curM = new Date().getMinutes();
      setReminderFormMinute(curM);
      setReminderMinuteText(String(curM).padStart(2, '0'));
      return;
    }
    const num = parseInt(reminderMinuteText, 10);
    const validM = isNaN(num) ? new Date().getMinutes() : Math.min(59, Math.max(0, num));
    setReminderFormMinute(validM);
    setReminderMinuteText(String(validM).padStart(2, '0'));
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const loadAllReminders = async () => {
    try {
      setIsLoadingReminders(true);
      // Fetch all reminders (omitting date query)
      const data = await getRemindersApi();
      if (Array.isArray(data)) {
        const clean = data.filter((it) => it.id !== 'sample-1' && !it.title?.includes?.('mua cá & rau tươi'));
        setReminders(clean);
      }
    } catch (e) {
      console.warn('Lỗi tải danh sách toàn bộ nhắc nhở:', e);
    } finally {
      setIsLoadingReminders(false);
    }
  };

  useEffect(() => {
    loadAllReminders();
  }, [userId]);

  const handleOpenCreateReminder = () => {
    setEditingReminder(null);
    setReminderFormTitle('');
    setReminderFormDate(todayStr);
    const now = new Date();
    const curH = now.getHours();
    const curM = now.getMinutes();
    setReminderFormHour(curH);
    setReminderFormMinute(curM);
    setReminderHourText(String(curH).padStart(2, '0'));
    setReminderMinuteText(String(curM).padStart(2, '0'));
    setReminderFormBefore(5);
    setReminderFormNote('');
    setIsReminderModalOpen(true);
  };

  const handleOpenEditReminder = (item: IReminder) => {
    setEditingReminder(item);
    setReminderFormTitle(item.title);
    setReminderFormDate(item.date || todayStr);
    const [h, m] = (item.time || '12:00').split(':');
    const validH = isNaN(parseInt(h, 10)) ? 12 : Math.min(23, Math.max(0, parseInt(h, 10)));
    const validM = isNaN(parseInt(m, 10)) ? 0 : Math.min(59, Math.max(0, parseInt(m, 10)));
    setReminderFormHour(validH);
    setReminderFormMinute(validM);
    setReminderHourText(String(validH).padStart(2, '0'));
    setReminderMinuteText(String(validM).padStart(2, '0'));
    setReminderFormBefore(item.remindBeforeMinutes !== undefined ? item.remindBeforeMinutes : 5);
    setReminderFormNote(item.note || '');
    setIsReminderModalOpen(true);
  };

  const handleSaveReminder = async () => {
    const trimmedTitle = reminderFormTitle.trim();
    if (!trimmedTitle) return;

    setIsSubmittingReminder(true);
    const formattedTime = `${String(reminderFormHour).padStart(2, '0')}:${String(reminderFormMinute).padStart(2, '0')}`;
    const targetDate = reminderFormDate || todayStr;

    if (editingReminder) {
      const targetId = editingReminder.id;
      unmarkReminderAsAlerted(targetId, targetDate);
      setReminders((prev) =>
        prev.map((r) =>
          r.id === targetId
            ? {
                ...r,
                title: trimmedTitle,
                date: targetDate,
                time: formattedTime,
                remindBeforeMinutes: reminderFormBefore,
                note: reminderFormNote,
              }
            : r,
        ),
      );
      setIsReminderModalOpen(false);
      try {
        await updateReminderApi(targetId, {
          title: trimmedTitle,
          date: targetDate,
          time: formattedTime,
          remindBeforeMinutes: reminderFormBefore,
          note: reminderFormNote,
        });
      } catch (err) {
        console.warn('Lỗi cập nhật nhắc nhở:', err);
      } finally {
        setIsSubmittingReminder(false);
      }
      return;
    }

    const optimisticId = 'remind-' + Date.now();
    const newItem: IReminder = {
      id: optimisticId,
      title: trimmedTitle,
      date: targetDate,
      time: formattedTime,
      remindBeforeMinutes: reminderFormBefore,
      isCompleted: false,
      isDismissed: false,
      note: reminderFormNote,
    };

    setReminders((prev) => [newItem, ...prev]);
    setIsReminderModalOpen(false);

    try {
      const serverItem = await createReminderApi({
        title: trimmedTitle,
        date: targetDate,
        time: formattedTime,
        remindBeforeMinutes: reminderFormBefore,
        note: reminderFormNote,
      });
      if (serverItem && serverItem.id) {
        setReminders((prev) =>
          prev.map((r) => (r.id === optimisticId ? serverItem : r)),
        );
      }
    } catch (err) {
      console.warn('Lỗi tạo nhắc nhở:', err);
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  const handleToggleReminder = async (item: IReminder) => {
    const nextStatus = !item.isCompleted;
    setReminders((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, isCompleted: nextStatus } : r)),
    );
    try {
      await toggleReminderApi(item.id);
    } catch {}
  };

  const handleDeleteReminder = async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteReminderApi(id);
    } catch {}
  };

  const handleTestBell = (item: IReminder) => {
    const leadMins = item.remindBeforeMinutes !== undefined ? item.remindBeforeMinutes : 10;
    const leadText = leadMins === 0 ? 'Đúng giờ' : `Báo trước ${leadMins} phút`;
    addNotification({
      id: `reminder-test-${item.id}-${Date.now()}`,
      type: 'reminder',
      title: `Nhắc nhở: ${item.title} ⏰`,
      message: `Đã đến giờ nhắc nhở (${item.time || '12:00'} - ${leadText}). Đừng quên công việc của bạn nhé!`,
      createdAt: new Date().toISOString(),
      read: false,
      iconBg: '#EDE9FE',
      iconColor: '#7C3AED',
      metadata: { targetTab: 'reminders' },
    });
    setPushedReminderId(item.id);
    setTimeout(() => setPushedReminderId(null), 2500);
  };

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter((item) => {
      // 1. Text search
      if (reminderSearch.trim()) {
        const q = reminderSearch.toLowerCase().trim();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesNote = item.note?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNote) return false;
      }
      // 2. Status / Date filter
      if (reminderFilter === 'today') {
        return item.date === todayStr;
      }
      if (reminderFilter === 'pending') {
        return !item.isCompleted;
      }
      if (reminderFilter === 'completed') {
        return item.isCompleted;
      }
      return true;
    });
  }, [reminders, reminderFilter, reminderSearch, todayStr]);

  const totalRemindersCount = reminders.length;
  const pendingRemindersCount = reminders.filter((r) => !r.isCompleted).length;
  const completedRemindersCount = reminders.filter((r) => r.isCompleted).length;
  const reminderCompletionPercent =
    totalRemindersCount > 0
      ? Math.round((completedRemindersCount / totalRemindersCount) * 100)
      : 0;

  // ==========================================
  // SECTION 2: GHI CHÚ & SỔ TAY (PERSONAL NOTES)
  // ==========================================
  const [notes, setNotes] = useState<PersonalNote[]>(() => loadNotesFromStorage(userId));
  const [noteSearch, setNoteSearch] = useState<string>('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);
  const [noteFormTitle, setNoteFormTitle] = useState('');
  const [noteFormContent, setNoteFormContent] = useState('');
  const [noteFormColor, setNoteFormColor] = useState(NOTE_COLORS[0].bg);
  const [noteFormPinned, setNoteFormPinned] = useState(false);

  useEffect(() => {
    saveNotesToStorage(notes, userId);
  }, [notes, userId]);

  const handleOpenCreateNote = () => {
    setEditingNote(null);
    setNoteFormTitle('');
    setNoteFormContent('');
    setNoteFormColor(NOTE_COLORS[0].bg);
    setNoteFormPinned(false);
    setIsNoteModalOpen(true);
  };

  const handleOpenEditNote = (note: PersonalNote) => {
    setEditingNote(note);
    setNoteFormTitle(note.title);
    setNoteFormContent(note.content);
    setNoteFormColor(note.color || NOTE_COLORS[0].bg);
    setNoteFormPinned(note.isPinned || false);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = () => {
    const trimmedTitle = noteFormTitle.trim();
    const trimmedContent = noteFormContent.trim();
    if (!trimmedTitle && !trimmedContent) return;

    const nowIso = new Date().toISOString();

    if (editingNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                title: trimmedTitle || (isVi ? 'Ghi chú không tên' : 'Untitled Note'),
                content: trimmedContent,
                color: noteFormColor,
                isPinned: noteFormPinned,
                updatedAt: nowIso,
              }
            : n,
        ),
      );
    } else {
      const newNote: PersonalNote = {
        id: 'note-' + Date.now(),
        userId,
        title: trimmedTitle || (isVi ? 'Ghi chú mới' : 'New Note'),
        content: trimmedContent,
        color: noteFormColor,
        isPinned: noteFormPinned,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setNotes((prev) => [newNote, ...prev]);
    }
    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleTogglePinNote = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n)),
    );
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (!noteSearch.trim()) return true;
        const q = noteSearch.toLowerCase().trim();
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
  }, [notes, noteSearch]);

  const totalNotesCount = notes.length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F5F0E8' }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ===================== HEADER TOP BAR ===================== */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.pageTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                {isVi ? 'Nhắc nhở & Ghi chú' : 'Reminders & Notes'}
              </Text>
              <View style={styles.badgeCountHeader}>
                <Text style={styles.badgeCountHeaderText}>
                  {activeSubTab === 'reminders'
                    ? `${pendingRemindersCount} ${isVi ? 'việc cần làm' : 'pending'}`
                    : `${totalNotesCount} ${isVi ? 'ghi chú' : 'notes'}`}
                </Text>
              </View>
            </View>
            <Text style={[styles.pageSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {isVi
                ? 'Xem lại lịch nhắc cũ & mới, ghi chép sổ tay cá nhân tiện lợi cùng Monett'
                : 'Review past & upcoming reminders, and jot down personal memos'}
            </Text>
          </View>
        </View>

        {/* Action Button & Close */}
        <View style={styles.headerActions}>
          {activeSubTab === 'reminders' ? (
            <TouchableOpacity
              style={styles.primaryAddBtn}
              onPress={handleOpenCreateReminder}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.primaryAddBtnText}>
                {isVi ? 'Thêm lời nhắc' : 'Add Reminder'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryAddBtn, { backgroundColor: '#0284C7' }]}
              onPress={handleOpenCreateNote}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.primaryAddBtnText}>
                {isVi ? 'Viết ghi chú' : 'Add Note'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#221D18" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ===================== SUB-TAB SWITCHER ===================== */}
      <View style={styles.subTabSwitcherWrap}>
        <View style={[styles.subTabSwitcher, { backgroundColor: isDark ? '#1E293B' : '#EBE5DC' }]}>
          <TouchableOpacity
            style={[
              styles.subTabBtn,
              activeSubTab === 'reminders' && styles.subTabBtnActive,
            ]}
            onPress={() => setActiveSubTab('reminders')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeSubTab === 'reminders' ? 'notifications' : 'notifications-outline'}
              size={17}
              color={activeSubTab === 'reminders' ? '#047857' : (isDark ? '#94A3B8' : '#64748B')}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.subTabText,
                activeSubTab === 'reminders' && styles.subTabTextActive,
                { color: activeSubTab === 'reminders' ? '#047857' : (isDark ? '#94A3B8' : '#64748B') },
              ]}
            >
              {isVi ? '⏰ Lời nhắc hẹn' : '⏰ Reminders'} ({totalRemindersCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTabBtn,
              activeSubTab === 'notes' && styles.subTabBtnActive,
            ]}
            onPress={() => setActiveSubTab('notes')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeSubTab === 'notes' ? 'document-text' : 'document-text-outline'}
              size={17}
              color={activeSubTab === 'notes' ? '#047857' : (isDark ? '#94A3B8' : '#64748B')}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.subTabText,
                activeSubTab === 'notes' && styles.subTabTextActive,
                { color: activeSubTab === 'notes' ? '#047857' : (isDark ? '#94A3B8' : '#64748B') },
              ]}
            >
              {isVi ? '📝 Sổ tay & Ghi chú' : '📝 Notes & Memos'} ({totalNotesCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================ */}
      {/* NỘI DUNG TAB 1: LỜI NHẮC HẸN */}
      {/* ============================================================ */}
      {activeSubTab === 'reminders' && (
        <View style={styles.tabContentArea}>
          {/* Quick Stats Bar - Đồng bộ kích thước chuẩn lớn với Sổ nợ & Tích lũy (minHeight: 160, padding: 24) */}
          <View style={[styles.statsRow, !isDesktop && styles.statsRowMobile]}>
            {/* Card 1: Tổng số việc - Màu xanh đậm (#064E3B) */}
            <View style={[styles.statCard, styles.statCardDark, !isDesktop && styles.statCardMobile]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabelDark}>
                  {isVi ? 'TỔNG SỐ VIỆC CẦN LÀM' : 'TOTAL REMINDERS'}
                </Text>
                <View style={styles.percentBadge}>
                  <Text style={styles.percentBadgeText}>{reminderCompletionPercent}%</Text>
                </View>
              </View>

              <Text style={styles.statCardValueDark} numberOfLines={1}>
                {totalRemindersCount} <Text style={styles.currencySubDark}>{isVi ? 'việc' : 'tasks'}</Text>
              </Text>

              <View style={styles.cardDarkDivider} />

              <Text style={styles.statCardSubDark}>
                {pendingRemindersCount} {isVi ? 'chưa hoàn thành' : 'pending'} · {completedRemindersCount} {isVi ? 'đã xong' : 'completed'}
              </Text>
            </View>

            {/* Card 2: Chưa xong */}
            <View
              style={[
                styles.statCard,
                styles.statCardMint,
                !isDesktop && styles.statCardMobile,
                isDark && { backgroundColor: '#0F261D', borderColor: 'rgba(16, 185, 129, 0.3)' },
              ]}
            >
              <View style={styles.statCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time" size={16} color={isDark ? '#34D399' : '#065F46'} />
                  <Text style={[styles.statCardLabelPastel, { color: isDark ? '#34D399' : '#065F46' }]}>
                    {isVi ? 'Chưa xong' : 'Pending'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.statCardValuePastel, { color: isDark ? '#F8FAFC' : '#064E3B' }]} numberOfLines={1}>
                {pendingRemindersCount} <Text style={[styles.currencySubPastel, { color: isDark ? '#A7F3D0' : '#064E3B' }]}>{isVi ? 'việc' : 'tasks'}</Text>
              </Text>

              <Text style={[styles.statCardSubPastel, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                {pendingRemindersCount === 0
                  ? (isVi ? 'Tuyệt vời! Đã hoàn thành mọi việc' : 'All done! Great job')
                  : (isVi ? `${pendingRemindersCount} việc cần làm đúng hạn` : `${pendingRemindersCount} tasks remaining`)}
              </Text>
            </View>

            {/* Card 3: Đã hoàn thành */}
            <View
              style={[
                styles.statCard,
                styles.statCardYellow,
                !isDesktop && styles.statCardMobile,
                isDark && { backgroundColor: '#241B0E', borderColor: 'rgba(245, 158, 11, 0.3)' },
              ]}
            >
              <View style={styles.statCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-done" size={17} color={isDark ? '#FBBF24' : '#92400E'} />
                  <Text style={[styles.statCardLabelPastel, { color: isDark ? '#FBBF24' : '#92400E' }]}>
                    {isVi ? 'Đã hoàn thành' : 'Completed'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.statCardValuePastel, { color: '#92400E' }]} numberOfLines={1}>
                {completedRemindersCount} <Text style={[styles.currencySubPastel, { color: '#92400E' }]}>{isVi ? 'việc' : 'tasks'}</Text>
              </Text>

              <Text style={[styles.statCardSubPastel, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                {reminderCompletionPercent}% {isVi ? 'đã hoàn thành xong' : 'completion rate'}
              </Text>
            </View>
          </View>

          {/* Filter Bar & Search */}
          <View style={[styles.controlsRow, !isDesktop && { flexDirection: 'column', alignItems: 'stretch' }]}>
            {/* Filter Pills */}
            <View style={styles.filterPillsGroup}>
              {(['all', 'today', 'pending', 'completed'] as const).map((key) => {
                const isActive = reminderFilter === key;
                const labels = {
                  all: isVi ? 'Tất cả' : 'All',
                  today: isVi ? 'Hôm nay' : 'Today',
                  pending: isVi ? 'Chưa xong' : 'Pending',
                  completed: isVi ? 'Đã hoàn thành' : 'Completed',
                };
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.filterPill,
                      isActive && styles.filterPillActive,
                      { backgroundColor: isActive ? '#047857' : (isDark ? '#1E293B' : '#FFFFFF') },
                    ]}
                    onPress={() => setReminderFilter(key)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive && styles.filterPillTextActive,
                        { color: isActive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#475569') },
                      ]}
                    >
                      {labels[key]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search Input */}
            <View style={[styles.searchBoxWrap, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#F8FAFC' : '#1E293B' }]}
                placeholder={isVi ? 'Tìm kiếm lời nhắc...' : 'Search reminders...'}
                placeholderTextColor="#94A3B8"
                value={reminderSearch}
                onChangeText={setReminderSearch}
              />
              {reminderSearch.length > 0 && (
                <TouchableOpacity onPress={() => setReminderSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* List of Reminders */}
          {isLoadingReminders && reminders.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#047857" />
              <Text style={styles.loadingText}>
                {isVi ? 'Đang tải danh sách nhắc nhở...' : 'Loading reminders...'}
              </Text>
            </View>
          ) : filteredReminders.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={32} color="#0284C7" />
              </View>
              <Text style={[styles.emptyBoxTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                {reminderFilter === 'completed'
                  ? (isVi ? 'Chưa có lời nhắc nào hoàn thành' : 'No completed reminders yet')
                  : (isVi ? 'Không tìm thấy lời nhắc nào' : 'No reminders found')}
              </Text>
              <Text style={styles.emptyBoxSub}>
                {isVi
                  ? 'Bấm "+ Thêm lời nhắc" để tạo việc mua sắm, trả tiền phòng hoặc việc cần nhớ!'
                  : 'Tap "+ Add Reminder" to schedule alerts and tasks!'}
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={handleOpenCreateReminder}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.emptyAddBtnText}>
                  {isVi ? 'Thêm lời nhắc mới' : 'Add New Reminder'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.remindersList}>
              {filteredReminders.map((item) => {
                const isDone = item.isCompleted;
                const leadMins = item.remindBeforeMinutes !== undefined ? item.remindBeforeMinutes : 10;
                const isPushed = pushedReminderId === item.id;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.reminderItemCard,
                      { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                      isDone && styles.reminderItemCardDone,
                    ]}
                  >
                    {/* Tick hoàn thành */}
                    <TouchableOpacity
                      style={[styles.reminderTickBtn, isDone && styles.reminderTickBtnChecked]}
                      onPress={() => handleToggleReminder(item)}
                      activeOpacity={0.7}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : (
                        <View style={styles.reminderTickDot} />
                      )}
                    </TouchableOpacity>

                    {/* Nội dung chính */}
                    <TouchableOpacity
                      style={styles.reminderItemBody}
                      onPress={() => handleToggleReminder(item)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.reminderItemTitle,
                          { color: isDark ? '#F8FAFC' : '#0F172A' },
                          isDone && styles.reminderItemTitleDone,
                        ]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>

                      {/* Meta badges: Ngày, Giờ, Báo trước, Ghi chú */}
                      <View style={styles.reminderBadgesRow}>
                        {/* Ngày hẹn */}
                        <View style={[styles.reminderBadge, { backgroundColor: '#F1F5F9' }]}>
                          <Ionicons name="calendar-outline" size={12} color="#475569" style={{ marginRight: 4 }} />
                          <Text style={styles.reminderBadgeText}>
                            {item.date === todayStr ? (isVi ? 'Hôm nay' : 'Today') : (item.date || todayStr)}
                          </Text>
                        </View>

                        {/* Giờ hẹn */}
                        <View style={[styles.reminderBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Ionicons name="time-outline" size={12} color="#D97706" style={{ marginRight: 4 }} />
                          <Text style={[styles.reminderBadgeText, { color: '#B45309' }]}>
                            {item.time || '12:00'}
                          </Text>
                        </View>

                        {/* Báo trước (Lead Time chính xác) */}
                        <View style={[styles.reminderBadge, { backgroundColor: '#EDE9FE' }]}>
                          <Ionicons name="notifications-outline" size={12} color="#7C3AED" style={{ marginRight: 4 }} />
                          <Text style={[styles.reminderBadgeText, { color: '#6D28D9' }]}>
                            {leadMins === 0
                              ? (isVi ? 'Đúng giờ' : 'On time')
                              : `${isVi ? 'Báo trước' : 'Before'} ${leadMins}p`}
                          </Text>
                        </View>

                        {/* Status Label */}
                        {isDone ? (
                          <View style={[styles.reminderBadge, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="checkmark-circle" size={12} color="#16A34A" style={{ marginRight: 4 }} />
                            <Text style={[styles.reminderBadgeText, { color: '#15803D' }]}>
                              {isVi ? 'Đã hoàn thành' : 'Done'}
                            </Text>
                          </View>
                        ) : null}

                        {isPushed && (
                          <Text style={styles.pushedToastText}>
                            {isVi ? 'Đã rung chuông 🔔' : 'Alert fired 🔔'}
                          </Text>
                        )}
                      </View>

                      {/* Note snippet if present */}
                      {item.note ? (
                        <Text style={[styles.reminderItemNote, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                          💬 {item.note}
                        </Text>
                      ) : null}
                    </TouchableOpacity>

                    {/* Actions Group: Test Bell, Edit, Delete */}
                    <View style={styles.reminderActionsGroup}>
                      <TouchableOpacity
                        style={[styles.reminderActionBtn, isPushed && styles.reminderActionBtnActive]}
                        onPress={() => handleTestBell(item)}
                        activeOpacity={0.7}
                        accessibilityLabel="Thử nghiệm chuông báo"
                      >
                        <Ionicons
                          name={isPushed ? 'notifications' : 'notifications-outline'}
                          size={15}
                          color={isPushed ? '#FFFFFF' : '#7C3AED'}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.reminderActionBtn}
                        onPress={() => handleOpenEditReminder(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil" size={14} color="#0284C7" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.reminderActionBtn, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => handleDeleteReminder(item.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ============================================================ */}
      {/* NỘI DUNG TAB 2: GHI CHÚ & SỔ TAY CÁ NHÂN */}
      {/* ============================================================ */}
      {activeSubTab === 'notes' && (
        <View style={styles.tabContentArea}>
          {/* Notes Top Toolbar */}
          <View style={[styles.controlsRow, !isDesktop && { flexDirection: 'column', alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.notesCountBadge}>
                <Ionicons name="book-outline" size={15} color="#047857" style={{ marginRight: 4 }} />
                <Text style={styles.notesCountBadgeText}>
                  {totalNotesCount} {isVi ? 'ghi chú cá nhân' : 'notes saved'}
                </Text>
              </View>
            </View>

            <View style={[styles.searchBoxWrap, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#F8FAFC' : '#1E293B' }]}
                placeholder={isVi ? 'Tìm kiếm trong sổ ghi chú...' : 'Search notes...'}
                placeholderTextColor="#94A3B8"
                value={noteSearch}
                onChangeText={setNoteSearch}
              />
              {noteSearch.length > 0 && (
                <TouchableOpacity onPress={() => setNoteSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="document-text-outline" size={32} color="#D97706" />
              </View>
              <Text style={[styles.emptyBoxTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
                {isVi ? 'Chưa có ghi chú nào' : 'No notes yet'}
              </Text>
              <Text style={styles.emptyBoxSub}>
                {isVi
                  ? 'Ghi lại danh sách mua sắm, các việc cần làm, ý tưởng tiết kiệm hoặc mẹo tài chính bất kỳ lúc nào!'
                  : 'Write down grocery lists, memos, reminders, or financial tips!'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: '#0284C7' }]}
                onPress={handleOpenCreateNote}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.emptyAddBtnText}>
                  {isVi ? 'Tạo ghi chú đầu tiên' : 'Create First Note'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.notesGrid}>
              {filteredNotes.map((note) => {
                const colorObj = NOTE_COLORS.find((c) => c.bg === note.color) || NOTE_COLORS[0];
                return (
                  <View
                    key={note.id}
                    style={[
                      styles.noteCard,
                      {
                        backgroundColor: note.color || '#FEF9C3',
                        borderColor: colorObj.border,
                      },
                    ]}
                  >
                    {/* Note Card Header */}
                    <View style={styles.noteCardHeader}>
                      <Text style={styles.noteCardTitle} numberOfLines={2}>
                        {note.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => handleTogglePinNote(note.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons
                            name={note.isPinned ? 'pin' : 'pin-outline'}
                            size={16}
                            color={note.isPinned ? '#B45309' : '#64748B'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleOpenEditNote(note)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="pencil" size={14} color="#0369A1" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteNote(note.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Note Card Content */}
                    <Text style={styles.noteCardContent}>
                      {note.content}
                    </Text>

                    {/* Note Card Footer */}
                    <View style={styles.noteCardFooter}>
                      <Text style={styles.noteCardDate}>
                        {new Date(note.updatedAt || note.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </Text>
                      {note.isPinned && (
                        <View style={styles.pinnedPill}>
                          <Text style={styles.pinnedPillText}>{isVi ? 'Đã ghim' : 'Pinned'}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ============================================================ */}
      {/* MODAL TẠO / SỬA LỜI NHẮC (REMINDER MODAL) */}
      {/* ============================================================ */}
      <Modal
        visible={isReminderModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReminderModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="notifications" size={20} color="#7C3AED" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                    {editingReminder
                      ? (isVi ? 'Chỉnh sửa lời nhắc' : 'Edit Reminder')
                      : (isVi ? 'Tạo lời nhắc mới' : 'New Reminder')}
                  </Text>
                  <Text style={styles.modalSub}>
                    {isVi ? 'Cài đặt thời gian để Monett gửi thông báo đến bạn' : 'Set alarm time for notifications'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsReminderModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {/* 1. Tiêu đề lời nhắc */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: isDark ? '#F8FAFC' : '#334155' }]}>
                  {isVi ? 'Nội dung nhắc việc' : 'Task Title'} *
                </Text>
                <TextInput
                  style={[styles.formTextInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                  placeholder={isVi ? 'Ví dụ: Đi chợ mua đồ, đóng tiền điện nước...' : 'e.g. Buy groceries, pay rent...'}
                  placeholderTextColor="#94A3B8"
                  value={reminderFormTitle}
                  onChangeText={setReminderFormTitle}
                  autoFocus
                />
              </View>

              {/* 2. Ngày hẹn */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: isDark ? '#F8FAFC' : '#334155' }]}>
                  {isVi ? 'Ngày hẹn' : 'Date'} (YYYY-MM-DD)
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={[styles.formTextInput, { flex: 1, color: isDark ? '#F8FAFC' : '#0F172A' }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={reminderFormDate}
                    onChangeText={setReminderFormDate}
                  />
                  <TouchableOpacity
                    style={styles.todayPresetBtn}
                    onPress={() => setReminderFormDate(todayStr)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.todayPresetBtnText}>{isVi ? 'Hôm nay' : 'Today'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3. Giờ hẹn (Giờ & Phút) */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: isDark ? '#F8FAFC' : '#334155', marginBottom: 8 }]}>
                  {isVi ? 'Giờ hẹn thông báo' : 'Alarm Time'} (24h)
                </Text>

                <View style={styles.timeInputsRow}>
                  <View style={styles.timeInputBox}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleStepHour(1)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="chevron-up" size={16} color="#047857" />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.timeNumberInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus={true}
                      value={reminderHourText}
                      onChangeText={handleHourInputChange}
                      onBlur={handleHourInputBlur}
                      placeholder="12"
                      placeholderTextColor="#94A3B8"
                    />

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleStepHour(-1)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="chevron-down" size={16} color="#047857" />
                    </TouchableOpacity>
                    <Text style={styles.timeInputSub}>{isVi ? 'Giờ (0-23)' : 'Hour'}</Text>
                  </View>

                  <Text style={styles.timeColonText}>:</Text>

                  <View style={styles.timeInputBox}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleStepMinute(1)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="chevron-up" size={16} color="#047857" />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.timeNumberInput}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus={true}
                      value={reminderMinuteText}
                      onChangeText={handleMinuteInputChange}
                      onBlur={handleMinuteInputBlur}
                      placeholder="00"
                      placeholderTextColor="#94A3B8"
                    />

                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => handleStepMinute(-1)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="chevron-down" size={16} color="#047857" />
                    </TouchableOpacity>
                    <Text style={styles.timeInputSub}>{isVi ? 'Phút (0-59)' : 'Minute'}</Text>
                  </View>
                </View>
              </View>

              {/* 4. Số phút báo trước */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: isDark ? '#F8FAFC' : '#334155' }]}>
                  {isVi ? 'Báo trước bạn' : 'Remind Before'}
                </Text>
                <View style={styles.beforeChipsRow}>
                  {[0, 5, 10, 15, 30].map((mins) => {
                    const isSelected = reminderFormBefore === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        style={[
                          styles.beforeChip,
                          isSelected && styles.beforeChipActive,
                        ]}
                        onPress={() => setReminderFormBefore(mins)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.beforeChipText,
                            isSelected && styles.beforeChipTextActive,
                          ]}
                        >
                          {mins === 0 ? (isVi ? 'Đúng giờ' : 'On time') : `${mins} ${isVi ? 'phút' : 'min'}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. Ghi chú thêm */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: isDark ? '#F8FAFC' : '#334155' }]}>
                  {isVi ? 'Ghi chú thêm (tùy chọn)' : 'Note (optional)'}
                </Text>
                <TextInput
                  style={[styles.formTextInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                  placeholder={isVi ? 'Ví dụ: Mang theo tiền mặt, ghé nhà bạn...' : 'e.g. Bring cash...'}
                  placeholderTextColor="#94A3B8"
                  value={reminderFormNote}
                  onChangeText={setReminderFormNote}
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsReminderModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, !reminderFormTitle.trim() && styles.modalSubmitBtnDisabled]}
                onPress={handleSaveReminder}
                disabled={!reminderFormTitle.trim() || isSubmittingReminder}
                activeOpacity={0.8}
              >
                {isSubmittingReminder ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {editingReminder ? (isVi ? 'Lưu thay đổi' : 'Save Changes') : (isVi ? 'Lưu nhắc nhở' : 'Save Reminder')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL TẠO / SỬA GHI CHÚ (PERSONAL NOTE MODAL) */}
      {/* ============================================================ */}
      <Modal
        visible={isNoteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNoteModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="document-text" size={20} color="#0284C7" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                    {editingNote
                      ? (isVi ? 'Chỉnh sửa ghi chú' : 'Edit Note')
                      : (isVi ? 'Viết ghi chú mới' : 'New Note')}
                  </Text>
                  <Text style={styles.modalSub}>
                    {isVi ? 'Lưu lại danh sách mua sắm hoặc ý tưởng cá nhân' : 'Keep track of memos and lists'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsNoteModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {/* Tiêu đề ghi chú */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: isDark ? '#F8FAFC' : '#334155' }]}>
                  {isVi ? 'Tiêu đề ghi chú' : 'Note Title'}
                </Text>
                <TextInput
                  style={[styles.formTextInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                  placeholder={isVi ? 'Ví dụ: Đồ cần mua tuần này, ý tưởng tiết kiệm...' : 'e.g. Weekend shopping list...'}
                  placeholderTextColor="#94A3B8"
                  value={noteFormTitle}
                  onChangeText={setNoteFormTitle}
                  autoFocus
                />
              </View>

              {/* Nội dung ghi chú */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: isDark ? '#F8FAFC' : '#334155' }]}>
                  {isVi ? 'Nội dung chi tiết' : 'Content'}
                </Text>
                <TextInput
                  style={[styles.formTextArea, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                  placeholder={isVi ? 'Nhập ghi chú tại đây...' : 'Write notes here...'}
                  placeholderTextColor="#94A3B8"
                  value={noteFormContent}
                  onChangeText={setNoteFormContent}
                  multiline
                  numberOfLines={5}
                />
              </View>

              {/* Chọn màu thẻ ghi chú */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: isDark ? '#F8FAFC' : '#334155' }]}>
                  {isVi ? 'Màu sắc thẻ ghi chú' : 'Card Color'}
                </Text>
                <View style={styles.colorSwatchesRow}>
                  {NOTE_COLORS.map((col) => {
                    const isSelected = noteFormColor === col.bg;
                    return (
                      <TouchableOpacity
                        key={col.id}
                        style={[
                          styles.colorSwatchBtn,
                          { backgroundColor: col.bg, borderColor: isSelected ? '#047857' : col.border },
                          isSelected && styles.colorSwatchBtnSelected,
                        ]}
                        onPress={() => setNoteFormColor(col.bg)}
                        activeOpacity={0.7}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#047857" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Ghim lên đầu */}
              <TouchableOpacity
                style={styles.pinCheckboxRow}
                onPress={() => setNoteFormPinned(!noteFormPinned)}
                activeOpacity={0.8}
              >
                <View style={[styles.pinCheckbox, noteFormPinned && styles.pinCheckboxActive]}>
                  {noteFormPinned && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={[styles.pinCheckboxLabel, { color: isDark ? '#F8FAFC' : '#334155' }]}>
                  📌 {isVi ? 'Ghim ghi chú này lên đầu danh sách' : 'Pin this note to top'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsNoteModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>{isVi ? 'Hủy bỏ' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#0284C7' }]}
                onPress={handleSaveNote}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitBtnText}>
                  {editingNote ? (isVi ? 'Lưu ghi chú' : 'Save Note') : (isVi ? 'Tạo ghi chú' : 'Create Note')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 140,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 260,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  badgeCountHeader: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeCountHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  pageSubtitle: {
    fontSize: 13.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  subTabSwitcherWrap: {
    marginBottom: 22,
  },
  subTabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  subTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  subTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  subTabText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  subTabTextActive: {
    fontWeight: '700',
  },
  tabContentArea: {
    width: '100%',
  },
  // 2. Stat Cards Row (Full Width, Exact Dimensions Matching Sổ nợ: minHeight: 160, padding: 24)
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
    width: '100%',
  },
  statsRowMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    minHeight: 160,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statCardMobile: {
    width: '100%',
    marginBottom: 12,
  },
  statCardDark: {
    backgroundColor: '#064E3B',
    borderColor: '#065F46',
    flex: 1,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  cardDarkDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginVertical: 6,
  },
  statCardMint: {
    backgroundColor: '#BEE3C2',
    borderColor: '#BEE3C2',
    flex: 1,
  },
  statCardYellow: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    flex: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statCardLabelDark: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#A7F3D0',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  percentBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  percentBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#064E3B',
  },
  statCardValueDark: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 6,
    marginBottom: 6,
  },
  currencySubDark: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statCardSubDark: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  statCardLabelPastel: {
    fontSize: 15,
    fontWeight: '700',
  },
  statCardValuePastel: {
    fontSize: 30,
    fontWeight: '900',
    color: '#221D18',
    letterSpacing: -0.5,
    marginTop: 10,
    marginBottom: 4,
  },
  currencySubPastel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#221D18',
  },
  statCardSubPastel: {
    fontSize: 13,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  filterPillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    borderColor: '#047857',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterPillTextActive: {
    fontWeight: '700',
  },
  searchBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 220,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: '#64748B',
  },
  emptyBox: {
    padding: 36,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyBoxTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyBoxSub: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 440,
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  remindersList: {
    gap: 12,
  },
  reminderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  reminderItemCardDone: {
    opacity: 0.72,
    backgroundColor: '#F8FAFC',
  },
  reminderTickBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderTickBtnChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  reminderTickDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  reminderItemBody: {
    flex: 1,
  },
  reminderItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  reminderItemTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  reminderBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reminderBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  pushedToastText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7C3AED',
  },
  reminderItemNote: {
    fontSize: 12,
    marginTop: 6,
  },
  reminderActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderActionBtnActive: {
    backgroundColor: '#7C3AED',
  },
  // Notes Section
  notesCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  notesCountBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  noteCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  noteCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  noteCardContent: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 14,
    flex: 1,
  },
  noteCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  noteCardDate: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  pinnedPill: {
    backgroundColor: 'rgba(180, 83, 9, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pinnedPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  formTextInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  formTextArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  todayPresetBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  todayPresetBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#047857',
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeInputBox: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  stepperBtn: {
    width: 36,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  timeInputSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 3,
  },
  timeNumberInput: {
    fontSize: 24,
    fontWeight: '900',
    color: '#047857',
    textAlign: 'center',
    width: 68,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  timeColonText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#047857',
  },
  beforeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  beforeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  beforeChipActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  beforeChipText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  beforeChipTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  colorSwatchesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorSwatchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchBtnSelected: {
    borderWidth: 3,
  },
  pinCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  pinCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinCheckboxActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  pinCheckboxLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.5,
  },
  modalSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
