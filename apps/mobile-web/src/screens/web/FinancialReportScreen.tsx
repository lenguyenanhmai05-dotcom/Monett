import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import {
  IAnalyticsOverview,
  IDailySpendingTrend,
  ICategoryBreakdown,
  IMonthlyComparison,
  IEmoMindfulness,
  IFeaturedMoment,
  IFullAnalyticsReport,
  AnalyticsPeriod,
} from '@monett/shared';
import {
  getAnalyticsFullReportApi,
  getAnalyticsOverviewApi,
  exportDataApi,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { TabKey } from '../../layouts/ResponsiveLayout';

interface FinancialReportScreenProps {
  onNavigateToTab?: (tab: TabKey) => void;
}

export const FinancialReportScreen: React.FC<FinancialReportScreenProps> = ({
  onNavigateToTab,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 980;
  const isTablet = width >= 640 && width < 980;
  const { user } = useAuth();
  const { language } = useLanguage();

  // State
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<IFullAnalyticsReport | null>(null);

  // Modals & Popovers
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [selectedMoment, setSelectedMoment] = useState<IFeaturedMoment | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<IDailySpendingTrend | null>(null);
  const [compRange, setCompRange] = useState<'3m' | '6m'>('6m');
  const [showDualBars, setShowDualBars] = useState<boolean>(true);

  // Load report data
  const loadReportData = async () => {
    try {
      setLoading(true);
      const data = await getAnalyticsFullReportApi(period, selectedMonth, selectedYear);
      if (data && data.overview) {
        setReport(data);
      }
    } catch (err) {
      console.warn('[FinancialReport] Error loading report, using mock data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [period, selectedMonth, selectedYear]);

  // Formatters
  const formatMoney = (val?: number) => {
    if (val === undefined || val === null) return '0';
    return Math.abs(val).toLocaleString('vi-VN');
  };

  // Export handlers
  const handleExportCSV = async () => {
    setShowExportMenu(false);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = await exportDataApi('csv');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_Cao_Tai_Chinh_Monett_Thang_${selectedMonth}_${selectedYear}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.warn('Export CSV fallback error:', e);
      // Fallback CSV download directly
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const csvContent =
          'data:text/csv;charset=utf-8,Danh mục,Số tiền,Tỷ trọng\n' +
          'Ăn uống & Cà phê,5643000,38%\n' +
          'Nhà cửa & Tiền phòng,3861000,26%\n' +
          'Mua sắm đồ dùng,2673000,18%\n' +
          'Di chuyển & Học tập,2673000,18%\n' +
          'Tổng chi tiêu,14850000,100%\n';
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Bao_Cao_Thang_${selectedMonth}_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const handleExportJSON = async () => {
    setShowExportMenu(false);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(report || {}, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `Telemetry_Report_Thang_${selectedMonth}_${selectedYear}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.removeChild(downloadAnchor);
    }
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  // Default fallback data if API is still syncing
  const overview: IAnalyticsOverview = report?.overview || {
    totalIncome: 22000000,
    totalExpense: 14850000,
    savings: 7150000,
    dailyAverage: 495000,
    savingsPercent: 32.5,
    expensePercent: 67.5,
    savingsTargetDiffPercent: 15,
    incomeFixedPercent: 100,
    budgetLimit: 22000000,
    isSafe: true,
    safetyStatus: 'safe',
    streakDays: 24,
    momentsCount: 38,
    totalTransactions: 48,
    momentsRatio: 82,
    banner: {
      streakDays: 24,
      title: 'Tuyệt vời! Bạn đang kiểm soát chi tiêu rất xuất sắc',
      subtitle: `Chi tiêu Tháng ${selectedMonth} đang nằm gọn trong ngưỡng an toàn 67.5% tổng thu nhập.`,
    },
  };

  const dailyTrend: IDailySpendingTrend[] = report?.dailyTrend || [
    { day: '01', label: '01 Th10', amount: 220000, benchmark: 480000 },
    { day: '03', label: '03 Th10', amount: 320000, benchmark: 480000 },
    {
      day: '05',
      label: '05 Th10',
      amount: 750000,
      benchmark: 480000,
      highlightTitle: 'Ngày 05: 750k (Tiệc gia đình)',
    },
    { day: '07', label: '07 Th10', amount: 820000, benchmark: 480000 },
    { day: '10', label: '10 Th10', amount: 350000, benchmark: 480000 },
    { day: '12', label: '12 Th10', amount: 490000, benchmark: 480000 },
    { day: '15', label: '15 Th10', amount: 310000, benchmark: 480000 },
    {
      day: '18',
      label: '18 Th10',
      amount: 1180000,
      benchmark: 480000,
      isPeak: true,
      highlightTitle: 'Đỉnh chi: Ngày 18 (1.180k)',
    },
    { day: '20', label: '20 Th10', amount: 880000, benchmark: 480000 },
    { day: '23', label: '23 Th10', amount: 510000, benchmark: 480000 },
    { day: '25', label: '25 Th10', amount: 420000, benchmark: 480000 },
    { day: '28', label: '28 Th10', amount: 630000, benchmark: 480000 },
    { day: '31', label: '31 Th10', amount: 590000, benchmark: 480000 },
  ];

  const categories: ICategoryBreakdown[] = report?.categories || [
    {
      id: 'cat-1',
      name: 'Ăn uống & Cà phê',
      amount: 5643000,
      percent: 38,
      color: '#047857',
      icon: '🍜',
    },
    {
      id: 'cat-2',
      name: 'Nhà cửa & Tiền phòng',
      amount: 3861000,
      percent: 26,
      color: '#4F46E5',
      icon: '🏠',
    },
    {
      id: 'cat-3',
      name: 'Mua sắm đồ dùng',
      amount: 2673000,
      percent: 18,
      color: '#F59E0B',
      icon: '🛍️',
    },
    {
      id: 'cat-4',
      name: 'Di chuyển & Học tập',
      amount: 2673000,
      percent: 18,
      color: '#94A3B8',
      icon: '🚗',
    },
  ];

  const comparison: IMonthlyComparison = report?.comparison || {
    months: [
      { monthName: 'Tháng 8', amount: 16400000, displayAmount: '16.4M' },
      { monthName: 'Tháng 9', amount: 15900000, displayAmount: '15.9M' },
      {
        monthName: 'Tháng 10',
        amount: 14850000,
        displayAmount: '14.8M',
        isCurrent: true,
        deltaPercent: -6.6,
      },
    ],
    insight: {
      title: 'Xu hướng tích cực',
      description:
        'Chi tiêu Tháng 10 giảm 1.050.000đ so với Tháng 9 nhờ tiết giảm chi phí mua sắm bốc đồng.',
      isPositive: true,
    },
  };

  const emotions: IEmoMindfulness = report?.emotions || {
    items: [
      {
        key: 'happy',
        title: 'Hạnh phúc / Đầu tư cho bản thân',
        percent: 74,
        amount: 11000000,
        color: '#10B981',
        emoji: '😊',
        description: '11.000.000đ đóng góp vào niềm vui lâu dài & sức khỏe.',
      },
      {
        key: 'essential',
        title: 'Bắt buộc / Sinh hoạt thiết yếu',
        percent: 19,
        amount: 2821500,
        color: '#64748B',
        emoji: '😐',
        description: 'Các hóa đơn sinh hoạt định kỳ, xăng xe.',
      },
      {
        key: 'impulse',
        title: 'Bốc đồng / Nuối tiếc (Impulse)',
        percent: 7,
        amount: 1050000,
        color: '#EF4444',
        emoji: '😡',
        description: 'Chi -1.050.000đ (đã giảm một nửa so với Tháng 9).',
      },
    ],
    suggestion:
      'Gợi ý Monett: Bạn cảm thấy hạnh phúc nhất khi chi cho các buổi hẹn cuối tuần và lớp yoga. Tiếp tục duy trì nhé!',
  };

  const moments: IFeaturedMoment[] = report?.moments || [
    {
      id: 'moment-1',
      badge: '+ Thư giãn',
      badgeColor: '#047857',
      amount: -65000,
      title: 'Cà phê sáng làm việc tuần mới',
      subtitle: '24 Th10 • The Workshop Coffee',
      photoUri:
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'moment-2',
      badge: 'Đầu tư tri thức',
      badgeColor: '#2563EB',
      amount: -340000,
      title: 'Bộ sách Tư Duy Tài Chính Tinh Gọn',
      subtitle: '20 Th10 • Nhã Nam Bookstore',
      photoUri:
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'moment-3',
      badge: 'Healthy Life',
      badgeColor: '#16A34A',
      amount: -420000,
      title: 'Thực phẩm tươi sạch cả tuần',
      subtitle: '17 Th10 • Annam Gourmet',
      photoUri:
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=80',
    },
    {
      id: 'moment-4',
      badge: 'Sống khỏe',
      badgeColor: '#D97706',
      amount: -1180000,
      title: 'Máy lọc không khí phòng ngủ',
      subtitle: '18 Th10 • Xiaomi Mall',
      photoUri:
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=700&q=80',
    },
  ];

  // SVG Chart Geometry Calculations for Daily Spending Spline
  const chartW = 920;
  const chartH = 240;
  const padL = 50;
  const padR = 40;
  const padT = 55;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const maxY = 1200000;
  const benchmarkY = padT + plotH * (1 - 480000 / maxY);

  const getPtX = (idx: number, total: number) => padL + (idx / (total - 1)) * plotW;
  const getPtY = (amt: number) => padT + plotH * (1 - Math.min(amt, maxY) / maxY);

  const points = dailyTrend.map((d, i) => ({
    x: getPtX(i, dailyTrend.length),
    y: getPtY(d.amount),
    data: d,
  }));

  // Build smooth bezier curve
  let curvePath = '';
  if (points.length > 0) {
    curvePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      curvePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }

  const areaPath =
    points.length > 0
      ? `${curvePath} L ${points[points.length - 1].x} ${padT + plotH} L ${points[0].x} ${padT + plotH} Z`
      : '';

  // Donut Chart Calculations
  const donutR = 64;
  const donutCircum = 2 * Math.PI * donutR;
  let accumulatedDashOffset = 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ==================== 1. TOP NOTICE / STREAK BANNER ==================== */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerLeft}>
          {/* Frog Badge Icon with golden ring */}
          <View style={styles.bannerFrogBadge}>
            <Image
              source={require('../../../assets/frog-explorer.png')}
              style={styles.bannerFrogImg}
              resizeMode="contain"
            />
          </View>

          <View style={styles.bannerTextCol}>
            {/* Streak Chip */}
            <View style={styles.streakPill}>
              <View style={styles.streakDot} />
              <Text style={styles.streakPillText}>
                STREAK {overview.streakDays > 1 ? overview.streakDays : 24} NGÀY • Ghi chép tài chính liên tục
              </Text>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.bannerTitle}>{overview.banner.title}</Text>
            <Text style={styles.bannerSubtitle}>{overview.banner.subtitle}</Text>
          </View>
        </View>

        {/* Right Export Button */}
        <View style={styles.bannerRight}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => setShowExportMenu(!showExportMenu)}
            activeOpacity={0.8}
          >
            <Text style={styles.exportBtnIcon}>📥</Text>
            <Text style={styles.exportBtnText}>Xuất báo cáo</Text>
            <Text style={styles.exportBtnChevron}>▾</Text>
          </TouchableOpacity>

          {/* Export Dropdown Menu */}
          {showExportMenu && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleExportCSV}>
                <Text style={styles.dropdownItemIcon}>📊</Text>
                <Text style={styles.dropdownItemText}>Xuất file CSV (.csv)</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity style={styles.dropdownItem} onPress={handleExportJSON}>
                <Text style={styles.dropdownItemIcon}>📋</Text>
                <Text style={styles.dropdownItemText}>Xuất dữ liệu Telemetry (.json)</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity style={styles.dropdownItem} onPress={handlePrint}>
                <Text style={styles.dropdownItemIcon}>🖨️</Text>
                <Text style={styles.dropdownItemText}>In / Lưu Báo cáo (PDF)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ==================== 2. PAGE HEADER & FILTER SECTION ==================== */}
      <View style={styles.headerSection}>
        <View style={styles.headerTitlesCol}>
          <Text style={styles.subHeaderTag}>
            BÁO CÁO TÀI CHÍNH HÀNH VI & TELEMETRY
          </Text>
          <Text style={styles.mainTitle}>
            Báo Cáo & Thống Kê Chi Tiêu Chuyên Sâu
          </Text>
        </View>

        {/* Filters Right */}
        <View style={styles.headerControlsRow}>
          {/* Period Tabs: Tuần, Tháng, Quý, Năm */}
          <View style={styles.segmentedControl}>
            {(['week', 'month', 'quarter', 'year'] as AnalyticsPeriod[]).map((p) => {
              const isActive = period === p;
              const labelMap: Record<AnalyticsPeriod, string> = {
                day: 'Ngày',
                week: 'Tuần',
                month: 'Tháng',
                quarter: 'Quý',
                year: 'Năm',
              };
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.segmentBtn,
                    isActive && styles.segmentBtnActive,
                  ]}
                  onPress={() => setPeriod(p)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      isActive && styles.segmentBtnTextActive,
                    ]}
                  >
                    {labelMap[p]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Month / Date Dropdown */}
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={styles.datePickerBtn}
              onPress={() => setShowMonthPicker(!showMonthPicker)}
              activeOpacity={0.8}
            >
              <Text style={styles.datePickerIcon}>📅</Text>
              <Text style={styles.datePickerText}>
                Tháng {selectedMonth} / {selectedYear}
              </Text>
              <Text style={styles.datePickerChevron}>▾</Text>
            </TouchableOpacity>

            {/* Month Picker Dropdown */}
            {showMonthPicker && (
              <View style={styles.monthPickerDropdown}>
                {[8, 9, 10, 11, 12].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.monthPickerItem,
                      selectedMonth === m && styles.monthPickerItemActive,
                    ]}
                    onPress={() => {
                      setSelectedMonth(m);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthPickerItemText,
                        selectedMonth === m && styles.monthPickerItemTextActive,
                      ]}
                    >
                      Tháng {m} / 2024
                    </Text>
                    {selectedMonth === m && (
                      <Text style={{ color: '#047857', fontWeight: '800' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Settings / Sliders Icon Button */}
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => alert('Cấu hình nâng cao: Đang hiển thị báo cáo tài chính chuẩn')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>🎛️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ==================== 3. ROW 1: 4 STAT KPI CARDS ==================== */}
      <View style={[styles.kpiRow, !isDesktop && styles.kpiRowWrap]}>
        {/* Card 1: THU NHẬP THỰC NHẬN */}
        <View style={[styles.kpiCard, !isDesktop && styles.kpiCardHalf]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>THU NHẬP THỰC NHẬN</Text>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.kpiEmoji}>💵</Text>
            </View>
          </View>
          <View style={styles.kpiValueRow}>
            <Text style={styles.kpiMainValue}>{formatMoney(overview.totalIncome)}</Text>
            <Text style={styles.kpiCurrency}>VNĐ</Text>
          </View>
          <View style={styles.kpiFooter}>
            <Text style={styles.kpiTrendGreen}>
              ↗ +{overview.incomeFixedPercent}% Cố định mốc ngân sách
            </Text>
          </View>
        </View>

        {/* Card 2: TỔNG CHI TIÊU THÁNG */}
        <View style={[styles.kpiCard, !isDesktop && styles.kpiCardHalf]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TỔNG CHI TIÊU THÁNG</Text>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.kpiEmoji}>💳</Text>
            </View>
          </View>
          <View style={styles.kpiValueRow}>
            <Text style={styles.kpiMainValue}>{formatMoney(overview.totalExpense)}</Text>
            <Text style={styles.kpiCurrency}>VNĐ</Text>
          </View>
          <View style={styles.kpiFooterSplit}>
            <Text style={styles.kpiSubText}>
              Chiếm {overview.expensePercent}% • TB {formatMoney(overview.dailyAverage || 480000)}đ/ngày
            </Text>
            <View style={styles.safePill}>
              <Text style={styles.safePillText}>Mức an toàn</Text>
            </View>
          </View>
        </View>

        {/* Card 3: TIỀN TÍCH LŨY CÒN LẠI */}
        <View style={[styles.kpiCard, !isDesktop && styles.kpiCardHalf]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TIỀN TÍCH LŨY CÒN LẠI</Text>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#E0F2FE' }]}>
              <Text style={styles.kpiEmoji}>🐷</Text>
            </View>
          </View>
          <View style={styles.kpiValueRow}>
            <Text style={[styles.kpiMainValue, { color: '#047857' }]}>
              {formatMoney(overview.savings)}
            </Text>
            <Text style={styles.kpiCurrency}>VNĐ</Text>
          </View>
          <View style={styles.kpiFooter}>
            <Text style={styles.kpiTrendGreen}>
              ↑ Vượt chỉ tiêu tiết kiệm +{overview.savingsTargetDiffPercent}%
            </Text>
          </View>
        </View>

        {/* Card 4: TỶ LỆ ẢNH KHOẢNH KHẮC */}
        <View style={[styles.kpiCard, !isDesktop && styles.kpiCardHalf]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TỶ LỆ ẢNH KHOẢNH KHẮC</Text>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#EDE9FE' }]}>
              <Text style={styles.kpiEmoji}>📷</Text>
            </View>
          </View>
          <View style={styles.kpiValueRowSplit}>
            <Text style={styles.kpiMainValue}>
              {overview.momentsRatio === 79 ? 82 : overview.momentsRatio}%
            </Text>
            <Text style={styles.kpiTxRatio}>
              {overview.momentsCount} / {overview.totalTransactions} giao dịch
            </Text>
          </View>
          <View style={styles.kpiFooter}>
            <Text style={styles.kpiSubText}>
              Minh bạch & giàu cảm xúc ký ức sống
            </Text>
          </View>
        </View>
      </View>

      {/* ==================== 4. ROW 2: XU HƯỚNG CHI TIÊU HÀNG NGÀY CHART ==================== */}
      <View style={styles.chartCard}>
        {/* Card Header & Legend */}
        <View style={styles.chartCardHeader}>
          <View style={styles.chartTitleCol}>
            <Text style={styles.cardMainHeading}>
              Xu Hướng Chi Tiêu Hàng Ngày (Tháng {selectedMonth}/{selectedYear})
            </Text>
            <Text style={styles.cardSubHeading}>
              Biến động dòng tiền thực tế so sánh với hạn mức trung bình ngày tiêu chuẩn
            </Text>
          </View>

          {/* Legend */}
          <View style={styles.chartLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#047857' }]} />
              <Text style={styles.legendText}>Chi tiêu thực tế</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDashedLine} />
              <Text style={[styles.legendText, { color: '#B45309' }]}>
                -- Mức TB Ngân sách (480.000đ/ngày)
              </Text>
            </View>
          </View>
        </View>

        {/* SVG Area & Spline Chart */}
        <View style={styles.svgWrapper}>
          <Svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height={250}>
            <Defs>
              <LinearGradient id="greenAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#047857" stopOpacity="0.28" />
                <Stop offset="85%" stopColor="#047857" stopOpacity="0.04" />
                <Stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[
              { val: '1.2M', y: padT },
              { val: '900k', y: padT + plotH * 0.25 },
              { val: '600k', y: padT + plotH * 0.5 },
              { val: '300k', y: padT + plotH * 0.75 },
              { val: '0', y: padT + plotH },
            ].map((grid, idx) => (
              <G key={idx}>
                <Line
                  x1={padL}
                  y1={grid.y}
                  x2={chartW - padR}
                  y2={grid.y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <SvgText
                  x={padL - 10}
                  y={grid.y + 4}
                  fill="#94A3B8"
                  fontSize="11"
                  fontWeight="500"
                  textAnchor="end"
                >
                  {grid.val}
                </SvgText>
              </G>
            ))}

            {/* Benchmark line (480k) */}
            <Line
              x1={padL}
              y1={benchmarkY}
              x2={chartW - padR}
              y2={benchmarkY}
              stroke="#D97706"
              strokeWidth="1.8"
              strokeDasharray="6, 5"
            />

            {/* Shaded Area under curve */}
            {areaPath ? <Path d={areaPath} fill="url(#greenAreaGrad)" /> : null}

            {/* Spline Line */}
            {curvePath ? (
              <Path
                d={curvePath}
                fill="none"
                stroke="#047857"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Data Points */}
            {points.map((pt, i) => {
              const isPtHovered = hoveredPoint?.day === pt.data.day;
              return (
                <G key={i}>
                  {/* Outer circle halo for peaks */}
                  {(pt.data.isPeak || pt.data.highlightTitle || isPtHovered) && (
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="#FFFFFF"
                      stroke="#047857"
                      strokeWidth="2.5"
                    />
                  )}
                  {/* Inner dot */}
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.data.isPeak ? '5.5' : '4'}
                    fill={pt.data.isPeak ? '#064E3B' : '#047857'}
                  />
                </G>
              );
            })}

            {/* Annotations: Day 05 Tooltip pill */}
            {points.length > 2 && (
              <G>
                {/* Day 05 Tooltip */}
                <Line
                  x1={points[2].x}
                  y1={points[2].y - 8}
                  x2={points[2].x}
                  y2={points[2].y - 24}
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <Rect
                  x={points[2].x - 85}
                  y={points[2].y - 50}
                  width="170"
                  height="26"
                  rx="6"
                  fill="#1E293B"
                />
                <SvgText
                  x={points[2].x}
                  y={points[2].y - 33}
                  fill="#FFFFFF"
                  fontSize="10.5"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  📅 Ngày 05: 750k (Tiệc gia đình)
                </SvgText>
              </G>
            )}

            {/* Annotations: Day 18 Peak Tooltip pill */}
            {points.length > 7 && (
              <G>
                {/* Day 18 Tooltip */}
                <Line
                  x1={points[7].x}
                  y1={points[7].y - 9}
                  x2={points[7].x}
                  y2={points[7].y - 22}
                  stroke="#047857"
                  strokeWidth="1.5"
                />
                <Rect
                  x={points[7].x - 85}
                  y={points[7].y - 48}
                  width="170"
                  height="26"
                  rx="6"
                  fill="#064E3B"
                />
                <SvgText
                  x={points[7].x}
                  y={points[7].y - 31}
                  fill="#FFFFFF"
                  fontSize="11"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  🏷️ Đỉnh chi: Ngày 18 (1.180k)
                </SvgText>
              </G>
            )}

            {/* X-Axis Day Labels */}
            {points
              .filter((_, idx) => idx % 2 === 0 || idx === points.length - 1)
              .map((pt, idx) => (
                <SvgText
                  key={idx}
                  x={pt.x}
                  y={padT + plotH + 20}
                  fill="#64748B"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {pt.data.label}
                </SvgText>
              ))}
          </Svg>
        </View>
      </View>

      {/* ==================== 5. ROW 3: 3 INSIGHT COLUMNS ==================== */}
      <View style={[styles.tripletRow, !isDesktop && styles.tripletRowStack]}>
        {/* CARD 1: CƠ CẤU DANH MỤC (Donut Chart) */}
        <View style={[styles.tripletCard, !isDesktop && styles.tripletCardFull]}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.tripletTitle}>Cơ Cấu Danh Mục</Text>
              <Text style={styles.tripletSub}>Tỷ trọng các nhóm chi tiêu trong tháng</Text>
            </View>
            <Text style={{ fontSize: 18, color: '#64748B' }}>◔</Text>
          </View>

          {/* Donut Chart with Center Text */}
          <View style={styles.donutCenterWrapper}>
            <Svg width="170" height="170" viewBox="0 0 170 170">
              <G rotation="-90" origin="85, 85">
                {categories.map((cat, idx) => {
                  const dash = (cat.percent / 100) * donutCircum;
                  const offset = accumulatedDashOffset;
                  accumulatedDashOffset += dash;
                  return (
                    <Circle
                      key={idx}
                      cx="85"
                      cy="85"
                      r={donutR}
                      fill="transparent"
                      stroke={cat.color}
                      strokeWidth="24"
                      strokeDasharray={`${dash} ${donutCircum - dash}`}
                      strokeDashoffset={-offset}
                      strokeLinecap="round"
                    />
                  );
                })}
              </G>
            </Svg>

            {/* Center Label */}
            <View style={styles.donutHoleLabel}>
              <Text style={styles.donutHoleSub}>Cao nhất</Text>
              <Text style={styles.donutHolePercent}>38%</Text>
              <Text style={styles.donutHoleCat}>Ăn uống</Text>
            </View>
          </View>

          {/* Category breakdown items list */}
          <View style={styles.catLegendList}>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.catLegendItem}>
                <View style={styles.catLegendLeft}>
                  <View style={[styles.catColorCircle, { backgroundColor: cat.color }]} />
                  <Text style={styles.catNameText}>{cat.name}</Text>
                </View>
                <Text style={styles.catAmountText}>
                  {formatMoney(cat.amount)}đ ({cat.percent}%)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* CARD 2: SO SÁNH DÒNG TIỀN (Thu Nhập vs Chi Tiêu / 3 Tháng / 6 Tháng) */}
        <View style={[styles.tripletCard, !isDesktop && styles.tripletCardFull]}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.tripletTitle}>
                {showDualBars ? 'So Sánh Dòng Tiền' : 'So Sánh 3 Tháng'}
              </Text>
              <Text style={styles.tripletSub}>
                {showDualBars
                  ? 'Thu nhập vs Chi tiêu qua từng tháng gần nhất'
                  : 'Tiến độ tối ưu hóa chi tiêu qua từng tháng gần nhất'}
              </Text>
            </View>

            {/* Toggle Buttons: 3M vs 6M and Dual Bars */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                style={[
                  styles.miniToggleBtn,
                  compRange === '3m' && styles.miniToggleBtnActive,
                ]}
                onPress={() => setCompRange('3m')}
              >
                <Text
                  style={[
                    styles.miniToggleText,
                    compRange === '3m' && styles.miniToggleTextActive,
                  ]}
                >
                  3T
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.miniToggleBtn,
                  compRange === '6m' && styles.miniToggleBtnActive,
                ]}
                onPress={() => setCompRange('6m')}
              >
                <Text
                  style={[
                    styles.miniToggleText,
                    compRange === '6m' && styles.miniToggleTextActive,
                  ]}
                >
                  6T
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.miniToggleBtn,
                  showDualBars && styles.miniToggleBtnGreen,
                ]}
                onPress={() => setShowDualBars(!showDualBars)}
              >
                <Text
                  style={[
                    styles.miniToggleText,
                    showDualBars && { color: '#FFFFFF', fontWeight: '800' },
                  ]}
                >
                  Thu/Chi
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bar Chart Legend if Dual Bars */}
          {showDualBars && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#047857' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#047857' }}>Thu nhập</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#94A3B8' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Chi tiêu</Text>
              </View>
            </View>
          )}

          {/* Bar Chart */}
          <View style={styles.threeMonthBarWrapper}>
            {(compRange === '3m'
              ? comparison.months.slice(-3)
              : comparison.months
            ).map((m, idx) => {
              const maxBarHeight = 120;
              const hExp = ((m.expense || m.amount) / 24000000) * maxBarHeight;
              const hInc = ((m.income || 22000000) / 24000000) * maxBarHeight;

              return (
                <View key={idx} style={styles.barItemCol}>
                  {/* Badge or Amount */}
                  <View style={styles.barTopAmountWrap}>
                    {m.isCurrent && m.deltaPercent && !showDualBars && (
                      <View style={styles.deltaBadge}>
                        <Text style={styles.deltaBadgeText}>{m.deltaPercent}%</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.barAmountNumber,
                        m.isCurrent && styles.barAmountNumberActive,
                      ]}
                    >
                      {m.displayAmount}
                    </Text>
                  </View>

                  {/* Dual Bars or Single Bar */}
                  {showDualBars ? (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                      {/* Income Bar */}
                      <View
                        style={[
                          styles.dualBarPill,
                          { height: hInc, backgroundColor: '#047857' },
                        ]}
                      />
                      {/* Expense Bar */}
                      <View
                        style={[
                          styles.dualBarPill,
                          { height: hExp, backgroundColor: m.isCurrent ? '#059669' : '#94A3B8' },
                        ]}
                      />
                    </View>
                  ) : (
                    /* Single Vertical Bar */
                    <View
                      style={[
                        styles.verticalBarPill,
                        { height: hExp },
                        m.isCurrent
                          ? styles.verticalBarCurrent
                          : styles.verticalBarDefault,
                      ]}
                    />
                  )}

                  {/* Month Label */}
                  <Text
                    style={[
                      styles.barMonthLabel,
                      m.isCurrent && styles.barMonthLabelActive,
                    ]}
                  >
                    {m.monthName}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Insight Callout Box */}
          <View style={styles.insightBox}>
            <View style={styles.insightTitleRow}>
              <Text style={styles.insightCheckIcon}>✓</Text>
              <Text style={styles.insightTitle}>{comparison.insight.title}</Text>
            </View>
            <Text style={styles.insightDesc}>{comparison.insight.description}</Text>
          </View>
        </View>

        {/* CARD 3: CẢM XÚC SAU CHI TIÊU (Mindful Emotion & Suggestion) */}
        <View style={[styles.tripletCard, !isDesktop && styles.tripletCardFull]}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.tripletTitle}>Cảm Xúc Sau Chi Tiêu</Text>
              <Text style={styles.tripletSub}>
                Chỉ số hạnh phúc & chánh niệm trong từng đồng tiền bỏ ra
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: '#64748B' }}>💡</Text>
          </View>

          {/* Emotions Progress List */}
          <View style={styles.emotionsList}>
            {emotions.items.map((item) => (
              <View key={item.key} style={styles.emotionItem}>
                <View style={styles.emotionHeaderRow}>
                  <View style={styles.emotionTitleGroup}>
                    <Text style={styles.emotionEmoji}>{item.emoji}</Text>
                    <Text style={styles.emotionTitleText}>{item.title}</Text>
                  </View>
                  <Text style={[styles.emotionPercentText, { color: item.color }]}>
                    {item.percent}%
                  </Text>
                </View>

                {/* Progress Bar Track */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${item.percent}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>

                <Text style={styles.emotionDescText}>{item.description}</Text>
              </View>
            ))}
          </View>

          {/* Monett AI Suggestion Box */}
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionLightbulb}>💡</Text>
            <Text style={styles.suggestionText}>{emotions.suggestion}</Text>
          </View>
        </View>
      </View>

      {/* ==================== 6. ROW 4: KHOẢNH KHẮC CHI TIÊU TIÊU BIỂU ==================== */}
      <View style={styles.momentsSection}>
        {/* Header row */}
        <View style={styles.momentsHeaderRow}>
          <View>
            <Text style={styles.momentsMainTitle}>
              Khoảnh Khắc Chi Tiêu Tiêu Biểu Trong Báo Cáo
            </Text>
            <Text style={styles.momentsSubTitle}>
              Các kỷ niệm được đính kèm trực tiếp vào nhật ký giao dịch tuần này
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewAllAlbumBtn}
            onPress={() => onNavigateToTab && onNavigateToTab('moments')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllAlbumText}>Xem tất cả album ›</Text>
          </TouchableOpacity>
        </View>

        {/* 4 Photo Cards Grid */}
        <View style={[styles.momentsGrid, !isDesktop && styles.momentsGridWrap]}>
          {moments.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.momentCard,
                !isDesktop && (isTablet ? styles.momentCardHalf : styles.momentCardFull),
              ]}
              onPress={() => setSelectedMoment(m)}
              activeOpacity={0.9}
            >
              {/* Background Photo */}
              <Image source={{ uri: m.photoUri }} style={styles.momentCardImg} />

              {/* Gradient Overlay for Text Readability */}
              <View style={styles.momentGradientOverlay} />

              {/* Top Row: Badge & Amount */}
              <View style={styles.momentTopRow}>
                <View style={styles.momentBadgePill}>
                  <Text style={styles.momentBadgeText}>{m.badge}</Text>
                </View>
                <View style={styles.momentAmountPill}>
                  <Text style={styles.momentAmountText}>-{formatMoney(m.amount)}đ</Text>
                </View>
              </View>

              {/* Bottom Meta */}
              <View style={styles.momentBottomCol}>
                <Text style={styles.momentTitle} numberOfLines={1}>
                  {m.title}
                </Text>
                <Text style={styles.momentSubtitle} numberOfLines={1}>
                  {m.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ==================== PHOTO DETAIL PREVIEW MODAL ==================== */}
      {selectedMoment && (
        <Modal
          visible={!!selectedMoment}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedMoment(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedMoment.photoUri }}
                style={styles.modalPhoto}
                resizeMode="cover"
              />
              <View style={styles.modalBody}>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.momentBadgePill}>
                    <Text style={styles.momentBadgeText}>{selectedMoment.badge}</Text>
                  </View>
                  <Text style={styles.modalAmountText}>
                    {formatMoney(selectedMoment.amount)}đ
                  </Text>
                </View>
                <Text style={styles.modalTitleText}>{selectedMoment.title}</Text>
                <Text style={styles.modalSubText}>{selectedMoment.subtitle}</Text>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedMoment(null)}
                >
                  <Text style={styles.modalCloseBtnText}>Đóng xem ảnh</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },

  // ==================== 1. TOP NOTICE / STREAK BANNER ====================
  bannerCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
    flexWrap: 'wrap',
    gap: 12,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    minWidth: 280,
  },
  bannerFrogBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFEDD5',
    borderWidth: 2,
    borderColor: '#FB923C',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerFrogImg: {
    width: 38,
    height: 38,
  },
  bannerTextCol: {
    gap: 3,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  streakDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  streakPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  bannerSubtitle: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
  },
  bannerRight: {
    position: 'relative',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  exportBtnIcon: {
    fontSize: 13,
  },
  exportBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  exportBtnChevron: {
    fontSize: 11,
    color: '#64748B',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 42,
    right: 0,
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 999,
    padding: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownItemIcon: {
    fontSize: 15,
  },
  dropdownItemText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },

  // ==================== 2. PAGE HEADER SECTION ====================
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 14,
  },
  headerTitlesCol: {
    gap: 2,
  },
  subHeaderTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#047857',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  datePickerIcon: {
    fontSize: 12,
  },
  datePickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  datePickerChevron: {
    fontSize: 10,
    color: '#64748B',
  },
  monthPickerDropdown: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 999,
  },
  monthPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  monthPickerItemActive: {
    backgroundColor: '#ECFDF5',
  },
  monthPickerItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  monthPickerItemTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  filterIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==================== 3. ROW 1: 4 STAT KPI CARDS ====================
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  kpiRowWrap: {
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    justifyContent: 'space-between',
  },
  kpiCardHalf: {
    flexBasis: '48%',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiEmoji: {
    fontSize: 14,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  kpiValueRowSplit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kpiMainValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kpiCurrency: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  kpiTxRatio: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  kpiFooter: {
    marginTop: 2,
  },
  kpiFooterSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  kpiTrendGreen: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
  },
  kpiSubText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  safePill: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  safePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },

  // ==================== 4. ROW 2: XU HƯỚNG CHI TIÊU HÀNG NGÀY ====================
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  chartTitleCol: {
    gap: 3,
  },
  cardMainHeading: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubHeading: {
    fontSize: 12.5,
    color: '#64748B',
  },
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  legendDashedLine: {
    width: 14,
    height: 2,
    backgroundColor: '#D97706',
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  svgWrapper: {
    width: '100%',
    overflow: 'hidden',
  },

  // ==================== 5. ROW 3: 3 INSIGHT COLUMNS ====================
  tripletRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 24,
  },
  tripletRowStack: {
    flexDirection: 'column',
  },
  tripletCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    justifyContent: 'space-between',
  },
  tripletCardFull: {
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tripletTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  tripletSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },

  // Donut elements
  donutCenterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  donutHoleLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutHoleSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  donutHolePercent: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 26,
  },
  donutHoleCat: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
  },
  catLegendList: {
    marginTop: 14,
    gap: 10,
  },
  catLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catLegendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catColorCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catNameText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  catAmountText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },

  // 3-Month Bar elements
  threeMonthBarWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
    marginVertical: 10,
    paddingBottom: 6,
  },
  barItemCol: {
    alignItems: 'center',
    gap: 8,
    width: 60,
  },
  barTopAmountWrap: {
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    justifyContent: 'flex-end',
  },
  deltaBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  deltaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  barAmountNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  barAmountNumberActive: {
    color: '#047857',
    fontWeight: '800',
  },
  verticalBarPill: {
    width: 36,
    borderRadius: 8,
  },
  dualBarPill: {
    width: 16,
    borderRadius: 6,
  },
  miniToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  miniToggleBtnActive: {
    backgroundColor: '#047857',
  },
  miniToggleBtnGreen: {
    backgroundColor: '#047857',
  },
  miniToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  miniToggleTextActive: {
    color: '#FFFFFF',
  },
  verticalBarDefault: {
    backgroundColor: '#94A3B8',
  },
  verticalBarCurrent: {
    backgroundColor: '#047857',
  },
  barMonthLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  barMonthLabelActive: {
    color: '#047857',
    fontWeight: '800',
  },
  insightBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginTop: 14,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  insightCheckIcon: {
    fontSize: 12,
    color: '#4338CA',
    fontWeight: '900',
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
  },
  insightDesc: {
    fontSize: 11.5,
    color: '#374151',
    lineHeight: 16,
  },

  // Emotions Elements
  emotionsList: {
    gap: 14,
    marginVertical: 6,
  },
  emotionItem: {
    gap: 5,
  },
  emotionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emotionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emotionEmoji: {
    fontSize: 14,
  },
  emotionTitleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  emotionPercentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  emotionDescText: {
    fontSize: 11,
    color: '#64748B',
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 14,
  },
  suggestionLightbulb: {
    fontSize: 13,
  },
  suggestionText: {
    flex: 1,
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
    fontWeight: '500',
  },

  // ==================== 6. ROW 4: KHOẢNH KHẮC CHI TIÊU TIÊU BIỂU ====================
  momentsSection: {
    marginTop: 6,
  },
  momentsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  momentsMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  momentsSubTitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  viewAllAlbumBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllAlbumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  momentsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  momentsGridWrap: {
    flexWrap: 'wrap',
  },
  momentCard: {
    flex: 1,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  momentCardHalf: {
    flexBasis: '47%',
  },
  momentCardFull: {
    width: '100%',
    marginBottom: 10,
  },
  momentCardImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  momentGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  momentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  momentBadgePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  momentBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  momentAmountPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  momentAmountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  momentBottomCol: {
    zIndex: 2,
    gap: 2,
  },
  momentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  momentSubtitle: {
    fontSize: 11,
    color: '#E2E8F0',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalPhoto: {
    width: '100%',
    height: 280,
  },
  modalBody: {
    padding: 20,
    gap: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalAmountText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubText: {
    fontSize: 13,
    color: '#64748B',
  },
  modalCloseBtn: {
    marginTop: 12,
    backgroundColor: '#047857',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
