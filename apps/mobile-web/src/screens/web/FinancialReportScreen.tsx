import React, { useState, useEffect, useMemo } from 'react';
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
} from '@monett/shared';
import { getBudgetApi, BudgetData } from '../../services/api';
import {
  idbLoadRecords,
  getInitialDayRecordsFromLocalStorage,
  DayExpenseRecord,
  ExpenseItem,
} from '../../services/calendarStorage';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { TabKey } from '../../layouts/ResponsiveLayout';

export type TimeScope = 'week' | 'month' | 'year' | 'day';

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
  const isVi = language === 'vi';

  // Thời gian hiện tại
  const now = new Date();
  const currentRealDay = now.getDate();
  const currentRealMonth = now.getMonth() + 1;
  const currentRealYear = now.getFullYear();

  // 1. STATE BỘ LỌC THỜI GIAN: TUẦN • THÁNG • NĂM
  const [timeScope, setTimeScope] = useState<TimeScope>('week');
  const [selectedDay, setSelectedDay] = useState<number>(currentRealDay);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentRealMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear);

  // Chế độ biểu đồ tháng: 'spline' (đường cong) hoặc 'bar' (cột)
  const [chartType, setChartType] = useState<'spline' | 'bar'>('spline');

  // Lọc theo danh mục đang bấm chọn trong biểu đồ Donut
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Điểm được chọn / hover trên biểu đồ
  const [selectedTrendPoint, setSelectedTrendPoint] = useState<any | null>(null);

  // Modals & Dropdowns
  const [showDayPicker, setShowDayPicker] = useState<boolean>(false);
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [showYearPicker, setShowYearPicker] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [lightboxPhotoUri, setLightboxPhotoUri] = useState<string | null>(null);

  // Dữ liệu sổ chi tiêu lịch thực tế từ IndexedDB & localStorage
  const [dayRecords, setDayRecords] = useState<Record<string, DayExpenseRecord>>(() => {
    return getInitialDayRecordsFromLocalStorage();
  });

  // Ngân sách tháng
  const [budget, setBudget] = useState<BudgetData>({
    month: currentRealMonth,
    year: currentRealYear,
    limit: 22000000,
    spent: 0,
    remaining: 22000000,
    spentPercent: 0,
    remainingPercent: 100,
    status: 'safe',
    payday: 5,
    daysUntilPayday: 12,
    currency: 'VND',
  });

  // Tải dữ liệu từ Storage & API
  useEffect(() => {
    let isMounted = true;
    const reloadData = () => {
      const latest = getInitialDayRecordsFromLocalStorage();
      if (isMounted && Object.keys(latest).length > 0) {
        setDayRecords((prev) => ({ ...prev, ...latest }));
      }
      idbLoadRecords<Record<string, DayExpenseRecord>>()
        .then((stored) => {
          if (isMounted && stored && Object.keys(stored).length > 0) {
            setDayRecords((prev) => ({ ...prev, ...stored }));
          }
        })
        .catch(() => {});
    };

    reloadData();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', reloadData);
      window.addEventListener('focus', reloadData);
    }

    getBudgetApi()
      .then((b) => {
        if (isMounted && b && b.limit) setBudget(b);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', reloadData);
        window.removeEventListener('focus', reloadData);
      }
    };
  }, []);

  // Format tiền tệ VNĐ
  const formatMoney = (val?: number) => {
    if (val === undefined || val === null) return '0';
    return Math.abs(val).toLocaleString('vi-VN');
  };

  // Danh sách các năm có phát sinh dữ liệu
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentRealYear, 2024, 2025, 2026]);
    Object.keys(dayRecords).forEach((k) => {
      const y = parseInt(k.split('-')[0], 10);
      if (!isNaN(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [dayRecords, currentRealYear]);

  // Số ngày trong tháng đang chọn
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  // Bảng màu danh mục đồng bộ
  const categoryColorMap: Record<string, string> = {
    'Ăn uống': '#047857',
    'Cà phê & Nước': '#8B5CF6',
    'Đi chợ & Siêu thị': '#10B981',
    'Mua sắm': '#EC4899',
    'Di chuyển & Xăng': '#3B82F6',
    'Hóa đơn': '#EF4444',
    'Giải trí': '#F59E0B',
    'Khác': '#64748B',
  };

  const categoryIconMap: Record<string, string> = {
    'Ăn uống': '🍜',
    'Cà phê & Nước': '☕',
    'Đi chợ & Siêu thị': '🛒',
    'Mua sắm': '🛍️',
    'Di chuyển & Xăng': '🛵',
    'Hóa đơn': '🧾',
    'Giải trí': '🎬',
    'Khác': '✨',
  };

  // Helper tìm record của 1 ngày bất kỳ
  const getRecordForDay = (y: number, m: number, d: number): DayExpenseRecord | null => {
    const primaryKey = `${y}-${m}-${d}`;
    const paddedKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let rec = dayRecords[primaryKey] || dayRecords[paddedKey];
    if (!rec) {
      // Fallback tìm key có tháng và ngày khớp
      const altKey = Object.keys(dayRecords).find((k) => {
        const parts = k.split('-');
        return Number(parts[1]) === m && Number(parts[2]) === d;
      });
      if (altKey) rec = dayRecords[altKey];
    }
    return rec || null;
  };

  // =========================================================================
  // 1. TỔNG HỢP DỮ LIỆU: THEO NGÀY ĐANG CHỌN (DAY DATA)
  // =========================================================================
  const dayReportData = useMemo(() => {
    const rec = getRecordForDay(selectedYear, selectedMonth, selectedDay);
    let items: ExpenseItem[] = [];

    if (rec && rec.items && rec.items.length > 0) {
      items = [...rec.items];
    } else if (rec && (rec.amount > 0 || rec.note || rec.photoUri)) {
      items = [
        {
          id: `single-${selectedYear}-${selectedMonth}-${selectedDay}`,
          time: '12:00',
          amount: rec.amount || 0,
          category: rec.category || 'Ăn uống',
          categoryIcon: rec.categoryIcon || categoryIconMap[rec.category || 'Ăn uống'] || '🍜',
          note: rec.note || 'Chi tiêu trong ngày',
          photoUri: rec.photoUri,
          createdAt: `${selectedYear}-${selectedMonth}-${selectedDay}T12:00:00`,
        },
      ];
    }

    const totalSpending = items.reduce((sum, it) => sum + (it.amount || 0), 0);
    const maxItem = items.reduce(
      (max, it) => (it.amount > (max?.amount || 0) ? it : max),
      null as ExpenseItem | null
    );

    // Phân bổ danh mục trong ngày
    const catMap: Record<string, { name: string; amount: number; count: number; color: string; icon: string }> = {};
    items.forEach((it) => {
      const cName = it.category || 'Ăn uống';
      if (!catMap[cName]) {
        catMap[cName] = {
          name: cName,
          amount: 0,
          count: 0,
          color: categoryColorMap[cName] || '#059669',
          icon: it.categoryIcon || categoryIconMap[cName] || '🍜',
        };
      }
      catMap[cName].amount += it.amount || 0;
      catMap[cName].count += 1;
    });

    const categoriesList: ICategoryBreakdown[] = Object.values(catMap).map((c) => ({
      id: `cat-${c.name}`,
      name: c.name,
      amount: c.amount,
      color: c.color,
      icon: c.icon,
      percent: totalSpending > 0 ? Math.round((c.amount / totalSpending) * 100) : 0,
    }));

    return {
      totalSpending,
      transactionsCount: items.length,
      maxItem,
      items,
      categoriesList,
      hasData: items.length > 0,
    };
  }, [dayRecords, selectedYear, selectedMonth, selectedDay]);

  // =========================================================================
  // 1.1 TỔNG HỢP DỮ LIỆU: THEO TUẦN ĐANG CHỌN (WEEK DATA)
  // =========================================================================
  const currentWeekInfo = useMemo(() => {
    const cur = new Date(selectedYear, selectedMonth - 1, selectedDay);
    const dayOfWeek = cur.getDay(); // 0 is Sun, 1 is Mon, ... 6 is Sat
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(cur);
    monday.setDate(cur.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = `${monday.getDate() < 10 ? '0' : ''}${monday.getDate()}/${monday.getMonth() + 1 < 10 ? '0' : ''}${monday.getMonth() + 1}`;
    const sundayStr = `${sunday.getDate() < 10 ? '0' : ''}${sunday.getDate()}/${sunday.getMonth() + 1 < 10 ? '0' : ''}${sunday.getMonth() + 1}/${sunday.getFullYear()}`;

    const labelNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const shortNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dNum = d.getDate();
      const mNum = d.getMonth() + 1;
      const yNum = d.getFullYear();
      const isToday = dNum === currentRealDay && mNum === currentRealMonth && yNum === currentRealYear;
      const isSelected = dNum === selectedDay && mNum === selectedMonth && yNum === selectedYear;

      days.push({
        date: d,
        dayOfWeekLabel: labelNames[i],
        shortLabel: shortNames[i],
        dayNum: dNum,
        monthNum: mNum,
        yearNum: yNum,
        dateKey: `${yNum}-${mNum < 10 ? '0' : ''}${mNum}-${dNum < 10 ? '0' : ''}${dNum}`,
        isToday,
        isSelected,
      });
    }

    return {
      monday,
      sunday,
      mondayStr,
      sundayStr,
      rangeLabel: `Tuần: ${mondayStr} - ${sundayStr}`,
      days,
    };
  }, [selectedYear, selectedMonth, selectedDay, currentRealDay, currentRealMonth, currentRealYear]);

  const weekReportData = useMemo(() => {
    let totalSpending = 0;
    let totalTransactionsCount = 0;
    const catMap: Record<string, { id: string; name: string; amount: number; count: number; color: string; icon: string }> = {};

    const weekDaysData = currentWeekInfo.days.map((dayInfo) => {
      const rec = getRecordForDay(dayInfo.yearNum, dayInfo.monthNum, dayInfo.dayNum);
      const items = rec?.items || [];
      const computedAmount = items.length > 0
        ? items.reduce((s, it) => s + (it.amount || 0), 0)
        : (rec?.amount || 0);

      if (computedAmount > 0) {
        totalSpending += computedAmount;
      }

      if (items.length > 0) {
        totalTransactionsCount += items.length;
        items.forEach((it) => {
          const cName = it.category || 'Ăn uống';
          if (!catMap[cName]) {
            catMap[cName] = {
              id: `cat-${cName}`,
              name: cName,
              amount: 0,
              count: 0,
              color: categoryColorMap[cName] || '#059669',
              icon: it.categoryIcon || categoryIconMap[cName] || '🍜',
            };
          }
          catMap[cName].amount += it.amount || 0;
          catMap[cName].count += 1;
        });
      } else if (computedAmount > 0) {
        totalTransactionsCount += 1;
        const cName = rec?.category || 'Ăn uống';
        if (!catMap[cName]) {
          catMap[cName] = {
            id: `cat-${cName}`,
            name: cName,
            amount: 0,
            count: 0,
            color: categoryColorMap[cName] || '#059669',
            icon: rec?.categoryIcon || categoryIconMap[cName] || '🍜',
          };
        }
        catMap[cName].amount += computedAmount;
        catMap[cName].count += 1;
      }

      return {
        ...dayInfo,
        amount: computedAmount,
        note: rec?.note,
        category: rec?.category,
        categoryIcon: rec?.categoryIcon || '🍜',
        photoUri: rec?.photoUri,
        itemsCount: items.length > 0 ? items.length : computedAmount > 0 ? 1 : 0,
        items: items.length > 0 ? items : computedAmount > 0 ? [
          {
            id: `w-${dayInfo.dateKey}`,
            time: '12:00',
            amount: computedAmount,
            category: rec?.category || 'Ăn uống',
            categoryIcon: rec?.categoryIcon || '🍜',
            note: rec?.note,
            photoUri: rec?.photoUri,
            createdAt: dayInfo.dateKey,
          },
        ] : [],
      };
    });

    const maxDayAmount = Math.max(...weekDaysData.map((d) => d.amount), 0);
    const peakDay = maxDayAmount > 0 ? weekDaysData.find((d) => d.amount === maxDayAmount) : null;
    const daysWithSpendingCount = weekDaysData.filter((d) => d.amount > 0).length;
    const dailyAvg = Math.round(totalSpending / 7);

    const categoriesList: ICategoryBreakdown[] = Object.values(catMap)
      .map((c) => ({
        ...c,
        percent: totalSpending > 0 ? Math.round((c.amount / totalSpending) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalSpending,
      totalTransactionsCount,
      daysWithSpendingCount,
      dailyAvg,
      peakDay,
      maxDayAmount,
      weekDaysData,
      categoriesList,
      rangeLabel: currentWeekInfo.rangeLabel,
      mondayStr: currentWeekInfo.mondayStr,
      sundayStr: currentWeekInfo.sundayStr,
      hasData: totalSpending > 0,
    };
  }, [currentWeekInfo, dayRecords]);

  // =========================================================================
  // 2. TỔNG HỢP DỮ LIỆU: THEO THÁNG ĐANG CHỌN (MONTH DATA)
  // =========================================================================
  const monthReportData = useMemo(() => {
    let totalSpending = 0;
    let totalTransactionsCount = 0;
    const dailyMap: Record<number, { amount: number; note?: string; category?: string; itemsCount: number; items: ExpenseItem[] }> = {};
    const catMap: Record<string, { id: string; name: string; amount: number; count: number; color: string; icon: string }> = {};

    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const rec = getRecordForDay(selectedYear, selectedMonth, d);
      if (rec) {
        const items = rec.items || [];
        const computedAmount = items.length > 0
          ? items.reduce((s, it) => s + (it.amount || 0), 0)
          : (rec.amount || 0);

        if (computedAmount > 0 || rec.photoUri || items.length > 0) {
          totalSpending += computedAmount;
          dailyMap[d] = {
            amount: computedAmount,
            note: rec.note,
            category: rec.category,
            itemsCount: items.length > 0 ? items.length : 1,
            items: items.length > 0 ? items : [
              {
                id: `d-${d}`,
                time: '12:00',
                amount: computedAmount,
                category: rec.category || 'Ăn uống',
                categoryIcon: rec.categoryIcon || '🍜',
                note: rec.note,
                photoUri: rec.photoUri,
                createdAt: `${selectedYear}-${selectedMonth}-${d}`,
              },
            ],
          };

          if (items.length > 0) {
            totalTransactionsCount += items.length;
            items.forEach((it) => {
              const cName = it.category || 'Ăn uống';
              if (!catMap[cName]) {
                catMap[cName] = {
                  id: `cat-${cName}`,
                  name: cName,
                  amount: 0,
                  count: 0,
                  color: categoryColorMap[cName] || '#059669',
                  icon: it.categoryIcon || categoryIconMap[cName] || '🍜',
                };
              }
              catMap[cName].amount += it.amount || 0;
              catMap[cName].count += 1;
            });
          } else {
            totalTransactionsCount += 1;
            const cName = rec.category || 'Ăn uống';
            if (!catMap[cName]) {
              catMap[cName] = {
                id: `cat-${cName}`,
                name: cName,
                amount: 0,
                count: 0,
                color: categoryColorMap[cName] || '#059669',
                icon: rec.categoryIcon || categoryIconMap[cName] || '🍜',
              };
            }
            catMap[cName].amount += computedAmount;
            catMap[cName].count += 1;
          }
        }
      }
    }

    const categoriesList: ICategoryBreakdown[] = Object.values(catMap)
      .map((c) => ({
        ...c,
        percent: totalSpending > 0 ? Math.round((c.amount / totalSpending) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Tìm ngày đỉnh chi
    const daysArray = Object.entries(dailyMap).map(([d, val]) => ({
      day: Number(d),
      ...val,
    }));
    const peakDay = daysArray.reduce(
      (max, it) => (it.amount > (max?.amount || 0) ? it : max),
      null as any
    );

    return {
      totalSpending,
      totalTransactionsCount,
      dailyMap,
      categoriesList,
      peakDay,
      daysWithSpendingCount: daysArray.length,
    };
  }, [dayRecords, selectedYear, selectedMonth, daysInSelectedMonth]);

  // =========================================================================
  // 3. TỔNG HỢP DỮ LIỆU: THEO NĂM ĐANG CHỌN (YEAR DATA)
  // =========================================================================
  const yearReportData = useMemo(() => {
    let yearTotal = 0;
    let yearTransactionsCount = 0;
    const monthsData: { month: number; label: string; amount: number; txCount: number; isPeak?: boolean }[] = [];
    const catMap: Record<string, { id: string; name: string; amount: number; count: number; color: string; icon: string }> = {};

    for (let m = 1; m <= 12; m++) {
      let mSpending = 0;
      let mTx = 0;
      const daysCount = new Date(selectedYear, m, 0).getDate();

      for (let d = 1; d <= daysCount; d++) {
        const rec = getRecordForDay(selectedYear, m, d);
        if (rec) {
          const items = rec.items || [];
          const computedAmount = items.length > 0
            ? items.reduce((s, it) => s + (it.amount || 0), 0)
            : (rec.amount || 0);

          if (computedAmount > 0 || rec.photoUri || items.length > 0) {
            mSpending += computedAmount;
            yearTotal += computedAmount;

            if (items.length > 0) {
              mTx += items.length;
              yearTransactionsCount += items.length;
              items.forEach((it) => {
                const cName = it.category || 'Ăn uống';
                if (!catMap[cName]) {
                  catMap[cName] = {
                    id: `cat-${cName}`,
                    name: cName,
                    amount: 0,
                    count: 0,
                    color: categoryColorMap[cName] || '#059669',
                    icon: it.categoryIcon || categoryIconMap[cName] || '🍜',
                  };
                }
                catMap[cName].amount += it.amount || 0;
                catMap[cName].count += 1;
              });
            } else {
              mTx += 1;
              yearTransactionsCount += 1;
              const cName = rec.category || 'Ăn uống';
              if (!catMap[cName]) {
                catMap[cName] = {
                  id: `cat-${cName}`,
                  name: cName,
                  amount: 0,
                  count: 0,
                  color: categoryColorMap[cName] || '#059669',
                  icon: rec.categoryIcon || categoryIconMap[cName] || '🍜',
                };
              }
              catMap[cName].amount += computedAmount;
              catMap[cName].count += 1;
            }
          }
        }
      }

      monthsData.push({
        month: m,
        label: `T${m}`,
        amount: mSpending,
        txCount: mTx,
      });
    }

    // Đánh dấu tháng cao nhất
    const peakMonth = monthsData.reduce(
      (max, m) => (m.amount > (max?.amount || 0) ? m : max),
      null as any
    );
    if (peakMonth && peakMonth.amount > 0) {
      peakMonth.isPeak = true;
    }

    // Tháng tiết kiệm nhất (có chi > 0)
    const activeMonths = monthsData.filter((m) => m.amount > 0);
    const lowestMonth = activeMonths.reduce(
      (min, m) => (m.amount < (min?.amount || Infinity) ? m : min),
      null as any
    );

    const categoriesList: ICategoryBreakdown[] = Object.values(catMap)
      .map((c) => ({
        ...c,
        percent: yearTotal > 0 ? Math.round((c.amount / yearTotal) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthlyAvg = activeMonths.length > 0 ? Math.round(yearTotal / activeMonths.length) : Math.round(yearTotal / 12);

    return {
      yearTotal,
      yearTransactionsCount,
      monthsData,
      peakMonth,
      lowestMonth,
      monthlyAvg,
      categoriesList,
      activeMonthsCount: activeMonths.length,
    };
  }, [dayRecords, selectedYear]);

  // Điều hướng tiến / lùi thời gian
  const handlePrevTime = () => {
    if (timeScope === 'week') {
      const cur = new Date(selectedYear, selectedMonth - 1, selectedDay);
      cur.setDate(cur.getDate() - 7);
      setSelectedYear(cur.getFullYear());
      setSelectedMonth(cur.getMonth() + 1);
      setSelectedDay(cur.getDate());
    } else if (timeScope === 'day') {
      if (selectedDay > 1) {
        setSelectedDay(selectedDay - 1);
      } else {
        const prevM = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevY = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        const daysInPrev = new Date(prevY, prevM, 0).getDate();
        setSelectedYear(prevY);
        setSelectedMonth(prevM);
        setSelectedDay(daysInPrev);
      }
    } else if (timeScope === 'month') {
      if (selectedMonth > 1) {
        setSelectedMonth(selectedMonth - 1);
      } else {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      }
    } else {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextTime = () => {
    if (timeScope === 'week') {
      const cur = new Date(selectedYear, selectedMonth - 1, selectedDay);
      cur.setDate(cur.getDate() + 7);
      setSelectedYear(cur.getFullYear());
      setSelectedMonth(cur.getMonth() + 1);
      setSelectedDay(cur.getDate());
    } else if (timeScope === 'day') {
      if (selectedDay < daysInSelectedMonth) {
        setSelectedDay(selectedDay + 1);
      } else {
        const nextM = selectedMonth === 12 ? 1 : selectedMonth + 1;
        const nextY = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
        setSelectedYear(nextY);
        setSelectedMonth(nextM);
        setSelectedDay(1);
      }
    } else if (timeScope === 'month') {
      if (selectedMonth < 12) {
        setSelectedMonth(selectedMonth + 1);
      } else {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      }
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  // Nút về ngày hôm nay
  const handleResetToToday = () => {
    setSelectedDay(currentRealDay);
    setSelectedMonth(currentRealMonth);
    setSelectedYear(currentRealYear);
  };

  // Xuất file CSV
  const handleExportCSV = async () => {
    setShowExportMenu(false);
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      const rows: string[] = ['Thời gian,Danh mục,Số tiền (VNĐ),Ghi chú'];
      if (timeScope === 'day') {
        dayReportData.items.forEach((it) => {
          rows.push(
            `"${selectedDay}/${selectedMonth}/${selectedYear} ${it.time}","${it.category}",${it.amount},"${it.note || ''}"`
          );
        });
        rows.push(`Tổng cộng Ngày ${selectedDay}/${selectedMonth}/${selectedYear},,${dayReportData.totalSpending},`);
      } else if (timeScope === 'month') {
        Object.entries(monthReportData.dailyMap).forEach(([dStr, val]) => {
          val.items.forEach((it) => {
            rows.push(
              `"${dStr}/${selectedMonth}/${selectedYear} ${it.time || ''}","${it.category}",${it.amount},"${it.note || ''}"`
            );
          });
        });
        rows.push(`Tổng cộng Tháng ${selectedMonth}/${selectedYear},,${monthReportData.totalSpending},`);
      } else {
        yearReportData.monthsData.forEach((m) => {
          rows.push(`"Tháng ${m.month}/${selectedYear}","Tất cả",${m.amount},"${m.txCount} giao dịch"`);
        });
        rows.push(`Tổng cộng Năm ${selectedYear},,${yearReportData.yearTotal},`);
      }

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute(
        'download',
        `Bao_Cao_${timeScope.toUpperCase()}_${selectedDay}_${selectedMonth}_${selectedYear}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  // Xuất file JSON
  const handleExportJSON = () => {
    setShowExportMenu(false);
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const payload = {
      scope: timeScope,
      date: `${selectedYear}-${selectedMonth}-${selectedDay}`,
      dayReport: timeScope === 'day' ? dayReportData : undefined,
      monthReport: timeScope === 'month' ? monthReportData : undefined,
      yearReport: timeScope === 'year' ? yearReportData : undefined,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Monett_Report_${timeScope}_${selectedYear}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // In / Lưu PDF
  const handlePrint = () => {
    setShowExportMenu(false);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  // =========================================================================
  // TOÁN HỌC BIỂU ĐỒ SVG CHO THÁNG (DAILY TREND SPLINE & BARS)
  // =========================================================================
  const chartW = 900;
  const chartH = 240;
  const padL = 60;
  const padR = 40;
  const padT = 45;
  const padB = 35;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  // Xây dựng mảng 31 ngày cho biểu đồ tháng
  const monthlyTrendPoints = useMemo(() => {
    const list: { day: number; label: string; amount: number; isPeak: boolean; note?: string; category?: string }[] = [];
    const peakAmt = monthReportData.peakDay?.amount || 0;

    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const data = monthReportData.dailyMap[d];
      const amount = data?.amount || 0;
      list.push({
        day: d,
        label: d < 10 ? `0${d}` : `${d}`,
        amount,
        isPeak: peakAmt > 0 && amount === peakAmt,
        note: data?.note,
        category: data?.category,
      });
    }
    return list;
  }, [monthReportData, daysInSelectedMonth]);

  const maxMonthDayAmount = Math.max(...monthlyTrendPoints.map((p) => p.amount), 0);
  let maxMonthY = 500000;
  if (maxMonthDayAmount > 0) {
    if (maxMonthDayAmount <= 200000) maxMonthY = 200000;
    else if (maxMonthDayAmount <= 500000) maxMonthY = 500000;
    else if (maxMonthDayAmount <= 1000000) maxMonthY = 1000000;
    else if (maxMonthDayAmount <= 2000000) maxMonthY = 2000000;
    else maxMonthY = Math.ceil((maxMonthDayAmount * 1.2) / 500000) * 500000;
  }

  const dailyBenchmark = Math.round((budget.limit || 22000000) / daysInSelectedMonth);
  const benchmarkY = padT + plotH * (1 - Math.min(dailyBenchmark, maxMonthY) / maxMonthY);

  const getPtX = (dNum: number) => padL + ((dNum - 1) / Math.max(1, daysInSelectedMonth - 1)) * plotW;
  const getPtY = (amt: number) => padT + plotH * (1 - Math.min(amt, maxMonthY) / maxMonthY);

  // Đường cong Spline
  let splineCurvePath = '';
  if (monthlyTrendPoints.length > 0) {
    const pts = monthlyTrendPoints.map((p) => ({ x: getPtX(p.day), y: getPtY(p.amount) }));
    splineCurvePath = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      splineCurvePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }

  const splineAreaPath = splineCurvePath
    ? `${splineCurvePath} L ${getPtX(daysInSelectedMonth)} ${padT + plotH} L ${getPtX(1)} ${padT + plotH} Z`
    : '';

  // Vòng tròn Donut (Được phóng to nổi bật & sắc nét)
  const donutR = 100;
  const donutCircum = 2 * Math.PI * donutR;

  // Lọc danh sách danh mục theo tab hiện tại
  const currentCategories = useMemo(() => {
    if (timeScope === 'week') return weekReportData.categoriesList;
    if (timeScope === 'day') return dayReportData.categoriesList;
    if (timeScope === 'year') return yearReportData.categoriesList;
    return monthReportData.categoriesList;
  }, [timeScope, weekReportData, dayReportData, monthReportData, yearReportData]);

  const topCategory = currentCategories[0];
  const currentTotalSpending = useMemo(() => {
    if (timeScope === 'week') return weekReportData.totalSpending;
    if (timeScope === 'day') return dayReportData.totalSpending;
    if (timeScope === 'year') return yearReportData.yearTotal;
    return monthReportData.totalSpending;
  }, [timeScope, weekReportData, dayReportData, monthReportData, yearReportData]);

  const currentTotalTxCount = useMemo(() => {
    if (timeScope === 'week') return weekReportData.totalTransactionsCount;
    if (timeScope === 'day') return dayReportData.transactionsCount;
    if (timeScope === 'year') return yearReportData.yearTransactionsCount;
    return monthReportData.totalTransactionsCount;
  }, [timeScope, weekReportData, dayReportData, monthReportData, yearReportData]);

  const currentTimeScopeLabel = useMemo(() => {
    if (timeScope === 'week') return `Tuần ${weekReportData.mondayStr} - ${weekReportData.sundayStr}`;
    if (timeScope === 'year') return `Năm ${selectedYear}`;
    return `Tháng ${selectedMonth}/${selectedYear}`;
  }, [timeScope, weekReportData, selectedMonth, selectedYear]);

  // Hàng 4 thẻ chỉ số nhanh thu nhỏ tinh tế, không chiếm diện tích biểu đồ
  const renderCompactInsightRow = () => {
    const peakText =
      timeScope === 'week'
        ? weekReportData.peakDay
          ? `${weekReportData.peakDay.dayOfWeekLabel} (${weekReportData.peakDay.dayNum}/${weekReportData.peakDay.monthNum})`
          : 'Chưa có'
        : timeScope === 'day'
        ? dayReportData.maxItem
          ? `${dayReportData.maxItem.category}`
          : 'Chưa có'
        : timeScope === 'month'
        ? monthReportData.peakDay
          ? `Ngày ${monthReportData.peakDay.day}/${selectedMonth}`
          : 'Chưa có'
        : yearReportData.peakMonth
        ? `Tháng ${yearReportData.peakMonth.month}`
        : 'Chưa có';

    const avgText =
      timeScope === 'week'
        ? `${formatMoney(weekReportData.dailyAvg)} VNĐ/ngày`
        : timeScope === 'day'
        ? topCategory
          ? `${topCategory.name}`
          : 'Chưa có'
        : timeScope === 'month'
        ? `${formatMoney(
            monthReportData.daysWithSpendingCount > 0
              ? Math.round(monthReportData.totalSpending / monthReportData.daysWithSpendingCount)
              : 0
          )} VNĐ/ngày`
        : `${formatMoney(yearReportData.monthlyAvg)} VNĐ/tháng`;

    const statusNote =
      timeScope === 'week'
        ? weekReportData.totalSpending === 0
          ? 'Chưa phát sinh chi tiêu'
          : weekReportData.dailyAvg <= dailyBenchmark
          ? 'Kiểm soát tốt (Dưới định mức)'
          : 'Vượt nhẹ định mức ngày'
        : timeScope === 'month'
        ? monthReportData.totalSpending === 0
          ? 'Chưa phát sinh chi tiêu'
          : (monthReportData.daysWithSpendingCount > 0
              ? Math.round(monthReportData.totalSpending / monthReportData.daysWithSpendingCount)
              : 0) <= dailyBenchmark
          ? 'Kiểm soát tốt (Dưới định mức)'
          : 'Đang vượt định mức ngày'
        : timeScope === 'day'
        ? dayReportData.totalSpending === 0
          ? 'Không có khoản chi'
          : `${dayReportData.transactionsCount} khoản chi hôm nay`
        : yearReportData.yearTotal === 0
        ? 'Chưa có giao dịch'
        : `${yearReportData.yearTransactionsCount} giao dịch cả năm`;

    return (
      <View style={styles.compactKpiRow}>
        {/* KPI 1: Tổng chi */}
        <View style={[styles.compactKpiCard, styles.compactKpiCardGreen]}>
          <View style={styles.compactKpiHeader}>
            <Text style={styles.compactKpiLabel}>
              {timeScope === 'week'
                ? 'TỔNG CHI TUẦN'
                : timeScope === 'day'
                ? `TỔNG CHI NGÀY ${selectedDay}/${selectedMonth}`
                : timeScope === 'month'
                ? `TỔNG CHI THÁNG ${selectedMonth}`
                : `TỔNG CHI NĂM ${selectedYear}`}
            </Text>
            <Text style={{ fontSize: 13 }}>💸</Text>
          </View>
          <Text style={styles.compactKpiValue} numberOfLines={1}>
            {formatMoney(currentTotalSpending)} <Text style={styles.compactKpiCurrency}>VNĐ</Text>
          </Text>
          <Text style={styles.compactKpiSub} numberOfLines={1}>
            {timeScope === 'week'
              ? `${weekReportData.totalTransactionsCount} khoản • ${weekReportData.daysWithSpendingCount}/7 ngày`
              : timeScope === 'day'
              ? `${dayReportData.transactionsCount} khoản chi`
              : timeScope === 'month'
              ? `${monthReportData.totalTransactionsCount} khoản • ${monthReportData.daysWithSpendingCount} ngày có chi`
              : `${yearReportData.yearTransactionsCount} khoản chi`}
          </Text>
        </View>

        {/* KPI 2: Đỉnh chi tiêu */}
        <View style={[styles.compactKpiCard, styles.compactKpiCardRed]}>
          <View style={styles.compactKpiHeader}>
            <Text style={styles.compactKpiLabel}>ĐỈNH CHI TIÊU</Text>
            <Text style={{ fontSize: 13 }}>👑</Text>
          </View>
          <Text style={[styles.compactKpiValue, { color: '#DC2626' }]} numberOfLines={1}>
            {timeScope === 'week'
              ? formatMoney(weekReportData.peakDay?.amount || 0)
              : timeScope === 'day'
              ? formatMoney(dayReportData.maxItem?.amount || 0)
              : timeScope === 'month'
              ? formatMoney(monthReportData.peakDay?.amount || 0)
              : formatMoney(yearReportData.peakMonth?.amount || 0)}{' '}
            <Text style={styles.compactKpiCurrency}>VNĐ</Text>
          </Text>
          <Text style={styles.compactKpiSub} numberOfLines={1}>
            {peakText}
          </Text>
        </View>

        {/* KPI 3: Chi trung bình */}
        <View style={[styles.compactKpiCard, styles.compactKpiCardAmber]}>
          <View style={styles.compactKpiHeader}>
            <Text style={styles.compactKpiLabel}>
              {timeScope === 'day' ? 'NHÓM CHI NHIỀU' : 'CHI TRUNG BÌNH'}
            </Text>
            <Text style={{ fontSize: 13 }}>🎯</Text>
          </View>
          <Text style={[styles.compactKpiValue, { color: '#B45309' }]} numberOfLines={1}>
            {avgText}
          </Text>
          <Text style={styles.compactKpiSub} numberOfLines={1}>
            Định mức: {formatMoney(dailyBenchmark)}đ/ngày
          </Text>
        </View>

        {/* KPI 4: Đánh giá */}
        <View style={[styles.compactKpiCard, styles.compactKpiCardBlue]}>
          <View style={styles.compactKpiHeader}>
            <Text style={styles.compactKpiLabel}>ĐÁNH GIÁ DÒNG TIỀN</Text>
            <Text style={{ fontSize: 13 }}>📊</Text>
          </View>
          <Text style={[styles.compactKpiValue, { color: '#1E40AF' }]} numberOfLines={1}>
            {statusNote}
          </Text>
          <Text style={styles.compactKpiSub} numberOfLines={1}>
            {timeScope === 'week'
              ? `${weekReportData.mondayStr} - ${weekReportData.sundayStr}`
              : timeScope === 'month'
              ? `Tháng ${selectedMonth}/${selectedYear}`
              : `Năm ${selectedYear}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ==================== 1. THANH TIÊU ĐỀ & ĐIỀU KHIỂN GỌN GÀNG TẠI ĐẦU TRANG ==================== */}
      <View style={styles.topControlCard}>
        <View style={styles.topHeaderMainRow}>
          {/* Tiêu đề & Phụ đề */}
          <View style={styles.topTitleCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.brandIconCircle}>
                <Text style={{ fontSize: 20 }}>📊</Text>
              </View>
              <View>
                <Text style={styles.screenMainHeading}>Báo Cáo & Thống Kê Tài Chính</Text>
                <Text style={styles.screenSubHeading}>
                  Xem chi tiết dòng tiền chi tiêu theo Tuần, theo Tháng và theo Năm
                </Text>
              </View>
            </View>
          </View>

          {/* Cụm công cụ điều khiển bên phải: Chọn Chế độ, Chọn Thời gian & Nút Xuất Báo cáo */}
          <View style={styles.topControlsCluster}>
            {/* 3 NÚT CHỌN CHẾ ĐỘ: THEO TUẦN • THEO THÁNG • THEO NĂM */}
            <View style={styles.scopeTabsContainer}>
              <TouchableOpacity
                style={[styles.scopeTabBtn, timeScope === 'week' && styles.scopeTabBtnActive]}
                onPress={() => setTimeScope('week')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13 }}>📅</Text>
                <Text style={[styles.scopeTabText, timeScope === 'week' && styles.scopeTabTextActive]}>
                  Theo Tuần
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeTabBtn, timeScope === 'month' && styles.scopeTabBtnActive]}
                onPress={() => setTimeScope('month')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13 }}>🗓️</Text>
                <Text style={[styles.scopeTabText, timeScope === 'month' && styles.scopeTabTextActive]}>
                  Theo Tháng
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeTabBtn, timeScope === 'year' && styles.scopeTabBtnActive]}
                onPress={() => setTimeScope('year')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13 }}>📈</Text>
                <Text style={[styles.scopeTabText, timeScope === 'year' && styles.scopeTabTextActive]}>
                  Theo Năm
                </Text>
              </TouchableOpacity>
            </View>

            {/* THANH ĐIỀU HƯỚNG THỜI GIAN (LÙI / CHỌN / TIẾN) */}
            <View style={styles.timeNavControls}>
              {/* Nút lùi thời gian */}
              <TouchableOpacity
                style={styles.timeNavArrowBtn}
                onPress={handlePrevTime}
                activeOpacity={0.7}
              >
                <Text style={styles.timeNavArrowText}>◀</Text>
              </TouchableOpacity>

              {/* Ô CHỌN THỜI GIAN TRUNG TÂM */}
              {timeScope === 'week' && (
                <View style={styles.timeNavDisplayBtn}>
                  <Text style={{ fontSize: 15 }}>📅</Text>
                  <Text style={styles.timeNavDisplayText}>
                    {weekReportData.rangeLabel}
                  </Text>
                </View>
              )}

              {timeScope === 'day' && (
                <TouchableOpacity
                  style={styles.timeNavDisplayBtn}
                  onPress={() => setShowDayPicker(!showDayPicker)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15 }}>📅</Text>
                  <Text style={styles.timeNavDisplayText}>
                    Ngày {selectedDay < 10 ? `0${selectedDay}` : selectedDay} tháng {selectedMonth}, năm {selectedYear}
                  </Text>
                  <Text style={styles.timeNavChevron}>▾</Text>
                </TouchableOpacity>
              )}

              {timeScope === 'month' && (
                <TouchableOpacity
                  style={styles.timeNavDisplayBtn}
                  onPress={() => setShowMonthPicker(!showMonthPicker)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15 }}>🗓️</Text>
                  <Text style={styles.timeNavDisplayText}>
                    Tháng {selectedMonth} năm {selectedYear}
                  </Text>
                  <Text style={styles.timeNavChevron}>▾</Text>
                </TouchableOpacity>
              )}

              {timeScope === 'year' && (
                <TouchableOpacity
                  style={styles.timeNavDisplayBtn}
                  onPress={() => setShowYearPicker(!showYearPicker)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 15 }}>📈</Text>
                  <Text style={styles.timeNavDisplayText}>
                    Năm {selectedYear}
                  </Text>
                  <Text style={styles.timeNavChevron}>▾</Text>
                </TouchableOpacity>
              )}

              {/* Nút tiến thời gian */}
              <TouchableOpacity
                style={styles.timeNavArrowBtn}
                onPress={handleNextTime}
                activeOpacity={0.7}
              >
                <Text style={styles.timeNavArrowText}>▶</Text>
              </TouchableOpacity>

              {/* Nút về hôm nay */}
              {(selectedDay !== currentRealDay || selectedMonth !== currentRealMonth || selectedYear !== currentRealYear) && (
                <TouchableOpacity
                  style={styles.todayShortcutBtn}
                  onPress={handleResetToToday}
                  activeOpacity={0.8}
                >
                  <Text style={styles.todayShortcutText}>Hôm nay</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Nút xuất báo cáo */}
            <View style={{ position: 'relative', zIndex: 9999 }}>
              <TouchableOpacity
                style={styles.exportReportBtn}
                onPress={() => setShowExportMenu(!showExportMenu)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14 }}>📥</Text>
                <Text style={styles.exportReportBtnText}>Xuất báo cáo</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>▾</Text>
              </TouchableOpacity>

              {showExportMenu && (
                <>
                  <TouchableOpacity
                    style={styles.dropdownBackdrop}
                    onPress={() => setShowExportMenu(false)}
                    activeOpacity={1}
                  />
                  <View style={styles.exportDropdownMenu}>
                    <TouchableOpacity style={styles.exportDropdownItem} onPress={handleExportCSV}>
                      <Text style={{ fontSize: 16 }}>📊</Text>
                      <Text style={styles.exportDropdownText}>Xuất bảng tính CSV (.csv)</Text>
                    </TouchableOpacity>
                    <View style={styles.exportDivider} />
                    <TouchableOpacity style={styles.exportDropdownItem} onPress={handleExportJSON}>
                      <Text style={{ fontSize: 16 }}>📋</Text>
                      <Text style={styles.exportDropdownText}>Xuất dữ liệu JSON (.json)</Text>
                    </TouchableOpacity>
                    <View style={styles.exportDivider} />
                    <TouchableOpacity style={styles.exportDropdownItem} onPress={handlePrint}>
                      <Text style={{ fontSize: 16 }}>🖨️</Text>
                      <Text style={styles.exportDropdownText}>In / Lưu file PDF</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* POPUP DROPDOWN CHỌN NGÀY TRONG THÁNG */}
      {showDayPicker && (
        <View style={styles.pickerModalCard}>
          <Text style={styles.pickerModalTitle}>
            Chọn ngày trong Tháng {selectedMonth}/{selectedYear}:
          </Text>
          <View style={styles.daysGrid}>
            {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => {
              const hasSpending = !!monthReportData.dailyMap[d];
              const isSelected = selectedDay === d;

              return (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.dayGridCell,
                    hasSpending && styles.dayGridCellHasData,
                    isSelected && styles.dayGridCellSelected,
                  ]}
                  onPress={() => {
                    setSelectedDay(d);
                    setShowDayPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dayGridCellText,
                      isSelected && styles.dayGridCellTextSelected,
                    ]}
                  >
                    {d}
                  </Text>
                  {hasSpending && !isSelected && <View style={styles.dayDotIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* POPUP DROPDOWN CHỌN THÁNG */}
      {showMonthPicker && (
        <View style={styles.pickerModalCard}>
          <Text style={styles.pickerModalTitle}>Chọn tháng trong năm {selectedYear}:</Text>
          <View style={styles.monthsGrid}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.monthGridCell,
                  selectedMonth === m && styles.monthGridCellSelected,
                ]}
                onPress={() => {
                  setSelectedMonth(m);
                  setShowMonthPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.monthGridCellText,
                    selectedMonth === m && styles.monthGridCellTextSelected,
                  ]}
                >
                  Tháng {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* POPUP DROPDOWN CHỌN NĂM */}
      {showYearPicker && (
        <View style={styles.pickerModalCard}>
          <Text style={styles.pickerModalTitle}>Chọn năm thống kê:</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {availableYears.map((y) => (
              <TouchableOpacity
                key={y}
                style={[
                  styles.monthGridCell,
                  selectedYear === y && styles.monthGridCellSelected,
                ]}
                onPress={() => {
                  setSelectedYear(y);
                  setShowYearPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.monthGridCellText,
                    selectedYear === y && styles.monthGridCellTextSelected,
                  ]}
                >
                  Năm {y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 3. KHU VỰC CHỈ SỐ NHỎ GỌN TINH TẾ (4 THẺ NGANG TRÊN ĐẦU BIỂU ĐỒ) */}
      {/* ========================================================================= */}
      {renderCompactInsightRow()}

      {/* ========================================================================= */}
      {/* 4. CHẾ ĐỘ 1: THEO TUẦN (WEEK VIEW) - SƠ ĐỒ CỘT 7 NGÀY CÓ CỘT MỐC TRỤC TUNG */}
      {/* ========================================================================= */}
      {timeScope === 'week' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Biểu Đồ Chi Tiêu 7 Ngày Trong Tuần
              </Text>
              <Text style={styles.sectionSub}>
                {weekReportData.rangeLabel} • So sánh dòng tiền chi tiêu giữa các ngày trong tuần
              </Text>
            </View>
            <View style={styles.totalDayBadge}>
              <Text style={styles.totalDayBadgeText}>
                Tổng tuần: {formatMoney(weekReportData.totalSpending)} VNĐ
              </Text>
            </View>
          </View>

          {/* SƠ ĐỒ CỘT 7 NGÀY CÓ TRỤC TUNG (CỘT MỐC TRÊN/DƯỚI) & ĐƯỜNG GIÓNG NGANG */}
          {(() => {
            const weekRawMax = Math.max(...weekReportData.weekDaysData.map((d) => d.amount), 0);
            let weekChartMaxY = 500000;
            if (weekRawMax > 0) {
              if (weekRawMax <= 100000) weekChartMaxY = 100000;
              else if (weekRawMax <= 200000) weekChartMaxY = 200000;
              else if (weekRawMax <= 500000) weekChartMaxY = 500000;
              else if (weekRawMax <= 1000000) weekChartMaxY = 1000000;
              else if (weekRawMax <= 2000000) weekChartMaxY = 2000000;
              else if (weekRawMax <= 5000000) weekChartMaxY = 5000000;
              else weekChartMaxY = Math.ceil((weekRawMax * 1.15) / 1000000) * 1000000;
            }

            const plotHeight = 220;

            return (
              <View style={styles.proChartWrapper}>
                {/* CỘT TRỤC TUNG BÊN TRÁI (Y-AXIS LABELS CÓ CỘT MỐC TRÊN & MỐC SÀN) */}
                <View style={styles.yAxisMilestoneCol}>
                  {/* Mốc trên cùng (100%) */}
                  <View style={styles.yAxisMilestoneItemTop}>
                    <View style={styles.milestoneBadgeTop}>
                      <Text style={styles.milestoneBadgeTopText}>Mốc trên</Text>
                    </View>
                    <Text style={styles.milestoneTopValueText}>
                      {formatMoney(weekChartMaxY)}đ
                    </Text>
                  </View>

                  {/* Mốc 75% */}
                  <View style={styles.yAxisMilestoneItemMid}>
                    <Text style={styles.milestoneMidValueText}>
                      {formatMoney(Math.round(weekChartMaxY * 0.75))}đ
                    </Text>
                  </View>

                  {/* Mốc 50% */}
                  <View style={styles.yAxisMilestoneItemMid}>
                    <Text style={styles.milestoneMidValueText}>
                      {formatMoney(Math.round(weekChartMaxY * 0.5))}đ
                    </Text>
                  </View>

                  {/* Mốc 25% */}
                  <View style={styles.yAxisMilestoneItemMid}>
                    <Text style={styles.milestoneMidValueText}>
                      {formatMoney(Math.round(weekChartMaxY * 0.25))}đ
                    </Text>
                  </View>

                  {/* Mốc sàn (0%) */}
                  <View style={styles.yAxisMilestoneItemBottom}>
                    <View style={styles.milestoneBadgeBottom}>
                      <Text style={styles.milestoneBadgeBottomText}>Mốc sàn</Text>
                    </View>
                    <Text style={styles.milestoneBottomValueText}>0đ</Text>
                  </View>
                </View>

                {/* KHU VỰC ĐỒ THỊ VỚI ĐƯỜNG KẺ GIÓNG NGANG & 7 CỘT */}
                <View style={styles.chartPlotContainer}>
                  {/* ĐƯỜNG GIÓNG NGANG (HORIZONTAL GRID LINES) */}
                  <View style={[styles.proGridLine, { top: 0 }]} />
                  <View style={[styles.proGridLine, { top: plotHeight * 0.25 }]} />
                  <View style={[styles.proGridLine, { top: plotHeight * 0.5 }]} />
                  <View style={[styles.proGridLine, { top: plotHeight * 0.75 }]} />
                  <View style={[styles.proGridBaseline, { top: plotHeight }]} />

                  {/* 7 CỘT (BARS) NẰM TRÊN TRỤC CƠ SỞ */}
                  <View style={[styles.proBarsRow, { height: plotHeight }]}>
                    {weekReportData.weekDaysData.map((day) => {
                      const isPeak =
                        weekReportData.peakDay &&
                        weekReportData.peakDay.dateKey === day.dateKey &&
                        day.amount > 0;
                      const fillHeight =
                        day.amount > 0
                          ? Math.max(16, Math.round((day.amount / weekChartMaxY) * plotHeight))
                          : 0;

                      return (
                        <TouchableOpacity
                          key={day.dateKey}
                          style={[
                            styles.proBarColumn,
                            day.isSelected && styles.proBarColumnSelected,
                          ]}
                          onPress={() => {
                            setSelectedDay(day.dayNum);
                            setSelectedMonth(day.monthNum);
                            setSelectedYear(day.yearNum);
                          }}
                          activeOpacity={0.85}
                        >
                          {/* Khung thanh chứa cột đứng */}
                          <View style={styles.proBarTrackChannel}>
                            {/* Cột tô màu thực tế đứng từ đáy lên */}
                            {fillHeight > 0 ? (
                              <View
                                style={[
                                  styles.proBarFilled,
                                  { height: fillHeight },
                                  isPeak && styles.proBarFilledPeak,
                                  day.isSelected && styles.proBarFilledSelected,
                                ]}
                              >
                                <View style={styles.proBarGloss} />
                              </View>
                            ) : null}

                            {/* Nhãn số tiền hiển thị trên đầu cột */}
                            <View
                              style={[
                                styles.proBarTagWrap,
                                { bottom: fillHeight + 6 },
                              ]}
                            >
                              {day.amount > 0 ? (
                                <View
                                  style={[
                                    styles.proBarAmountTag,
                                    isPeak && styles.proBarAmountTagPeak,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.proBarAmountTagText,
                                      isPeak && styles.proBarAmountTagTextPeak,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {formatMoney(day.amount)}đ
                                  </Text>
                                </View>
                              ) : (
                                <Text style={styles.proBarZeroText}>0đ</Text>
                              )}
                            </View>
                          </View>

                          {/* CỘT MỐC TRỤC HOÀNH (X-AXIS): THỨ & NGÀY THÁNG */}
                          <View
                            style={[
                              styles.proBarXAxisBox,
                              day.isSelected && styles.proBarXAxisBoxSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.proBarXDayName,
                                day.isSelected && styles.proBarXDayNameActive,
                                isPeak && !day.isSelected && { color: '#DC2626' },
                              ]}
                            >
                              {day.dayOfWeekLabel || day.shortLabel}
                            </Text>
                            <Text
                              style={[
                                styles.proBarXDateNum,
                                day.isSelected && styles.proBarXDateNumActive,
                                day.isToday && styles.proBarXDateNumActive,
                              ]}
                            >
                              {day.dayNum}/{day.monthNum}
                            </Text>

                            {day.isToday && (
                              <View style={styles.todayIndicatorBadge}>
                                <Text style={styles.todayIndicatorText}>Hôm nay</Text>
                              </View>
                            )}

                            {isPeak && !day.isToday && (
                              <View style={styles.proBarPeakBadge}>
                                <Text style={styles.proBarPeakBadgeText}>👑 Đỉnh</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Thông tin tóm tắt nhanh dưới biểu đồ tuần */}
          <View style={styles.weekChartFooterSummary}>
            <View style={styles.weekSummaryItem}>
              <Text style={styles.weekSummaryItemLabel}>Trung bình mỗi ngày</Text>
              <Text style={styles.weekSummaryItemValue}>
                {formatMoney(weekReportData.dailyAvg)} VNĐ
              </Text>
            </View>
            <View style={styles.weekSummaryDivider} />
            <View style={styles.weekSummaryItem}>
              <Text style={styles.weekSummaryItemLabel}>Ngày chi nhiều nhất</Text>
              <Text style={[styles.weekSummaryItemValue, { color: '#DC2626' }]}>
                {weekReportData.peakDay
                  ? `${weekReportData.peakDay.dayOfWeekLabel} (${formatMoney(
                      weekReportData.peakDay.amount
                    )}đ)`
                  : 'Chưa có'}
              </Text>
            </View>
            <View style={styles.weekSummaryDivider} />
            <View style={styles.weekSummaryItem}>
              <Text style={styles.weekSummaryItemLabel}>Số ngày có phát sinh chi</Text>
              <Text style={styles.weekSummaryItemValue}>
                {weekReportData.daysWithSpendingCount} / 7 ngày
              </Text>
            </View>
          </View>
        </View>
      )}

        {/* ========================================================================= */}
        {/* 4. CHẾ ĐỘ: THEO NGÀY (DAY VIEW) - SƠ ĐỒ KHOẢN CHI & DANH SÁCH CHI TIẾT */}
        {/* ========================================================================= */}
        {timeScope === 'day' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Sơ Đồ & Danh Sách Chi Tiêu Ngày {selectedDay}/{selectedMonth}/{selectedYear}
              </Text>
              <Text style={styles.sectionSub}>
                Chi tiết từng khoản tiền đã chi trong ngày theo mốc thời gian
              </Text>
            </View>
            <View style={styles.totalDayBadge}>
              <Text style={styles.totalDayBadgeText}>
                Tổng ngày: {formatMoney(dayReportData.totalSpending)} VNĐ
              </Text>
            </View>
          </View>

          {/* NẾU KHÔNG CÓ KHOẢN CHI NÀO TRONG NGÀY */}
          {!dayReportData.hasData ? (
            <View style={styles.emptyDayContainer}>
              <Text style={{ fontSize: 44 }}>🍃</Text>
              <Text style={styles.emptyDayTitle}>
                Ngày {selectedDay}/{selectedMonth}/{selectedYear} không có khoản chi nào!
              </Text>
              <Text style={styles.emptyDaySub}>
                Bạn chưa ghi chép chi tiêu nào vào ngày này. Hãy bấm vào các ngày có dấu chấm trên lịch để xem thống kê nhé!
              </Text>
              <TouchableOpacity
                style={styles.pickAnotherDayBtn}
                onPress={() => setShowDayPicker(true)}
              >
                <Text style={styles.pickAnotherDayBtnText}>Chọn ngày khác trên lịch 📅</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* SƠ ĐỒ CỘT CÁC KHOẢN CHI TRONG NGÀY (HORIZON/VERTICAL BARS) */}
              <View style={styles.dayItemsBarSection}>
                <Text style={styles.subSectionTitle}>
                  📊 Sơ Đồ Cột Các Khoản Chi Trong Ngày
                </Text>
                <View style={styles.dayBarsList}>
                  {dayReportData.items.map((it, idx) => {
                    const pct = dayReportData.totalSpending > 0
                      ? Math.min(100, Math.round((it.amount / dayReportData.totalSpending) * 100))
                      : 0;
                    const catColor = categoryColorMap[it.category || 'Ăn uống'] || '#047857';

                    return (
                      <View key={it.id || idx} style={styles.dayBarRow}>
                        <View style={styles.dayBarLeftCol}>
                          <Text style={{ fontSize: 16 }}>{it.categoryIcon || '🍜'}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dayBarItemTitle} numberOfLines={1}>
                              {it.note || it.category}
                            </Text>
                            <Text style={styles.dayBarItemTime}>
                              {it.time || '12:00'} • {it.category}
                            </Text>
                          </View>
                        </View>

                        {/* Thanh tiến độ */}
                        <View style={styles.dayBarTrack}>
                          <View
                            style={[
                              styles.dayBarFill,
                              { width: `${pct}%`, backgroundColor: catColor },
                            ]}
                          />
                        </View>

                        <View style={styles.dayBarRightCol}>
                          <Text style={[styles.dayBarAmount, { color: catColor }]}>
                            {formatMoney(it.amount)}đ
                          </Text>
                          <Text style={styles.dayBarPercent}>({pct}%)</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

            </View>
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 5. CHẾ ĐỘ 2: THEO THÁNG (MONTH VIEW) - SƠ ĐỒ XU HƯỚNG 31 NGÀY VÀ ĐỈNH CHI */}
      {/* ========================================================================= */}
      {timeScope === 'month' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Sơ Đồ Xu Hướng Chi Tiêu Hàng Ngày (Tháng {selectedMonth}/{selectedYear})
              </Text>
              <Text style={styles.sectionSub}>
                Theo dõi chi tiết các ngày chi tiêu từ ngày 1 đến ngày {daysInSelectedMonth}
              </Text>
            </View>

            {/* NÚT CHUYỂN ĐỔI BIỂU ĐỒ ĐƯỜNG CONG HOẶC BIỂU ĐỒ CỘT */}
            <View style={styles.chartToggleGroup}>
              <TouchableOpacity
                style={[styles.chartToggleBtn, chartType === 'spline' && styles.chartToggleBtnActive]}
                onPress={() => setChartType('spline')}
              >
                <Text style={[styles.chartToggleText, chartType === 'spline' && styles.chartToggleTextActive]}>
                  📈 Đường cong
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartToggleBtn, chartType === 'bar' && styles.chartToggleBtnActive]}
                onPress={() => setChartType('bar')}
              >
                <Text style={[styles.chartToggleText, chartType === 'bar' && styles.chartToggleTextActive]}>
                  📊 Cột
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BIỂU ĐỒ SVG XU HƯỚNG THÁNG */}
          <View style={styles.svgContainer}>
            <Svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height={260}>
              <Defs>
                <LinearGradient id="greenFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#047857" stopOpacity="0.25" />
                  <Stop offset="90%" stopColor="#047857" stopOpacity="0.02" />
                  <Stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Lưới ngang và nhãn trục Y */}
              {[1, 0.75, 0.5, 0.25, 0].map((step, idx) => {
                const yPos = padT + plotH * (1 - step);
                const val = Math.round(maxMonthY * step);
                const valLabel = val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${Math.round(val / 1000)}k` : '0đ';

                return (
                  <G key={idx}>
                    <Line
                      x1={padL}
                      y1={yPos}
                      x2={chartW - padR}
                      y2={yPos}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <SvgText
                      x={padL - 10}
                      y={yPos + 4}
                      fill="#94A3B8"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {valLabel}
                    </SvgText>
                  </G>
                );
              })}

              {/* Đường hạn mức trung bình ngày tiêu chuẩn (Màu cam nét đứt) */}
              <Line
                x1={padL}
                y1={benchmarkY}
                x2={chartW - padR}
                y2={benchmarkY}
                stroke="#D97706"
                strokeWidth="1.8"
                strokeDasharray="6, 5"
              />

              {/* NẾU CHỌN BIỂU ĐỒ CỘT (BARS) */}
              {chartType === 'bar' && (
                monthlyTrendPoints.map((p) => {
                  const xCenter = getPtX(p.day);
                  const barW = Math.max(8, plotW / daysInSelectedMonth - 4);
                  const barH = p.amount > 0 ? Math.max(6, (p.amount / maxMonthY) * plotH) : 0;
                  const barY = padT + plotH - barH;
                  const isCurrent = p.day === selectedDay;

                  return (
                    <G key={p.day}>
                      <Rect
                        x={xCenter - barW / 2}
                        y={barY}
                        width={barW}
                        height={barH}
                        rx="3"
                        fill={p.isPeak ? '#064E3B' : isCurrent ? '#059669' : '#10B981'}
                        opacity={p.amount > 0 ? 0.9 : 0}
                      />
                    </G>
                  );
                })
              )}

              {/* NẾU CHỌN BIỂU ĐỒ ĐƯỜNG CONG (SPLINE) */}
              {chartType === 'spline' && (
                <>
                  {splineAreaPath ? <Path d={splineAreaPath} fill="url(#greenFillGrad)" /> : null}
                  {splineCurvePath ? (
                    <Path
                      d={splineCurvePath}
                      fill="none"
                      stroke="#047857"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </>
              )}

              {/* ĐIỂM DỮ LIỆU TƯƠNG TÁC TRÊN ĐƯỜNG CONG */}
              {monthlyTrendPoints.map((p) => {
                const ptX = getPtX(p.day);
                const ptY = getPtY(p.amount);
                const isSelected = selectedDay === p.day;

                return (
                  <G key={p.day}>
                    {/* Vòng hào quang khi là ngày đỉnh chi hoặc được chọn */}
                    {(p.isPeak || isSelected) && p.amount > 0 && (
                      <Circle
                        cx={ptX}
                        cy={ptY}
                        r="8"
                        fill="#FFFFFF"
                        stroke="#047857"
                        strokeWidth="2.5"
                      />
                    )}
                    <Circle
                      cx={ptX}
                      cy={ptY}
                      r={p.isPeak ? '5.5' : p.amount > 0 ? '4' : '2'}
                      fill={p.isPeak ? '#064E3B' : p.amount > 0 ? '#047857' : '#E2E8F0'}
                    />
                  </G>
                );
              })}

              {/* NHÃN NGÀY DƯỚI TRỤC HOÀNH (X-AXIS) */}
              {monthlyTrendPoints
                .filter((p) => p.day === 1 || p.day % 5 === 0 || p.day === daysInSelectedMonth)
                .map((p) => (
                  <SvgText
                    key={p.day}
                    x={getPtX(p.day)}
                    y={padT + plotH + 20}
                    fill="#64748B"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {p.day < 10 ? `0${p.day}` : p.day}
                  </SvgText>
                ))}
            </Svg>
          </View>

          {/* CHÚ THÍCH & POPOVER THÔNG TIN KHI BẤM VÀO NGÀY */}
          <View style={styles.chartFootRow}>
            <View style={styles.chartLegendGroup}>
              <View style={styles.legendPill}>
                <View style={[styles.legendColorDot, { backgroundColor: '#047857' }]} />
                <Text style={styles.legendLabel}>Chi tiêu thực tế</Text>
              </View>
              <View style={styles.legendPill}>
                <View style={[styles.legendColorDot, { backgroundColor: '#D97706' }]} />
                <Text style={[styles.legendLabel, { color: '#B45309' }]}>
                  Mức TB chuẩn ({formatMoney(dailyBenchmark)}đ/ngày)
                </Text>
              </View>
            </View>

            {/* BẤM XEM NHANH CHI TIẾT NGÀY */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                Đang xem Ngày {selectedDay}/{selectedMonth}:
              </Text>
              <TouchableOpacity
                style={styles.quickDayJumpBtn}
                onPress={() => setTimeScope('day')}
              >
                <Text style={styles.quickDayJumpText}>
                  Xem chi tiết Ngày {selectedDay} ➔
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      )}

      {/* ========================================================================= */}
      {/* 6. CHẾ ĐỘ 3: THEO NĂM (YEAR VIEW) - SƠ ĐỒ 12 CỘT CHO 12 THÁNG CÓ CỘT MỐC */}
      {/* ========================================================================= */}
      {timeScope === 'year' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Sơ Đồ Chi Tiêu 12 Tháng Năm {selectedYear}
              </Text>
              <Text style={styles.sectionSub}>
                So sánh tổng quan dòng tiền chi tiêu qua từng tháng từ Tháng 1 đến Tháng 12
              </Text>
            </View>
            <View style={styles.yearTotalTag}>
              <Text style={styles.yearTotalTagText}>
                Tổng năm {selectedYear}: {formatMoney(yearReportData.yearTotal)} VNĐ
              </Text>
            </View>
          </View>

          {/* SƠ ĐỒ 12 CỘT ĐỨNG CÓ HỆ TRỤC TUNG (CỘT MỐC TRÊN/DƯỚI) VÀ GRID LINES */}
          {(() => {
            const maxMonthRaw = Math.max(...yearReportData.monthsData.map((m) => m.amount), 0);
            let yearChartMaxY = 1000000;
            if (maxMonthRaw > 0) {
              if (maxMonthRaw <= 500000) yearChartMaxY = 500000;
              else if (maxMonthRaw <= 1000000) yearChartMaxY = 1000000;
              else if (maxMonthRaw <= 3000000) yearChartMaxY = 3000000;
              else if (maxMonthRaw <= 5000000) yearChartMaxY = 5000000;
              else if (maxMonthRaw <= 10000000) yearChartMaxY = 10000000;
              else yearChartMaxY = Math.ceil((maxMonthRaw * 1.15) / 1000000) * 1000000;
            }

            const plotHeight = 220;

            return (
              <View style={styles.proChartWrapper}>
                {/* TRỤC TUNG Y-AXIS (CỘT MỐC TRÊN / DƯỚI) */}
                <View style={styles.yAxisMilestoneCol}>
                  <View style={styles.yAxisMilestoneItemTop}>
                    <View style={styles.milestoneBadgeTop}>
                      <Text style={styles.milestoneBadgeTopText}>Mốc trên</Text>
                    </View>
                    <Text style={styles.milestoneTopValueText}>
                      {yearChartMaxY >= 1000000
                        ? `${(yearChartMaxY / 1000000).toFixed(1)}M`
                        : `${formatMoney(yearChartMaxY)}đ`}
                    </Text>
                  </View>

                  <View style={styles.yAxisMilestoneItemMid}>
                    <Text style={styles.milestoneMidValueText}>
                      {Math.round(yearChartMaxY * 0.75) >= 1000000
                        ? `${((yearChartMaxY * 0.75) / 1000000).toFixed(1)}M`
                        : `${formatMoney(Math.round(yearChartMaxY * 0.75))}đ`}
                    </Text>
                  </View>

                  <View style={styles.yAxisMilestoneItemMid}>
                    <Text style={styles.milestoneMidValueText}>
                      {Math.round(yearChartMaxY * 0.5) >= 1000000
                        ? `${((yearChartMaxY * 0.5) / 1000000).toFixed(1)}M`
                        : `${formatMoney(Math.round(yearChartMaxY * 0.5))}đ`}
                    </Text>
                  </View>

                  <View style={styles.yAxisMilestoneItemMid}>
                    <Text style={styles.milestoneMidValueText}>
                      {Math.round(yearChartMaxY * 0.25) >= 1000000
                        ? `${((yearChartMaxY * 0.25) / 1000000).toFixed(1)}M`
                        : `${formatMoney(Math.round(yearChartMaxY * 0.25))}đ`}
                    </Text>
                  </View>

                  <View style={styles.yAxisMilestoneItemBottom}>
                    <View style={styles.milestoneBadgeBottom}>
                      <Text style={styles.milestoneBadgeBottomText}>Mốc sàn</Text>
                    </View>
                    <Text style={styles.milestoneBottomValueText}>0đ</Text>
                  </View>
                </View>

                {/* KHU VỰC PLOT 12 CỘT */}
                <View style={styles.chartPlotContainer}>
                  <View style={[styles.proGridLine, { top: 0 }]} />
                  <View style={[styles.proGridLine, { top: plotHeight * 0.25 }]} />
                  <View style={[styles.proGridLine, { top: plotHeight * 0.5 }]} />
                  <View style={[styles.proGridLine, { top: plotHeight * 0.75 }]} />
                  <View style={[styles.proGridBaseline, { top: plotHeight }]} />

                  <View style={[styles.proBarsRow, { height: plotHeight }]}>
                    {yearReportData.monthsData.map((m) => {
                      const isSelected = selectedMonth === m.month;
                      const fillHeight =
                        m.amount > 0
                          ? Math.max(14, Math.round((m.amount / yearChartMaxY) * plotHeight))
                          : 0;

                      return (
                        <TouchableOpacity
                          key={m.month}
                          style={[
                            styles.proYearColumn,
                            isSelected && styles.proBarColumnSelected,
                          ]}
                          onPress={() => {
                            setSelectedMonth(m.month);
                            setTimeScope('month');
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={styles.proBarTrackChannel}>
                            {fillHeight > 0 ? (
                              <View
                                style={[
                                  styles.proBarFilled,
                                  { height: fillHeight },
                                  m.isPeak && styles.proBarFilledPeak,
                                  isSelected && styles.proBarFilledSelected,
                                ]}
                              >
                                <View style={styles.proBarGloss} />
                              </View>
                            ) : null}

                            <View
                              style={[
                                styles.proBarTagWrap,
                                { bottom: fillHeight + 6 },
                              ]}
                            >
                              {m.amount > 0 ? (
                                <View
                                  style={[
                                    styles.proBarAmountTagYear,
                                    m.isPeak && styles.proBarAmountTagPeak,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.proBarAmountTagTextYear,
                                      m.isPeak && styles.proBarAmountTagTextPeak,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {m.amount >= 1000000
                                      ? `${(m.amount / 1000000).toFixed(1)}M`
                                      : `${Math.round(m.amount / 1000)}k`}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={styles.proBarZeroText}>-</Text>
                              )}
                            </View>
                          </View>

                          <View
                            style={[
                              styles.proBarXAxisBoxYear,
                              isSelected && styles.proBarXAxisBoxSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.proBarXMonthText,
                                isSelected && styles.proBarXMonthTextActive,
                                m.isPeak && !isSelected && { color: '#DC2626' },
                              ]}
                            >
                              {m.label}
                            </Text>

                            {m.isPeak && (
                              <View style={styles.proBarPeakBadgeYear}>
                                <Text style={styles.proBarPeakBadgeTextYear}>👑</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })()}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 4. KHU VỰC CHI TIẾT DƯỚI BIỂU ĐỒ (THEO NGÀY / THEO THÁNG / THEO NĂM) */}
      {/* ========================================================================= */}
      {/* Chi tiết từng ngày trong tháng */}
      {timeScope === 'month' && (
        <View style={styles.sectionCard}>
          <Text style={styles.subSectionTitle}>
            📅 Chi Tiết Từng Ngày Trong Tháng {selectedMonth}
          </Text>
          <View style={styles.monthDaysList}>
            {Object.entries(monthReportData.dailyMap).map(([dStr, val]) => {
              const dayNum = Number(dStr);
              const isSelected = selectedDay === dayNum;

              return (
                <TouchableOpacity
                  key={dStr}
                  style={[
                    styles.monthDayRowCard,
                    isSelected && styles.monthDayRowCardActive,
                  ]}
                  onPress={() => {
                    setSelectedDay(dayNum);
                    setTimeScope('day');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.monthDayBadge}>
                    <Text style={styles.monthDayBadgeNum}>{dayNum}</Text>
                    <Text style={styles.monthDayBadgeSub}>Th{selectedMonth}</Text>
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={styles.monthDayCat}>{val.category || 'Chi tiêu'}</Text>
                    <Text style={styles.monthDayNote} numberOfLines={1}>
                      {val.note || `${val.itemsCount} khoản chi`}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.monthDayAmount}>
                      -{formatMoney(val.amount)}đ
                    </Text>
                    <Text style={styles.viewDayLink}>Xem chi tiết ➔</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Chi tiết từng ngày trong tuần */}
      {timeScope === 'week' && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                📝 Chi Tiết Các Khoản Chi Trong 7 Ngày
              </Text>
              <Text style={styles.sectionSub}>
                Danh sách chi tiêu từ Thứ 2 đến Chủ Nhật ({weekReportData.mondayStr} - {weekReportData.sundayStr})
              </Text>
            </View>
          </View>

          <View style={{ gap: 14 }}>
            {weekReportData.weekDaysData.map((day) => {
              return (
                <View key={day.dateKey} style={styles.weekDayCard}>
                  <View style={styles.weekDayCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.weekDayCardBadge, day.isSelected && styles.weekDayCardBadgeSelected]}>
                        <Text style={[styles.weekDayCardBadgeText, day.isSelected && styles.weekDayCardBadgeTextSelected]}>
                          {day.dayOfWeekLabel}
                        </Text>
                      </View>
                      <Text style={styles.weekDayCardDate}>
                        {day.dayNum < 10 ? `0${day.dayNum}` : day.dayNum}/{day.monthNum < 10 ? `0${day.monthNum}` : day.monthNum}/{day.yearNum}
                      </Text>
                      {day.isToday && (
                        <View style={styles.todayIndicatorBadge}>
                          <Text style={styles.todayIndicatorText}>Hôm nay</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.weekDayCardAmount, day.amount > 0 ? { color: '#DC2626' } : { color: '#94A3B8' }]}>
                      {day.amount > 0 ? `-${formatMoney(day.amount)} VNĐ` : '0 VNĐ'}
                    </Text>
                  </View>

                  {day.items.length === 0 ? (
                    <View style={styles.weekDayEmptyRow}>
                      <Text style={styles.weekDayEmptyText}>Không có khoản chi tiêu nào trong ngày này</Text>
                    </View>
                  ) : (
                    <View style={styles.dayDetailsGrid}>
                      {day.items.map((it, idx) => (
                        <View key={it.id || idx} style={styles.transactionCard}>
                          <View style={styles.txCardHeader}>
                            <View style={styles.txIconWrap}>
                              <Text style={{ fontSize: 22 }}>{it.categoryIcon || '🍜'}</Text>
                            </View>
                            <View style={{ flex: 1, marginHorizontal: 10 }}>
                              <Text style={styles.txCategoryName}>{it.category}</Text>
                              <Text style={styles.txTimeText}>⏰ {it.time || '12:00'}</Text>
                            </View>
                            <View style={styles.txAmountWrap}>
                              <Text style={styles.txAmountText}>-{formatMoney(it.amount)}đ</Text>
                            </View>
                          </View>

                          {it.note && (
                            <View style={styles.txNoteBox}>
                              <Text style={styles.txNoteText}>“{it.note}”</Text>
                            </View>
                          )}

                          {it.photoUri && (
                            <TouchableOpacity
                              style={styles.txPhotoThumbWrap}
                              onPress={() => setLightboxPhotoUri(it.photoUri || null)}
                              activeOpacity={0.85}
                            >
                              <Image
                                source={{ uri: it.photoUri }}
                                style={styles.txPhotoThumb}
                                resizeMode="cover"
                              />
                              <View style={styles.txPhotoBadge}>
                                <Text style={styles.txPhotoBadgeText}>🔍 Chạm để xem ảnh lớn</Text>
                              </View>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Chi tiết từng khoản chi trong ngày & ảnh hóa đơn */}
      {timeScope === 'day' && dayReportData.hasData && (
        <View style={styles.sectionCard}>
          <Text style={styles.subSectionTitle}>
            📝 Chi Tiết Từng Khoản Chi & Hóa Đơn
          </Text>
          <View style={styles.dayDetailsGrid}>
            {dayReportData.items.map((it, idx) => (
              <View key={it.id || idx} style={styles.transactionCard}>
                <View style={styles.txCardHeader}>
                  <View style={styles.txIconWrap}>
                    <Text style={{ fontSize: 22 }}>{it.categoryIcon || '🍜'}</Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.txCategoryName}>{it.category}</Text>
                    <Text style={styles.txTimeText}>⏰ {it.time || '12:00'}</Text>
                  </View>
                  <View style={styles.txAmountWrap}>
                    <Text style={styles.txAmountText}>-{formatMoney(it.amount)}đ</Text>
                  </View>
                </View>

                {it.note && (
                  <View style={styles.txNoteBox}>
                    <Text style={styles.txNoteText}>“{it.note}”</Text>
                  </View>
                )}

                {it.photoUri && (
                  <TouchableOpacity
                    style={styles.txPhotoThumbWrap}
                    onPress={() => setLightboxPhotoUri(it.photoUri || null)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: it.photoUri }}
                      style={styles.txPhotoThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.txPhotoBadge}>
                      <Text style={styles.txPhotoBadgeText}>🔍 Chạm để xem ảnh lớn</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bảng tổng hợp 12 tháng */}
      {timeScope === 'year' && (
        <View style={styles.sectionCard}>
          <Text style={styles.subSectionTitle}>
            📋 Bảng Tổng Hợp Chi Tiêu 12 Tháng Năm {selectedYear}
          </Text>
          <View style={styles.yearMonthsGridTable}>
            {yearReportData.monthsData.map((m) => (
              <TouchableOpacity
                key={m.month}
                style={styles.yearMonthCard}
                onPress={() => {
                  setSelectedMonth(m.month);
                  setTimeScope('month');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.yearMonthCardHeader}>
                  <Text style={styles.yearMonthCardTitle}>Tháng {m.month}</Text>
                  {m.isPeak && (
                    <View style={styles.peakTag}>
                      <Text style={styles.peakTagText}>Cao nhất</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.yearMonthCardAmount}>
                  {formatMoney(m.amount)} VNĐ
                </Text>
                <Text style={styles.yearMonthCardSub}>
                  {m.txCount > 0 ? `${m.txCount} khoản chi` : 'Không phát sinh chi tiêu'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 7. PHÂN BỔ CƠ CẤU DANH MỤC CHI TIÊU (DONUT CHART & LEGEND) */}
      {/* ========================================================================= */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>
              Cơ Cấu Danh Mục Chi Tiêu (
              {timeScope === 'week'
                ? `Tuần ${weekReportData.mondayStr} - ${weekReportData.sundayStr}`
                : timeScope === 'day'
                ? `Ngày ${selectedDay}/${selectedMonth}`
                : timeScope === 'month'
                ? `Tháng ${selectedMonth}/${selectedYear}`
                : `Năm ${selectedYear}`}
              )
            </Text>
            <Text style={styles.sectionSub}>
              Tỷ trọng chi tiêu theo từng nhóm (Ăn uống, Nhà cửa, Mua sắm...)
            </Text>
          </View>
          {filterCategory && (
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => setFilterCategory(null)}
            >
              <Text style={styles.clearFilterBtnText}>Xóa lọc: {filterCategory} ✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.donutSectionRow, !isDesktop && styles.donutSectionRowStack]}>
          {/* VÒNG TRÒN DONUT SVG */}
          <View style={styles.donutContainer}>
            <Svg width="180" height="180" viewBox="0 0 180 180">
              <G rotation="-90" origin="90, 90">
                {currentCategories.length === 0 ? (
                  <Circle
                    cx="90"
                    cy="90"
                    r={donutR}
                    fill="transparent"
                    stroke="#E2E8F0"
                    strokeWidth="24"
                  />
                ) : (
                  currentCategories.map((cat, idx) => {
                    const dash = (cat.percent / 100) * donutCircum;
                    const offset = currentCategories
                      .slice(0, idx)
                      .reduce((acc, c) => acc + (c.percent / 100) * donutCircum, 0);

                    return (
                      <Circle
                        key={idx}
                        cx="90"
                        cy="90"
                        r={donutR}
                        fill="transparent"
                        stroke={cat.color}
                        strokeWidth="24"
                        strokeDasharray={`${dash} ${donutCircum - dash}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                      />
                    );
                  })
                )}
              </G>
            </Svg>

            {/* NHÃN Ở TÂM DONUT */}
            <View style={styles.donutCenterLabel}>
              <Text style={styles.donutCenterSub}>Tổng chi</Text>
              <Text style={styles.donutCenterAmount} numberOfLines={1}>
                {currentTotalSpending >= 1000000
                  ? `${(currentTotalSpending / 1000000).toFixed(1)}M`
                  : `${formatMoney(currentTotalSpending)}đ`}
              </Text>
              <Text style={styles.donutCenterTopCat}>
                {topCategory ? topCategory.name : 'Chưa có'}
              </Text>
            </View>
          </View>

          {/* DANH SÁCH CHÚ THÍCH DANH MỤC */}
          <View style={styles.categoriesLegendGrid}>
            {currentCategories.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#94A3B8' }}>
                  Chưa có dữ liệu danh mục trong khoảng thời gian này
                </Text>
              </View>
            ) : (
              currentCategories.map((cat) => {
                const isSelected = filterCategory === cat.name;

                return (
                  <TouchableOpacity
                    key={cat.id || cat.name}
                    style={[
                      styles.catLegendItemCard,
                      isSelected && styles.catLegendItemCardActive,
                    ]}
                    onPress={() => setFilterCategory(isSelected ? null : cat.name)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.catLegendHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 18 }}>{cat.icon || '🍜'}</Text>
                        <Text style={styles.catLegendTitle}>{cat.name}</Text>
                      </View>
                      <Text style={[styles.catLegendPercent, { color: cat.color }]}>
                        {cat.percent}%
                      </Text>
                    </View>

                    {/* Thanh phần trăm */}
                    <View style={styles.catLegendTrack}>
                      <View
                        style={[
                          styles.catLegendFill,
                          { width: `${cat.percent}%`, backgroundColor: cat.color },
                        ]}
                      />
                    </View>

                    <Text style={styles.catLegendAmount}>
                      {formatMoney(cat.amount)} VNĐ
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </View>

      {/* ==================== 8. LIGHTBOX PHÓNG TO ẢNH HÓA ĐƠN ==================== */}
      <Modal
        visible={!!lightboxPhotoUri}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxPhotoUri(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setLightboxPhotoUri(null)}
          >
            <Text style={{ fontSize: 20, color: '#FFFFFF' }}>✕</Text>
          </TouchableOpacity>
          {lightboxPhotoUri && (
            <Image
              source={{ uri: lightboxPhotoUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

// =========================================================================
// STYLESHEET CHUYÊN NGHIỆP, RÕ RÀNG, SANG TRỌNG
// =========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    width: '100%',
    paddingBottom: 80,
  },

  // 1. Top Title & Scope Switcher
  topControlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
    position: 'relative',
    zIndex: 999,
  },
  topHeaderMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  topTitleCol: {
    minWidth: 260,
  },
  topControlsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  brandIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenMainHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: -0.3,
  },
  screenSubHeading: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scopeTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 9,
    padding: 3,
    gap: 3,
  },
  scopeTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
  },
  scopeTabBtnActive: {
    backgroundColor: '#047857',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scopeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  scopeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // 2. Time Nav Controls & Export Button
  timeNavControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  timeNavArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeNavArrowText: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '800',
  },
  timeNavDisplayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    height: 32,
  },
  timeNavDisplayText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065F46',
  },
  timeNavChevron: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '800',
  },
  todayShortcutBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
  },
  todayShortcutText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  exportReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    height: 32,
  },
  exportReportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropdownBackdrop: {
    ...(Platform.OS === 'web'
      ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } as any)
      : { position: 'absolute', top: -1000, left: -1000, width: 3000, height: 3000 }),
    zIndex: 9998,
    backgroundColor: 'transparent',
  },
  exportDropdownMenu: {
    position: 'absolute',
    top: 44,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    width: 230,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 20,
  },
  exportDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  exportDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  exportDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },

  // Pickers Modal
  pickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  pickerModalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayGridCell: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  dayGridCellHasData: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  dayGridCellSelected: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  dayGridCellText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dayGridCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  dayDotIndicator: {
    position: 'absolute',
    bottom: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthGridCell: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthGridCellSelected: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  monthGridCellText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  monthGridCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // 3. Layout 2/3 (Biểu đồ) và 1/3 (Giải thích & Phân tích)
  mainChartInsightRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    width: '100%',
    alignItems: 'stretch',
  },
  mainChartInsightRowStack: {
    flexDirection: 'column',
  },
  chartCol2Third: {
    flex: 2,
    minWidth: 0,
  },
  insightCol1Third: {
    flex: 1,
    minWidth: 320,
  },
  colFull: {
    width: '100%',
    minWidth: 0,
  },

  // Insight Card Styles
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    gap: 12,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  insightHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  insightHeaderSub: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  sideKpiCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  sideKpiCardGreen: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  sideKpiCardBlue: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  sideKpiCardAmber: {
    borderColor: '#FDE68A',
    backgroundColor: '#FEF3C7',
  },
  sideKpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sideKpiLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sideKpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  sideKpiCurrency: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  sideKpiSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  insightAnalysisBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  insightAnalysisTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  insightAnalysisText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 17,
    fontWeight: '500',
  },
  insightQuickActionBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightQuickActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },

  // 4. Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  subSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  // Day View specific
  totalDayBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  totalDayBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  emptyDayContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyDayTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 10,
  },
  emptyDaySub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
    maxWidth: 400,
    textAlign: 'center',
  },
  pickAnotherDayBtn: {
    marginTop: 16,
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
  },
  pickAnotherDayBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dayItemsBarSection: {
    marginBottom: 20,
  },
  dayBarsList: {
    gap: 10,
  },
  dayBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  dayBarLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 170,
  },
  dayBarItemTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  dayBarItemTime: {
    fontSize: 10.5,
    color: '#64748B',
  },
  dayBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  dayBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  dayBarRightCol: {
    width: 90,
    alignItems: 'flex-end',
  },
  dayBarAmount: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  dayBarPercent: {
    fontSize: 10,
    color: '#64748B',
  },
  dayDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  transactionCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txCategoryName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  txTimeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  txAmountWrap: {
    alignItems: 'flex-end',
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E11D48',
  },
  txNoteBox: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  txNoteText: {
    fontSize: 11.5,
    color: '#334155',
    fontStyle: 'italic',
  },
  txPhotoThumbWrap: {
    marginTop: 10,
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  txPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  txPhotoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txPhotoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Month View specific
  chartToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  chartToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chartToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  chartToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  chartToggleTextActive: {
    color: '#064E3B',
    fontWeight: '800',
  },
  svgContainer: {
    width: '100%',
    marginTop: 6,
  },
  chartFootRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chartLegendGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  quickDayJumpBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  quickDayJumpText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  monthDaysList: {
    gap: 8,
  },
  monthDayRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthDayRowCardActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  monthDayBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDayBadgeNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  monthDayBadgeSub: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '700',
  },
  monthDayCat: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  monthDayNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  monthDayAmount: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#047857',
  },
  viewDayLink: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },

  // Year View specific
  yearTotalTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  yearTotalTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  year12BarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  peakCrownWrap: {
    marginBottom: 2,
  },
  yearBarAmtLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  yearBarAmtLabelPeak: {
    color: '#064E3B',
    fontWeight: '900',
  },
  yearBarPill: {
    width: '65%',
    maxWidth: 24,
    borderRadius: 8,
  },
  yearBarPillDefault: {
    backgroundColor: '#10B981',
  },
  yearBarPillPeak: {
    backgroundColor: '#047857',
  },
  yearBarPillSelected: {
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#064E3B',
  },
  yearBarPillEmpty: {
    backgroundColor: '#E2E8F0',
  },
  yearBarMonthText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
  },
  yearBarMonthTextActive: {
    color: '#047857',
    fontWeight: '900',
  },
  yearBarTxCount: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  yearMonthsGridTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  yearMonthCard: {
    flex: 1,
    minWidth: 160,
    maxWidth: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearMonthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  yearMonthCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  peakTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  peakTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
  },
  yearMonthCardAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },
  yearMonthCardSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },

  // Donut Section
  clearFilterBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearFilterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  donutSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  donutSectionRowStack: {
    flexDirection: 'column',
  },
  donutContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 180,
    height: 180,
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
  },
  donutCenterSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  donutCenterAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  donutCenterTopCat: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  categoriesLegendGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catLegendItemCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  catLegendItemCardActive: {
    borderColor: '#047857',
    backgroundColor: '#ECFDF5',
  },
  catLegendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catLegendTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  catLegendPercent: {
    fontSize: 12,
    fontWeight: '800',
  },
  catLegendTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  catLegendFill: {
    height: '100%',
    borderRadius: 3,
  },
  catLegendAmount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },

  // Week Chart Styles
  weekChartContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weekChartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 220,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 8,
  },
  weekBarCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    borderRadius: 10,
  },
  weekBarColSelected: {
    backgroundColor: '#F0FDF4',
  },
  weekBarTopAmount: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textAlign: 'center',
  },
  weekBarTrack: {
    width: '60%',
    maxWidth: 32,
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  weekBarFill: {
    width: '100%',
    borderRadius: 8,
  },
  weekBarLabelBox: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  weekBarLabelBoxSelected: {
    backgroundColor: '#059669',
  },
  weekBarDayText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  weekBarDayTextSelected: {
    color: '#FFFFFF',
  },
  weekBarDateText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  weekBarDateTextSelected: {
    color: '#E6FFFA',
    fontWeight: '700',
  },
  weekBarDateTextToday: {
    color: '#059669',
    fontWeight: '800',
  },
  todayIndicatorBadge: {
    marginTop: 4,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  todayIndicatorText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
  },
  weekChartFooterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  weekSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  weekSummaryItemLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 3,
  },
  weekSummaryItemValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekSummaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },

  // Week Day-by-day Card
  weekDayCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weekDayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekDayCardBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  weekDayCardBadgeSelected: {
    backgroundColor: '#059669',
  },
  weekDayCardBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  weekDayCardBadgeTextSelected: {
    color: '#FFFFFF',
  },
  weekDayCardDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  weekDayCardAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  weekDayEmptyRow: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  weekDayEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  // Lightbox
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 30,
    right: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lightboxImage: {
    width: '90%',
    height: '80%',
  },

  // =========================================================================
  // Professional Coordinate Chart System (Trục tung, Cột mốc, Lưới tọa độ)
  // =========================================================================
  proChartWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  yAxisMilestoneCol: {
    width: 84,
    justifyContent: 'space-between',
    paddingVertical: 4,
    alignItems: 'flex-end',
    borderRightWidth: 1.5,
    borderRightColor: '#CBD5E1',
    paddingRight: 10,
  },
  yAxisMilestoneItemTop: {
    alignItems: 'flex-end',
    gap: 2,
  },
  milestoneBadgeTop: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  milestoneBadgeTopText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B91C1C',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  milestoneTopValueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  yAxisMilestoneItemMid: {
    alignItems: 'flex-end',
  },
  milestoneMidValueText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  yAxisMilestoneItemBottom: {
    alignItems: 'flex-end',
    gap: 2,
  },
  milestoneBadgeBottom: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  milestoneBadgeBottomText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  milestoneBottomValueText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  chartPlotContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  proGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  proGridBaseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#CBD5E1',
  },
  proBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  proBarColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  proYearColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
    borderRadius: 6,
  },
  proBarColumnSelected: {
    backgroundColor: '#F0FDF4',
  },
  proBarTrackChannel: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  proBarFilled: {
    width: '65%',
    maxWidth: 36,
    backgroundColor: '#10B981',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  proBarFilledPeak: {
    backgroundColor: '#EF4444',
  },
  proBarFilledSelected: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  proBarGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  proBarTagWrap: {
    position: 'absolute',
    alignItems: 'center',
    left: -20,
    right: -20,
  },
  proBarAmountTag: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  proBarAmountTagPeak: {
    backgroundColor: '#DC2626',
  },
  proBarAmountTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  proBarAmountTagTextPeak: {
    color: '#FFFFFF',
  },
  proBarAmountTagYear: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  proBarAmountTagTextYear: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  proBarZeroText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  proBarXAxisBox: {
    marginTop: 10,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
    width: '100%',
  },
  proBarXAxisBoxYear: {
    marginTop: 8,
    alignItems: 'center',
    gap: 1,
    paddingVertical: 3,
    paddingHorizontal: 1,
    borderRadius: 6,
    width: '100%',
  },
  proBarXAxisBoxSelected: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  proBarXDayName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  proBarXDayNameActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  proBarXDateNum: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  proBarXDateNumActive: {
    color: '#059669',
    fontWeight: '800',
  },
  proBarXMonthText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  proBarXMonthTextActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  proBarPeakBadge: {
    marginTop: 2,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  proBarPeakBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  proBarPeakBadgeYear: {
    marginTop: 1,
  },
  proBarPeakBadgeTextYear: {
    fontSize: 9,
  },
  compactKpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  compactKpiCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compactKpiCardGreen: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  compactKpiCardRed: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  compactKpiCardAmber: {
    borderColor: '#FDE68A',
    backgroundColor: '#FEF3C7',
  },
  compactKpiCardBlue: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  compactKpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactKpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  compactKpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 3,
  },
  compactKpiCurrency: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  compactKpiSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
});
