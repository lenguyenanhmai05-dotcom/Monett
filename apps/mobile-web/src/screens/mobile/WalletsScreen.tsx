import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';

interface WalletsScreenProps {
  onBack?: () => void;
  onAddWallet?: () => void;
}

export const WalletsScreen: React.FC<WalletsScreenProps> = ({ onBack, onAddWallet }) => {
  const { language } = useLanguage();
  const isVi = language === 'vi';

  const wallets: {
    id: string;
    name: string;
    type: string;
    iconName: keyof typeof Ionicons.glyphMap;
    balance: string;
    color: string;
    bg: string;
    isDefault?: boolean;
  }[] = [
    {
      id: 'w1',
      name: isVi ? 'TPBank (Tài khoản chính)' : 'TPBank (Main Account)',
      type: isVi ? 'Ngân hàng' : 'Bank',
      iconName: 'card-outline',
      balance: '12.500.000 đ',
      color: '#064E3B',
      bg: '#ECFDF5',
      isDefault: true,
    },
    {
      id: 'w2',
      name: isVi ? 'Ví Tiền Mặt' : 'Cash Wallet',
      type: isVi ? 'Tiền mặt mang theo' : 'Cash on hand',
      iconName: 'cash-outline',
      balance: '1.850.000 đ',
      color: '#047857',
      bg: '#ECFDF5',
    },
    {
      id: 'w3',
      name: 'Ví MoMo',
      type: isVi ? 'Ví điện tử' : 'E-wallet',
      iconName: 'phone-portrait-outline',
      balance: '3.200.000 đ',
      color: '#A21CAF',
      bg: '#FDF2F8',
    },
    {
      id: 'w4',
      name: 'Vietcombank',
      type: isVi ? 'Tài khoản tiết kiệm' : 'Savings Account',
      iconName: 'business-outline',
      balance: '900.000 đ',
      color: '#15803D',
      bg: '#F0FDF4',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.headerBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#1E293B" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{isVi ? 'Ví Của Tôi' : 'My Wallets'}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={onAddWallet} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>{isVi ? '+ Thêm ví' : '+ Add Wallet'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Tổng tài sản hiện có */}
        <View style={styles.totalAssetCard}>
          <Text style={styles.totalAssetLabel}>{isVi ? 'Tổng số dư khả dụng' : 'Total Available Balance'}</Text>
          <Text style={styles.totalAssetValue}>18.450.000 đ</Text>
          <View style={styles.safetyTag}>
            <Ionicons name="shield-checkmark" size={13} color="#047857" style={{ marginRight: 4 }} />
            <Text style={styles.safetyTagText}>{isVi ? 'Ngân sách an toàn 60%' : 'Safe Budget 60%'}</Text>
          </View>
        </View>

        {/* 3. Danh sách các ví */}
        <Text style={styles.sectionTitle}>{isVi ? 'CÁC NGUỒN TIỀN' : 'PAYMENT SOURCES'}</Text>
        {wallets.map((wallet) => (
          <TouchableOpacity
            key={wallet.id}
            style={styles.walletCard}
            activeOpacity={0.8}
          >
            <View style={[styles.walletIconBox, { backgroundColor: wallet.bg }]}>
              <Ionicons name={wallet.iconName} size={22} color={wallet.color} />
            </View>

            <View style={styles.walletInfo}>
              <View style={styles.walletNameRow}>
                <Text style={styles.walletName}>{wallet.name}</Text>
                {wallet.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>{isVi ? 'Mặc định' : 'Default'}</Text>
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
            <Text style={styles.tipTitle}>{isVi ? 'Mẹo phân bổ 50/30/20' : '50/30/20 Rule Tip'}</Text>
            <Text style={styles.tipDesc}>
              {isVi
                ? 'Hãy giữ ít nhất 20% thu nhập trong tài khoản tiết kiệm và duy trì hạn mức chi an toàn hàng tuần.'
                : 'Keep at least 20% of your income in savings and maintain a weekly safe spending budget.'}
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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
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
