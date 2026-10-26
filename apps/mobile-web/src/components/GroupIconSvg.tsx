import React from 'react';
import Svg, { Circle, Path, Line, Rect, G } from 'react-native-svg';

export interface GroupIconItem {
  id: string;
  label: string;
  emoji: string;
}

export const GROUP_ICONS_LIST: GroupIconItem[] = [
  { id: 'users', label: 'Bạn bè', emoji: '👥' },
  { id: 'coffee', label: 'Cà phê', emoji: '☕' },
  { id: 'food', label: 'Ăn uống', emoji: '🍜' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'home', label: 'Nhà trọ', emoji: '🏠' },
  { id: 'money', label: 'Quỹ nhóm', emoji: '💰' },
  { id: 'travel', label: 'Du lịch', emoji: '✈️' },
  { id: 'shopping', label: 'Mua sắm', emoji: '🛒' },
  { id: 'cheers', label: 'Giao lưu', emoji: '🍻' },
  { id: 'party', label: 'Sự kiện', emoji: '🎉' },
  { id: 'movie', label: 'Xem phim', emoji: '🎬' },
  { id: 'sports', label: 'Thể thao', emoji: '🚴' },
];

export const normalizeGroupIconId = (name?: string): string => {
  if (!name) return 'users';
  const found = GROUP_ICONS_LIST.find((item) => item.id === name || item.emoji === name);
  return found ? found.id : 'users';
};

interface GroupIconSvgProps {
  name?: string;
  size?: number;
}

