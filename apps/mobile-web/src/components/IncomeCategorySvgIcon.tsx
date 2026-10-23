import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polyline, G } from 'react-native-svg';

export interface IncomeCategoryMeta {
  name: string;
  labelVi: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

export const INCOME_CATEGORIES_LIST: IncomeCategoryMeta[] = [
  {
    name: 'Lương',
    labelVi: 'Lương',
    bgColor: '#FEF3C7',
    textColor: '#854D0E',
    accentColor: '#B45309',
  },
  {
    name: 'Thưởng/KPI',
    labelVi: 'Thưởng / KPI',
    bgColor: '#FEE2E2',
    textColor: '#991B1B',
    accentColor: '#DC2626',
  },
  {
    name: 'Freelance/Ngoài giờ',
    labelVi: 'Freelance / Ngoài giờ',
    bgColor: '#E0F2FE',
    textColor: '#075985',
    accentColor: '#0284C7',
  },
  {
    name: 'Đầu tư',
    labelVi: 'Đầu tư',
    bgColor: '#D1FAE5',
    textColor: '#065F46',
    accentColor: '#059669',
  },
  {
    name: 'Kinh doanh/Bán hàng',
    labelVi: 'Kinh doanh / Bán hàng',
    bgColor: '#FFEDD5',
    textColor: '#9A3412',
    accentColor: '#EA580C',
  },
  {
    name: 'Được tặng/Lì xì',
    labelVi: 'Được tặng / Lì xì',
    bgColor: '#FCE7F3',
    textColor: '#9D174D',
    accentColor: '#DB2777',
  },
  {
    name: 'Khoản thu khác',
    labelVi: 'Khoản thu khác',
    bgColor: '#EDE9FE',
    textColor: '#5B21B6',
    accentColor: '#7C3AED',
  },
];

export const PRESET_INCOME_TITLES: string[] = [
  'Lương chính',
  'Thưởng KPI',
  'Việc làm thêm',
  'Tiền tăng ca',
  'Dự án ngoài',
  'Tiền lì xì/Quà biếu',
  'Thanh lý đồ cũ',
];

interface IncomeCategorySvgIconProps {
  category: string;
  size?: number;
  color?: string;
}

export const IncomeCategorySvgIcon: React.FC<IncomeCategorySvgIconProps> = ({
  category,
  size = 22,
  color,
}) => {
  switch (category) {
    case 'Lương':
      // Cặp da công sở / Briefcase (biểu tượng lương chính)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="2"
            y="7"
            width="20"
            height="14"
            rx="3"
            stroke={color || '#B45309'}
            strokeWidth="1.8"
            fill={color ? 'none' : '#FEF3C7'}
          />
          <Path
            d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7"
            stroke={color || '#B45309'}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Line
            x1="2"
            y1="12"
            x2="22"
            y2="12"
            stroke={color || '#B45309'}
            strokeWidth="1.6"
            strokeDasharray="2 2"
          />
          <Rect
            x="10.5"
            y="10.5"
            width="3"
            height="3"
            rx="0.5"
            fill={color || '#B45309'}
          />
        </Svg>
      );

    case 'Thưởng/KPI':
      // Hộp quà thắt nơ thưởng / Gift box
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3"
            y="8"
            width="18"
            height="13"
            rx="2"
            stroke={color || '#DC2626'}
            strokeWidth="1.8"
            fill={color ? 'none' : '#FEE2E2'}
          />
          <Path
            d="M2 8H22"
            stroke={color || '#DC2626'}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Path
            d="M12 8V21"
            stroke={color || '#DC2626'}
            strokeWidth="1.8"
          />
          <Path
            d="M12 8C10.5 8 7.5 4.5 9.5 3C11 1.8 12 5 12 8Z"
            stroke={color || '#DC2626'}
            strokeWidth="1.6"
            fill={color ? 'none' : '#F87171'}
          />
          <Path
            d="M12 8C13.5 8 16.5 4.5 14.5 3C13 1.8 12 5 12 8Z"
            stroke={color || '#DC2626'}
            strokeWidth="1.6"
            fill={color ? 'none' : '#F87171'}
          />
        </Svg>
      );

