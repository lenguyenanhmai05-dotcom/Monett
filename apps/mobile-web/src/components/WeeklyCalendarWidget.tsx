import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

export interface WeekDayItem {
  day: string; // T2, T3...
  date: string; // 18/10, 24/10...
  dayNum: number; // 18, 24...
  fullDateStr: string; // 2024-10-24
  amount: string; // 450k
  rawAmount: number;
  image?: string;
  hasPhoto: boolean;
}

interface WeeklyCalendarWidgetProps {
  selectedDay?: number;
  onSelectDay?: (day: WeekDayItem) => void;
  onViewAll?: () => void;
}

const DEFAULT_WEEK_DAYS: WeekDayItem[] = [
  {
    day: 'T2',
    date: '18/10',
    dayNum: 18,
    fullDateStr: '2024-10-18',
    amount: '65k',
    rawAmount: 65000,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=160&auto=format&fit=crop&q=80',
    hasPhoto: true,
  },
  {
    day: 'T3',
    date: '19/10',
    dayNum: 19,
    fullDateStr: '2024-10-19',
    amount: '820k',
    rawAmount: 820000,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=160&auto=format&fit=crop&q=80',
    hasPhoto: true,
  },
  {
    day: 'T4',
    date: '20/10',
    dayNum: 20,
    fullDateStr: '2024-10-20',
    amount: '280k',
    rawAmount: 280000,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&auto=format&fit=crop&q=80',
    hasPhoto: true,
  },
  {
    day: 'T5',
    date: '21/10',
    dayNum: 21,
    fullDateStr: '2024-10-21',
    amount: '220k',
    rawAmount: 220000,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80',
    hasPhoto: true,
  },
  {
    day: 'T6',
    date: '22/10',
    dayNum: 22,
    fullDateStr: '2024-10-22',
    amount: '75k',
    rawAmount: 75000,
    image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=160&auto=format&fit=crop&q=80',
    hasPhoto: true,
  },
  {
    day: 'T7',
    date: '23/10',
    dayNum: 23,
    fullDateStr: '2024-10-23',
    amount: '190k',
    rawAmount: 190000,
    image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=160&auto=format&fit=crop&q=80',
    hasPhoto: true,
  },
  {
    day: 'CN',
    date: '24/10',
    dayNum: 24,
    fullDateStr: '2024-10-24',
    amount: '450k',
    rawAmount: 450000,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=160&auto=format&fit=crop&q=80',
    hasPhoto: true,
  },
];

export const WeeklyCalendarWidget: React.FC<WeeklyCalendarWidgetProps> = ({
  selectedDay = 24,
  onSelectDay,
  onViewAll,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>TUẦN NÀY</Text>
          <Text style={styles.subtitle}>18/10 - 24/10</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.viewAllText}>Xem lịch đầy đủ ›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 7 Days Grid */}
      <View style={styles.weekGrid}>
        {DEFAULT_WEEK_DAYS.map((item) => {
          const isSelected = item.dayNum === selectedDay;
          const isSunday = item.day === 'CN';

          return (
            <TouchableOpacity
              key={item.dayNum}
              style={[
                styles.dayColumn,
                isSelected && styles.dayColumnActive,
              ]}
              onPress={() => onSelectDay && onSelectDay(item)}
              activeOpacity={0.8}
            >
              {/* Day Name */}
              <Text
                style={[
                  styles.dayName,
                  isSunday && styles.sundayName,
                  isSelected && styles.dayNameActive,
                ]}
              >
                {item.day}
              </Text>

              {/* Day Date */}
              <Text
                style={[
                  styles.dayDate,
                  isSelected && styles.dayDateActive,
                ]}
              >
                {item.dayNum}
              </Text>

              {/* Day Image Container */}
              <View
                style={[
                  styles.dayImageContainer,
                  isSelected && styles.dayImageContainerActive,
                ]}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.dayThumb} />
                ) : (
                  <View style={styles.placeholderThumb} />
                )}
                {/* Active Indicator Ring */}
                {isSelected && (
                  <View style={styles.activeCheckDot} />
                )}
              </View>

              {/* Day Amount Pill */}
              <View
                style={[
                  styles.amountPill,
                  isSelected && styles.amountPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayAmount,
                    isSelected && styles.dayAmountActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.amount}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#047857',
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayColumnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1.5,
    transform: [{ scale: 1.02 }],
  },
  dayName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  sundayName: {
    color: '#EF4444',
  },
  dayNameActive: {
    color: '#047857',
    fontWeight: '800',
  },
  dayDate: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  dayDateActive: {
    color: '#047857',
  },
  dayImageContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginBottom: 6,
    position: 'relative',
  },
  dayImageContainerActive: {
    borderWidth: 1.5,
    borderColor: '#059669',
  },
  dayThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEF2FF',
  },
  activeCheckDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  amountPill: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  amountPillActive: {
    backgroundColor: '#047857',
  },
  dayAmount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  dayAmountActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
