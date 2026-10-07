/**
 * Tiện ích xử lý thời gian, ngày tháng và tuần theo chuẩn Việt Nam cho Monett Mobile
 */

export interface WeekDayInfo {
  day: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  dayNameFull: string;
  dayNum: number;
  dateStr: string; // "06/10"
  fullDateStr: string; // "2026-10-06"
  isToday: boolean;
  isSunday: boolean;
  dateObj: Date;
}

export interface MonthGridCell {
  dayNum: number;
  month: number;
  year: number;
  fullDateStr: string; // "YYYY-MM-DD"
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeekName: string;
  shortDay: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
}

/**
 * Lấy thứ viết tắt chuẩn tiếng Việt (T2, T3, ..., CN)
 */
export const getDayOfWeekShort = (date: Date): 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN' => {
  const d = date.getDay();
  switch (d) {
    case 1:
      return 'T2';
    case 2:
      return 'T3';
    case 3:
      return 'T4';
    case 4:
      return 'T5';
    case 5:
      return 'T6';
    case 6:
      return 'T7';
    case 0:
    default:
      return 'CN';
  }
};

/**
 * Lấy tên thứ đầy đủ bằng tiếng Việt (Thứ Hai, Thứ Ba, ..., Chủ Nhật)
 */
export const getDayOfWeekName = (date: Date): string => {
  const d = date.getDay();
  switch (d) {
    case 1:
      return 'Thứ Hai';
    case 2:
      return 'Thứ Ba';
    case 3:
      return 'Thứ Tư';
    case 4:
      return 'Thứ Năm';
    case 5:
      return 'Thứ Sáu';
    case 6:
      return 'Thứ Bảy';
    case 0:
    default:
      return 'Chủ Nhật';
  }
};

/**
 * Kiểm tra 2 Date có cùng ngày tháng năm hay không
 */
export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * Định dạng ngày dạng "YYYY-MM-DD"
 */
export const formatYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Lấy 7 ngày của tuần (Thứ Hai -> Chủ Nhật) chứa baseDate
 */
export const getCurrentWeekDays = (baseDate: Date = new Date()): WeekDayInfo[] => {
  const today = new Date();
  const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
  // Khoảng cách ngày lùi về Thứ Hai (Nếu là Chủ nhật -> lùi 6 ngày; nếu Thứ 2 -> lùi 0 ngày)
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const weekDays: WeekDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);

    const isSun = cur.getDay() === 0;
    const isTod = isSameDay(cur, today);
    const dayShort = getDayOfWeekShort(cur);
    const dayName = getDayOfWeekName(cur);

    weekDays.push({
      day: dayShort,
      dayNameFull: dayName,
      dayNum: cur.getDate(),
      dateStr: `${String(cur.getDate()).padStart(2, '0')}/${String(cur.getMonth() + 1).padStart(2, '0')}`,
      fullDateStr: formatYMD(cur),
      isToday: isTod,
      isSunday: isSun,
      dateObj: cur,
    });
  }

  return weekDays;
};

/**
 * Lấy khoảng chuỗi tuần này: "05/10 - 11/10" hoặc "05/10 - 11/10/2026"
 */
export const getCurrentWeekRange = (baseDate: Date = new Date()): string => {
  const days = getCurrentWeekDays(baseDate);
  const start = days[0];
  const end = days[6];
  return `${start.dateStr} - ${end.dateStr}`;
};

/**
 * Sinh ma trận lịch tháng chuẩn (bắt đầu từ Thứ Hai, có ngày đệm tháng trước và tháng sau)
 * @param year Năm (ví dụ: 2026)
 * @param month Tháng 1-indexed (1..12)
 */
export const getMonthCalendarGrid = (
  year: number,
  month: number,
  today: Date = new Date()
): MonthGridCell[] => {
  const cells: MonthGridCell[] = [];

  // Ngày đầu tiên của tháng
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Thứ của ngày mùng 1 (0 là Chủ nhật, 1 là Thứ 2...)
  const firstDayWeekday = firstDayOfMonth.getDay();
  // Số ngày đệm của tháng trước (Lịch bắt đầu từ Thứ Hai)
  const leadingDays = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

  // 1. Các ngày tràn từ tháng trước
  if (leadingDays > 0) {
    const prevMonthDays = new Date(year, month - 1, 0).getDate();
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    for (let i = leadingDays - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const dateObj = new Date(prevYear, prevMonth - 1, dayNum);
      cells.push({
        dayNum,
        month: prevMonth,
        year: prevYear,
        fullDateStr: formatYMD(dateObj),
        isCurrentMonth: false,
        isToday: isSameDay(dateObj, today),
        dayOfWeekName: getDayOfWeekName(dateObj),
        shortDay: getDayOfWeekShort(dateObj),
      });
    }
  }

  // 2. Toàn bộ các ngày trong tháng hiện tại
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    cells.push({
      dayNum: d,
      month,
      year,
      fullDateStr: formatYMD(dateObj),
      isCurrentMonth: true,
      isToday: isSameDay(dateObj, today),
      dayOfWeekName: getDayOfWeekName(dateObj),
      shortDay: getDayOfWeekShort(dateObj),
    });
  }

  // 3. Các ngày đệm của tháng sau để hoàn thiện tròn các tuần (bội số của 7)
  const trailingDays = (7 - (cells.length % 7)) % 7;
  if (trailingDays > 0) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    for (let d = 1; d <= trailingDays; d++) {
      const dateObj = new Date(nextYear, nextMonth - 1, d);
      cells.push({
        dayNum: d,
        month: nextMonth,
        year: nextYear,
        fullDateStr: formatYMD(dateObj),
        isCurrentMonth: false,
        isToday: isSameDay(dateObj, today),
        dayOfWeekName: getDayOfWeekName(dateObj),
        shortDay: getDayOfWeekShort(dateObj),
      });
    }
  }

  return cells;
};

/**
 * Định dạng hiển thị ngày tiếng Việt trực quan: "Thứ Ba, 06/10/2026"
 */
export const formatDisplayDateVi = (date: Date = new Date()): string => {
  const dayName = getDayOfWeekName(date);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${dayName}, ${d}/${m}/${y}`;
};

/**
 * Định dạng giờ phút tiếng Việt: "12:45"
 */
export const formatDisplayTime = (date: Date = new Date()): string => {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
};
