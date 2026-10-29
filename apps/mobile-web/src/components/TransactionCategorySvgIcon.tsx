import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';

export interface TransactionCategorySvgIconProps {
  category?: string;
  categoryIcon?: string;
  type?: 'expense' | 'income';
  title?: string;
  size?: number;
  color?: string;
}

export function resolveTransactionIconKey(params: {
  category?: string;
  categoryIcon?: string;
  type?: 'expense' | 'income';
  title?: string;
}): string {
  const cat = (params.category || '').toLowerCase().trim();
  const title = (params.title || '').toLowerCase().trim();
  const icon = (params.categoryIcon || '').trim();
  const isIncome = params.type === 'income' || title.includes('+') || cat.includes('thu');

  // 1. Phân giải nhanh qua biểu tượng emoji gốc nếu có
  if (icon === '🧋' || cat.includes('trà sữa') || cat.includes('milk tea')) return 'milktea';
  if (icon === '🥪' || cat.includes('ăn sáng') || cat.includes('breakfast')) return 'breakfast';
  if (icon === '🍱' || cat.includes('ăn trưa') || cat.includes('lunch')) return 'lunch';
  if (icon === '🍲' || cat.includes('ăn tối') || cat.includes('dinner')) return 'dinner';
  if (icon === '🛵' || icon === '⛽' || cat.includes('đổ xăng') || cat.includes('xăng') || cat.includes('fuel')) return 'gas';
  if (icon === '📦' || cat.includes('khác') || cat.includes('other')) return 'box';
  if (icon === '☕' || icon === '🍹' || icon === '🥤') return 'coffee';
  if (icon === '🍜' || icon === '🍚' || icon === '🍕' || icon === '🍔') return 'food';
  if (icon === '🛒') return 'market';
  if (icon === '🛍️' || icon === '🛍') return 'shopping';
  if (icon === '🚗' || icon === '🚕' || icon === '🚌') return 'transport';
  if (icon === '🧾' || icon === '💰' || icon === '⚡') return 'bills';
  if (icon === '🏠' || icon === '🏡') return 'housing';
  if (icon === '🎬' || icon === '🎮' || icon === '🍿') return 'entertainment';
  if (icon === '💊' || icon === '🩺' || icon === '🏥') return 'health';
  if (icon === '💅' || icon === '💄' || icon === '✨') return 'beauty';
  if (icon === '📚' || icon === '🎓' || icon === '📖') return 'education';
  if (icon === '🎁' || icon === '🧧') return 'gift';
  if (icon === '✈️' || icon === '🛫') return 'travel';
  if (icon === '📶' || icon === '🌐') return 'wifi';
  if (icon === '💻' || icon === '🖥️') return 'freelance';

  // 2. Nhận diện các khoản thu nhập (Income Categories)
  if (
    cat.includes('freelance') ||
    cat.includes('ngoài giờ') ||
    title.includes('tăng ca') ||
    title.includes('freelance') ||
    title.includes('dự án ngoài') ||
    title.includes('overtime') ||
    title.includes('làm thêm')
  ) {
    return 'freelance';
  }
  if (cat.includes('lương') || title.includes('lương') || title.includes('salary')) {
    return 'salary';
  }
  if (cat.includes('thưởng') || cat.includes('kpi') || title.includes('thưởng') || title.includes('bonus')) {
    return 'bonus';
  }
  if (cat.includes('đầu tư') || title.includes('đầu tư') || title.includes('cổ phiếu') || title.includes('lãi')) {
    return 'invest';
  }
  if (cat.includes('kinh doanh') || cat.includes('bán hàng') || title.includes('kinh doanh') || title.includes('bán đồ')) {
    return 'shopping';
  }
  if (cat.includes('lì xì') || cat.includes('tặng') || title.includes('lì xì') || title.includes('quà')) {
    return 'gift';
  }
  if (cat.includes('tiết kiệm') || title.includes('tiết kiệm')) {
    return 'savings';
  }

  // 3. Nhận diện các khoản chi tiêu (Expense Categories)
  if (cat.includes('trà sữa') || cat.includes('milk tea') || title.includes('trà sữa') || title.includes('trsua') || title.includes('boba')) {
    return 'milktea';
  }
  if (cat.includes('ăn sáng') || cat.includes('breakfast') || title.includes('ăn sáng') || title.includes('sandwich')) {
    return 'breakfast';
  }
  if (cat.includes('ăn trưa') || cat.includes('lunch') || title.includes('ăn trưa')) {
    return 'lunch';
  }
  if (cat.includes('ăn tối') || cat.includes('dinner') || title.includes('ăn tối')) {
    return 'dinner';
  }
  if (cat.includes('đổ xăng') || cat.includes('xăng') || cat.includes('fuel') || title.includes('xăng')) {
    return 'gas';
  }
  if (cat.includes('khác') || cat.includes('other')) {
    return 'box';
  }
  if (
    cat.includes('cà phê') ||
    cat.includes('cafe') ||
    cat.includes('nước') ||
    cat.includes('trà') ||
    cat.includes('coffee') ||
    title.includes('nước') ||
    title.includes('cà phê') ||
    title.includes('cafe') ||
    title.includes('trà')
  ) {
    return 'coffee';
  }
  if (
    cat.includes('ăn') ||
    cat.includes('uống') ||
    cat.includes('ẩm thực') ||
    cat.includes('food') ||
    title.includes('ăn') ||
    title.includes('cơm') ||
    title.includes('phở') ||
    title.includes('bún') ||
    title.includes('bánh') ||
    title.includes('mì')
  ) {
    return 'food';
  }
  if (
    cat.includes('chợ') ||
    cat.includes('siêu thị') ||
    cat.includes('market') ||
    title.includes('chợ') ||
    title.includes('siêu thị')
  ) {
    return 'market';
  }
  if (
    cat.includes('mua sắm') ||
    cat.includes('shopping') ||
    title.includes('mua sắm') ||
    title.includes('quần áo')
  ) {
    return 'shopping';
  }
  if (
    cat.includes('di chuyển') ||
    cat.includes('xăng') ||
    cat.includes('transport') ||
    title.includes('grab') ||
    title.includes('xăng') ||
    title.includes('xe')
  ) {
    return 'transport';
  }
  if (
    cat.includes('wifi') ||
    cat.includes('internet') ||
    cat.includes('mạng') ||
    title.includes('wifi') ||
    title.includes('internet') ||
    title.includes('mạng')
  ) {
    return 'wifi';
  }
  if (
    cat.includes('hóa đơn') ||
    cat.includes('điện') ||
    cat.includes('bills') ||
    cat.includes('bill') ||
    title.includes('điện') ||
    title.includes('hóa đơn') ||
    title.includes('tiền mạng') ||
    title.includes('tiền điện') ||
    title.includes('tiền nước')
  ) {
    return 'bills';
  }
  if (
    cat.includes('nhà') ||
    cat.includes('housing') ||
    title.includes('thuê nhà') ||
    title.includes('tiền nhà') ||
    title.includes('tiền phòng')
  ) {
    return 'housing';
  }
  if (
    cat.includes('giải trí') ||
    cat.includes('entertainment') ||
    title.includes('netflix') ||
    title.includes('xem phim') ||
    title.includes('game')
  ) {
    return 'entertainment';
  }
  if (
    cat.includes('sức khỏe') ||
    cat.includes('y tế') ||
    cat.includes('thuốc') ||
    title.includes('thuốc') ||
    title.includes('bệnh')
  ) {
    return 'health';
  }
  if (
    cat.includes('làm đẹp') ||
    cat.includes('beauty') ||
    title.includes('spa') ||
    title.includes('cắt tóc')
  ) {
    return 'beauty';
  }
  if (
    cat.includes('học') ||
    cat.includes('education') ||
    title.includes('học phí') ||
    title.includes('sách')
  ) {
    return 'education';
  }
  if (
    cat.includes('du lịch') ||
    cat.includes('travel') ||
    title.includes('du lịch') ||
    title.includes('khách sạn') ||
    title.includes('vé máy bay')
  ) {
    return 'travel';
  }

  if (isIncome) {
    return 'incomeGeneral';
  }

  return 'other';
}

