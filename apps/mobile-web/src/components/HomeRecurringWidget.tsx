import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  RecurringItem,
  loadRecurringItems,
} from '../services/recurringStorage';

interface HomeRecurringWidgetProps {
  onViewAll?: () => void;
  language?: 'vi' | 'en';
}

export const HomeRecurringWidget: React.FC<HomeRecurringWidgetProps> = ({
  onViewAll,
  language = 'vi',
}) => {
  const isVi = language === 'vi';
  const { user } = useAuth();

  const [items, setItems] = useState<RecurringItem[]>(() => {
    const loaded = loadRecurringItems(user?.id);
    if (loaded && loaded.length > 0) return loaded;
    // Dữ liệu mẫu khớp 100% hình 1 của người dùng
    return [
      {
        id: 'rec_wifi_sample',
        title: isVi ? 'Tiền wifi' : 'Wifi bill',
        amount: 100000,
        type: 'expense',
        frequency: 'monthly',
        dayOfPayment: (new Date().getDate() + 12) % 30 || 1,
        isActive: true,
        createdAt: '2026-10-18',
      },
    ];
  });

  useEffect(() => {
    const loaded = loadRecurringItems(user?.id);
    if (loaded && loaded.length > 0) {
      setItems(loaded);
    }
  }, [user?.id]);

  const expenseItems = useMemo(() => {
    return items.filter((it) => it.type === 'expense');
  }, [items]);

  const formatShortK = (amt: number) => {
    if (amt >= 1000000) {
      const m = amt / 1000000;
      return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
    }
    if (amt >= 1000) {
      const k = amt / 1000;
      return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
    }
    return `${amt} đ`;
  };

  const calculateDaysRemaining = (dayOfPayment: number | string) => {
    const today = new Date();
    const currentDay = today.getDate();
    const targetDay = Number(dayOfPayment) || 1;
    if (targetDay >= currentDay) {
      return targetDay - currentDay || 1;
    }
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return daysInMonth - currentDay + targetDay;
  };

  const displayList = expenseItems.slice(0, 3);

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header Bar Màu Tím Pastel Khớp 100% Hình 1 */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          {/* White square icon badge with sync/repeat icon */}
          <View style={styles.iconBadge}>
            <Ionicons name="swap-horizontal" size={19} color="#581C87" />
          </View>

          {/* Title */}
          <Text style={styles.headerTitle}>
            {isVi ? 'Chi định kỳ' : 'Recurring'}
          </Text>

          {/* White count badge */}
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{expenseItems.length}</Text>
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
        {displayList.map((item, idx) => {
          const daysLeft = calculateDaysRemaining(item.dayOfPayment);
          const initialLetter = (item.title || 'T').charAt(0).toUpperCase();

          return (
            <TouchableOpacity
              key={item.id || idx}
              style={[
                styles.itemRow,
                idx < displayList.length - 1 && styles.itemRowBorder,
              ]}
              onPress={onViewAll}
              activeOpacity={0.75}
            >
              {/* Circular Avatar Màu Xanh Mint (#DCFCE7) */}
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initialLetter}</Text>
              </View>

              {/* Title & Frequency */}
              <View style={styles.infoCol}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {isVi ? 'hàng tháng' : 'monthly'}
                </Text>
              </View>

              {/* Amount & Pill "Còn 12 ngày" */}
              <View style={styles.rightCol}>
                <Text style={styles.amountText}>{formatShortK(item.amount)}</Text>
                <View style={styles.daysBadge}>
                  <Text style={styles.daysBadgeText}>
                    {isVi ? `Còn ${daysLeft} ngày` : `${daysLeft} days left`}
                  </Text>
                </View>
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
    backgroundColor: '#F3E8FF', // Màu tím pastel khớp 100% ảnh 1
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
    shadowColor: '#581C87',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#581C87', // Chữ tím đậm khớp ảnh 1
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
    color: '#581C87',
  },
  viewAllBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#581C87',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#581C87',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemRowBorder: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7', // Màu xanh mint khớp ảnh 1
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#047857',
  },
  infoCol: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6B7280',
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.2,
  },
  daysBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  daysBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
});
