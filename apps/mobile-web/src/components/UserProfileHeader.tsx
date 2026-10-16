import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface UserProfileHeaderProps {
  onEditProfile?: () => void;
  onQuickSave?: () => void;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({ onQuickSave }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const isVi = language === 'vi';

  const displayName = user?.fullName || (user?.email ? user.email.split('@')[0] : 'bạn');

  const greetingSub = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return isVi ? 'Chào buổi sáng,' : 'Good morning,';
    if (h < 18) return isVi ? 'Chào buổi chiều,' : 'Good afternoon,';
    return isVi ? 'Chào buổi tối,' : 'Good evening,';
  }, [isVi]);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.greetingContent}>
        {/* Chú ếch chibi vẫy tay chào đón */}
        <Image
          source={require('../../assets/frogs/frog-waving-hello.png')}
          style={styles.frogMascot}
          resizeMode="contain"
        />

        <View style={styles.textGroup}>
          <Text style={styles.greetingSubText}>{greetingSub}</Text>
          <Text style={[styles.greetingMainText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {isVi ? `Xin chào bạn, ${displayName}! 👋` : `Welcome back, ${displayName}! 👋`}
          </Text>
        </View>
      </View>

      {/* Góc trống bên phải: Nút "Lưu nhanh" */}
      {onQuickSave && (
        <TouchableOpacity
          style={styles.quickSaveBtn}
          onPress={onQuickSave}
          activeOpacity={0.82}
        >
          <View style={styles.quickSaveIconCircle}>
            <Ionicons name="flash" size={15} color="#FFFFFF" />
          </View>
          <Text style={styles.quickSaveText}>
            {isVi ? 'Lưu nhanh' : 'Quick Save'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 6,
    width: '100%',
  },
  greetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  frogMascot: {
    width: 70,
    height: 70,
  },
  textGroup: {
    justifyContent: 'center',
  },
  greetingSubText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  greetingMainText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  quickSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#064E3B',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#34D399',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 3,
    cursor: 'pointer' as any,
  },
  quickSaveIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