export const TransactionCategorySvgIcon: React.FC<TransactionCategorySvgIconProps> = ({
  category,
  categoryIcon,
  type,
  title,
  size = 20,
  color = '#92400E',
}) => {
  const iconKey = resolveTransactionIconKey({ category, categoryIcon, type, title });

  switch (iconKey) {
    case 'milktea':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 7l1.5 13a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2L18 7H6z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <Path d="M5 7h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M14 2l-2 5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="9.5" cy="18" r="1.2" fill={color} />
          <Circle cx="12.5" cy="18.5" r="1.2" fill={color} />
          <Circle cx="14.5" cy="17" r="1.2" fill={color} />
          <Circle cx="11" cy="15.5" r="1.2" fill={color} />
        </Svg>
      );

    case 'breakfast':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 11l9-8 9 8v2H3v-2z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <Path d="M4 14h16M3 17h18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path
            d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
            stroke={color}
            strokeWidth="1.8"
          />
        </Svg>
      );

    case 'lunch':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.9" />
          <Line x1="11" y1="5" x2="11" y2="19" stroke={color} strokeWidth="1.8" />
          <Line x1="11" y1="12" x2="21" y2="12" stroke={color} strokeWidth="1.8" />
          <Circle cx="7" cy="12" r="1.8" fill={color} />
        </Svg>
      );

    case 'dinner':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 11h18c0 5-4 9-9 9s-9-4-9-9z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <Path
            d="M8 7c1-1 1-2 1-3M12 7c1-1 1-2 1-3M16 7c1-1 1-2 1-3"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'gas':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="3" width="10" height="18" rx="2" stroke={color} strokeWidth="1.9" />
          <Rect x="6" y="6" width="6" height="4" rx="1" fill={color} />
          <Path
            d="M14 9h3a2 2 0 0 1 2 2v5a1 1 0 0 0 1 1"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <Line x1="17" y1="13" x2="19" y2="11" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        </Svg>
      );

    case 'box':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <Polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke={color} strokeWidth="1.9" strokeLinejoin="round" />
          <Line x1="12" y1="22.08" x2="12" y2="12" stroke={color} strokeWidth="1.9" />
        </Svg>
      );

    case 'coffee':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M17 8h1a4 4 0 0 1 0 8h-1"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="6" y1="2" x2="6" y2="5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <Line x1="10" y1="2" x2="10" y2="5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <Line x1="14" y1="2" x2="14" y2="5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </Svg>
      );

    case 'freelance':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3"
            y="4"
            width="18"
            height="12"
            rx="2"
            stroke={color}
            strokeWidth="1.9"
          />
          <Line x1="2" y1="19" x2="22" y2="19" stroke={color} strokeWidth="2.1" strokeLinecap="round" />
          <Line x1="10" y1="19" x2="14" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <Polyline points="8 9 10 11 8 13" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="12" y1="13" x2="16" y2="13" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </Svg>
      );

    case 'salary':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="2" y="7" width="20" height="14" rx="2.5" stroke={color} strokeWidth="1.9" />
          <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke={color} strokeWidth="1.9" />
          <Circle cx="12" cy="14" r="2" stroke={color} strokeWidth="1.6" />
        </Svg>
      );

    case 'bonus':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M4 3h16v6a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V3z" stroke={color} strokeWidth="1.9" strokeLinejoin="round" />
          <Path d="M12 15v4m-4 2h8" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        </Svg>
      );

    case 'invest':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points="16 7 22 7 22 13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    case 'food':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 11h16a1 1 0 0 1 1 1c0 5-4 8-9 8s-9-3-9-8a1 1 0 0 1 1-1z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M7 8c1-1 1-2 1-3M12 8c1-1 1-2 1-3M17 8c1-1 1-2 1-3"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <Line x1="3" y1="11" x2="21" y2="11" stroke={color} strokeWidth="1.9" />
        </Svg>
      );

    case 'market':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="8" cy="21" r="1.5" fill={color} />
          <Circle cx="19" cy="21" r="1.5" fill={color} />
          <Path
            d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'shopping':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth="1.9" />
          <Path
            d="M16 10a4 4 0 0 1-8 0"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'transport':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.9" />
          <Circle cx="18" cy="18" r="3" stroke={color} strokeWidth="1.9" />
          <Path
            d="M6 18h12M15 6h3l-3 6h-6l-2-4h-3M9 12l2 6"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'wifi':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M1.42 9C4.33 6.09 8.28 4.5 12 4.5C15.72 4.5 19.67 6.09 22.58 9"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <Path
            d="M5 12.5C7.03 10.47 9.48 9.5 12 9.5C14.52 9.5 16.97 10.47 19 12.5"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <Path
            d="M8.5 16C9.52 14.98 10.74 14.5 12 14.5C13.26 14.5 14.48 14.98 15.5 16"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <Circle cx="12" cy="19.5" r="1.3" fill={color} />
        </Svg>
      );

    case 'bills':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
          <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
          <Line x1="8" y1="17" x2="12" y2="17" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        </Svg>
      );

    case 'housing':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );

    case 'entertainment':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="2"
            y="4"
            width="20"
            height="16"
            rx="2.5"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="2" y1="9" x2="22" y2="9" stroke={color} strokeWidth="1.9" />
          <Line x1="8" y1="4" x2="6" y2="9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <Line x1="14" y1="4" x2="12" y2="9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <Line x1="20" y1="4" x2="18" y2="9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </Svg>
      );

    case 'health':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="4"
            stroke={color}
            strokeWidth="1.9"
          />
          <Line x1="12" y1="8" x2="12" y2="16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        </Svg>
      );

    case 'beauty':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <Circle cx="19" cy="5" r="1.5" fill={color} />
          <Circle cx="5" cy="19" r="1.2" fill={color} />
        </Svg>
      );

    case 'education':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M5 13.18V17.5C5 19.43 8.13 21 12 21C15.87 21 19 19.43 19 17.5V13.18"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'gift':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="9" width="18" height="4" rx="1" stroke={color} strokeWidth="1.9" />
          <Path d="M5 13V21H19V13" stroke={color} strokeWidth="1.9" strokeLinejoin="round" />
          <Line x1="12" y1="9" x2="12" y2="21" stroke={color} strokeWidth="1.9" />
          <Path
            d="M12 9C10.5 9 8 7 8 5.5C8 4 9.5 3 10.5 4.5L12 9Z"
            stroke={color}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <Path
            d="M12 9C13.5 9 16 7 16 5.5C16 4 14.5 3 13.5 4.5L12 9Z"
            stroke={color}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'travel':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"
            fill={color}
          />
        </Svg>
      );

    case 'savings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M19 12C19 8.13 15.87 5 12 5C10.5 5 9.1 5.48 7.94 6.3L5 4V8.5M19 12C19.5 12 21 12.5 21 14C21 15.5 19.5 16 19 16M19 12V16C19 18.21 17.21 20 15 20H8C6.34 20 4.9 18.99 4.3 17.5M19 16H16M7 20V22M15 20V22"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="10" y1="5" x2="14" y2="5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Circle cx="8" cy="11" r="1.2" fill={color} />
        </Svg>
      );

    case 'incomeGeneral':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.9" />
          <Path d="M12 7v10M9 12h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'other':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="7" y1="7" x2="7.01" y2="7" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        </Svg>
      );
  }
};
