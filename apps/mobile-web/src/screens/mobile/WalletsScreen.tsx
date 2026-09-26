import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';

interface WalletsScreenProps {
  onBack?: () => void;
  onAddWallet?: () => void;
}

export const WalletsScreen: React.FC<WalletsScreenProps> = ({ onBack, onAddWallet }) => {
  const wallets = [
    {
      id: 'w1',
      name: 'TPBank (Tài khoản chính)',
      type: 'Ngân hàng',
      icon: '💳',
      balance: '12.500.000 đ',
      color: '#064E3B',
      isDefault: true,
    },
    {
      id: 'w2',
      name: 'Ví Tiền Mặt',
      type: 'Tiền mặt mang theo',
      icon: '💵',
      balance: '1.850.000 đ',
      color: '#047857',
    },
    {
      id: 'w3',
      name: 'Ví MoMo',
      type: 'Ví điện tử',
      icon: '📱',
      balance: '3.200.000 đ',
      color: '#A21CAF',
    },
    {
      id: 'w4',
      name: 'Vietcombank',
      type: 'Tài khoản tiết kiệm',
      icon: '🏛️',
      balance: '900.000 đ',
      color: '#15803D',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <Text style={styles.headerBtnIcon}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Ví Của Tôi</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAddWallet} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ Thêm ví</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Tổng tài sản hiện có */}
        <View style={styles.totalAssetCard}>
          <Text style={styles.totalAssetLabel}>Tổng số dư khả dụng</Text>
          <Text style={styles.totalAssetValue}>18.450.000 đ</Text>
          <View style={styles.safetyTag}>
            <Text style={styles.safetyTagText}>🛡️ Ngân sách an toàn 60%</Text>
          </View>
        </View>

        {/* 3. Danh sách các ví */}
        <Text style={styles.sectionTitle}>CÁC NGUỒN TIỀN</Text>
        {wallets.map((wallet) => (
          <TouchableOpacity
            key={wallet.id}
            style={styles.walletCard}
            activeOpacity={0.8}
          >
            <View style={styles.walletIconBox}>
              <Text style={styles.walletIconEmoji}>{wallet.icon}</Text>
            </View>

            <View style={styles.walletInfo}>
              <View style={styles.walletNameRow}>
                <Text style={styles.walletName}>{wallet.name}</Text>
                {wallet.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Mặc định</Text>
                  </View>
                )}
              </View>
              <Text style={styles.walletType}>{wallet.type}</Text>
            </View>

            <View style={styles.balanceCol}>
              <Text style={styles.walletBalance}>{wallet.balance}</Text>
              <Text style={styles.detailArrow}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* 4. Tips quản lý chi tiêu */}
        <View style={styles.tipBox}>
          <Text style={styles.tipIcon}>💡</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.tipTitle}>Mẹo phân bổ 50/30/20</Text>
            <Text style={styles.tipDesc}>
              Hãy giữ ít nhất 20% thu nhập trong tài khoản tiết kiệm và duy trì hạn mức chi an toàn hàng tuần.
            </Text>
          </View>
        </View>
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
  addBtn: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  totalAssetCard: {
    backgroundColor: '#0D3B37',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  totalAssetLabel: {
    fontSize: 13,
    color: '#A7F3D0',
    fontWeight: '500',
  },
  totalAssetValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  safetyTag: {
    backgroundColor: '#15564F',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  safetyTagText: {
    fontSize: 11,
    color: '#6EE7B7',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  walletIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  walletIconEmoji: {
    fontSize: 22,
  },
  walletInfo: {
    flex: 1,
  },
  walletNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  defaultBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
  },
  walletType: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  walletBalance: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  detailArrow: {
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  tipIcon: {
    fontSize: 24,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  tipDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
});
