import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TxItem } from './TransactionTableWidget';
import { getTransactionsApi } from '../services/api';
import {
  getInitialDayRecordsFromLocalStorage,
  subscribeCalendarUpdates,
  formatExpenseUploadTime,
  getUploadTimestamp,
} from '../services/calendarStorage';

interface RecentTransactionsWidgetProps {
  transactions?: TxItem[];
  dayRecords?: Record<string, any>;
  onViewAll?: () => void;
  language?: 'vi' | 'en';
}

function formatTxDateLabel(dateStr?: string, timeStr?: string, isVi = true): string {
  if (!dateStr) return timeStr || (isVi ? 'Gần đây' : 'Recent');

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayYMD = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayYMD = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = cleanDate.split('-');
  let normDate = cleanDate;
  if (parts.length === 3) {
    normDate = `${parts[0]}-${pad(Number(parts[1]))}-${pad(Number(parts[2]))}`;
  }

  let dayPart = '';
  if (normDate === todayYMD) {
    dayPart = isVi ? 'Hôm nay' : 'Today';
  } else if (normDate === yesterdayYMD) {
    dayPart = isVi ? 'Hôm qua' : 'Yesterday';
  } else if (parts.length === 3) {
    dayPart = `${pad(Number(parts[2]))}/${pad(Number(parts[1]))}`;
  } else {
    dayPart = cleanDate;
  }

  if (timeStr && timeStr.trim().length > 0) {
    return `${timeStr} · ${dayPart}`;
  }
  return dayPart;
}

function extractTxItemsFromDayRecords(
  records: Record<string, any>,
  isVi = true
): Array<TxItem & { timestamp: number }> {
  const list: Array<TxItem & { timestamp: number }> = [];

  Object.entries(records || {}).forEach(([key, rec]) => {
    if (!rec) return;
    const dateStr = rec.dateStr || (key.includes('-') ? key : undefined);

    if (Array.isArray(rec.items) && rec.items.length > 0) {
      rec.items.forEach((it: any) => {
        if (!it) return;
        const amt = it.amount || 0;
        const isIncome = it.type === 'income' || amt > 0;
        const time = formatExpenseUploadTime(it);

        const uploadD = getUploadTimestamp(it);
        let ts = uploadD ? uploadD.getTime() : 0;
        if (!ts) {
          if (it.createdAt) {
            ts = new Date(it.createdAt).getTime();
          } else if (dateStr) {
            ts = new Date(`${dateStr}T${time}:00`).getTime();
          }
        }

        list.push({
          id: String(it.id || it._id || `tx-${ts}-${Math.random()}`),
          _id: it._id ? String(it._id) : undefined,
          title: it.title || it.note || it.category || (isVi ? 'Khoản chi' : 'Expense'),
          amount: isIncome ? Math.abs(amt) : -Math.abs(amt),
          type: isIncome ? 'income' : 'expense',
          category: it.category || (isIncome ? 'Thu nhập' : 'Ăn uống'),
          categoryIcon: it.categoryIcon || (isIncome ? '💰' : '🍜'),
          note: it.note || '',
          date: formatTxDateLabel(dateStr || it.createdAt, time, isVi),
          timestamp: isNaN(ts) ? 0 : ts,
        });
      });
    } else if (rec.amount && rec.amount > 0) {
      let ts = 0;
      if (dateStr) {
        ts = new Date(`${dateStr}T12:00:00`).getTime();
      }
      list.push({
        id: `day-${key}`,
        title: rec.note || rec.category || (isVi ? 'Khoản chi' : 'Expense'),
        amount: -Math.abs(rec.amount),
        type: 'expense',
        category: rec.category || 'Ăn uống',
        categoryIcon: rec.categoryIcon || '🍜',
        note: rec.note || '',
        date: formatTxDateLabel(dateStr, undefined, isVi),
        timestamp: isNaN(ts) ? 0 : ts,
      });
    }
  });

  return list;
}

