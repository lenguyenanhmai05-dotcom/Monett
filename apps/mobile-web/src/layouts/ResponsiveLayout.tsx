import React, { useState, useRef, useEffect } from 'react';
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
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationModal } from '../components/NotificationModal';
import { FloatingFrogAIChat } from '../components/FloatingFrogAIChat';
import { useChat } from '../contexts/ChatContext';
import { MessengerPopover } from '../components/MessengerPopover';
import { ChatModal } from '../components/ChatModal';
import { normalizeAvatarUrl } from '../services/api';

export type TabKey =
  | 'home'
  | 'messages'
  | 'feed'
  | 'events'
  | 'analytics'
  | 'transactions'
  | 'budget'
  | 'recurring'
  | 'debts'
  | 'reminders'
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
  const { unreadCount, toggleNotifications } = useNotifications();
  const { isMessengerOpen, toggleMessenger, activeChatFriend, activeMomentReply, closeChat } = useChat();
  const [imageError, setImageError] = useState(false);
  const styles = getStyles(isDark, colors);

  useEffect(() => {
    setImageError(false);
  }, [user?.avatarUrl]);

  const avatarUri = normalizeAvatarUrl(user?.avatarUrl);

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
    { key: 'feed', labelVi: 'Bảng tin', labelEn: 'News Feed', icon: 'newspaper-outline' },
    { key: 'events', labelVi: 'Sự kiện', labelEn: 'Events', icon: 'calendar-outline' },
    { key: 'analytics', labelVi: 'Báo cáo', labelEn: 'Report', icon: 'bar-chart-outline' },
    { key: 'budget', labelVi: 'Tích lũy', labelEn: 'Savings', icon: 'wallet-outline' },
    { key: 'recurring', labelVi: 'Định kỳ', labelEn: 'Recurring', icon: 'repeat-outline' },
    { key: 'debts', labelVi: 'Sổ ghi nợ', labelEn: 'Debt Book', icon: 'book-outline' },
    { key: 'reminders', labelVi: 'Nhắc nhở', labelEn: 'Reminders', icon: 'notifications-outline' },
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
            <NavTabs
              tabs={tabs}
              activeTab={activeTab}
              onSelectTab={onSelectTab}
              language={language}
              isDark={isDark}
              styles={styles}
            />

            {/* Right: Messenger, Notifications & User Profile */}
            <View style={styles.navRight}>
              {/* Messenger Button */}
              <TouchableOpacity
                style={[
                  styles.bellBtn,
                  isMessengerOpen && { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.25)' : '#DCFCE7' },
                ]}
                onPress={toggleMessenger}
                activeOpacity={0.7}
                accessibilityLabel="Đoạn chat Messenger"
              >
                <Ionicons
                  name={isMessengerOpen ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                  size={19}
                  color={isMessengerOpen ? '#059669' : (isDark ? '#94A3B8' : '#64748B')}
                />
              </TouchableOpacity>

              {/* Notification Bell */}
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={toggleNotifications}
                activeOpacity={0.7}
                accessibilityLabel="Thông báo"
              >
                <Ionicons
                  name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                  size={19}
                  color={unreadCount > 0 ? '#059669' : (isDark ? '#94A3B8' : '#64748B')}
                />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* User Profile */}
              <TouchableOpacity
                style={styles.userChip}
                onPress={() => onSelectTab('profile')}
                activeOpacity={0.75}
              >
                {avatarUri && !imageError ? (
                  <Image
                    source={{ uri: avatarUri }}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Messenger Button Mobile */}
              <TouchableOpacity
                style={[
                  styles.bellBtn,
                  isMessengerOpen && { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.25)' : '#DCFCE7' },
                ]}
                onPress={toggleMessenger}
                activeOpacity={0.7}
                accessibilityLabel="Đoạn chat Messenger"
              >
                <Ionicons
                  name={isMessengerOpen ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                  size={19}
                  color={isMessengerOpen ? '#059669' : (isDark ? '#94A3B8' : '#64748B')}
                />
              </TouchableOpacity>

              {/* Notification Bell Mobile */}
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={toggleNotifications}
                activeOpacity={0.7}
                accessibilityLabel="Thông báo"
              >
                <Ionicons
                  name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                  size={19}
                  color={unreadCount > 0 ? '#059669' : (isDark ? '#94A3B8' : '#64748B')}
                />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
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

      {/* Facebook Style Messenger Popover Dropdown */}
      <MessengerPopover />

      {/* Interactive Notification Popover / Modal */}
      <NotificationModal onNavigateToTab={onSelectTab} />

      {/* Global Floating Messenger Chat Window (Bottom-Right Corner) */}
      {activeChatFriend && (
        <ChatModal
          visible={!!activeChatFriend}
          friend={activeChatFriend}
          initialMomentReply={activeMomentReply}
          onClose={closeChat}
        />
      )}

      {/* Floating Frog AI Copilot (Interactive Guide & Navigator) */}
      <FloatingFrogAIChat onNavigateToTab={onSelectTab} activeTab={activeTab} />
    </SafeAreaView>
  );
};

