import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { getMonthCalendarGrid, isSameDay } from '../utils/dateUtils';
import {
  getInitialDayRecordsFromLocalStorage,
  subscribeCalendarUpdates,
  DayExpenseRecord,
  isIncomeTransactionOrItem,
} from '../services/calendarStorage';
import {
  getTotalIncomeForMonth,
  subscribeIncomeUpdates,
} from '../services/incomeStorage';

export interface CalendarDayData {
  dayNum: number;
  isCurrentMonth: boolean;
  hasPhoto: boolean;
  amountText?: string;
  rawAmount?: number;
  imageUrl?: string;
  storeName?: string;
  note?: string;
  category?: string;
  time?: string;
  dayOfWeekName?: string;
  items?: {
    id: string;
    title: string;
    subtitle: string;
    amount: string;
    category: string;
    icon: string;
  }[];
}

// Dữ liệu mẫu chuẩn xác cho Tháng 10/2026 (CHỈ dành cho các ngày trong quá khứ 1..11, KHÔNG có ngày tương lai)
export const SAMPLE_DAYS_MAP: Record<number, CalendarDayData> = {
  1: {
    dayNum: 1,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '45k',
    rawAmount: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=250&auto=format&fit=crop&q=80',
    storeName: 'Cà phê Vợt Phan Đình Phùng',
    note: 'Cà phê sáng vỉa hè ngắm phố phường thanh bình',
    category: 'Cà phê & Đồ uống',
    time: '07:30 AM',
    dayOfWeekName: 'Thứ Năm',
    items: [
      { id: '1-1', title: 'Cà phê sữa đá', subtitle: 'Năng lượng sáng sớm', amount: '-45.000đ', category: 'Cà phê', icon: 'cafe' },
    ],
  },
  2: {
    dayNum: 2,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '120k',
    rawAmount: 120000,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=250&auto=format&fit=crop&q=80',
    storeName: 'SaladStop! Vincom',
    note: 'Bữa trưa healthy cùng đồng nghiệp công ty',
    category: 'Ẩm thực sức khỏe',
    time: '12:15 PM',
    dayOfWeekName: 'Thứ Sáu',
    items: [
      { id: '2-1', title: 'Caesar Salad Bò áp chảo', subtitle: 'Ăn trưa dinh dưỡng', amount: '-120.000đ', category: 'Ăn uống', icon: 'nutrition' },
    ],
  },
  3: {
    dayNum: 3,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '310k',
    rawAmount: 310000,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=250&auto=format&fit=crop&q=80',
    storeName: 'Haidilao Hotpot',
    note: 'Lẩu mini cuối tuần thật ấm bụng',
    category: 'Ẩm thực & Bạn bè',
    time: '13:00 PM',
    dayOfWeekName: 'Thứ Bảy',
    items: [
      { id: '3-1', title: 'Combo Lẩu Bò Cà Chua', subtitle: 'Ăn trưa thịnh soạn', amount: '-310.000đ', category: 'Ăn uống', icon: 'restaurant' },
    ],
  },
  4: {
    dayNum: 4,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '185k',
    rawAmount: 185000,
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=250&auto=format&fit=crop&q=80',
    storeName: 'The Running Bean Bakery',
    note: 'Bánh tart dâu và trà hoa quả thư giãn chủ nhật',
    category: 'Trà chiều',
    time: '16:45 PM',
    dayOfWeekName: 'Chủ Nhật',
    items: [
      { id: '4-1', title: 'Bánh Tart Dâu & Trà Đào', subtitle: 'Teatime thư giãn', amount: '-185.000đ', category: 'Trà chiều', icon: 'wine' },
    ],
  },
  5: {
    dayNum: 5,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '95k',
    rawAmount: 95000,
    imageUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=250&auto=format&fit=crop&q=80',
    storeName: 'Phở Thìn Lò Đúc',
    note: 'Bát phở tái lăn ngập hành lá thơm nức đầu tuần',
    category: 'Ăn uống',
    time: '08:00 AM',
    dayOfWeekName: 'Thứ Hai',
    items: [
      { id: '5-1', title: 'Phở bò tái lăn đặc biệt', subtitle: 'Ăn sáng nạp năng lượng', amount: '-95.000đ', category: 'Ăn uống', icon: 'restaurant' },
    ],
  },
  6: {
    dayNum: 6,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '150k',
    rawAmount: 150000,
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=250&auto=format&fit=crop&q=80',
    storeName: 'Bún Bò Huế Cô Như',
    note: 'Tô bún bò thơm nồng cùng đồng nghiệp trưa',
    category: 'Ăn uống',
    time: '11:30 AM',
    dayOfWeekName: 'Thứ Ba',
    items: [
      { id: '6-1', title: 'Tô bún bò thập cẩm chả cua', subtitle: 'Ăn trưa no nê', amount: '-150.000đ', category: 'Ăn uống', icon: 'restaurant' },
    ],
  },
  7: {
    dayNum: 7,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '65k',
    rawAmount: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=250&auto=format&fit=crop&q=80',
    storeName: 'Highlands Coffee Landmark',
    note: 'Ly Freeze Trà Xanh nạp năng lượng tập trung làm việc',
    category: 'Cà phê & Đồ uống',
    time: '09:15 AM',
    dayOfWeekName: 'Thứ Tư',
    items: [
      { id: '7-1', title: 'Freeze Trà Xanh cỡ lớn', subtitle: 'Thức uống sáng tập trung', amount: '-65.000đ', category: 'Cà phê', icon: 'cafe' },
    ],
  },
  8: {
    dayNum: 8,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '220k',
    rawAmount: 220000,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=250&auto=format&fit=crop&q=80',
    storeName: 'Cơm Niêu Singapore 35',
    note: 'Cơm niêu xá xíu thơm giòn cháy đáy',
    category: 'Ẩm thực',
    time: '12:10 PM',
    dayOfWeekName: 'Thứ Năm',
    items: [
      { id: '8-1', title: 'Cơm niêu xá xíu & Canh chua', subtitle: 'Ăn trưa ngon miệng', amount: '-220.000đ', category: 'Ăn uống', icon: 'restaurant' },
    ],
  },
  9: {
    dayNum: 9,
    isCurrentMonth: true,
    hasPhoto: false,
    amountText: '75k',
    rawAmount: 75000,
    imageUrl: '',
    storeName: 'Cây xăng Petrolimex 01',
    note: 'Đổ đầy bình xăng xe máy chạy cả tuần',
    category: 'Di chuyển & Xăng xe',
    time: '08:15 AM',
    dayOfWeekName: 'Thứ Sáu',
    items: [
      { id: '9-1', title: 'Đổ xăng Ron 95', subtitle: 'Chi phí đi lại', amount: '-75.000đ', category: 'Di chuyển', icon: 'car' },
    ],
  },
  10: {
    dayNum: 10,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '450k',
    rawAmount: 450000,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    storeName: "Pizza 4P's Saigon",
    note: 'Tự thưởng pizza phô mai thơm lừng mừng cuối tuần!',
    category: 'Ẩm thực & Bạn bè',
    time: '19:42 PM',
    dayOfWeekName: 'Thứ Bảy',
    items: [
      { id: '10-1', title: 'Pizza 4 Cheese & Salad bơ', subtitle: 'Ăn tối cuối tuần', amount: '-390.000đ', category: 'Ẩm thực', icon: 'pizza-outline' },
      { id: '10-2', title: 'Nước ép cam tươi', subtitle: 'Đồ uống giải khát', amount: '-60.000đ', category: 'Đồ uống', icon: 'wine-outline' },
    ],
  },
  11: {
    dayNum: 11,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '280k',
    rawAmount: 280000,
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=250&auto=format&fit=crop&q=80',
    storeName: 'Co.opmart Nhiêu Lộc',
    note: 'Đi siêu thị mua rau củ quả tươi cho tuần mới',
    category: 'Đi chợ & Siêu thị',
    time: '18:00 PM',
    dayOfWeekName: 'Chủ Nhật',
    items: [
      { id: '11-1', title: 'Thực phẩm tươi sống & Rau củ', subtitle: 'Nấu ăn tuần mới', amount: '-280.000đ', category: 'Đi chợ', icon: 'basket' },
    ],
  },
};

