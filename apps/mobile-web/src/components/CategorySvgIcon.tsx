import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polyline, G } from 'react-native-svg';

export type CategoryKey =
  | 'Cafe'
  | 'Ăn uống'
  | 'Di chuyển'
  | 'Xăng dầu'
  | 'Du lịch'
  | 'Mua sắm'
  | 'Giải trí'
  | 'Làm đẹp'
  | 'Sức khỏe'
  | 'Học tập'
  | 'Điện nước'
  | 'Internet'
  | 'Quà tặng'
  | 'Hóa đơn'
  | 'Khác'
  | 'Lương'
  | 'Tiết kiệm';

interface CategorySvgIconProps {
  name: string;
  size?: number;
  color?: string;
}

export const CategorySvgIcon: React.FC<CategorySvgIconProps> = ({
  name,
  size = 18,
  color = '#1E293B',
}) => {
  switch (name) {
    case 'Học tập':
      // Mũ cử nhân tốt nghiệp (Mortarboard / Graduation cap)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M5 13.18V17.5C5 19.43 8.13 21 12 21C15.87 21 19 19.43 19 17.5V13.18"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'Internet':
      // Sóng wifi
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M1.42 9C4.33 6.09 8.28 4.5 12 4.5C15.72 4.5 19.67 6.09 22.58 9"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Path
            d="M5 12.5C7.03 10.47 9.48 9.5 12 9.5C14.52 9.5 16.97 10.47 19 12.5"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Path
            d="M8.5 16C9.52 14.98 10.74 14.5 12 14.5C13.26 14.5 14.48 14.98 15.5 16"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Circle cx="12" cy="19.5" r="1.2" fill={color} />
        </Svg>
      );

    case 'Khác':
      // Tài liệu / Hóa đơn có răng cưa nhỏ
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 3V21L7 19L10 21L13 19L16 21L19 19L22 21V3H4Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <Line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="8" y1="16" x2="13" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      );

    case 'Làm đẹp':
      // Ngôi sao lấp lánh (Sparkle / Beauty)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <Circle cx="19" cy="5" r="1.5" fill={color} />
          <Circle cx="5" cy="19" r="1.2" fill={color} />
        </Svg>
      );

    case 'Mua sắm':
      // Túi mua sắm (Shopping bag)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 8V6C6 3.79 7.79 2 10 2H14C16.21 2 18 3.79 18 6V8"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Path
            d="M4 8H20L19 22H5L4 8Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'Quà tặng':
      // Hộp quà nơ (Gift box)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="9" width="18" height="4" rx="1" stroke={color} strokeWidth="1.8" />
          <Path d="M5 13V21H19V13" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <Line x1="12" y1="9" x2="12" y2="21" stroke={color} strokeWidth="1.8" />
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

    case 'Sức khỏe':
      // Trái tim với nhịp tim (Heartbeat)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M19.5 12.572L12 20L4.5 12.572C3.5 11.5 3 10.1 3 8.6C3 5.5 5.5 3 8.5 3C10 3 11.3 3.6 12 4.7C12.7 3.6 14 3 15.5 3C18.5 3 21 5.5 21 8.6C21 10.1 20.5 11.5 19.5 12.572Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points="7 12 10 12 11.5 9 13.5 15 15 12 17 12"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'Xăng dầu':
      // Cây xăng / Vòi bơm (Gas pump)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="3" width="10" height="18" rx="2" stroke={color} strokeWidth="1.8" />
          <Rect x="6" y="6" width="6" height="4" rx="1" fill={color} />
          <Path
            d="M14 9H17C18.1 9 19 9.9 19 11V16C19 16.5 18.5 17 18 17C17.5 17 17 16.5 17 16V13.5"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="17" y1="13.5" x2="19" y2="11.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      );

    case 'Ăn uống':
      // Nĩa và dao / muỗng (Fork & Knife)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M18 3V21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M18 3C16.5 3 15 5 15 8V11H18" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <Path d="M6 3V9C6 10.66 7.34 12 9 12V21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M6 3V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M12 3V9C12 10.66 10.66 12 9 12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M9 3V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      );

    case 'Điện nước':
      // Phích cắm điện (Electrical plug)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M8 3V7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M16 3V7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Rect x="5" y="7" width="14" height="7" rx="2" stroke={color} strokeWidth="1.8" />
          <Path d="M12 14V21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      );

    case 'Cafe':
      // Ly cà phê bốc khói (Coffee cup)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 8H17V15C17 17.21 15.21 19 13 19H7C4.79 19 3 17.21 3 15V8Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <Path
            d="M17 10H19C20.1 10 21 10.9 21 12C21 13.1 20.1 14 19 14H17"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <Line x1="2" y1="21" x2="18" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M6 3V5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <Path d="M10 3V5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <Path d="M14 3V5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </Svg>
      );

    case 'Di chuyển':
      // Xe hơi (Car)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 11L7 6H17L19 11M5 11H3V17H5M5 11H19M19 11H21V17H19M5 17H19"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="7.5" cy="16.5" r="1.8" stroke={color} strokeWidth="1.6" />
          <Circle cx="16.5" cy="16.5" r="1.8" stroke={color} strokeWidth="1.6" />
        </Svg>
      );

    case 'Du lịch':
      // Máy bay (Airplane)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"
            fill={color}
          />
        </Svg>
      );

    case 'Giải trí':
      // Bảng quay phim (Film clapperboard)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="8" width="18" height="13" rx="2" stroke={color} strokeWidth="1.8" />
          <Path d="M3 8L6.5 3H20.5L17 8H3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <Line x1="7" y1="8" x2="9.5" y2="3" stroke={color} strokeWidth="1.6" />
          <Line x1="12" y1="8" x2="14.5" y2="3" stroke={color} strokeWidth="1.6" />
        </Svg>
      );

    case 'Hóa đơn':
      // Hóa đơn (Bill / Receipt)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 2V22L7 20L10 22L13 20L16 22L19 20L22 22V2H4Z"
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <Line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="8" y1="11" x2="16" y2="11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="8" y1="15" x2="13" y2="15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      );

    case 'Lương':
      // Tòa nhà ngân hàng (Bank / Building)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 9L12 3L21 9V10H3V9Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <Line x1="2" y1="21" x2="22" y2="21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Rect x="4" y="10" width="16" height="2" fill={color} />
          <Line x1="6" y1="12" x2="6" y2="19" stroke={color} strokeWidth="1.8" />
          <Line x1="10" y1="12" x2="10" y2="19" stroke={color} strokeWidth="1.8" />
          <Line x1="14" y1="12" x2="14" y2="19" stroke={color} strokeWidth="1.8" />
          <Line x1="18" y1="12" x2="18" y2="19" stroke={color} strokeWidth="1.8" />
          <Rect x="3" y="19" width="18" height="2" fill={color} />
        </Svg>
      );

    case 'Tiết kiệm':
      // Heo đất tiết kiệm (Piggy bank)
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M19 12C19 8.13 15.87 5 12 5C10.5 5 9.1 5.48 7.94 6.3L5 4V8.5M19 12C19.5 12 21 12.5 21 14C21 15.5 19.5 16 19 16M19 12V16C19 18.21 17.21 20 15 20H8C6.34 20 4.9 18.99 4.3 17.5M19 16H16M7 20V22M15 20V22M4.3 17.5C4.1 17.03 4 16.53 4 16C3.5 16 2 15.5 2 14C2 12.5 3.5 12 4 12C4 10.74 4.39 9.57 5.06 8.6M4.3 17.5C4.78 14.8 5.76 11.2 7.94 6.3"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="10" y1="5" x2="14" y2="5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <Circle cx="8" cy="11" r="1.2" fill={color} />
        </Svg>
      );

    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
          <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <Circle cx="12" cy="16" r="1" fill={color} />
        </Svg>
      );
  }
};
