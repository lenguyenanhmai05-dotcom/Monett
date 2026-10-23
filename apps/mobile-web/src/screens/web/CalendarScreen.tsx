import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getTransactionsApi,
  createTransactionApi,
  deleteTransactionApi,
  uploadMomentPhotoApi,
  normalizeAvatarUrl,
  getBudgetApi,
} from '../../services/api';
import {
  applyBudgetDelta,
  saveCachedBudget,
  notifyBudgetUpdated,
  notifyCalendarUpdated,
  isIncomeTransactionOrItem,
} from '../../services/calendarStorage';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import {
  getMonthCalendarGrid,
  getDayOfWeekName,
  isSameDay,
  formatYMD,
  MonthGridCell,
} from '../../utils/dateUtils';

// ============================================================
// TYPES & CONSTANTS
// ============================================================

export interface DayTransactionItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  rawAmount: number;
  type: 'expense' | 'income';
  category: string;
  iconBg: string;
  iconText: string;
  photoUri?: string;
  note?: string;
  time?: string;
}

export interface DayCalendarData {
  dayNum: number;
  month: number;
  year: number;
  fullDateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasPhoto: boolean;
  amountDisplay?: string;
  rawAmount?: number;
  categoryIcon?: string;
  categoryName?: string;
  photoUrl?: string;
  photoTitle?: string;
  photoCategoryTag?: string;
  emotionQuote?: string;
  items: DayTransactionItem[];
  isFutureOrUpcoming?: boolean;
}

// Danh mục định nghĩa sẵn với màu và icon tương ứng
const CATEGORIES = [
  { name: 'Ăn uống', icon: '🍔', bg: '#FCE7F3', textCol: '#BE185D' },
  { name: 'Cà phê', icon: '☕', bg: '#FEF3C7', textCol: '#B45309' },
  { name: 'Siêu thị', icon: '🛒', bg: '#DCFCE7', textCol: '#15803D' },
  { name: 'Di chuyển', icon: '⛽', bg: '#E0F2FE', textCol: '#0369A1' },
  { name: 'Mua sắm', icon: '🛍️', bg: '#F3E8FF', textCol: '#7E22CE' },
  { name: 'Hóa đơn', icon: '⚡', bg: '#FEF9C3', textCol: '#A16207' },
  { name: 'Giải trí', icon: '🎬', bg: '#FEE2E2', textCol: '#B91C1C' },
  { name: 'Học tập', icon: '📚', bg: '#E0E7FF', textCol: '#4338CA' },
  { name: 'Sức khỏe', icon: '💊', bg: '#CCFBF1', textCol: '#0F766E' },
  { name: 'Khác', icon: '💵', bg: '#F1F5F9', textCol: '#475569' },
];

const getCategoryMeta = (catName?: string) => {
  const found = CATEGORIES.find(
    (c) => c.name.toLowerCase() === (catName || '').toLowerCase()
  );
  return found || { name: catName || 'Khác', icon: '💵', bg: '#F1F5F9', textCol: '#475569' };
};

// Định dạng tiền tệ VND: 120.000đ
const formatVND = (num: number): string => {
  return Math.abs(num).toLocaleString('vi-VN') + 'đ';
};

// Định dạng hiển thị ngắn gọn trên ô lịch: 45k, 1.2M, 0đ
const formatAmountDisplay = (num: number): string => {
  if (num === 0) return '0đ';
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  }
  if (num >= 1_000) {
    return Math.round(num / 1_000) + 'k';
  }
  return `${num}đ`;
};

