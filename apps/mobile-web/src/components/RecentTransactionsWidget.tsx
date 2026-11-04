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

// Chuẩn hóa định dạng chuỗi ngày YYYY-MM-DD
function normalizeDateStr(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = String(Number(parts[1])).padStart(2, '0');
    const d = String(Number(parts[2])).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return clean;
}

// Trích xuất thời điểm tạo chính xác nhất từ transaction / item
export function getTransactionCreationTime(tx: any): number {
  if (!tx) return 0;
  if (tx.createdAt) {
    const t = new Date(tx.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (tx.updatedAt) {
    const t = new Date(tx.updatedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  const idStr = String(tx._id || tx.id || '');
  if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
    const sec = parseInt(idStr.substring(0, 8), 16);
    if (!isNaN(sec) && sec > 0) return sec * 1000;
  }
  const numMatch = idStr.match(/\d{10,13}/);
  if (numMatch) {
    const ts = parseInt(numMatch[0], 10);
    return ts < 10000000000 ? ts * 1000 : ts;
  }
  if (tx.date) {
    const t = new Date(tx.date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

// Tạo fingerprint nội dung để chống trùng lặp tuyệt đối
function getTxFingerprint(tx: {
  title?: string;
  amount?: number | string;
  category?: string;
  dateStr?: string;
  timeStr?: string;
}): string {
  const normTitle = (tx.title || '').trim().toLowerCase();
  const absAmt = Math.round(Math.abs(Number(tx.amount) || 0));
  const cat = (tx.category || '').trim().toLowerCase();
  const date = normalizeDateStr(tx.dateStr || '');
  const time = (tx.timeStr || '').trim();
  return `${normTitle}|${absAmt}|${cat}|${date}|${time}`;
}

function formatTxDateLabel(dateStr?: string, timeStr?: string, isVi = true): string {
  if (!dateStr) return timeStr || (isVi ? 'Gần đây' : 'Recent');

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayYMD = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayYMD = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

  const normDate = normalizeDateStr(dateStr);
  const parts = normDate.split('-');

  let dayPart = '';
  if (normDate === todayYMD) {
    dayPart = isVi ? 'Hôm nay' : 'Today';
  } else if (normDate === yesterdayYMD) {
    dayPart = isVi ? 'Hôm qua' : 'Yesterday';
  } else if (parts.length === 3) {
    dayPart = `${pad(Number(parts[2]))}/${pad(Number(parts[1]))}`;
  } else {
    dayPart = normDate;
  }

  if (timeStr && timeStr.trim().length > 0) {
    return `${timeStr} · ${dayPart}`;
  }
  return dayPart;
}

function extractTxItemsFromDayRecords(
  records: Record<string, any>,
  isVi = true
): Array<TxItem & { timestamp: number; fingerprint: string }> {
  const list: Array<TxItem & { timestamp: number; fingerprint: string }> = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  // 1. Gộp các key dạng không padding (YYYY-M-D) và có padding (YYYY-MM-DD) để không bao giờ lặp ngày
  const normalizedRecords = new Map<string, any>();
  Object.entries(records || {}).forEach(([key, rec]) => {
    if (!rec) return;
    const normKey = normalizeDateStr(rec.dateStr || (key.includes('-') ? key : undefined));
    if (!normKey) return;
    const existing = normalizedRecords.get(normKey);
    if (!existing) {
      normalizedRecords.set(normKey, rec);
    } else {
      const exCount = Array.isArray(existing.items) ? existing.items.length : (existing.amount ? 1 : 0);
      const recCount = Array.isArray(rec.items) ? rec.items.length : (rec.amount ? 1 : 0);
      if (recCount >= exCount) {
        normalizedRecords.set(normKey, rec);
      }
    }
  });

  // 2. Duyệt qua từng ngày đã chuẩn hóa
  normalizedRecords.forEach((rec, normDateKey) => {
    const dateStr = normalizeDateStr(rec.dateStr) || normDateKey;

    if (Array.isArray(rec.items) && rec.items.length > 0) {
      rec.items.forEach((it: any) => {
        if (!it) return;
        // Bỏ qua giao dịch thu nhập (dayRecords chỉ lưu chi tiêu)
        if (it.type === 'income') return;

        const amt = it.amount || 0;
        const time = formatExpenseUploadTime(it);
        const title = it.title || it.note || it.category || (isVi ? 'Khoản chi' : 'Expense');
        const category = it.category || 'Ăn uống';

        const uploadD = getUploadTimestamp(it);
        let ts = uploadD ? uploadD.getTime() : 0;
        if (!ts) {
          if (it.createdAt) {
            ts = new Date(it.createdAt).getTime();
          } else if (dateStr) {
            ts = new Date(`${dateStr}T${time || '12:00'}:00`).getTime();
          }
        }
        if (isNaN(ts) || ts <= 0) {
          ts = getTransactionCreationTime(it);
        }

        const rawId = String(it.id || it._id || '');
        const fp = getTxFingerprint({
          title,
          amount: amt,
          category,
          dateStr,
          timeStr: time,
        });

        // Chống trùng lặp tuyệt đối
        if (rawId && seenIds.has(rawId)) return;
        if (fp && seenFingerprints.has(fp)) return;

        if (rawId) seenIds.add(rawId);
        if (fp) seenFingerprints.add(fp);

        list.push({
          id: rawId || `tx-${normDateKey}-${fp}`,
          _id: it._id ? String(it._id) : undefined,
          title,
          amount: -Math.abs(amt),
          type: 'expense',
          category,
          categoryIcon: it.categoryIcon || '🍜',
          note: it.note || '',
          date: formatTxDateLabel(dateStr || it.createdAt, time, isVi),
          timestamp: isNaN(ts) ? 0 : ts,
          fingerprint: fp,
        });
      });
    } else if (rec.amount && rec.amount > 0) {
      const title = rec.note || rec.category || (isVi ? 'Khoản chi' : 'Expense');
      const category = rec.category || 'Ăn uống';
      const fp = getTxFingerprint({
        title,
        amount: rec.amount,
        category,
        dateStr: normDateKey,
      });

      const dayId = `day-${normDateKey}`;
      if (!seenIds.has(dayId) && !seenFingerprints.has(fp)) {
        seenIds.add(dayId);
        seenFingerprints.add(fp);

        const ts = new Date(`${normDateKey}T12:00:00`).getTime();
        list.push({
          id: dayId,
          title,
          amount: -Math.abs(rec.amount),
          type: 'expense',
          category,
          categoryIcon: rec.categoryIcon || '🍜',
          note: rec.note || '',
          date: formatTxDateLabel(normDateKey, undefined, isVi),
          timestamp: isNaN(ts) ? 0 : ts,
          fingerprint: fp,
        });
      }
    }
  });

  return list;
}

function formatBackendTransactions(
  txList: any[],
  isVi = true
): Array<TxItem & { timestamp: number; fingerprint: string }> {
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const list: Array<TxItem & { timestamp: number; fingerprint: string }> = [];

  (txList || []).forEach((it: any) => {
    if (!it) return;
    // Bỏ qua thu nhập
    if (it.type === 'income') return;

    const rawAmt = Number(it.amount) || 0;
    const dateObj = it.date ? new Date(it.date) : (it.createdAt ? new Date(it.createdAt) : new Date());
    const timeStr = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : undefined;
    const dateStr = !isNaN(dateObj.getTime())
      ? dateObj.toISOString().split('T')[0]
      : undefined;

    const title = it.title || it.note || it.category || (isVi ? 'Khoản chi' : 'Expense');
    const category = it.category || 'Ăn uống';
    const normDate = normalizeDateStr(dateStr);

    const ts = getTransactionCreationTime(it) || (!isNaN(dateObj.getTime()) ? dateObj.getTime() : 0);

    const fp = getTxFingerprint({
      title,
      amount: rawAmt,
      category,
      dateStr: normDate,
      timeStr,
    });

    const itemId = String(it._id || it.id || '');
    if (itemId && seenIds.has(itemId)) return;
    if (fp && seenFingerprints.has(fp)) return;

    if (itemId) seenIds.add(itemId);
    if (fp) seenFingerprints.add(fp);

    list.push({
      id: itemId,
      _id: itemId,
      title,
      amount: -Math.abs(rawAmt),
      type: 'expense' as const,
      category,
      categoryIcon: it.categoryIcon || '🍜',
      note: it.note || '',
      date: formatTxDateLabel(dateStr, timeStr, isVi),
      timestamp: isNaN(ts) ? 0 : ts,
      fingerprint: fp,
    });
  });

  return list;
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
  const [backendTxs, setBackendTxs] = useState<Array<TxItem & { timestamp: number; fingerprint: string }>>([]);

  // Cập nhật khi prop dayRecords từ HomeScreen thay đổi
  useEffect(() => {
    if (propDayRecords) {
      setLocalRecords(propDayRecords);
    }
  }, [propDayRecords]);

  // Đồng bộ ngầm với Backend và lắng nghe sự kiện khi có thêm/xóa chi tiêu
  const fetchBackendTransactions = useCallback(async () => {
    try {
      const res: any = await getTransactionsApi({ limit: 20 });
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

  // Tổng hợp danh sách giao dịch gần đây (Deduplicate đa tầng: ID, MongoDB ObjectId & Fingerprint nội dung)
  const displayItems = useMemo(() => {
    if (transactions && transactions.length > 0) {
      const seenPropIds = new Set<string>();
      const seenPropFps = new Set<string>();
      const uniqueProps: TxItem[] = [];
      transactions.forEach((tx) => {
        if (!tx || tx.type === 'income') return;
        const id = String(tx.id || tx._id || '');
        const fp = `${(tx.title || '').trim().toLowerCase()}|${Math.round(Math.abs(Number(tx.amount) || 0))}|${tx.category || ''}`;
        if ((id && seenPropIds.has(id)) || seenPropFps.has(fp)) return;
        if (id) seenPropIds.add(id);
        seenPropFps.add(fp);
        uniqueProps.push(tx);
      });
      return uniqueProps.slice(0, 5);
    }

    const dayItems = extractTxItemsFromDayRecords(localRecords, isVi);
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();
    const combined: Array<TxItem & { timestamp: number }> = [];

    // 1. Thêm dayItems trước (chứa các cập nhật tức thời 0ms từ thao tác trên máy)
    dayItems.forEach((it) => {
      if (it.id) seenIds.add(it.id);
      if (it._id) seenIds.add(it._id);
      if (it.fingerprint) seenFingerprints.add(it.fingerprint);
      combined.push(it);
    });

    // 2. Thêm các giao dịch từ Backend chưa có trong dayItems
    backendTxs.forEach((bIt) => {
      const isIdSeen = (bIt.id && seenIds.has(bIt.id)) || (bIt._id && seenIds.has(bIt._id));
      const isFpSeen = bIt.fingerprint && seenFingerprints.has(bIt.fingerprint);

      // Đối chiếu tương đương nội dung nếu ID tạm thời khác với MongoDB ObjectId
      const isContentSeen = combined.some((r) => {
        const sameTitle = r.title.trim().toLowerCase() === bIt.title.trim().toLowerCase();
        const sameAmount = Math.abs(r.amount) === Math.abs(bIt.amount);
        const sameCategory = r.category === bIt.category;
        const timeDiff = Math.abs((r.timestamp || 0) - (bIt.timestamp || 0));
        // Nếu cùng ngày và thời điểm chênh lệch dưới 5 phút
        const sameTime = timeDiff < 5 * 60 * 1000;
        return sameTitle && sameAmount && sameCategory && sameTime;
      });

      if (!isIdSeen && !isFpSeen && !isContentSeen) {
        combined.push(bIt);
        if (bIt.id) seenIds.add(bIt.id);
        if (bIt._id) seenIds.add(bIt._id);
        if (bIt.fingerprint) seenFingerprints.add(bIt.fingerprint);
      }
    });

    // Sắp xếp giảm dần theo thời gian tạo (mới nhất lên trên cùng)
    combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Hiển thị tối đa 5 giao dịch gần đây nhất để hiển thị đầy đủ các giao dịch vừa thêm
    return combined.slice(0, 5);
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
