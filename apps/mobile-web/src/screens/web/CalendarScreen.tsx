import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export interface DayTransactionItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  iconBg: string;
  iconText: string;
}

export interface DayCalendarData {
  dayNum: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  hasPhoto: boolean;
  amountDisplay?: string;
  rawAmount?: number;
  categoryIcon?: string;
  categoryName?: string;
  photoUrl?: string;
  photoTitle?: string;
  photoCategoryTag?: string;
  emotionQuote?: string;
  items?: DayTransactionItem[];
  isFutureOrUpcoming?: boolean;
}

// 31 Ngày của Tháng 10/2024 khớp hoàn hảo với Ảnh 1
const OCTOBER_DAYS: DayCalendarData[] = [
  // Ngày 30 tháng trước (Thứ 2)
  {
    dayNum: 30,
    month: 9,
    year: 2024,
    isCurrentMonth: false,
    hasPhoto: false,
  },
  // Tuần 1
  {
    dayNum: 1,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '65k',
    rawAmount: 65000,
    categoryIcon: '🧾',
    categoryName: 'Tạp hóa',
    emotionQuote: 'Mua ít đồ khô và gia vị nấu ăn tại nhà.',
    items: [
      { id: '1-1', title: 'Tạp hóa cô Ba', subtitle: '08:15 Sáng • Tiền mặt', amount: '65.000đ', iconBg: '#DCFCE7', iconText: '🛒' },
    ],
  },
  {
    dayNum: 2,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '120k',
    rawAmount: 120000,
    categoryIcon: '⛽',
    categoryName: 'Xăng xe',
    emotionQuote: 'Đổ đầy bình xăng cho tuần làm việc mới.',
    items: [
      { id: '2-1', title: 'Cây xăng Petrolimex', subtitle: '07:45 Sáng • Thẻ Techcombank', amount: '120.000đ', iconBg: '#E0F2FE', iconText: '⛽' },
    ],
  },
  {
    dayNum: 3,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '45k',
    rawAmount: 45000,
    categoryIcon: '☕',
    categoryName: 'Cà phê',
    emotionQuote: 'Ly Americano tỉnh táo trước cuộc họp quan trọng.',
    items: [
      { id: '3-1', title: 'All Day Coffee', subtitle: '09:00 Sáng • Ví MoMo', amount: '45.000đ', iconBg: '#FEF3C7', iconText: '☕' },
    ],
  },
  {
    dayNum: 4,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '80k',
    rawAmount: 80000,
    categoryIcon: '🍔',
    categoryName: 'Cơm trưa',
    emotionQuote: 'Ăn trưa cơm văn phòng thanh đạm cùng team.',
    items: [
      { id: '4-1', title: 'Cơm tấm Sài Gòn', subtitle: '12:20 Trưa • Tiền mặt', amount: '80.000đ', iconBg: '#FCE7F3', iconText: '🍱' },
    ],
  },
  {
    dayNum: 5,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: true,
    amountDisplay: '280k',
    rawAmount: 280000,
    categoryName: 'Bánh mì & Cà phê',
    photoUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=80',
    photoTitle: 'Bánh mì & Cà phê',
    photoCategoryTag: 'Ăn uống & Thư giãn',
    emotionQuote: 'Thứ 7 thong thả ngồi ngắm phố phường cùng ly latte béo ngậy và bánh sừng bò giòn tan.',
    items: [
      { id: '5-1', title: 'Combo Bánh Mì & Latte', subtitle: '09:30 Sáng • Thẻ Sacombank', amount: '280.000đ', iconBg: '#FEF3C7', iconText: '🥖' },
    ],
  },
  {
    dayNum: 6,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '0đ',
    rawAmount: 0,
    categoryIcon: '🌱',
    categoryName: 'No Spend Day',
    emotionQuote: 'Một ngày chủ nhật trọn vẹn không tốn một đồng, đọc sách và dọn dẹp phòng!',
    items: [],
  },

  // Tuần 2
  {
    dayNum: 7,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '150k',
    rawAmount: 150000,
    categoryIcon: '🛒',
    categoryName: 'Siêu thị',
    emotionQuote: 'Mua trái cây tươi và sữa chua cho cả tuần.',
    items: [
      { id: '7-1', title: 'WinMart+', subtitle: '18:15 Chiều • Ví MoMo', amount: '150.000đ', iconBg: '#DCFCE7', iconText: '🛒' },
    ],
  },
  {
    dayNum: 8,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '55k',
    rawAmount: 55000,
    categoryIcon: '🧋',
    categoryName: 'Trà sữa',
    emotionQuote: 'Tự thưởng ly trà ô long sữa 30% đường buổi chiều.',
    items: [
      { id: '8-1', title: 'Phúc Long Coffee & Tea', subtitle: '15:30 Chiều • Tiền mặt', amount: '55.000đ', iconBg: '#FEE2E2', iconText: '🧋' },
    ],
  },
  {
    dayNum: 9,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '110k',
    rawAmount: 110000,
    categoryIcon: '🍱',
    categoryName: 'Ăn trưa',
    emotionQuote: 'Cơm thố bò xào nấm thơm lừng.',
    items: [
      { id: '9-1', title: 'Cơm Thố Xá Xíu', subtitle: '12:10 Trưa • Chuyển khoản', amount: '110.000đ', iconBg: '#FEF3C7', iconText: '🍲' },
    ],
  },
  {
    dayNum: 10,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: true,
    amountDisplay: '340k',
    rawAmount: 340000,
    categoryName: 'Sách phát triển',
    photoUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    photoTitle: 'Sách phát triển',
    photoCategoryTag: 'Học tập & Tri thức',
    emotionQuote: 'Đầu tư vào bản thân là khoản đầu tư sinh lời nhất. Mua 2 cuốn sách tâm đắc.',
    items: [
      { id: '10-1', title: 'Nhà sách Fahasa', subtitle: '19:40 Tối • Thẻ Visa', amount: '340.000đ', iconBg: '#E0E7FF', iconText: '📚' },
    ],
  },
  {
    dayNum: 11,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '75k',
    rawAmount: 75000,
    categoryIcon: '🚗',
    categoryName: 'Grab ride',
    emotionQuote: 'Trời mưa to gọi Grab car về nhà an toàn.',
    items: [
      { id: '11-1', title: 'Grab Car', subtitle: '18:30 Chiều • Thẻ Sacombank', amount: '75.000đ', iconBg: '#DCFCE7', iconText: '🚕' },
    ],
  },
  {
    dayNum: 12,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '420k',
    rawAmount: 420000,
    categoryIcon: '🛍️',
    categoryName: 'Mua sắm',
    emotionQuote: 'Mua áo thun cotton Uniqlo chuẩn bị cho mùa thu.',
    items: [
      { id: '12-1', title: 'Uniqlo Vincom', subtitle: '16:00 Chiều • Thẻ Techcombank', amount: '420.000đ', iconBg: '#FCE7F3', iconText: '👕' },
    ],
  },
  {
    dayNum: 13,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '90k',
    rawAmount: 90000,
    categoryIcon: '🍵',
    categoryName: 'Matcha latte',
    emotionQuote: 'Matcha latte thơm ngát tại quán quen cuối tuần.',
    items: [
      { id: '13-1', title: 'Morico Matcha Cafe', subtitle: '14:20 Chiều • Ví MoMo', amount: '90.000đ', iconBg: '#DCFCE7', iconText: '🍵' },
    ],
  },

  // Tuần 3
  {
    dayNum: 14,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: true,
    amountDisplay: '125k',
    rawAmount: 125000,
    categoryName: 'Trà sữa & Bill',
    photoUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&auto=format&fit=crop&q=80',
    photoTitle: 'Trà sữa & Bill',
    photoCategoryTag: 'Thư giãn & Đồ uống',
    emotionQuote: 'Uống trà sữa cùng đồng nghiệp để có thêm năng lượng hoàn thành deadline.',
    items: [
      { id: '14-1', title: 'Trà Sữa KOI Thé', subtitle: '15:10 Chiều • Thẻ Sacombank', amount: '125.000đ', iconBg: '#FEF3C7', iconText: '🧋' },
    ],
  },
  {
    dayNum: 15,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '600k',
    rawAmount: 600000,
    categoryIcon: '⚡',
    categoryName: 'Tiền điện',
    emotionQuote: 'Hóa đơn tiền điện tháng 9 đã thanh toán đúng hạn.',
    items: [
      { id: '15-1', title: 'EVN HCMC', subtitle: '09:00 Sáng • Auto debit', amount: '600.000đ', iconBg: '#FEF3C7', iconText: '⚡' },
    ],
  },
  {
    dayNum: 16,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '70k',
    rawAmount: 70000,
    categoryIcon: '🍜',
    categoryName: 'Phở bò',
    emotionQuote: 'Bát phở bò tái bắp nóng hổi sáng sớm.',
    items: [
      { id: '16-1', title: 'Phở Thìn Lò Đúc', subtitle: '07:30 Sáng • Tiền mặt', amount: '70.000đ', iconBg: '#FEE2E2', iconText: '🍜' },
    ],
  },
  {
    dayNum: 17,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '190k',
    rawAmount: 190000,
    categoryIcon: '🏊',
    categoryName: 'Thẻ bơi',
    emotionQuote: 'Bơi lội 1 tiếng xả stress sau giờ làm việc.',
    items: [
      { id: '17-1', title: 'Hồ bơi Lam Sơn', subtitle: '18:00 Chiều • Tiền mặt', amount: '190.000đ', iconBg: '#E0F2FE', iconText: '🏊' },
    ],
  },
  {
    dayNum: 18,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: true,
    amountDisplay: '1.85M',
    rawAmount: 1850000,
    categoryName: 'Bàn phím cơ',
    photoUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    photoTitle: 'Bàn phím cơ',
    photoCategoryTag: 'Công cụ & Làm việc',
    emotionQuote: 'Nâng cấp bàn phím cơ gõ êm tay, tăng 50% cảm hứng làm việc mỗi ngày!',
    items: [
      { id: '18-1', title: 'Bàn phím cơ Keychron', subtitle: '14:00 Chiều • Chuyển khoản', amount: '1.850.000đ', iconBg: '#E0E7FF', iconText: '⌨️' },
    ],
  },
  {
    dayNum: 19,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '85k',
    rawAmount: 85000,
    categoryIcon: '🧁',
    categoryName: 'Bánh ngọt',
    emotionQuote: 'Bánh sừng bò phô mai béo ngậy chiều thứ 7.',
    items: [
      { id: '19-1', title: 'Paris Baguette', subtitle: '16:30 Chiều • Tiền mặt', amount: '85.000đ', iconBg: '#FCE7F3', iconText: '🥐' },
    ],
  },
  {
    dayNum: 20,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: true,
    amountDisplay: '1.2M',
    rawAmount: 1200000,
    categoryName: 'Bữa cơm gia đình',
    photoUrl: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=600&auto=format&fit=crop&q=80',
    photoTitle: 'Bữa cơm gia đình',
    photoCategoryTag: 'Gia đình & Yêu thương',
    emotionQuote: 'Bữa cơm ấm áp sum vầy cùng ba mẹ ngày chủ nhật, không có gì quý bằng.',
    items: [
      { id: '20-1', title: 'Nhà hàng Niêu Sài Gòn', subtitle: '18:45 Tối • Thẻ Sacombank', amount: '1.200.000đ', iconBg: '#DCFCE7', iconText: '🍲' },
    ],
  },

  // Tuần 4
  {
    dayNum: 21,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '65k',
    rawAmount: 65000,
    categoryIcon: '☕',
    categoryName: 'Espresso',
    emotionQuote: 'Cà phê sáng khởi động tuần mới suôn sẻ.',
    items: [
      { id: '21-1', title: 'The Workshop Coffee', subtitle: '08:00 Sáng • Tiền mặt', amount: '65.000đ', iconBg: '#FEF3C7', iconText: '☕' },
    ],
  },
  {
    dayNum: 22,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '135k',
    rawAmount: 135000,
    categoryIcon: '💊',
    categoryName: 'Nhà thuốc',
    emotionQuote: 'Bổ sung vitamin C và viên kẽm tăng sức đề kháng.',
    items: [
      { id: '22-1', title: 'Nhà thuốc Long Châu', subtitle: '19:15 Tối • Ví MoMo', amount: '135.000đ', iconBg: '#E0F2FE', iconText: '💊' },
    ],
  },
  {
    dayNum: 23,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '95k',
    rawAmount: 95000,
    categoryIcon: '🍲',
    categoryName: 'Bún chả',
    emotionQuote: 'Bún chả que tre nướng than hoa thơm lừng.',
    items: [
      { id: '23-1', title: 'Bún chả Ánh Hồng', subtitle: '12:15 Trưa • Tiền mặt', amount: '95.000đ', iconBg: '#FEF3C7', iconText: '🥢' },
    ],
  },
  // NGÀY 24: HÔM NAY (SELECTED & HAS PHOTO PIZZA 4P'S)
  {
    dayNum: 24,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: true,
    amountDisplay: '450k',
    rawAmount: 450000,
    categoryName: 'Pizza 4P\'s',
    photoUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
    photoTitle: 'Hôm nay: Pizz...',
    photoCategoryTag: 'Ăn uống & Thư giãn',
    emotionQuote: '“Tự thưởng pizza phô mai thơm lừng & salad bơ cùng đồng nghiệp ăn mừng xong sprint! Đáng từng đồng.”',
    items: [
      {
        id: '24-1',
        title: "Pizza 4P's Cheese Lover",
        subtitle: '12:45 Trưa • Thẻ Sacombank',
        amount: '390.000đ',
        iconBg: '#DCFCE7',
        iconText: '🍕',
      },
      {
        id: '24-2',
        title: 'Nước ngọt & Salad tráng mi...',
        subtitle: '13:10 Trưa • Tiền mặt',
        amount: '60.000đ',
        iconBg: '#FFEDD5',
        iconText: '🥤',
      },
    ],
  },
  {
    dayNum: 25,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '--',
    categoryIcon: '⊕',
    categoryName: 'Dự kiến',
    isFutureOrUpcoming: true,
    emotionQuote: 'Kế hoạch tiết kiệm cho cuối tuần sắp tới.',
    items: [],
  },
  {
    dayNum: 26,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '--',
    categoryIcon: '✈️',
    categoryName: 'Cuối tuần',
    isFutureOrUpcoming: true,
    emotionQuote: 'Chuyến dã ngoại ngoại ô cùng bạn bè.',
    items: [],
  },
  {
    dayNum: 27,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '--',
    categoryIcon: '🌐',
    categoryName: 'Workshop',
    isFutureOrUpcoming: true,
    emotionQuote: 'Tham gia buổi workshop chia sẻ kỹ năng.',
    items: [],
  },

  // Tuần 5
  {
    dayNum: 28,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '--',
    categoryIcon: '📅',
    categoryName: 'Sắp tới',
    isFutureOrUpcoming: true,
    emotionQuote: 'Chuẩn bị kế hoạch tài chính cho tuần cuối tháng.',
    items: [],
  },
  {
    dayNum: 29,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '--',
    categoryIcon: '📅',
    categoryName: 'Sắp tới',
    isFutureOrUpcoming: true,
    emotionQuote: 'Duy trì chuỗi ghi chép đều đặn mỗi ngày.',
    items: [],
  },
  {
    dayNum: 30,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '--',
    categoryIcon: '📅',
    categoryName: 'Sắp tới',
    isFutureOrUpcoming: true,
    emotionQuote: 'Kiểm tra lại ngân sách trước khi bước sang tháng mới.',
    items: [],
  },
  {
    dayNum: 31,
    month: 10,
    year: 2024,
    isCurrentMonth: true,
    hasPhoto: false,
    amountDisplay: '--',
    categoryIcon: '🎃',
    categoryName: 'Halloween',
    isFutureOrUpcoming: true,
    emotionQuote: 'Đêm hội Halloween vui vẻ cùng người thân!',
    items: [],
  },
];