export const GroupIconSvg: React.FC<GroupIconSvgProps> = ({ name = 'users', size = 22 }) => {
  const iconId = normalizeGroupIconId(name);

  switch (iconId) {
    case 'users':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Background person */}
          <Circle cx="16.5" cy="7.5" r="3" fill="#A7F3D0" stroke="#059669" strokeWidth="1.5" />
          <Path
            d="M13.5 19v-1.5a3.5 3.5 0 0 1 3.5-3.5h1a3.5 3.5 0 0 1 3.5 3.5V19"
            fill="#A7F3D0"
            stroke="#059669"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Foreground person */}
          <Circle cx="8.5" cy="8" r="3.5" fill="#10B981" stroke="#047857" strokeWidth="1.5" />
          <Path
            d="M3 20v-2a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v2"
            fill="#10B981"
            stroke="#047857"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </Svg>
      );

    case 'coffee':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Steam waves */}
          <Path d="M7 3c0 1.5-1 2-1 3.5s1 2 1 3.5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M11 2c0 1.5-1 2-1 3.5s1 2 1 3.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M15 3c0 1.5-1 2-1 3.5s1 2 1 3.5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
          {/* Cup handle */}
          <Path d="M16 11h2a2.5 2.5 0 0 1 0 5h-2" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
          {/* Cup body */}
          <Path
            d="M4 10h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6z"
            fill="#FEF3C7"
            stroke="#B45309"
            strokeWidth="2"
          />
          {/* Saucer */}
          <Path d="M2 20h16" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'food':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Chopsticks */}
          <Line x1="4" y1="5" x2="20" y2="2" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
          <Line x1="6" y1="7" x2="22" y2="4" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
          {/* Noodles */}
          <Path d="M7 10c1-2 3-2 5 0s3 2 5 0" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          {/* Bowl */}
          <Path
            d="M3 11h18c0 5.5-4 9-9 9s-9-3.5-9-9z"
            fill="#FEE2E2"
            stroke="#EF4444"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Base */}
          <Path d="M9 20h6" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );

    case 'pizza':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Pizza triangle */}
          <Path
            d="M12 21L3 6c6-3 12-3 18 0L12 21z"
            fill="#FEF08A"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Crust */}
          <Path d="M3 6c6-3 12-3 18 0" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
          {/* Pepperoni & toppings */}
          <Circle cx="12" cy="11" r="1.8" fill="#EF4444" />
          <Circle cx="9" cy="15" r="1.4" fill="#EF4444" />
          <Circle cx="15.5" cy="14.5" r="1.4" fill="#EF4444" />
          <Circle cx="10" cy="9" r="1" fill="#10B981" />
          <Circle cx="14" cy="9.5" r="1" fill="#10B981" />
        </Svg>
      );

    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Roof */}
          <Path d="M2.5 11L12 3.5l9.5 7.5" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M17 7.5V4h-2.5v1.5" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" />
          {/* Walls */}
          <Path
            d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"
            fill="#DBEAFE"
            stroke="#2563EB"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Door */}
          <Path d="M10 21v-6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.8" />
          {/* Window */}
          <Circle cx="12" cy="8" r="1.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
        </Svg>
      );

    case 'money':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Money bag neck tie */}
          <Path d="M9 7c0-1.5 1.5-3 3-3s3 1.5 3 3" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
          <Rect x="8.5" y="6.5" width="7" height="2" rx="1" fill="#F59E0B" />
          {/* Bag pouch */}
          <Path
            d="M5.5 10c0-1.5 1.5-2.5 3-2.5h7c1.5 0 3 1 3 2.5 1.5 3.5 1.5 7.5 0 10-1 1.5-2.5 2-4.5 2h-4c-2 0-3.5-.5-4.5-2-1.5-2.5-1.5-6.5 0-10z"
            fill="#ECFDF5"
            stroke="#059669"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Currency emblem */}
          <Circle cx="12" cy="14.5" r="3.2" fill="#FEF08A" stroke="#D97706" strokeWidth="1.5" />
          <Path d="M12 12.5v4M10.8 13.5c.3-.5 1-.8 1.8-.5.8.3.8 1.2 0 1.5s-.8 1.2 0 1.5" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" />
        </Svg>
      );

    case 'travel':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Contrail trail */}
          <Path d="M3 19c3-1 6-1 8-2" stroke="#93C5FD" strokeWidth="1.8" strokeDasharray="2 2" strokeLinecap="round" />
          {/* Jet Plane */}
          <Path
            d="M21 13.5l-7.5-3V3.5a1.5 1.5 0 1 0-3 0v7L3 13.5v2l7.5-2V18L8.5 19.5V21L12 20.2l3.5.8v-1.5l-2-1.5v-4.5l7.5 2v-2z"
            fill="#E0F2FE"
            stroke="#0284C7"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'shopping':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Wheels */}
          <Circle cx="9" cy="20" r="1.8" fill="#4F46E5" />
          <Circle cx="17.5" cy="20" r="1.8" fill="#4F46E5" />
          {/* Basket */}
          <Path
            d="M3 4h3l2.5 10a1.5 1.5 0 0 0 1.5 1.2h8.5a1.5 1.5 0 0 0 1.5-1.1L21.5 7H7"
            fill="#EEF2FF"
            stroke="#4338CA"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Items inside basket */}
          <Path d="M10 7V5a1.5 1.5 0 0 1 3 0v2" stroke="#10B981" strokeWidth="1.5" />
        </Svg>
      );

    case 'cheers':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Left Mug */}
          <Path
            d="M4.5 10h5.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-2.5A1.5 1.5 0 0 1 4.5 17.5V10z"
            fill="#FEF3C7"
            stroke="#D97706"
            strokeWidth="1.8"
          />
          <Path d="M4.5 12h-2a1.5 1.5 0 0 0 0 3h2" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
          {/* Left Foam */}
          <Path d="M4 10c0-1.5 1.5-1.5 2.5-1s1.5 0 2-.8 1.5 0 1.5 1.8" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />

          {/* Right Mug */}
          <Path
            d="M13 10h5.5v7.5a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5V10z"
            fill="#FEF3C7"
            stroke="#D97706"
            strokeWidth="1.8"
          />
          <Path d="M18.5 12h2a1.5 1.5 0 0 1 0 3h-2" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
          {/* Right Foam */}
          <Path d="M12.5 10c0-1.5 1.5-1.5 2.5-1s1.5 0 2-.8 1.5 0 1.5 1.8" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" />

          {/* Clink sparks */}
          <Line x1="11.5" y1="5.5" x2="11.5" y2="7.5" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="9.5" y1="6" x2="10.5" y2="7" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
          <Line x1="13.5" y1="6" x2="12.5" y2="7" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );

    case 'party':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Cone */}
          <Path
            d="M4 20.5l6.5-14 7.5 7.5L4 20.5z"
            fill="#FCE7F3"
            stroke="#DB2777"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path d="M6 16.5l4-2.5" stroke="#F43F5E" strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M9 12.5l4-2.5" stroke="#F43F5E" strokeWidth="1.8" strokeLinecap="round" />
          {/* Confetti & sparks */}
          <Line x1="14" y1="5" x2="16" y2="2" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
          <Line x1="18.5" y1="8" x2="21.5" y2="7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <Line x1="18" y1="13" x2="21" y2="15" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <Circle cx="18" cy="4" r="1.3" fill="#EC4899" />
          <Circle cx="14" cy="10" r="1.3" fill="#3B82F6" />
          <Circle cx="21" cy="11" r="1.3" fill="#F59E0B" />
        </Svg>
      );

    case 'movie':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Main Board */}
          <Rect
            x="3"
            y="9"
            width="18"
            height="11"
            rx="2"
            fill="#EDE9FE"
            stroke="#7C3AED"
            strokeWidth="2"
          />
          {/* Stars on board */}
          <Circle cx="8" cy="14.5" r="1.5" fill="#8B5CF6" />
          <Circle cx="12" cy="14.5" r="1.5" fill="#8B5CF6" />
          <Circle cx="16" cy="14.5" r="1.5" fill="#8B5CF6" />

          {/* Clapper Top */}
          <Path
            d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H3V6z"
            fill="#7C3AED"
            stroke="#6D28D9"
            strokeWidth="1.5"
          />
          {/* Clapper stripes */}
          <Line x1="7" y1="4" x2="5" y2="9" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="11" y1="4" x2="9" y2="9" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="15" y1="4" x2="13" y2="9" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="19" y1="4" x2="17" y2="9" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      );

    case 'sports':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          {/* Wheels */}
          <Circle cx="5.5" cy="16.5" r="3.5" fill="#ECFDF5" stroke="#059669" strokeWidth="1.8" />
          <Circle cx="18.5" cy="16.5" r="3.5" fill="#ECFDF5" stroke="#059669" strokeWidth="1.8" />
          {/* Frame */}
          <Path
            d="M5.5 16.5l4-7h5.5l3.5 7M9.5 9.5l2.5 7h4"
            stroke="#047857"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Handlebar & Seat */}
          <Line x1="14" y1="8" x2="16.5" y2="8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <Line x1="8" y1="9" x2="10.5" y2="9" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
        </Svg>
      );

    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="4" fill="#A7F3D0" stroke="#059669" strokeWidth="2" />
          <Path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="#A7F3D0" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
  }
};
