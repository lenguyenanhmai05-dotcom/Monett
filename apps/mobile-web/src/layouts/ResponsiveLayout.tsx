import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';

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
  const { user, logout } = useAuth();
  const { language } = useLanguage();

  const tabs: {
    key: TabKey;
    labelVi: string;
    labelEn: string;
    icon: string;
  }[] = [
    { key: 'home', labelVi: 'Tổng quan', labelEn: 'Overview', icon: '⊞' },
    {
      key: 'moments',
      labelVi: 'Lịch ảnh\nchi tiêu',
      labelEn: 'Moments\nJournal',
      icon: '📅',
    },
    {
      key: 'analytics',
      labelVi: 'Thống kê',
      labelEn: 'Analytics',
      icon: '📈',
    },
    {
      key: 'transactions',
      labelVi: 'Quản lý\nChi tiêu',
      labelEn: 'Expense\nManager',
      icon: '📝',
    },
    {
      key: 'budget',
      labelVi: 'Ngân sách',
      labelEn: 'Budget',
      icon: '💳',
    },
    {
      key: 'profile',
      labelVi: 'Trang cá\nnhân & Slogan',
      labelEn: 'Profile\n& Slogan',
      icon: '👤',
    },
  ];

  const currentDateFormatted =
    language === 'vi' ? '📅 24 Tháng 10, 2024' : '📅 Oct 24, 2024';

  const displayName = user?.fullName || 'Nguyễn Mai Linh';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ==================== TOP NAVIGATION BAR CHO DESKTOP ==================== */}
        {isDesktop ? (
          <View style={styles.topNavbar}>
            {/* Left: Brand Logo */}
            <View style={styles.navLeft}>
              <Image
                source={require('../../assets/monett-brand-logo.png')}
                style={styles.navLogo}
                resizeMode="contain"
              />
            </View>

            {/* Center: Main Navigation Tabs */}
            <View style={styles.navCenter}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                const label = language === 'vi' ? tab.labelVi : tab.labelEn;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.navTabBtn, isActive && styles.navTabBtnActive]}
                    onPress={() => onSelectTab(tab.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.navTabIcon, isActive && styles.navTabIconActive]}>
                      {tab.icon}
                    </Text>
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

            {/* Right: Date, Quick Action, Lang, Profile */}
            <View style={styles.navRight}>
              {/* Date Chip */}
              <View style={styles.dateChip}>
                <Text style={styles.dateChipText}>{currentDateFormatted}</Text>
              </View>

              {/* Quick Action Button: Ghi chép nhanh */}
              <TouchableOpacity style={styles.quickCaptureBtn} activeOpacity={0.85}>
                <Text style={styles.quickCaptureIcon}>📷</Text>
                <Text style={styles.quickCaptureText}>
                  {language === 'vi' ? 'Ghi chép nhanh' : 'Quick Capture'}
                </Text>
              </TouchableOpacity>

              {/* Notification Bell */}
              <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
                <Text style={styles.bellIcon}>🔔</Text>
                <View style={styles.bellBadge} />
              </TouchableOpacity>

              {/* Language Switcher */}
              <LanguageToggle />

              {/* User Profile Chip */}
              <TouchableOpacity
                style={styles.userChip}
                onPress={() => onSelectTab('profile')}
                activeOpacity={0.8}
              >
                <Image
                  source={{
                    uri:
                      user?.avatarUrl ||
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop',
                  }}
                  style={styles.userChipAvatar}
                />
                <View style={styles.userChipTextCol}>
                  <Text style={styles.userChipName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.userChipRole}>
                    {language === 'vi' ? 'Monett Steward' : 'Mindful Saver'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Logout button */}
              <TouchableOpacity
                style={styles.logoutIconButton}
                onPress={logout}
                accessibilityLabel="Đăng xuất"
              >
                <Text style={styles.logoutIconText}>🚪</Text>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LanguageToggle />
              <TouchableOpacity onPress={logout} style={styles.mobileLogoutBtn}>
                <Text style={{ fontSize: 16 }}>🚪</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== MAIN CONTENT (EXPANSIVE FULL WIDTH) ==================== */}
        <View style={styles.mainArea}>
          <View style={styles.contentWrapper}>{children}</View>
        </View>

        {/* ==================== BOTTOM TAB BAR CHO MOBILE ==================== */}
        {!isDesktop && (
          <View style={styles.bottomBar}>
            {tabs.slice(0, 5).map((tab) => {
              const isActive = activeTab === tab.key;
              const label = language === 'vi' ? tab.labelVi : tab.labelEn;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.bottomBarItem}
                  onPress={() => onSelectTab(tab.key)}
                >
                  <Text style={styles.bottomBarIcon}>{tab.icon}</Text>
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
              <Text style={styles.bottomBarIcon}>👤</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },

  // ==================== TOP NAVBAR DESKTOP ====================
  topNavbar: {
    height: 82,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 150,
  },
  navLogo: {
    width: 148,
    height: 58,
  },
  navCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  navTabBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    minWidth: 72,
  },
  navTabBtnActive: {
    backgroundColor: '#047857',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  navTabIcon: {
    fontSize: 18,
    marginBottom: 3,
    color: '#475569',
  },
  navTabIconActive: {
    color: '#FFFFFF',
  },
  navTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 14,
  },
  navTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateChip: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  quickCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  quickCaptureIcon: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  quickCaptureText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 16,
  },
  bellBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },


  // User chip
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userChipAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  userChipTextCol: {
    gap: 1,
  },
  userChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 110,
  },
  userChipRole: {
    fontSize: 10,
    color: '#64748B',
  },
  logoutIconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutIconText: {
    fontSize: 14,
  },

  // ==================== MOBILE HEADER ====================
  mobileHeader: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mobileNavLogo: {
    width: 105,
    height: 40,
  },
  mobileLogoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },

  // ==================== MAIN CONTENT ====================
  mainArea: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  contentWrapper: {
    flex: 1,
  },

  // ==================== BOTTOM BAR ====================
  bottomBar: {
    height: 64,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    color: '#64748B',
    fontWeight: '500',
  },
  bottomBarTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
});
