import React, { useMemo } from 'react';
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

// Bảng dữ liệu giữ y nguyên 100% từ trang Lịch gốc theo yêu cầu của bạn
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
    dayOfWeekName: 'Thứ Ba',
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
    dayOfWeekName: 'Thứ Tư',
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
    note: 'Lẩu mini trưa mưa lạnh thật ấm bụng',
    category: 'Ẩm thực & Bạn bè',
    time: '13:00 PM',
    dayOfWeekName: 'Thứ Năm',
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
    note: 'Bánh tart dâu và trà hoa quả chill chiều thứ 6',
    category: 'Trà chiều',
    time: '16:45 PM',
    dayOfWeekName: 'Thứ Sáu',
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
    note: 'Bát phở tái lăn ngập hành lá thơm nức',
    category: 'Ăn uống',
    time: '08:00 AM',
    dayOfWeekName: 'Thứ Bảy',
    items: [
      { id: '5-1', title: 'Phở bò tái lăn đặc biệt', subtitle: 'Ăn sáng cuối tuần', amount: '-95.000đ', category: 'Ăn uống', icon: 'restaurant' },
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
    note: 'Bún bò thơm nồng cùng gia đình chủ nhật',
    category: 'Ăn uống',
    time: '11:30 AM',
    dayOfWeekName: 'Chủ Nhật',
    items: [
      { id: '6-1', title: 'Tô bún bò thập cẩm chả cua', subtitle: 'Ăn trưa chủ nhật', amount: '-150.000đ', category: 'Ăn uống', icon: 'restaurant' },
    ],
  },
  18: {
    dayNum: 18,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '65k',
    rawAmount: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=250&auto=format&fit=crop&q=80',
    storeName: 'Highlands Coffee Landmark',
    note: 'Ly Freeze Trà Xanh nạp năng lượng tập trung làm việc',
    category: 'Cà phê & Đồ uống',
    time: '09:15 AM',
    dayOfWeekName: 'Thứ Sáu',
    items: [
      { id: '18-1', title: 'Freeze Trà Xanh cỡ lớn', subtitle: 'Thức uống sáng tập trung', amount: '-65.000đ', category: 'Cà phê', icon: 'cafe' },
    ],
  },
  19: {
    dayNum: 19,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '820k',
    rawAmount: 820000,
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=250&auto=format&fit=crop&q=80',
    storeName: 'GearVN Studio Tech',
    note: 'Bàn phím cơ DareU RGB thay phím cũ hỏng phím cách',
    category: 'Thiết bị & Công nghệ',
    time: '15:20 PM',
    dayOfWeekName: 'Thứ Bảy',
    items: [
      { id: '19-1', title: 'Bàn phím cơ DareU EK87', subtitle: 'Nâng cấp phụ kiện làm việc', amount: '-820.000đ', category: 'Mua sắm', icon: 'hardware-chip' },
    ],
  },
  20: {
    dayNum: 20,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '280k',
    rawAmount: 280000,
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=250&auto=format&fit=crop&q=80',
    storeName: 'Co.opmart Nhiêu Lộc',
    note: 'Đi siêu thị mua rau củ quả và đồ tiêu dùng cho tuần mới',
    category: 'Đi chợ & Siêu thị',
    time: '18:00 PM',
    dayOfWeekName: 'Chủ Nhật',
    items: [
      { id: '20-1', title: 'Thực phẩm tươi sống & Rau củ', subtitle: 'Nấu ăn tuần mới', amount: '-280.000đ', category: 'Đi chợ', icon: 'basket' },
    ],
  },
  21: {
    dayNum: 21,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '220k',
    rawAmount: 220000,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=250&auto=format&fit=crop&q=80',
    storeName: 'Cơm Niêu Singapore 35',
    note: 'Cơm niêu xá xíu thơm giòn cháy đáy',
    category: 'Ẩm thực',
    time: '12:10 PM',
    dayOfWeekName: 'Thứ Hai',
    items: [
      { id: '21-1', title: 'Cơm niêu xá xíu & Canh chua', subtitle: 'Ăn trưa đầu tuần', amount: '-220.000đ', category: 'Ăn uống', icon: 'restaurant' },
    ],
  },
  22: {
    dayNum: 22,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '75k',
    rawAmount: 75000,
    imageUrl: 'https://images.unsplash.com/photo-1527018607912-0ab8dc7ff34c?w=250&auto=format&fit=crop&q=80',
    storeName: 'Cây xăng Petrolimex 01',
    note: 'Đổ đầy bình xăng xe máy chạy cả tuần',
    category: 'Di chuyển & Xăng xe',
    time: '08:15 AM',
    dayOfWeekName: 'Thứ Ba',
    items: [
      { id: '22-1', title: 'Đổ xăng Ron 95', subtitle: 'Chi phí đi lại', amount: '-75.000đ', category: 'Di chuyển', icon: 'car' },
    ],
  },
  23: {
    dayNum: 23,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '190k',
    rawAmount: 190000,
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=250&auto=format&fit=crop&q=80',
    storeName: 'Tous Les Jours Bakery',
    note: 'Bánh mì ngũ cốc & bánh ngọt mang về nhà',
    category: 'Tiệm bánh',
    time: '17:30 PM',
    dayOfWeekName: 'Thứ Tư',
    items: [
      { id: '23-1', title: 'Set bánh ngọt & Bánh mì', subtitle: 'Bữa sáng gia đình', amount: '-190.000đ', category: 'Ăn uống', icon: 'pizza' },
    ],
  },
  24: {
    dayNum: 24,
    isCurrentMonth: true,
    hasPhoto: true,
    amountText: '450k',
    rawAmount: 450000,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    storeName: "Pizza 4P's Saigon",
    note: '“Tự thưởng pizza phô mai thơm lừng & salad bơ cùng đồng nghiệp mừng sprint!”',
    category: 'Ẩm thực & Bạn bè',
    time: '19:42 PM',
    dayOfWeekName: 'Thứ Năm',
    items: [
      {
        id: '24-1',
        title: 'Pizza 4 Cheese & Salad...',
        subtitle: 'Ăn tối sprint team',
        amount: '-390.000đ',
        category: 'Ẩm thực',
        icon: 'pizza-outline',
      },
      {
        id: '24-2',
        title: 'Nước ép cam & Soda ch...',
        subtitle: 'Đồ uống giải khát',
        amount: '-60.000đ',
        category: 'Đồ uống',
        icon: 'wine-outline',
      },
    ],
  },
};