function formatBackendTransactions(
  txList: any[],
  isVi = true
): Array<TxItem & { timestamp: number }> {
  return (txList || []).map((it: any) => {
    const rawAmt = Number(it.amount) || 0;
    const isIncome = it.type === 'income' || rawAmt > 0;
    const dateObj = it.date ? new Date(it.date) : (it.createdAt ? new Date(it.createdAt) : new Date());
    const timeStr = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : undefined;
    const dateStr = !isNaN(dateObj.getTime())
      ? dateObj.toISOString().split('T')[0]
      : undefined;

    return {
      id: String(it._id || it.id),
      _id: String(it._id || it.id),
      title: it.title || it.note || it.category || (isVi ? 'Khoản chi' : 'Expense'),
      amount: isIncome ? Math.abs(rawAmt) : -Math.abs(rawAmt),
      type: (isIncome ? 'income' : 'expense') as 'expense' | 'income',
      category: it.category || (isIncome ? 'Thu nhập' : 'Ăn uống'),
      categoryIcon: it.categoryIcon || (isIncome ? '💰' : '🍜'),
      note: it.note || '',
      date: formatTxDateLabel(dateStr, timeStr, isVi),
      timestamp: isNaN(dateObj.getTime()) ? 0 : dateObj.getTime(),
    };
  });
}

export const RecentTransactionsWidget: React.FC<RecentTransactionsWidgetProps> = ({
  transactions,
  dayRecords: propDayRecords,
  onViewAll,
  language = 'vi',
}) => {
  const isVi = language === 'vi';
  const [localRecords, setLocalRecords] = useState<Record<string, any>>(() => {
    return propDayRecords || getInitialDayRecordsFromLocalStorage();
  });
  const [backendTxs, setBackendTxs] = useState<Array<TxItem & { timestamp: number }>>([]);

  // Cập nhật khi prop dayRecords từ HomeScreen thay đổi
  useEffect(() => {
    if (propDayRecords) {
      setLocalRecords(propDayRecords);
    }
  }, [propDayRecords]);

  // Đồng bộ ngầm với Backend và lắng nghe sự kiện khi có thêm/xóa chi tiêu
  const fetchBackendTransactions = useCallback(async () => {
    try {
      const res: any = await getTransactionsApi({ limit: 15 });
      const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
      if (Array.isArray(list)) {
        setBackendTxs(formatBackendTransactions(list, isVi));
      }
    } catch (_) {}
  }, [isVi]);

  useEffect(() => {
    fetchBackendTransactions();

    const unsub = subscribeCalendarUpdates((updated) => {
      setLocalRecords(updated);
      fetchBackendTransactions();
    });

    return unsub;
  }, [fetchBackendTransactions]);

  // Tổng hợp danh sách giao dịch gần đây (Ưu tiên từ dayRecords tức thời + backend)
  const displayItems = useMemo(() => {
    if (transactions && transactions.length > 0) {
      return transactions.slice(0, 4);
    }

    const dayItems = extractTxItemsFromDayRecords(localRecords, isVi);
    const combined: Array<TxItem & { timestamp: number }> = [...dayItems];
    const seen = new Set<string>();

    dayItems.forEach((it) => {
      if (it.id) seen.add(it.id);
      if (it._id) seen.add(it._id);
    });

    backendTxs.forEach((bIt) => {
      if (!seen.has(bIt.id) && (!bIt._id || !seen.has(bIt._id))) {
        combined.push(bIt);
        if (bIt.id) seen.add(bIt.id);
        if (bIt._id) seen.add(bIt._id);
      }
    });

    combined.sort((a, b) => b.timestamp - a.timestamp);
    return combined.slice(0, 4);
  }, [transactions, localRecords, backendTxs, isVi]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" size={18} color="#059669" />
          </View>
          <View>
            <Text style={styles.title}>{isVi ? 'Giao Dịch Gần Đây' : 'Recent Activity'}</Text>
            <Text style={styles.subtitle}>
              {displayItems.length > 0
                ? isVi
                  ? `${displayItems.length} khoản thu chi mới nhất`
                  : `Last ${displayItems.length} entries`
                : isVi
                ? 'Chưa có giao dịch gần đây'
                : 'No recent activity'}
            </Text>
          </View>
        </View>

        {onViewAll && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAll} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>{isVi ? 'Xem tất cả' : 'View all'}</Text>
            <Ionicons name="arrow-forward" size={12} color="#059669" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>

      {displayItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="receipt-outline" size={24} color="#059669" />
          </View>
          <Text style={styles.emptyTitle}>
            {isVi ? 'Chưa có giao dịch gần đây' : 'No recent transactions'}
          </Text>
          <Text style={styles.emptySubText}>
            {isVi
              ? 'Các khoản chi tiêu vừa thêm sẽ hiển thị tại đây'
              : 'Newly added expenses will appear here'}
          </Text>
        </View>
      ) : (
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
                    {item.category} • {item.date || (isVi ? 'Gần đây' : 'Recent')}
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F5F0E8',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E8E0D5',
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
    backgroundColor: '#E8EFE5',
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
    backgroundColor: '#E8EFE5',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D5',
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
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 3,
  },
  emptySubText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
});
