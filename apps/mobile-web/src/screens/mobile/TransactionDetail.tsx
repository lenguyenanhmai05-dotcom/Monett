import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTransactionDetailApi, deleteTransactionApi } from '../../services/api';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';

interface TransactionDetailProps {
  transactionId?: string;
  onBack?: () => void;
  onEdit?: (txData?: any) => void;
  onDelete?: () => void;
}

const getCategoryMeta = (catName: string) => {
  const name = (catName || '').toLowerCase();
  if (name.includes('ăn') || name.includes('uống') || name.includes('ẩm thực') || name.includes('bún')) {
    return { icon: 'restaurant-outline' as const, color: '#059669', bg: '#ECFDF5' };
  }
  if (name.includes('cà phê') || name.includes('cafe') || name.includes('coffee')) {
    return { icon: 'cafe-outline' as const, color: '#7C3AED', bg: '#F5F3FF' };
  }
  if (name.includes('mua') || name.includes('sắm') || name.includes('shop')) {
    return { icon: 'bag-handle-outline' as const, color: '#2563EB', bg: '#EFF6FF' };
  }
  if (name.includes('xe') || name.includes('di chuyển') || name.includes('xăng')) {
    return { icon: 'car-outline' as const, color: '#D97706', bg: '#FEF3C7' };
  }
  if (name.includes('hóa đơn') || name.includes('điện') || name.includes('nước')) {
    return { icon: 'receipt-outline' as const, color: '#DC2626', bg: '#FEE2E2' };
  }
  if (name.includes('giải trí') || name.includes('phim')) {
    return { icon: 'film-outline' as const, color: '#DB2777', bg: '#FDF2F8' };
  }
  if (name.includes('lương') || name.includes('thu nhập')) {
    return { icon: 'cash-outline' as const, color: '#059669', bg: '#ECFDF5' };
  }
  return { icon: 'cube-outline' as const, color: '#64748B', bg: '#F1F5F9' };
};

const getWalletMeta = (walletName: string) => {
  const name = (walletName || '').toLowerCase();
  if (name.includes('tiền mặt') || name.includes('cash')) {
    return { icon: 'cash-outline' as const, color: '#059669', bg: '#ECFDF5' };
  }
  if (name.includes('momo') || name.includes('ví')) {
    return { icon: 'phone-portrait-outline' as const, color: '#DB2777', bg: '#FDF2F8' };
  }
  return { icon: 'card-outline' as const, color: '#2563EB', bg: '#EFF6FF' };
};