    case 'Freelance/Ngoài giờ':
      // Laptop làm việc ngoài giờ
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="4"
            y="4"
            width="16"
            height="12"
            rx="2"
            stroke={color || '#0284C7'}
            strokeWidth="1.8"
            fill={color ? 'none' : '#E0F2FE'}
          />
          <Path
            d="M2 19C2 17.8954 2.89543 17 4 17H20C21.1046 17 22 17.8954 22 19C22 19.5523 21.5523 20 21 20H3C2.44772 20 2 19.5523 2 19Z"
            stroke={color || '#0284C7'}
            strokeWidth="1.8"
            fill={color ? 'none' : '#BAE6FD'}
          />
          <Line
            x1="10"
            y1="18.5"
            x2="14"
            y2="18.5"
            stroke={color || '#0284C7'}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'Đầu tư':
      // Biểu đồ tăng trưởng tài chính / Trending up chart
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 20H21"
            stroke={color || '#059669'}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Path
            d="M3 15L9 9L14 14L21 6"
            stroke={color || '#059669'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="16,6 21,6 21,11"
            stroke={color || '#059669'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="9" cy="9" r="1.5" fill={color || '#059669'} />
          <Circle cx="14" cy="14" r="1.5" fill={color || '#059669'} />
        </Svg>
      );

    case 'Kinh doanh/Bán hàng':
      // Cửa hàng buôn bán / Shop storefront
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9L4.5 4H19.5L21 9V10.5C21 11.88 19.88 13 18.5 13C17.12 13 16 11.88 16 10.5C16 11.88 14.88 13 13.5 13C12.12 13 11 11.88 11 10.5C11 11.88 9.88 13 8.5 13C7.12 13 6 11.88 6 10.5C6 11.88 4.88 13 3.5 13C2.12 13 1 11.88 1 10.5V9H3Z"
            stroke={color || '#EA580C'}
            strokeWidth="1.7"
            strokeLinejoin="round"
            fill={color ? 'none' : '#FFEDD5'}
          />
          <Path
            d="M4 13V20H20V13"
            stroke={color || '#EA580C'}
            strokeWidth="1.8"
          />
          <Rect
            x="9"
            y="14"
            width="6"
            height="6"
            stroke={color || '#EA580C'}
            strokeWidth="1.6"
            fill={color ? 'none' : '#FED7AA'}
          />
        </Svg>
      );

    case 'Được tặng/Lì xì':
      // Phong bao lì xì may mắn / Red envelope
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="5"
            y="3"
            width="14"
            height="18"
            rx="3"
            stroke={color || '#DB2777'}
            strokeWidth="1.8"
            fill={color ? 'none' : '#FCE7F3'}
          />
          <Path
            d="M5 6L12 11L19 6"
            stroke={color || '#DB2777'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle
            cx="12"
            cy="13"
            r="2.5"
            stroke={color || '#DB2777'}
            strokeWidth="1.6"
            fill={color ? 'none' : '#FBCFE8'}
          />
        </Svg>
      );

    case 'Khoản thu khác':
    default:
      // Đồng tiền xu may mắn / Coins
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle
            cx="12"
            cy="12"
            r="9"
            stroke={color || '#7C3AED'}
            strokeWidth="1.8"
            fill={color ? 'none' : '#EDE9FE'}
          />
          <Path
            d="M12 7V17M14.5 9.5C14.5 8.4 13.4 7.5 12 7.5C10.6 7.5 9.5 8.4 9.5 9.5C9.5 10.6 10.6 11.5 12 11.5C13.4 11.5 14.5 12.4 14.5 13.5C14.5 14.6 13.4 15.5 12 15.5C10.6 15.5 9.5 14.6 9.5 13.5"
            stroke={color || '#7C3AED'}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </Svg>
      );
  }
};