export interface FinancialCalendarWidgetProps {
  selectedDay?: number;
  onSelectDay?: (dayNum: number, fullDateStr: string, dateLabel: string) => void;
  onViewAll?: () => void;
  transactions?: any[];
  totalIncome?: number;
  totalExpense?: number;
  onPressIncome?: () => void;
  onPressExpense?: () => void;
  onNavigateToCamera?: () => void;
}

export const FinancialCalendarWidget: React.FC<FinancialCalendarWidgetProps> = ({
  selectedDay,
  onSelectDay,
  transactions,
  totalIncome,
  totalExpense,
  onPressIncome,
  onPressExpense,
  onNavigateToCamera,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const now = useMemo(() => new Date(), []);
  
  // State điều hướng tháng & năm thực tế
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth() + 1); // 1-indexed

  const isCurrentViewingMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;
  const activeSelectedDay = selectedDay !== undefined ? selectedDay : (isCurrentViewingMonth ? now.getDate() : 1);

  // State đồng bộ Lịch trình chi tiêu (IndexedDB & LocalStorage từ Web/Mobile)
  const [dayRecords, setDayRecords] = useState<Record<string, DayExpenseRecord>>(() =>
    getInitialDayRecordsFromLocalStorage()
  );

  useEffect(() => {
    const unsub = subscribeCalendarUpdates((updated) => {
      setDayRecords(updated);
    });
    return unsub;
  }, []);

  // Tính tổng thu nhập thực tế của tháng đang xem trên lịch
  const [viewMonthIncome, setViewMonthIncome] = useState<number>(() =>
    getTotalIncomeForMonth(viewYear, viewMonth)
  );

  useEffect(() => {
    setViewMonthIncome(getTotalIncomeForMonth(viewYear, viewMonth));
  }, [viewYear, viewMonth]);

  useEffect(() => {
    const unsub = subscribeIncomeUpdates(() => {
      setViewMonthIncome(getTotalIncomeForMonth(viewYear, viewMonth));
    });
    return unsub;
  }, [viewYear, viewMonth]);

  // Sinh ma trận ngày tháng chuẩn theo viewYear và viewMonth
  const monthGrid = useMemo(() => {
    return getMonthCalendarGrid(viewYear, viewMonth, now);
  }, [viewYear, viewMonth, now]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
  };

  // Tổng hợp dữ liệu chi tiêu từng ngày (chuẩn theo thời gian thực)
  const daysDataMap = useMemo(() => {
    const map: Record<number, {
      totalAmount: number;
      photoUrl?: string;
      count: number;
      amountText: string;
      items: any[];
      latestPhotoTime?: number;
    }> = {};

    // 1. Dữ liệu mẫu khởi tạo (CHỈ áp dụng cho Tháng 10/2026 và các ngày đã qua <= 11)
    if (viewYear === 2026 && viewMonth === 10) {
      Object.entries(SAMPLE_DAYS_MAP).forEach(([dayStr, data]) => {
        const dNum = Number(dayStr);
        if (dNum <= 11) {
          map[dNum] = {
            totalAmount: data.rawAmount || 0,
            photoUrl: data.imageUrl,
            count: data.items?.length || 1,
            amountText: data.amountText || '0k',
            items: data.items || [],
          };
        }
      });
    }

    // 2. Cộng dồn các giao dịch thực tế của người dùng trong tháng đang xem từ Backend
    if (Array.isArray(transactions) && transactions.length > 0) {
      transactions.forEach((tx: any) => {
        if (!tx || !tx.date) return;
        // BỎ QUA GIAO DỊCH THU NHẬP! Lịch và ô CHI CHỈ TÍNH TIỀN CHI TIÊU
        if (isIncomeTransactionOrItem(tx)) return;
        const txDate = new Date(tx.date);
        if (txDate.getFullYear() === viewYear && txDate.getMonth() + 1 === viewMonth) {
          const dNum = txDate.getDate();
          const amt = Math.abs(tx.amount || 0);
          if (!map[dNum]) {
            map[dNum] = { totalAmount: 0, count: 0, items: [], amountText: '' };
          }
          map[dNum].totalAmount = (map[dNum].totalAmount || 0) + amt;
          map[dNum].count += 1;
          map[dNum].items.push(tx);
          if (tx.photoUri) {
            const txTime = txDate.getTime();
            if (!map[dNum].latestPhotoTime || txTime >= map[dNum].latestPhotoTime) {
              map[dNum].photoUrl = tx.photoUri;
              map[dNum].latestPhotoTime = txTime;
            }
          }
        }
      });
    }

    // 3. Ưu tiên cập nhật từ dayRecords (Đồng bộ tức thời với Web Lịch trình chi tiêu)
    if (dayRecords && typeof dayRecords === 'object') {
      Object.entries(dayRecords).forEach(([key, rec]) => {
        if (!rec) return;
        const parts = key.split('-');
        if (parts.length === 3) {
          const recY = Number(parts[0]);
          const recM = Number(parts[1]);
          const recD = Number(parts[2]);
          if (recY === viewYear && recM === viewMonth) {
            // Lọc các item chi tiêu thực sự (loại trừ income)
            const expenseItems = Array.isArray(rec.items)
              ? rec.items.filter((it: any) => !isIncomeTransactionOrItem(it))
              : [];
            const realDayAmount = Array.isArray(rec.items)
              ? expenseItems.reduce((s: number, it: any) => s + (it.amount || 0), 0)
              : (rec.amount || 0);

            if (!map[recD]) {
              map[recD] = { totalAmount: 0, count: 0, items: [], amountText: '' };
            }
            // Nếu ngày này có items rỗng và amount = 0 -> xóa ảnh đại diện ô lịch
            if (Array.isArray(rec.items) && expenseItems.length === 0 && (!realDayAmount || realDayAmount === 0)) {
              map[recD].photoUrl = undefined;
              map[recD].totalAmount = 0;
              map[recD].count = 0;
              map[recD].items = [];
            } else {
              // Cập nhật theo rec.photoUri (nếu rec.photoUri là undefined thì gỡ bỏ)
              map[recD].photoUrl = rec.photoUri || undefined;
              map[recD].totalAmount = realDayAmount;
              if (expenseItems.length > 0) {
                map[recD].count = expenseItems.length;
                map[recD].items = expenseItems;
              }
            }
          }
        }
      });
    }

    // 4. Format amountText cho tất cả các ngày có chi tiêu
    Object.keys(map).forEach((dStr) => {
      const dNum = Number(dStr);
      const total = map[dNum].totalAmount;
      if (total >= 1000000) {
        map[dNum].amountText = (total / 1000000).toFixed(1).replace('.0', '') + 'tr';
      } else if (total > 0) {
        map[dNum].amountText = Math.round(total / 1000) + 'k';
      } else {
        map[dNum].amountText = '';
      }
    });

    return map;
  }, [transactions, viewYear, viewMonth, dayRecords]);

  // Tổng chi tiêu của tháng đang xem
  const monthTotalSpent = useMemo(() => {
    return Object.values(daysDataMap).reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  }, [daysDataMap]);

  // Đếm tổng số ảnh có trong tháng
  const totalPhotosCount = useMemo(() => {
    return Object.values(daysDataMap).filter((d) => Boolean(d.photoUrl)).length;
  }, [daysDataMap]);

  // Giá trị hiển thị Chi tiêu và Thu nhập chuẩn xác theo dữ liệu thực tế
  const displayExpense = totalExpense !== undefined && totalExpense !== 6180000 ? totalExpense : monthTotalSpent;
  const displayIncome = isCurrentViewingMonth && totalIncome !== undefined ? totalIncome : viewMonthIncome;

  const handleCellPress = (cell: any) => {
    if (!onSelectDay) return;
    const isToday = isSameDay(new Date(cell.year, cell.month - 1, cell.dayNum), now);
    const dateLabel = isToday
      ? (isVi ? `Hôm nay, ${String(cell.dayNum).padStart(2, '0')}/${String(cell.month).padStart(2, '0')}/${cell.year}` : `Today, ${String(cell.dayNum).padStart(2, '0')}/${String(cell.month).padStart(2, '0')}/${cell.year}`)
      : `${cell.dayOfWeekName}, ${String(cell.dayNum).padStart(2, '0')}/${String(cell.month).padStart(2, '0')}/${cell.year}`;
    onSelectDay(cell.dayNum, cell.fullDateStr, dateLabel);
  };

  return (
    <View style={styles.container}>
      {/* 1. Header: Tiêu đề Lịch & Nút Ảnh + Bộ chọn Tháng/Năm chuẩn như Hình 1 */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="flame" size={16} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={styles.title}>{isVi ? 'LỊCH TÀI CHÍNH' : 'FINANCIAL CALENDAR'}</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Nút ảnh 📷 1 Ảnh chuẩn như hình 1 */}
          <TouchableOpacity
            style={styles.photoCountPill}
            onPress={onNavigateToCamera}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={13} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.photoCountText}>
              {totalPhotosCount > 0 ? `${totalPhotosCount} ${isVi ? 'Ảnh' : 'Photos'}` : (isVi ? '1 Ảnh' : '1 Photo')}
            </Text>
          </TouchableOpacity>

          {/* Thanh chuyển tháng/năm chuẩn thực tế */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={handlePrevMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={13} color="#334155" />
            </TouchableOpacity>

            <Text style={styles.monthYearTitle}>
              {isVi ? `Thg ${viewMonth}, ${viewYear}` : `${viewMonth}/${viewYear}`}
            </Text>

            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={handleNextMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={13} color="#334155" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. Khung Card Lịch */}
      <View style={styles.calendarCard}>
        {/* ================= 2 THẺ TỔNG QUAN: CHI & THU (Nền #FAF7F2 chuẩn hình 1) ================= */}
        <View style={styles.summaryCardsRow}>
          {/* Thẻ CHI (Bên trái) */}
          <TouchableOpacity
            style={styles.summaryCard}
            activeOpacity={0.8}
            onPress={onPressExpense}
          >
            <View style={styles.summaryCardHeader}>
              <Ionicons
                name="arrow-up-outline"
                size={14}
                color="#EF4444"
                style={{ transform: [{ rotate: '45deg' }] }}
              />
              <Text style={styles.summaryCardLabelChi}>{isVi ? 'CHI' : 'EXPENSES'}</Text>
            </View>
            <Text style={styles.summaryCardAmountChi} numberOfLines={1}>
              -{Math.abs(displayExpense).toLocaleString('vi-VN')} đ
            </Text>
          </TouchableOpacity>

          {/* Thẻ THU (Bên phải) */}
          <TouchableOpacity
            style={styles.summaryCard}
            activeOpacity={0.8}
            onPress={onPressIncome}
          >
            <View style={styles.summaryCardHeader}>
              <Ionicons
                name="arrow-down-outline"
                size={14}
                color="#059669"
                style={{ transform: [{ rotate: '45deg' }] }}
              />
              <Text style={styles.summaryCardLabelThu}>{isVi ? 'THU' : 'INCOME'}</Text>
            </View>
            <Text style={styles.summaryCardAmountThu} numberOfLines={1}>
              +{Math.abs(displayIncome).toLocaleString('vi-VN')} đ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hàng tiêu đề thứ: T2, T3, T4, T5, T6, T7, CN */}
        <View style={styles.dayOfWeekHeaderRow}>
          {(isVi ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']).map((d, idx) => (
            <View key={idx} style={styles.dayOfWeekCol}>
              <Text
                style={[
                  styles.dayOfWeekText,
                  (d === 'CN' || d === 'Sun') && styles.sundayText,
                ]}
              >
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Lưới 7 cột hiển thị toàn bộ hình ảnh và số tiền chi tiêu */}
        <View style={styles.daysGrid}>
          {monthGrid.map((cell) => {
            // Các ngày đệm tràn từ tháng trước / tháng sau
            if (!cell.isCurrentMonth) {
              return (
                <View key={`spill_${cell.year}_${cell.month}_${cell.dayNum}`} style={styles.dayCellWrapper}>
                  <View style={[styles.dayCell, styles.prevMonthCell]}>
                    <Text style={styles.prevMonthDayText}>{cell.dayNum}</Text>
                  </View>
                </View>
              );
            }

            const dData = daysDataMap[cell.dayNum];
            const isSelected = activeSelectedDay === cell.dayNum && cell.isCurrentMonth;
            const hasPhoto = Boolean(dData?.photoUrl);
            const hasExpense = Boolean(dData && dData.totalAmount > 0);
            const isTodayCell = isSameDay(new Date(cell.year, cell.month - 1, cell.dayNum), now);

            return (
              <TouchableOpacity
                key={`day_${cell.fullDateStr}`}
                style={styles.dayCellWrapper}
                onPress={() => handleCellPress(cell)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.dayCell,
                    hasPhoto ? styles.photoCell : hasExpense ? styles.expenseNoPhotoCell : styles.emptyCell,
                    isTodayCell && styles.todayCellHighlight,
                    isSelected && (hasPhoto ? styles.photoCellSelected : styles.emptyCellSelected),
                  ]}
                >
                  {hasPhoto ? (
                    <>
                      <Image source={{ uri: dData!.photoUrl }} style={styles.cellBgImage} />
                      <View style={styles.cellGradientOverlay} />
                      
                      <View style={styles.cellTopRow}>
                        {isTodayCell ? (
                          <View style={styles.todayNumPill}>
                            <Text style={styles.todayNumText}>{cell.dayNum}</Text>
                          </View>
                        ) : (
                          <View style={[styles.cellDayNumBadge, isSelected && styles.cellDayNumBadgeActive]}>
                            <Text style={styles.cellDayNumText}>{cell.dayNum}</Text>
                          </View>
                        )}
                      </View>

                      <View style={[styles.cellAmountBadge, isSelected && styles.cellAmountBadgeActive]}>
                        <Text style={[styles.cellAmountText, isSelected && styles.cellAmountTextActive]}>
                          {dData!.amountText || '0k'}
                        </Text>
                      </View>
                    </>
                  ) : hasExpense ? (
                    <>
                      <View style={styles.cellTopRow}>
                        {isTodayCell ? (
                          <View style={styles.todayNumPill}>
                            <Text style={styles.todayNumText}>{cell.dayNum}</Text>
                          </View>
                        ) : (
                          <Text style={[styles.emptyCellDayText, isSelected && styles.emptyCellDayTextSelected]}>
                            {cell.dayNum}
                          </Text>
                        )}

                        <Ionicons
                          name="flash"
                          size={10}
                          color="#059669"
                        />
                      </View>

                      <View style={[styles.noPhotoAmountBadge, isTodayCell && styles.todayAmountBadge]}>
                        <Text style={[styles.noPhotoAmountText, isTodayCell && styles.todayAmountText]}>
                          {dData!.amountText}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.cellTopRow}>
                        {isTodayCell ? (
                          <View style={styles.todayNumPill}>
                            <Text style={styles.todayNumText}>{cell.dayNum}</Text>
                          </View>
                        ) : (
                          <Text style={[styles.emptyCellDayText, isSelected && styles.emptyCellDayTextSelected]}>
                            {cell.dayNum}
                          </Text>
                        )}
                      </View>

                      <Ionicons
                        name={isTodayCell ? "camera" : "camera-outline"}
                        size={isTodayCell ? 15 : 13}
                        color={isTodayCell ? '#047857' : isSelected ? '#047857' : '#CBD5E1'}
                        style={{ marginBottom: 2 }}
                      />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================= CHÚ THÍCH MỨC CHI TIÊU CHUẨN HÌNH 1 ================= */}
        <View style={styles.legendRow}>
          <Text style={styles.legendTitle}>{isVi ? 'Mức chi tiêu:' : 'Spending tier:'}</Text>
          <View style={[styles.legendPill, { backgroundColor: '#E2F2E7' }]}>
            <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
            <Text style={[styles.legendText, { color: '#047857' }]}>&lt;100k</Text>
          </View>
          <View style={[styles.legendPill, { backgroundColor: '#FDF4E7' }]}>
            <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
            <Text style={[styles.legendText, { color: '#B45309' }]}>100k–500k</Text>
          </View>
          <View style={[styles.legendPill, { backgroundColor: '#FDECEC' }]}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.legendText, { color: '#B91C1C' }]}>&gt;500k</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#6EE7B7',
    backgroundColor: '#ECFDF5',
  },
  photoCountText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: '#374151',
    letterSpacing: 0.5,
  },
  // BỘ CHUYỂN ĐỔI THÁNG / NĂM
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#E7DECF',
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  monthNavBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginHorizontal: 3,
  },
  todayPillBtn: {
    backgroundColor: '#047857',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
  todayPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Khung Card Lịch
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE9DF',
    shadowColor: '#221D18',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  // 2 THẺ TỔNG QUAN: CHI & THU (Nền #FAF7F2 chuẩn theo yêu cầu giống web)
  summaryCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FAF7F2', // Nền màu be #FAF7F2 chuẩn yêu cầu
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EDE7DC',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  summaryCardLabelChi: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  summaryCardLabelThu: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  summaryCardAmountChi: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: -0.3,
  },
  summaryCardAmountThu: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -0.3,
  },

  // Chú thích mức chi tiêu (Legend dưới đáy lịch)
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F0E8',
    gap: 8,
    flexWrap: 'wrap',
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716C',
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  dayOfWeekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayOfWeekCol: {
    flex: 1,
    alignItems: 'center',
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  sundayText: {
    color: '#EF4444',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.28%',
    padding: 2.5,
    aspectRatio: 0.88,
  },
  dayCell: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 3,
  },
  prevMonthCell: {
    backgroundColor: '#F8FAFC',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 3,
  },
  prevMonthDayText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
    paddingLeft: 1,
  },
  photoCell: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  photoCellSelected: {
    borderWidth: 2.5,
    borderColor: '#059669',
  },
  cellBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cellGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  cellDayNumBadge: {
    alignSelf: 'flex-start',
  },
  cellDayNumBadgeActive: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 3,
  },
  cellDayNumText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cellAmountBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 2,
  },
  cellAmountBadgeActive: {
    backgroundColor: '#059669',
  },
  cellAmountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cellAmountTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  emptyCell: {
    backgroundColor: '#FAF7F2',
    borderWidth: 0.5,
    borderColor: '#EDE7DC',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 3,
    paddingBottom: 4,
  },
  expenseNoPhotoCell: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    justifyContent: 'space-between',
    padding: 3,
  },
  noPhotoAmountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 2,
  },
  noPhotoAmountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },
  emptyCellSelected: {
    borderWidth: 2,
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  cellTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  todayMiniDotBadge: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  todayMiniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginLeft: 3,
  },
  todayCellBorder: {
    borderWidth: 2,
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  // Ô HÔM NAY TÔ ĐẬM NỔI BẬT KHÔNG THỂ BỎ LỠ
  todayCellHighlight: {
    borderWidth: 2.5,
    borderColor: '#047857',
    backgroundColor: '#ECFDF5',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  todayNumPill: {
    backgroundColor: '#047857',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayNumText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  todayAmountBadge: {
    backgroundColor: '#047857',
  },
  todayAmountText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  emptyCellDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    paddingLeft: 1,
  },
  emptyCellDayTextSelected: {
    color: '#059669',
    fontWeight: '800',
  },
});
