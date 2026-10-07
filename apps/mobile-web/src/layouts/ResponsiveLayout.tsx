import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export type TabKey =
  | 'home'
  | 'moments'
  | 'analytics'
  | 'transactions'
  | 'budget'
  | 'profile';

interface ResponsiveLayoutProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  children: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  activeTab,
  onSelectTab,
  children,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isDark, colors } = useTheme();
  const [imageError, setImageError] = useState(false);
  const styles = getStyles(isDark, colors);

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: '#FEE2E2', text: '#B91C1C' }, // Red
      { bg: '#FEF3C7', text: '#B45309' }, // Amber
      { bg: '#DCFCE7', text: '#047857' }, // Green
      { bg: '#E0F2FE', text: '#0369A1' }, // Blue
      { bg: '#EDE9FE', text: '#6D28D9' }, // Purple
      { bg: '#FCE7F3', text: '#BE185D' }, // Pink
      { bg: '#F3F4F6', text: '#374151' }, // Gray
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Nguyễn Mai Linh';
  const avatarColor = getAvatarColor(user?.fullName || user?.email || 'U');

  const tabs: {
    key: TabKey;
    labelVi: string;
    labelEn: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: 'home', labelVi: 'Tổng quan', labelEn: 'Overview', icon: 'grid-outline' },
    { key: 'moments', labelVi: 'Khoảnh khắc', labelEn: 'Moments', icon: 'images-outline' },
    { key: 'analytics', labelVi: 'Báo cáo', labelEn: 'Analytics', icon: 'bar-chart-outline' },
    { key: 'transactions', labelVi: 'Chi tiêu', labelEn: 'Expenses', icon: 'receipt-outline' },
    { key: 'budget', labelVi: 'Ngân sách', labelEn: 'Budget', icon: 'wallet-outline' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ==================== TOP NAVIGATION BAR CHO DESKTOP ==================== */}
        {isDesktop ? (
          <View style={styles.topNavbar}>
            {/* Left: Brand Logo */}
            <TouchableOpacity
              style={styles.navLeft}
              onPress={() => onSelectTab('home')}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../assets/monett-brand-logo.png')}
                style={styles.navLogo}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Center: Main Navigation Tabs (Clean Frameless Nav Links) */}
            <View style={styles.navCenter}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                const label = language === 'vi' ? tab.labelVi : tab.labelEn;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.navTabBtn, isActive && styles.navTabBtnActive]}
                    onPress={() => onSelectTab(tab.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={17}
                      color={isActive ? '#047857' : (isDark ? '#94A3B8' : '#64748B')}
                    />
                    <Text
                      style={[
                        styles.navTabText,
                        isActive && styles.navTabTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Right: Notifications & User Profile */}
            <View style={styles.navRight}>
              {/* Notification Bell */}
              <TouchableOpacity
                style={styles.bellBtn}
                activeOpacity={0.7}
                accessibilityLabel="Thông báo"
              >
                <Ionicons
                  name="notifications-outline"
                  size={19}
                  color={isDark ? '#94A3B8' : '#64748B'}
                />
                <View style={styles.bellBadge} />
              </TouchableOpacity>

              {/* User Profile */}
              <TouchableOpacity
                style={styles.userChip}
                onPress={() => onSelectTab('profile')}
                activeOpacity={0.75}
              >
                {user?.avatarUrl && !imageError ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.userChipAvatar}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <View
                    style={[
                      styles.userChipAvatar,
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
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.userChipName} numberOfLines={1}>
                  {displayName}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Mobile Header */
          <View style={styles.mobileHeader}>
            <Image
              source={require('../../assets/monett-brand-logo.png')}
              style={styles.mobileNavLogo}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.bellBtn}
              activeOpacity={0.7}
              accessibilityLabel="Thông báo"
            >
              <Ionicons
                name="notifications-outline"
                size={19}
                color={isDark ? '#94A3B8' : '#64748B'}
              />
              <View style={styles.bellBadge} />
            </TouchableOpacity>
          </View>
        )}

        {/* ==================== MAIN CONTENT (EXPANSIVE FULL WIDTH) ==================== */}
        <View style={styles.mainArea}>
          <View style={styles.contentWrapper}>{children}</View>
        </View>

        {/* ==================== BOTTOM TAB BAR CHO MOBILE ==================== */}
        {!isDesktop && (
          <View style={styles.bottomBar}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const label = language === 'vi' ? tab.labelVi : tab.labelEn;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.bottomBarItem}
                  onPress={() => onSelectTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={20}
                    color={isActive ? '#047857' : (isDark ? '#94A3B8' : '#64748B')}
                  />
                  <Text
                    style={[
                      styles.bottomBarText,
                      isActive && styles.bottomBarTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.bottomBarItem}
              onPress={() => onSelectTab('profile')}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={activeTab === 'profile' ? '#047857' : (isDark ? '#94A3B8' : '#64748B')}
              />
              <Text
                style={[
                  styles.bottomBarText,
                  activeTab === 'profile' && styles.bottomBarTextActive,
                ]}
                numberOfLines={1}
              >
                {language === 'vi' ? 'Cá nhân' : 'Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#F8FAFD',
  },

  // ==================== TOP NAVBAR DESKTOP ====================
  topNavbar: {
    height: 64,
    backgroundColor: colors.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 20,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLogo: {
    width: 130,
    height: 42,
  },
  navCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navTabBtnActive: {
    backgroundColor: isDark ? 'rgba(4, 120, 87, 0.16)' : '#ECFDF5',
  },
  navTabText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: isDark ? '#94A3B8' : '#475569',
  },
  navTabTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },

  // User chip
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  userChipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userChipName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: 130,
  },

  // ==================== MOBILE HEADER ====================
  mobileHeader: {
    height: 58,
    backgroundColor: colors.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
  },
  mobileNavLogo: {
    width: 105,
    height: 38,
  },

  // ==================== MAIN CONTENT ====================
  mainArea: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#F8FAFD',
  },
  contentWrapper: {
    flex: 1,
  },

  // ==================== BOTTOM BAR ====================
  bottomBar: {
    height: 64,
    backgroundColor: colors.header,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 6,
  },
  bottomBarItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  bottomBarIcon: {
    fontSize: 20,
  },
  bottomBarText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  bottomBarTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
});
