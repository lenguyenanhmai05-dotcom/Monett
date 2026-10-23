import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MonettEvent, loadEventsFromStorage } from '../services/eventsStorage';

interface HomeEventsWidgetProps {
  onViewAll?: () => void;
  language?: 'vi' | 'en';
}

export const HomeEventsWidget: React.FC<HomeEventsWidgetProps> = ({
  onViewAll,
  language = 'vi',
}) => {
  const isVi = language === 'vi';

  const [events, setEvents] = useState<MonettEvent[]>(() => {
    const loaded = loadEventsFromStorage();
    if (loaded && loaded.length > 0) return loaded;
    // Dữ liệu mẫu khớp hình 2
    return [
      {
        id: 'evt-111',
        title: '111',
        startDate: '18/10/2026',
        location: '111',
        estimatedBudget: 1000000,
        spentAmount: 0,
        status: 'ongoing',
        createdAt: new Date().toISOString(),
        expenses: [],
      },
      {
        id: 'evt-123',
        title: '123',
        startDate: '18/10/2026',
        location: 'Đà Lạt',
        estimatedBudget: 20000000,
        spentAmount: 0,
        status: 'ongoing',
        createdAt: new Date().toISOString(),
        expenses: [],
      },
    ];
  });

  useEffect(() => {
    const loaded = loadEventsFromStorage();
    if (loaded && loaded.length > 0) {
      setEvents(loaded);
    }
  }, []);

  const activeEvents = events.filter((e) => e.status !== 'completed');
  const displayEvents = (activeEvents.length > 0 ? activeEvents : events).slice(0, 2);

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header Bar Màu Xanh Mint Pastel Khớp Phong Cách Hình 1 */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          {/* White square icon badge with calendar icon */}
          <View style={styles.iconBadge}>
            <Ionicons name="calendar-outline" size={17} color="#065F46" />
          </View>

          {/* Title */}
          <Text style={styles.headerTitle}>
            {isVi ? 'Sự kiện' : 'Events'}
          </Text>

          {/* White count badge */}
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{events.length}</Text>
          </View>
        </View>

        {/* Nút Xem tất cả dạng pill trắng */}
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={onViewAll}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.viewAllText}>
            {isVi ? 'Xem tất cả →' : 'View all →'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerDivider} />

      {/* 2. Nội dung bên dưới trong cùng 1 khuôn trắng */}
      <View style={styles.bodyContent}>
        {displayEvents.map((evt, idx) => {
          const spent = evt.spentAmount || 0;
          const budget = evt.estimatedBudget || 1;
          const pct = Math.min(100, Math.max(0, Math.round((spent / budget) * 100)));

          const statusText =
            evt.status === 'upcoming'
              ? isVi ? 'Sắp tới' : 'Upcoming'
              : isVi ? 'Đang diễn ra' : 'Ongoing';

          return (
            <TouchableOpacity
              key={evt.id}
              style={[
                styles.eventItem,
                idx < displayEvents.length - 1 && styles.eventItemBorder,
              ]}
              onPress={onViewAll}
              activeOpacity={0.75}
            >
              {/* Top Row: Icon + Title/Location + Status Badge */}
              <View style={styles.cardTopRow}>
                {/* Soft Mint Square Icon Box */}
                <View style={styles.iconBox}>
                  <Ionicons name="calendar-outline" size={20} color="#059669" />
                </View>

                {/* Title & Date / Location */}
                <View style={styles.infoCol}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {evt.title}
                  </Text>
                  <Text style={styles.eventSubtitle} numberOfLines={1}>
                    {evt.startDate} • ◎ {evt.location || '111'}
                  </Text>
                </View>

                {/* Status Badge "Đang diễn ra" */}
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{statusText}</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
              </View>

              {/* Bottom Row: 0 đ / 1.000.000 đ */}
              <View style={styles.cardBottomRow}>
                <Text style={styles.spentText}>
                  {spent.toLocaleString('vi-VN')} đ
                </Text>
                <Text style={styles.budgetText}>
                  / {budget.toLocaleString('vi-VN')} đ
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
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    width: '100%',
  },
  headerBar: {
    backgroundColor: '#DCFCE7', // Màu xanh mint pastel khớp phong cách hình 1
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065F46', // Chữ màu xanh đậm
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  viewAllBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#065F46',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  eventItem: {
    width: '100%',
  },
  eventItemBorder: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  eventSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
  },
  budgetText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#6B7280',
  },
});

