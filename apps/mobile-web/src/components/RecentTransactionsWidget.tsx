import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TxItem } from './TransactionTableWidget';
import { getTransactionsApi } from '../services/api';

interface RecentTransactionsWidgetProps {
  transactions?: TxItem[];
  onViewAll?: () => void;
  language?: 'vi' | 'en';
}

const DEFAULT_RECENT: TxItem[] = [
  { id: '1', title: 'Lẩu Haidilao cuối tuần', amount: -320000, type: 'expense', category: 'Ăn uống', categoryIcon: '🍲', note: 'Ăn cùng gia đình', date: '19:30 · Hôm nay' },
  { id: '2', title: 'Cà phê Highland sáng', amount: -45000, type: 'expense', category: 'Cà phê', categoryIcon: '☕', note: 'Bàn công việc', date: '08:15 · Hôm nay' },
  { id: '3', title: 'Thu nhập hoàn tiền thẻ', amount: 150000, type: 'income', category: 'Thu nhập', categoryIcon: '💰', note: 'Cashback tháng 9', date: 'Hôm qua' },
  { id: '4', title: 'Siêu thị WinMart', amount: -185000, type: 'expense', category: 'Mua sắm', categoryIcon: '🛍️', note: 'Rau củ quả tươi', date: '29/09' },
];

export const RecentTransactionsWidget: React.FC<RecentTransactionsWidgetProps> = ({
  transactions: propTransactions,
  onViewAll,
  language = 'vi',
}) => {
  const isVi = language === 'vi';
  const [internalList, setInternalList] = useState<TxItem[]>(DEFAULT_RECENT);

  useEffect(() => {
    if (propTransactions) {
      setInternalList(propTransactions);
      return;
    }

    let isMounted = true;
    getTransactionsApi({ limit: 4 })
      .then((res: any) => {
        if (!isMounted) return;
        const items = res?.items || res?.data?.items;
        if (Array.isArray(items)) {
          if (items.length > 0) {
            setInternalList(items);
          } else {
            setInternalList([]);
          }
        }
      })
      .catch((err) => {
        console.log('RecentTransactionsWidget fallback to default:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [propTransactions]);

  const displayItems = internalList.slice(0, 4);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" size={18} color="#059669" />
          </View>
          <View>
            <Text style={styles.title}>{isVi ? 'Giao Dịch Gần Đây' : 'Recent Activity'}</Text>
            <Text style={styles.subtitle}>{isVi ? '4 khoản thu chi mới nhất' : 'Last 4 entries'}</Text>
          </View>
        </View>

        {onViewAll && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAll} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>{isVi ? 'Xem tất cả' : 'View all'}</Text>
            <Ionicons name="arrow-forward" size={12} color="#059669" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.list}>
        {displayItems.map((item, idx) => {
          const isExpense = item.type === 'expense' || item.amount < 0;
          return (
            <View key={item.id || idx} style={[styles.itemRow, idx === displayItems.length - 1 && styles.itemRowLast]}>
              <View style={[styles.itemIconBox, { backgroundColor: isExpense ? '#FEF2F2' : '#ECFDF5' }]}>
                <Text style={{ fontSize: 14 }}>{item.categoryIcon || (isExpense ? '💸' : '💰')}</Text>
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {item.category} • {item.date || 'Gần đây'}
                </Text>
              </View>

              <Text
                style={[
                  styles.itemAmount,
                  { color: isExpense ? '#E11D48' : '#059669' },
                ]}
              >
                {isExpense ? '-' : '+'}
                {Math.abs(item.amount).toLocaleString('vi-VN')} đ
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});
