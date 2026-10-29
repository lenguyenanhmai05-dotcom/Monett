import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getInitialDayRecordsFromLocalStorage,
  subscribeCalendarUpdates,
  DayExpenseRecord,
  ExpenseItem,
  isIncomeTransactionOrItem,
} from '../services/calendarStorage';

export interface PhotoMomentItem {
  id: string;
  photoUri: string;
  amount: number;
  category: string;
  categoryIcon?: string;
  title: string;
  note?: string;
  date: string; // YYYY-MM-DD
  dayNum: number;
  monthNum: number;
  yearNum: number;
  isReceipt?: boolean;
}

export interface PhotoJournalModalProps {
  visible: boolean;
  onClose: () => void;
  transactions?: any[];
  initialMonth?: number; // 1-12
  initialYear?: number;
  onNavigateToCamera?: () => void;
  onSelectTransaction?: (transactionId: string) => void;
}

const WASHI_TAPE_COLORS = [
  '#FDE68A', // Vàng nhạt (như Hình 1 mục 1)
  '#A7F3D0', // Xanh bạc hà (như Hình 1 mục 2)
  '#FED7AA', // Cam mơ nhạt (như Hình 1 mục 3)
  '#DDD6FE', // Tím nhạt
  '#FECDD3', // Hồng phấn
  '#BAE6FD', // Xanh da trời nhạt
];

const getCategoryEmoji = (category: string): string => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('hóa đơn') || cat.includes('bill')) return '📱';
  if (cat.includes('giải trí') || cat.includes('game') || cat.includes('quẩy')) return '🎮';
  if (cat.includes('ăn uống') || cat.includes('food') || cat.includes('bún') || cat.includes('phở') || cat.includes('cơm')) return '🍜';
  if (cat.includes('cà phê') || cat.includes('coffee') || cat.includes('trà')) return '☕';
  if (cat.includes('mua sắm') || cat.includes('shopping')) return '🛍️';
  if (cat.includes('di chuyển') || cat.includes('xăng') || cat.includes('xe') || cat.includes('transport')) return '🛵';
  if (cat.includes('đi chợ') || cat.includes('siêu thị') || cat.includes('market')) return '🛒';
  if (cat.includes('làm đẹp') || cat.includes('mỹ phẩm') || cat.includes('beauty')) return '💄';
  if (cat.includes('học tập') || cat.includes('sách') || cat.includes('education')) return '📚';
  if (cat.includes('sức khỏe') || cat.includes('thuốc') || cat.includes('health')) return '💊';
  if (cat.includes('gia đình') || cat.includes('nhà')) return '🏠';
  return '🏷️';
};

const formatVND = (num: number): string => {
  return `${Math.abs(num || 0).toLocaleString('vi-VN')} đ`;
};

// =========================================================================
// MODAL CHI TIẾT ẢNH FULLSCREEN (KHỚP 100% HÌNH 2)
// =========================================================================
interface PhotoDetailViewerProps {
  visible: boolean;
  item: PhotoMomentItem | null;
  onClose: () => void;
}

