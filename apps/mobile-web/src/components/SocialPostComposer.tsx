import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export const SocialPostComposer = ({ user }: any) => {
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const styles = getStyles(isDark, colors);

  const displayName = user?.fullName || (user?.email ? user.email.split('@')[0] : 'Min');
  const avatarUri = user?.avatarUrl;

  const getAvatarColor = (name: string) => {
    const bgColors = ['#FEE2E2', '#FEF3C7', '#D1FAE5', '#DBEAFE', '#E0E7FF', '#FCE7F3', '#F3E8FF'];
    const textColors = ['#B91C1C', '#D97706', '#059669', '#2563EB', '#4F46E5', '#DB2777', '#7E22CE'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % bgColors.length;
    return { bg: bgColors[index], text: textColors[index] };
  };

  const avatarColor = getAvatarColor(displayName);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarColor.bg, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: avatarColor.text, fontWeight: 'bold', fontSize: 16 }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.inputTrigger} activeOpacity={0.8}>
          <Text style={styles.placeholderText}>
            {language === 'vi' ? `${displayName} ơi, hôm nay bạn chi tiêu gì thế?` : `What's on your mind, ${displayName}?`}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="camera" size={22} color="#10B981" />
          <Text style={styles.actionText}>{language === 'vi' ? 'Ảnh hóa đơn' : 'Receipt Photo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="location" size={22} color="#F43F5E" />
          <Text style={styles.actionText}>{language === 'vi' ? 'Check-in quán' : 'Check-in'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="happy" size={22} color="#F59E0B" />
          <Text style={styles.actionText}>{language === 'vi' ? 'Cảm xúc' : 'Feeling/Activity'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: isDark ? '#000000' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 14,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  inputTrigger: {
    flex: 1,
    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 20,
    height: 44,
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 15,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