// Tính số ngày chuỗi ghi chép liên tiếp
const calculateStreak = (transactions: any[]): number => {
  if (!transactions.length) return 0;
  const recordedDays = new Set(
    transactions.map((t) => {
      const d = new Date(t.date);
      return formatYMD(d);
    })
  );

  let streak = 0;
  const checkDate = new Date();
  const todayStr = formatYMD(checkDate);

  // Nếu hôm nay chưa ghi chép, lùi về hôm qua để kiểm tra chuỗi
  if (!recordedDays.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (recordedDays.has(formatYMD(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
};

// ============================================================
// COMPONENT CHÍNH: WebCalendarScreen
// ============================================================

export const WebCalendarScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { user } = useAuth();
  const { language } = useLanguage();

  // 1. Quản lý tháng / năm hiện tại trên lịch
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const currentMonth = currentDate.getMonth() + 1; // 1-indexed (1..12)
  const currentYear = currentDate.getFullYear();

  // 2. Ngày đang được chọn để xem chi tiết bên cột phải
  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(() => formatYMD(today), [today]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayYMD);

  // 3. Dữ liệu giao dịch từ Database
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 4. State Modal thêm giao dịch & ảnh thật
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State Modal xác nhận xóa giao dịch
  const [deletingTx, setDeletingTx] = useState<{ id: string; title: string; amount?: string; category?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form fields
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Ăn uống');
  const [formCategoryIcon, setFormCategoryIcon] = useState<string>('🍔');
  const [formPhotoUri, setFormPhotoUri] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formTargetDate, setFormTargetDate] = useState<string>(selectedDateStr);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>('');
  const [formUrlInput, setFormUrlInput] = useState<string>('');

  // Tự động ẩn thông báo sau 3 giây
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  // ============================================================
  // LOAD DỮ LIỆU TỪ DATABASE CHO THÁNG ĐƯỢC CHỌN
  // ============================================================
  const fetchMonthTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const res = await getTransactionsApi({
        startDate,
        endDate,
        limit: 100,
      });

      const rawData = (res as any)?.data;
      const items = Array.isArray(res)
        ? res
        : Array.isArray(rawData)
        ? rawData
        : rawData?.items || (res as any)?.items || [];
      setTransactions(items);
    } catch (err: any) {
      console.error('[WebCalendar] Lỗi tải giao dịch:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchMonthTransactions();
  }, [fetchMonthTransactions]);

  // Điều hướng chuyển tháng
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const currentMonthTitle = useMemo(() => {
    return `Tháng ${currentMonth}, ${currentYear}`;
  }, [currentMonth, currentYear]);

  // ============================================================
  // TÍNH TOÁN MA TRẬN LỊCH VÀ GHÉP VỚI GIAO DỊCH THẬT TỪ DB
  // ============================================================
  const calendarCells = useMemo(() => {
    const rawGrid: MonthGridCell[] = getMonthCalendarGrid(currentYear, currentMonth, today);

    // Gom nhóm giao dịch theo định dạng YYYY-MM-DD
    const txMap: Record<string, any[]> = {};
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const key = formatYMD(d);
      if (!txMap[key]) txMap[key] = [];
      txMap[key].push(tx);
    });

    return rawGrid.map((cell): DayCalendarData => {
      const dayTxList = txMap[cell.fullDateStr] || [];

      // Tính tổng chi tiêu của ngày này
      let totalExpense = 0;
      let totalIncome = 0;
      let photoTx: any = null;

      const items: DayTransactionItem[] = dayTxList.map((tx: any) => {
        const amt = Math.abs(Number(tx.amount) || 0);
        const isExp = !isIncomeTransactionOrItem(tx) && (tx.type === 'expense' || tx.amount < 0 || !tx.type);
        if (isExp) totalExpense += amt;
        else totalIncome += amt;

        if (!photoTx && tx.photoUri && tx.photoUri.trim().length > 0) {
          photoTx = tx;
        }

        const catMeta = getCategoryMeta(tx.category);
        const txDateObj = new Date(tx.date);
        const timeStr = `${String(txDateObj.getHours()).padStart(2, '0')}:${String(txDateObj.getMinutes()).padStart(2, '0')}`;

        return {
          id: tx._id?.toString() || tx.id,
          title: tx.title || 'Khoản chi tiêu',
          subtitle: `${timeStr} • ${tx.category || 'Chi tiêu'}${tx.note ? ` • ${tx.note}` : ''}`,
          amount: `${isExp ? '-' : '+'}${formatVND(amt)}`,
          rawAmount: amt,
          type: isExp ? 'expense' : 'income',
          category: tx.category || 'Khác',
          iconBg: catMeta.bg,
          iconText: tx.categoryIcon || catMeta.icon,
          photoUri: tx.photoUri ? normalizeAvatarUrl(tx.photoUri) : undefined,
          note: tx.note,
          time: timeStr,
        };
      });

      const hasPhoto = !!photoTx;
      const normPhotoUrl = photoTx?.photoUri ? normalizeAvatarUrl(photoTx.photoUri) : undefined;
      const firstCat = dayTxList[0] ? getCategoryMeta(dayTxList[0].category) : null;
      const isFuture = new Date(cell.fullDateStr).getTime() > today.getTime() && !cell.isToday;

      let amountDisplay: string | undefined = undefined;
      if (dayTxList.length > 0) {
        amountDisplay = formatAmountDisplay(totalExpense > 0 ? totalExpense : totalIncome);
      } else if (isFuture) {
        amountDisplay = '--';
      }

      return {
        dayNum: cell.dayNum,
        month: cell.month,
        year: cell.year,
        fullDateStr: cell.fullDateStr,
        isCurrentMonth: cell.isCurrentMonth,
        isToday: cell.isToday,
        hasPhoto,
        amountDisplay,
        rawAmount: totalExpense > 0 ? totalExpense : totalIncome,
        categoryIcon: firstCat?.icon,
        categoryName: firstCat?.name,
        photoUrl: normPhotoUrl,
        photoTitle: photoTx?.title || (hasPhoto ? 'Khoảnh khắc' : undefined),
        photoCategoryTag: photoTx?.category ? `${photoTx.category} & Khoảnh khắc` : undefined,
        emotionQuote:
          dayTxList.find((t) => t.note?.trim())?.note ||
          (hasPhoto ? 'Bức ảnh lưu giữ kỷ niệm chi tiêu ý nghĩa hôm nay.' : undefined),
        items,
        isFutureOrUpcoming: isFuture && dayTxList.length === 0,
      };
    });
  }, [currentYear, currentMonth, today, transactions]);

  // Tìm ngày đang chọn trong danh sách ô lịch
  const activeDay: DayCalendarData = useMemo(() => {
    const found = calendarCells.find((c) => c.fullDateStr === selectedDateStr);
    if (found) return found;

    // Fallback: ngày hôm nay hoặc ô đầu tiên trong tháng hiện tại
    const todayCell = calendarCells.find((c) => c.isToday);
    if (todayCell) return todayCell;

    const firstCurrent = calendarCells.find((c) => c.isCurrentMonth);
    return firstCurrent || calendarCells[0];
  }, [calendarCells, selectedDateStr]);

  // Click chọn 1 ngày trên lịch
  const handleSelectDay = (cell: DayCalendarData) => {
    setSelectedDateStr(cell.fullDateStr);
  };

  // ============================================================
  // TÍNH TOÁN 4 STAT CARDS TRÊN CÙNG TỪ DỮ LIỆU THẬT
  // ============================================================
  const stats = useMemo(() => {
    // 1. Tổng chi trong tháng
    let totalMonthExpense = 0;
    const daysWithPhotos = new Set<string>();

    transactions.forEach((tx) => {
      const isExp = tx.type === 'expense' || tx.amount < 0;
      if (isExp) totalMonthExpense += Math.abs(Number(tx.amount) || 0);
      if (tx.photoUri && tx.photoUri.trim().length > 0) {
        daysWithPhotos.add(formatYMD(new Date(tx.date)));
      }
    });

    const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const photoDaysCount = daysWithPhotos.size;
    const photoPercent = Math.min(100, Math.round((photoDaysCount / totalDaysInMonth) * 100));

    // Chuỗi ngày ghi chép liên tiếp
    const streakDays = calculateStreak(transactions);

    return {
      totalMonthExpense,
      photoDaysCount,
      totalDaysInMonth,
      photoPercent,
      streakDays,
    };
  }, [transactions, currentYear, currentMonth]);

  // ============================================================
  // XỬ LÝ CHỌN VÀ UPLOAD ẢNH THẬT (HỖ TRỢ MÁY CHỦ + LƯU TRỰC TIẾP)
  // ============================================================
  const pickAndProcessPhoto = async (): Promise<string | null> => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.position = 'fixed';
        input.style.top = '-9999px';
        input.style.left = '-9999px';
        input.style.opacity = '0';
        document.body.appendChild(input);

        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) {
            if (document.body.contains(input)) document.body.removeChild(input);
            return resolve(null);
          }

          setIsUploadingPhoto(true);
          setUploadStatusMsg('Đang đọc file ảnh...');

          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = (e.target?.result as string) || '';
            // Gán ảnh ngay lập tức để người dùng xem preview ngay
            setFormPhotoUri(dataUrl);
            setUploadStatusMsg('Đang lưu trữ ảnh...');

            if (document.body.contains(input)) document.body.removeChild(input);

            // Cố gắng tải file lên backend server
            try {
              const uploadedUrl = await uploadMomentPhotoApi(dataUrl, file.type, file.name);
              if (uploadedUrl) {
                setFormPhotoUri(uploadedUrl);
                setUploadStatusMsg('✅ Đã lưu ảnh lên máy chủ!');
                setFeedbackMsg({ text: 'Tải ảnh lên thành công!', type: 'success' });
                resolve(uploadedUrl);
                return;
              }
            } catch (err: any) {
              console.warn('Lưu ảnh cloud chưa khả dụng, lưu ảnh trực tiếp:', err);
              setUploadStatusMsg('✅ Đã chọn ảnh thành công!');
            } finally {
              setIsUploadingPhoto(false);
            }

            // Fallback lưu trực tiếp ảnh dạng Data URL vào database
            resolve(dataUrl);
          };

          reader.onerror = () => {
            if (document.body.contains(input)) document.body.removeChild(input);
            setIsUploadingPhoto(false);
            setUploadStatusMsg('Lỗi khi đọc file ảnh.');
            resolve(null);
          };

          reader.readAsDataURL(file);
        };

        input.oncancel = () => {
          if (document.body.contains(input)) document.body.removeChild(input);
          resolve(null);
        };

        input.click();
      });
    }
    return null;
  };

  // Mở modal thêm giao dịch với ngày chỉ định
  const handleOpenAddModal = (dateStr?: string, prefillPhoto?: string) => {
    const target = dateStr || selectedDateStr;
    setFormTargetDate(target);
    setFormTitle('');
    setFormAmount('');
    setFormType('expense');
    setFormCategory('Ăn uống');
    setFormCategoryIcon('🍔');
    setFormNote('');
    setFormPhotoUri(prefillPhoto || '');
    setFormUrlInput('');
    setUploadStatusMsg(prefillPhoto ? '✅ Đã đính kèm ảnh' : '');
    setIsAddModalOpen(true);
  };

  // Kéo thả hoặc click upload trực tiếp từ Dropzone / Thẻ ảnh
  const handleTriggerUploadFromDropzone = async () => {
    const photo = await pickAndProcessPhoto();
    if (photo) {
      handleOpenAddModal(selectedDateStr, photo);
    } else {
      handleOpenAddModal(selectedDateStr);
    }
  };

  // ============================================================
  // LƯU GIAO DỊCH THẬT VÀO DATABASE
  // ============================================================
  const handleSaveTransaction = async () => {
    const numAmount = parseFloat(formAmount.replace(/[^0-9]/g, ''));
    if (!formTitle.trim()) {
      alert('Vui lòng nhập tên khoản chi / thu!');
      return;
    }
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0!');
      return;
    }

    try {
      setIsSubmitting(true);
      // 1. Cập nhật số dư khả dụng ngay lập tức (0ms Optimistic UI)
      applyBudgetDelta(formType === 'expense' ? numAmount : -numAmount);
      notifyCalendarUpdated();

      // Ghép ngày được chọn với giờ phút thực tế lúc upload (thay vì giờ tĩnh 12:00:00Z)
      const now = new Date();
      let targetDateObj = now;
      if (formTargetDate) {
        const parts = formTargetDate.split('-');
        if (parts.length === 3) {
          targetDateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), now.getHours(), now.getMinutes(), now.getSeconds());
        }
      }
      const datePayload = targetDateObj.toISOString();

      await createTransactionApi({
        title: formTitle.trim(),
        amount: numAmount,
        type: formType,
        category: formCategory,
        categoryIcon: formCategoryIcon,
        note: formNote.trim(),
        photoUri: formPhotoUri ? formPhotoUri.trim() : undefined,
        date: datePayload,
      });

      setFeedbackMsg({ text: 'Đã lưu giao dịch vào cơ sở dữ liệu!', type: 'success' });
      setIsAddModalOpen(false);

      getBudgetApi()
        .then((fresh) => {
          if (fresh && fresh.limit) {
            saveCachedBudget(fresh);
            notifyBudgetUpdated(fresh);
          }
        })
        .catch(() => {});

      // Tải lại dữ liệu mới nhất từ server
      await fetchMonthTransactions();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu giao dịch vào database');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // XÓA GIAO DỊCH THẬT TỪ DATABASE (CÓ MODAL XÁC NHẬN)
  // ============================================================
  const handleDeleteTransaction = (id: string, title: string, amount?: string, category?: string) => {
    setDeletingTx({ id, title, amount, category });
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    setIsDeleting(true);

    // Hoàn lại số dư khả dụng ngay lập tức (0ms Optimistic UI)
    const delNum = Math.abs(parseInt(deletingTx.amount?.replace(/\D/g, '') || '0', 10));
    if (delNum > 0) {
      applyBudgetDelta(-delNum);
      notifyCalendarUpdated();
    }

    try {
      await deleteTransactionApi(deletingTx.id);
      setFeedbackMsg({ text: `Đã xóa khoản "${deletingTx.title}" thành công!`, type: 'success' });

      getBudgetApi()
        .then((fresh) => {
          if (fresh && fresh.limit) {
            saveCachedBudget(fresh);
            notifyBudgetUpdated(fresh);
          }
        })
        .catch(() => {});

      await fetchMonthTransactions();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa giao dịch');
    } finally {
      setIsDeleting(false);
      setDeletingTx(null);
    }
  };

  return (
    <ScrollView style={styles.scrollWrapper} contentContainerStyle={styles.scrollContent}>
      {/* Toast thông báo */}
      {feedbackMsg && (
        <View
          style={[
            styles.feedbackToast,
            feedbackMsg.type === 'success' ? styles.toastSuccess : styles.toastError,
          ]}
        >
          <Text style={styles.toastText}>
            {feedbackMsg.type === 'success' ? '✅ ' : '⚠️ '}
            {feedbackMsg.text}
          </Text>
        </View>
      )}

      {/* ==================== 1. TOP HEADER BANNER ==================== */}
      <View style={styles.topHeaderBanner}>
        {/* Left Title with Icon & Badge */}
        <View style={styles.headerLeftCol}>
          <View style={styles.visualIconBox}>
            <Text style={{ fontSize: 24 }}>🗓️</Text>
          </View>
          <View style={{ gap: 2 }}>
            <View style={styles.badgeRow}>
              <Text style={styles.badgeCategoryText}>VISUAL JOURNALING</Text>
              <View style={styles.pillGreenBadge}>
                <Text style={styles.pillGreenText}>Dữ liệu thật & Database</Text>
              </View>
            </View>
            <Text style={styles.mainPageTitle}>Lịch Chi Tiêu & Nhật Ký Khoảnh Khắc</Text>
          </View>
        </View>

        {/* Right Actions: Month Switcher & Upload Button */}
        <View style={styles.headerRightCol}>
          <View style={styles.monthNavBox}>
            <TouchableOpacity
              style={styles.monthArrowBtn}
              onPress={handlePrevMonth}
              accessibilityLabel="Tháng trước"
            >
              <Text style={styles.monthArrowText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.monthTitleWrapper}>
              <Text style={styles.calendarMiniIcon}>📅</Text>
              <Text style={styles.monthNavTitle}>{currentMonthTitle}</Text>
            </View>

            <TouchableOpacity
              style={styles.monthArrowBtn}
              onPress={handleNextMonth}
              accessibilityLabel="Tháng sau"
            >
              <Text style={styles.monthArrowText}>›</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.topActionUploadBtn}
            onPress={() => handleOpenAddModal(selectedDateStr)}
            activeOpacity={0.85}
          >
            <Text style={styles.topActionUploadIcon}>➕</Text>
            <Text style={styles.topActionUploadText}>Thêm chi tiêu & ảnh...</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ==================== 2. ROW OF 4 STAT CARDS ==================== */}
      <View style={styles.statCardsRow}>
        {/* Card 1: Mascot Explorer */}
        <View style={[styles.statCard, styles.mascotCard]}>
          <View style={styles.mascotAvatarWrapper}>
            <Image
              source={require('../../../assets/frog-explorer.png')}
              style={styles.mascotAvatarImg}
              resizeMode="contain"
            />
            <View style={styles.mascotHdvBadge}>
              <Text style={styles.mascotHdvText}>HDV</Text>
            </View>
          </View>
          <View style={styles.mascotContentCol}>
            <Text style={styles.mascotTag}>NHẬT KÝ THÁM HIỂM VÍ TIỀN</Text>
            <Text style={styles.mascotTitle}>
              Tuyệt vời lắm, {user?.fullName || 'Nhà thám hiểm'}!
            </Text>
            <Text style={styles.mascotSubtitle} numberOfLines={2}>
              {stats.photoDaysCount > 0
                ? `Bạn đã lưu lại ${stats.photoDaysCount} khoảnh khắc thực tế trong tháng này.`
                : 'Mỗi bức ảnh là một mỏ neo cảm xúc giữ ngân sách luôn trong tầm kiểm soát.'}
            </Text>
          </View>
        </View>

        {/* Card 2: Tổng chi tháng */}
        <View style={styles.statCard}>
          <View style={styles.statCardTopRow}>
            <Text style={styles.statLabel}>TỔNG CHI THÁNG {currentMonth}</Text>
            <View style={[styles.statIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Text style={{ fontSize: 13 }}>💵</Text>
            </View>
          </View>
          <Text style={styles.statMainValue}>
            {formatVND(stats.totalMonthExpense)}
          </Text>
          <View style={styles.trendRow}>
            <Text style={styles.trendGreenText}>
              📊 {transactions.length} giao dịch đã ghi nhận
            </Text>
          </View>
        </View>

        {/* Card 3: Ngày có ảnh chi tiêu */}
        <View style={styles.statCard}>
          <View style={styles.statCardTopRow}>
            <Text style={styles.statLabel}>NGÀY CÓ ẢNH CHI TIÊU</Text>
            <View style={[styles.statIconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Text style={{ fontSize: 13 }}>📷</Text>
            </View>
          </View>
          <Text style={styles.statMainValue}>
            {stats.photoDaysCount}{' '}
            <Text style={styles.statSubValue}>/ {stats.totalDaysInMonth} ngày</Text>
          </Text>
          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${stats.photoPercent}%` }]} />
          </View>
        </View>

        {/* Card 4: Chuỗi liên tục */}
        <View style={styles.statCard}>
          <View style={styles.statCardTopRow}>
            <Text style={styles.statLabel}>CHUỖI LIÊN TỤC</Text>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFEDD5' }]}>
              <Text style={{ fontSize: 13 }}>🔥</Text>
            </View>
          </View>
          <Text style={styles.statMainValue}>
            <Text style={{ color: '#D97706' }}>{stats.streakDays}</Text>{' '}
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>
              ngày ghi chép liên tiếp
            </Text>
          </Text>
          <Text style={styles.recordSubText}>
            {stats.streakDays > 0 ? 'Duy trì phong độ tuyệt vời!' : 'Hãy ghi chép hôm nay để bắt đầu chuỗi!'}
          </Text>
        </View>
      </View>

      {/* ==================== 3. MAIN 2-COLUMN LAYOUT ==================== */}
      <View style={[styles.mainColumnsContainer, !isDesktop && { flexDirection: 'column' }]}>
        {/* ==================== LEFT COLUMN: BẢN ĐỒ THỊ GIÁC CHI TIÊU (~65%) ==================== */}
        <View style={[styles.leftCalendarCol, !isDesktop && { width: '100%' }]}>
          {/* Calendar Box Header */}
          <View style={styles.calCardHeader}>
            <View style={styles.calTitleLeft}>
              <Text style={styles.calCardTitle}>Bản Đồ Thị Giác Chi Tiêu</Text>
              <View style={styles.pillDaysBadge}>
                <Text style={styles.pillDaysText}>{stats.totalDaysInMonth} Ngày</Text>
              </View>
              {isLoading && (
                <ActivityIndicator size="small" color="#087F5B" style={{ marginLeft: 8 }} />
              )}
            </View>

            {/* Legend on Right */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Đã có ảnh</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E0E7FF' }]} />
                <Text style={styles.legendText}>Chưa có chi tiêu</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#047857' }]} />
                <Text style={styles.legendText}>Hôm nay</Text>
              </View>
            </View>
          </View>

          {/* Days of Week (T2 -> CN) */}
          <View style={styles.dayOfWeekRow}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((dow, idx) => (
              <View key={dow} style={styles.dayOfWeekCell}>
                <Text style={[styles.dayOfWeekText, idx === 6 && { color: '#EF4444' }]}>
                  {dow}
                </Text>
              </View>
            ))}
          </View>

          {/* 7-Columns Calendar Days Grid */}
          <View style={styles.calendarGrid}>
            {calendarCells.map((day, idx) => {
              const isSelected = day.fullDateStr === selectedDateStr;

              // Ngày tháng trước / tháng sau (mờ đi)
              if (!day.isCurrentMonth) {
                return (
                  <TouchableOpacity
                    key={`other-${day.fullDateStr}-${idx}`}
                    style={[styles.calCell, styles.calCellPrevMonth]}
                    onPress={() => handleSelectDay(day)}
                  >
                    <Text style={styles.prevMonthNum}>{day.dayNum}</Text>
                  </TouchableOpacity>
                );
              }

              // Ô CÓ ẢNH THẬT
              if (day.hasPhoto && day.photoUrl) {
                return (
                  <TouchableOpacity
                    key={`day-${day.fullDateStr}`}
                    style={[
                      styles.calCell,
                      styles.calCellWithPhoto,
                      isSelected && styles.calCellSelectedGlow,
                    ]}
                    onPress={() => handleSelectDay(day)}
                    activeOpacity={0.88}
                  >
                    <Image
                      source={{ uri: day.photoUrl }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                    {/* Dark gradient overlay */}
                    <View style={styles.photoOverlayGradient} />

                    {/* Top Row: Day Number & Amount Pill */}
                    <View style={styles.photoTopRow}>
                      <View style={styles.dayNumDarkPill}>
                        <Text style={styles.dayNumDarkText}>{day.dayNum}</Text>
                      </View>
                      <View style={styles.amountGreenPill}>
                        <Text style={styles.amountGreenText}>{day.amountDisplay}</Text>
                      </View>
                    </View>

                    {/* Bottom Info on Photo */}
                    <View style={styles.photoBottomInfo}>
                      <Text style={styles.photoTitleText} numberOfLines={1}>
                        {day.isToday ? `Hôm nay: ${day.photoTitle || '...'}` : day.photoTitle}
                      </Text>
                      <View style={styles.photoMetaRow}>
                        <Text style={styles.photoMetaText}>📷 1 ảnh</Text>
                        <TouchableOpacity
                          style={styles.todayMiniPlusBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenAddModal(day.fullDateStr);
                          }}
                        >
                          <Text style={styles.todayPlusText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              // Ô KHÔNG CÓ ẢNH (Bình thường)
              return (
                <TouchableOpacity
                  key={`day-${day.fullDateStr}`}
                  style={[
                    styles.calCell,
                    styles.calCellNormal,
                    isSelected && styles.calCellSelectedGlow,
                    day.isToday && styles.calCellTodayBorder,
                  ]}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.85}
                >
                  {/* Top: Day Num & Amount */}
                  <View style={styles.normalTopRow}>
                    <Text style={[styles.normalDayNum, day.isToday && { color: '#047857' }]}>
                      {day.dayNum}
                    </Text>
                    {day.amountDisplay && (
                      <Text
                        style={[
                          styles.normalAmountText,
                          day.amountDisplay === '0đ' && { color: '#059669', fontWeight: '700' },
                        ]}
                      >
                        {day.amountDisplay}
                      </Text>
                    )}
                  </View>

                  {/* Center: Category Icon */}
                  <View style={styles.normalCenterIconBox}>
                    <Text style={styles.normalCenterIcon}>
                      {day.categoryIcon || (day.isFutureOrUpcoming ? '📅' : '•')}
                    </Text>
                  </View>

                  {/* Bottom: Category Name & Mini add button */}
                  <View style={styles.normalBottomRow}>
                    <Text style={styles.normalCategoryName} numberOfLines={1}>
                      {day.categoryName || ''}
                    </Text>
                    {isSelected && (
                      <TouchableOpacity
                        style={styles.cellAddQuickBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleOpenAddModal(day.fullDateStr);
                        }}
                      >
                        <Text style={styles.cellAddQuickText}>+</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer of Calendar */}
          <View style={styles.calFooterRow}>
            <Text style={styles.calFooterTip}>
              💡 Bấm vào bất kỳ ô ngày nào để xem chi tiết, tải ảnh hóa đơn và thêm khoản chi
            </Text>
            <TouchableOpacity onPress={() => window.print?.()}>
              <Text style={styles.calFooterExportLink}>In / Xuất báo cáo lịch PDF →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================== RIGHT COLUMN: ĐANG XEM NHẬT KÝ (~35%) ==================== */}
        <View style={[styles.rightDetailsCol, !isDesktop && { width: '100%' }]}>
          {/* Card 1: Featured Photo & Date Header */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeaderRow}>
              <View>
                <Text style={styles.detailSubLabel}>ĐANG XEM NHẬT KÝ</Text>
                <Text style={styles.detailDateTitle}>
                  {getDayOfWeekName(new Date(activeDay.fullDateStr))}, {activeDay.dayNum} Tháng{' '}
                  {activeDay.month}, {activeDay.year}
                </Text>
              </View>
              {activeDay.isToday && (
                <View style={styles.pillTodayBadge}>
                  <Text style={styles.pillTodayText}>Hôm nay</Text>
                </View>
              )}
            </View>

            {/* Featured Photo Preview */}
            {activeDay.hasPhoto && activeDay.photoUrl ? (
              <View style={styles.featuredPhotoContainer}>
                <Image
                  source={{ uri: activeDay.photoUrl }}
                  style={styles.featuredPhotoImg}
                  resizeMode="cover"
                />
                <View style={styles.featuredAmountBadge}>
                  <Text style={styles.featuredAmountText}>
                    {activeDay.rawAmount ? formatVND(activeDay.rawAmount) : '0đ'}
                  </Text>
                </View>
                <View style={styles.featuredCategoryBadge}>
                  <Text style={styles.featuredCategoryText}>
                    {activeDay.photoCategoryTag || 'Ảnh hóa đơn & Khoảnh khắc'}
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.emptyPhotoNoticeBox}
                onPress={handleTriggerUploadFromDropzone}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 32 }}>📸</Text>
                <Text style={styles.emptyPhotoNoticeTitle}>Chưa có ảnh lưu niệm cho ngày này</Text>
                <Text style={styles.emptyPhotoNoticeSub}>
                  Bấm vào đây để tải lên ảnh hóa đơn / món ăn lưu vào database!
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Card 2: Cảm nhận chi tiêu (Emotion Note) */}
          <View style={styles.emotionCard}>
            <View style={styles.emotionHeaderRow}>
              <Text style={{ fontSize: 14 }}>💬</Text>
              <Text style={styles.emotionHeaderTitle}>Cảm nhận chi tiêu:</Text>
            </View>
            <Text style={styles.emotionQuoteText}>
              {activeDay.emotionQuote ||
                '“Ghi nhận chi tiêu thực tế mỗi ngày giúp bạn thấu hiểu thói quen và giữ tài chính luôn ổn định.”'}
            </Text>
          </View>

          {/* Card 3: Tải ảnh khoảnh khắc hoặc hóa đơn (Dropzone) */}
          <View style={styles.uploadDropCard}>
            <Text style={styles.uploadDropTitle}>Tải lên ảnh khoảnh khắc hoặc hóa đơn:</Text>
            <TouchableOpacity
              style={styles.dropzoneBox}
              onPress={handleTriggerUploadFromDropzone}
              activeOpacity={0.8}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#087F5B" />
                  <Text style={styles.dropzoneMainText}>Đang tải ảnh lên máy chủ...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.dropzoneIconWrapper}>
                    <Text style={{ fontSize: 22 }}>🖼️</Text>
                  </View>
                  <Text style={styles.dropzoneMainText}>Chọn ảnh từ máy tính</Text>
                  <Text style={styles.dropzoneSubText}>
                    Hỗ trợ định dạng JPG, PNG, WEBP (Lưu trực tiếp vào server)
                  </Text>
                  <View style={styles.devicePickBtn}>
                    <Text style={styles.devicePickBtnText}>Tải ảnh lên ngày {activeDay.dayNum} →</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Card 4: KHOẢN CHI CỤ THỂ */}
          <View style={styles.itemsListCard}>
            <View style={styles.itemsListHeaderRow}>
              <Text style={styles.itemsListTitle}>
                KHOẢN CHI CỤ THỂ ({activeDay.items.length})
              </Text>
              <TouchableOpacity onPress={() => handleOpenAddModal(activeDay.fullDateStr)}>
                <Text style={styles.itemsAddLink}>+ Thêm khoản khác</Text>
              </TouchableOpacity>
            </View>

            {activeDay.items && activeDay.items.length > 0 ? (
              <View style={styles.itemsListGroup}>
                {activeDay.items.map((item) => (
                  <View key={item.id} style={styles.transactionItemRow}>
                    <View style={[styles.itemIconCircle, { backgroundColor: item.iconBg }]}>
                      <Text style={{ fontSize: 16 }}>{item.iconText}</Text>
                    </View>
                    <View style={styles.itemInfoCol}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    </View>
                    <View style={styles.itemRightCol}>
                      <Text
                        style={[
                          styles.itemAmount,
                          item.type === 'income' && { color: '#059669' },
                        ]}
                      >
                        {item.amount}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteTransaction(item.id, item.title, item.amount, item.category)}
                        style={styles.trashBtn}
                        accessibilityLabel="Xóa khoản này"
                      >
                        <Text style={{ fontSize: 14 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingVertical: 16, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 24 }}>🍃</Text>
                <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>
                  Chưa có khoản chi tiêu nào cho ngày này
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => handleOpenAddModal(activeDay.fullDateStr)}
                >
                  <Text style={styles.emptyAddBtnText}>+ Thêm giao dịch đầu tiên</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Lời khen từ Ếch Monett */}
            <View style={styles.frogPraiseCard}>
              <View style={styles.frogPraiseIconBox}>
                <Text style={{ fontSize: 18 }}>✨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.frogPraiseTitle}>Lời khen từ Ếch Monett:</Text>
                <Text style={styles.frogPraiseQuote}>
                  {activeDay.items.length > 0
                    ? '“Bạn đã ghi nhận chi tiêu minh bạch! Giữ vững thói quen nhé!”'
                    : '“Một ngày thong dong không tiêu xài hoang phí, ví tiền cảm ơn bạn!”'}
                </Text>
              </View>
            </View>
          </View>

          {/* Card 5: Mẹo chi tiêu thị giác */}
          <View style={styles.visualTipCard}>
            <View style={styles.visualTipIconBox}>
              <Text style={{ fontSize: 16 }}>💡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.visualTipTitle}>Mẹo chi tiêu thị giác:</Text>
              <Text style={styles.visualTipText}>
                Chụp ảnh món hàng bạn muốn mua và lưu vào Monett 48 tiếng trước khi thanh toán để
                giảm 30% chi tiêu cảm tính.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* MODAL THÊM GIAO DỊCH VÀ ẢNH THẬT LƯU VÀO DATABASE */}
      {/* ============================================================ */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Thêm Khoản Chi & Khoảnh Khắc</Text>
                <Text style={styles.modalSubTitle}>
                  Lưu vào ngày: <Text style={{ fontWeight: '700', color: '#087F5B' }}>{formTargetDate}</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Loại giao dịch: Chi tiêu vs Thu nhập */}
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.typeToggleBtn,
                  formType === 'expense' && styles.typeToggleActiveExpense,
                ]}
                onPress={() => setFormType('expense')}
              >
                <Text
                  style={[
                    styles.typeToggleText,
                    formType === 'expense' && styles.typeToggleTextActive,
                  ]}
                >
                  💸 Chi tiêu (-)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeToggleBtn,
                  formType === 'income' && styles.typeToggleActiveIncome,
                ]}
                onPress={() => setFormType('income')}
              >
                <Text
                  style={[
                    styles.typeToggleText,
                    formType === 'income' && styles.typeToggleTextActive,
                  ]}
                >
                  💰 Thu nhập (+)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Tiêu đề */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tên khoản chi / thu *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="VD: Cơm trưa văn phòng, Cà phê sáng..."
                value={formTitle}
                onChangeText={setFormTitle}
              />
            </View>

            {/* Input Số tiền */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Số tiền (VNĐ) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="VD: 45000"
                keyboardType="numeric"
                value={formAmount}
                onChangeText={setFormAmount}
              />
              {formAmount.length > 0 && !isNaN(Number(formAmount)) && (
                <Text style={styles.amountHelperText}>
                  = {formatVND(Number(formAmount))}
                </Text>
              )}
            </View>

            {/* Chọn Danh mục */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Danh mục</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollList}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = formCategory === cat.name;
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[
                        styles.catPillBtn,
                        isSelected && { backgroundColor: cat.bg, borderColor: cat.textCol },
                      ]}
                      onPress={() => {
                        setFormCategory(cat.name);
                        setFormCategoryIcon(cat.icon);
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                      <Text
                        style={[
                          styles.catPillText,
                          isSelected && { color: cat.textCol, fontWeight: '800' },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Chọn / Tải ảnh thật */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ảnh khoảnh khắc / Hóa đơn</Text>
              {formPhotoUri ? (
                <View style={styles.modalPhotoPreviewBox}>
                  <Image
                    source={{ uri: normalizeAvatarUrl(formPhotoUri) }}
                    style={styles.modalPhotoImg}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.modalPhotoRemoveBtn}
                    onPress={() => {
                      setFormPhotoUri('');
                      setUploadStatusMsg('');
                    }}
                  >
                    <Text style={styles.modalPhotoRemoveText}>Xóa ảnh ✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={styles.modalUploadPickBtn}
                    onPress={async () => {
                      await pickAndProcessPhoto();
                    }}
                    disabled={isUploadingPhoto}
                  >
                    {isUploadingPhoto ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color="#087F5B" />
                        <Text style={styles.modalUploadPickText}>Đang đọc ảnh...</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={{ fontSize: 18 }}>📁</Text>
                        <Text style={styles.modalUploadPickText}>
                          Chọn ảnh từ máy tính (JPG, PNG, WEBP)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Hoặc nhập URL ảnh trực tiếp */}
                  <View style={styles.urlInputRow}>
                    <TextInput
                      style={styles.urlInputField}
                      placeholder="Hoặc dán link ảnh (https://...)"
                      value={formUrlInput}
                      onChangeText={setFormUrlInput}
                    />
                    <TouchableOpacity
                      style={styles.urlApplyBtn}
                      onPress={() => {
                        if (formUrlInput.trim()) {
                          setFormPhotoUri(formUrlInput.trim());
                          setUploadStatusMsg('✅ Đã nhận link ảnh');
                          setFormUrlInput('');
                        }
                      }}
                    >
                      <Text style={styles.urlApplyBtnText}>Áp dụng</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {uploadStatusMsg ? (
                <Text style={styles.uploadStatusText}>{uploadStatusMsg}</Text>
              ) : null}
            </View>

            {/* Input Ghi chú / Cảm nhận */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Cảm nhận / Ghi chú (tùy chọn)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="VD: Bữa trưa ăn cùng đồng nghiệp, đồ ăn rất ngon miệng..."
                multiline
                numberOfLines={2}
                value={formNote}
                onChangeText={setFormNote}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveTransaction}
                disabled={isSubmitting || isUploadingPhoto}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Lưu chi tiêu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal xác nhận xóa giao dịch */}
      <ConfirmDeleteModal
        visible={Boolean(deletingTx)}
        itemTitle={deletingTx?.title}
        itemAmount={deletingTx?.amount}
        itemCategory={deletingTx?.category}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTx(null)}
      />
    </ScrollView>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  scrollWrapper: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
    width: '100%',
    gap: 20,
  },

  // Toast feedback
  feedbackToast: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  toastSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  toastError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Top header banner
  topHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  visualIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeCategoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  pillGreenBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pillGreenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  mainPageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthNavBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  monthArrowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  monthArrowText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#087F5B',
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  calendarMiniIcon: {
    fontSize: 14,
  },
  monthNavTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  topActionUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#087F5B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#087F5B',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  topActionUploadIcon: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  topActionUploadText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Stat cards row
  statCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 230,
    backgroundColor: '#F5F0E8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  mascotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F7FA',
    borderColor: '#E0E7ED',
    gap: 14,
  },
  mascotAvatarWrapper: {
    width: 60,
    height: 60,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotAvatarImg: {
    width: 58,
    height: 58,
  },
  mascotHdvBadge: {
    position: 'absolute',
    bottom: -2,
    left: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  mascotHdvText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  mascotContentCol: {
    flex: 1,
    gap: 2,
  },
  mascotTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0D9488',
    letterSpacing: 0.5,
  },
  mascotTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  mascotSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  statCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statMainValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  statSubValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendGreenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#087F5B',
    borderRadius: 3,
  },
  recordSubText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Main columns
  mainColumnsContainer: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  leftCalendarCol: {
    flex: 6.5,
    backgroundColor: '#F5F0E8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  calCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
  },
  calTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  pillDaysBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillDaysText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  dayOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayOfWeekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calCell: {
    width: Platform.OS === 'web' ? ('calc((100% - 48px) / 7)' as any) : '13.1%',
    minHeight: 136,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  calCellPrevMonth: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  prevMonthNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  calCellNormal: {
    backgroundColor: '#F1F4F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calCellTodayBorder: {
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  calCellWithPhoto: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  calCellSelectedGlow: {
    borderColor: '#059669',
    borderWidth: 2,
    shadowColor: '#059669',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  normalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  normalDayNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  normalAmountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  normalCenterIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  normalCenterIcon: {
    fontSize: 22,
  },
  normalBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  normalCategoryName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  cellAddQuickBtn: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellAddQuickText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginTop: -1,
  },
  photoOverlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  photoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  dayNumDarkPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayNumDarkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  amountGreenPill: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  amountGreenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  photoBottomInfo: {
    zIndex: 2,
    gap: 2,
  },
  photoTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoMetaText: {
    fontSize: 10,
    color: '#E2E8F0',
  },
  todayMiniPlusBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayPlusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: -1,
  },
  calFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  calFooterTip: {
    fontSize: 12,
    color: '#64748B',
  },
  calFooterExportLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#087F5B',
  },

  // Right column
  rightDetailsCol: {
    flex: 3.5,
    gap: 14,
  },
  detailCard: {
    backgroundColor: '#F5F0E8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#087F5B',
    letterSpacing: 0.8,
  },
  detailDateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  pillTodayBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  featuredPhotoContainer: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredPhotoImg: {
    width: '100%',
    height: '100%',
  },
  featuredAmountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredAmountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  featuredCategoryBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredCategoryText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  emptyPhotoNoticeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyPhotoNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  emptyPhotoNoticeSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  emotionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    gap: 8,
  },
  emotionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emotionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  emotionQuoteText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  uploadDropCard: {
    backgroundColor: '#F5F0E8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    padding: 16,
    gap: 10,
  },
  uploadDropTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  dropzoneBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  dropzoneIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  dropzoneMainText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  dropzoneSubText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  devicePickBtn: {
    marginTop: 6,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  devicePickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#087F5B',
  },
  itemsListCard: {
    backgroundColor: '#F5F0E8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    padding: 16,
    gap: 12,
  },
  itemsListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsListTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  itemsAddLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#087F5B',
  },
  itemsListGroup: {
    gap: 10,
  },
  transactionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  itemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfoCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  itemRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  trashBtn: {
    padding: 4,
  },
  emptyAddBtn: {
    backgroundColor: '#087F5B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  frogPraiseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  frogPraiseIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frogPraiseTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  frogPraiseQuote: {
    fontSize: 11,
    color: '#065F46',
    fontStyle: 'italic',
  },
  visualTipCard: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  visualTipIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  visualTipTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#3730A3',
  },
  visualTipText: {
    fontSize: 11,
    color: '#4338CA',
    lineHeight: 16,
    marginTop: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
  },
  typeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeToggleActiveExpense: {
    backgroundColor: '#FEE2E2',
  },
  typeToggleActiveIncome: {
    backgroundColor: '#DCFCE7',
  },
  typeToggleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  typeToggleTextActive: {
    color: '#0F172A',
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  formTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  amountHelperText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  categoryScrollList: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  catPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  catPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  modalPhotoPreviewBox: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalPhotoImg: {
    width: '100%',
    height: '100%',
  },
  modalPhotoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalPhotoRemoveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalUploadPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 14,
  },
  modalUploadPickText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#087F5B',
    shadowColor: '#087F5B',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  urlInputField: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
  },
  urlApplyBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  urlApplyBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  uploadStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginTop: 4,
  },
});
