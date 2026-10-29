import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionCategorySvgIcon } from './TransactionCategorySvgIcon';

interface TransactionItem {
  id: string;
  title: string;
  category?: string;
  categoryIcon?: string;
  amount: number | string;
  rawAmount?: number;
  date?: string;
  time?: string;
  type?: 'expense' | 'income';
}

interface HomeRecentTransactionsWidgetProps {
  transactions?: TransactionItem[];
  onViewAll?: () => void;
  onSelectTransaction?: (id: string) => void;
  language?: 'vi' | 'en';
}

export const HomeRecentTransactionsWidget: React.FC<HomeRecentTransactionsWidgetProps> = ({
  transactions,
  onViewAll,
  onSelectTransaction,
  language = 'vi',
}) => {
  const isVi = language === 'vi';

  const totalCount = transactions?.length || 0;
  // Hiển thị tối đa 5 giao dịch gần đây nhất để không bỏ sót các khoản chi tiêu gần ngày
  const displayList = transactions && transactions.length > 0 ? transactions.slice(0, 5) : [];

  const formatAmountText = (item: TransactionItem) => {
    if (typeof item.amount === 'string') {
      return item.amount;
    }
    const num = Number(item.amount) || 0;
    const sign = item.type === 'income' || num > 0 ? '+' : '-';
    return `${sign}${Math.abs(num).toLocaleString('vi-VN')}`;
  };

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header Bar Màu Vàng / Hổ Phách Pastel Khớp Phong Cách Hình 1 */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          {/* White square icon badge with receipt icon */}
          <View style={styles.iconBadge}>
            <Ionicons name="receipt-outline" size={17} color="#92400E" />
          </View>

          {/* Title */}
          <Text style={styles.headerTitle}>
            {isVi ? 'Giao dịch gần đây' : 'Recent Transactions'}
          </Text>

          {/* White count badge */}
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalCount}</Text>
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
            {isVi ? 'xem tất cả →' : 'view all →'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerDivider} />

      {/* 2. Nội dung bên dưới trong cùng 1 khuôn trắng */}
      <View style={styles.bodyContent}>
        {displayList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={22} color="#94A3B8" />
            <Text style={styles.emptyText}>
              {isVi ? 'Chưa có giao dịch gần đây' : 'No recent transactions'}
            </Text>
          </View>
        ) : (
          displayList.map((item, idx) => {
          const isExpense = item.type !== 'income';
          const initialChar = (item.title || 'Đ').charAt(0).toUpperCase();

          return (
            <TouchableOpacity
              key={item.id || idx}
              style={[
                styles.itemRow,
                idx < displayList.length - 1 && styles.itemRowBorder,
              ]}
              onPress={() => onSelectTransaction?.(item.id)}
              activeOpacity={0.75}
            >
              {/* Circle Avatar Màu Vàng Pastel với Icon SVG theo yêu cầu hình 2 */}
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

              {/* Title & Subtitle */}
              <View style={styles.infoCol}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {item.category || (isVi ? 'Đăng ký' : 'General')} · {item.date || (isVi ? 'Hôm qua' : 'Yesterday')}
                </Text>
              </View>

              {/* Amount */}
              <Text
                style={[
                  styles.itemAmount,
                  { color: isExpense ? '#DC2626' : '#047857' },
                ]}
              >
                {formatAmountText(item)}
              </Text>
            </TouchableOpacity>
          );
        }))}
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
    backgroundColor: '#FEF3C7', // Màu vàng/hổ phách pastel phong cách hình 1
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
    color: '#92400E', // Chữ màu hổ phách đậm
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
  infoCol: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6B7280',
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

