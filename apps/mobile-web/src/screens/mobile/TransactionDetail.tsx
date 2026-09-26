import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
} from 'react-native';

interface TransactionDetailProps {
  transactionId?: string;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TransactionDetail: React.FC<TransactionDetailProps> = ({
  transactionId,
  onBack,
  onEdit,
  onDelete,
}) => {
  // Dữ liệu chi tiết mẫu
  const detail = {
    title: 'Bún bò Huế Cô Lan',
    amount: '-85.000 đ',
    time: '12:30',
    date: 'Chủ Nhật, 15/09/2026',
    category: 'Ăn uống',
    categoryIcon: '🍜',
    wallet: 'Tiền mặt',
    walletIcon: '💵',
    note: 'Bát đặc biệt thêm chả cua. Ăn trưa cùng bạn.',
    location: 'Số 18 Ngõ Huyện, Hoàn Kiếm, Hà Nội',
    xpReward: '+15 XP',
    imageUrl:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.headerBtnIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Giao Dịch</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onEdit} activeOpacity={0.7}>
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: detail.imageUrl }} style={styles.heroImage} />
          <View style={styles.imageBadge}>
            <Text style={styles.imageBadgeText}>📷 Khoảnh khắc chi tiêu</Text>
          </View>
        </View>

        {/* 3. Header số tiền & Tên */}
        <View style={styles.mainInfoCard}>
          <Text style={styles.transTitle}>{detail.title}</Text>
          <Text style={styles.transAmount}>{detail.amount}</Text>
          <Text style={styles.transDate}>
            {detail.time} • {detail.date}
          </Text>

          {/* Gamification reward pill */}
          <View style={styles.gamifyPill}>
            <Text style={styles.gamifyIcon}>🐸</Text>
            <Text style={styles.gamifyText}>
              Đã ghi nhận khoảnh khắc • Nhận <Text style={{ fontWeight: '800' }}>{detail.xpReward}</Text>
            </Text>
          </View>
        </View>

        {/* 4. Thông tin chi tiết các hàng */}
        <View style={styles.detailSection}>
          <View style={styles.detailRow}>
            <View style={styles.rowLabelContainer}>
              <Text style={styles.rowIcon}>🏷️</Text>
              <Text style={styles.rowLabel}>Danh mục</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.catBadgeIcon}>{detail.categoryIcon}</Text>
              <Text style={styles.catBadgeText}>{detail.category}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.rowLabelContainer}>
              <Text style={styles.rowIcon}>💳</Text>
              <Text style={styles.rowLabel}>Nguồn tiền</Text>
            </View>
            <View style={styles.walletBadge}>
              <Text style={styles.walletBadgeIcon}>{detail.walletIcon}</Text>
              <Text style={styles.walletBadgeText}>{detail.wallet}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.rowLabelContainer}>
              <Text style={styles.rowIcon}>📍</Text>
              <Text style={styles.rowLabel}>Địa điểm</Text>
            </View>
            <Text style={styles.rowValue}>{detail.location}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <View style={styles.rowLabelContainer}>
              <Text style={styles.rowIcon}>📝</Text>
              <Text style={styles.rowLabel}>Ghi chú</Text>
            </View>
            <Text style={styles.rowValue}>{detail.note}</Text>
          </View>
        </View>

        {/* 5. Nút xóa giao dịch */}
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.8}>
          <Text style={styles.deleteBtnText}>🗑️ Xóa giao dịch này</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnIcon: {
    fontSize: 24,
    color: '#374151',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  imageBadgeText: {
    color: '#ECFDF5',
    fontSize: 12,
    fontWeight: '600',
  },
  mainInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  transTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  transAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#E11D48',
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  transDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  gamifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  gamifyIcon: {
    fontSize: 16,
  },
  gamifyText: {
    fontSize: 12,
    color: '#065F46',
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowIcon: {
    fontSize: 16,
  },
  rowLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  catBadgeIcon: {
    fontSize: 13,
  },
  catBadgeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '700',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  walletBadgeIcon: {
    fontSize: 13,
  },
  walletBadgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