export const WebCalendarScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { user } = useAuth();
  const { language } = useLanguage();

  const [selectedDayNum, setSelectedDayNum] = useState<number>(24);
  const [currentMonthName, setCurrentMonthName] = useState('Tháng 10, 2024');

  // Tìm ngày đang chọn trong danh sách
  const activeDay = OCTOBER_DAYS.find(
    (d) => d.isCurrentMonth && d.dayNum === selectedDayNum
  ) || OCTOBER_DAYS.find((d) => d.dayNum === 24)!;

  const handleSelectDay = (day: DayCalendarData) => {
    if (!day.isCurrentMonth) return;
    setSelectedDayNum(day.dayNum);
  };

  const handleTriggerUpload = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          alert(`Đã chọn ảnh: ${file.name}. Ảnh sẽ được lưu vào nhật ký ngày ${selectedDayNum}!`);
        }
      };
      input.click();
    } else {
      alert(`Mở thư viện ảnh để tải lên cho ngày ${selectedDayNum}!`);
    }
  };

  return (
    <ScrollView style={styles.scrollWrapper} contentContainerStyle={styles.scrollContent}>
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
                <Text style={styles.pillGreenText}>Thực tế & Trực quan</Text>
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
              onPress={() => alert('Tháng trước')}
            >
              <Text style={styles.monthArrowText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.monthTitleWrapper}>
              <Text style={styles.calendarMiniIcon}>📅</Text>
              <Text style={styles.monthNavTitle}>{currentMonthName}</Text>
            </View>
            <TouchableOpacity
              style={styles.monthArrowBtn}
              onPress={() => alert('Tháng sau')}
            >
              <Text style={styles.monthArrowText}>›</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.topActionUploadBtn}
            onPress={handleTriggerUpload}
            activeOpacity={0.85}
          >
            <Text style={styles.topActionUploadIcon}>📤</Text>
            <Text style={styles.topActionUploadText}>Tải ảnh & Ghi chú vào ngày...</Text>
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
            <Text style={styles.mascotTitle}>Tuyệt vời lắm, Steward!</Text>
            <Text style={styles.mascotSubtitle} numberOfLines={2}>
              Mỗi bức ảnh là một mỏ neo cảm xúc giữ cho ngân sách của bạn luôn trong tầm kiểm soát.
            </Text>
          </View>
        </View>

        {/* Card 2: Tổng chi tháng 10 */}
        <View style={styles.statCard}>
          <View style={styles.statCardTopRow}>
            <Text style={styles.statLabel}>TỔNG CHI THÁNG 10</Text>
            <View style={[styles.statIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Text style={{ fontSize: 13 }}>💵</Text>
            </View>
          </View>
          <Text style={styles.statMainValue}>14.850.000 <Text style={{ fontSize: 15 }}>đ</Text></Text>
          <View style={styles.trendRow}>
            <Text style={styles.trendGreenText}>↘ Tiết kiệm 8% so với T9</Text>
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
            26 <Text style={styles.statSubValue}>/ 31 ngày</Text>
          </Text>
          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: '84%' }]} />
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
            <Text style={{ color: '#D97706' }}>18</Text>{' '}
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>ngày chụp liên tiếp</Text>
          </Text>
          <Text style={styles.recordSubText}>Kỷ lục cá nhân: 24 ngày</Text>
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
                <Text style={styles.pillDaysText}>31 Ngày</Text>
              </View>
            </View>

            {/* Legend on Right */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Đã có ảnh</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E0E7FF' }]} />
                <Text style={styles.legendText}>Chưa phát sinh</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#047857' }]} />
                <Text style={styles.legendText}>Hôm nay (24/10)</Text>
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
            {OCTOBER_DAYS.map((day, idx) => {
              const isSelected = day.isCurrentMonth && day.dayNum === selectedDayNum;
              const isToday = day.isCurrentMonth && day.dayNum === 24;

              // Ngày tháng trước (ngày 30)
              if (!day.isCurrentMonth) {
                return (
                  <View key={`prev-${idx}`} style={[styles.calCell, styles.calCellPrevMonth]}>
                    <Text style={styles.prevMonthNum}>{day.dayNum}</Text>
                  </View>
                );
              }

              // Ô có ẢNH (Days 5, 10, 14, 18, 20, 24...)
              if (day.hasPhoto) {
                return (
                  <TouchableOpacity
                    key={`day-${day.dayNum}`}
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
                    {/* Dark gradient overlay for legibility */}
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
                        {isToday ? 'Hôm nay: Pizz...' : day.photoTitle}
                      </Text>
                      <View style={styles.photoMetaRow}>
                        <Text style={styles.photoMetaText}>📷 1 ảnh</Text>
                        {isToday && (
                          <View style={styles.todayMiniPlusBtn}>
                            <Text style={styles.todayPlusText}>+</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              // Ô KHÔNG CÓ ẢNH (Bình thường)
              return (
                <TouchableOpacity
                  key={`day-${day.dayNum}`}
                  style={[
                    styles.calCell,
                    styles.calCellNormal,
                    isSelected && styles.calCellSelectedGlow,
                  ]}
                  onPress={() => handleSelectDay(day)}
                  activeOpacity={0.85}
                >
                  {/* Top: Day Num & Amount */}
                  <View style={styles.normalTopRow}>
                    <Text style={styles.normalDayNum}>{day.dayNum}</Text>
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
                      {day.categoryIcon || '•'}
                    </Text>
                  </View>

                  {/* Bottom: Category Name */}
                  <Text style={styles.normalCategoryName} numberOfLines={1}>
                    {day.categoryName || ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer of Calendar */}
          <View style={styles.calFooterRow}>
            <Text style={styles.calFooterTip}>
              💡 Bấm vào bất kỳ ô ngày nào để mở góc kỷ niệm và tải ảnh hóa đơn tương ứng
            </Text>
            <TouchableOpacity onPress={() => alert('Đang xuất báo cáo ảnh PDF...')}>
              <Text style={styles.calFooterExportLink}>Xuất bản báo cáo ảnh PDF →</Text>
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
                  Ngày {activeDay.dayNum} Tháng {activeDay.month || 10}, {activeDay.year || 2024}
                </Text>
              </View>
              {activeDay.dayNum === 24 && (
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
                    {activeDay.rawAmount ? `${activeDay.rawAmount.toLocaleString('vi-VN')}đ` : '450.000đ'}
                  </Text>
                </View>
                <View style={styles.featuredCategoryBadge}>
                  <Text style={styles.featuredCategoryText}>
                    {activeDay.photoCategoryTag || 'Ăn uống & Thư giãn'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyPhotoNoticeBox}>
                <Text style={{ fontSize: 28 }}>📸</Text>
                <Text style={styles.emptyPhotoNoticeTitle}>Chưa có ảnh lưu niệm cho ngày này</Text>
                <Text style={styles.emptyPhotoNoticeSub}>
                  Hãy chụp hoặc tải lên một bức ảnh hóa đơn / món ăn để hoàn thiện nhật ký!
                </Text>
              </View>
            )}
          </View>

          {/* Card 2: Cảm nhận chi tiêu (Emotion Note) */}
          <View style={styles.emotionCard}>
            <View style={styles.emotionHeaderRow}>
              <Text style={{ fontSize: 14 }}>🟠</Text>
              <Text style={styles.emotionHeaderTitle}>Cảm nhận chi tiêu:</Text>
            </View>
            <Text style={styles.emotionQuoteText}>
              {activeDay.emotionQuote ||
                '“Tự thưởng pizza phô mai thơm lừng & salad bơ cùng đồng nghiệp ăn mừng xong sprint! Đáng từng đồng.”'}
            </Text>
          </View>

          {/* Card 3: Tải ảnh khoảnh khắc hoặc hóa đơn (Dropzone) */}
          <View style={styles.uploadDropCard}>
            <Text style={styles.uploadDropTitle}>Tải lên ảnh khoảnh khắc hoặc hóa đơn:</Text>
            <TouchableOpacity
              style={styles.dropzoneBox}
              onPress={handleTriggerUpload}
              activeOpacity={0.8}
            >
              <View style={styles.dropzoneIconWrapper}>
                <Text style={{ fontSize: 20 }}>🖼️</Text>
              </View>
              <Text style={styles.dropzoneMainText}>Kéo thả ảnh chụp vào đây</Text>
              <Text style={styles.dropzoneSubText}>
                Hỗ trợ định dạng JPG, PNG, HEIC (Tối đa 15MB)
              </Text>
              <View style={styles.devicePickBtn}>
                <Text style={styles.devicePickBtnText}>Chọn từ thiết bị</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Card 4: KHOẢN CHI CỤ THỂ */}
          <View style={styles.itemsListCard}>
            <View style={styles.itemsListHeaderRow}>
              <Text style={styles.itemsListTitle}>KHOẢN CHI CỤ THỂ</Text>
              <TouchableOpacity onPress={() => alert('Thêm khoản chi mới')}>
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
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    </View>
                    <View style={styles.itemRightCol}>
                      <Text style={styles.itemAmount}>{item.amount}</Text>
                      <TouchableOpacity
                        onPress={() => alert(`Xóa khoản ${item.title}`)}
                        style={styles.trashBtn}
                      >
                        <Text style={{ fontSize: 13, color: '#94A3B8' }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#94A3B8' }}>Không có khoản chi nào ghi nhận</Text>
              </View>
            )}

            {/* Lời khen từ Ếch Monett */}
            <View style={styles.frogPraiseCard}>
              <View style={styles.frogPraiseIconBox}>
                <Text style={{ fontSize: 18 }}>🐸</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.frogPraiseTitle}>Lời khen từ Ếch Monett:</Text>
                <Text style={styles.frogPraiseQuote}>
                  “Bạn đã ghi chép đúng hạn! Tuyệt vời lắm, tiếp tục duy trì nhé!”
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
                Chụp ảnh món hàng bạn muốn mua và chờ 48 tiếng trước khi thanh toán để giảm 30% chi tiêu cảm tính.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
    width: '100%',
    gap: 20,
  },

  // ==================== 1. TOP HEADER BANNER ====================
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  monthArrowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  monthArrowText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
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
  },
  topActionUploadText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ==================== 2. STAT CARDS ROW ====================
  statCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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

  // ==================== 3. MAIN 2-COLUMN LAYOUT ====================
  mainColumnsContainer: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },

  // LEFT COLUMN: BẢN ĐỒ THỊ GIÁC CHI TIÊU (~65%)
  leftCalendarCol: {
    flex: 6.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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

  // Days of week row
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

  // Calendar Grid
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

  // Normal cell elements
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
  normalCategoryName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },

  // Photo cell elements
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

  // Calendar Footer
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

  // RIGHT COLUMN: ĐANG XEM NHẬT KÝ (~35%)
  rightDetailsCol: {
    flex: 3.5,
    gap: 14,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontSize: 18,
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
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 6,
  },
  emptyPhotoNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptyPhotoNoticeSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Emotion Note Card
  emotionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    gap: 6,
  },
  emotionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emotionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#B45309',
  },
  emotionQuoteText: {
    fontSize: 12.5,
    color: '#78350F',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // Upload Dropzone Card
  uploadDropCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
  },
  uploadDropTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropzoneBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  dropzoneIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropzoneMainText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropzoneSubText: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  devicePickBtn: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  devicePickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#087F5B',
  },

  // Items List Card
  itemsListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    padding: 2,
  },

  // Frog Praise Card inside Items Card
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

  // Visual Tip Card
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
});
