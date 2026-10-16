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
  getBudgetApi,
  BudgetData,
} from '../../services/api';
import {
  idbLoadRecords,
  getInitialDayRecordsFromLocalStorage,
  DayExpenseRecord,
  ExpenseItem,
} from '../../services/calendarStorage';
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

  // Real calendar and storage state
  const now = new Date();
  const currentRealMonth = now.getMonth() + 1;
  const currentRealYear = now.getFullYear();

  // Load dayRecords from calendarStorage (both localStorage and IndexedDB)
  const [dayRecords, setDayRecords] = useState<Record<string, DayExpenseRecord>>(() => {
    return getInitialDayRecordsFromLocalStorage();
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    return currentRealMonth;
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const raw = getInitialDayRecordsFromLocalStorage();
    const keys = Object.keys(raw);
    if (keys.length > 0) {
      const yearCounts: Record<number, number> = {};
      keys.forEach((k) => {
        const y = parseInt(k.split('-')[0], 10);
        if (!isNaN(y)) yearCounts[y] = (yearCounts[y] || 0) + 1;
      });
      const topYear = Object.entries(yearCounts).sort((a, b) => b[1] - a[1])[0];
      if (topYear) return Number(topYear[0]);
    }
    return currentRealYear;
  });

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

  // Modals & Popovers
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<IDailySpendingTrend | null>(null);
  const [compRange, setCompRange] = useState<'3m' | '6m'>('6m');
  const [showDualBars, setShowDualBars] = useState<boolean>(true);

  // Hydrate dayRecords from IndexedDB, localStorage & budget from API
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
        if (isMounted && b && b.limit) {
          setBudget(b);
        }
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

  // Formatters
  const formatMoney = (val?: number) => {
    if (val === undefined || val === null) return '0';
    return Math.abs(val).toLocaleString('vi-VN');
  };

  // Days in selected month
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  // Aggregate real financial data from calendar dayRecords
  const realMonthData = useMemo(() => {
    let totalSpending = 0;
    let totalTransactionsCount = 0;
    let momentsPhotosCount = 0;
    const dailyMap: Record<number, { amount: number; photoUri?: string; note?: string; category?: string; items: ExpenseItem[] }> = {};
    const catMap: Record<string, { id: string; name: string; amount: number; count: number; color: string; icon: string }> = {};
    const allMoments: IFeaturedMoment[] = [];

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

    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const primaryKey = `${selectedYear}-${selectedMonth}-${d}`;
      const paddedKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let rec = dayRecords[primaryKey] || dayRecords[paddedKey];

      // Fallback: check if record exists under another year (e.g. 2024 vs 2026)
      if (!rec) {
        const altKey = Object.keys(dayRecords).find((k) => {
          const parts = k.split('-');
          return Number(parts[1]) === selectedMonth && Number(parts[2]) === d;
        });
        if (altKey) rec = dayRecords[altKey];
      }

      if (rec) {
        const items = rec.items || [];
        const computedAmount = items.length > 0
          ? items.reduce((s, it) => s + (it.amount || 0), 0)
          : (rec.amount || 0);
        const dayAmount = computedAmount;

        if (dayAmount > 0 || rec.photoUri || items.length > 0) {
          totalSpending += dayAmount;
          dailyMap[d] = {
            amount: dayAmount,
            photoUri: rec.photoUri,
            note: rec.note,
            category: rec.category,
            items,
          };

          if (rec.photoUri) {
            momentsPhotosCount++;
            allMoments.push({
              id: `moment-${selectedYear}-${selectedMonth}-${d}-cover`,
              badge: rec.category || 'Khoảnh khắc',
              badgeColor: categoryColorMap[rec.category || 'Ăn uống'] || '#047857',
              amount: dayAmount,
              title: rec.note || `${rec.category || 'Chi tiêu'} ngày ${d < 10 ? '0' + d : d}/${selectedMonth}`,
              subtitle: `${d < 10 ? '0' + d : d} Th${selectedMonth} • ${selectedYear}`,
              photoUri: rec.photoUri,
            });
          }

          if (items.length > 0) {
            totalTransactionsCount += items.length;
            items.forEach((it, itIdx) => {
              if (it.photoUri && it.photoUri !== rec.photoUri) {
                momentsPhotosCount++;
                allMoments.push({
                  id: `moment-${selectedYear}-${selectedMonth}-${d}-it-${it.id || itIdx}`,
                  badge: it.category || 'Khoảnh khắc',
                  badgeColor: categoryColorMap[it.category || 'Ăn uống'] || '#047857',
                  amount: it.amount || 0,
                  title: it.note || `${it.category || 'Chi tiêu'} (${it.time || '12:00'})`,
                  subtitle: `${d < 10 ? '0' + d : d} Th${selectedMonth} • ${selectedYear}`,
                  photoUri: it.photoUri,
                });
              }
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
          } else if (dayAmount > 0) {
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
            catMap[cName].amount += dayAmount;
            catMap[cName].count += 1;
          }
        }
      }
    }

    return {
      totalSpending,
      totalTransactionsCount,
      momentsPhotosCount,
      dailyMap,
      catMap,
      allMoments,
    };
  }, [dayRecords, selectedYear, selectedMonth, daysInSelectedMonth]);

  // Real KPI Overview calculations
  const budgetLimit = budget.limit || 22000000;
  const totalExpense = realMonthData.totalSpending;
  const savings = Math.max(0, budgetLimit - totalExpense);
  const daysWithSpending = Object.keys(realMonthData.dailyMap).length;
  const dailyAverage = daysWithSpending > 0 ? Math.round(totalExpense / daysWithSpending) : 0;
  const expensePercent = budgetLimit > 0 ? Math.round((totalExpense / budgetLimit) * 100 * 10) / 10 : 0;
  const savingsPercent = budgetLimit > 0 ? Math.round((savings / budgetLimit) * 100 * 10) / 10 : 100;
  const totalTransactions = realMonthData.totalTransactionsCount;
  const momentsCount = realMonthData.momentsPhotosCount;
  const momentsRatio = totalTransactions > 0
    ? Math.min(100, Math.round((momentsCount / totalTransactions) * 100))
    : (momentsCount > 0 ? 100 : 0);

  const overview: IAnalyticsOverview = {
    totalIncome: budgetLimit,
    totalExpense,
    savings,
    dailyAverage,
    savingsPercent,
    expensePercent,
    savingsTargetDiffPercent: savingsPercent >= 50 ? 15 : 5,
    incomeFixedPercent: 100,
    budgetLimit,
    isSafe: totalExpense <= budgetLimit,
    safetyStatus: totalExpense <= budgetLimit ? 'safe' : 'danger',
    streakDays: daysWithSpending > 0 ? daysWithSpending : 1,
    momentsCount,
    totalTransactions,
    momentsRatio,
    banner: {
      streakDays: daysWithSpending > 0 ? daysWithSpending : 1,
      title: 'Tuyệt vời! Bạn đang kiểm soát chi tiêu rất xuất sắc',
      subtitle: `Chi tiêu Tháng ${selectedMonth} đang nằm gọn trong ngưỡng an toàn ${expensePercent}% ngân sách.`,
    },
  };

  // Export handlers
  const handleExportCSV = async () => {
    setShowExportMenu(false);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const rows = ['Ngày,Danh mục,Số tiền,Ghi chú,Có ảnh'];
        Object.entries(realMonthData.dailyMap).forEach(([dStr, val]) => {
          if (val.items && val.items.length > 0) {
            val.items.forEach((it) => {
              rows.push(
                `${dStr}/${selectedMonth}/${selectedYear},"${it.category || ''}",${it.amount || 0},"${it.note || ''}",${it.photoUri ? 'Có' : 'Không'}`
              );
            });
          } else {
            rows.push(
              `${dStr}/${selectedMonth}/${selectedYear},"${val.category || ''}",${val.amount || 0},"${val.note || ''}",${val.photoUri ? 'Có' : 'Không'}`
            );
          }
        });
        rows.push(`Tổng chi tiêu Tháng ${selectedMonth},,${totalExpense},,`);
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
        const link = document.createElement('a');
        link.setAttribute('href', csvContent);
        link.setAttribute('download', `Bao_Cao_Thang_${selectedMonth}_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.warn('Export CSV error:', e);
    }
  };

  const handleExportJSON = async () => {
    setShowExportMenu(false);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const exportPayload = {
        month: selectedMonth,
        year: selectedYear,
        overview,
        categories: Object.values(realMonthData.catMap),
        dailySpending: realMonthData.dailyMap,
      };
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Bao_Cao_Thang_${selectedMonth}_${selectedYear}.json`);
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

  // Real Daily Spending Trend Curve
  const daysWithSpendingArray = Object.entries(realMonthData.dailyMap).map(([dStr, val]) => ({
    dayNum: Number(dStr),
    ...val,
  }));
  const maxDayItem = daysWithSpendingArray.reduce(
    (max, it) => (it.amount > (max?.amount || 0) ? it : max),
    null as any
  );

  const sampleDaysSet = new Set<number>([1, 5, 10, 15, 20, 25, daysInSelectedMonth]);
  daysWithSpendingArray.forEach((it) => sampleDaysSet.add(it.dayNum));
  const sortedDays = Array.from(sampleDaysSet).sort((a, b) => a - b);
  const dailyBenchmark = Math.round(budgetLimit / daysInSelectedMonth);

  const dailyTrend: IDailySpendingTrend[] = sortedDays.map((d) => {
    const dayData = realMonthData.dailyMap[d];
    const amount = dayData?.amount || 0;
    const isPeak = !!(maxDayItem && maxDayItem.dayNum === d && amount > 0);
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    let highlightTitle: string | undefined = undefined;

    if (isPeak) {
      highlightTitle = `Đỉnh chi: Ngày ${dayStr} (${formatMoney(amount)}đ)`;
    } else if (amount > 0 && dayData?.note) {
      highlightTitle = `Ngày ${dayStr}: ${formatMoney(amount)}đ (${dayData.note})`;
    }

    return {
      day: dayStr,
      label: `${dayStr} Th${selectedMonth}`,
      amount,
      benchmark: dailyBenchmark,
      isPeak,
      highlightTitle,
    };
  });

  // Real Category Breakdown
  const categories: ICategoryBreakdown[] = useMemo(() => {
    const list = Object.values(realMonthData.catMap);
    if (list.length === 0) {
      if (totalExpense > 0) {
        return [
          {
            id: 'cat-default',
            name: 'Chi tiêu tổng hợp',
            amount: totalExpense,
            percent: 100,
            color: '#047857',
            icon: '🍜',
          },
        ];
      }
      return [];
    }
    return list
      .map((c) => ({
        id: c.id,
        name: c.name,
        amount: c.amount,
        percent: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0,
        color: c.color,
        icon: c.icon,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [realMonthData.catMap, totalExpense]);

  const topCategory = categories[0];

  // Real Cashflow comparison
  const comparison: IMonthlyComparison = useMemo(() => {
    const monthsList: any[] = [];
    for (let offset = 5; offset >= 0; offset--) {
      let m = selectedMonth - offset;
      let y = selectedYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      const isCurr = offset === 0;
      let exp = 0;
      if (isCurr) {
        exp = totalExpense;
      } else {
        for (let d = 1; d <= 31; d++) {
          const rec = dayRecords[`${y}-${m}-${d}`];
          if (rec?.amount) exp += rec.amount;
        }
      }

      const displayAmount =
        exp >= 1000000
          ? `${(exp / 1000000).toFixed(1)}M`
          : exp > 0
          ? `${Math.round(exp / 1000)}k`
          : '0đ';

      monthsList.push({
        monthName: `Tháng ${m}`,
        amount: exp,
        income: budgetLimit,
        expense: exp,
        displayAmount,
        isCurrent: isCurr,
      });
    }

    const isPositive = totalExpense <= budgetLimit;
    return {
      months: monthsList,
      insight: {
        title: isPositive ? 'Kiểm soát tài chính rất tốt' : 'Cần cân đối lại chi tiêu',
        description: isPositive
          ? `Chi tiêu Tháng ${selectedMonth} đang là ${formatMoney(totalExpense)}đ, nằm gọn trong hạn mức ${formatMoney(budgetLimit)}đ.`
          : `Chi tiêu Tháng ${selectedMonth} đang là ${formatMoney(totalExpense)}đ, hãy chú ý tiết kiệm nhé.`,
        isPositive,
      },
    };
  }, [selectedMonth, selectedYear, totalExpense, budgetLimit, dayRecords]);

  // Real Emotion Mindfulness Analysis
  const emotions: IEmoMindfulness = useMemo(() => {
    let happyAmt = 0;
    let essentialAmt = 0;
    let impulseAmt = 0;

    categories.forEach((cat) => {
      const n = cat.name;
      if (n.includes('Ăn uống') || n.includes('Cà phê') || n.includes('Giải trí')) {
        happyAmt += cat.amount;
      } else if (n.includes('Đi chợ') || n.includes('Hóa đơn') || n.includes('Di chuyển')) {
        essentialAmt += cat.amount;
      } else {
        impulseAmt += cat.amount;
      }
    });

    const tot = totalExpense > 0 ? totalExpense : 1;
    const happyPct = totalExpense > 0 ? Math.round((happyAmt / tot) * 100) : 0;
    const essentialPct = totalExpense > 0 ? Math.round((essentialAmt / tot) * 100) : 0;
    const impulsePct = totalExpense > 0 ? Math.max(0, 100 - happyPct - essentialPct) : 0;

    return {
      items: [
        {
          key: 'happy',
          title: 'Hạnh phúc / Đầu tư cho bản thân',
          percent: happyPct,
          amount: happyAmt,
          color: '#10B981',
          emoji: '😊',
          description: `${formatMoney(happyAmt)}đ đóng góp vào niềm vui và tinh thần sống tích cực.`,
        },
        {
          key: 'essential',
          title: 'Bắt buộc / Sinh hoạt thiết yếu',
          percent: essentialPct,
          amount: essentialAmt,
          color: '#64748B',
          emoji: '😐',
          description: `${formatMoney(essentialAmt)}đ cho các nhu cầu thiết yếu định kỳ.`,
        },
        {
          key: 'impulse',
          title: 'Bốc đồng / Nuối tiếc (Impulse)',
          percent: impulsePct,
          amount: impulseAmt,
          color: '#EF4444',
          emoji: '🛍️',
          description: `${formatMoney(impulseAmt)}đ cho mua sắm và các khoản phát sinh khác.`,
        },
      ],
      suggestion:
        totalExpense === 0
          ? 'Gợi ý Monett: Hãy ghi chép các khoản chi tiêu mỗi ngày ở Trang Chủ để theo dõi biểu đồ cảm xúc tiền bạc.'
          : `Gợi ý Monett: Chi tiêu Tháng ${selectedMonth} của bạn tập trung nhiều nhất vào ${topCategory?.name || 'các danh mục thiết yếu'} (${topCategory?.percent || 0}%). Tiếp tục duy trì phong độ chi tiêu hợp lý nhé!`,
    };
  }, [categories, totalExpense, topCategory, selectedMonth]);

  // SVG Chart Geometry Calculations for Daily Spending Spline
  const chartW = 920;
  const chartH = 240;
  const padL = 50;
  const padR = 40;
  const padT = 55;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const actualMaxAmount = Math.max(...dailyTrend.map((d) => d.amount), 0);
  let maxY = 500000;
  if (actualMaxAmount > 0) {
    if (actualMaxAmount <= 150000) maxY = 200000;
    else if (actualMaxAmount <= 350000) maxY = 500000;
    else if (actualMaxAmount <= 750000) maxY = 1000000;
    else if (actualMaxAmount <= 1500000) maxY = 2000000;
    else maxY = Math.ceil((actualMaxAmount * 1.25) / 500000) * 500000;
  }
  const benchmarkY = padT + plotH * (1 - Math.min(dailyBenchmark, maxY) / maxY);

  const formatGridVal = (val: number) => {
    if (val >= 1000000) {
      const v = val / 1000000;
      return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `${Math.round(val / 1000)}k`;
    }
    return `${val}`;
  };

  const gridSteps = [
    { val: formatGridVal(maxY), y: padT },
    { val: formatGridVal(maxY * 0.75), y: padT + plotH * 0.25 },
    { val: formatGridVal(maxY * 0.5), y: padT + plotH * 0.5 },
    { val: formatGridVal(maxY * 0.25), y: padT + plotH * 0.75 },
    { val: '0', y: padT + plotH },
  ];

  const getPtX = (idx: number, total: number) => padL + (idx / Math.max(1, total - 1)) * plotW;
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

      {/* ==================== 2. PAGE HEADER & FILTER SECTION ==================== */}
      <View style={styles.headerSection}>
        <View style={styles.headerTitlesCol}>
          <Text style={styles.mainTitle}>
            Báo Cáo & Thống Kê Chi Tiêu
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
                <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
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
                        Tháng {m} / {selectedYear}
                      </Text>
                      {selectedMonth === m && (
                        <Text style={{ color: '#047857', fontWeight: '800' }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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

          {/* Export Button */}
          <View style={{ position: 'relative' }}>
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
              <View style={[styles.dropdownMenu, { right: 0, top: 44 }]}>
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
      </View>

      {/* ==================== 3. ROW 1: 3 STAT KPI CARDS ==================== */}
      <View style={[styles.kpiRow, !isDesktop && styles.kpiRowWrap]}>
        {/* Card 1: THU NHẬP THỰC NHẬN */}
        <View style={[styles.kpiCard, styles.kpiCardIncome, !isDesktop && styles.kpiCardHalf]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>THU NHẬP THỰC NHẬN</Text>
            <View style={styles.kpiIconBadge}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Rect x="2" y="6" width="20" height="12" rx="2" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="12" cy="12" r="2.5" stroke="#1C1917" strokeWidth="2" />
                <Path d="M6 12h.01M18 12h.01" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </View>
          </View>
          <View style={styles.kpiValueRow}>
            <Text style={styles.kpiMainValue}>{formatMoney(overview.totalIncome)}</Text>
            <Text style={styles.kpiCurrency}>VNĐ</Text>
          </View>
          <View style={styles.kpiFooter}>
            <Text style={styles.kpiTrendNeutral}>
              ↗ +{overview.incomeFixedPercent}% Cố định mốc ngân sách
            </Text>
          </View>
        </View>

        {/* Card 2: TỔNG CHI TIÊU THÁNG */}
        <View style={[styles.kpiCard, styles.kpiCardExpense, !isDesktop && styles.kpiCardHalf]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TỔNG CHI TIÊU THÁNG</Text>
            <View style={styles.kpiIconBadge}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Rect x="2" y="5" width="20" height="14" rx="2" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Line x1="2" y1="10" x2="22" y2="10" stroke="#1C1917" strokeWidth="2" />
                <Path d="M6 15h4" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </View>
          </View>
          <View style={styles.kpiValueRow}>
            <Text style={styles.kpiMainValue}>{formatMoney(overview.totalExpense)}</Text>
            <Text style={styles.kpiCurrency}>VNĐ</Text>
          </View>
          <View style={styles.kpiFooterSplit}>
            <Text style={styles.kpiSubText}>
              Chiếm {overview.expensePercent}% • TB {formatMoney(overview.dailyAverage)}đ/ngày
            </Text>
            <View style={[styles.safePill, !overview.isSafe && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <Text style={[styles.safePillText, !overview.isSafe && { color: '#DC2626' }]}>
                {overview.isSafe ? 'Mức an toàn' : 'Vượt hạn mức'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card 3: TIỀN TÍCH LŨY CÒN LẠI */}
        <View style={[styles.kpiCard, styles.kpiCardSavings, !isDesktop && styles.kpiCardHalf]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TIỀN TÍCH LŨY CÒN LẠI</Text>
            <View style={styles.kpiIconBadge}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.5-1 2-2.5V11c0-1.5-.5-2-1-2.5.2-.5.5-1.5 0-2.5-.5-1-1-1-1-1z"
                  stroke="#1C1917"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path d="M2 9v1c0 1.1.9 2 2 2h1" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M16 11h.01" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" />
              </Svg>
            </View>
          </View>
          <View style={styles.kpiValueRow}>
            <Text style={[styles.kpiMainValue, { color: '#1C1917' }]}>
              {formatMoney(overview.savings)}
            </Text>
            <Text style={styles.kpiCurrency}>VNĐ</Text>
          </View>
          <View style={styles.kpiFooter}>
            <Text style={[styles.kpiTrendNeutral, overview.savings < 0 && { color: '#DC2626' }]}>
              {overview.savings >= 0
                ? `↑ Vượt chỉ tiêu tiết kiệm +${overview.savingsTargetDiffPercent}%`
                : `! Vượt hạn mức chi tiêu`}
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
                -- Mức TB Ngân sách ({formatMoney(dailyBenchmark)}đ/ngày)
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
            {gridSteps.map((grid, idx) => (
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

            {/* Benchmark line */}
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
                  {/* Outer circle halo for peaks or active points */}
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

            {/* Dynamic Annotations from real spending points */}
            {(() => {
              const peakPt = points.find((p) => p.data.isPeak && p.data.amount > 0);
              const otherPt = points.find((p) => !p.data.isPeak && p.data.amount > 0);

              return (
                <>
                  {/* Peak Spending Day Tooltip Pill */}
                  {peakPt && (
                    <G>
                      <Line
                        x1={peakPt.x}
                        y1={peakPt.y - 8}
                        x2={peakPt.x}
                        y2={Math.max(16, peakPt.y - 24)}
                        stroke="#047857"
                        strokeWidth="1.6"
                      />
                      <Rect
                        x={Math.max(padL, Math.min(chartW - padR - 190, peakPt.x - 95))}
                        y={Math.max(6, peakPt.y - 50)}
                        width="190"
                        height="26"
                        rx="6"
                        fill="#064E3B"
                      />
                      <SvgText
                        x={Math.max(padL, Math.min(chartW - padR - 190, peakPt.x - 95)) + 95}
                        y={Math.max(6, peakPt.y - 50) + 17}
                        fill="#FFFFFF"
                        fontSize="11"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {peakPt.data.highlightTitle || `🏷️ Đỉnh chi: Ngày ${peakPt.data.day} (${formatMoney(peakPt.data.amount)}đ)`}
                      </SvgText>
                    </G>
                  )}

                  {/* Secondary Spending Day Tooltip Pill */}
                  {otherPt && (
                    <G>
                      <Line
                        x1={otherPt.x}
                        y1={otherPt.y - 8}
                        x2={otherPt.x}
                        y2={Math.max(16, otherPt.y - 24)}
                        stroke="#334155"
                        strokeWidth="1.5"
                      />
                      <Rect
                        x={Math.max(padL, Math.min(chartW - padR - 190, otherPt.x - 95))}
                        y={Math.max(6, otherPt.y - 50)}
                        width="190"
                        height="26"
                        rx="6"
                        fill="#1E293B"
                      />
                      <SvgText
                        x={Math.max(padL, Math.min(chartW - padR - 190, otherPt.x - 95)) + 95}
                        y={Math.max(6, otherPt.y - 50) + 17}
                        fill="#FFFFFF"
                        fontSize="10.5"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {otherPt.data.highlightTitle || `📅 Ngày ${otherPt.data.day}: ${formatMoney(otherPt.data.amount)}đ`}
                      </SvgText>
                    </G>
                  )}
                </>
              );
            })()}

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
                {categories.length === 0 ? (
                  <Circle
                    cx="85"
                    cy="85"
                    r={donutR}
                    fill="transparent"
                    stroke="#E2E8F0"
                    strokeWidth="22"
                  />
                ) : (
                  categories.map((cat, idx) => {
                    const dash = (cat.percent / 100) * donutCircum;
                    const offset = categories
                      .slice(0, idx)
                      .reduce((acc, c) => acc + (c.percent / 100) * donutCircum, 0);
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
                  })
                )}
              </G>
            </Svg>

            {/* Center Label */}
            <View style={styles.donutHoleLabel}>
              <Text style={styles.donutHoleSub}>
                {totalExpense > 0 ? 'Cao nhất' : 'Trạng thái'}
              </Text>
              <Text style={styles.donutHolePercent}>
                {topCategory ? `${topCategory.percent}%` : '0%'}
              </Text>
              <Text style={styles.donutHoleCat} numberOfLines={1}>
                {topCategory ? topCategory.name : (totalExpense === 0 ? 'Chưa chi' : 'Tổng hợp')}
              </Text>
            </View>
          </View>

          {/* Category breakdown items list */}
          <View style={styles.catLegendList}>
            {categories.length === 0 ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
                  Chưa có dữ liệu danh mục trong Tháng {selectedMonth}
                </Text>
              </View>
            ) : (
              categories.map((cat) => (
                <View key={cat.id} style={styles.catLegendItem}>
                  <View style={styles.catLegendLeft}>
                    <View style={[styles.catColorCircle, { backgroundColor: cat.color }]} />
                    <Text style={styles.catNameText}>{cat.name}</Text>
                  </View>
                  <Text style={styles.catAmountText}>
                    {formatMoney(cat.amount)}đ ({cat.percent}%)
                  </Text>
                </View>
              ))
            )}
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
            {(() => {
              const displayedMonths = compRange === '3m' ? comparison.months.slice(-3) : comparison.months;
              const maxVal = Math.max(
                budgetLimit,
                ...displayedMonths.map((m) => Math.max(m.income || 0, m.expense || 0, m.amount || 0)),
                1000000
              );
              const maxBarHeight = 120;

              return displayedMonths.map((m, idx) => {
                const expVal = m.expense ?? m.amount ?? 0;
                const incVal = m.income || budgetLimit;
                const hExp = expVal > 0 ? Math.max(6, (expVal / maxVal) * maxBarHeight) : 4;
                const hInc = Math.max(6, (incVal / maxVal) * maxBarHeight);

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
              });
            })()}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
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
    backgroundColor: '#ECE7DD',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#DDD6CA',
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
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
    backgroundColor: '#ECE7DD',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DDD6CA',
  },
  datePickerIcon: {
    fontSize: 13,
  },
  datePickerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  datePickerChevron: {
    fontSize: 10,
    color: '#64748B',
  },
  monthPickerDropdown: {
    position: 'absolute',
    top: 42,
    right: 0,
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#DDD6CA',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
    zIndex: 999,
  },
  monthPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
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
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#ECE7DD',
    borderWidth: 1.5,
    borderColor: '#DDD6CA',
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
    backgroundColor: '#ECE7DD',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#DDD6CA',
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    justifyContent: 'space-between',
  },
  kpiCardIncome: {
    backgroundColor: '#BEE3C2',
    borderColor: '#A8DAB0',
  },
  kpiCardExpense: {
    backgroundColor: '#F6D35F',
    borderColor: '#E5C24D',
  },
  kpiCardSavings: {
    backgroundColor: '#B7D9F2',
    borderColor: '#A1C8E6',
  },
  kpiCardHalf: {
    flexBasis: '48%',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#57534E',
    letterSpacing: 0.6,
  },
  kpiIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  kpiEmoji: {
    fontSize: 18,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 10,
  },
  kpiValueRowSplit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kpiMainValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.5,
  },
  kpiCurrency: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
    marginLeft: 4,
  },
  kpiTxRatio: {
    fontSize: 12,
    fontWeight: '700',
    color: '#44403C',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#D7CFBF',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  kpiTrendNeutral: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1917',
  },
  kpiSubText: {
    fontSize: 12,
    color: '#57534E',
    fontWeight: '600',
  },
  safePill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  safePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },

  // ==================== 4. ROW 2: XU HƯỚNG CHI TIÊU HÀNG NGÀY ====================
  chartCard: {
    backgroundColor: '#ECE7DD',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#DDD6CA',
    marginBottom: 24,
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
  },
  cardSubHeading: {
    fontSize: 12.5,
    color: '#78716C',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2DBD0',
    marginTop: 6,
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
    backgroundColor: '#ECE7DD',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#DDD6CA',
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
  },
  tripletSub: {
    fontSize: 12,
    color: '#78716C',
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
    backgroundColor: '#FDFBF7',
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 1,
    borderColor: '#DDD6CA',
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  donutHoleSub: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '600',
  },
  donutHolePercent: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1917',
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
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DBD0',
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
    color: '#292524',
  },
  catAmountText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1C1917',
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
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: '#DDD6CA',
  },
  miniToggleBtnActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  miniToggleBtnGreen: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  miniToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#57534E',
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
    color: '#57534E',
  },
  barMonthLabelActive: {
    color: '#047857',
    fontWeight: '800',
  },
  insightBox: {
    backgroundColor: '#FDFBF7',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD6CA',
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
    color: '#047857',
    fontWeight: '900',
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  insightDesc: {
    fontSize: 11.5,
    color: '#44403C',
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
    color: '#292524',
  },
  emotionPercentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E0D8CB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  emotionDescText: {
    fontSize: 11,
    color: '#78716C',
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
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
    fontWeight: '600',
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
  momentsEmptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentsEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textAlign: 'center',
  },
  momentsEmptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 540,
    lineHeight: 19,
    marginBottom: 16,
  },
  momentsEmptyBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  momentsEmptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
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
    backgroundColor: '#F5F0E8',
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