export const TransactionDetail: React.FC<TransactionDetailProps> = ({
  transactionId,
  onBack,
  onEdit,
  onDelete,
}) => {
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detail, setDetail] = useState({
    title: 'Bún bò Huế Cô Lan',
    amount: '-85.000 đ',
    rawAmount: 85000,
    rawType: 'expense' as 'expense' | 'income',
    time: '12:30',
    date: 'Chủ Nhật, 15/09/2026',
    category: 'Ăn uống',
    categoryIcon: 'restaurant-outline',
    wallet: 'Tiền mặt',
    walletIcon: 'cash-outline',
    note: 'Bát đặc biệt thêm chả cua. Ăn trưa cùng bạn.',
    location: 'Số 18 Ngõ Huyện, Hoàn Kiếm, Hà Nội',
    xpReward: '+15 XP',
    imageUrl:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
  });

  useEffect(() => {
    if (!transactionId || transactionId.startsWith('tx_')) return;
    let isMounted = true;
    setLoading(true);
    getTransactionDetailApi(transactionId)
      .then((tx) => {
        if (isMounted && tx) {
          const isExpense = tx.type === 'expense' || (tx.amount && tx.amount < 0);
          const sign = isExpense ? '-' : '+';
          const d = tx.date ? new Date(tx.date) : new Date();
          setDetail({
            title: tx.title || 'Khoản chi tiêu',
            amount: `${sign}${Math.abs(tx.amount || 0).toLocaleString('vi-VN')} đ`,
            rawAmount: Math.abs(tx.amount || 0),
            rawType: isExpense ? 'expense' : 'income',
            time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            date: d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
            category: tx.category || 'Ăn uống',
            categoryIcon: tx.categoryIcon || 'restaurant-outline',
            wallet: tx.walletName || 'Tiền mặt',
            walletIcon: tx.walletIcon || 'cash-outline',
            note: tx.note || 'Khoảnh khắc chi tiêu đã được ghi nhận',
            location: tx.location || 'Hà Nội, Việt Nam',
            xpReward: '+15 XP',
            imageUrl: tx.photoUri || 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
          });
        }
      })
      .catch((e) => console.log('Fetch tx detail error:', e))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [transactionId]);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (transactionId && !transactionId.startsWith('tx_')) {
        await deleteTransactionApi(transactionId);
      }
      setShowDeleteModal(false);
      if (onDelete) onDelete();
    } catch (e: any) {
      console.log('Error deleting transaction:', e);
      if (typeof alert !== 'undefined') {
        alert('Không thể xóa giao dịch: ' + (e?.message || 'Lỗi kết nối'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Giao Dịch</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            if (onEdit) {
              onEdit({
                id: transactionId,
                title: detail.title,
                amount: detail.rawAmount,
                type: detail.rawType,
                category: detail.category,
                categoryIcon: detail.categoryIcon,
                photoUri: detail.imageUrl,
                note: detail.note,
              });
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={18} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: detail.imageUrl }} style={styles.heroImage} />
          <View style={styles.imageBadge}>
            <Ionicons name="camera-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.imageBadgeText}>Khoảnh khắc chi tiêu</Text>
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
            <View style={styles.gamifyIconBadge}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.gamifyText}>
              Đã ghi nhận khoảnh khắc • Nhận <Text style={{ fontWeight: '800' }}>{detail.xpReward}</Text>
            </Text>
          </View>
        </View>

        {/* 4. Thông tin chi tiết các hàng */}
        <View style={styles.detailSection}>
          <View style={styles.detailRow}>
            <View style={styles.rowLabelContainer}>
              <Ionicons name="pricetag-outline" size={16} color="#047857" style={{ marginRight: 8 }} />
              <Text style={styles.rowLabel}>Danh mục</Text>
            </View>
            {(() => {
              const meta = getCategoryMeta(detail.category);
              return (
                <View style={[styles.categoryBadge, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={14} color={meta.color} />
                  <Text style={[styles.catBadgeText, { color: meta.color }]}>{detail.category}</Text>
                </View>
              );
            })()}
          </View>

          <View style={styles.detailRow}>
            <View style={styles.rowLabelContainer}>
              <Ionicons name="wallet-outline" size={16} color="#047857" style={{ marginRight: 8 }} />
              <Text style={styles.rowLabel}>Nguồn tiền</Text>
            </View>
            {(() => {
              const wMeta = getWalletMeta(detail.wallet);
              return (
                <View style={[styles.walletBadge, { backgroundColor: wMeta.bg }]}>
                  <Ionicons name={wMeta.icon} size={14} color={wMeta.color} />
                  <Text style={[styles.walletBadgeText, { color: wMeta.color }]}>{detail.wallet}</Text>
                </View>
              );
            })()}
          </View>

          <View style={styles.detailRow}>
            <View style={styles.rowLabelContainer}>
              <Ionicons name="location-outline" size={16} color="#047857" style={{ marginRight: 8 }} />
              <Text style={styles.rowLabel}>Địa điểm</Text>
            </View>
            <Text style={styles.rowValue}>{detail.location}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <View style={styles.rowLabelContainer}>
              <Ionicons name="document-text-outline" size={16} color="#047857" style={{ marginRight: 8 }} />
              <Text style={styles.rowLabel}>Ghi chú</Text>
            </View>
            <Text style={styles.rowValue}>{detail.note}</Text>
          </View>
        </View>

        {/* 5. Nút xóa giao dịch */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.deleteBtnText}>Xóa giao dịch này</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 6. Modal xác nhận xóa chuẩn Fintech */}
      <ConfirmDeleteModal
        visible={showDeleteModal}
        itemTitle={detail.title}
        itemAmount={detail.amount}
        itemImage={detail.imageUrl}
        itemCategory={detail.category}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
  gamifyIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginRight: 2,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
    flexDirection: 'row',
    justifyContent: 'center',
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