export interface FinancialCalendarWidgetProps {
  selectedDay?: number;
  onSelectDay?: (dayNum: number, fullDateStr: string, dateLabel: string) => void;
  onViewAll?: () => void;
}

export const FinancialCalendarWidget: React.FC<FinancialCalendarWidgetProps> = ({
  selectedDay,
  onSelectDay,
}) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const activeSelectedDay = selectedDay !== undefined ? selectedDay : now.getDate();

  const monthGrid = useMemo(() => {
    return getMonthCalendarGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const handleCellPress = (cell: any) => {
    if (!onSelectDay) return;
    const dateLabel = `${cell.shortDay}, ${String(cell.dayNum).padStart(2, '0')}/${String(cell.month).padStart(2, '0')}`;
    onSelectDay(cell.dayNum, cell.fullDateStr, dateLabel);
  };

  return (
    <View style={styles.container}>
      {/* 1. Tiêu đề: 🔥 LỊCH TÀI CHÍNH (Cỡ chữ nhỏ màu đen tương tự HÔM NAY bên dưới) */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="flame" size={14} color="#EF4444" style={{ marginRight: 5 }} />
          <Text style={styles.title}>{isVi ? 'LỊCH TÀI CHÍNH' : 'FINANCIAL CALENDAR'}</Text>
        </View>
      </View>

      {/* 2. Khung Card Lịch chuẩn y nguyên 100% từ CalendarScreen */}
      <View style={styles.calendarCard}>
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

            const dData = SAMPLE_DAYS_MAP[cell.dayNum];
            const isSelected = activeSelectedDay === cell.dayNum;
            const hasPhoto = Boolean(dData?.imageUrl);
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
                    hasPhoto ? styles.photoCell : styles.emptyCell,
                    isTodayCell && !isSelected && styles.todayCellBorder,
                    isSelected && (hasPhoto ? styles.photoCellSelected : styles.emptyCellSelected),
                  ]}
                >
                  {hasPhoto ? (
                    <>
                      <Image source={{ uri: dData!.imageUrl }} style={styles.cellBgImage} />
                      <View style={styles.cellGradientOverlay} />
                      <View style={[styles.cellDayNumBadge, isSelected && styles.cellDayNumBadgeActive]}>
                        <Text style={styles.cellDayNumText}>{cell.dayNum}</Text>
                      </View>
                      <View style={[styles.cellAmountBadge, isSelected && styles.cellAmountBadgeActive]}>
                        <Text style={[styles.cellAmountText, isSelected && styles.cellAmountTextActive]}>
                          {dData!.amountText || '45k'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.emptyCellDayText, isSelected && styles.emptyCellDayTextSelected]}>
                        {cell.dayNum}
                      </Text>
                      <Ionicons
                        name="camera-outline"
                        size={13}
                        color={isSelected ? '#047857' : isTodayCell ? '#059669' : '#A5B4FC'}
                      />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151', // Cùng cỡ chữ và màu sắc với "HÔM NAY" bên dưới
    letterSpacing: 0.8,
  },

  // Khung Card Lịch lấy y chang CalendarScreen
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevMonthDayText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
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
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  emptyCellSelected: {
    borderWidth: 2,
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  todayCellBorder: {
    borderWidth: 1.5,
    borderColor: '#047857',
    backgroundColor: '#F0FDF4',
  },
  emptyCellDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyCellDayTextSelected: {
    color: '#059669',
    fontWeight: '800',
  },
});
