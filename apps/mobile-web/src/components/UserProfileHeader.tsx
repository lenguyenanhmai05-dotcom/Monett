import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface UserProfileHeaderProps {
  onEditProfile?: () => void;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({ onEditProfile }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [imageError, setImageError] = useState(false);

  const displayName = user?.fullName || 'Người dùng Monett';

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: '#FEE2E2', text: '#B91C1C' },
      { bg: '#FEF3C7', text: '#B45309' },
      { bg: '#DCFCE7', text: '#047857' },
      { bg: '#E0F2FE', text: '#0369A1' },
      { bg: '#EDE9FE', text: '#6D28D9' },
      { bg: '#FCE7F3', text: '#BE185D' },
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const avatarColor = getAvatarColor(displayName);
  const userIdStr = (user as any)?._id || (user as any)?.id || 'MNT-8942';
  const streakCount = user?.streak || 0;
  const isPro = Boolean(user?.isPro || (user as any)?.role === 'ADMIN' || streakCount >= 3);

  return (
    <View style={styles.profileHeader}>
      <TouchableOpacity
        style={styles.avatarWrapper}
        onPress={onEditProfile}
        activeOpacity={0.85}
      >
        {user?.avatarUrl && !imageError ? (
          <Image
            source={{ uri: user.avatarUrl }}
            style={styles.avatarImg}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.avatarImg, { backgroundColor: avatarColor.bg, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: avatarColor.text, fontWeight: '800', fontSize: 30 }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.avatarEditBadge}>
          <Text style={styles.cameraIcon}>📷</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.profileInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{displayName}</Text>
          {isPro && (
            <View style={styles.eliteBadge}>
              <Text style={styles.eliteBadgeText}>✨ PRO</Text>
            </View>
          )}
        </View>
        <Text style={styles.userSubText}>
          {isPro 
            ? (language === 'vi' ? '👑 Thành viên Tinh Hoa Monett' : '👑 Elite Monett PRO Member')
            : (language === 'vi' 
                ? `🌱 Thành viên Monett • Chuỗi ${streakCount}/3 ngày mở PRO` 
                : `🌱 Monett Member • Streak ${streakCount}/3 days to PRO`)}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.userIdText}>
            ID: #{userIdStr.slice(-6).toUpperCase()}
          </Text>
          <View style={styles.activeDotBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>
              {language === 'vi' ? 'Đang hoạt động' : 'Active'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#ECFDF5',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#059669',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    fontSize: 11,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  eliteBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  eliteBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  userSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  userIdText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  activeDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  activeText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700',
  },
});
