import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionCategorySvgIcon } from './TransactionCategorySvgIcon';
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
        // Day records represent expenses by design unless explicitly marked as income
        const isIncome = it.type === 'income';
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
    const isIncome = it.type === 'income' || (rawAmt > 0 && it.type !== 'expense');
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
      {/* 1. Header Bar Màu Vàng / Hổ Phách Pastel Khớp Mobile & Hình 1 */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="receipt-outline" size={17} color="#92400E" />
          </View>
          <Text style={styles.headerTitle}>
            {isVi ? 'Giao dịch gần đây' : 'Recent Transactions'}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{displayItems.length}</Text>
          </View>
        </View>

        {onViewAll && (
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={onViewAll}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.viewAllText}>
              {isVi ? 'xem tất cả →' : 'view all →'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.headerDivider} />

      {/* 2. Thân thẻ màu trắng chứa danh sách giao dịch */}
      <View style={styles.bodyContent}>
        {displayItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="receipt-outline" size={24} color="#92400E" />
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
          displayItems.map((item, idx) => {
            const isExpense = item.type === 'expense' || item.amount < 0;
            const initialChar = (item.title || 'Đ').charAt(0).toUpperCase();

            return (
              <React.Fragment key={item.id || idx}>
                <View style={styles.itemRow}>
                  {/* Avatar tròn màu vàng pastel với SVG icon theo hình 2 */}
                  <View style={styles.avatarCircle}>
                    <TransactionCategorySvgIcon
                      category={item.category}
                      categoryIcon={item.categoryIcon}
                      type={item.type}
                      title={item.title}
                      size={21}
                      color="#92400E"
                    />
                  </View>

                  {/* Thông tin giao dịch */}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemMeta}>
                      {item.category} · {item.date || (isVi ? 'Hôm qua' : 'Yesterday')}
                    </Text>
                  </View>

                  {/* Số tiền */}
                  <Text
                    style={[
                      styles.itemAmount,
                      { color: isExpense ? '#DC2626' : '#047857' },
                    ]}
                  >
                    {isExpense ? '-' : '+'}
                    {Math.abs(item.amount).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                {/* Đường phân cách chuẩn xác - Đảm bảo không bao giờ bị dính hàng */}
                {idx < displayItems.length - 1 && (
                  <View style={styles.rowDivider} />
                )}
              </React.Fragment>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 0,
    width: '100%',
    minHeight: 220,
    flex: 1,
  },
  headerBar: {
    backgroundColor: '#FEF3C7', // Màu vàng/hổ phách pastel khớp mobile
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
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
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
    color: '#92400E',
  },
  viewAllBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    width: '100%',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF08A', // Màu vàng pastel
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#854D0E',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6B7280',
  },
  itemAmount: {
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
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
    color: '#6B7280',
    textAlign: 'center',
  },
});
