import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getTransactionsByDateApi, TransactionsByDateResponse } from '../../services/api';
import { getMonthCalendarGrid, getDayOfWeekName, isSameDay } from '../../utils/dateUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Data for Calendar Days
interface CalendarDayData {
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

// Sample dataset matching the image perfectly
const SAMPLE_DAYS_MAP: Record<number, CalendarDayData> = {
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

interface CalendarScreenProps {
  refreshTrigger?: number;
  onNavigateToCamera?: () => void;
  onNavigateToDetail?: (txId: string) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  refreshTrigger,
  onNavigateToCamera,
  onNavigateToDetail,
}) => {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [isLoadingDate, setIsLoadingDate] = useState(false);
  const [apiData, setApiData] = useState<TransactionsByDateResponse | null>(null);

  // Avatar initials / image
  const displayName = user?.fullName || (user?.email ? user.email.split('@')[0] : 'Min');

  // Load transactions by date from API when selectedDay changes
  useEffect(() => {
    let isMounted = true;
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    setIsLoadingDate(true);
    getTransactionsByDateApi(dateStr)
      .then((data) => {
        if (isMounted && data) {
          setApiData(data as any);
        }
      })
      .catch((err) => {
        console.log('[CalendarScreen] API fetch error (using fallback):', err?.message);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDate(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDay, selectedMonth, selectedYear, refreshTrigger]);

  // Current day details
  const monthGrid = useMemo(() => {
    return getMonthCalendarGrid(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const currentDayOfWeekName = useMemo(() => {
    return getDayOfWeekName(new Date(selectedYear, selectedMonth - 1, selectedDay));
  }, [selectedYear, selectedMonth, selectedDay]);

  const isTodaySelected = useMemo(() => {
    return isSameDay(new Date(selectedYear, selectedMonth - 1, selectedDay), new Date());
  }, [selectedYear, selectedMonth, selectedDay]);

  const fallbackDayData = SAMPLE_DAYS_MAP[selectedDay] || {
    dayNum: selectedDay,
    isCurrentMonth: true,
    hasPhoto: false,
    amountText: '0đ',
    rawAmount: 0,
    dayOfWeekName: currentDayOfWeekName,
    items: [],
  };

  // Merge API data if available
  const hasApiItems = apiData && apiData.items && apiData.items.length > 0;
  const currentHeroPhoto = hasApiItems && apiData?.photos?.[0]?.photoUri
    ? apiData.photos[0].photoUri
    : fallbackDayData.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80';

  const currentStoreName = hasApiItems
    ? (apiData?.photos?.[0]?.title || apiData?.items[0]?.title || 'Chi tiêu trong ngày')
    : fallbackDayData.storeName || 'Chi tiêu trong ngày';

  const currentTotalAmount = hasApiItems
    ? `-${Math.abs(apiData?.totalExpense || 0).toLocaleString('vi-VN')}đ`
    : (fallbackDayData.rawAmount ? `-${fallbackDayData.rawAmount.toLocaleString('vi-VN')}đ` : '-0đ');

  const currentNote = hasApiItems
    ? (apiData?.items[0]?.note || fallbackDayData.note || 'Khoảnh khắc chi tiêu ghi nhận trong ngày')
    : (fallbackDayData.note || 'Khoảnh khắc chi tiêu đáng nhớ trong ngày');

  const currentItems = hasApiItems
    ? apiData!.items.map((it: any) => ({
        id: it._id || it.id,
        title: it.title,
        subtitle: it.note || it.category || 'Chi tiêu',
        amount: `-${Math.abs(it.amount).toLocaleString('vi-VN')}đ`,
        category: it.category || 'Chi tiêu',
        icon: it.category?.toLowerCase().includes('ăn') ? 'pizza-outline' : 'receipt-outline',
      }))
    : (fallbackDayData.items || []);

  const totalTxCount = hasApiItems ? apiData!.totalItems : currentItems.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar: Logo + Lịch + Streak Badge + Bell + Avatar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../../assets/monett-brand-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <View style={styles.brandTextWrap}>
            <Text style={styles.brandTitle}>Monett</Text>
            <Text style={styles.brandSubtitle}>Lịch</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Streak Flame Badge */}
          <View style={styles.streakBadge}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={styles.streakCount}>5</Text>
          </View>

          {/* Bell Icon with Red Dot */}
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color="#1E293B" />
            <View style={styles.bellRedDot} />
          </TouchableOpacity>

          {/* User Avatar */}
          <View style={styles.avatarWrap}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 2. Month Navigator: < Tháng 10, 2024 > */}
        <View style={styles.monthNavWrapper}>
          <TouchableOpacity
            style={styles.monthArrowBtn}
            onPress={() => {
              if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(prev => prev - 1);
              } else {
                setSelectedMonth(prev => prev - 1);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#334155" />
          </TouchableOpacity>

          <View style={styles.monthTitleCenter}>
            <Text style={styles.monthTitleText}>
              Tháng {selectedMonth}, {selectedYear}
            </Text>
            <Text style={styles.monthSubText}>
              Nhật ký chi tiêu qua ống kính
            </Text>
          </View>

          <TouchableOpacity
            style={styles.monthArrowBtn}
            onPress={() => {
              if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(prev => prev + 1);
              } else {
                setSelectedMonth(prev => prev + 1);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* 3. Stat Summary Cards */}
        <View style={styles.summaryCardsRow}>
          {/* Card 1: Kỷ niệm lưu giữ */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="camera-outline" size={20} color="#059669" />
            </View>
            <View style={styles.statCardTexts}>
              <Text style={styles.statLabel}>Kỷ niệm lưu giữ</Text>
              <Text style={styles.statValue}>
                <Text style={{ color: '#047857' }}>26/31 ngày</Text> 📸
              </Text>
            </View>
          </View>

          {/* Card 2: Tổng chi tiêu */}
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="wallet-outline" size={20} color="#D97706" />
            </View>
            <View style={styles.statCardTexts}>
              <Text style={styles.statLabel}>Tổng chi tiêu</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                14.850.00...
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Month Calendar Grid Card */}
        <View style={styles.calendarCard}>
          {/* Day of Week Headers */}
          <View style={styles.dayOfWeekHeaderRow}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, idx) => (
              <View key={idx} style={styles.dayOfWeekCol}>
                <Text
                  style={[
                    styles.dayOfWeekText,
                    d === 'CN' && styles.sundayText,
                  ]}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* 7 Columns Grid Sinh Động Theo Lịch Thực Tế */}
          <View style={styles.daysGrid}>
            {monthGrid.map((cell) => {
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
              const isSelected = selectedDay === cell.dayNum;
              const hasPhoto = Boolean(dData?.imageUrl);

              return (
                <TouchableOpacity
                  key={`day_${cell.fullDateStr}`}
                  style={styles.dayCellWrapper}
                  onPress={() => setSelectedDay(cell.dayNum)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.dayCell,
                      hasPhoto ? styles.photoCell : styles.emptyCell,
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
                          size={14}
                          color={isSelected ? '#059669' : '#A5B4FC'}
                        />
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
              <Text style={styles.legendText}>Có khoảnh khắc ảnh</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#C7D2FE' }]} />
              <Text style={styles.legendText}>Chưa ghi nhận</Text>
            </View>
          </View>
        </View>

        {/* 5. Big Action Button: Tải ảnh khoảnh khắc vào ngày... */}
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.85}
          onPress={onNavigateToCamera}
        >
          <Ionicons name="images-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>
            Tải ảnh khoảnh khắc vào ngày {selectedDay}...
          </Text>
        </TouchableOpacity>

        {/* 6. Chi tiết ngày đã chọn (Selected Day Details) */}
        <View style={styles.dayDetailCard}>
          {/* Header Row: Circular Day Badge + Date Title + "Hôm nay" Pill */}
          <View style={styles.detailHeaderRow}>
            <View style={styles.detailHeaderLeft}>
              <View style={styles.dayCircleBadge}>
                <Text style={styles.dayCircleBadgeText}>{selectedDay}</Text>
              </View>
              <View>
                <Text style={styles.detailDateTitle}>
                  Ngày {selectedDay} Tháng {selectedMonth} , {selectedYear}
                </Text>
                <Text style={styles.detailDateSubtitle}>
                  {currentDayOfWeekName} • {totalTxCount} giao dịch lưu dấu
                </Text>
              </View>
            </View>

            {isTodaySelected && (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>Hôm nay</Text>
              </View>
            )}
          </View>

          {/* Hero Photo Card */}
          <View style={styles.heroPhotoWrapper}>
            <Image
              source={{ uri: currentHeroPhoto }}
              style={styles.heroPhotoImage}
              resizeMode="cover"
            />
            {/* Top Badges */}
            <View style={styles.heroTopBadges}>
              <View style={styles.locationPill}>
                <Text style={styles.locationIcon}>🍴</Text>
                <Text style={styles.locationText}>{currentStoreName}</Text>
              </View>

              <View style={styles.heroAmountPill}>
                <Text style={styles.heroAmountText}>{currentTotalAmount}</Text>
              </View>
            </View>

            {/* Bottom Overlay with Caption */}
            <View style={styles.heroBottomOverlay}>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroCategoryPill}>
                  <Text style={styles.heroCategoryText}>
                    {fallbackDayData.category || 'Ẩm thực & Bạn bè'}
                  </Text>
                </View>
                <Text style={styles.heroTimeText}>
                  {fallbackDayData.time || '19:42 PM'}
                </Text>
              </View>

              <Text style={styles.heroCaptionQuote}>
                {currentNote}
              </Text>
            </View>
          </View>

          {/* Monett Mascot Feedback Card */}
          <View style={styles.mascotCard}>
            <Image
              source={require('../../../assets/frog-hat-coin.png')}
              style={styles.mascotAvatar}
              resizeMode="contain"
            />
            <View style={styles.mascotContent}>
              <View style={styles.mascotTitleRow}>
                <Text style={styles.mascotTitle}>Monett Mascot</Text>
                <Text style={styles.mascotStar}>⭐</Text>
              </View>
              <Text style={styles.mascotQuote}>
                “Một khoảnh khắc ý nghĩa và rất xứng đáng!”
              </Text>
            </View>
          </View>

          {/* Section: CHI TIẾT CHI TIÊU */}
          <View style={styles.txSectionHeader}>
            <Text style={styles.txSectionTitle}>CHI TIẾT CHI TIÊU</Text>
          </View>

          {isLoadingDate ? (
            <ActivityIndicator size="small" color="#047857" style={{ marginVertical: 16 }} />
          ) : currentItems.length > 0 ? (
            <View style={styles.txListContainer}>
              {currentItems.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={styles.txItemRow}
                  activeOpacity={0.7}
                  onPress={() => onNavigateToDetail && onNavigateToDetail(item.id)}
                >
                  <View style={styles.txIconBox}>
                    <Ionicons
                      name={item.icon as any || 'restaurant-outline'}
                      size={20}
                      color="#047857"
                    />
                  </View>

                  <View style={styles.txItemInfo}>
                    <Text style={styles.txItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.txItemSubtitle}>
                      {item.subtitle}
                    </Text>
                  </View>

                  <Text style={styles.txItemAmount}>
                    {item.amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyDayContainer}>
              <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyDayText}>Chưa có giao dịch nào được ghi nhận cho ngày này</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  // 1. Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
  },
  brandTextWrap: {
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: -2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 3,
  },
  streakFlame: {
    fontSize: 13,
  },
  streakCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
  },
  bellRedDot: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#047857',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },

  // 2. Month Navigator
  monthNavWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },
  monthArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleCenter: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  monthSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },

  // 3. Stat Summary Cards
  summaryCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardTexts: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },

  // 4. Calendar Grid Card
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
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
  emptyCellDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyCellDayTextSelected: {
    color: '#059669',
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
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
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },

  // 5. Big Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 6. Selected Day Details
  dayDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayCircleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  detailDateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailDateSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  todayPill: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },

  // Hero Photo
  heroPhotoWrapper: {
    height: 210,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
  },
  heroPhotoImage: {
    width: '100%',
    height: '100%',
  },
  heroTopBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroAmountPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroAmountText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#34D399',
  },
  heroBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 12,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroCategoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heroCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  heroTimeText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  heroCaptionQuote: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#FFFFFF',
    lineHeight: 18,
  },

  // Mascot Card
  mascotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 12,
    marginBottom: 16,
  },
  mascotAvatar: {
    width: 44,
    height: 44,
  },
  mascotContent: {
    flex: 1,
  },
  mascotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  mascotTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },
  mascotStar: {
    fontSize: 12,
  },
  mascotQuote: {
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '500',
  },

  // Chi tiết chi tiêu
  txSectionHeader: {
    marginBottom: 10,
  },
  txSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  txListContainer: {
    gap: 8,
  },
  txItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  txItemInfo: {
    flex: 1,
  },
  txItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  txItemSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
  },
  txItemAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyDayContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyDayText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
