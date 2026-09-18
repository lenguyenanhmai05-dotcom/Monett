import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { language } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🧑‍💻</Text>
        </View>

        <Text style={styles.name}>{user?.fullName || 'Người dùng Monett'}</Text>
        <Text style={styles.email}>{user?.email || 'user@monett.vn'}</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {language === 'vi' ? 'Vai trò:' : 'Role:'} {user?.role || 'USER'}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>
            {language === 'vi' ? 'ID Tài khoản:' : 'User ID:'}
          </Text>
          <Text style={styles.infoValue}>{user?.id || 'N/A'}</Text>

          <Text style={styles.infoLabel}>
            {language === 'vi' ? 'Đơn vị tiền tệ:' : 'Currency:'}
          </Text>
          <Text style={styles.infoValue}>{user?.currency || 'VND'}</Text>

          <Text style={styles.infoNote}>
            {language === 'vi'
              ? '💡 Bạn đã xác thực thành công qua JWT Token từ Backend NestJS!'
              : '💡 Authenticated successfully via JWT Token from NestJS Backend!'}
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>
            {language === 'vi' ? 'Đăng xuất tài khoản' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 14,
  },
  badge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 18,
    gap: 6,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 6,
  },
  infoNote: {
    fontSize: 12,
    color: '#059669',
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  logoutBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 13,
    borderRadius: 12,
  },
  logoutIcon: {
    fontSize: 16,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