// ---- Separate component for desktop nav tabs to enable hover state & minimalist green underline ----
const NavTabs: React.FC<{
  tabs: { key: TabKey; labelVi: string; labelEn: string; icon: keyof typeof Ionicons.glyphMap }[];
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  language: string;
  isDark: boolean;
  styles: ReturnType<typeof getStyles>;
}> = ({ tabs, activeTab, onSelectTab, language, isDark, styles }) => {
  const [hoveredTab, setHoveredTab] = useState<TabKey | null>(null);

  return (
    <View style={styles.navCenter}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const isHovered = hoveredTab === tab.key;
        const label = language === 'vi' ? tab.labelVi : tab.labelEn;
        const activeColor = isDark ? '#34D399' : '#047857';
        const hoverColor = isDark ? '#6EE7B7' : '#059669';
        const idleColor = isDark ? '#94A3B8' : '#64748B';
        const currentColor = isActive ? activeColor : isHovered ? hoverColor : idleColor;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navTabBtn}
            onPress={() => onSelectTab(tab.key)}
            activeOpacity={0.8}
            // @ts-ignore - web-only hover events
            onMouseEnter={() => setHoveredTab(tab.key)}
            // @ts-ignore
            onMouseLeave={() => setHoveredTab(null)}
          >
            <Ionicons
              name={tab.icon}
              size={17}
              color={currentColor}
            />
            <Text
              style={[
                styles.navTabText,
                { color: currentColor },
                (isActive || isHovered) && styles.navTabTextActive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>

            {/* Dấu gạch dưới màu xanh lá khi hover hoặc khi ấn vào (Active) */}
            <View
              style={[
                styles.navTabUnderline,
                isHovered && !isActive && styles.navTabUnderlineHover,
                isActive && styles.navTabUnderlineActive,
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const getStyles = (isDark: boolean, colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#F5F0E8',
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
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E8E0D5',
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
    gap: 8,
    height: '100%',
  },
  navTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    height: '100%',
    position: 'relative',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    justifyContent: 'center',
  } as any,
  navTabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
    transitionProperty: 'color',
    transitionDuration: '180ms',
  } as any,
  navTabTextActive: {
    fontWeight: '700',
  },
  navTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: 'transparent',
    transitionProperty: 'background-color, transform, opacity',
    transitionDuration: '200ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 0,
    transform: 'scaleX(0.4)',
  } as any,
  navTabUnderlineHover: {
    backgroundColor: isDark ? '#34D399' : '#10B981',
    opacity: 0.85,
    transform: 'scaleX(1)',
  } as any,
  navTabUnderlineActive: {
    backgroundColor: isDark ? '#34D399' : '#047857',
    opacity: 1,
    transform: 'scaleX(1)',
  } as any,
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#1E293B' : '#EAE3D7',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: isDark ? '#0F172A' : '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
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
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E8E0D5',
  },
  mobileNavLogo: {
    width: 105,
    height: 38,
  },

  // ==================== MAIN CONTENT ====================
  mainArea: {
    flex: 1,
    backgroundColor: isDark ? '#0F172A' : '#F5F0E8',
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