const PhotoDetailViewer: React.FC<PhotoDetailViewerProps> = ({ visible, item, onClose }) => {
  const insets = useSafeAreaInsets();
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    if (visible) {
      setZoomLevel(1);
      scaleAnim.setValue(1);
      pan.setValue({ x: 0, y: 0 });
    }
  }, [visible, item]);

  const applyZoom = (newZoom: number) => {
    const clamped = Math.max(1, Math.min(3.5, newZoom));
    setZoomLevel(clamped);
    Animated.spring(scaleAnim, {
      toValue: clamped,
      useNativeDriver: true,
      friction: 7,
    }).start();
    if (clamped === 1) {
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
      }).start();
    }
  };

  const handleZoomIn = () => applyZoom(zoomLevel + 0.5);
  const handleZoomOut = () => applyZoom(zoomLevel - 0.5);
  const handleResetZoom = () => applyZoom(1);

  // Double tap to zoom
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (zoomLevel > 1) {
        handleResetZoom();
      } else {
        applyZoom(2);
      }
    }
    lastTapRef.current = now;
  };

  if (!item) return null;

  const displayTitle = item.note || item.title || item.category;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.detailContainer, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* 1. TOP HEADER (Khớp 100% hình 2) */}
        <View style={styles.detailHeader}>
          <View style={styles.detailHeaderLeft}>
            {/* Tag ĐÃ ĐÍNH KÈM HÓA ĐƠN màu xanh lá */}
            <View style={styles.detailTagRow}>
              <Ionicons name="card-outline" size={13} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.detailTagText}>
                {item.isReceipt !== false ? 'ĐÃ ĐÍNH KÈM HÓA ĐƠN' : 'ẢNH KHOẢNH KHẮC CHI TIÊU'}
              </Text>
            </View>

            {/* Tiêu đề: Danh mục • "Tên/Ghi chú" • Số tiền */}
            <Text style={styles.detailTitle} numberOfLines={1}>
              {item.category} • "{displayTitle}" • {formatVND(item.amount)}
            </Text>

            {/* Ngày: 📅 YYYY-MM-DD */}
            <View style={styles.detailDateRow}>
              <Ionicons name="calendar-outline" size={13} color="#94A3B8" style={{ marginRight: 5 }} />
              <Text style={styles.detailDateText}>{item.date}</Text>
            </View>
          </View>

          {/* Nút đóng tròn hình chữ X bên phải */}
          <TouchableOpacity
            style={styles.detailCloseBtn}
            onPress={onClose}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 2. KHUNG HIỂN THỊ ẢNH TRUNG TÂM */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDoubleTap}
          style={styles.detailImageWrapper}
        >
          <Animated.Image
            source={{ uri: item.photoUri }}
            style={[
              styles.detailFullImage,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateX: pan.x },
                  { translateY: pan.y },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* 3. THANH ĐIỀU KHIỂN DƯỚI ĐÁY (Khớp 100% hình 2) */}
        <SafeAreaView edges={['bottom']} style={styles.detailBottomBar}>
          {/* Gợi ý tương tác: ✨ Chụm 2 ngón hoặc chạm đúp để zoom • Kéo để di chuyển */}
          <View style={styles.detailHintPill}>
            <Ionicons name="sparkles" size={12} color="#10B981" style={{ marginRight: 5 }} />
            <Text style={styles.detailHintText}>
              Chụm 2 ngón hoặc chạm đúp để zoom • Kéo để di chuyển
            </Text>
          </View>

          {/* Bộ 3 nút zoom: [ 🔍- ] [ 100% ] [ 🔍+ ] */}
          <View style={styles.detailZoomControlsRow}>
            <TouchableOpacity
              style={styles.detailZoomBtn}
              onPress={handleZoomOut}
              activeOpacity={0.7}
              disabled={zoomLevel <= 1}
            >
              <Ionicons name="remove" size={18} color={zoomLevel <= 1 ? '#64748B' : '#FFFFFF'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.detailZoomPercentBtn}
              onPress={handleResetZoom}
              activeOpacity={0.7}
            >
              <Text style={styles.detailZoomPercentText}>
                {Math.round(zoomLevel * 100)}%
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.detailZoomBtn}
              onPress={handleZoomIn}
              activeOpacity={0.7}
              disabled={zoomLevel >= 3.5}
            >
              <Ionicons name="add" size={18} color={zoomLevel >= 3.5 ? '#64748B' : '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

// =========================================================================
// MÀN HÌNH CHÍNH: NHẬT KÝ ẢNH CHI TIÊU (KHỚP 100% HÌNH 1)
// =========================================================================
export const PhotoJournalModal: React.FC<PhotoJournalModalProps> = ({
  visible,
  onClose,
  transactions = [],
  initialMonth,
  initialYear,
  onNavigateToCamera,
  onSelectTransaction,
}) => {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(initialYear || today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialMonth || today.getMonth() + 1);

  // Bộ lọc thời gian: 0: Cả tháng, 1: Tuần 1 (1-7), 2: Tuần 2 (8-14), 3: Tuần 3 (15-21), 4: Tuần 4 (22-28), 5: Tuần 5 (29-end)
  const [selectedWeek, setSelectedWeek] = useState<number>(0);

  // Bộ lọc danh mục: 'all' hoặc tên danh mục cụ thể
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Chế độ xem: 'list' (danh sách dòng thời gian) | 'grid' (lưới ảnh)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modal xem chi tiết ảnh
  const [viewingItem, setViewingItem] = useState<PhotoMomentItem | null>(null);

  // Đồng bộ dayRecords thực tế từ local storage
  const [dayRecords, setDayRecords] = useState<Record<string, DayExpenseRecord>>(() =>
    getInitialDayRecordsFromLocalStorage()
  );

  useEffect(() => {
    const unsub = subscribeCalendarUpdates((updated) => {
      setDayRecords(updated);
    });
    return unsub;
  }, []);

  // Tổng hợp dữ liệu ảnh THỰC TẾ (100% Không dữ liệu mẫu)
  const allPhotoMoments = useMemo<PhotoMomentItem[]>(() => {
    const result: PhotoMomentItem[] = [];
    const seenIds = new Set<string>();

    const isValidPhoto = (url?: string) => {
      if (!url || typeof url !== 'string') return false;
      const clean = url.trim();
      return clean.length > 0 && !clean.includes('unsplash.com');
    };

    // 1. Quét từ danh sách transactions thực tế của người dùng
    if (Array.isArray(transactions) && transactions.length > 0) {
      transactions.forEach((tx: any) => {
        if (!tx) return;
        if (isIncomeTransactionOrItem(tx)) return; // Chỉ lấy khoản chi tiêu
        const photo = tx.photoUri || tx.receiptUrl || tx.image || tx.attachmentUrl;
        if (!isValidPhoto(photo)) return;

        const txDate = tx.date ? new Date(tx.date) : (tx.createdAt ? new Date(tx.createdAt) : null);
        if (!txDate || isNaN(txDate.getTime())) return;

        const y = txDate.getFullYear();
        const m = txDate.getMonth() + 1;
        const d = txDate.getDate();

        if (y === viewYear && m === viewMonth) {
          const id = String(tx._id || tx.id || `tx-${txDate.getTime()}-${d}`);
          if (!seenIds.has(id)) {
            seenIds.add(id);
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            result.push({
              id,
              photoUri: photo,
              amount: Math.abs(tx.amount || tx.rawAmount || 0),
              category: tx.category || (isVi ? 'Hóa đơn' : 'Bill'),
              categoryIcon: tx.categoryIcon,
              title: tx.title || tx.note || tx.category || (isVi ? 'Khoản chi' : 'Expense'),
              note: tx.note || tx.title || '',
              date: dateStr,
              dayNum: d,
              monthNum: m,
              yearNum: y,
              isReceipt: Boolean(tx.isReceipt || tx.receiptUrl || tx.category === 'Hóa đơn'),
            });
          }
        }
      });
    }

    // 2. Quét từ dayRecords trong LocalStorage (cho các khoản chi vừa lưu trên mobile)
    if (dayRecords && typeof dayRecords === 'object') {
      Object.entries(dayRecords).forEach(([key, rec]) => {
        if (!rec) return;
        const parts = key.split('-');
        if (parts.length < 3) return;
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);

        if (y === viewYear && m === viewMonth) {
          // A. Duyệt từng item trong rec.items
          if (Array.isArray(rec.items) && rec.items.length > 0) {
            rec.items.forEach((it: ExpenseItem) => {
              if (isIncomeTransactionOrItem(it)) return;
              if (isValidPhoto(it.photoUri)) {
                const itId = String(it.id || `local-${key}-${it.amount}`);
                if (!seenIds.has(itId)) {
                  seenIds.add(itId);
                  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  result.push({
                    id: itId,
                    photoUri: it.photoUri!,
                    amount: Math.abs(it.amount || 0),
                    category: it.category || rec.category || (isVi ? 'Chi tiêu' : 'Expense'),
                    categoryIcon: it.categoryIcon || rec.categoryIcon,
                    title: it.title || it.note || it.category || (isVi ? 'Khoản chi' : 'Expense'),
                    note: it.note || it.title || '',
                    date: dateStr,
                    dayNum: d,
                    monthNum: m,
                    yearNum: y,
                    isReceipt: true,
                  });
                }
              }
            });
          }

          // B. Nếu cả ngày có rec.photoUri mà chưa có item nào trùng ảnh đó
          if (isValidPhoto(rec.photoUri)) {
            const hasSamePhoto = result.some((r) => r.photoUri === rec.photoUri && r.dayNum === d);
            if (!hasSamePhoto) {
              const dayId = `rec-day-${key}`;
              if (!seenIds.has(dayId)) {
                seenIds.add(dayId);
                const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                result.push({
                  id: dayId,
                  photoUri: rec.photoUri!,
                  amount: Math.abs(rec.amount || 0),
                  category: rec.category || (isVi ? 'Hóa đơn' : 'Bill'),
                  categoryIcon: rec.categoryIcon,
                  title: rec.note || rec.category || (isVi ? 'Khoản chi ngày' : 'Day Expense'),
                  note: rec.note || '',
                  date: dateStr,
                  dayNum: d,
                  monthNum: m,
                  yearNum: y,
                  isReceipt: true,
                });
              }
            }
          }
        }
      });
    }

    // Sắp xếp ngày mới nhất lên đầu (Giống hệt Hình 1: 28 T10 -> 26 T10 -> 21 T10)
    result.sort((a, b) => {
      if (b.dayNum !== a.dayNum) return b.dayNum - a.dayNum;
      return b.amount - a.amount;
    });

    return result;
  }, [transactions, dayRecords, viewYear, viewMonth, isVi]);

  // Phân chia tuần theo tiêu chuẩn Hình 1:
  // Tuần 1: 1 - 7, Tuần 2: 8 - 14, Tuần 3: 15 - 21, Tuần 4: 22 - 28, Tuần 5: 29 - cuối tháng
  const daysInCurrentMonth = useMemo(() => {
    return new Date(viewYear, viewMonth, 0).getDate();
  }, [viewYear, viewMonth]);

  const weekTabs = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0]; // Index 0: all, 1..5: weeks
    allPhotoMoments.forEach((item) => {
      counts[0]++;
      if (item.dayNum <= 7) counts[1]++;
      else if (item.dayNum <= 14) counts[2]++;
      else if (item.dayNum <= 21) counts[3]++;
      else if (item.dayNum <= 28) counts[4]++;
      else counts[5]++;
    });

    return [
      { id: 0, label: `Cả tháng (${counts[0]})`, count: counts[0] },
      { id: 1, label: `Tuần 1 (1 – 7) • ${counts[1]}`, count: counts[1] },
      { id: 2, label: `Tuần 2 (8 – 14) • ${counts[2]}`, count: counts[2] },
      { id: 3, label: `Tuần 3 (15 – 21) • ${counts[3]}`, count: counts[3] },
      { id: 4, label: `Tuần 4 (22 – 28) • ${counts[4]}`, count: counts[4] },
      { id: 5, label: `Tuần 5 (29 – ${daysInCurrentMonth}) • ${counts[5]}`, count: counts[5] },
    ];
  }, [allPhotoMoments, daysInCurrentMonth]);

  // Danh sách các danh mục có ảnh trong tháng
  const categoryTabs = useMemo(() => {
    const catMap = new Map<string, number>();
    allPhotoMoments.forEach((item) => {
      const cat = item.category || (isVi ? 'Khác' : 'Other');
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });

    const list: { id: string; label: string; count: number; emoji: string }[] = [
      { id: 'all', label: isVi ? 'Tất cả' : 'All', count: allPhotoMoments.length, emoji: '' },
    ];

    catMap.forEach((cnt, catName) => {
      list.push({
        id: catName,
        label: `${getCategoryEmoji(catName)} ${catName} (${cnt})`,
        count: cnt,
        emoji: getCategoryEmoji(catName),
      });
    });

    return list;
  }, [allPhotoMoments, isVi]);

  // Lọc danh sách hiển thị theo Tuần và Danh mục đã chọn
  const filteredMoments = useMemo(() => {
    return allPhotoMoments.filter((item) => {
      // 1. Lọc tuần
      if (selectedWeek === 1 && (item.dayNum < 1 || item.dayNum > 7)) return false;
      if (selectedWeek === 2 && (item.dayNum < 8 || item.dayNum > 14)) return false;
      if (selectedWeek === 3 && (item.dayNum < 15 || item.dayNum > 21)) return false;
      if (selectedWeek === 4 && (item.dayNum < 22 || item.dayNum > 28)) return false;
      if (selectedWeek === 5 && item.dayNum < 29) return false;

      // 2. Lọc danh mục
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      return true;
    });
  }, [allPhotoMoments, selectedWeek, selectedCategory]);

  // Tổng số tiền của các ảnh được lọc
  const totalFilteredAmount = useMemo(() => {
    return filteredMoments.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredMoments]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedWeek(0);
    setSelectedCategory('all');
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedWeek(0);
    setSelectedCategory('all');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Khoảng cách đỉnh và vùng chạm để đóng */}
        <TouchableOpacity
          style={styles.backdropDismissArea}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Khung nội dung chính cách ra ở trên và bo tròn 2 góc như Hình 3 */}
        <View style={styles.sheetContainer}>
          {/* ============================================================ */}
          {/* 1. HEADER (Khớp 100% hình 1: Icon Album + Tiêu đề + Nút X)   */}
          {/* ============================================================ */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Icon Album xanh lá bo góc */}
              <View style={styles.headerIconBox}>
                <Ionicons name="images-outline" size={22} color="#059669" />
              </View>
              <View style={styles.headerTitleCol}>
                <Text style={styles.headerTitle}>
                  {isVi ? 'Nhật Ký Ảnh Chi Tiêu' : 'Photo Expense Journal'}
                </Text>
                <View style={styles.monthSelectorRow}>
                  <Ionicons name="calendar-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.headerSubtitle}>
                    {isVi ? `tháng ${viewMonth} năm ${viewYear}` : `Month ${viewMonth}, ${viewYear}`}
                  </Text>
                  {/* Nút lùi / tiến tháng tinh tế */}
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 6 }}
                  >
                    <Ionicons name="chevron-back" size={13} color="#64748B" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleNextMonth}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 4 }}
                  >
                    <Ionicons name="chevron-forward" size={13} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Nút X tròn góc trên bên phải để out ra ngoài */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Wrapper nội dung có SafeAreaView cho đáy */}
          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>

        {/* ============================================================ */}
        {/* 2. SUB-HEADER: BADGE THỐNG KÊ & CHẾ ĐỘ XEM (LIST / GRID)     */}
        {/* ============================================================ */}
        <View style={styles.subHeaderRow}>
          {/* Badge: 📷 X khoảnh khắc • Y đ */}
          <View style={styles.statsPill}>
            <Ionicons name="camera-outline" size={14} color="#334155" style={{ marginRight: 6 }} />
            <Text style={styles.statsPillText}>
              {filteredMoments.length} {isVi ? 'khoảnh khắc' : 'moments'} • {formatVND(totalFilteredAmount)}
            </Text>
          </View>

          {/* Toggle chuyển chế độ Danh sách ☰ và Lưới ⊞ */}
          <View style={styles.viewModeToggle}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="reorder-two-outline"
                size={18}
                color={viewMode === 'list' ? '#FFFFFF' : '#64748B'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('grid')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="grid-outline"
                size={15}
                color={viewMode === 'grid' ? '#FFFFFF' : '#64748B'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 3. BỘ LỌC 1: THỜI GIAN (CẢ THÁNG / TUẦN 1 -> 5)              */}
        {/* ============================================================ */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {weekTabs.map((tab) => {
              const isActive = selectedWeek === tab.id;
              return (
                <TouchableOpacity
                  key={`week-${tab.id}`}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedWeek(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* 4. BỘ LỌC 2: DANH MỤC (TẤT CẢ / HÓA ĐƠN / GIẢI TRÍ /...)      */}
        {/* ============================================================ */}
        <View style={styles.filterSectionSecond}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {categoryTabs.map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <TouchableOpacity
                  key={`cat-${tab.id}`}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* 5. NỘI DUNG CHÍNH: DÒNG THỜI GIAN / LƯỚI ẢNH                 */}
        {/* ============================================================ */}
        {filteredMoments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="camera-outline" size={44} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>
              {isVi ? 'Chưa có ảnh chi tiêu nào' : 'No photo expenses yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isVi
                ? `Chưa có khoảnh khắc ảnh nào trong tháng ${viewMonth}/${viewYear}. Hãy chụp ảnh hóa đơn hoặc đính kèm khi chi tiêu để lưu nhật ký nhé!`
                : `No photo moments found in ${viewMonth}/${viewYear}. Take photos of your receipts or moments to keep your visual diary!`}
            </Text>
            {onNavigateToCamera ? (
              <TouchableOpacity
                style={styles.emptyCameraBtn}
                onPress={onNavigateToCamera}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyCameraBtnText}>
                  {isVi ? '+ Chụp ảnh chi tiêu ngay' : '+ Snap photo now'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : viewMode === 'list' ? (
          // ================= DÒNG THỜI GIAN (LIST VIEW KHỚP 100% HÌNH 1) =================
          <ScrollView
            style={styles.timelineScrollView}
            contentContainerStyle={styles.timelineContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Đường trục timeline xám chạy dọc */}
            <View style={styles.timelineVerticalLine} />

            {filteredMoments.map((item, index) => {
              const tapeColor = WASHI_TAPE_COLORS[index % WASHI_TAPE_COLORS.length];
              const displayDateOverlay = `${item.dayNum} T${item.monthNum}`;
              const noteText = item.note || item.title || item.category;

              return (
                <View key={item.id} style={styles.timelineRow}>
                  {/* Nút điểm mốc Node hình tròn xanh có tâm chấm tròn (◎) */}
                  <View style={styles.timelineNodeWrapper}>
                    <View style={styles.timelineNodeOuter}>
                      <View style={styles.timelineNodeInner} />
                    </View>
                  </View>

                  {/* Thẻ Scrapbook có băng keo dán (Washi Tape) ở trên đầu */}
                  <View style={styles.cardWrapper}>
                    {/* Băng dính Washi Tape trang trí */}
                    <View
                      style={[
                        styles.washiTape,
                        {
                          backgroundColor: tapeColor,
                          transform: [{ rotate: index % 2 === 0 ? '-1.5deg' : '1.5deg' }],
                        },
                      ]}
                    />

                    {/* Thân thẻ nội dung chính */}
                    <TouchableOpacity
                      style={styles.momentCard}
                      activeOpacity={0.9}
                      onPress={() => setViewingItem(item)}
                    >
                      {/* Cột trái: Ảnh Thumbnail + Tag ngày + Nút con mắt */}
                      <View style={styles.photoThumbWrapper}>
                        <Image
                          source={{ uri: item.photoUri }}
                          style={styles.photoThumbImage}
                          resizeMode="cover"
                        />

                        {/* Tag ngày trên góc trái ảnh: [28 T10] */}
                        <View style={styles.photoDateBadge}>
                          <Text style={styles.photoDateBadgeText}>{displayDateOverlay}</Text>
                        </View>

                        {/* Nút con mắt góc dưới phải ảnh */}
                        <View style={styles.photoEyeBadge}>
                          <Ionicons name="eye-outline" size={13} color="#FFFFFF" />
                        </View>
                      </View>

                      {/* Cột phải: Thông tin chi tiêu */}
                      <View style={styles.cardInfoCol}>
                        {/* Hàng 1: Danh mục + Icon và Ngày YYYY-MM-DD */}
                        <View style={styles.cardHeaderRow}>
                          <View style={styles.cardCategoryGroup}>
                            <Text style={styles.cardCategoryIcon}>
                              {getCategoryEmoji(item.category)}
                            </Text>
                            <Text style={styles.cardCategoryTitle} numberOfLines={1}>
                              {item.category}
                            </Text>
                          </View>
                          <Text style={styles.cardDateText}>{item.date}</Text>
                        </View>

                        {/* Hàng 2: Ghi chú ✨ "Bi lát" */}
                        <View style={styles.cardNoteRow}>
                          <Ionicons name="sparkles" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                          <Text style={styles.cardNoteText} numberOfLines={1}>
                            "{noteText}"
                          </Text>
                        </View>

                        {/* Hàng 3: Pill số tiền màu xanh lá 23.000 đ */}
                        <View style={styles.cardAmountPill}>
                          <Text style={styles.cardAmountText}>{formatVND(item.amount)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          // ================= CHẾ ĐỘ LƯỚI (GRID VIEW) =================
          <ScrollView
            style={styles.gridScrollView}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.gridRow}>
              {filteredMoments.map((item, index) => {
                const tapeColor = WASHI_TAPE_COLORS[index % WASHI_TAPE_COLORS.length];
                const displayDateOverlay = `${item.dayNum} T${item.monthNum}`;

                return (
                  <TouchableOpacity
                    key={`grid-${item.id}`}
                    style={styles.gridCard}
                    activeOpacity={0.88}
                    onPress={() => setViewingItem(item)}
                  >
                    <View
                      style={[
                        styles.gridWashiTape,
                        {
                          backgroundColor: tapeColor,
                          transform: [{ rotate: index % 2 === 0 ? '-2deg' : '2deg' }],
                        },
                      ]}
                    />

                    <Image
                      source={{ uri: item.photoUri }}
                      style={styles.gridImage}
                      resizeMode="cover"
                    />

                    {/* Tag ngày */}
                    <View style={styles.photoDateBadge}>
                      <Text style={styles.photoDateBadgeText}>{displayDateOverlay}</Text>
                    </View>

                    {/* Tag số tiền ở chân ảnh */}
                    <View style={styles.gridAmountOverlay}>
                      <Text style={styles.gridAmountText}>{formatVND(item.amount)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* MODAL CHI TIẾT ẢNH (KHỚP 100% HÌNH 2) */}
        <PhotoDetailViewer
          visible={Boolean(viewingItem)}
          item={viewingItem}
          onClose={() => setViewingItem(null)}
        />
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

// =========================================================================
// STYLESHEET
// =========================================================================
const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    height: Platform.OS === 'web' ? 36 : 48,
    width: '100%',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 25,
  },

  // 1. HEADER (Khớp 100% Hình 3)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE5D8',
    backgroundColor: '#FAF7F2',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleCol: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.2,
  },
  monthSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },

  // 2. SUB-HEADER
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statsPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
    gap: 3,
  },
  viewModeBtn: {
    width: 34,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: '#064E3B',
  },

  // 3. FILTERS
  filterSection: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  filterSectionSecond: {
    paddingTop: 4,
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 18,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterChipActive: {
    backgroundColor: '#064E3B',
    borderColor: '#064E3B',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // 4. TIMELINE LIST VIEW
  timelineScrollView: {
    flex: 1,
  },
  timelineContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
    position: 'relative',
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: 28,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: '#D1D5DB',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  timelineNodeWrapper: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    zIndex: 2,
  },
  timelineNodeOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineNodeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#064E3B',
  },

  // SCRAPBOOK CARD
  cardWrapper: {
    flex: 1,
    position: 'relative',
    paddingTop: 8, // Để chừa chỗ cho washi tape nhô lên
  },
  washiTape: {
    position: 'absolute',
    top: 0,
    left: '35%',
    width: 68,
    height: 15,
    borderRadius: 2,
    zIndex: 3,
    opacity: 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  momentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E1D5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  photoThumbWrapper: {
    width: 102,
    height: 102,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  photoDateBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  photoDateBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  photoEyeBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // CARD INFO RIGHT
  cardInfoCol: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardCategoryGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  cardCategoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  cardCategoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  cardNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  cardNoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  cardAmountPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  cardAmountText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '800',
  },

  // 5. GRID VIEW
  gridScrollView: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: (Dimensions.get('window').width - 36 - 12) / 2,
    height: (Dimensions.get('window').width - 36 - 12) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E1D5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    paddingTop: 6,
  },
  gridWashiTape: {
    position: 'absolute',
    top: 2,
    left: '28%',
    width: 50,
    height: 12,
    borderRadius: 2,
    zIndex: 3,
    opacity: 0.85,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  gridAmountOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(6, 78, 59, 0.88)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  gridAmountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // 6. EMPTY STATE
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  emptyCameraBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // =========================================================================
  // DETAIL MODAL STYLES (HÌNH 2)
  // =========================================================================
  detailContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'space-between',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    zIndex: 10,
  },
  detailHeaderLeft: {
    flex: 1,
    paddingRight: 14,
  },
  detailTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailTagText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  detailTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDateText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  detailCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  detailFullImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  },
  detailBottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  detailHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  detailHintText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
  },
  detailZoomControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 24,
    padding: 3,
    gap: 6,
  },
  detailZoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailZoomPercentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailZoomPercentText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

