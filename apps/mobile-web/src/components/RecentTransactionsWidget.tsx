import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { TxItem } from './TransactionTableWidget';
import { getTransactionsApi } from '../services/api';

interface RecentTransactionsWidgetProps {
  transactions?: TxItem[];
  onViewAll?: () => void;
  language?: 'vi' | 'en';
}

export const RecentTransactionsWidget: React.FC<RecentTransactionsWidgetProps> = ({
  transactions: propTransactions,
  onViewAll,
  language = 'vi',
}) => {
  const isVi = language === 'vi';
  const { isDark } = useTheme();
  const [internalList, setInternalList] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propTransactions) {
      setInternalList(propTransactions);
      return;
    }

    let isMounted = true;
    setLoading(true);
    getTransactionsApi({ limit: 4, sort: 'date_desc' })
      .then((res: any) => {
        if (!isMounted) return;
        const items = res?.items || res?.data?.items;
        if (Array.isArray(items)) {
          setInternalList(items);
        }
      })
      .catch((err) => {
        console.warn('RecentTransactionsWidget fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [propTransactions]);

  const displayItems = internalList.slice(0, 4);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return isVi ? 'Gần đây' : 'Recently';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      return `${h}:${m} · ${day}/${mo}`;
    } catch {
      return dateStr;
    }
  };

  const dynamicStyles = getStyles(isDark);

  return (
    <View style={dynamicStyles.card}>
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerLeft}>
          <View style={dynamicStyles.iconWrap}>
            <Ionicons name="time-outline" size={18} color="#059669" />
          </View>
          <View>
            <Text style={dynamicStyles.title}>{isVi ? 'Giao Dịch Gần Đây' : 'Recent Activity'}</Text>
            <Text style={dynamicStyles.subtitle}>{isVi ? '4 khoản thu chi mới nhất' : 'Last 4 entries'}</Text>
          </View>
        </View>

        {onViewAll && (
          <TouchableOpacity style={dynamicStyles.viewAllBtn} onPress={onViewAll} activeOpacity={0.7}>
            <Text style={dynamicStyles.viewAllText}>{isVi ? 'Xem tất cả' : 'View all'}</Text>
            <Ionicons name="arrow-forward" size={12} color="#059669" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      <View style={dynamicStyles.list}>
        {displayItems.length === 0 ? (
          <View style={dynamicStyles.emptyBox}>
            <Text style={dynamicStyles.emptyText}>
              {loading
                ? isVi ? 'Đang tải...' : 'Loading...'
                : isVi ? 'Chưa có giao dịch gần đây' : 'No recent transactions'}
            </Text>
          </View>
        ) : (
          displayItems.map((item, idx) => {
            const isExpense = item.type === 'expense' || item.amount < 0;
            return (
              <View
                key={item.id || item._id || idx}
                style={[dynamicStyles.itemRow, idx === displayItems.length - 1 && dynamicStyles.itemRowLast]}
              >
                <View
                  style={[
                    dynamicStyles.itemIconBox,
                    {
                      backgroundColor: isExpense
                        ? isDark ? '#450A0A' : '#FEF2F2'
                        : isDark ? '#064E3B' : '#ECFDF5',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 14 }}>{item.categoryIcon || (isExpense ? '💸' : '💰')}</Text>
                </View>

                <View style={dynamicStyles.itemInfo}>
                  <Text style={dynamicStyles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={dynamicStyles.itemMeta}>
                    {item.category} • {formatDate(item.date || item.createdAt)}
                  </Text>
                </View>

                <Text
                  style={[
                    dynamicStyles.itemAmount,
                    { color: isExpense ? '#E11D48' : '#059669' },
                  ]}
                >
                  {isExpense ? '-' : '+'}
                  {Math.abs(item.amount).toLocaleString('vi-VN')} đ
                </Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      padding: 22,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
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
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
      borderWidth: 1,
      borderColor: isDark ? '#047857' : '#A7F3D0',
    },
    title: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#F1F5F9' : '#0F172A',
    },
    subtitle: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    viewAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
    },
    viewAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#059669',
    },
    list: {
      borderTopWidth: 1,
      borderTopColor: isDark ? '#334155' : '#F1F5F9',
    },
    emptyBox: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 12,
      color: '#94A3B8',
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#334155' : '#F1F5F9',
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
      color: isDark ? '#F1F5F9' : '#1E293B',
    },
    itemMeta: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    itemAmount: {
      fontSize: 13.5,
      fontWeight: '800',
    },
  });
