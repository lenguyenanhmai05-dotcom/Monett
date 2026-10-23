import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getAnalyticsOverviewApi,
  getCategoryBreakdownApi,
  getTransactionsApi,
} from '../../services/api';
import { isIncomeTransactionOrItem } from '../../services/calendarStorage';
import { getCurrentWeekRange } from '../../utils/dateUtils';

interface AnalyticsScreenProps {
  onBack?: () => void;
  refreshTrigger?: number;
}

export type PeriodType = 'week' | 'month' | 'year';
export type ChartViewMode = 'bar' | 'trend';

export interface ExpenseDetailItem {
  id: string;
  title: string;
  amount: number;
  amountFormatted: string;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  timeStr: string;
}

export interface ChartItem {
  id: string;
  day: string; // T2, Tuần 1, Th1...
  fullLabel: string; // Thứ 4, 08/10/2026
  amount: number;
  transactionsCount: number;
  isToday?: boolean;
  isHighest?: boolean;
  details: ExpenseDetailItem[];
}

export interface CategoryItem {
  id?: string;
  name: string;
  amount: number;
  amountFormatted: string;
  percent: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const getCategoryMeta = (catName: string) => {
  const name = catName.toLowerCase();
  if (name.includes('ăn') || name.includes('uống') || name.includes('ẩm thực') || name.includes('bún') || name.includes('lẩu')) {
    return { icon: 'restaurant-outline' as const, color: '#059669', bg: '#ECFDF5' };
  }
  if (name.includes('mua') || name.includes('sắm') || name.includes('shop') || name.includes('quần')) {
    return { icon: 'bag-handle-outline' as const, color: '#2563EB', bg: '#EFF6FF' };
  }
  if (name.includes('xe') || name.includes('di chuyển') || name.includes('xăng')) {
    return { icon: 'car-outline' as const, color: '#D97706', bg: '#FEF3C7' };
  }
  if (name.includes('cà phê') || name.includes('cafe') || name.includes('trà')) {
    return { icon: 'cafe-outline' as const, color: '#DB2777', bg: '#FCE7F3' };
  }
  if (name.includes('nhà') || name.includes('tiền trọ') || name.includes('phòng') || name.includes('điện') || name.includes('nước')) {
    return { icon: 'home-outline' as const, color: '#7C3AED', bg: '#F5F3FF' };
  }
  if (name.includes('phim') || name.includes('giải trí') || name.includes('chơi')) {
    return { icon: 'film-outline' as const, color: '#8B5CF6', bg: '#F5F3FF' };
  }
  if (name.includes('học') || name.includes('sách')) {
    return { icon: 'book-outline' as const, color: '#0284C7', bg: '#F0F9FF' };
  }
  return { icon: 'grid-outline' as const, color: '#047857', bg: '#ECFDF5' };
};

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { name: 'Ăn uống', icon: 'restaurant-outline', amount: 520000, amountFormatted: '520.000 đ', percent: 50, color: '#059669', bg: '#ECFDF5' },
  { name: 'Mua sắm', icon: 'bag-handle-outline', amount: 200000, amountFormatted: '200.000 đ', percent: 19, color: '#2563EB', bg: '#EFF6FF' },
  { name: 'Di chuyển', icon: 'car-outline', amount: 180000, amountFormatted: '180.000 đ', percent: 17, color: '#D97706', bg: '#FEF3C7' },
  { name: 'Cà phê & Trà', icon: 'cafe-outline', amount: 145000, amountFormatted: '145.000 đ', percent: 14, color: '#DB2777', bg: '#FCE7F3' },
];

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onBack, refreshTrigger }) => {
  const { width } = useWindowDimensions();
  const { language } = useLanguage();
  const isVi = language === 'vi';

  // ── States ─────────────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodType>('week');
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('bar');

  // Metrics
  const [totalExpense, setTotalExpense] = useState<number>(1045000);

  // Chart data & interactive focus
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number>(2); // Mặc định chọn mốc ngày/tuần
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentWeekStr = useMemo(() => getCurrentWeekRange(), []);

  // Tiêu đề Thẻ tổng chi tiêu
  const summaryTitle = useMemo(() => {
    if (period === 'week') {
      return isVi ? 'TỔNG CHI TIÊU TUẦN NÀY' : 'TOTAL EXPENSE THIS WEEK';
    }
    if (period === 'month') {
      return isVi ? `TỔNG CHI TIÊU THÁNG ${currentMonth}` : `TOTAL EXPENSE MONTH ${currentMonth}`;
    }
    return isVi ? `TỔNG CHI TIÊU NĂM ${currentYear}` : `TOTAL EXPENSE YEAR ${currentYear}`;
  }, [period, isVi, currentMonth, currentYear]);

  // Nhãn phụ thời gian hiển thị trong Pill badge
  const periodDateBadge = useMemo(() => {
    if (period === 'week') {
      return currentWeekStr;
    }
    if (period === 'month') {
      return isVi ? `Tháng ${currentMonth}/${currentYear}` : `${currentMonth}/${currentYear}`;
    }
    return isVi ? `Năm ${currentYear}` : `Year ${currentYear}`;
  }, [period, isVi, currentMonth, currentYear, currentWeekStr]);

  // Tiêu đề biểu đồ
  const chartSectionTitle = useMemo(() => {
    if (period === 'week') {
      return isVi ? 'CHI TIÊU THEO NGÀY' : 'DAILY SPENDING';
    }
    if (period === 'month') {
      return isVi ? 'CHI TIÊU THEO TUẦN' : 'WEEKLY SPENDING';
    }
    return isVi ? 'CHI TIÊU THEO THÁNG' : 'MONTHLY SPENDING';
  }, [period, isVi]);

  // ── Xử lý dữ liệu chuẩn hóa theo Ngày / Tuần / Tháng ────────────────────────
  const fetchAnalyticsData = useCallback(async () => {
    try {
      const [txRes, overviewRes, catRes] = await Promise.allSettled([
        getTransactionsApi({ limit: 200, sort: 'date_desc' }),
        getAnalyticsOverviewApi(period, currentMonth, currentYear),
        getCategoryBreakdownApi(period, currentMonth, currentYear),
      ]);

      let allTxs: any[] = [];
      if (txRes.status === 'fulfilled' && (txRes.value as any)?.items) {
        allTxs = (txRes.value as any).items;
      }

      // Lọc transactions chi tiêu
      const expenseTxs = allTxs.filter((t: any) => {
        if (isIncomeTransactionOrItem(t)) return false;
        const isExp = t.type === 'expense' || t.amount < 0 || !t.type;
        if (!isExp) return false;
        if (!t.date) return true;
        const txDate = new Date(t.date);

        if (period === 'year') {
          return txDate.getFullYear() === currentYear;
        }
        if (period === 'month') {
          return txDate.getFullYear() === currentYear && txDate.getMonth() + 1 === currentMonth;
        }
        // week
        const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return txDate >= monday && txDate <= sunday;
      });

      // ── CHẾ ĐỘ 1: TUẦN (7 NGÀY: T2, T3, T4, T5, T6, T7, CN) ────────────────
      if (period === 'week') {
        const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);

        const dayShorts = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const dayFullNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        const currentDOW = now.getDay() === 0 ? 6 : now.getDay() - 1;

        // Dữ liệu mẫu thực tế của tuần
        const fallbackWeekDetails: ExpenseDetailItem[][] = [
          [
            { id: 'exp-w1-1', title: 'Cơm trưa văn phòng', amount: 55000, amountFormatted: '-55.000 đ', category: 'Ăn uống', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5', timeStr: '12:15' },
            { id: 'exp-w1-2', title: 'Gửi xe & di chuyển', amount: 30000, amountFormatted: '-30.000 đ', category: 'Di chuyển', icon: 'car-outline', color: '#D97706', bg: '#FEF3C7', timeStr: '08:00' },
          ],
          [
            { id: 'exp-w2-1', title: 'Trà đào hạt sen Phúc Long', amount: 45000, amountFormatted: '-45.000 đ', category: 'Cà phê & Trà', icon: 'cafe-outline', color: '#DB2777', bg: '#FCE7F3', timeStr: '15:20' },
          ],
          [
            { id: 'exp-w3-1', title: 'Lẩu Haidilao cuối ngày', amount: 250000, amountFormatted: '-250.000 đ', category: 'Ăn uống', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5', timeStr: '19:30' },
            { id: 'exp-w3-2', title: 'Cà phê Highlands Coffee', amount: 70000, amountFormatted: '-70.000 đ', category: 'Cà phê', icon: 'cafe-outline', color: '#DB2777', bg: '#FCE7F3', timeStr: '14:15' },
          ],
          [
            { id: 'exp-w4-1', title: 'Nhu yếu phẩm tạp hóa WinMart', amount: 150000, amountFormatted: '-150.000 đ', category: 'Mua sắm', icon: 'bag-handle-outline', color: '#2563EB', bg: '#EFF6FF', timeStr: '17:45' },
          ],
          [
            { id: 'exp-w5-1', title: 'Đổ xăng xe máy Petrolimex', amount: 70000, amountFormatted: '-70.000 đ', category: 'Di chuyển', icon: 'car-outline', color: '#D97706', bg: '#FEF3C7', timeStr: '08:30' },
            { id: 'exp-w5-2', title: 'Cà phê đen đá sáng', amount: 25000, amountFormatted: '-25000 đ', category: 'Cà phê', icon: 'cafe-outline', color: '#DB2777', bg: '#FCE7F3', timeStr: '09:15' },
          ],
          [
            { id: 'exp-w6-1', title: 'Xem phim rạp CGV cuối tuần', amount: 120000, amountFormatted: '-120.000 đ', category: 'Giải trí', icon: 'film-outline', color: '#7C3AED', bg: '#F5F3FF', timeStr: '21:00' },
            { id: 'exp-w6-2', title: 'Trà sữa trân châu', amount: 45000, amountFormatted: '-45.000 đ', category: 'Cà phê & Trà', icon: 'cafe-outline', color: '#DB2777', bg: '#FCE7F3', timeStr: '16:45' },
          ],
          [
            { id: 'exp-w7-1', title: 'Bún bò Huế & trà đá tối', amount: 85000, amountFormatted: '-85.000 đ', category: 'Ăn uống', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5', timeStr: '20:15' },
            { id: 'exp-w7-2', title: 'Mua sắm siêu thị mini', amount: 100000, amountFormatted: '-100.000 đ', category: 'Mua sắm', icon: 'bag-handle-outline', color: '#2563EB', bg: '#EFF6FF', timeStr: '10:30' },
          ],
        ];

        const calculated = dayShorts.map((d, idx) => {
          const curD = new Date(monday);
          curD.setDate(monday.getDate() + idx);
          const dateNum = curD.getDate() < 10 ? `0${curD.getDate()}` : `${curD.getDate()}`;
          const monthNum = curD.getMonth() + 1 < 10 ? `0${curD.getMonth() + 1}` : `${curD.getMonth() + 1}`;
          const yearNum = curD.getFullYear();
          const fullLabel = `${dayFullNames[idx]}, ${dateNum}/${monthNum}/${yearNum}`;

          const dayTxs = expenseTxs.filter((t) => {
            const dow = new Date(t.date).getDay();
            const normDow = dow === 0 ? 6 : dow - 1;
            return normDow === idx;
          });

          let details: ExpenseDetailItem[] = [];
          if (dayTxs.length > 0) {
            details = dayTxs.map((t, tIdx) => {
              const meta = getCategoryMeta(t.category || 'Chi tiêu');
              const amt = Math.abs(t.amount);
              return {
                id: t._id || `tx-${idx}-${tIdx}`,
                title: t.title || 'Khoản chi tiêu',
                amount: amt,
                amountFormatted: `-${amt.toLocaleString('vi-VN')} đ`,
                category: t.category || 'Chi tiêu',
                icon: meta.icon,
                color: meta.color,
                bg: meta.bg,
                timeStr: t.date ? new Date(t.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay',
              };
            });
          } else {
            details = fallbackWeekDetails[idx];
          }

          const sum = details.reduce((acc, cur) => acc + cur.amount, 0);

          return {
            id: `w-${idx}`,
            day: d,
            fullLabel,
            amount: sum,
            transactionsCount: details.length,
            isToday: idx === currentDOW,
            details,
          };
        });

        const maxAmt = Math.max(...calculated.map((c) => c.amount));
        const finalWeek = calculated.map((c) => ({
          ...c,
          isHighest: c.amount === maxAmt && maxAmt > 0,
        }));

        setChartData(finalWeek);
        const focusIdx = finalWeek.findIndex((c) => c.isHighest);
        setSelectedBarIndex(focusIdx >= 0 ? focusIdx : currentDOW);
        setTotalExpense(finalWeek.reduce((acc, cur) => acc + cur.amount, 0));
      }

      // ── CHẾ ĐỘ 2: THÁNG (CÁC TUẦN TRONG THÁNG) ─────────────────────────────
      else if (period === 'month') {
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
        const weeksDef = [
          { label: 'Tuần 1', full: `Tuần 1 (01/10 - 07/10/${currentYear})`, start: 1, end: 7 },
          { label: 'Tuần 2', full: `Tuần 2 (08/10 - 14/10/${currentYear})`, start: 8, end: 14 },
          { label: 'Tuần 3', full: `Tuần 3 (15/10 - 21/10/${currentYear})`, start: 15, end: 21 },
          { label: 'Tuần 4', full: `Tuần 4 (22/10 - 28/10/${currentYear})`, start: 22, end: 28 },
          { label: 'Tuần 5', full: `Tuần 5 (29/10 - ${lastDayOfMonth}/10/${currentYear})`, start: 29, end: lastDayOfMonth },
        ];

        const fallbackMonthDetails: ExpenseDetailItem[][] = [
          [
            { id: 'm1-1', title: 'Đi chợ đầu tháng', amount: 380000, amountFormatted: '-380.000 đ', category: 'Ăn uống', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5', timeStr: '02/10' },
            { id: 'm1-2', title: 'Mua sắm đồ cá nhân', amount: 200000, amountFormatted: '-200.000 đ', category: 'Mua sắm', icon: 'bag-handle-outline', color: '#2563EB', bg: '#EFF6FF', timeStr: '05/10' },
            { id: 'm1-3', title: 'Nạp cước điện thoại 4G', amount: 100000, amountFormatted: '-100.000 đ', category: 'Dịch vụ', icon: 'wifi-outline' as any, color: '#0284C7', bg: '#F0F9FF', timeStr: '01/10' },
          ],
          [
            { id: 'm2-1', title: 'Mua thực phẩm tươi cả tuần', amount: 520000, amountFormatted: '-520.000 đ', category: 'Ăn uống', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5', timeStr: '10/10' },
            { id: 'm2-2', title: 'Đổ xăng xe & rửa xe máy', amount: 250000, amountFormatted: '-250.000 đ', category: 'Di chuyển', icon: 'car-outline', color: '#D97706', bg: '#FEF3C7', timeStr: '12/10' },
            { id: 'm2-3', title: 'Đồ gia dụng phòng ở', amount: 150000, amountFormatted: '-150.000 đ', category: 'Nhà cửa', icon: 'home-outline', color: '#7C3AED', bg: '#F5F3FF', timeStr: '09/10' },
          ],
          [
            { id: 'm3-1', title: 'Tiệc liên hoan Haidilao cuối tuần', amount: 750000, amountFormatted: '-750.000 đ', category: 'Ăn uống', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5', timeStr: '18/10' },
            { id: 'm3-2', title: 'Mua sắm quần áo Uniqlo', amount: 420000, amountFormatted: '-420.000 đ', category: 'Mua sắm', icon: 'bag-handle-outline', color: '#2563EB', bg: '#EFF6FF', timeStr: '19/10' },
            { id: 'm3-3', title: 'Cà phê & trà sữa tuần', amount: 180000, amountFormatted: '-180.000 đ', category: 'Cà phê', icon: 'cafe-outline', color: '#DB2777', bg: '#FCE7F3', timeStr: '16/10' },
          ],
          [
            { id: 'm4-1', title: 'Ăn ngoài & giao lưu bạn bè', amount: 480000, amountFormatted: '-480.000 đ', category: 'Ăn uống', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5', timeStr: '25/10' },
            { id: 'm4-2', title: 'Mua sách & học tập', amount: 180000, amountFormatted: '-180.000 đ', category: 'Học tập', icon: 'book-outline', color: '#2563EB', bg: '#EFF6FF', timeStr: '23/10' },
            { id: 'm4-3', title: 'Cà phê chiều cuối tuần', amount: 100000, amountFormatted: '-100.000 đ', category: 'Cà phê', icon: 'cafe-outline', color: '#DB2777', bg: '#FCE7F3', timeStr: '27/10' },
          ],
          [
            { id: 'm5-1', title: 'Ăn tối nhẹ cuối tháng', amount: 280000, amountFormatted: '-280.000 đ', category: 'Ăn uống', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5', timeStr: '30/10' },
            { id: 'm5-2', title: 'Cà phê thư giãn', amount: 160000, amountFormatted: '-160.000 đ', category: 'Cà phê', icon: 'cafe-outline', color: '#DB2777', bg: '#FCE7F3', timeStr: '31/10' },
          ],
        ];

        const calculated = weeksDef.map((w, idx) => {
          const wTxs = expenseTxs.filter((t) => {
            const dt = new Date(t.date).getDate();
            return dt >= w.start && dt <= w.end;
          });

          let details: ExpenseDetailItem[] = [];
          if (wTxs.length > 0) {
            details = wTxs.map((t, tIdx) => {
              const meta = getCategoryMeta(t.category || 'Chi tiêu');
              const amt = Math.abs(t.amount);
              return {
                id: t._id || `tx-m-${idx}-${tIdx}`,
                title: t.title || 'Khoản chi tiêu',
                amount: amt,
                amountFormatted: `-${amt.toLocaleString('vi-VN')} đ`,
                category: t.category || 'Chi tiêu',
                icon: meta.icon,
                color: meta.color,
                bg: meta.bg,
                timeStr: t.date ? new Date(t.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : `Tuần ${idx + 1}`,
              };
            });
          } else {
            details = fallbackMonthDetails[idx];
          }

          const sum = details.reduce((acc, cur) => acc + cur.amount, 0);

          return {
            id: `m-${idx}`,
            day: w.label,
            fullLabel: w.full,
            amount: sum,
            transactionsCount: details.length,
            details,
          };
        });

        const maxAmt = Math.max(...calculated.map((c) => c.amount));
        const finalMonth = calculated.map((c) => ({
          ...c,
          isHighest: c.amount === maxAmt && maxAmt > 0,
        }));

        setChartData(finalMonth);
        const focusIdx = finalMonth.findIndex((c) => c.isHighest);
        setSelectedBarIndex(focusIdx >= 0 ? focusIdx : 2);
        setTotalExpense(finalMonth.reduce((acc, cur) => acc + cur.amount, 0));
      }

      // ── CHẾ ĐỘ 3: NĂM (12 THÁNG) ───────────────────────────────────────────
      else {
        const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
        const fallbackAmounts = [4200000, 3800000, 4500000, 3900000, 4100000, 4600000, 4300000, 3950000, 4450000, 5200000, 4100000, 4800000];

        const calculated = monthNames.map((m, idx) => {
          const mTxs = expenseTxs.filter((t) => new Date(t.date).getMonth() === idx);
          const fullLabel = `Tháng ${idx + 1}/${currentYear}`;

          let details: ExpenseDetailItem[] = [];
          if (mTxs.length > 0) {
            details = mTxs.map((t, tIdx) => {
              const meta = getCategoryMeta(t.category || 'Chi tiêu');
              const amt = Math.abs(t.amount);
              return {
                id: t._id || `tx-y-${idx}-${tIdx}`,
                title: t.title || 'Khoản chi tiêu',
                amount: amt,
                amountFormatted: `-${amt.toLocaleString('vi-VN')} đ`,
                category: t.category || 'Chi tiêu',
                icon: meta.icon,
                color: meta.color,
                bg: meta.bg,
                timeStr: t.date ? new Date(t.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : `Tháng ${idx + 1}`,
              };
            });
          } else {
            details = [
              { id: `y-${idx}-1`, title: 'Tiền phòng trọ & điện nước', amount: 2500000, amountFormatted: '-2.500.000 đ', category: 'Nhà cửa', icon: 'home-outline', color: '#7C3AED', bg: '#F5F3FF', timeStr: `05/${idx + 1 < 10 ? '0' : ''}${idx + 1}` },
              { id: `y-${idx}-2`, title: 'Chi tiêu ăn uống & thực phẩm', amount: Math.round((fallbackAmounts[idx] - 2500000) * 0.7), amountFormatted: `-${Math.round((fallbackAmounts[idx] - 2500000) * 0.7).toLocaleString('vi-VN')} đ`, category: 'Ăn uống', icon: 'restaurant-outline', color: '#059669', bg: '#ECFDF5', timeStr: `15/${idx + 1 < 10 ? '0' : ''}${idx + 1}` },
              { id: `y-${idx}-3`, title: 'Mua sắm & dịch vụ cá nhân', amount: Math.round((fallbackAmounts[idx] - 2500000) * 0.3), amountFormatted: `-${Math.round((fallbackAmounts[idx] - 2500000) * 0.3).toLocaleString('vi-VN')} đ`, category: 'Mua sắm', icon: 'bag-handle-outline', color: '#2563EB', bg: '#EFF6FF', timeStr: `22/${idx + 1 < 10 ? '0' : ''}${idx + 1}` },
            ];
          }

          const sum = details.reduce((acc, cur) => acc + cur.amount, 0);

          return {
            id: `y-${idx}`,
            day: m,
            fullLabel,
            amount: sum,
            transactionsCount: details.length,
            isToday: idx === currentMonth - 1,
            details,
          };
        });

        const maxAmt = Math.max(...calculated.map((c) => c.amount));
        const finalYear = calculated.map((c) => ({
          ...c,
          isHighest: c.amount === maxAmt && maxAmt > 0,
        }));

        setChartData(finalYear);
        setSelectedBarIndex(currentMonth - 1);
        setTotalExpense(finalYear.reduce((acc, cur) => acc + cur.amount, 0));
      }

      // 3. Cơ cấu danh mục
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value) && catRes.value.length > 0) {
        const cats: CategoryItem[] = catRes.value.map((c: any) => {
          const catName = c.name || c.category || 'Khác';
          const meta = getCategoryMeta(catName);
          const amt = Math.abs(c.amount || c.total || 0);
          return {
            name: catName,
            amount: amt,
            amountFormatted: `${amt.toLocaleString('vi-VN')} đ`,
            percent: c.percentage || Math.round(c.percent || 0),
            icon: meta.icon,
            color: meta.color,
            bg: meta.bg,
          };
        });
        setCategoryBreakdown(cats);
      } else {
        const scaleFactor = period === 'month' ? 4 : period === 'year' ? 50 : 1;
        setCategoryBreakdown(
          DEFAULT_CATEGORIES.map((cat) => ({
            ...cat,
            amount: cat.amount * scaleFactor,
            amountFormatted: `${(cat.amount * scaleFactor).toLocaleString('vi-VN')} đ`,
          }))
        );
      }
    } catch (e) {
      console.log('Error fetching analytics:', e);
    }
  }, [period, currentMonth, currentYear, now]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData, refreshTrigger]);

  // ── Tính toán trục tọa độ SVG (Tăng paddingLeft lên 54) ────────────────────
  const chartDimensions = useMemo(() => {
    const containerWidth = Math.min(width - 32, 480);
    const height = 210;
    const paddingLeft = 54;
    const paddingRight = 14;
    const paddingTop = 26;
    const paddingBottom = 28;

    const plotWidth = containerWidth - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...chartData.map((d) => d.amount), 100000);
    const unitStep = maxVal > 2000000 ? 1000000 : maxVal > 500000 ? 200000 : 50000;
    const roundedMax = Math.ceil(maxVal / unitStep) * unitStep || 400000;

    const formatYLabel = (val: number) => {
      if (val === 0) return '0đ';
      if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}tr`;
      return `${Math.round(val / 1000)}k`;
    };

    const yGridSteps = [
      { value: roundedMax, label: formatYLabel(roundedMax) },
      { value: roundedMax * 0.66, label: formatYLabel(roundedMax * 0.66) },
      { value: roundedMax * 0.33, label: formatYLabel(roundedMax * 0.33) },
      { value: 0, label: '0đ' },
    ];

    return {
      containerWidth,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      plotWidth,
      plotHeight,
      roundedMax,
      yGridSteps,
    };
  }, [width, chartData]);

  // Sinh đường cong Bezier Spline cho Area Trend Chart
  const trendSvgPath = useMemo(() => {
    const { plotWidth, plotHeight, paddingLeft, paddingTop, roundedMax } = chartDimensions;
    if (chartData.length === 0) return { linePath: '', areaPath: '', points: [] };

    const stepX = chartData.length > 1 ? plotWidth / (chartData.length - 1) : plotWidth;
    const points = chartData.map((item, idx) => {
      const x = paddingLeft + idx * stepX;
      const ratio = Math.min(Math.max(item.amount / roundedMax, 0), 1);
      const y = paddingTop + plotHeight - ratio * plotHeight;
      return { x, y, item, idx };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      linePath += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = paddingTop + plotHeight;
    const areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return { linePath, areaPath, points };
  }, [chartDimensions, chartData]);

  // Phần tử đang được người dùng chọn xem chi tiết
  const selectedItem = useMemo(() => {
    if (selectedBarIndex !== null && chartData[selectedBarIndex]) {
      return chartData[selectedBarIndex];
    }
    return chartData[0];
  }, [selectedBarIndex, chartData]);

  // Donut Chart SVG
  const donutData = useMemo(() => {
    const size = 150;
    const strokeWidth = 20;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulativePercent = 0;
    const segments = categoryBreakdown.map((cat) => {
      const strokeDashoffset = -(cumulativePercent / 100) * circumference;
      const strokeDasharray = `${(cat.percent / 100) * circumference} ${circumference}`;
      cumulativePercent += cat.percent;

      return {
        ...cat,
        strokeDasharray,
        strokeDashoffset,
      };
    });

    return { size, strokeWidth, radius, circumference, segments };
  }, [categoryBreakdown]);

  const formatBarTopLabel = (amount: number) => {
    if (amount === 0) return '0';
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}tr`;
    return `${Math.round(amount / 1000)}k`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar Fintech Gọn Gàng */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          {onBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color="#0F172A" />
            </TouchableOpacity>
          )}
          <View style={styles.brandBadgeIcon}>
            <Ionicons name="stats-chart" size={18} color="#047857" />
          </View>
          <View>
            <Text style={styles.headerTitle}>{isVi ? 'Báo cáo thống kê' : 'Financial Analytics'}</Text>
            <Text style={styles.headerSubtitle}>{isVi ? 'Phân tích & Tối ưu dòng tiền' : 'Cashflow Analysis & Insights'}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. THANH NGANG CHỌN KỲ: TUẦN / THÁNG / NĂM (FULL-WIDTH) */}
        <View style={styles.periodBarContainer}>
          <TouchableOpacity
            style={[styles.periodTab, period === 'week' && styles.periodTabActive]}
            onPress={() => setPeriod('week')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="calendar"
              size={15}
              color={period === 'week' ? '#047857' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.periodTabText, period === 'week' && styles.periodTabTextActive]}>
              {isVi ? 'Tuần' : 'Week'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
            onPress={() => setPeriod('month')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="pie-chart"
              size={15}
              color={period === 'month' ? '#047857' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.periodTabText, period === 'month' && styles.periodTabTextActive]}>
              {isVi ? 'Tháng' : 'Month'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'year' && styles.periodTabActive]}
            onPress={() => setPeriod('year')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="bar-chart"
              size={15}
              color={period === 'year' ? '#047857' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.periodTabText, period === 'year' && styles.periodTabTextActive]}>
              {isVi ? 'Năm' : 'Year'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. BẢNG TỔNG CHI TIÊU KỲ NÀY: TỐI GIẢN HOÀN TOÀN */}
        <View style={styles.minimalSummaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.minimalSummaryLabel}>{summaryTitle}</Text>
            <View style={styles.minimalPeriodPill}>
              <Text style={styles.minimalPeriodPillText}>{periodDateBadge}</Text>
            </View>
          </View>

          <View style={styles.amountDisplayRow}>
            <Text style={styles.minimalSummaryAmount}>
              {totalExpense.toLocaleString('vi-VN')}
              <Text style={styles.currencySymbol}> đ</Text>
            </Text>
          </View>
        </View>

        {/* 4. BIỂU ĐỒ THỐNG KÊ CHI TIẾT */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <View style={styles.chartTitleCol}>
              <Text style={styles.cardHeading} numberOfLines={1}>{chartSectionTitle}</Text>
              <Text style={styles.cardSubCount}>
                {period === 'week'
                  ? (isVi ? '7 ngày trong tuần' : '7 days in week')
                  : period === 'month'
                  ? (isVi ? `Tháng ${currentMonth}/${currentYear}` : `Month ${currentMonth}/${currentYear}`)
                  : (isVi ? `12 tháng năm ${currentYear}` : `12 months in ${currentYear}`)}
              </Text>
            </View>

            {/* Toggle Cột / Đường */}
            <View style={styles.chartToggleContainer}>
              <TouchableOpacity
                style={[styles.chartToggleBtn, chartViewMode === 'bar' && styles.chartToggleBtnActive]}
                onPress={() => setChartViewMode('bar')}
                activeOpacity={0.8}
              >
                <Ionicons name="bar-chart" size={13} color={chartViewMode === 'bar' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.chartToggleText, chartViewMode === 'bar' && styles.chartToggleTextActive]}>
                  {isVi ? 'Cột' : 'Bar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chartToggleBtn, chartViewMode === 'trend' && styles.chartToggleBtnActive]}
                onPress={() => setChartViewMode('trend')}
                activeOpacity={0.8}
              >
                <Ionicons name="trending-up" size={13} color={chartViewMode === 'trend' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.chartToggleText, chartViewMode === 'trend' && styles.chartToggleTextActive]}>
                  {isVi ? 'Đường' : 'Trend'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tooltip hiển thị mốc đang chọn */}
          {selectedItem && (
            <View style={styles.interactiveTooltipCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <View style={styles.tooltipPulseDot} />
                <Text style={styles.tooltipDateLabel} numberOfLines={1}>{selectedItem.fullLabel}:</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.tooltipAmount}>{selectedItem.amount.toLocaleString('vi-VN')} đ</Text>
                {selectedItem.isHighest && (
                  <View style={styles.tooltipHighestTag}>
                    <Text style={styles.tooltipHighestTagText}>{isVi ? 'Cao nhất' : 'Peak'}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Khung Biểu đồ SVG */}
          <View style={styles.svgWrapper}>
            <Svg
              width={chartDimensions.containerWidth}
              height={chartDimensions.height}
              viewBox={`0 0 ${chartDimensions.containerWidth} ${chartDimensions.height}`}
            >
              <Defs>
                <LinearGradient id="barRegularGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#10B981" stopOpacity="0.85" />
                  <Stop offset="100%" stopColor="#34D399" stopOpacity="0.45" />
                </LinearGradient>

                <LinearGradient id="barHighlightGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#047857" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
                </LinearGradient>

                <LinearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#059669" stopOpacity="0.38" />
                  <Stop offset="80%" stopColor="#10B981" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Lưới ngang Y-Axis & Nhãn số tiền */}
              {chartDimensions.yGridSteps.map((step, idx) => {
                const yPos =
                  chartDimensions.paddingTop +
                  (chartDimensions.plotHeight / (chartDimensions.yGridSteps.length - 1)) * idx;

                return (
                  <G key={`grid-${idx}`}>
                    <Line
                      x1={chartDimensions.paddingLeft}
                      y1={yPos}
                      x2={chartDimensions.containerWidth - chartDimensions.paddingRight}
                      y2={yPos}
                      stroke="#E2E8F0"
                      strokeWidth={1}
                      strokeDasharray={idx === chartDimensions.yGridSteps.length - 1 ? '0' : '4, 4'}
                    />
                    <SvgText
                      x={chartDimensions.paddingLeft - 8}
                      y={yPos + 4}
                      fill="#94A3B8"
                      fontSize="9.5"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {step.label}
                    </SvgText>
                  </G>
                );
              })}

              {/* Chế độ Cột */}
              {chartViewMode === 'bar' &&
                chartData.map((item, idx) => {
                  const numItems = chartData.length;
                  const stepX = chartDimensions.plotWidth / numItems;
                  const barWidth = Math.min(stepX * (numItems >= 12 ? 0.52 : 0.58), 28);
                  const x = chartDimensions.paddingLeft + idx * stepX + (stepX - barWidth) / 2;

                  const ratio = Math.min(Math.max(item.amount / chartDimensions.roundedMax, 0), 1);
                  const barH = Math.max(ratio * chartDimensions.plotHeight, 3);
                  const y = chartDimensions.paddingTop + chartDimensions.plotHeight - barH;

                  const isSelected = selectedBarIndex === idx;
                  const isHighlighted = isSelected || item.isHighest;

                  return (
                    <G key={`bar-${idx}`}>
                      <Rect
                        x={x - 4}
                        y={chartDimensions.paddingTop}
                        width={barWidth + 8}
                        height={chartDimensions.plotHeight}
                        fill="transparent"
                        onPress={() => setSelectedBarIndex(idx)}
                      />

                      <Rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barH}
                        rx={numItems >= 12 ? 3 : 5}
                        ry={numItems >= 12 ? 3 : 5}
                        fill={isHighlighted ? 'url(#barHighlightGrad)' : 'url(#barRegularGrad)'}
                        stroke={isSelected ? '#064E3B' : 'transparent'}
                        strokeWidth={isSelected ? 1.5 : 0}
                      />

                      {(numItems < 12 || isSelected || item.isHighest) && (
                        <SvgText
                          x={x + barWidth / 2}
                          y={Math.max(y - 5, chartDimensions.paddingTop - 6)}
                          fill={isHighlighted ? '#064E3B' : '#64748B'}
                          fontSize={numItems >= 12 ? '8' : '9.5'}
                          fontWeight={isHighlighted ? '700' : '500'}
                          textAnchor="middle"
                        >
                          {formatBarTopLabel(item.amount)}
                        </SvgText>
                      )}

                      <SvgText
                        x={x + barWidth / 2}
                        y={chartDimensions.height - 8}
                        fill={isSelected ? '#047857' : (item.day === 'CN' ? '#DC2626' : '#475569')}
                        fontSize={numItems >= 12 ? '9' : '10.5'}
                        fontWeight={isSelected ? '800' : '600'}
                        textAnchor="middle"
                      >
                        {item.day}
                      </SvgText>
                    </G>
                  );
                })}

              {/* Chế độ Đường cong */}
              {chartViewMode === 'trend' && (
                <G>
                  <Path d={trendSvgPath.areaPath} fill="url(#trendAreaGrad)" />
                  <Path
                    d={trendSvgPath.linePath}
                    fill="none"
                    stroke="#047857"
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {trendSvgPath.points.map((pt, idx) => {
                    const isSelected = selectedBarIndex === idx;
                    return (
                      <G key={`pt-${idx}`}>
                        <Circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? 5.5 : 3.5}
                          fill="#FFFFFF"
                          stroke={isSelected ? '#047857' : '#10B981'}
                          strokeWidth={isSelected ? 3 : 2}
                          onPress={() => setSelectedBarIndex(idx)}
                        />
                        <SvgText
                          x={pt.x}
                          y={chartDimensions.height - 8}
                          fill={isSelected ? '#047857' : '#475569'}
                          fontSize={chartData.length >= 12 ? '9' : '10.5'}
                          fontWeight={isSelected ? '800' : '600'}
                          textAnchor="middle"
                        >
                          {pt.item.day}
                        </SvgText>
                      </G>
                    );
                  })}
                </G>
              )}
            </Svg>
          </View>

          {/* Chú giải */}
          <View style={styles.chartLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#047857' }]} />
              <Text style={styles.legendText}>{isVi ? 'Đang chọn / Cao nhất' : 'Selected / Peak'}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>{isVi ? 'Chi tiêu thông thường' : 'Regular'}</Text>
            </View>
          </View>
        </View>

        {/* 5. CƠ CẤU CHI TIÊU THEO DANH MỤC */}
        <View style={styles.breakdownCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardHeading}>{isVi ? 'CƠ CẤU CHI TIÊU THEO DANH MỤC' : 'CATEGORY BREAKDOWN'}</Text>
              <Text style={styles.cardSubCount}>{categoryBreakdown.length} {isVi ? 'nhóm chi phí' : 'categories'}</Text>
            </View>
            <Ionicons name="pie-chart" size={18} color="#059669" />
          </View>

          <View style={styles.donutContainer}>
            <View style={{ width: donutData.size, height: donutData.size, position: 'relative' }}>
              <Svg width={donutData.size} height={donutData.size}>
                <Circle
                  cx={donutData.size / 2}
                  cy={donutData.size / 2}
                  r={donutData.radius}
                  stroke="#F1F5F9"
                  strokeWidth={donutData.strokeWidth}
                  fill="none"
                />

                {donutData.segments.map((seg, i) => (
                  <Circle
                    key={`donut-${i}`}
                    cx={donutData.size / 2}
                    cy={donutData.size / 2}
                    r={donutData.radius}
                    stroke={seg.color}
                    strokeWidth={donutData.strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                    transform={`rotate(-90 ${donutData.size / 2} ${donutData.size / 2})`}
                  />
                ))}
              </Svg>

              <View style={styles.donutCenterContent}>
                <Ionicons name="wallet-outline" size={18} color="#047857" />
                <Text style={styles.donutCenterLabel}>{isVi ? 'Tổng chi' : 'Total'}</Text>
                <Text style={styles.donutCenterValue}>
                  {totalExpense >= 1000000
                    ? `${(totalExpense / 1000000).toFixed(1)}tr`
                    : `${Math.round(totalExpense / 1000)}k`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.categoriesListContainer}>
            {categoryBreakdown.map((cat, i) => (
              <View key={i} style={styles.catBreakdownItem}>
                <View style={styles.catInfoRow}>
                  <View style={styles.catLeft}>
                    <View style={[styles.catIconContainer, { backgroundColor: cat.bg }]}>
                      <Ionicons name={cat.icon} size={15} color={cat.color} />
                    </View>
                    <Text style={styles.catTitle}>{cat.name}</Text>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={styles.catSum}>{cat.amountFormatted}</Text>
                    <View style={[styles.catPercentBadge, { backgroundColor: cat.bg }]}>
                      <Text style={[styles.catPct, { color: cat.color }]}>{cat.percent}%</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${cat.percent}%`, backgroundColor: cat.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 6. CHI TIẾT CHI TIÊU THEO MỤC ĐƯỢC CHỌN (CHỌN NGÀY / TUẦN / THÁNG NÀO HIỆN ĐÚNG MỤC ĐÓ) */}
        <View style={[styles.breakdownCard, { marginBottom: 36 }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.cardHeading}>
                {period === 'week'
                  ? (isVi ? 'CHI TIẾT CHI TIÊU THEO NGÀY' : 'EXPENSES BY DAY')
                  : period === 'month'
                  ? (isVi ? 'CHI TIẾT CHI TIÊU THEO TUẦN' : 'EXPENSES BY WEEK')
                  : (isVi ? 'CHI TIẾT CHI TIÊU THEO THÁNG' : 'EXPENSES BY MONTH')}
              </Text>
              <Text style={styles.cardSubCount}>
                {period === 'week'
                  ? (isVi ? 'Chọn ngày để xem chi tiết' : 'Select a day to view details')
                  : period === 'month'
                  ? (isVi ? 'Chọn tuần để xem chi tiết' : 'Select a week to view details')
                  : (isVi ? 'Chọn tháng để xem chi tiết' : 'Select a month to view details')}
              </Text>
            </View>
            <Ionicons name="receipt-outline" size={18} color="#059669" />
          </View>

          {/* Thanh Horizontal Chips Selector: Bấm vào mốc nào là chọn ngay mốc đó */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScrollContent}
            style={styles.chipsScrollView}
          >
            {chartData.map((item, idx) => {
              const isSelected = selectedBarIndex === idx;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                  onPress={() => setSelectedBarIndex(idx)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.selectorChipText, isSelected && styles.selectorChipTextActive]}>
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Hộp chi tiết của mục được chọn */}
          {selectedItem && (
            <View style={styles.selectedDetailBox}>
              {/* Header: Hiển thị thứ, ngày, tháng, năm rõ ràng */}
              <View style={styles.selectedDetailHeader}>
                <View style={styles.selectedDetailHeaderLeft}>
                  <Ionicons
                    name={period === 'week' ? 'calendar' : period === 'month' ? 'folder-open' : 'albums'}
                    size={16}
                    color="#047857"
                  />
                  <Text style={styles.selectedDetailDateTitle} numberOfLines={1}>
                    {selectedItem.fullLabel}
                  </Text>
                </View>
                <Text style={styles.selectedDetailTotal}>
                  {selectedItem.amount > 0 ? `-${selectedItem.amount.toLocaleString('vi-VN')} đ` : '0 đ'}
                </Text>
              </View>

              {/* Danh sách các khoản chi của ngày/tuần/tháng đó */}
              {selectedItem.details && selectedItem.details.length > 0 ? (
                <View style={styles.expenseItemsList}>
                  {selectedItem.details.map((exp, expIdx) => (
                    <View
                      key={exp.id || expIdx}
                      style={[
                        styles.expenseItemRow,
                        expIdx === selectedItem.details.length - 1 && styles.expenseItemRowLast,
                      ]}
                    >
                      <View style={[styles.expenseIconBox, { backgroundColor: exp.bg }]}>
                        <Ionicons name={exp.icon} size={15} color={exp.color} />
                      </View>

                      <View style={styles.expenseInfoCol}>
                        <Text style={styles.expenseItemTitle} numberOfLines={1}>{exp.title}</Text>
                        <View style={styles.expenseMetaRow}>
                          <Text style={styles.expenseItemCategory}>{exp.category}</Text>
                          <Text style={styles.expenseMetaDot}>•</Text>
                          <Text style={styles.expenseItemTime}>{exp.timeStr}</Text>
                        </View>
                      </View>

                      <Text style={styles.expenseItemAmount}>{exp.amountFormatted}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyExpenseBox}>
                  <Ionicons name="sparkles-outline" size={20} color="#94A3B8" />
                  <Text style={styles.emptyExpenseText}>
                    {isVi ? 'Không có khoản chi nào phát sinh' : 'No expenses recorded'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles Chuẩn Fintech Tối Giản & Sang Trọng ───────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // 1. HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FAF7F2',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 2. THANH NGANG CHỌN KỲ (FULL-WIDTH)
  periodBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
    alignItems: 'center',
  },
  periodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    borderRadius: 12,
  },
  periodTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  periodTabTextActive: {
    color: '#047857',
    fontWeight: '800',
  },

  // 3. THẺ TỔNG CHI TIÊU KỲ NÀY TỐI GIẢN
  minimalSummaryCard: {
    backgroundColor: '#064E3B',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minimalSummaryLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.6,
  },
  minimalPeriodPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  minimalPeriodPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ECFDF5',
  },
  amountDisplayRow: {
    marginTop: 10,
  },
  minimalSummaryAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A7F3D0',
  },

  // 4. BIỂU ĐỒ
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  cardHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  chartToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chartToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    gap: 3,
  },
  chartToggleBtnActive: {
    backgroundColor: '#047857',
  },
  chartToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chartToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  interactiveTooltipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tooltipPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  tooltipDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#064E3B',
    flex: 1,
  },
  tooltipAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#064E3B',
  },
  tooltipHighestTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tooltipHighestTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
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
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // 5. BREAKDOWN
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  donutCenterContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  donutCenterValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  categoriesListContainer: {
    marginTop: 12,
  },
  catBreakdownItem: {
    marginBottom: 12,
  },
  catInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catSum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  catPercentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catPct: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // 6. CHIPS SELECTOR & CHI TIẾT THEO MỤC ĐƯỢC CHỌN
  chipsScrollView: {
    marginBottom: 12,
  },
  chipsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  selectorChipActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  selectorChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  selectorChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },


  selectedDetailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 6,
  },
  selectedDetailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    marginRight: 8,
  },
  selectedDetailDateTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  selectedDetailTotal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  expenseItemsList: {
    paddingTop: 2,
  },
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  expenseItemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  expenseIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  expenseInfoCol: {
    flex: 1,
  },
  expenseItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  expenseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  expenseItemCategory: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
  },
  expenseMetaDot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  expenseItemTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  expenseItemAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  emptyExpenseBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyExpenseText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
