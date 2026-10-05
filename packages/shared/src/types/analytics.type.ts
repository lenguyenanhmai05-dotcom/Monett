// ============================================================
// ANALYTICS & FINANCIAL REPORT TYPES — @monett/shared
// Dùng chung cho Frontend Mobile/Web và Backend NestJS
// ============================================================

export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface IAnalyticsOverview {
  totalIncome: number; // Tổng thu, ví dụ: 22.000.000 VNĐ
  totalExpense: number; // Tổng chi, ví dụ: 14.850.000 VNĐ
  savings: number; // Số tiền tiết kiệm tích lũy còn lại, ví dụ: 7.150.000 VNĐ
  dailyAverage: number; // Mức chi trung bình ngày, ví dụ: 495.000 VNĐ/ngày
  savingsPercent: number; // % Tiết kiệm trên tổng thu nhập (32.5%)
  expensePercent: number; // % Chi tiêu trên tổng thu nhập (67.5%)
  savingsTargetDiffPercent: number; // Ví dụ: +15% so với chỉ tiêu tiết kiệm
  incomeFixedPercent: number; // +100% Cố định mốc ngân sách
  budgetLimit: number; // Hạn mức ngân sách, ví dụ: 22.000.000
  isSafe: boolean; // Trạng thái nằm trong ngưỡng an toàn
  safetyStatus: 'safe' | 'warning' | 'danger';
  streakDays: number; // Chuỗi ngày ghi chép liên tục, ví dụ: 24
  momentsCount: number; // Số giao dịch có ảnh kỷ niệm, ví dụ: 38
  totalTransactions: number; // Tổng số giao dịch, ví dụ: 48
  momentsRatio: number; // Tỷ lệ ảnh khoảnh khắc (82%)
  periodDisplay?: string;
  banner: {
    streakDays: number;
    title: string;
    subtitle: string;
  };
}

export interface IDailySpendingTrend {
  day: string; // "01", "05", "10", "15", "18", "20", "25", "31"
  label: string; // "01 Th10", "05 Th10", ...
  amount: number; // Số tiền chi tiêu thực tế trong ngày (VNĐ)
  benchmark: number; // Mức TB Ngân sách tiêu chuẩn (ví dụ 480.000đ/ngày)
  highlightTitle?: string; // Ví dụ: "Ngày 05: 750k (Tiệc gia đình)"
  isPeak?: boolean; // Điểm đỉnh chi tiêu: "Đỉnh chi: Ngày 18 (1.180k)"
}

export interface ICategoryBreakdown {
  id: string;
  name: string; // "Ăn uống & Cà phê", "Nhà cửa & Tiền phòng", "Mua sắm đồ dùng", "Di chuyển & Học tập"
  amount: number; // 5.643.000đ, 3.861.000đ, 2.673.000đ, 2.673.000đ
  percent: number; // 38%, 26%, 18%, 18%
  color: string; // '#047857', '#6366F1', '#F59E0B', '#94A3B8'
  icon?: string;
  count?: number;
}

export interface IMonthlyComparisonItem {
  monthName: string; // "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10"
  month?: number;
  year?: number;
  amount: number; // Chi tiêu
  expense?: number; // Chi tiêu
  income?: number; // Thu nhập
  savings?: number; // Tiết kiệm
  netCashflow?: number;
  displayAmount: string; // "14.8M"
  displayIncome?: string; // "22.0M"
  isCurrent?: boolean;
  deltaPercent?: number; // -6.6%
}

export interface IMonthlyComparison {
  months: IMonthlyComparisonItem[];
  insight: {
    title: string; // "Xu hướng tích cực"
    description: string; // "Chi tiêu Tháng 10 giảm 1.050.000đ so với Tháng 9 nhờ tiết giảm chi phí mua sắm bốc đồng."
    isPositive: boolean;
  };
}

export interface IEmoMindfulnessItem {
  key: 'happy' | 'essential' | 'impulse';
  title: string; // "Hạnh phúc / Đầu tư cho bản thân", "Bắt buộc / Sinh hoạt thiết yếu", "Bốc đồng / Nuối tiếc (Impulse)"
  percent: number; // 74%, 19%, 7%
  amount: number; // 11000000, 2821500, 1050000
  color: string; // '#10B981', '#64748B', '#EF4444'
  emoji: string; // '😊', '😐', '😡'
  description: string; // "11.000.000đ đóng góp vào niềm vui lâu dài & sức khỏe.", etc.
}

export interface IEmoMindfulness {
  items: IEmoMindfulnessItem[];
  suggestion: string; // "Gợi ý Monett: Bạn cảm thấy hạnh phúc nhất khi chi cho các buổi hẹn cuối tuần và lớp yoga. Tiếp tục duy trì nhé!"
}

export interface IFeaturedMoment {
  id: string;
  badge: string; // "+ Thư giãn", "Đầu tư tri thức", "Healthy Life", "Sống khỏe"
  badgeColor?: string;
  amount: number; // -65000, -340000, -420000, -1180000
  title: string; // "Cà phê sáng làm việc tuần mới", "Bộ sách Tư Duy Tài Chính Tinh Gọn", etc.
  subtitle: string; // "24 Th10 • The Workshop Coffee", "20 Th10 • Nhã Nam Bookstore", etc.
  photoUri: string;
}

export interface IFullAnalyticsReport {
  period: AnalyticsPeriod;
  month: number;
  year: number;
  dateDisplay: string; // "Hôm nay, 24 Tháng 10, 2024"
  overview: IAnalyticsOverview;
  dailyTrend: IDailySpendingTrend[];
  categories: ICategoryBreakdown[];
  comparison: IMonthlyComparison;
  emotions: IEmoMindfulness;
  moments: IFeaturedMoment[];
}
