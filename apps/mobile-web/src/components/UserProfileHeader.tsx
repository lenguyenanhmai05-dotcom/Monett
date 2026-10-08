import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getStreakApi } from '../services/api';

interface UserProfileHeaderProps {
  onEditProfile?: () => void;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({ onEditProfile }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const [streak, setStreak] = useState<number>(0);
  const [activeToday, setActiveToday] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    getStreakApi()
      .then((data: any) => {
        if (mounted && data) {
          setStreak(data.streak ?? 0);
          setActiveToday(Boolean(data.activeToday));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const displayName = user?.fullName || 'Ánh Mai';

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
  const userIdStr = (user as any)?._id || (user as any)?.id || '4576E7';
  const streakCount = user?.streak || streak || 1;
  const isPro = Boolean(user?.isPro || (user as any)?.role === 'ADMIN' || streakCount >= 3);

  return (
    <View style={styles.profileHeader}>
      {/* Left Block: Avatar & User Metadata */}
      <View style={styles.leftProfileBlock}>
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
            <View
              style={[
                styles.avatarImg,
                {
                  backgroundColor: avatarColor.bg,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              <Text
                style={{
                  color: avatarColor.text,
                  fontWeight: '800',
                  fontSize: 26,
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{displayName}</Text>
            {isPro && (
              <View style={{
                backgroundColor: '#059669',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                marginLeft: 10,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}>
                <Ionicons name="star" size={10} color="#FDE047" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                  PRO
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userSubText}>
            {isPro
              ? language === 'vi'
                ? '👑 Thành viên Tinh Hoa Monett'
                : '👑 Elite Monett PRO Member'
              : language === 'vi'
              ? `🌱 Thành viên Monett • Chuỗi ${streakCount}/3 ngày mở PRO`
              : `🌱 Monett Member • Streak ${streakCount}/3 days to PRO`}
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

      {/* Right Block: Integrated Sleek Streak Capsule (No Box-in-Box!) */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderWidth: 1.5,
        borderColor: '#A7F3D0',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flex: 1,
        maxWidth: 400,
      }}>
        <Image 
          source={require('../../assets/frogs/frog-3d-m-coin-transparent.png')} 
          style={{ width: 70, height: 70, marginLeft: -12, marginTop: -18, marginBottom: -18, zIndex: 10 }} 
          resizeMode="contain"
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', flexShrink: 1 }}>
              {language === 'vi'
                ? `Chuỗi ${streakCount} ngày bùng cháy`
                : `${streakCount}-Day Blazing Streak`}
            </Text>
            {activeToday ? (
              <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#10B981', marginRight: 4 }}>
                  {language === 'vi' ? 'ĐÃ GIỮ CHUỖI' : 'ACTIVE'}
                </Text>
                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
              </View>
            ) : (
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#D97706' }}>
                  {language === 'vi' ? 'CHƯA ĐIỂM DANH' : 'PENDING'}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 11, color: '#047857', marginTop: 4, lineHeight: 16 }}>
            {activeToday
              ? (language === 'vi'
                  ? 'Đã ghi nhận khoảnh khắc hôm nay. Chạm để xem chi tiết & mốc thưởng!'
                  : 'Continuous moments recorded. Tap to view perks!')
              : (language === 'vi'
                  ? 'Chưa duy trì hôm nay. Hãy ghi chép hoặc tham gia cùng bạn bè!'
                  : 'Not active today. Add a transaction or join a friend!')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  leftProfileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 260,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: '#ECFDF5',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#059669',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    fontSize: 10,
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  eliteBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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

  // Streak Pill
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 10,
    alignSelf: 'center',
  },
  streakPillFlame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fireEmoji: {
    fontSize: 18,
  },
  streakPillTexts: {
    gap: 2,
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  streakCountNum: {
    fontSize: 17,
    fontWeight: '900',
    color: '#B45309',
  },
  streakCountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  streakStatusNotice: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
  },
});
